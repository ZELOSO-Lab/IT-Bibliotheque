---
title: SVN 技術まとめ
slug: svn
excerpt: svnコマンド（Subversionのコマンドラインクライアント）の基本用語、インストールと初期設定、チェックアウトからコミット・ログ・差分・ブランチとマージまでの日常操作、よくあるエラー（E155004・E155011・E155015など）の対処、現場での運用Tipsを1ページにまとめました。
updated: 2026-10-19
---

# SVN 技術まとめ

## 基礎

SVN（Subversion）は、1台のサーバー上の**リポジトリ**にすべての履歴を集めて管理する**集中型**のバージョン管理システムです。このページでは、開発者が毎日使う **`svn` コマンド（コマンドラインクライアント）** の使い方を扱います。リポジトリの作成やサーバー構築・バックアップは「Apache Subversion」のページ、Windows のエクスプローラーから操作する方法は「TortoiseSVN」のページで解説しています。

### 主な用途

- ソースコード・設定ファイルの管理（特に長く続いている既存システムの保守）
- Excel・Word などの設計書やドキュメントの版管理
- Git への移行を前提とした、移行完了までの並行運用

### まず押さえる用語

| 用語 | 意味 | 現場での注意点 |
| --- | --- | --- |
| リポジトリ | 全履歴が保存されているサーバー側の保管庫 | URL（`https://`・`svn://`・`file://`）で指定する |
| 作業コピー（Working Copy） | チェックアウトして手元に作ったファイル一式 | 管理情報はトップの `.svn` フォルダ1つにまとまっている |
| リビジョン | コミットごとに増える**リポジトリ全体の通し番号**（r1, r2, ...） | ファイル単位ではなくリポジトリ全体で1つずつ増える |
| チェックアウト | リポジトリから作業コピーを作ること | Git の clone と違い、**指定したパスの最新版だけ**を取得する |
| 更新（update） | サーバーの最新を作業コピーに取り込む | コミット前に必ず実行する |
| コミット | 変更をサーバーに送ること | 送った瞬間に全員に共有される（Git の commit + push に相当） |
| trunk / branches / tags | 本流・ブランチ・タグを置く慣習的なフォルダ | SVN 自体に「ブランチ機能」はなく、**フォルダのコピー**で表現する |
| 競合（conflict） | 同じ箇所を別の人が変更していた状態 | 解決して `svn resolve` するまでコミットできない |

### Git との違い（Git 経験者向け）

| 観点 | SVN | Git |
| --- | --- | --- |
| 構成 | 集中型（サーバーが必須） | 分散型（ローカルに全履歴） |
| コミット | 即サーバーに反映 | ローカルに記録し、push で共有 |
| 履歴番号 | 連番のリビジョン（r1234） | ハッシュ値（a1b2c3d） |
| ブランチ | `svn copy` によるフォルダのコピー | 軽量なポインタ |
| 部分取得 | サブフォルダだけチェックアウトできる | 原則リポジトリ全体 |
| ロック | `svn lock` でファイルを排他できる | 標準ではなし（Git LFS で可能） |

Excel や画像のように**マージできないファイル**を排他的に編集できる点と、**サブフォルダ単位で取得・権限設定できる**点が、今も SVN が使われ続ける主な理由です。

## 環境構築

### 1. クライアントを入れる

| OS | 方法 | 備考 |
| --- | --- | --- |
| Windows | TortoiseSVN のインストール時に「command line client tools」を選択 | 既定では入らない。後から「変更」で追加できる |
| Ubuntu / Debian | `sudo apt install subversion` | |
| RHEL / Rocky / Alma | `sudo dnf install subversion` | |
| macOS | `brew install subversion` | |

```sh
svn --version --quiet     # 例: 1.14.3
```

**作業コピーの形式はクライアントのバージョンで決まります**。TortoiseSVN と svn コマンドを併用する場合は、両者のマイナーバージョン（1.14 など）を揃えます。

### 2. 設定ファイルの場所

| 内容 | Windows | Linux / macOS |
| --- | --- | --- |
| クライアント設定（`config`） | `%APPDATA%\Subversion\config` | `~/.subversion/config` |
| サーバーごとの設定（プロキシなど） | `%APPDATA%\Subversion\servers` | `~/.subversion/servers` |
| 保存された認証情報 | `%APPDATA%\Subversion\auth\` | `~/.subversion/auth/` |

TortoiseSVN と svn コマンドは**同じ設定・同じ認証キャッシュを共有**します。

### 3. 最初に設定しておく項目

```ini
# config
[miscellany]
global-ignores = *.o *.obj *.exe *.dll *.class bin obj .vs *.suo *.user Thumbs.db
enable-auto-props = yes

[auto-props]
*.sh = svn:eol-style=LF;svn:executable
*.bat = svn:eol-style=CRLF
*.xlsx = svn:needs-lock=*
*.docx = svn:needs-lock=*
```

```ini
# servers（社内プロキシ経由の場合）
[global]
http-proxy-host = proxy.example.co.jp
http-proxy-port = 8080
http-proxy-exceptions = *.example.local
```

### 4. 動作確認

```sh
svn info https://svn.example.com/repos/project/trunk   # 初回は認証を聞かれる
svn checkout https://svn.example.com/repos/project/trunk project
cd project
svn info
```

`svn info` で `URL`・`Revision`・`Working Copy Root Path` が表示されれば準備完了です。

## コマンド

### 取得・更新

```sh
svn checkout URL/trunk work            # 省略形: svn co
svn checkout URL/trunk work --depth immediates   # 直下だけ取得（巨大リポジトリ向け）
svn update                             # 最新に更新（svn up）
svn update -r 1234                     # 指定リビジョンに戻して確認
svn info                               # URL・リビジョン・ルートを表示
svn export URL/tags/v1.0 release       # .svn なしで取り出す（リリース用）
```

### 状態確認・コミット

```sh
svn status                    # 省略形: svn st
svn status -u                 # サーバー側の更新（*）も表示
svn diff                      # 作業コピーの差分
svn diff -r 1200:1234 src/    # リビジョン間の差分
svn diff -c 1234              # r1234 で入った変更だけ
svn add new.txt               # 新規ファイルを管理対象に
svn delete old.txt            # 削除（履歴は残る）
svn move a.txt b.txt          # 名前変更・移動（履歴を引き継ぐ）
svn commit -m "ログイン画面の入力チェックを追加"   # 省略形: svn ci
svn commit -m "修正" src/a.java src/b.java        # ファイルを指定してコミット
```

`svn status` の主な記号:

| 記号 | 意味 | 記号 | 意味 |
| --- | --- | --- | --- |
| `M` | 変更あり | `C` | 競合 |
| `A` | 追加予定 | `?` | 管理対象外 |
| `D` | 削除予定 | `!` | 管理対象だがファイルがない |
| `R` | 置換 | `*`（`-u` 時） | サーバーに新しい版がある |

### 履歴・調査

```sh
svn log -l 10                         # 直近10件
svn log -v -l 5                       # 変更ファイル一覧つき
svn log -r 1234 --diff                # r1234 の内容と差分
svn log --search "障害票123"          # メッセージ・作者で検索
svn log -r {2026-10-01}:{2026-10-19}  # 日付で範囲指定
svn blame src/Login.java              # 行ごとの最終変更者（svn praise / annotate も同じ）
svn cat -r 1200 src/Login.java        # 過去の版の中身を表示
```

### 取り消し

```sh
svn revert file.txt          # 未コミットの変更を破棄
svn revert -R .              # 配下すべてを破棄（元に戻せないので注意）
svn merge -c -1234 .         # コミット済み r1234 を打ち消す（逆マージ）→ 確認後 commit
svn cleanup                  # 中断した操作のロックを解除
```

### ブランチ・タグ・マージ

```sh
svn copy ^/trunk ^/branches/feature-x -m "feature-x ブランチ作成"
svn copy ^/trunk ^/tags/v1.0 -m "v1.0 リリース"
svn switch ^/branches/feature-x       # 作業コピーをブランチに切り替え
svn merge ^/trunk                     # trunk の変更をブランチへ取り込む（同期）
svn merge ^/branches/feature-x        # ブランチを trunk へ戻す（trunk の作業コピーで実行）
svn merge -c 1234 ^/trunk             # 特定リビジョンだけ取り込む（チェリーピック）
svn mergeinfo ^/branches/feature-x --show-revs eligible   # 未マージのリビジョン
svn list ^/branches                   # ブランチ一覧
```

`^/` は「この作業コピーのリポジトリのルート」を表す省略記法です。長い URL を書かずに済みます。

### ロック・プロパティ

```sh
svn lock 設計書.xlsx -m "編集中"      # 排他ロック
svn unlock 設計書.xlsx
svn propset svn:ignore "*.log" logs  # フォルダの無視設定
svn propedit svn:ignore .            # エディタで編集
svn proplist -v file.txt
svn relocate https://new-svn.example.com/repos/project   # サーバー移転時に URL を付け替え
```

## サンプル

### 毎日の作業の流れ

```sh
svn update                 # 1. 作業前に最新化
# 2. 編集
svn status                 # 3. 変更ファイルを確認（? の追加漏れに注意）
svn diff | less            # 4. 差分を目視確認
svn update                 # 5. コミット直前にもう一度更新し、競合がないか確認
svn commit -m "#1234 帳票出力の文字化けを修正"   # 6. コミット
```

### ブランチで開発して trunk に戻す

```sh
# ブランチ作成（サーバー上で一瞬で完了する）
svn copy ^/trunk ^/branches/feature-login -m "ログイン改修用ブランチ"
svn switch ^/branches/feature-login
# ...開発・コミットを繰り返す...

# 定期的に trunk の変更を取り込む
svn update
svn merge ^/trunk
svn commit -m "trunk の変更を取り込み"

# 完成したら trunk の作業コピーでマージ
svn switch ^/trunk
svn update
svn merge ^/branches/feature-login
svn diff                   # 内容確認
svn commit -m "feature-login を trunk にマージ"
```

マージ前に `svn update` するのは、作業コピーのリビジョンが混在していると `E195020` で止まるためです。

### 障害対応: 特定の変更だけ本番ブランチに反映する

```sh
svn switch ^/branches/release-2.3
svn update
svn merge -c 1501,1503 ^/trunk        # r1501 と r1503 だけ取り込む
svn commit -m "r1501,r1503 を release-2.3 に反映（障害票 456）"
```

### 間違ったコミットを取り消す

```sh
svn update
svn merge -c -1510 .                  # r1510 を打ち消す変更を作る
svn diff
svn commit -m "r1510 を取り消し（誤ってテスト用設定をコミットしたため）"
```

SVN では履歴そのものは消せません（管理者がリポジトリを作り直す以外に方法はない）。**打ち消しコミットで戻す**のが基本です。

### 無視設定（ビルド成果物をコミットしない）

```sh
svn propset svn:ignore -F ignore.txt .
svn commit -m "無視設定を追加" --depth empty .
```

```text
# ignore.txt
bin
obj
*.log
*.tmp
```

## エラー対応

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `svn: E155004: Run 'svn cleanup' to remove locks` | 更新・コミットが途中で中断し、作業コピーがロックされたまま | `svn cleanup` を実行。ほかの svn / TortoiseSVN の処理が動いていないか確認 |
| `svn: E155011: File '...' is out of date` | 自分が更新した後に、他の人が同じファイルをコミットした | `svn update` で取り込み、競合があれば解決してから再コミット |
| `svn: E155015: Aborting commit: '...' remains in conflict` | 競合が未解決のまま | ファイルを修正し `svn resolve --accept working ファイル` |
| `svn: E195020: Cannot merge into mixed-revision working copy` | 作業コピー内でリビジョンが混在している | `svn update` してからマージ |
| `svn: E195022: File '...' is locked in another working copy` | ほかの作業コピー（他人）がロック中 | `svn info ファイル` でロック所有者を確認し、解除を依頼 |
| `svn: E155007: '...' is not a working copy` | 作業コピーの外で実行した | `cd` で作業コピー内に移動する |
| `svn: E200009: '...' is not under version control` | `svn add` していないファイルをコミット対象に指定 | `svn add` してからコミット |
| `svn: warning: W150002: '...' is already under version control` | すでに管理対象のファイルを `add` した | 対処不要（無視してよい） |
| `svn: E155036: Please see the 'svn upgrade' command` | 古いクライアントで作った作業コピー | `svn upgrade` で作業コピー形式を更新 |
| `svn: E155021: This client is too old to work with the working copy` | 新しいクライアント（TortoiseSVN など）で作った作業コピー | svn コマンドを同じバージョンに上げる |
| `svn: E170013: Unable to connect to a repository at URL` | URL 誤り、サーバー停止、プロキシ、認証 | 次の行に出る詳細エラーを読む。URL・プロキシ設定を確認 |
| `svn: E170001: Authorization failed` / `Authentication error from server: Password incorrect` | 権限がない／パスワード誤り | 認証キャッシュを削除して入れ直す。権限は管理者に依頼 |
| `svn: E230001: Server SSL certificate verification failed: issuer is not trusted` | 社内CA・自己署名証明書 | 社内CA証明書を `servers` の `ssl-authority-files` に設定、または初回に `p`（永続的に受け入れ） |
| `svn: E165006: Repository has not been enabled to accept revision propchanges` | コミットログを後から修正しようとした | サーバー側で `pre-revprop-change` フックが必要（管理者に依頼） |

### 競合の解決手順

```sh
svn update
# C  src/Login.java  → 競合
svn status
# C  src/Login.java
# ?  src/Login.java.mine     ← 自分の版
# ?  src/Login.java.r1233    ← 元の版
# ?  src/Login.java.r1240    ← サーバーの最新版
```

1. `Login.java` 内の `<<<<<<< .mine` 〜 `>>>>>>> .r1240` を手で直す
2. `svn resolve --accept working src/Login.java`（補助ファイルも自動で消える）
3. ビルド・テストしてから `svn commit`

丸ごと片方を採用する場合は `--accept mine-full`（自分の版）または `--accept theirs-full`（サーバーの版）を使います。

### `!`（ファイルがない）状態

エクスプローラーで直接削除・名前変更すると `!` になります。削除したいなら `svn delete ファイル`、復元したいなら `svn update ファイル` です。名前変更は必ず `svn move` で行います。

## 実務Tips

### コミットの作法

- **コミット前に必ず `svn update` と `svn diff`**。SVN のコミットは即全員に共有され、取り消しにも打ち消しコミットが必要
- コミットメッセージに**チケット番号・障害票番号**を入れる。後から `svn log --search` で追える
- 1コミット1目的。整形（インデント修正など）と機能修正は分ける
- ファイルを指定してコミットするときは、`svn status` で**追加漏れ（`?`）**がないかを見る。ビルドが通らない状態でのコミットが一番多い事故

### ブランチ運用

- 標準構成 `trunk/branches/tags` を崩さない。タグは**コミット禁止**のルールを決め、サーバー側の権限で守る
- ブランチは長生きさせない。長期化する場合は**週1回以上 trunk を取り込む**
- マージは必ず**リポジトリのルートに相当するフォルダ（trunk 直下など）で実行**する。サブフォルダ単位でマージすると mergeinfo が細切れになる
- `--reintegrate` は 1.8 以降不要（非推奨）。通常の `svn merge ^/branches/xxx` で戻せる

### Excel・Word などのバイナリ

- `svn:needs-lock` を設定すると作業コピーで**読み取り専用**になり、`svn lock` してから編集する運用を強制できる
- 退職者・異動者のロックが残ったら `svn unlock --force URL`（権限が必要）。外す前に本人・上長に確認する

### 作業コピーのトラブルを避ける

- 作業コピーを**ネットワークドライブや OneDrive 同期フォルダに置かない**。`.svn/wc.db`（SQLite）が壊れやすい
- ウイルス対策ソフトのリアルタイムスキャンで `E155004` が出ることがある。作業フォルダを除外対象にできないか情報システム部門に相談する
- 壊れたと感じたら、修正中ファイルを退避して**チェックアウトし直す**のが最速
- Windows のパス長制限（260文字）に注意し、作業コピーは `C:\work\project` のように浅い場所に置く

### Git への移行を見据えて

- 移行時にコミット作者を対応付けるため、**SVN のユーザー名一覧**（`svn log -q | grep '^r' | awk '{print $3}' | sort -u`）を早めに整理しておく
- 移行ツール `git svn` は標準構成（`--stdlayout`）を前提にすると簡単。構成が独自だと手間が増える

## 関連リンク

- [Apache Subversion 公式ドキュメント](https://subversion.apache.org/docs/)
- [Version Control with Subversion（SVN Book）](https://svnbook.red-bean.com/)
- [Apache Subversion FAQ](https://subversion.apache.org/faq.html)
- [Apache Subversion ダウンロード（各OS向けバイナリ）](https://subversion.apache.org/packages.html)
