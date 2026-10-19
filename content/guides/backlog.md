---
title: Backlog 技術まとめ
slug: backlog
excerpt: Nulab の Backlog について、スペース・プロジェクト・課題の基本用語、プロジェクト立ち上げ時の設定、Git連携・Backlog記法 / Markdown・API v2 の使い方、課題の一括作成や集計のサンプル、APIやGitのよくあるエラーと対処、運用ルールのTipsまでを1ページにまとめました。
updated: 2026-10-19
---

# Backlog 技術まとめ

## 基礎

Backlog は、株式会社ヌーラボが提供するクラウド型のプロジェクト管理・タスク管理サービスです。課題（タスク）管理、ガントチャート、Wiki、ファイル共有、Git / Subversion リポジトリとプルリクエストが1つにまとまっていて、サーバーを用意せずにブラウザだけで使えます。エンジニア以外のメンバーや社外の協力会社も一緒に使いやすいのが特徴です。

**結論：Backlog は「プロジェクトキー」「種別」「状態」「マイルストーン」を最初に決めておけば、あとは課題を起票して回すだけで運用できます。** 設定を作り込むより、起票と更新のルールを揃えるほうが効果があります。

### まず押さえる用語

| 用語 | 意味 | 現場での注意点 |
| --- | --- | --- |
| スペース | 組織ごとの契約単位。`https://スペースID.backlog.jp`（または `.backlog.com`）で使う | API の URL もこのドメインになる。`.jp` と `.com` の取り違えに注意 |
| プロジェクト | 課題・Wiki・ファイル・リポジトリをまとめる単位 | 参加ユーザーだけが中身を見られる |
| プロジェクトキー | プロジェクトを表す英大文字の略称（例: `PROJ`） | 課題キー・Git の URL に使われる。短く、意味がわかるものにする |
| 課題 | タスク・バグ1件ずつの記録。`PROJ-123` の課題キーで呼ぶ | 本文やコメントに課題キーを書くと自動でリンクになる |
| 種別 | 課題の種類（タスク・バグ・要望など） | プロジェクトごとに追加・変更できる |
| 状態 | 未対応・処理中・処理済み・完了（＋独自の状態） | 「処理済み」は対応完了・確認待ち、「完了」は確認まで終わった状態として使うのが一般的 |
| 優先度 | 高・中・低 | 「全部高」にならないよう基準を決める |
| マイルストーン | リリースや納期の区切り | ガントチャート・バーンダウンチャートの単位になる |
| カテゴリー | 機能・画面などの分類 | 集計や絞り込みに使う |
| 親課題 / 子課題 | 大きな課題を分割したもの | 親子は1階層。細かすぎる分割は追いきれなくなる |

### ユーザーの権限

| 権限 | できること（概要） |
| --- | --- |
| 管理者 | スペース全体の設定・ユーザー管理 |
| 一般ユーザー | プロジェクトの作成、課題・Wiki などの操作 |
| レポーター | 課題の追加・コメントはできるが、プロジェクトの作成などはできない |
| 閲覧者 | 閲覧が中心 |
| ゲスト（レポーター / 閲覧者） | 参加しているプロジェクトだけ。社外メンバー向け |

プロジェクトの設定を変更できるのは、管理者と「プロジェクト管理者」に指定されたユーザーです。細かい可否はヘルプセンターで確認します。

## 環境構築

Backlog はクラウドサービスなので、インストールは不要です。ここでの「環境構築」は、**スペースとプロジェクトを使える状態にすること**を指します。

### 1. スペースを作る

1. 公式サイトから申し込み、スペースID（URL の一部になる）を決める
2. 管理者アカウントでログインし、スペースの設定で組織名・ロゴ・タイムゾーンなどを確認する
3. ユーザーを招待し、権限（管理者・一般ユーザー・ゲストなど）を割り当てる
4. 二段階認証の必須化など、使えるセキュリティ設定を確認する（利用できる機能はプランによって異なる）

### 2. プロジェクトを作る

| 項目 | 決めること | ポイント |
| --- | --- | --- |
| プロジェクト名 | 画面に表示される名前 | 案件名・システム名 |
| プロジェクトキー | 英大文字の略称 | 課題キー（`PROJ-123`）になる。後から変えると混乱するので最初に決める |
| テキスト整形のルール | Backlog 記法 か Markdown | エンジニア中心なら Markdown が無難。Wiki・課題・コメントすべてに適用される |
| 参加ユーザー | プロジェクトに入れるメンバー | 社外メンバーはゲストで招待する |

### 3. プロジェクト設定

プロジェクトの「プロジェクト設定」から、次の順で整えます。

1. **種別**: タスク・バグ・要望・その他 など。種別ごとにテンプレートを用意しておくと起票がそろう
2. **カテゴリー**: 画面・機能・チームなど、集計したい切り口
3. **マイルストーン**: リリース日や納期。期日を入れるとガントチャートで見える
4. **状態**: 標準の4つで足りなければ「レビュー待ち」などを追加
5. **Git / Subversion**: リポジトリを使う場合は有効にしてリポジトリを作る
6. **インテグレーション**: Slack などのチャット通知、Webhook

### 4. 個人設定（各メンバー）

- **SSH 公開鍵の登録**（Git を SSH で使う場合）
- **API キーの発行**（個人設定 → API。スクリプトや連携ツールで使う）
- メール通知の受け取り方、通知を受けるプロジェクトの設定

### 5. Git リポジトリを使う

```sh
# リポジトリ画面に表示される URL をそのままコピーして使う
git clone <リポジトリ画面に表示される SSH または HTTPS の URL>
cd repo
git switch -c feature/PROJ-123-login
git commit -m "PROJ-123 ログイン画面のバリデーションを追加"
git push -u origin feature/PROJ-123-login
```

プッシュしたら、Backlog のリポジトリ画面からプルリクエストを作成し、レビュアーと関連課題を指定します。

## コマンド

### コミットから課題を参照・更新

| 操作 | コマンド・構文 |
| --- | --- |
| 課題に関連付け | `git commit -m "PROJ-123 ログイン画面を修正"` |
| 処理済みにする | `git commit -m "PROJ-123 #fix 修正完了"` |
| 完了にする | `git commit -m "PROJ-123 #close 対応不要のため"` |
| 複数の課題 | `git commit -m "PROJ-123 PROJ-124 共通部品の修正"` |

コミットメッセージに課題キーを含めてプッシュすると、課題のコメントにコミットが記録されます。状態変更のキーワードは、運用に入る前にテスト用の課題で動作を確かめておくと安心です。

### Backlog 記法と Markdown

| 操作 | Backlog 記法 | Markdown |
| --- | --- | --- |
| 見出し | `* 見出し1` / `** 見出し2` | `# 見出し1` / `## 見出し2` |
| 太字 | `''太字''` | `**太字**` |
| 斜体 | `'''斜体'''` | `*斜体*` |
| 取り消し線 | `%%取り消し%%` | `~~取り消し~~` |
| 箇条書き | `- 項目`（入れ子は `--`） | `- 項目`（入れ子はインデント） |
| 番号付きリスト | `+ 項目` | `1. 項目` |
| 引用 | `> 引用` | `> 引用` |
| リンク | `[[表示名>https://example.com]]` | `[表示名](https://example.com)` |
| Wiki ページへのリンク | `[[ページ名]]` | `[[ページ名]]` |
| 課題へのリンク | `PROJ-123` | `PROJ-123` |

コードと表は次のように書きます。

````text
Backlog 記法:
{code}
SELECT * FROM users;
{/code}

|項目|内容|h
|環境|本番|

Markdown:
```sql
SELECT * FROM users;
```

| 項目 | 内容 |
| --- | --- |
| 環境 | 本番 |
````

Backlog 記法の表は、行末に `h` を付けるとその行が見出し行になります。記法の全一覧は、編集画面の「ヘルプ」から確認できます。

### 検索・絞り込み

- 課題一覧の検索条件（状態・担当者・種別・カテゴリー・マイルストーン・期限日・キーワード）を組み合わせて絞り込み、**よく使う条件は保存**しておく
- 「担当者: 自分」「状態: 完了以外」「期限日: 今日まで」で、自分の遅れている課題が一覧になる
- 複数の課題を選んで、担当者・状態・マイルストーンなどを一括で変更できる
- 課題一覧は CSV / Excel 形式で出力できる（集計や報告資料に使う）

### API v2（curl）

APIキーは 個人設定 → API で発行します。URL はスペースのドメインに `/api/v2/` を付けたものです。

```sh
export BACKLOG_URL=https://example.backlog.jp
export BACKLOG_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 自分の情報（APIキーの確認）
curl -s "$BACKLOG_URL/api/v2/users/myself?apiKey=$BACKLOG_KEY"

# プロジェクト情報（プロジェクトIDの確認）
curl -s "$BACKLOG_URL/api/v2/projects/PROJ?apiKey=$BACKLOG_KEY"

# 課題一覧（未対応・処理中、更新日の新しい順に100件）
curl -s -G "$BACKLOG_URL/api/v2/issues" \
  --data-urlencode "apiKey=$BACKLOG_KEY" \
  --data-urlencode "projectId[]=12345" \
  --data-urlencode "statusId[]=1" \
  --data-urlencode "statusId[]=2" \
  --data-urlencode "keyword=ログイン" \
  -d sort=updated -d order=desc -d count=100

# 課題1件
curl -s "$BACKLOG_URL/api/v2/issues/PROJ-123?apiKey=$BACKLOG_KEY"

# コメント追加
curl -s -X POST "$BACKLOG_URL/api/v2/issues/PROJ-123/comments?apiKey=$BACKLOG_KEY" \
  --data-urlencode "content=修正しました。確認をお願いします。"

# 状態を「処理済み」に変更してコメント
curl -s -X PATCH "$BACKLOG_URL/api/v2/issues/PROJ-123?apiKey=$BACKLOG_KEY" \
  -d statusId=3 --data-urlencode "comment=修正をリリースしました。"
```

| 操作 | メソッド・パス |
| --- | --- |
| 自分の情報 | `GET /api/v2/users/myself` |
| プロジェクト一覧 / 1件 | `GET /api/v2/projects` / `GET /api/v2/projects/PROJ` |
| 種別一覧 | `GET /api/v2/projects/PROJ/issueTypes` |
| 状態一覧 | `GET /api/v2/projects/PROJ/statuses` |
| 優先度一覧 | `GET /api/v2/priorities` |
| 参加ユーザー一覧 | `GET /api/v2/projects/PROJ/users` |
| 課題一覧 / 件数 | `GET /api/v2/issues` / `GET /api/v2/issues/count` |
| 課題取得 | `GET /api/v2/issues/PROJ-123` |
| 課題追加 | `POST /api/v2/issues` |
| 課題更新 | `PATCH /api/v2/issues/PROJ-123` |
| コメント一覧 / 追加 | `GET` / `POST /api/v2/issues/PROJ-123/comments` |
| 添付ファイルの送信 | `POST /api/v2/space/attachment`（multipart の `file`） |
| Wiki 一覧 | `GET /api/v2/wikis?projectIdOrKey=PROJ` |
| 認証 | クエリパラメータ `apiKey=<APIキー>`（アプリでは OAuth 2.0） |

- 配列のパラメータは `projectId[]=1&projectId[]=2` のように `[]` を付けて繰り返す
- 一覧の `count` は最大100。`offset` をずらして全件取得する
- 標準の状態IDは 1: 未対応、2: 処理中、3: 処理済み、4: 完了。優先度IDは 2: 高、3: 中、4: 低
- 日付は `2026-10-31` の形式（`dueDate`・`startDate` など）

## サンプル

### 課題を追加する（シェル）

```sh
#!/bin/sh
# 使い方: ./add_issue.sh "件名" "詳細"
set -eu
: "${BACKLOG_URL:?BACKLOG_URL を設定してください}"
: "${BACKLOG_KEY:?BACKLOG_KEY を設定してください}"

PROJECT_ID=12345    # GET /api/v2/projects/PROJ の id
ISSUE_TYPE_ID=67890 # GET /api/v2/projects/PROJ/issueTypes の id

curl -s -f -X POST "$BACKLOG_URL/api/v2/issues?apiKey=$BACKLOG_KEY" \
  -d projectId="$PROJECT_ID" \
  -d issueTypeId="$ISSUE_TYPE_ID" \
  -d priorityId=3 \
  --data-urlencode "summary=$1" \
  --data-urlencode "description=${2:-}" \
  -d dueDate="$(date -d '+7 day' +%Y-%m-%d)" |
  jq -r '.issueKey'
```

課題追加の必須項目は `projectId`・`summary`・`issueTypeId`・`priorityId` です。プロジェクトキーではなく**数値のID**が必要なので、先に取得しておきます。日本語を含む値は `--data-urlencode` で送ります（`date -d` は GNU date の書き方です）。

### 担当者別・状態別の件数を集計する（Python）

```python
import collections
import os

import requests

BASE = os.environ["BACKLOG_URL"] + "/api/v2"
KEY = os.environ["BACKLOG_KEY"]


def fetch_issues(project_id):
    offset = 0
    while True:
        res = requests.get(f"{BASE}/issues", params={
            "apiKey": KEY,
            "projectId[]": project_id,
            "count": 100,
            "offset": offset,
        }, timeout=30)
        res.raise_for_status()
        issues = res.json()
        if not issues:
            break
        yield from issues
        offset += len(issues)


counter = collections.Counter()
for issue in fetch_issues(12345):
    assignee = (issue.get("assignee") or {}).get("name", "未割り当て")
    counter[(assignee, issue["status"]["name"])] += 1

for (assignee, status), n in sorted(counter.items()):
    print(f"{assignee}\t{status}\t{n}")
```

課題一覧のレスポンスは課題の配列そのものなので、空の配列が返ったら終わりです。担当者が未設定の課題は `assignee` が `null` になるため、`or {}` で受けます。

### 課題テンプレート（Markdown）

```markdown
## 現象

## 再現手順
1. 
2. 

## 期待する結果

## 発生環境
- 環境: 本番 / ステージング
- ブラウザ:

## 対応内容（対応者が記入）
```

種別ごとのテンプレートとして登録しておくと、起票の抜け漏れが減ります。

### ブランチとプルリクエストの運用例

| 項目 | ルール例 |
| --- | --- |
| ブランチ名 | `feature/PROJ-123-login`（課題キーを入れる） |
| コミットメッセージ | 先頭に課題キー `PROJ-123 〜を修正` |
| プルリクエスト | 関連課題に `PROJ-123` を指定し、レビュアーを設定 |
| マージ後 | 課題を「処理済み」にし、確認者が確認して「完了」にする |

## エラー対応

API のエラーは、HTTP ステータスと次の形式の JSON で返ります。`code` と `message` を見れば原因がほぼわかります。

```json
{"errors": [{"message": "...", "code": 11, "moreInfo": ""}]}
```

| エラー（code）・症状 | HTTP | 主な原因 | 対処 |
| --- | --- | --- | --- |
| `AuthenticationError`（11） | 401 | APIキーの誤り・削除済み、スペースのドメイン違い（`.jp` / `.com`） | `/api/v2/users/myself` で確認。URL のドメインを見直す |
| `UnauthorizedOperationError`（5） | 403 | その操作の権限がない（プロジェクト未参加、権限不足） | APIキーの持ち主の権限とプロジェクトの参加状況を確認 |
| `NoResourceError`（6） | 404 | 課題キー・プロジェクトキー・ID の誤り、参照権限がない | キーの綴りと、そのユーザーで画面から見えるかを確認 |
| `InvalidRequestError`（7） | 400 | 必須パラメータの不足、ID の誤り（存在しない種別IDなど）、日付形式の誤り | `message` の内容を確認。ID 類は一覧APIで取り直す |
| `TooManyRequestsError`（13） | 429 | 短時間に API を呼びすぎた | 間隔を空けて再試行。レスポンスヘッダーの `X-RateLimit-Remaining` `X-RateLimit-Reset` を見て待つ |
| `TooLargeFileError`（10） | ─ | 添付ファイルが上限を超えた | ファイルを分割・圧縮する |
| `LicenceError`（2） | ─ | 利用中のプランでは使えない機能 | プランの機能を確認する |
| 日本語が文字化け・途中で切れる | ─ | URL エンコードせずに送った | `--data-urlencode` を使う |
| 一覧が20件しか返らない | ─ | `count` の既定値が20 | `count=100` と `offset` でページングする |

### Git のエラー

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `Permission denied (publickey).` / `fatal: Could not read from remote repository.` | SSH 公開鍵が Backlog に登録されていない、別の鍵を使っている | 個人設定で公開鍵を登録。`ssh -v` でどの鍵を送っているか確認する |
| `fatal: Authentication failed for 'https://...'` | HTTPS のユーザー名・パスワードの誤り、保存済み認証情報が古い | 資格情報マネージャーなどに保存された古い認証情報を削除して入力し直す |
| `! [rejected] ... (non-fast-forward)` | リモートに自分の手元にないコミットがある | `git pull --rebase` してから再度プッシュする |
| コミットが課題に表示されない | 課題キーの誤り（全角の `－` や余分な空白）、別プロジェクトのキー | メッセージの課題キーを確認する。過去のコミットは書き換えず、課題に手動でコメントする |

## 実務Tips

### 起票・更新のルールを揃える

- **件名は「何をどうする」が一覧だけでわかるように**書く（例: `ログイン画面: パスワード誤り時のメッセージを修正`）
- 担当者は「今ボールを持っている人」にする。確認依頼したら確認者に担当を変える
- 期限日とマイルストーンを入れない課題は、ガントチャートにも出ず埋もれる。起票時に入れる
- 状態は「未対応 → 処理中 → 処理済み → 完了」の意味をチームで決め、Wiki に書いておく
- 口頭・チャットで決まったことも、課題のコメントに残す。後から経緯を追えるのは課題だけ

### 通知とコミュニケーション

- コメント時に「お知らせしたいユーザー」を指定し、読んでほしい人に確実に届ける
- 通知が多すぎるとメールが読まれなくなる。チャット連携（Slack など）は重要なプロジェクトに絞る
- 社外メンバーとの共有プロジェクトでは、社内向けの話を書かない。社内用プロジェクトを分ける

### API・連携

- 連携用には**専用のユーザーと APIキー**を用意し、個人のキーを使い回さない
- APIキーは URL パラメータで送るため、**URL ごとログに残らないよう**注意する（CI のログ出力、プロキシのアクセスログ）
- 外部に配布するアプリや複数ユーザーで使うツールは、APIキーではなく OAuth 2.0 を使う
- 大量の課題を一括登録するときは、1件ずつ間隔を空けてレート制限に引っかからないようにする
- 課題の作成・更新をきっかけに処理したい場合は、ポーリングより Webhook（プロジェクト設定 → インテグレーション）を使う

### 運用の見直し

- 完了した課題は削除せず「完了」のまま残す。過去の不具合の検索に使える
- 定例で「期限切れ」「担当者なし」「長期間更新なし」の検索条件を開き、棚卸しする
- 種別やカテゴリーは増やしすぎない。使われていない項目は定期的に整理する

## 関連リンク

- [Backlog ヘルプセンター](https://support-ja.backlog.com/hc/ja)
- [Backlog API ドキュメント（Nulab Developer）](https://developer.nulab.com/ja/docs/backlog/)
- [Backlog 公式サイト](https://backlog.com/ja/)
- [Nulab 公式サイト](https://nulab.com/ja/)
