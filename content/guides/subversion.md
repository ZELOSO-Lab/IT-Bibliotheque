---
title: Apache Subversion 技術まとめ
slug: subversion
excerpt: Apache Subversionをサーバー側から扱うためのまとめです。リポジトリの仕組み、svnserve・Apache（mod_dav_svn）での公開、authzによるアクセス権、svnadmin・svnlookのコマンド、フックのサンプル、dump / load / hotcopyによるバックアップと移行、よくあるエラーと運用Tipsを1ページにまとめました。
updated: 2026-10-19
---

# Apache Subversion 技術まとめ

## 基礎

Apache Subversion は Apache Software Foundation が開発する集中型バージョン管理システムです。このページでは**リポジトリを用意し、公開し、守る側（管理者・インフラ担当）**の視点でまとめます。開発者が日常で使う `svn` コマンドは「SVN」のページ、Windows の GUI クライアントは「TortoiseSVN」のページを参照してください。

### 主な用途

- リポジトリの作成と標準構成（trunk / branches / tags）の用意
- svnserve / Apache httpd での公開とアクセス権の設定
- バックアップ・サーバー移行・リポジトリの分割統合
- フックによるコミット時のチェックや通知

### 構成要素

| 要素 | 役割 | 現場での注意点 |
| --- | --- | --- |
| リポジトリ | 履歴を保存するディレクトリ（FSFS 形式） | 中のファイルを**直接編集・コピーしない**。必ず `svnadmin` を使う |
| `svnadmin` | リポジトリの作成・ダンプ・ロード・検証 | サーバー上で直接実行する管理コマンド |
| `svnlook` | リポジトリの中身を読み取り専用で参照 | フックスクリプトの中でよく使う |
| `svnserve` | 独自プロトコル `svn://`（ポート 3690）のサーバー | 構築が簡単。通信は暗号化されない |
| Apache httpd + `mod_dav_svn` | `http://` / `https://` で公開 | HTTPS・LDAP / AD 認証と組み合わせやすい |
| フック | コミット前後などに実行されるスクリプト | `hooks/` に置き、実行権限が必要 |
| authz | パスごとのアクセス権設定ファイル | svnserve と Apache で書式は共通 |

### リポジトリの中身

```text
/var/svn/project/
├── conf/      svnserve.conf, passwd, authz（svnserve 用の設定）
├── db/        履歴データ本体（FSFS）。触らない
├── format
├── hooks/     *.tmpl がテンプレート。拡張子を外して使う
├── locks/
└── README.txt
```

### アクセス方式の選び方

| URL | サーバー | 向いている場面 |
| --- | --- | --- |
| `file:///var/svn/project` | なし（直接アクセス） | サーバー上での管理作業・検証のみ。共有運用には使わない |
| `svn://server/project` | svnserve | 閉じた社内ネットワーク、小規模チーム |
| `https://server/svn/project` | Apache + mod_dav_svn | 全社利用、AD 連携、外部からのアクセス |
| `svn+ssh://server/var/svn/project` | SSH 経由で svnserve を起動 | Linux ユーザーが SSH を持っている環境 |

迷ったら **Apache + HTTPS** が無難です。Windows サーバーで手早く用意したい場合は、Apache と管理画面を同梱した VisualSVN Server のような製品もよく使われています。

## 環境構築

### 1. インストール（Linux）

```sh
# Ubuntu / Debian
sudo apt install subversion apache2 libapache2-mod-svn
sudo a2enmod dav_svn authz_svn

# RHEL / Rocky / AlmaLinux
sudo dnf install subversion httpd mod_dav_svn
```

### 2. リポジトリを作り、標準構成を入れる

```sh
sudo mkdir -p /var/svn
sudo svnadmin create /var/svn/project
sudo svn mkdir file:///var/svn/project/trunk \
               file:///var/svn/project/branches \
               file:///var/svn/project/tags -m "初期構成"
svnlook tree /var/svn/project
```

### 3-A. svnserve で公開する

```ini
# /var/svn/project/conf/svnserve.conf
[general]
anon-access = none
auth-access = write
password-db = passwd
authz-db = authz
realm = Project Repository
```

```ini
# /var/svn/project/conf/passwd（平文で保存される点に注意）
[users]
taro = Passw0rd!
hanako = Passw0rd!
```

```sh
svnserve -d -r /var/svn              # デーモン起動。-r は公開するルート
# 接続確認（クライアント側）
svn list svn://svn-server/project
```

常駐させる場合は systemd のユニットを作ります。

```ini
# /etc/systemd/system/svnserve.service
[Unit]
Description=Subversion svnserve
After=network.target

[Service]
User=svn
ExecStart=/usr/bin/svnserve --daemon --foreground --root /var/svn --log-file /var/log/svnserve/svnserve.log
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```sh
sudo useradd -r -s /sbin/nologin svn
sudo chown -R svn:svn /var/svn
sudo mkdir -p /var/log/svnserve && sudo chown svn:svn /var/log/svnserve
sudo systemctl daemon-reload && sudo systemctl enable --now svnserve
```

### 3-B. Apache httpd（mod_dav_svn）で公開する

```apache
# Ubuntu: /etc/apache2/mods-available/dav_svn.conf など
<Location /svn>
    DAV svn
    SVNParentPath /var/svn
    SVNListParentPath On

    AuthType Basic
    AuthName "Subversion Repository"
    AuthUserFile /etc/svn/htpasswd
    AuthzSVNAccessFile /etc/svn/authz
    Require valid-user
</Location>
```

```sh
sudo mkdir -p /etc/svn
sudo htpasswd -c -B /etc/svn/htpasswd taro   # 2人目以降は -c を付けない
sudo htpasswd -B /etc/svn/htpasswd hanako
sudo chown -R www-data:www-data /var/svn     # RHEL 系は apache:apache
sudo apachectl configtest && sudo systemctl reload apache2   # RHEL 系は httpd
```

- `SVNParentPath` は配下のリポジトリをまとめて公開します（`https://server/svn/project`）。1つだけなら `SVNPath`
- **Apache 経由では `conf/svnserve.conf`・`conf/passwd` は使われません**。認証は Apache 側で行います
- 本番は必ず HTTPS にします。Basic 認証は HTTP だとパスワードが平文で流れます
- RHEL 系で SELinux が有効なら、リポジトリに書き込み可能なコンテキスト（`httpd_sys_rw_content_t`）を付けます

## コマンド

### svnadmin（リポジトリ管理）

| 操作 | コマンド |
| --- | --- |
| 作成 | `svnadmin create /var/svn/repo` |
| 情報（形式・リビジョン数） | `svnadmin info /var/svn/repo` |
| 整合性チェック | `svnadmin verify /var/svn/repo` |
| ダンプ（全体） | `svnadmin dump /var/svn/repo > repo.dump` |
| ダンプ（範囲・差分） | `svnadmin dump /var/svn/repo -r 1001:2000 --incremental > 1001-2000.dump` |
| ロード | `svnadmin load /var/svn/new < repo.dump` |
| ホットコピー | `svnadmin hotcopy /var/svn/repo /backup/repo` |
| 差分ホットコピー | `svnadmin hotcopy --incremental /var/svn/repo /backup/repo` |
| ログメッセージの修正 | `svnadmin setlog /var/svn/repo -r 120 msg.txt --bypass-hooks` |
| ロック一覧・強制解除 | `svnadmin lslocks /var/svn/repo` / `svnadmin rmlocks /var/svn/repo /trunk/a.xlsx` |
| 残骸トランザクションの掃除 | `svnadmin lstxns /var/svn/repo` / `svnadmin rmtxns /var/svn/repo 名前` |
| パック（ファイル数削減） | `svnadmin pack /var/svn/repo` |
| 形式の更新 | `svnadmin upgrade /var/svn/repo` |

### svnlook（読み取り専用の調査）

```sh
svnlook youngest /var/svn/repo           # 最新リビジョン番号
svnlook info -r 120 /var/svn/repo        # 作者・日時・ログ
svnlook log -r 120 /var/svn/repo
svnlook author -r 120 /var/svn/repo
svnlook changed -r 120 /var/svn/repo     # 変更されたパス一覧（U / A / D）
svnlook diff -r 120 /var/svn/repo
svnlook tree /var/svn/repo /trunk --full-paths | head
# フック内ではトランザクションを -t で指定する
svnlook changed -t "$TXN" "$REPOS"
```

### svnserve・アクセス権の確認

```sh
svnserve -d -r /var/svn --listen-port 3690
svnserve -d -r /var/svn --read-only          # 移行作業中などに読み取り専用で公開
svnauthz validate /etc/svn/authz             # authz の書式チェック
svnauthz accessof --username hanako --path /tags /etc/svn/authz   # 権限の確認（r / rw / no）
```

## サンプル

### authz（パスごとのアクセス権）

```ini
[groups]
dev = taro, jiro
leader = hanako
partner = vendor01

# 全リポジトリ共通（SVNParentPath の場合）
[/]
@dev = rw
@leader = rw
* =

# タグはリーダーのみ書き込み可（誤コミット防止）
[project:/tags]
@leader = rw
@dev = r

# 協力会社は特定フォルダだけ
[project:/trunk/modules/batch]
@partner = rw
```

- セクション名は `[パス]` または `[リポジトリ名:パス]`
- 下位のパスの設定が上位より**優先**されます
- `* =` は「その他全員は権限なし」。匿名アクセスを確実に閉じたいときに書きます

### pre-commit フック（空のコミットメッセージを拒否）

```sh
#!/bin/sh
# /var/svn/project/hooks/pre-commit（chmod +x が必要）
REPOS="$1"
TXN="$2"
SVNLOOK=/usr/bin/svnlook

LOG=$($SVNLOOK log -t "$TXN" "$REPOS")
if [ -z "$(echo "$LOG" | tr -d '[:space:]')" ]; then
  echo "Commit message is required." >&2
  exit 1
fi
exit 0
```

フックは**環境変数がほぼ空の状態**で実行されるため、コマンドは絶対パスで書きます。標準エラー出力の内容が、拒否されたクライアントに表示されます。

### pre-revprop-change フック（ログメッセージの修正だけ許可）

```sh
#!/bin/sh
REPOS="$1"
REV="$2"
USER="$3"
PROPNAME="$4"
ACTION="$5"

if [ "$ACTION" = "M" ] && [ "$PROPNAME" = "svn:log" ]; then
  exit 0
fi
echo "Only svn:log may be modified." >&2
exit 1
```

これがないと、利用者はコミット後にログメッセージを直せません（`E165006`）。リビジョンプロパティは**履歴が残らない**ため、作者（`svn:author`）や日時の変更は許可しないのが一般的です。

Windows サーバーでは `pre-commit.bat` のように**拡張子 `.bat` / `.exe`** のファイルを置きます。

### post-commit フック（コミット通知をログに追記）

```sh
#!/bin/sh
REPOS="$1"
REV="$2"
/usr/bin/svnlook info -r "$REV" "$REPOS" >> /var/log/svn/commits.log
/usr/bin/svnlook changed -r "$REV" "$REPOS" >> /var/log/svn/commits.log
```

post-commit はコミット完了後に動くため、**失敗してもコミットは取り消されません**。時間のかかる処理（メール送信・CI 起動）はバックグラウンドで実行し、利用者を待たせないようにします。

### 夜間バックアップスクリプト

```sh
#!/bin/sh
set -eu
DATE=$(date +%Y%m%d)
for REPO in /var/svn/*/; do
  NAME=$(basename "$REPO")
  svnadmin verify -q "$REPO"
  svnadmin hotcopy "$REPO" "/backup/svn/$NAME-$DATE"
  svnadmin dump -q "$REPO" | gzip > "/backup/svn/$NAME-$DATE.dump.gz"
done
find /backup/svn -maxdepth 1 -mtime +14 -exec rm -rf {} +
```

| 方式 | 特徴 | 用途 |
| --- | --- | --- |
| `hotcopy` | 稼働中でも安全にコピー。そのまま差し替えて使える | 障害時の素早い復旧 |
| `dump` | バージョンに依存しないテキスト形式。サイズは大きい | 長期保管・サーバー移行・バージョンアップ |
| `cp` / `rsync` | **稼働中は不整合になりうる** | 使わない（停止中のみ） |

### サーバー移行（旧サーバー → 新サーバー）

```sh
# 旧サーバー（書き込みを止めてから）
svnadmin dump -q /var/svn/project | gzip > project.dump.gz
# 新サーバー
svnadmin create /var/svn/project
gunzip -c project.dump.gz | svnadmin load -q /var/svn/project
svnadmin verify -q /var/svn/project
cp 旧/hooks/* 新/hooks/       # フック・conf はダンプに含まれないので別途コピー
```

クライアント側は `svn relocate 新URL` で作業コピーの接続先を付け替えれば、チェックアウトし直す必要はありません。

## エラー対応

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `svn: E170001: Authentication error from server: Password incorrect` | svnserve の `passwd` と不一致 | `conf/passwd` を確認。`password-db` の指定先が正しいか確認 |
| `svn: E170001: Authorization failed` | authz で権限がない、`anon-access` の設定 | `svnauthz accessof` で権限を確認 |
| `svn: E220004: Access denied` | 読み取り権限しかないパスへの書き込み | authz で `rw` を付与（意図どおりならそのまま） |
| `svn: E000111: Can't connect to host '...': Connection refused` | svnserve / Apache が起動していない、ポートが閉じている | プロセスと `ss -lntp`、ファイアウォール（3690 / 443）を確認 |
| `svn: E165001: Commit blocked by pre-commit hook (exit code 1) with output:` | フックがコミットを拒否 | 続く出力（フックの標準エラー）を読む |
| `[Error output could not be translated from the native locale to UTF-8.]` | フックが日本語を出力したが、サーバープロセスのロケールが UTF-8 でない | フックのメッセージを英語にする、または svnserve / httpd を UTF-8 ロケールで起動する |
| フック実行時の `Permission denied` | 実行権限がない、改行コードが CRLF | `chmod +x`、`sed -i 's/\r$//' hooks/pre-commit` |
| `svn: E165006: Repository has not been enabled to accept revision propchanges` | `pre-revprop-change` フックがない | 上記サンプルのフックを置く |
| `svn: E000013: Can't open file '.../db/txn-current-lock': Permission denied` | リポジトリの所有者とサーバープロセスのユーザーが違う | `chown -R`（www-data / apache / svn）。root で `svnadmin` を実行した後によく起きる |
| Apache 経由で `403 Forbidden` | authz の権限、ファイルの所有者、SELinux | `error_log` を確認。所有者と SELinux コンテキストを見直す |
| `svn: E230001: Server SSL certificate verification failed: issuer is not trusted` | 自己署名・社内CAの証明書 | 正規の証明書を使うか、クライアントに社内CA証明書を配布する |
| `svnadmin load` が途中で止まる | ダンプの破損、ディスク容量不足、UUID の衝突 | `df -h` を確認。既存リポジトリへのロードは `--ignore-uuid` の要否を検討 |

**フックの切り分け手順**

1. フックを手で実行する: `sudo -u www-data env - /var/svn/project/hooks/pre-commit /var/svn/project テスト用TXN`（環境変数を空にして再現）
2. 失敗したら `exit 0` だけのフックにして、フックそのものが起動するか確認する
3. 先頭行（`#!/bin/sh`）・実行権限・改行コード・絶対パスを順に疑う

## 実務Tips

### バックアップ・復旧

- **バックアップは「戻せること」まで確認**する。年1回は別サーバーへの `load` 訓練を行う
- `svnadmin verify` を定期実行し、ディスク障害による破損を早く見つける
- ダンプには**フック・`conf/`（authz・passwd）が含まれない**。別途バックアップ対象に入れる
- リポジトリを `rsync` / ファイルコピーで複製しない。必ず `hotcopy` か `dump`

### アクセス権・セキュリティ

- svnserve の `passwd` は平文。全社運用なら Apache + HTTPS + LDAP / AD 認証（`mod_authnz_ldap`）を検討する
- authz は**グループ単位**で書き、個人名を直接並べない。異動・退職時の修正漏れを防ぐ
- `tags` は書き込みを絞り、リリース後のタグ改変を防ぐ
- 誤ってパスワードや個人情報をコミットした場合、`svnadmin dump` → `svndumpfilter exclude` → `load` でリポジトリを作り直すしか完全に消す方法はない。影響範囲が大きいので、まず**権限で閲覧を止めてから**計画する

### リポジトリ設計

- リポジトリは**プロジェクト（リリース単位）ごと**に分けるのが基本。巨大な1リポジトリは権限・バックアップ・移行がすべて重くなる
- 分割・統合は `svnadmin dump` と `svndumpfilter include / exclude`、`svnadmin load --parent-dir` で行う（例: `svnadmin dump -q repo | svndumpfilter include /trunk | svnadmin load --parent-dir imported --ignore-uuid newrepo`）。ブランチのマージ元を除外すると `Missing merge source path` で止まるので、その場合は `svndumpfilter` に `--skip-missing-merge-sources` を付ける
- Excel などのバイナリが多い場合はリポジトリが肥大化しやすい。容量を監視する

### 運用

- サーバー移行やバージョンアップの際は、**作業前に読み取り専用（`svnserve --read-only` や authz で `r` のみ）にしてからダンプ**する
- Subversion 1.14 は LTS（長期サポート）版。サーバーとクライアントのバージョン差は基本的に問題ないが、サーバーを古いまま放置しない
- 新規案件では Git も選択肢に入れる。既存リポジトリを移す場合は `git svn` やホスティングサービスのインポート機能を使う（詳細は「Git」のページ）

## 関連リンク

- [Apache Subversion 公式ドキュメント](https://subversion.apache.org/docs/)
- [Version Control with Subversion（SVN Book）](https://svnbook.red-bean.com/)
- [Apache Subversion FAQ](https://subversion.apache.org/faq.html)
- [Apache Subversion ダウンロード（各OS向けバイナリ）](https://subversion.apache.org/packages.html)
- [Apache HTTP Server ドキュメント](https://httpd.apache.org/docs/)
