---
title: MySQL 技術まとめ
slug: mysql
excerpt: MySQLの基本（InnoDB・文字コード・照合順序）、Windows/Linux/Dockerでのインストールと初期設定、接続・ユーザー管理・バックアップのコマンド、SQLのサンプル、ERROR 1045などよくあるエラーの対処、運用の実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# MySQL 技術まとめ

## 基礎

MySQL は、Webサービスで定番のオープンソースのリレーショナルデータベース（RDBMS）です。現在は Oracle 社が開発しており、無償の Community Edition と有償の Enterprise Edition があります。WordPress などの CMS、Web アプリのバックエンド、業務システムまで幅広く使われ、AWS の RDS / Aurora など主要クラウドにもマネージド版があります。

### 主な用途

- Webサービス・Webアプリのバックエンド
- WordPress などの CMS
- 業務システム
- 分析用データベース（集計用のレプリカなど）

### まず押さえる用語

| 用語 | 意味 | 現場での注意点 |
| --- | --- | --- |
| mysqld / mysql | `mysqld` がサーバー本体、`mysql` が接続用クライアント | Windows ではサービス名が `MySQL80` などになる |
| ストレージエンジン | テーブルのデータ格納方式。標準は **InnoDB** | 古い MyISAM はトランザクション・外部キー非対応。新規は InnoDB 一択 |
| データベース（スキーマ） | テーブルの入れ物。MySQL では DATABASE と SCHEMA は同じ意味 | `CREATE DATABASE` と `CREATE SCHEMA` は同じ動作 |
| ユーザー | `'ユーザー名'@'ホスト'` の組で1ユーザー | `'app'@'localhost'` と `'app'@'%'` は**別ユーザー** |
| 文字コード / 照合順序 | `utf8mb4` / `utf8mb4_0900_ai_ci` など | `utf8`（＝`utf8mb3`）は絵文字が入らない。必ず `utf8mb4` |
| バイナリログ | 変更履歴。レプリケーションとポイントインタイムリカバリに使う | 8.0 以降は既定で有効。ディスクを圧迫するので保持期間を設定する |
| レプリケーション | ソース（旧 master）からレプリカ（旧 slave）へ変更を複製 | 読み取りの負荷分散・バックアップ取得用に使う |

### バージョンの考え方

| 系列 | 特徴 |
| --- | --- |
| 5.7 | サポート終了済み。残っている環境は移行を計画する |
| 8.0 | 長く使われてきた主力。CTE（`WITH`）、ウィンドウ関数、`utf8mb4` 既定化 |
| 8.4 | LTS（長期サポート）系列。`mysql_native_password` が既定で無効 |
| 9.x | Innovation（短期）系列。新機能が先に入る |

8.0 以降のデフォルト認証方式は `caching_sha2_password` です。古いクライアントライブラリで接続できないときはこの点を疑います。

## 環境構築

### 1. インストール

| 環境 | 方法 |
| --- | --- |
| Windows | 公式サイトの MSI インストーラー（8.0 系は MySQL Installer）。Windows サービスとして登録される |
| Ubuntu / Debian | `sudo apt install mysql-server`（ディストリ版）または公式 APT リポジトリ |
| RHEL / Rocky / Alma | 公式 Yum リポジトリを追加して `sudo dnf install mysql-community-server` |
| 開発用 | Docker の公式イメージ（下記） |

```bash
# Docker（開発用）
docker run -d --name mysql \
  -e MYSQL_ROOT_PASSWORD='ChangeMe_123' \
  -e MYSQL_DATABASE=mydb \
  -p 3306:3306 \
  -v mysql-data:/var/lib/mysql \
  mysql:8.4

docker exec -it mysql mysql -u root -p
```

### 2. 初期パスワードと初期設定（Linux）

```bash
# 公式 RPM の場合: 初回起動時に一時パスワードがログに出る
sudo systemctl enable --now mysqld
sudo grep 'temporary password' /var/log/mysqld.log

# 匿名ユーザー削除・root のリモートログイン禁止などを対話式で設定
sudo mysql_secure_installation
```

Ubuntu の `mysql-server` パッケージでは、root は **auth_socket 認証**（OSの root ならパスワードなしで入れる方式）になっていることが多く、`sudo mysql` で接続します。

### 3. 設定ファイル（my.cnf / my.ini）

| OS | 主な場所 |
| --- | --- |
| Linux（RHEL系） | `/etc/my.cnf`、`/etc/my.cnf.d/` |
| Linux（Ubuntu） | `/etc/mysql/my.cnf`、`/etc/mysql/mysql.conf.d/mysqld.cnf` |
| Windows | `C:\ProgramData\MySQL\MySQL Server 8.0\my.ini`（`ProgramData` は隠しフォルダ） |

```ini
[mysqld]
character-set-server = utf8mb4
default-time-zone    = '+09:00'
max_connections      = 300
innodb_buffer_pool_size = 2G      # 専用サーバーなら物理メモリの5〜7割が目安
slow_query_log       = ON
long_query_time      = 1
binlog_expire_logs_seconds = 604800   # バイナリログを7日で削除

[client]
default-character-set = utf8mb4
```

変更後はサービスを再起動します（`sudo systemctl restart mysqld`、Windows は「サービス」または `net stop MySQL80` / `net start MySQL80`、サービス名は環境に合わせる）。

### 4. アプリ用のDBとユーザーを作る

```sql
CREATE DATABASE mydb CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'app'@'%' IDENTIFIED BY 'App_Pass_123!';
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'app'@'%';
SHOW GRANTS FOR 'app'@'%';
```

リモートから接続させる場合は、my.cnf の `bind-address`（Ubuntu の既定は `127.0.0.1`）とファイアウォールの 3306 番ポートも確認します。

## コマンド

### 接続・確認

| 操作 | コマンド・構文 |
| --- | --- |
| 接続 | `mysql -u root -p -h localhost mydb` |
| ポート・文字コード指定 | `mysql -u app -p -h db.example.local -P 3306 --default-character-set=utf8mb4 mydb` |
| SQL を1本だけ実行 | `mysql -u app -p mydb -e "SELECT COUNT(*) FROM users;"` |
| SQL ファイルを実行 | `mysql -u app -p mydb < script.sql`（接続中なら `SOURCE script.sql`） |
| DB 一覧 | `SHOW DATABASES;` |
| DB 切り替え | `USE mydb;` |
| テーブル一覧・定義 | `SHOW TABLES;` / `DESCRIBE users;` |
| CREATE 文を表示 | `SHOW CREATE TABLE users\G`（`\G` で縦表示） |
| 実行中の処理 | `SHOW PROCESSLIST;`（全文は `SHOW FULL PROCESSLIST;`） |
| 処理を止める | `KILL 1234;`（Id は PROCESSLIST で確認） |
| 接続状態 | `STATUS`（または `\s`） |
| バージョン | `SELECT VERSION();` |

### ユーザー・権限

| 操作 | コマンド・構文 |
| --- | --- |
| ユーザー作成 | `CREATE USER 'app'@'%' IDENTIFIED BY 'pass';` |
| 権限付与 | `GRANT ALL ON db.* TO 'app'@'%';` |
| 権限確認 | `SHOW GRANTS FOR 'app'@'%';` |
| 権限剥奪 | `REVOKE DELETE ON db.* FROM 'app'@'%';` |
| パスワード変更 | `ALTER USER 'app'@'%' IDENTIFIED BY 'new';` |
| ユーザー一覧 | `SELECT user, host, plugin FROM mysql.user;` |
| ユーザー削除 | `DROP USER 'app'@'%';` |

`GRANT` / `CREATE USER` は即時に反映されるため `FLUSH PRIVILEGES` は不要です（`mysql.user` を直接 UPDATE した場合のみ必要）。

### MySQL 特有の SQL

| 操作 | コマンド・構文 |
| --- | --- |
| 先頭N件・ページング | `SELECT * FROM t ORDER BY id LIMIT 10 OFFSET 20;` |
| NULL 置換 | `IFNULL(col, 0)` / `COALESCE(a, b, 0)` |
| 日付書式 | `DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s')` |
| 日付の加算 | `DATE_ADD(NOW(), INTERVAL 7 DAY)` |
| 文字列連結 | `CONCAT(last_name, ' ', first_name)` |
| 集約して連結 | `GROUP_CONCAT(name ORDER BY name SEPARATOR ',')` |
| UPSERT | `INSERT ... ON DUPLICATE KEY UPDATE name = VALUES(name);` |
| UPSERT（8.0.19以降の書き方） | `INSERT INTO t (id, name) VALUES (1, 'a') AS new ON DUPLICATE KEY UPDATE name = new.name;` |
| 直前の自動採番値 | `SELECT LAST_INSERT_ID();` |

`VALUES()` 関数を使う UPSERT は 8.0.20 以降で非推奨です。新しく書くなら別名（`AS new`）を使う形にします。

### バックアップ・リストア

```bash
# InnoDB をロックせずに一貫性のあるダンプを取る（ストアド・トリガー・イベントも含める）
mysqldump -u root -p --single-transaction --routines --triggers --events \
  --default-character-set=utf8mb4 mydb > mydb_$(date +%Y%m%d).sql

# 全DB
mysqldump -u root -p --single-transaction --all-databases > all.sql

# 圧縮しながら
mysqldump -u root -p --single-transaction mydb | gzip > mydb.sql.gz

# リストア
mysql -u root -p mydb < mydb_20261019.sql
```

```powershell
# Windows（PowerShell）では > でのリダイレクトは文字コードが変わることがあるので -r を使う
mysqldump -u root -p --single-transaction --routines --triggers mydb -r C:\backup\mydb.sql
# リストアは cmd 経由か、mysql の SOURCE コマンドで
cmd /c "mysql -u root -p mydb < C:\backup\mydb.sql"
```

### 性能確認

| 操作 | コマンド・構文 |
| --- | --- |
| 実行計画 | `EXPLAIN SELECT ...;` |
| 実際に実行して計測（8.0.18以降） | `EXPLAIN ANALYZE SELECT ...;` |
| インデックス作成 | `CREATE INDEX idx_name ON users(name);` |
| インデックス一覧 | `SHOW INDEX FROM users;` |
| InnoDB の状態（直近のデッドロックなど） | `SHOW ENGINE INNODB STATUS\G` |
| 設定値の確認 | `SHOW VARIABLES LIKE 'innodb_buffer_pool_size';` |
| 統計情報の更新 | `ANALYZE TABLE users;` |

## サンプル

### テーブル作成（日本語・絵文字対応）

```sql
CREATE TABLE users (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email       VARCHAR(255) NOT NULL,
  name        VARCHAR(100) NOT NULL,
  status      TINYINT NOT NULL DEFAULT 1 COMMENT '1:有効 0:無効',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='ユーザー';

CREATE TABLE orders (
  id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id   BIGINT UNSIGNED NOT NULL,
  amount    DECIMAL(12, 0) NOT NULL,
  ordered_at DATETIME NOT NULL,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

金額は `FLOAT` / `DOUBLE` ではなく `DECIMAL` にします（誤差が出ないため）。

### 集計（月別売上・ウィンドウ関数）

```sql
-- 月別の売上と累計（8.0以降）
SELECT
  DATE_FORMAT(ordered_at, '%Y-%m') AS ym,
  SUM(amount)                      AS sales,
  SUM(SUM(amount)) OVER (ORDER BY DATE_FORMAT(ordered_at, '%Y-%m')) AS cumulative
FROM orders
WHERE ordered_at >= '2026-01-01' AND ordered_at < '2027-01-01'
GROUP BY ym
ORDER BY ym;

-- ユーザーごとの最新注文1件
WITH ranked AS (
  SELECT o.*, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY ordered_at DESC) AS rn
  FROM orders o
)
SELECT * FROM ranked WHERE rn = 1;
```

### トランザクション

```sql
START TRANSACTION;
SELECT stock FROM items WHERE id = 10 FOR UPDATE;   -- 行ロック
UPDATE items SET stock = stock - 1 WHERE id = 10 AND stock > 0;
INSERT INTO orders (user_id, amount, ordered_at) VALUES (1, 1200, NOW());
COMMIT;   -- 失敗時は ROLLBACK;
```

### CSV の取り込み

```sql
-- クライアント側のファイルを読み込む（サーバー・クライアント両方で local_infile の許可が必要）
LOAD DATA LOCAL INFILE '/tmp/users.csv'
INTO TABLE users
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 LINES
(email, name);
```

```bash
mysql --local-infile=1 -u app -p mydb
```

Excel から保存した CSV は Shift_JIS（`CHARACTER SET cp932`）や改行 `\r\n` の場合が多いので、ファイルに合わせて指定します。

### パスワードをコマンドに書かずにバッチ実行する

```bash
# 認証情報を暗号化して ~/.mylogin.cnf に保存（Windows は %APPDATA%\MySQL\.mylogin.cnf）
mysql_config_editor set --login-path=backup --host=localhost --user=backup --password
mysqldump --login-path=backup --single-transaction mydb > mydb.sql
```

## エラー対応

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `ERROR 1045 (28000): Access denied for user 'app'@'192.168.0.5' (using password: YES)` | パスワード誤り、`'ユーザー'@'ホスト'` の組が存在しない | `SELECT user, host FROM mysql.user;` で接続元ホストに合うユーザーがあるか確認 |
| `ERROR 1045 (28000): ... (using password: NO)` | パスワードを渡していない | `-p` の付け忘れ。`-p` とパスワードの間に空白を入れると別の意味になる |
| `ERROR 2002 (HY000): Can't connect to local MySQL server through socket '/var/run/mysqld/mysqld.sock' (2)` | サーバー未起動、ソケットのパス違い | `systemctl status mysqld`。TCP で試すなら `-h 127.0.0.1` |
| `ERROR 2003 (HY000): Can't connect to MySQL server on 'db.example.local:3306' (111)` | サーバー未起動、`bind-address`、ファイアウォール | `bind-address` とポート開放を確認。Windows はエラー番号 10061 になる |
| `ERROR 2059 (HY000): Authentication plugin 'caching_sha2_password' cannot be loaded` | 古いクライアント・ドライバー | クライアント／ドライバーを更新する |
| `ERROR 1049 (42000): Unknown database 'mydb'` | DB名の誤り、未作成 | `SHOW DATABASES;` で確認。Linux では DB 名の大文字小文字を区別する |
| `ERROR 1146 (42S02): Table 'mydb.Users' doesn't exist` | テーブル名の誤り、大文字小文字 | Windows で作ったSQLを Linux で流したときに多い（下記Tips参照） |
| `ERROR 1054 (42S22): Unknown column 'nmae' in 'field list'` | 列名の誤り | `DESCRIBE テーブル名;` で確認 |
| `ERROR 1064 (42000): You have an error in your SQL syntax; ... near '...' at line 1` | 構文エラー、予約語を列名に使用 | `near` の直前を確認。予約語はバッククォートで囲む（`` `order` ``） |
| `ERROR 1062 (23000): Duplicate entry 'a@example.com' for key 'users.uq_users_email'` | 一意制約・主キーの重複 | 既存データを確認。UPSERT が必要なら `ON DUPLICATE KEY UPDATE` |
| `ERROR 1452 (23000): Cannot add or update a child row: a foreign key constraint fails` | 親テーブルに存在しない値 | 親を先に登録する。データ移行時は投入順序を見直す |
| `ERROR 1366 (HY000): Incorrect string value: '\xF0\x9F\x98\x80' for column 'name' at row 1` | 絵文字などを `utf8`（utf8mb3）の列に入れた | 列・テーブルを `utf8mb4` に変更、接続文字コードも `utf8mb4` にする |
| `ERROR 1205 (HY000): Lock wait timeout exceeded; try restarting transaction` | 他のトランザクションがロックを保持したまま | 未コミットのセッションを探す（`SHOW PROCESSLIST`、`sys.innodb_lock_waits`） |
| `ERROR 1213 (40001): Deadlock found when trying to get lock; try restarting transaction` | 更新順序の違いによるデッドロック | アプリ側でリトライする。`SHOW ENGINE INNODB STATUS\G` の `LATEST DETECTED DEADLOCK` を確認 |
| `ERROR 1040 (08004): Too many connections` | `max_connections` 超過、接続のリーク | コネクションプールの設定と接続の閉じ忘れを確認。一時的に上限を引き上げる |
| `ERROR 1055 (42000): Expression #1 of SELECT list is not in GROUP BY clause ... sql_mode=only_full_group_by` | GROUP BY にない列を SELECT している | GROUP BY に追加するか集約関数を使う。`sql_mode` を外すのは最後の手段 |
| `ERROR 1819 (HY000): Your password does not satisfy the current policy requirements` | validate_password による強度チェック | 大文字・小文字・数字・記号を含む長いパスワードにする |
| `ERROR 1290 (HY000): The MySQL server is running with the --secure-file-priv option so it cannot execute this statement` | `SELECT ... INTO OUTFILE` / `LOAD DATA INFILE` の出力先が許可外 | `SHOW VARIABLES LIKE 'secure_file_priv';` のフォルダを使う |
| `ERROR 3948 (42000): Loading local data is disabled; this must be enabled on both the client and server sides` | `local_infile` が無効 | サーバーの `local_infile=ON` とクライアントの `--local-infile=1` を両方設定 |

**root のパスワードを忘れたとき（Linux）**

```bash
sudo systemctl stop mysqld
sudo mysqld --skip-grant-tables --skip-networking --user=mysql &
mysql -u root
```

```sql
FLUSH PRIVILEGES;   -- 権限テーブルを読み込んでから ALTER USER を使えるようにする
ALTER USER 'root'@'localhost' IDENTIFIED BY 'New_Pass_123!';
```

終了後は `mysqld` を止めて、通常どおりサービスとして起動し直します。

## 実務Tips

### 文字コード・照合順序

- 文字コードは**サーバー・DB・テーブル・接続**すべて `utf8mb4` に揃える。どこか1つでも `utf8`（utf8mb3）や `latin1` が混ざると文字化けや `ERROR 1366` の原因になる
- 8.0 の既定照合順序 `utf8mb4_0900_ai_ci` は、大文字小文字に加えて**濁点・半濁点（ハ／バ／パ）なども区別しない比較**になる。ユーザーIDやメールアドレスなど厳密に一致させたい列は `utf8mb4_bin` などを指定する
- MySQL 8.0 のダンプを古い MySQL や MariaDB に入れると `Unknown collation: 'utf8mb4_0900_ai_ci'` になることがある。移行先がサポートする照合順序をあらかじめ確認する

### Windows と Linux の違い

- テーブル名の大文字小文字の扱いは `lower_case_table_names` で決まり、**Windows の既定は 1（小文字で保存・区別しない）、Linux の既定は 0（区別する）**。Windows で開発して Linux で動かすと `Table doesn't exist` になりやすいので、テーブル名は最初から小文字で統一する
- 8.0 以降、`lower_case_table_names` は**データディレクトリ初期化時にしか設定できない**。後から変えるには再構築が必要
- Windows のコマンドプロンプトで日本語を扱うと文字化けしやすい。SQL はファイルにして `--default-character-set=utf8mb4` を付けて流す

### 運用・性能

- ダンプには `--single-transaction` を付ける。付けないと InnoDB でも一貫性のないダンプになったり、テーブルロックで業務が止まったりする
- 大きな DB の物理バックアップには MySQL Enterprise Backup（有償）や Percona XtraBackup などを使う。`mysqldump` はリストアに時間がかかる
- **バックアップはリストアできることを定期的に確認**する。手順書にリストア時間の実測値を書いておく
- スロークエリログを常時有効にし、`long_query_time` を 1秒程度にして定期的に見る（`mysqldumpslow` で集計できる）
- 本番の大きなテーブルへの `ALTER TABLE` はロック・レプリカ遅延の原因になる。`ALGORITHM=INSTANT` / `INPLACE` が使えるか確認し、使えなければ pt-online-schema-change や gh-ost を検討する
- `WHERE` 句で列に関数をかけるとインデックスが効かない（`WHERE DATE(created_at) = '2026-10-19'` → `WHERE created_at >= '2026-10-19' AND created_at < '2026-10-20'`）

### セキュリティ

- アプリ用ユーザーに `ALL PRIVILEGES ON *.*` を付けない。対象DBの必要な権限だけにする
- `'root'@'%'` は作らない。管理作業は SSH でサーバーに入ってから `localhost` で行う
- コマンドラインに `-pパスワード` を直接書くと、シェル履歴やプロセス一覧に残る。`mysql_config_editor` やオプションファイル（権限 600）を使う
- 3306 番ポートをインターネットに公開しない

## 関連リンク

- [MySQL 公式ドキュメント](https://dev.mysql.com/doc/)
- [MySQL 8.4 リファレンスマニュアル](https://dev.mysql.com/doc/refman/8.4/en/)
- [MySQL 8.0 リファレンスマニュアル](https://dev.mysql.com/doc/refman/8.0/en/)
- [MySQL Community Server ダウンロード](https://dev.mysql.com/downloads/mysql/)
- [MySQL エラーメッセージリファレンス](https://dev.mysql.com/doc/mysql-errors/8.0/en/)
- [MySQL 公式 Docker イメージ](https://hub.docker.com/_/mysql)
