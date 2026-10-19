---
title: Redmine 技術まとめ
slug: redmine
excerpt: Redmineの基本用語とチケット運用の考え方、Dockerと手動でのインストール・初期設定、コミット連携・REST API・Wiki記法（Textile / CommonMark）の書き方、APIスクリプトのサンプル、よくあるエラーと対処、ワークフロー設計やバックアップの実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# Redmine 技術まとめ

## 基礎

Redmine は、Ruby on Rails で作られたオープンソースのプロジェクト管理・課題管理ツールです。チケット（課題）管理、ガントチャート、Wiki、作業時間の記録、Git / Subversion との連携が1つにまとまっていて、自社サーバーに無料で構築できます。

**結論：Redmine の使いやすさは「トラッカー・ステータス・ワークフロー・ロール」の設計でほぼ決まります。** 最初に項目を増やしすぎず、運用しながら足していくのが失敗しないコツです。

### まず押さえる用語

| 用語 | 意味 | 現場での注意点 |
| --- | --- | --- |
| プロジェクト | チケット・Wiki・メンバーをまとめる単位。親子（サブプロジェクト）にできる | 識別子（URL に使う英数字）は後から変更できないので最初に決める |
| チケット | 課題・タスク・バグ1件ずつの記録。`#123` のように番号で呼ぶ | 1チケット1作業にする。大きい作業は親子チケットに分ける |
| トラッカー | チケットの種類（バグ・機能・サポートなど） | トラッカーごとにワークフローと入力項目を変えられる |
| ステータス | 新規・進行中・解決・終了など | 「終了したチケット」扱いにするかをステータスごとに設定する |
| ワークフロー | ロール×トラッカーごとに、どのステータスからどのステータスへ変えられるか | ここが未設定だと「ステータスが選べない」 |
| ロール | 管理者・開発者・報告者など、メンバーの権限セット | 権限はロールに付け、ユーザーはプロジェクトごとにロールを割り当てる |
| 対象バージョン | リリースやマイルストーン | ロードマップ画面で進捗を確認できる |
| カスタムフィールド | 標準にない入力項目（顧客名・発生環境など） | 増やしすぎると入力されなくなる |
| ウォッチャー | 更新通知を受け取る人 | 担当者・作成者以外で通知がほしい人を追加する |
| 作業時間 | チケットに記録する工数 | 作業分類（設計・開発など）ごとに集計できる |

### チケットの関連

| 関連の種類 | 意味 |
| --- | --- |
| 関連している | 単に関係がある |
| 重複している / 重複されている | 同じ内容のチケット。重複されている側を終了すると、重複している側も自動で終了する |
| ブロックしている / ブロックされている | 先に終わらせないと進められない |
| 先行 / 後続 | 日程の前後関係（ガントチャートに反映される） |
| コピー元 / コピー先 | チケットをコピーして作ったときの関係 |

## 環境構築

### 構築方法の選び方

| 方法 | 向いている場面 |
| --- | --- |
| Docker（公式イメージ `redmine`） | 検証・小規模運用。最短で動かせる |
| 手動インストール（Ruby + Bundler） | 既存サーバーへの導入、細かい調整が必要な本番 |
| ホスティングサービス | サーバーを持ちたくない場合 |

Redmine のバージョンごとに、対応する Ruby・Rails・データベースのバージョンが決まっています。**インストール前に必ず公式の RedmineInstall ページで動作要件を確認**します。

### Docker で動かす

```yaml
# compose.yaml
services:
  redmine:
    image: redmine:6.0
    ports:
      - "3000:3000"
    environment:
      REDMINE_DB_POSTGRES: db
      REDMINE_DB_USERNAME: redmine
      REDMINE_DB_PASSWORD: change_me
      REDMINE_DB_DATABASE: redmine
      REDMINE_SECRET_KEY_BASE: change_me_to_long_random_string
    volumes:
      - redmine-files:/usr/src/redmine/files
    depends_on:
      - db
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: redmine
      POSTGRES_PASSWORD: change_me
      POSTGRES_DB: redmine
    volumes:
      - db-data:/var/lib/postgresql/data
volumes:
  redmine-files:
  db-data:
```

```sh
docker compose up -d
docker compose logs -f redmine   # 起動完了まで待つ
# ブラウザで http://localhost:3000 を開く
```

`files`（添付ファイル）とデータベースは必ずボリュームに置きます。置かないとコンテナを作り直したときに消えます。

### 手動インストールの流れ

```sh
# Redmine を展開したディレクトリで実行
cp config/database.yml.example config/database.yml   # DB 接続先を編集
bundle config set --local without 'development test'
bundle install
bundle exec rake generate_secret_token
RAILS_ENV=production bundle exec rake db:migrate
RAILS_ENV=production REDMINE_LANG=ja bundle exec rake redmine:load_default_data
```

```yaml
# config/database.yml（PostgreSQL の例）
production:
  adapter: postgresql
  database: redmine
  host: localhost
  username: redmine
  password: "change_me"
  encoding: utf8
```

本番では Puma などのアプリケーションサーバーの前に nginx / Apache を置き、HTTPS で公開します。

### 初期設定チェックリスト

1. `admin` / `admin` でログインし、**すぐにパスワードを変更**する
2. 管理 → 設定 → 表示 で既定の言語を日本語にする（Docker で初期データ未ロードなら、管理画面からデフォルト設定をロードする）
3. 管理 → 設定 → 全般 で「ホスト名とパス」「プロトコル」を実際の URL に合わせる（通知メールのリンクに使われる）
4. 管理 → 設定 → 認証 で「認証が必要」をオンにする（社外に見せない場合）
5. 管理 → 設定 → API で「REST による Web サービスを有効にする」をオンにする（API を使う場合）
6. メール通知を使うなら `config/configuration.yml` に SMTP を設定し、管理 → 設定 → メール通知 からテストメールを送る
7. トラッカー・ステータス・ロール・ワークフローを決めてからプロジェクトを作る

### プラグインの導入

```sh
# plugins/ にプラグインを置いてから
bundle install
RAILS_ENV=production bundle exec rake redmine:plugins:migrate
# アプリケーションを再起動

# アンインストール（DB の変更を戻してからディレクトリを削除）
RAILS_ENV=production bundle exec rake redmine:plugins:migrate NAME=plugin_name VERSION=0
```

## コマンド

### コミットからチケットを参照・更新

```sh
git commit -m "ログイン画面のバリデーションを修正 refs #123"
git commit -m "不具合を修正 fixes #123"
git commit -m "画面レイアウト調整 refs #123 @2h"   # 作業時間 2時間を記録
```

| 用途 | キーワード | 設定場所 |
| --- | --- | --- |
| 参照（関連付けのみ） | `refs #123` `references #123` `IssueID #123`（既定） | 管理 → 設定 → リポジトリ |
| ステータス変更 | 例: `fixes #123` → 解決、`closes #123` → 終了 | 同上の「キーワードと変更後のステータス」の対応表に登録する |
| 作業時間の記録 | `@2h` など | 同上で作業時間の記録を有効にする |

**`fixes` は設定しないと効きません。** キーワードと変更後のステータスの対応を登録して初めて、コミットでステータスが変わります。

コミットはリポジトリの取り込み時にチケットへ反映されます。自動取得を使わない場合は、次のどちらかで取り込みます。

```sh
RAILS_ENV=production bundle exec rake redmine:fetch_changesets
curl "https://redmine.example.com/sys/fetch_changesets?key=<リポジトリ管理用APIキー>"
```

後者は 管理 → 設定 → リポジトリ で「リポジトリ管理用の Web サービスを有効にする」をオンにし、APIキーを生成しておく必要があります。Git の post-receive フックや CI から呼ぶと、プッシュ直後に反映されます。

### REST API

APIキーは 個人設定 → 右側の「APIアクセスキー」で確認します。URL の `&` がシェルに解釈されないよう、**URL は必ずクォート**します。

```sh
export REDMINE_URL=https://redmine.example.com
export REDMINE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 自分の情報（APIキーの確認）
curl -s -H "X-Redmine-API-Key: $REDMINE_KEY" "$REDMINE_URL/users/current.json"

# 未完了チケット一覧（最大100件ずつ）
curl -s -H "X-Redmine-API-Key: $REDMINE_KEY" \
  "$REDMINE_URL/issues.json?project_id=myproj&status_id=open&sort=updated_on:desc&limit=100&offset=0"

# 1件取得（コメント履歴・添付・子チケットも）
curl -s -H "X-Redmine-API-Key: $REDMINE_KEY" \
  "$REDMINE_URL/issues/123.json?include=journals,attachments,children,relations"

# チケット作成
curl -s -X POST -H "X-Redmine-API-Key: $REDMINE_KEY" -H "Content-Type: application/json" \
  -d '{"issue": {"project_id": "myproj", "tracker_id": 1, "subject": "ログインできない", "description": "再現手順…", "assigned_to_id": 5}}' \
  "$REDMINE_URL/issues.json"

# ステータス変更とコメント追加
curl -s -X PUT -H "X-Redmine-API-Key: $REDMINE_KEY" -H "Content-Type: application/json" \
  -d '{"issue": {"status_id": 3, "notes": "修正しました。確認をお願いします。"}}' \
  "$REDMINE_URL/issues/123.json"
```

| 操作 | メソッド・パス |
| --- | --- |
| チケット一覧 | `GET /issues.json?project_id=1&status_id=open` |
| 自分の担当チケット | `GET /issues.json?assigned_to_id=me&status_id=open` |
| 保存したクエリで絞り込み | `GET /issues.json?query_id=5&project_id=1` |
| チケット取得 | `GET /issues/123.json` |
| チケット作成 | `POST /issues.json` |
| チケット更新・コメント | `PUT /issues/123.json`（コメントは `notes`） |
| チケット削除 | `DELETE /issues/123.json` |
| プロジェクト一覧 | `GET /projects.json` |
| 作業時間の登録 | `POST /time_entries.json` |
| ファイルのアップロード | `POST /uploads.json`（`Content-Type: application/octet-stream`） |
| 認証 | `X-Redmine-API-Key: <APIキー>` ヘッダー |

`status_id` は `open`（未完了）・`closed`（完了）・`*`（すべて）が使えます。一覧のレスポンスには `total_count` `offset` `limit` が入るので、`offset` をずらして全件取得します。

### Wiki 記法

テキスト書式は 管理 → 設定 → 全般 の「テキスト書式」で選びます。古くからの環境は Textile、新しい環境では CommonMark Markdown が選ばれていることが多いので、**まず自分の環境がどちらか確認**します。

| 操作 | Textile | CommonMark Markdown |
| --- | --- | --- |
| 見出し | `h2. 見出し` | `## 見出し` |
| 太字 / 斜体 | `*太字*` / `_斜体_` | `**太字**` / `*斜体*` |
| 取り消し線 | `-取り消し-` | `~~取り消し~~` |
| 箇条書き / 番号付き | `* 項目` / `# 項目` | `- 項目` / `1. 項目` |
| インラインコード | `@code@` | `` `code` `` |
| リンク | `"表示":https://example.com` | `[表示](https://example.com)` |
| 添付画像 | `!image.png!` | `![](image.png)` |
| 引用 | `bq. 引用` | `> 引用` |

コードブロックは、Textile では `<pre><code class="sql">SELECT 1;</code></pre>`、CommonMark では ` ```sql ` で囲みます。表は次のように書きます。

```text
Textile:
|_. 項目 |_. 内容 |
| 環境 | 本番 |

CommonMark:
| 項目 | 内容 |
| --- | --- |
| 環境 | 本番 |
```

### Redmine 独自のリンク・マクロ（両書式共通）

| 操作 | 書き方 |
| --- | --- |
| チケットへのリンク | `#123` |
| リンクにしない | `!#123` |
| リビジョン / コミット | `r123` / `commit:abcdef12` |
| Wiki ページ | `[[ページ名]]` / `[[ページ名\|表示名]]` / `[[ページ名#見出し]]` |
| 他プロジェクトの Wiki | `[[project_id:ページ名]]` |
| バージョン | `version:1.0` |
| 添付ファイル | `attachment:file.zip` |
| リポジトリのファイル | `source:path/to/file.rb` |
| 目次 | `{{toc}}`（右寄せは `{{>toc}}`） |
| 折りたたみ | `{{collapse(詳細を表示) … }}` |
| 子ページ一覧 | `{{child_pages}}` |

### 検索・フィルタ

- チケット一覧で「フィルタ」を追加し、「オプション」で表示列やグループ化を選んで**「保存」でカスタムクエリにする**（全員に公開もできる）
- 「担当者: 自分」「ステータス: 未完了」「期日: 今日より前」の組み合わせで、遅延チケットの一覧が作れる
- 右上の検索ボックスで `#123` を入力すると、そのチケットに直接移動する
- 一覧画面の右下から CSV / PDF / Atom で出力できる

## サンプル

### 自分の担当で期日切れのチケットを一覧にする（シェル + jq）

```sh
#!/bin/sh
# 使い方: REDMINE_URL=... REDMINE_KEY=... ./overdue.sh
set -eu
TODAY=$(date +%Y-%m-%d)

curl -s -f -H "X-Redmine-API-Key: $REDMINE_KEY" \
  "$REDMINE_URL/issues.json?assigned_to_id=me&status_id=open&sort=due_date&limit=100" |
  jq -r --arg today "$TODAY" '
    .issues[]
    | select(.due_date != null and .due_date < $today)
    | [.id, .due_date, .project.name, .subject] | @tsv'
```

期日は `YYYY-MM-DD` 形式の文字列なので、jq の文字列比較でそのまま前後を判定できます。100件を超える場合は `offset` でページングします（次の Python の例を参照）。`-f` を付けると、401 や 404 のときに curl が失敗の終了コードを返すので、スクリプトで検知できます。

### 全件をページングして CSV に出す（Python）

```python
import csv
import os

import requests

URL = os.environ["REDMINE_URL"]
HEADERS = {"X-Redmine-API-Key": os.environ["REDMINE_KEY"]}


def fetch_all(params):
    offset = 0
    while True:
        res = requests.get(f"{URL}/issues.json", headers=HEADERS,
                           params={**params, "limit": 100, "offset": offset}, timeout=30)
        res.raise_for_status()
        data = res.json()
        yield from data["issues"]
        offset += len(data["issues"])
        if offset >= data["total_count"] or not data["issues"]:
            break


with open("issues.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["ID", "トラッカー", "ステータス", "担当者", "題名", "更新日時"])
    for i in fetch_all({"project_id": "myproj", "status_id": "*"}):
        w.writerow([i["id"], i["tracker"]["name"], i["status"]["name"],
                    i.get("assigned_to", {}).get("name", ""), i["subject"], i["updated_on"]])
```

`encoding="utf-8-sig"`（BOM 付き UTF-8）にすると、Excel で開いても文字化けしません。担当者が未設定のチケットには `assigned_to` 自体がないので、`get` で取り出します。

### ファイルを添付してチケットを作る

```sh
# 1. ファイルをアップロードしてトークンを受け取る
curl -s -X POST -H "X-Redmine-API-Key: $REDMINE_KEY" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @error.log "$REDMINE_URL/uploads.json?filename=error.log"
# {"upload":{"id":10,"token":"10.xxxxxxxx"}}

# 2. トークンを指定してチケットを作成
curl -s -X POST -H "X-Redmine-API-Key: $REDMINE_KEY" -H "Content-Type: application/json" \
  -d '{"issue": {"project_id": "myproj", "subject": "夜間バッチ異常終了", "uploads": [{"token": "10.xxxxxxxx", "filename": "error.log", "content_type": "text/plain"}]}}' \
  "$REDMINE_URL/issues.json"
```

## エラー対応

| エラーメッセージ・症状 | 主な原因 | 対処 |
| --- | --- | --- |
| API が `401 Unauthorized` を返す | REST API が無効、APIキーの誤り、ヘッダー名の誤り | 管理 → 設定 → API を確認。ヘッダーは `X-Redmine-API-Key` |
| API が `403 Forbidden` を返す | ユーザーにその操作・閲覧の権限がない（ロールの権限不足、非公開プロジェクトのメンバーでない） | 管理 → ロールと権限、プロジェクトのメンバー設定を確認 |
| API が `404 Not Found` を返す | 存在しない ID・識別子を指定した、URL（`.json` の付け忘れなど）の誤り | ID・プロジェクト識別子・パスを確認 |
| `422` と `{"errors":["Subject cannot be blank"]}` | 必須項目の不足・値の誤り。エラー文はユーザーの言語設定で日本語になる | `errors` の内容どおりに項目を補う。必須のカスタムフィールドも忘れずに |
| `Tracker is not included in the list` | プロジェクトでそのトラッカーが有効になっていない | プロジェクト → 設定 → チケットトラッキング でトラッカーを有効にする |
| `Invalid form authenticity token.` | 画面を開いたまま時間が経ってセッションが切れた、リバースプロキシ配下でセッション（Cookie）が正しく扱われていない | 再読み込みしてやり直す。頻発するならリバースプロキシのヘッダー設定と「プロトコル」設定を確認 |
| `Internal error`（500） | プラグインの不具合、DB マイグレーション漏れ、設定ファイルの誤り | `log/production.log` の該当時刻のスタックトレースを確認する |
| `You are not authorized to access this page.` | ロールに権限がない、プロジェクトのメンバーでない | メンバー設定とロールの権限を確認 |
| `413 Request Entity Too Large`（nginx） | nginx の `client_max_body_size` を超えるファイルを添付した | nginx と Redmine（管理 → 設定 → ファイル の「添付ファイルサイズの上限」）の両方を引き上げる |
| `An error occurred while sending mail (...)` | SMTP 設定の誤り、認証失敗、ポート・TLS の不一致 | `config/configuration.yml` を見直し、括弧内のメッセージで原因を特定。変更後は再起動 |
| ステータスの選択肢に目的のステータスが出ない | ワークフローでその遷移が許可されていない | 管理 → ワークフロー で、ロール×トラッカーの遷移を設定する |
| コミットがチケットに表示されない | リポジトリが取り込まれていない、キーワードの不一致、コミットのプロジェクト違い | `redmine:fetch_changesets` を実行。キーワードと、他プロジェクトのチケット参照を許可する設定を確認 |
| メールのリンクが `localhost` になる | 「ホスト名とパス」が初期値のまま | 管理 → 設定 → 全般 で実際のホスト名とプロトコルを設定する |
| プラグイン追加後に起動しない | Redmine のバージョンに対応していない、マイグレーション未実行 | 対応バージョンを確認し、`redmine:plugins:migrate` を実行。だめなら plugins/ から外して再起動 |

## 実務Tips

### 設計・運用ルール

- **トラッカーとステータスは少なく始める**（バグ・タスク・質問／新規・進行中・確認待ち・完了 など）。増やすほどワークフロー設定の組み合わせが増える
- 「確認待ち」「保留」など、**誰のボールかわかるステータス**を用意し、担当者も必ずボールを持っている人に変える
- 期日・対象バージョンを入れないチケットは、一覧で埋もれる。必須にするか、定例で棚卸しする
- 大きな作業は親チケットにし、子チケットで分割する。親の進捗率・工数は子から自動集計できる
- コメントには「何をしたか」「次に誰が何をするか」を書く。口頭で決めたことも残す

### 通知とフィルタ

- 通知が多すぎると誰も読まなくなる。個人設定 → メール通知 で「ウォッチ中または自分が関係しているもの」にしてもらう
- 「自分の担当・未完了・期日順」「今週の期日切れ」などのカスタムクエリを全員に公開し、マイページに貼る
- チケット一覧の CSV 出力で週次報告を作る場合は、保存クエリを使って毎回同じ条件で出す

### API・自動化

- 自動化用には**専用のボットユーザー**を作り、必要最小限のロールを割り当てる。個人のAPIキーを使うと退職時に止まる
- 一覧取得は最大100件ずつ。`total_count` を見て `offset` でページングする
- APIキーはスクリプトに直書きせず、環境変数や CI のシークレットに入れる

### バックアップ・アップグレード

- バックアップは**データベース**と **`files/`（添付ファイル）**の2つ。どちらかが欠けると復元できない

```sh
pg_dump -U redmine -Fc redmine > redmine_$(date +%Y%m%d).dump      # PostgreSQL
mysqldump -u redmine -p --single-transaction redmine > redmine_$(date +%Y%m%d).sql   # MySQL
tar czf redmine_files_$(date +%Y%m%d).tar.gz -C /path/to/redmine files
```

- アップグレード前に、**使っているプラグインが新バージョンに対応しているか**を確認する。止まる原因のほとんどはプラグイン
- アップグレードは検証環境に本番のバックアップを戻して先に試し、`db:migrate` と `redmine:plugins:migrate` の手順を確認してから本番で行う

## 関連リンク

- [Redmine Guide（公式）](https://www.redmine.org/projects/redmine/wiki/Guide)
- [Redmine のインストール（RedmineInstall）](https://www.redmine.org/projects/redmine/wiki/RedmineInstall)
- [Redmine のアップグレード（RedmineUpgrade）](https://www.redmine.org/projects/redmine/wiki/RedmineUpgrade)
- [Redmine REST API](https://www.redmine.org/projects/redmine/wiki/Rest_api)
- [REST API: Issues](https://www.redmine.org/projects/redmine/wiki/Rest_Issues)
- [Redmine プラグイン一覧](https://www.redmine.org/plugins)
- [Redmine 公式 Docker イメージ（Docker Hub）](https://hub.docker.com/_/redmine)
