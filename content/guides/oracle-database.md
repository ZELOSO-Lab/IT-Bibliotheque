---
title: Oracle Database 技術まとめ
slug: oracle-database
excerpt: Oracle Databaseの基本構成（インスタンス・CDB/PDB・スキーマ）、Oracle Database Free と Instant Client による環境構築、SQL*Plus・ディクショナリ・Oracle特有のSQL、PL/SQLやバッチのサンプル、ORA-エラーの対処、基幹システム運用の実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# Oracle Database 技術まとめ

## 基礎

Oracle Database は、Oracle社が提供するエンタープライズ向けのリレーショナルデータベース（RDBMS）です。金融・製造・公共などの基幹システムで長く使われており、大量データの処理、高可用性構成（RAC・Data Guard）、PL/SQL によるサーバー側の処理が強みです。

### 主な用途

- 基幹システム（販売・会計・生産管理など）
- 大規模な業務データの保管と集計
- PL/SQL によるバッチ処理
- RAC・Data Guard を使った高可用性構成

### まず押さえる用語

| 用語 | 意味 | 現場での注意点 |
| --- | --- | --- |
| インスタンス | メモリ（SGA）とバックグラウンドプロセスの集まり | 「DBが起動している」＝インスタンスが起動してデータベースをオープンしている状態 |
| データベース | データファイル・制御ファイル・REDOログなどのファイル群 | インスタンスとは別物。RAC では複数インスタンスが1つのDBを共有する |
| CDB / PDB | マルチテナント構成。CDB（コンテナ）の中に PDB（プラガブルDB）を複数持つ | アプリは**PDBのサービス名**で接続する。`sqlplus / as sysdba` で入るのは CDB ルート |
| スキーマ | ユーザーが所有するオブジェクト（表・ビュー等）の集まり | Oracle では**ユーザー＝スキーマ**。他人の表は `SCOTT.EMP` のように所有者付きで参照 |
| 表領域 | データを格納する論理的な入れ物（`USERS`、`TEMP`、`UNDO` など） | 容量不足は表領域単位で起きる |
| サービス名 | 接続先を表す名前（例: `FREEPDB1`、`ORCLPDB1`） | 古い資料の `SID` 指定とは別。今はサービス名で接続するのが基本 |
| リスナー | 接続要求を受け付けるプロセス（既定ポート 1521） | 「つながらない」はまずリスナーとサービス名を疑う |
| UNDO / REDO | UNDO はロールバック・読み取り一貫性用、REDO は障害復旧用の変更履歴 | 長時間クエリの `ORA-01555` は UNDO 不足が原因 |

### 他のRDBMSとの主な違い

| 項目 | Oracle | MySQL / PostgreSQL などとの違い |
| --- | --- | --- |
| 空文字 | `''` は **NULL** として扱われる | `WHERE col = ''` は常に偽。`IS NULL` で判定する |
| DDL | `CREATE` / `ALTER` / `DROP` / `TRUNCATE` は**暗黙のコミット**を伴う | 直前の未コミットのDMLも確定してしまう |
| 文字列型 | `VARCHAR2`（`VARCHAR` ではなくこちらを使う） | 長さは既定で**バイト数**。UTF-8（AL32UTF8）で日本語は1文字3バイト |
| 日付型 | `DATE` は**時刻まで持つ**（秒単位）。ミリ秒以下は `TIMESTAMP` | `WHERE dt = DATE '2026-10-19'` では時刻付きの行がヒットしない |
| 連結 | `\|\|` で文字列連結（`'A' \|\| 'B'`） | NULL を連結しても NULL にならない（`'A' \|\| NULL` は `'A'`） |
| ダミー表 | `SELECT SYSDATE FROM dual;` | 23ai 以降は `FROM` 句を省略した `SELECT 1;` も可能 |
| 自動採番 | シーケンス、または 12c 以降の `GENERATED ... AS IDENTITY` | `AUTO_INCREMENT` はない |
| 名前の大文字小文字 | 引用符なしの識別子は**大文字**で格納される | ディクショナリ検索は `WHERE table_name = 'EMP'`（大文字）で行う |

### エディションとバージョン

- 有償の **Enterprise Edition（EE）**・**Standard Edition 2（SE2）**、無償の **Oracle Database Free**（旧 Express Edition）があります。パーティショニングや診断・チューニング系の一部機能は EE ＋ 追加ライセンスが必要です
- 現場では 19c が長期サポート版として多く使われています。新規案件ではサポート期間を Oracle の「Lifetime Support Policy」で確認してから選定します
- **ライセンスは機能の使用で発生**します。AWR レポート（Diagnostics Pack）など、使えてしまうが有償の機能があるので注意します

## 環境構築

### 1. 開発用に Oracle Database Free をコンテナで動かす

ローカルの検証環境には、無償の Oracle Database Free のコンテナイメージが手軽です。

```bash
docker run -d --name oracle-free \
  -p 1521:1521 \
  -e ORACLE_PWD='ChangeMe_123' \
  container-registry.oracle.com/database/free:latest

docker logs -f oracle-free      # "DATABASE IS READY TO USE!" が出るまで待つ（初回は数分）
```

- 既定の PDB のサービス名は `FREEPDB1` です
- `SYS` / `SYSTEM` / `PDBADMIN` のパスワードは `ORACLE_PWD` で指定した値になります
- データを残したい場合は `-v oradata:/opt/oracle/oradata` でボリュームを付けます

### 2. クライアント（SQL*Plus）を用意する

サーバーを入れないPCでは **Oracle Instant Client**（Basic ＋ SQL*Plus パッケージ）を使います。

| OS | 手順 |
| --- | --- |
| Windows | Basic と SQL*Plus の zip を同じフォルダ（例: `C:\oracle\instantclient_19_xx`）に展開し、そのフォルダを `PATH` に追加。Visual C++ 再頒布可能パッケージが必要 |
| Linux（RHEL系） | Oracle の yum リポジトリまたは RPM から `oracle-instantclient-basic` と `oracle-instantclient-sqlplus` を導入 |
| GUI | SQL Developer（無償）、VS Code の Oracle SQL Developer Extension など |

```powershell
# Windows: 接続設定ファイルの置き場所を指定し、動作確認
setx TNS_ADMIN "C:\oracle\network\admin"
sqlplus -v
sqlplus system/ChangeMe_123@//localhost:1521/FREEPDB1
```

### 3. 接続方法を決める（簡易接続と tnsnames.ora）

```text
# 簡易接続（EZCONNECT）: 設定ファイル不要
sqlplus app/password@//dbhost:1521/ORCLPDB1
```

```text
# tnsnames.ora（$TNS_ADMIN または $ORACLE_HOME/network/admin に置く）
APPDB =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = dbhost)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = ORCLPDB1)
    )
  )
```

```bash
sqlplus app/password@APPDB
tnsping APPDB        # 名前解決とリスナー到達の確認（Instant Client には含まれない）
```

### 4. アプリ用ユーザーを作る

```sql
-- PDB に接続して実行（CDB ルートで作ると C## 付きの共通ユーザーが必要になる）
CREATE USER app IDENTIFIED BY "App_Pass_123"
  DEFAULT TABLESPACE users
  QUOTA UNLIMITED ON users;

GRANT CREATE SESSION, CREATE TABLE, CREATE VIEW,
      CREATE SEQUENCE, CREATE PROCEDURE TO app;
```

### 5. 日本語の文字化けを防ぐ（Windows）

クライアントの文字コードは環境変数 `NLS_LANG` で決まります。コマンドプロンプト（Shift_JIS）で SQL*Plus を使う場合の例です。

```powershell
set NLS_LANG=JAPANESE_JAPAN.JA16SJISTILDE
sqlplus app/App_Pass_123@//dbhost:1521/ORCLPDB1
```

`NLS_LANG` は**DB側の文字コードではなく、クライアントが扱う文字コード**を指定します。UTF-8 のファイルを `@` で流す場合は `JAPANESE_JAPAN.AL32UTF8` に合わせます。

## コマンド

### SQL*Plus の接続・基本操作

| 操作 | コマンド・構文 |
| --- | --- |
| 接続 | `sqlplus user/pass@//host:1521/service` |
| 管理者で接続（サーバー上） | `sqlplus / as sysdba` |
| パスワードを履歴に残さず接続 | `sqlplus user@//host:1521/service`（後からパスワード入力） |
| 接続中のユーザー・コンテナ | `SHOW USER` / `SHOW CON_NAME` |
| PDB に切り替え（SYSDBA） | `ALTER SESSION SET CONTAINER = FREEPDB1;` |
| スクリプト実行 | `@script.sql`（同じフォルダ基準なら `@@sub.sql`） |
| 結果をファイルへ | `SPOOL result.txt` … `SPOOL OFF` |
| 列定義 | `DESC employees` |
| 終了 | `EXIT`（既定では**コミットして**終了） |

### 表示の整形

```sql
SET LINESIZE 200
SET PAGESIZE 100
SET TRIMSPOOL ON
COLUMN table_name FORMAT A30
SET TIMING ON              -- 実行時間を表示
SET SERVEROUTPUT ON        -- DBMS_OUTPUT を表示
ALTER SESSION SET NLS_DATE_FORMAT = 'YYYY-MM-DD HH24:MI:SS';
```

### ディクショナリ（メタ情報の確認）

| 操作 | コマンド・構文 |
| --- | --- |
| 自分のテーブル一覧 | `SELECT table_name FROM user_tables ORDER BY table_name;` |
| 参照できるテーブル | `SELECT owner, table_name FROM all_tables WHERE owner = 'APP';` |
| 列一覧 | `SELECT column_name, data_type, data_length FROM user_tab_columns WHERE table_name = 'EMP';` |
| インデックス | `SELECT index_name, column_name FROM user_ind_columns WHERE table_name = 'EMP';` |
| 制約 | `SELECT constraint_name, constraint_type FROM user_constraints WHERE table_name = 'EMP';` |
| 無効なオブジェクト | `SELECT object_name, object_type FROM user_objects WHERE status = 'INVALID';` |
| セッション | `SELECT sid, serial#, username, status, program FROM v$session WHERE username IS NOT NULL;` |
| バージョン | `SELECT banner_full FROM v$version;`（18c以降。古い版は `banner`） |

### Oracle 特有の SQL

| 操作 | コマンド・構文 |
| --- | --- |
| 先頭N件（12c以降） | `SELECT * FROM t ORDER BY id FETCH FIRST 10 ROWS ONLY;` |
| ページング | `... ORDER BY id OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;` |
| 11g以前の先頭N件 | `SELECT * FROM (SELECT * FROM t ORDER BY id) WHERE ROWNUM <= 10;` |
| NULL 置換 | `NVL(col, 0)` / `COALESCE(a, b, 0)` |
| 条件分岐 | `CASE WHEN ... THEN ... END`、`DECODE(col, 1, 'A', 2, 'B', 'other')` |
| 日付→文字 | `TO_CHAR(SYSDATE, 'YYYY/MM/DD HH24:MI:SS')` |
| 文字→日付 | `TO_DATE('2026-10-19', 'YYYY-MM-DD')` |
| 日付の切り捨て | `TRUNC(SYSDATE)`（当日0時）、`TRUNC(SYSDATE, 'MM')`（月初） |
| 月の加算・月末 | `ADD_MONTHS(dt, 1)` / `LAST_DAY(dt)` |
| 文字列連結 | `last_name \|\| ' ' \|\| first_name` |
| 集約して連結 | `LISTAGG(name, ',') WITHIN GROUP (ORDER BY name)` |

### 実行計画・統計情報

```sql
EXPLAIN PLAN FOR
SELECT * FROM orders WHERE customer_id = 100;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);

-- 直前に実行したSQLの実際の計画
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR);

-- 統計情報の収集
EXEC DBMS_STATS.GATHER_TABLE_STATS(ownname => 'APP', tabname => 'ORDERS');
```

### リスナー・エラー番号（OSのコマンド）

```bash
lsnrctl status          # リスナーの状態と登録されているサービス
lsnrctl start
oerr ora 00942          # エラーの原因と対処（Linux/UNIX の ORACLE_HOME 環境）
```

### Data Pump（論理バックアップ）

```bash
# スキーマ単位のエクスポート（ダンプはサーバー側の DIRECTORY に出力される）
expdp system@//dbhost:1521/ORCLPDB1 schemas=APP \
  directory=DATA_PUMP_DIR dumpfile=app_%U.dmp logfile=app_exp.log

# 別スキーマへインポート
impdp system@//dbhost:1521/ORCLPDB1 directory=DATA_PUMP_DIR \
  dumpfile=app_%U.dmp remap_schema=APP:APP_TEST logfile=app_imp.log
```

## サンプル

### テーブル・IDENTITY 列・インデックス

```sql
CREATE TABLE customers (
  customer_id  NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name         VARCHAR2(100 CHAR) NOT NULL,
  email        VARCHAR2(255)      NOT NULL,
  created_at   DATE DEFAULT SYSDATE NOT NULL,
  CONSTRAINT uq_customers_email UNIQUE (email)
);

CREATE INDEX ix_customers_created ON customers (created_at);

COMMENT ON TABLE customers IS '顧客マスタ';
COMMENT ON COLUMN customers.name IS '顧客名';
```

`VARCHAR2(100 CHAR)` のように `CHAR` を付けると、長さが**文字数**になります。付けないとバイト数なので、日本語では想定より入りません。

### MERGE（あれば更新、なければ登録）

```sql
MERGE INTO customers c
USING (SELECT :email AS email, :name AS name FROM dual) s
ON (c.email = s.email)
WHEN MATCHED THEN
  UPDATE SET c.name = s.name
WHEN NOT MATCHED THEN
  INSERT (name, email) VALUES (s.name, s.email);
```

### PL/SQL プロシージャ（例外処理つき）

```sql
CREATE OR REPLACE PROCEDURE rename_customer (
  p_id   IN customers.customer_id%TYPE,
  p_name IN customers.name%TYPE
) AS
  v_old customers.name%TYPE;
BEGIN
  SELECT name INTO v_old
    FROM customers
   WHERE customer_id = p_id
     FOR UPDATE;

  UPDATE customers SET name = p_name WHERE customer_id = p_id;
  DBMS_OUTPUT.PUT_LINE(v_old || ' -> ' || p_name);
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE_APPLICATION_ERROR(-20001, '顧客が存在しません: ' || p_id);
END;
/
SHOW ERRORS
```

```sql
SET SERVEROUTPUT ON
EXEC rename_customer(1, '山田商事');
COMMIT;
```

PL/SQL ブロックの最後の行の `/` は「ここまでを実行する」という SQL*Plus への合図です。忘れると入力待ちのまま止まります。

### Windows のバッチから SQL を実行する

```sql
-- daily.sql
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
WHENEVER OSERROR EXIT FAILURE ROLLBACK
SET FEEDBACK OFF HEADING OFF PAGESIZE 0 TRIMSPOOL ON
SPOOL C:\batch\out\daily.csv
SELECT customer_id || ',' || name || ',' || TO_CHAR(created_at, 'YYYY-MM-DD')
  FROM customers
 WHERE created_at >= TRUNC(SYSDATE) - 1;
SPOOL OFF
EXIT
```

```bat
@echo off
set NLS_LANG=JAPANESE_JAPAN.JA16SJISTILDE
sqlplus -s -L app/%DB_PASS%@APPDB @C:\batch\daily.sql
if %ERRORLEVEL% neq 0 (
  echo SQL failed: %ERRORLEVEL%
  exit /b 1
)
```

- `-s` はバナーなどを表示しないサイレントモード、`-L` はログオン失敗時に再入力を求めず終了するオプションです
- `WHENEVER SQLERROR EXIT` がないと、エラーが出ても**正常終了扱い**になり、ジョブ管理ツールで検知できません
- 終了コードは OS 側で 0〜255 に丸められるため、ORA の番号そのものとは限りません。ログ（SPOOL）で確認します

## エラー対応

メッセージ文言はバージョンによって変わることがあります（23ai では一部のメッセージがより詳しい表現になっています）。**番号で検索**するのが確実です。

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `ORA-00942: table or view does not exist` | 表名の誤り、別スキーマの表、権限不足 | `所有者.表名` で指定する。`GRANT SELECT ON app.t TO user;` を確認。引用符付きで作った小文字の表名にも注意 |
| `ORA-00904: "XXX": invalid identifier` | 列名の誤り、予約語、大文字小文字 | `DESC 表名` で列名を確認する |
| `ORA-00001: unique constraint (APP.UQ_CUSTOMERS_EMAIL) violated` | 一意制約・主キーの重複 | 制約名から列を特定（`user_cons_columns`）。登録前の存在チェックか `MERGE` を使う |
| `ORA-01400: cannot insert NULL into ("APP"."T"."COL")` | NOT NULL 列に NULL（**空文字も NULL**） | 空文字を入れていないか確認。DEFAULT 値を設定する |
| `ORA-01722: invalid number` | 数値に変換できない文字列との比較・変換 | 文字列型の列を数値と比較していないか確認（`WHERE code = 1` → `WHERE code = '1'`） |
| `ORA-01861: literal does not match format string` | 日付文字列と書式が合っていない、`NLS_DATE_FORMAT` 依存 | `TO_DATE('2026-10-19', 'YYYY-MM-DD')` のように書式を明示する |
| `ORA-12899: value too large for column ... (actual: 120, maximum: 100)` | 桁あふれ。日本語はバイト数で数える | `VARCHAR2(100 CHAR)` にする、桁を広げる |
| `ORA-01017: invalid username/password; logon denied` | ユーザー名・パスワード誤り、接続先 PDB の誤り | サービス名（PDB）を確認。11g 以降パスワードは既定で大文字小文字を区別する |
| `ORA-28000: the account is locked` | パスワード誤りの連続などでロック | `ALTER USER app ACCOUNT UNLOCK;`。ロック原因（古いパスワードのままのバッチ等）も止める |
| `ORA-28001: the password has expired` | プロファイルのパスワード期限切れ | `ALTER USER app IDENTIFIED BY "新パスワード";`。アプリ用はプロファイルで期限を見直す |
| `ORA-01031: insufficient privileges` | 権限不足（ロール経由の権限は PL/SQL 内で無効） | 必要な権限を直接 GRANT する。プロシージャ内なら**ロールではなく直接付与**が必要 |
| `ORA-12154: TNS:could not resolve the connect identifier specified` | tnsnames.ora に別名がない、`TNS_ADMIN` の誤り | 簡易接続（`//host:port/service`）で試す。`TNS_ADMIN` とファイルの場所を確認 |
| `ORA-12541: TNS:no listener` | リスナー未起動、ポート違い、FW | `lsnrctl status`、ポート番号（1521）とファイアウォールを確認 |
| `ORA-12514: TNS:listener does not currently know of service requested in connect descriptor` | サービス名の誤り、DB未起動、PDB 未オープン | `lsnrctl status` で登録サービスを確認。`ALTER PLUGGABLE DATABASE xxx OPEN;` |
| `ORA-00054: resource busy and acquire with NOWAIT specified or timeout expired` | DDL や `FOR UPDATE NOWAIT` の対象が他セッションでロック中 | 未コミットのセッションを確認する（下記SQL） |
| `ORA-00060: deadlock detected while waiting for resource` | 複数セッションが互いのロックを待っている | 更新順序を統一する。詳細はアラートログとトレースファイルに出る |
| `ORA-01555: snapshot too old: rollback segment number ... too small` | 長時間クエリ中に UNDO が上書きされた | 処理を短くする、ループ中のこまめな COMMIT をやめる、`UNDO_RETENTION` と UNDO 表領域を見直す |
| `ORA-01652: unable to extend temp segment by 128 in tablespace TEMP` | ソート・ハッシュ結合で一時表領域が不足 | SQL を見直す（不要な ORDER BY、結合条件漏れ）、TEMP を拡張する |
| `ORA-06502: PL/SQL: numeric or value error: character string buffer too small` | PL/SQL 変数の長さ不足 | `%TYPE` で宣言する、変数の長さを広げる |
| `ORA-04091: table APP.T is mutating, trigger/function may not see it` | 行トリガー内で自分自身の表を参照 | 複合トリガーにする、処理をトリガー外へ移す |

**ロックしているセッションを探す**

```sql
SELECT s.sid, s.serial#, s.username, s.program, o.object_name
  FROM v$locked_object l
  JOIN dba_objects o ON o.object_id = l.object_id
  JOIN v$session   s ON s.sid = l.session_id;

-- 最終手段（影響を確認してから）
ALTER SYSTEM KILL SESSION '123,4567' IMMEDIATE;
```

**表領域の使用率を確認する**

```sql
SELECT df.tablespace_name,
       ROUND(df.bytes / 1024 / 1024)                    AS total_mb,
       ROUND(NVL(fs.bytes, 0) / 1024 / 1024)            AS free_mb
  FROM (SELECT tablespace_name, SUM(bytes) bytes FROM dba_data_files GROUP BY tablespace_name) df
  LEFT JOIN (SELECT tablespace_name, SUM(bytes) bytes FROM dba_free_space GROUP BY tablespace_name) fs
    ON fs.tablespace_name = df.tablespace_name
 ORDER BY df.tablespace_name;
```

## 実務Tips

### 作業ミスを防ぐ

- 本番で作業する前に `SHOW USER`、`SHOW CON_NAME`、`SELECT name FROM v$database;` で**接続先を確認**する。SQL*Plus のプロンプトを `SET SQLPROMPT "_USER'@'_CONNECT_IDENTIFIER> "` で変えておくと取り違えにくい
- SQL*Plus は**自動コミットしない**が、`EXIT` すると**コミットされる**（既定）。更新作業の確認中に誤って抜けないよう、手順書では `ROLLBACK` / `COMMIT` を明示する
- **DDL は暗黙コミット**。`UPDATE` の後に確認用の `CREATE TABLE ... AS SELECT` を流すと、`UPDATE` も確定してしまう
- 大量の `DELETE` の前には `SELECT COUNT(*)` で件数を確認し、手順書に期待件数を書いておく
- 誤って更新・削除した直後なら、UNDO が残っている間は **フラッシュバック問い合わせ**（`SELECT * FROM t AS OF TIMESTAMP SYSTIMESTAMP - INTERVAL '10' MINUTE;`）で過去の値を参照できる

### SQL を書くときの注意

- `''` は NULL。`WHERE col <> 'X'` は **NULL の行を含まない**ので、必要なら `OR col IS NULL` を付ける
- `DATE` 列の日付範囲は `WHERE dt >= DATE '2026-10-01' AND dt < DATE '2026-11-01'` と半開区間で書く。`TRUNC(dt) = ...` は列に関数がかかりインデックスが効きにくい
- 暗黙の型変換に頼らない。文字列の列を数値と比較すると、インデックスが効かないうえ `ORA-01722` の原因になる
- アプリからは**バインド変数**（`:id`）を使う。リテラル直書きは SQL インジェクションの原因になるだけでなく、ハードパースが増えて共有プールを圧迫する
- 1行ずつ COMMIT するループは遅く、`ORA-01555` の原因にもなる。可能なら1本の SQL（`INSERT ... SELECT`、`MERGE`）でまとめて処理する

### 運用

- 障害時はまず**アラートログ**（`alert_<SID>.log`）を見る。場所は `SELECT value FROM v$diag_info WHERE name = 'Diag Trace';` で確認できる
- バックアップは **RMAN**（物理）が基本。Data Pump（`expdp`）は移行や部分的な退避に使う論理バックアップで、それだけでは障害時点まで戻せない
- 大量データのロード後や構成変更後は統計情報が古くなり、実行計画が急に悪化することがある。自動統計収集ジョブの時間帯と、バッチの時間帯がぶつかっていないか確認する
- アプリ用ユーザーには `DBA` ロールを付けない。必要なシステム権限とオブジェクト権限だけを付与する
- 開発環境と本番環境で `NLS_LANG`・`NLS_DATE_FORMAT`・文字コード（`AL32UTF8` か `JA16SJISTILDE` か）を揃える。ずれていると文字化けや日付変換エラーが本番でだけ起きる

## 関連リンク

- [Oracle Database 公式ドキュメント](https://docs.oracle.com/en/database/)
- [Oracle Database Free](https://www.oracle.com/database/free/)
- [Oracle Instant Client](https://www.oracle.com/database/technologies/instant-client.html)
- [Oracle SQL Developer](https://www.oracle.com/database/sqldeveloper/)
- [Oracle Container Registry](https://container-registry.oracle.com/)
