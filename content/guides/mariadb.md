---
title: MariaDB 技術まとめ
slug: mariadb
excerpt: MariaDBの基本とMySQLとの違い、Linux・Windows・Dockerでのインストールと初期設定、接続・ユーザー管理・バックアップのコマンド、MariaDB独自機能のサンプル、よくあるエラーの対処、運用と移行の実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# MariaDB 技術まとめ

## 基礎

MariaDB は、MySQL の元開発者たちが MySQL から派生（フォーク）させたオープンソースのリレーショナルデータベース（RDBMS）です。SQL・クライアントのコマンド・接続プロトコルの多くが MySQL と互換で、MySQL 用のドライバーやツールの多くがそのまま使えます。RHEL 系や Debian などの Linux ディストリビューションでは、`mysql` の代わりに MariaDB が標準パッケージとして提供されていることが多いです。

### 主な用途

- MySQL の代替（ライセンス・ディストリ標準であることを理由に採用）
- Webサービス・CMS（WordPress など）のバックエンド
- Linux ディストリ標準の DB として、社内システムやパッケージ製品の内部 DB
- 業務システム

### まず押さえる用語

| 用語 | 意味 | 現場での注意点 |
| --- | --- | --- |
| mariadbd / mariadb | サーバー本体と接続用クライアント | 旧名の `mysqld` / `mysql` も（シンボリックリンクとして）残っていることが多い |
| InnoDB | 標準のストレージエンジン | MySQL と同様、新規テーブルは InnoDB を使う |
| Aria | MariaDB 独自のエンジン。システムテーブルなどで使用 | 業務テーブルは基本 InnoDB のままでよい |
| unix_socket 認証 | OS のユーザー名で DB にログインする方式 | 10.4 以降、Linux の root は `sudo mariadb` でパスワードなしで入れる |
| Galera Cluster | 複数ノードに同期で書き込めるクラスタ構成 | 書き込み競合やネットワーク分断時の挙動を理解してから使う |
| mariadb-backup | 稼働中に取れる物理バックアップツール（旧名 mariabackup） | 大きな DB は mariadb-dump よりこちらが速い |

### MySQL との主な違い

| 項目 | MariaDB | MySQL |
| --- | --- | --- |
| コマンド名 | `mariadb`、`mariadb-dump`、`mariadb-admin` など | `mysql`、`mysqldump`、`mysqladmin` |
| 既定の認証方式 | `mysql_native_password`（Linux の root は unix_socket 併用） | 8.0 以降 `caching_sha2_password` |
| JSON 型 | `LONGTEXT` の別名（JSON 検証の CHECK 制約付き） | 専用のバイナリ形式 |
| シーケンス | `CREATE SEQUENCE` が使える（10.3以降） | なし（`AUTO_INCREMENT` のみ） |
| RETURNING | `INSERT` / `DELETE ... RETURNING`（INSERT は 10.5以降） | なし |
| 履歴テーブル | `WITH SYSTEM VERSIONING`（10.3以降） | なし |
| 照合順序 | `utf8mb4_general_ci` / `utf8mb4_unicode_ci` など | 8.0 以降の既定は `utf8mb4_0900_ai_ci` |
| GTID・レプリケーション | MariaDB 独自形式の GTID | 形式が異なり、相互のレプリケーションには制約がある |

**SQL レベルではほぼ互換でも、バージョンが進むほど差は広がっています。** 「MySQL 8.x 対応」とだけ書かれた製品を MariaDB で動かす場合は、ベンダーのサポート対象かを確認します。

### バージョンの考え方

MariaDB には長期サポート（LTS）版と短期サポート版があります。業務システムでは 10.6、10.11、11.4 などの **LTS 版**を選び、サポート期限を公式サイトで確認しておきます。OS 標準パッケージのバージョンは OS ごとに決まっているので、新しい機能が必要なら MariaDB 公式リポジトリを使います。

## 環境構築

### 1. インストール

| 環境 | 方法 |
| --- | --- |
| RHEL / Rocky / Alma | `sudo dnf install mariadb-server`（ディストリ版） |
| Ubuntu / Debian | `sudo apt install mariadb-server` |
| 新しい版が必要なとき | MariaDB 公式リポジトリ（ダウンロードページでOSとバージョンを選ぶと設定手順が出る） |
| Windows | 公式サイトの MSI インストーラー。Windows サービス（既定名 `MariaDB`）として登録される |
| 開発用 | Docker の公式イメージ（下記） |

```bash
# RHEL 系
sudo dnf install -y mariadb-server
sudo systemctl enable --now mariadb
systemctl status mariadb

# 初期セキュリティ設定（root パスワード、匿名ユーザー削除、test DB 削除など）
sudo mariadb-secure-installation
```

```bash
# Docker（開発用）
docker run -d --name mariadb \
  -e MARIADB_ROOT_PASSWORD='ChangeMe_123' \
  -e MARIADB_DATABASE=mydb \
  -e MARIADB_USER=app \
  -e MARIADB_PASSWORD='App_Pass_123' \
  -p 3306:3306 \
  -v mariadb-data:/var/lib/mysql \
  mariadb:11.4

docker exec -it mariadb mariadb -u root -p
```

### 2. 設定ファイル

| OS | 主な場所 |
| --- | --- |
| RHEL 系 | `/etc/my.cnf`、`/etc/my.cnf.d/mariadb-server.cnf` |
| Ubuntu / Debian | `/etc/mysql/mariadb.conf.d/50-server.cnf` |
| Windows | データディレクトリ内の `my.ini`（例: `C:\Program Files\MariaDB 11.4\data\my.ini`） |

```ini
[mariadb]
character-set-server = utf8mb4
collation-server     = utf8mb4_unicode_ci
bind-address         = 0.0.0.0          # リモート接続を受ける場合（Debian系の既定は 127.0.0.1）
max_connections      = 300
innodb_buffer_pool_size = 2G
slow_query_log       = 1
long_query_time      = 1

[client]
default-character-set = utf8mb4
```

`[mariadb]` セクションは MariaDB のサーバーだけが読むセクションです（`[mysqld]` も読まれます）。変更後は `sudo systemctl restart mariadb` で反映します。

### 3. ログインとアプリ用ユーザー

```bash
sudo mariadb                 # unix_socket 認証で OS の root として接続
mariadb -u app -p -h 127.0.0.1 mydb
```

```sql
CREATE DATABASE mydb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'app'@'192.168.0.%' IDENTIFIED BY 'App_Pass_123';
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'app'@'192.168.0.%';
SHOW GRANTS FOR 'app'@'192.168.0.%';
```

リモートから接続する場合は、`bind-address` とファイアウォール（RHEL 系なら `sudo firewall-cmd --add-service=mysql --permanent && sudo firewall-cmd --reload`）も設定します。

## コマンド

### 接続・確認

| 操作 | コマンド・構文 |
| --- | --- |
| 接続 | `mariadb -u root -p db` |
| ホスト・ポート指定 | `mariadb -u app -p -h db01 -P 3306 mydb` |
| SQL を1本実行 | `mariadb -u app -p mydb -e "SELECT COUNT(*) FROM users;"` |
| バージョン | `SELECT VERSION();` |
| DB 一覧 | `SHOW DATABASES;` |
| テーブル一覧 | `SHOW TABLES;` |
| テーブル定義 | `SHOW CREATE TABLE users\G` |
| 実行中の処理 | `SHOW FULL PROCESSLIST;` |
| 処理を止める | `KILL 1234;` |
| 文字コード確認 | `SHOW VARIABLES LIKE 'character_set%';` |

### サービス

| 操作 | コマンド・構文 |
| --- | --- |
| 起動 | `sudo systemctl start mariadb` |
| 自動起動 | `sudo systemctl enable mariadb` |
| 状態確認 | `systemctl status mariadb` |
| ログ確認 | `sudo journalctl -u mariadb -n 100` |
| 稼働確認 | `mariadb-admin -u root -p ping` / `mariadb-admin -u root -p status` |
| Windows | `net start MariaDB` / `net stop MariaDB`（サービス名は環境に合わせる） |

### ユーザー・権限

| 操作 | コマンド・構文 |
| --- | --- |
| ユーザー作成 | `CREATE USER 'app'@'localhost' IDENTIFIED BY 'pass';` |
| 権限付与 | `GRANT ALL ON db.* TO 'app'@'localhost';` |
| 権限確認 | `SHOW GRANTS FOR 'app'@'localhost';` |
| パスワード変更 | `ALTER USER 'app'@'localhost' IDENTIFIED BY 'new';` |
| ユーザー一覧 | `SELECT user, host, plugin FROM mysql.user;` |
| 反映 | `FLUSH PRIVILEGES;`（`mysql` 系テーブルを直接更新したときだけ必要） |

`CREATE USER` / `GRANT` / `ALTER USER` は即時反映されるため、その後の `FLUSH PRIVILEGES` は不要です。

### バックアップ

| 操作 | コマンド・構文 |
| --- | --- |
| ダンプ | `mariadb-dump -u root -p --single-transaction --routines --triggers db > backup.sql` |
| 全DB | `mariadb-dump -u root -p --single-transaction --all-databases > all.sql` |
| リストア | `mariadb -u root -p db < backup.sql` |
| 物理バックアップ取得 | `mariadb-backup --backup --target-dir=/backup/full --user=backup --password=xxx` |
| 物理バックアップの準備 | `mariadb-backup --prepare --target-dir=/backup/full` |
| 物理バックアップの戻し | `mariadb-backup --copy-back --target-dir=/backup/full`（サーバー停止・データディレクトリが空の状態で） |

`--copy-back` の後は `sudo chown -R mysql:mysql /var/lib/mysql` で所有者を戻してから起動します。

## サンプル

### テーブル作成とシーケンス

```sql
CREATE TABLE customers (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(255) NOT NULL,
  name        VARCHAR(100) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_customers_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 伝票番号などをテーブルと独立して採番する（10.3以降）
CREATE SEQUENCE seq_order_no START WITH 1000 INCREMENT BY 1;
SELECT NEXTVAL(seq_order_no);
SELECT NEXT VALUE FOR seq_order_no;     -- 標準SQL形式でも書ける
```

### INSERT ... RETURNING（10.5以降）

```sql
INSERT INTO customers (email, name)
VALUES ('taro@example.com', '山田太郎')
RETURNING id, created_at;

-- 削除した行を返す
DELETE FROM customers WHERE created_at < '2020-01-01' RETURNING id, email;
```

### UPSERT

```sql
INSERT INTO customers (email, name)
VALUES ('taro@example.com', '山田太郎')
ON DUPLICATE KEY UPDATE name = VALUES(name);
```

MySQL 8.0.19 以降の `VALUES (...) AS new ... UPDATE name = new.name` という別名の書き方は MariaDB では使えないため、`VALUES(列名)` の形で書きます。

### 履歴を自動で残すテーブル（システムバージョニング）

```sql
CREATE TABLE prices (
  item_id  INT PRIMARY KEY,
  price    DECIMAL(10, 0) NOT NULL
) WITH SYSTEM VERSIONING;

UPDATE prices SET price = 1200 WHERE item_id = 1;

-- 過去の時点の値を参照する
SELECT * FROM prices FOR SYSTEM_TIME AS OF TIMESTAMP '2026-10-01 00:00:00';
-- 変更履歴をすべて見る
SELECT * FROM prices FOR SYSTEM_TIME ALL WHERE item_id = 1;
```

監査用の履歴テーブルとトリガーを自作しなくても、「いつ、いくらだったか」を SQL で取り出せます。履歴の分だけ容量が増えるので、古い履歴の削除方針も決めておきます。

### 集計（ウィンドウ関数・CTE、10.2以降）

```sql
WITH monthly AS (
  SELECT DATE_FORMAT(ordered_at, '%Y-%m') AS ym, SUM(amount) AS sales
  FROM orders
  GROUP BY ym
)
SELECT ym, sales,
       SUM(sales) OVER (ORDER BY ym) AS cumulative
FROM monthly
ORDER BY ym;
```

### 日次バックアップのシェルスクリプト

```bash
#!/bin/bash
set -euo pipefail
BACKUP_DIR=/backup/mariadb
DATE=$(date +%Y%m%d)

# 認証情報は ~/.my.cnf（権限600）の [client] セクションに置き、スクリプトに書かない
mariadb-dump --single-transaction --routines --triggers --events \
  --all-databases | gzip > "${BACKUP_DIR}/all_${DATE}.sql.gz"

# 14日より古いバックアップを削除
find "${BACKUP_DIR}" -name 'all_*.sql.gz' -mtime +14 -delete
```

```ini
# ~/.my.cnf（chmod 600）
[client]
user = backup
password = Backup_Pass_123
```

## エラー対応

MariaDB のエラー番号・SQLSTATE は MySQL と共通のものが多く、MySQL 向けの情報も参考になります。

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `ERROR 1698 (28000): Access denied for user 'root'@'localhost'` | root が unix_socket 認証で、OS の一般ユーザーから接続した | `sudo mariadb` で接続する。アプリからは root を使わず専用ユーザーを作る |
| `ERROR 1045 (28000): Access denied for user 'app'@'localhost' (using password: YES)` | パスワード誤り、`'ユーザー'@'ホスト'` の不一致 | `SELECT user, host FROM mysql.user;` で確認。`localhost`（ソケット）と `127.0.0.1`（TCP）は別扱いになる点に注意 |
| `ERROR 1130 (HY000): Host '192.168.0.5' is not allowed to connect to this MariaDB server` | 接続元ホストに合うユーザーが存在しない | `'app'@'192.168.0.%'` などのユーザーを作る |
| `ERROR 2002 (HY000): Can't connect to local MySQL server through socket '/var/lib/mysql/mysql.sock' (2)` | サーバー未起動、ソケットのパス違い（クライアントのバージョンにより文言が少し異なる） | `systemctl status mariadb`、`journalctl -u mariadb` で起動失敗の理由を確認 |
| `ERROR 2003 (HY000): Can't connect to MySQL server on '192.168.0.10' (111)` | `bind-address` が `127.0.0.1`、ファイアウォール | `bind-address` と firewalld / ufw を確認 |
| `ERROR 1273 (HY000): Unknown collation: 'utf8mb4_0900_ai_ci'` | MySQL 8.0 のダンプを、その照合順序に対応していない MariaDB へ投入 | ダンプ内の照合順序を `utf8mb4_unicode_ci` などに置換してから投入する |
| `ERROR 1071 (42000): Specified key was too long; max key length is 767 bytes` | 古い版・古い行フォーマットで utf8mb4 の長い列にインデックス | 行フォーマットを `DYNAMIC` にする、インデックス対象の長さを短くする（`VARCHAR(191)` やプレフィックスインデックス） |
| `ERROR 1062 (23000): Duplicate entry 'taro@example.com' for key 'uq_customers_email'` | 一意制約・主キーの重複 | 既存データを確認、`ON DUPLICATE KEY UPDATE` を使う |
| `ERROR 1205 (HY000): Lock wait timeout exceeded; try restarting transaction` | 未コミットのトランザクションがロックを保持 | `SHOW FULL PROCESSLIST;` と `SHOW ENGINE INNODB STATUS\G` で原因を探す |
| `ERROR 1213 (40001): Deadlock found when trying to get lock; try restarting transaction` | 更新順序の違い | アプリでリトライ、更新順序を統一 |
| `ERROR 1366 (22007): Incorrect string value: '\xF0\x9F\x98\x80' for column ...` | 絵文字を `utf8mb3` の列に投入 | 列・テーブル・接続を `utf8mb4` に揃える |
| `ERROR 1040 (08004): Too many connections` | `max_connections` 超過、接続のリーク | コネクションプールと接続の閉じ忘れを確認 |

**起動しないとき**は、まずログを見ます。

```bash
sudo journalctl -u mariadb -n 100 --no-pager
sudo ls -l /var/lib/mysql            # 所有者が mysql:mysql か
sudo df -h /var/lib/mysql            # ディスクの空き
```

よくある原因は「設定ファイルの書き間違い（存在しない変数名）」「データディレクトリの所有者・SELinux コンテキストの違い」「ディスクフル」「ポート 3306 の競合（MySQL と同居）」です。

## 実務Tips

### MySQL との併用・移行

- **MySQL と MariaDB を同じサーバーに入れない**。パッケージ・データディレクトリ・ポートが衝突しやすい。どうしても必要ならコンテナで分ける
- MySQL → MariaDB の移行は**論理ダンプ（mysqldump / mariadb-dump）で行う**。データディレクトリをそのままコピーする方法は、バージョンの組み合わせによっては動かない
- MySQL 8.0 からのダンプは、照合順序（`utf8mb4_0900_ai_ci`）、`caching_sha2_password` のユーザー、JSON 型、MySQL 独自の構文などで失敗することがある。テスト環境で一度流してエラーを洗い出す
- アプリのドライバーは MySQL 用のもの（Connector/J、mysqlclient など）でも多くは動くが、MariaDB 専用ドライバー（MariaDB Connector/J など）があるならそちらを優先する
- Java で MariaDB Connector/J を使う場合、JDBC URL は `jdbc:mariadb://host:3306/db` になる

### 運用

- `mariadb-secure-installation` は**インストール直後に必ず実行**する
- unix_socket 認証は OS の root にしか root で入れないので安全性が高い。root にパスワードを設定してリモートから使う運用には戻さない
- ダンプには `--single-transaction` を付けて、InnoDB のテーブルをロックせずに一貫性のあるバックアップを取る
- バックアップは**リストア手順まで含めて定期的に試す**。mariadb-backup は `--prepare` を忘れると戻しても起動しない
- OS のアップデート（`dnf update` / `apt upgrade`）で MariaDB のメジャー／マイナーが上がることがある。本番はバージョンを固定し、更新は計画的に行う
- メジャーバージョンアップ後は `mariadb-upgrade`（旧 `mysql_upgrade`）の実行が必要か、リリースノートで確認する

### 文字コード・設定

- サーバー・DB・テーブル・接続のすべてを `utf8mb4` に揃える。古い版の `utf8` は3バイトの `utf8mb3` で絵文字が入らない
- 日本語の比較では照合順序によって大文字小文字やかな・濁点の扱いが変わる。メールアドレスやコードなど厳密に比較したい列は `utf8mb4_bin` を指定する
- 設定変更は `SET GLOBAL` だけで済ませず、設定ファイルにも書く（再起動で元に戻るため）

## 関連リンク

- [MariaDB 公式ドキュメント（Knowledge Base）](https://mariadb.com/kb/en/)
- [MariaDB Foundation](https://mariadb.org/)
- [MariaDB ダウンロード](https://mariadb.org/download/)
- [MariaDB 公式 Docker イメージ](https://hub.docker.com/_/mariadb)
