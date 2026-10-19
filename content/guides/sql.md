---
title: SQL 技術まとめ
slug: sql
excerpt: SQLの基本概念と書いた順・実行される順の違い、手元で試せる環境の作り方、SELECT・JOIN・集計・ウィンドウ関数・更新系の構文、グループ内上位N件や重複削除などの定番サンプル、主要DBごとのエラーメッセージと対処、事故を防ぐ実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# SQL 技術まとめ

## 基礎

SQL はリレーショナルデータベース（RDB）に対して「どのデータが欲しいか」を宣言的に書く問い合わせ言語です。ISO/IEC で標準化されていますが、実際には **PostgreSQL・MySQL・SQL Server・Oracle・SQLite などで方言の違い**があります。このページでは主要DBで共通に使える書き方を中心に、違いが出るところは表で整理します。

### 主な用途

- データ抽出（画面表示・CSV出力・調査）
- 集計・レポート（売上の月次集計、ランキング）
- データ移行・一括更新
- パフォーマンス調査（実行計画の確認、インデックス設計）

### 命令の分類

| 分類 | 主な命令 | 内容 |
| --- | --- | --- |
| DML（データ操作） | `SELECT` / `INSERT` / `UPDATE` / `DELETE` / `MERGE` | 行の参照・追加・更新・削除 |
| DDL（データ定義） | `CREATE` / `ALTER` / `DROP` / `TRUNCATE` | テーブル・インデックスなどの定義 |
| DCL（権限） | `GRANT` / `REVOKE` | ユーザーへの権限付与 |
| TCL（トランザクション） | `BEGIN` / `COMMIT` / `ROLLBACK` | 変更の確定・取り消し |

`TRUNCATE` は DDL 扱いのDBが多く、**Oracle や MySQL ではロールバックできません**（PostgreSQL・SQL Server はトランザクション内ならロールバック可能）。

### SELECT は書いた順に実行されない

| 実行順 | 句 | ポイント |
| --- | --- | --- |
| 1 | `FROM` / `JOIN` | 対象テーブルを結合 |
| 2 | `WHERE` | 行を絞り込む（集計前） |
| 3 | `GROUP BY` | グループ化 |
| 4 | `HAVING` | 集計結果で絞り込む |
| 5 | `SELECT` | 列の計算・別名付け、ウィンドウ関数 |
| 6 | `DISTINCT` | 重複除去 |
| 7 | `ORDER BY` | 並べ替え（ここでは別名が使える） |
| 8 | `LIMIT` / `OFFSET` / `FETCH` | 件数制限 |

「`WHERE` で `SELECT` の別名が使えない」「`WHERE` に `COUNT(*)` が書けない」「ウィンドウ関数の結果で `WHERE` できない」は、すべてこの順序で説明できます。

### NULL は「不明」

- `NULL = NULL` は真ではなく **不明（UNKNOWN）**。判定は `IS NULL` / `IS NOT NULL` を使う
- `WHERE` は真の行だけ残すため、`col <> 'A'` では **NULL の行も除外**される
- `COUNT(*)` は全行、`COUNT(col)` は NULL 以外の行を数える。`SUM` / `AVG` は NULL を無視する
- NULL を含む計算は NULL になる（`price * qty` の片方が NULL なら結果も NULL）。`COALESCE(col, 0)` で置き換える

### 主要DBの方言の違い

| 操作 | 標準SQL / PostgreSQL | MySQL | SQL Server | Oracle |
| --- | --- | --- | --- | --- |
| 先頭N件 | `FETCH FIRST 10 ROWS ONLY` / `LIMIT 10` | `LIMIT 10` | `TOP (10)` / `OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY` | `FETCH FIRST 10 ROWS ONLY`（12c以降） |
| 文字列連結 | `'a' \|\| 'b'` | `CONCAT('a', 'b')` | `'a' + 'b'` / `CONCAT` | `'a' \|\| 'b'` |
| 現在日時 | `CURRENT_TIMESTAMP` | `NOW()` | `GETDATE()` / `SYSDATETIME()` | `SYSDATE` / `SYSTIMESTAMP` |
| NULL 置換 | `COALESCE` | `COALESCE` / `IFNULL` | `COALESCE` / `ISNULL` | `COALESCE` / `NVL` |
| 自動採番 | `GENERATED ... AS IDENTITY` | `AUTO_INCREMENT` | `IDENTITY(1,1)` | `GENERATED ... AS IDENTITY` / シーケンス |
| UPSERT | `INSERT ... ON CONFLICT` | `INSERT ... ON DUPLICATE KEY UPDATE` | `MERGE` | `MERGE` |
| 識別子の囲み | `"name"` | `` `name` `` | `[name]` / `"name"` | `"name"` |
| 空文字 `''` | NULL とは別 | NULL とは別 | NULL とは別 | **NULL として扱う** |

## 環境構築

SQL の練習や検証には、本番DBとは別の手元環境を使います。

### 1. いちばん手軽: SQLite

ファイル1つで動き、サーバーの設定が不要です。Python に標準で入っているため、Python があればすぐに試せます。

```sh
sqlite3 practice.db          # CLI がある場合
sqlite> .tables              # テーブル一覧
sqlite> .schema orders       # 定義
sqlite> .headers on
sqlite> .mode column
sqlite> .quit
```

```sh
# CLI がない場合は Python から
python3 -c "import sqlite3; c=sqlite3.connect(':memory:'); print(c.execute('SELECT 1 + 1').fetchone())"
```

### 2. 本番と同じDBを Docker で立てる

方言や実行計画の確認は、**本番と同じ種類・同じメジャーバージョン**で行います。

```sh
# PostgreSQL
docker run --name pg -e POSTGRES_PASSWORD=pass -p 5432:5432 -d postgres:16
docker exec -it pg psql -U postgres

# MySQL
docker run --name my -e MYSQL_ROOT_PASSWORD=pass -p 3306:3306 -d mysql:8.4
docker exec -it my mysql -uroot -p
```

### 3. GUIクライアントを用意する

| ツール | 特徴 |
| --- | --- |
| DBeaver | 多くのDBに対応する無料クライアント |
| A5:SQL Mk-2 | 日本製の無料ツール。Windows の現場で定番、ER図も作れる |
| SSMS / Azure Data Studio・VS Code 拡張 | SQL Server 向け |
| pgAdmin | PostgreSQL 向け |
| MySQL Workbench | MySQL 向け |

本番に接続するクライアントは、**自動コミットの設定**を必ず確認します。自動コミットが有効だと `UPDATE` を実行した瞬間に確定します。

## コマンド

以降の例は次のテーブルを前提にします。

```sql
CREATE TABLE customers (
    id   INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    pref VARCHAR(10)
);
CREATE TABLE orders (
    id          INTEGER PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    order_date  DATE NOT NULL,
    amount      DECIMAL(10,0) NOT NULL
);
```

### SELECT・絞り込み

| 操作 | 構文 |
| --- | --- |
| 基本 | `SELECT id, name FROM customers WHERE pref = '東京' ORDER BY name;` |
| 重複排除 | `SELECT DISTINCT pref FROM customers;` |
| あいまい検索 | `WHERE name LIKE '%田%'`（`_` は任意の1文字） |
| 範囲・複数 | `WHERE amount BETWEEN 100 AND 500 AND pref IN ('東京', '大阪')` |
| NULL 判定 | `WHERE pref IS NULL` |
| 条件分岐 | `CASE WHEN amount >= 1000 THEN '大' ELSE '小' END` |
| 並べ替え | `ORDER BY order_date DESC, id DESC`（同値の順序を固定する） |

### JOIN

| 操作 | 構文 | 結果 |
| --- | --- | --- |
| 内部結合 | `FROM orders o INNER JOIN customers c ON c.id = o.customer_id` | 両方にある行だけ |
| 左外部結合 | `FROM customers c LEFT JOIN orders o ON o.customer_id = c.id` | 左の全行。相手がなければ NULL |
| 完全外部結合 | `FULL OUTER JOIN`（MySQL は未対応） | 両方の全行 |
| 存在チェック | `WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)` | 相手がある行 |
| 存在しない行 | `WHERE NOT EXISTS (...)` | 相手がない行 |
| 自己結合 | `FROM emp e LEFT JOIN emp m ON m.id = e.manager_id` | 上司名の取得など |

### 集計

```sql
SELECT c.pref,
       COUNT(*)           AS orders,
       SUM(o.amount)      AS total,
       AVG(o.amount)      AS avg_amount
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.order_date >= '2026-10-01'      -- 集計前に絞る
GROUP BY c.pref
HAVING SUM(o.amount) > 1000             -- 集計後に絞る
ORDER BY total DESC;
```

`SELECT` に書く列は、`GROUP BY` に書いた列か集計関数のどちらかにします。

### サブクエリ・CTE

```sql
-- 平均より大きい注文
SELECT * FROM orders WHERE amount > (SELECT AVG(amount) FROM orders);

-- WITH 句（CTE）で段階的に書く
WITH monthly AS (
    SELECT customer_id, SUM(amount) AS total
    FROM orders
    WHERE order_date >= '2026-10-01' AND order_date < '2026-11-01'
    GROUP BY customer_id
)
SELECT c.name, m.total
FROM monthly m JOIN customers c ON c.id = m.customer_id
ORDER BY m.total DESC;
```

### ウィンドウ関数

| 関数 | 用途 |
| --- | --- |
| `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)` | グループ内の連番（同値でも別番号） |
| `RANK()` / `DENSE_RANK()` | 順位（同値は同順位。RANK は次が飛ぶ） |
| `SUM(x) OVER (ORDER BY ...)` | 累計 |
| `SUM(x) OVER ()` | 全体合計（構成比の計算に使う） |
| `LAG(x)` / `LEAD(x)` | 前の行・次の行の値（前月比など） |

集計と違い、**行数を減らさずに**集計値を各行に付けられます。

### 更新系

```sql
INSERT INTO customers (id, name, pref) VALUES (4, '高橋', '福岡');
INSERT INTO archive_orders SELECT * FROM orders WHERE order_date < '2025-01-01';
UPDATE customers SET pref = '北海道' WHERE id = 3;
DELETE FROM orders WHERE id = 5;
```

### トランザクション

```sql
BEGIN;                 -- SQL Server は BEGIN TRAN、Oracle は不要（最初のDMLで開始）
UPDATE accounts SET balance = balance - 1000 WHERE id = 1;
UPDATE accounts SET balance = balance + 1000 WHERE id = 2;
COMMIT;                -- 問題があれば ROLLBACK;
```

### DDL

| 操作 | 構文 |
| --- | --- |
| 列追加 | `ALTER TABLE customers ADD email VARCHAR(255);`（PostgreSQL は `ADD COLUMN` とも書ける） |
| インデックス | `CREATE INDEX idx_orders_customer_date ON orders (customer_id, order_date);` |
| 一意制約 | `ALTER TABLE customers ADD CONSTRAINT uq_customers_email UNIQUE (email);` |
| ビュー | `CREATE VIEW v_orders AS SELECT ...;` |
| 削除 | `DROP TABLE IF EXISTS tmp_work;` |

### 実行計画の確認

| DB | コマンド |
| --- | --- |
| PostgreSQL | `EXPLAIN ANALYZE SELECT ...;`（実際に実行される） |
| MySQL | `EXPLAIN SELECT ...;` / `EXPLAIN ANALYZE SELECT ...;`（8.0.18以降） |
| SQL Server | SSMS の「実際の実行プランを含める」/ `SET STATISTICS IO ON;` |
| Oracle | `EXPLAIN PLAN FOR SELECT ...;` → `SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);` |
| SQLite | `EXPLAIN QUERY PLAN SELECT ...;` |

`EXPLAIN ANALYZE` は**実際にSQLを実行する**ため、`UPDATE` / `DELETE` に使うときはトランザクション内で実行してロールバックします。

## サンプル

### グループごとの最新1件（上位N件）

```sql
WITH ranked AS (
    SELECT o.*,
           ROW_NUMBER() OVER (PARTITION BY customer_id
                              ORDER BY order_date DESC, id DESC) AS rn
    FROM orders o
)
SELECT customer_id, id, order_date, amount
FROM ranked
WHERE rn = 1;          -- 上位3件なら rn <= 3
```

### 累計と構成比

```sql
SELECT order_date, amount,
       SUM(amount) OVER (ORDER BY order_date, id
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total,
       amount * 100.0 / SUM(amount) OVER () AS pct
FROM orders
ORDER BY order_date, id;
```

`* 100.0` としているのは、**整数同士の割り算が切り捨てになるDB**（PostgreSQL・SQL Server・SQLite など）があるためです。`7 / 2` は `3`、`7 / 2.0` は `3.5` になります。

### 月別のクロス集計（CASE 式でピボット）

```sql
SELECT customer_id,
       SUM(CASE WHEN order_date >= '2026-09-01' AND order_date < '2026-10-01' THEN amount ELSE 0 END) AS sep,
       SUM(CASE WHEN order_date >= '2026-10-01' AND order_date < '2026-11-01' THEN amount ELSE 0 END) AS oct
FROM orders
GROUP BY customer_id
ORDER BY customer_id;
```

`PIVOT` 構文はDBごとに違いますが、CASE 式による集計はどのDBでも動きます。

### 注文のない顧客も含めて集計する（LEFT JOIN の落とし穴）

```sql
-- 正しい: 相手テーブルの条件は ON に書く
SELECT c.name, COUNT(o.id) AS cnt, COALESCE(SUM(o.amount), 0) AS total
FROM customers c
LEFT JOIN orders o
       ON o.customer_id = c.id
      AND o.order_date >= '2026-10-01'
GROUP BY c.id, c.name;

-- 誤り: WHERE に書くと NULL の行が消え、内部結合と同じ結果になる
-- LEFT JOIN orders o ON o.customer_id = c.id
-- WHERE o.order_date >= '2026-10-01'
```

`COUNT(*)` ではなく `COUNT(o.id)` にすると、注文がない顧客は 0 件になります。

### 重複データを見つけて1件だけ残す

```sql
-- 重複の確認
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;

-- 最小IDだけ残して削除（必ず先に SELECT で件数を確認する）
DELETE FROM users
WHERE id NOT IN (SELECT MIN(id) FROM users GROUP BY email);
```

MySQL では削除対象と同じテーブルをサブクエリで参照すると `ERROR 1093` になるため、サブクエリをもう一段 `SELECT * FROM (...) AS t` で包むか、一時テーブルを使います。

### UPSERT（あれば更新、なければ追加）

```sql
-- PostgreSQL / SQLite
INSERT INTO customers (id, name, pref) VALUES (1, '山田太郎', '東京')
ON CONFLICT (id) DO UPDATE SET name = excluded.name, pref = excluded.pref;

-- MySQL
INSERT INTO customers (id, name, pref) VALUES (1, '山田太郎', '東京')
ON DUPLICATE KEY UPDATE name = VALUES(name), pref = VALUES(pref);

-- SQL Server / Oracle（MERGE）
MERGE INTO customers t
USING (SELECT 1 AS id, '山田太郎' AS name, '東京' AS pref FROM dual) s   -- SQL Server は FROM dual を外す
ON (t.id = s.id)
WHEN MATCHED THEN UPDATE SET t.name = s.name, t.pref = s.pref
WHEN NOT MATCHED THEN INSERT (id, name, pref) VALUES (s.id, s.name, s.pref);
```

MySQL 8.0.20 以降は `VALUES()` が非推奨となり、行エイリアス（`... AS new ON DUPLICATE KEY UPDATE name = new.name`）が推奨されています。SQL Server の `MERGE` は文末の `;` が必須です。

### 連番を生成する（再帰CTE）

```sql
WITH RECURSIVE nums(n) AS (     -- SQL Server・Oracle は RECURSIVE を書かない
    SELECT 1
    UNION ALL
    SELECT n + 1 FROM nums WHERE n < 31
)
SELECT n FROM nums;
```

日付の歯抜けを埋めるカレンダー表を作るときに使います。

## エラー対応

### 主要DBでのメッセージ対応表

| 内容 | PostgreSQL | MySQL | SQL Server | Oracle |
| --- | --- | --- | --- | --- |
| 構文エラー | `syntax error at or near "..."` | `ERROR 1064 (42000): You have an error in your SQL syntax` | `Incorrect syntax near '...'.`（Msg 102） | `ORA-00933: SQL command not properly ended` など |
| テーブルがない | `relation "xxx" does not exist` | `ERROR 1146 (42S02): Table 'db.xxx' doesn't exist` | `Invalid object name 'xxx'.`（Msg 208） | `ORA-00942: table or view does not exist` |
| 列名があいまい | `column reference "id" is ambiguous` | `ERROR 1052 (23000): Column 'id' in field list is ambiguous` | `Ambiguous column name 'id'.`（Msg 209） | `ORA-00918: column ambiguously defined` |
| GROUP BY 不足 | `column "x" must appear in the GROUP BY clause or be used in an aggregate function` | `ERROR 1055 (42000): ... this is incompatible with sql_mode=only_full_group_by` | `Column 'x' is invalid in the select list because it is not contained in either an aggregate function or the GROUP BY clause.`（Msg 8120） | `ORA-00979: not a GROUP BY expression` |
| サブクエリが複数行 | `more than one row returned by a subquery used as an expression` | `ERROR 1242 (21000): Subquery returns more than 1 row` | `Subquery returned more than 1 value.`（Msg 512） | `ORA-01427: single-row subquery returns more than one row` |
| 一意制約違反 | `duplicate key value violates unique constraint "..."` | `ERROR 1062 (23000): Duplicate entry '...' for key '...'` | `Violation of PRIMARY KEY constraint '...'.`（Msg 2627） | `ORA-00001: unique constraint (...) violated` |
| ゼロ除算 | `division by zero` | エラーにならず NULL（警告） | `Divide by zero error encountered.`（Msg 8134） | `ORA-01476: divisor is equal to zero` |

### 原因と対処

| 症状 | 主な原因 | 対処 |
| --- | --- | --- |
| 構文エラー | カンマの過不足、予約語を列名に使用、方言の違い（`LIMIT` と `TOP` など） | エラー位置の**直前**を確認。予約語は識別子を囲む |
| 列名があいまい | JOIN した複数テーブルに同名の列がある | すべての列に `o.id` のようにテーブル別名を付ける |
| GROUP BY 不足 | `SELECT` に集計していない列がある | `GROUP BY` に追加するか、`MAX()` などで集計する |
| サブクエリが複数行 | `=` の右辺のサブクエリが2行以上返す | `IN` / `EXISTS` に変えるか、条件を見直して1行に絞る |
| ゼロ除算 | 分母が0 | `x / NULLIF(y, 0)` で NULL にする |
| デッドロック（PostgreSQL `deadlock detected`、MySQL `ERROR 1213 (40001)`、SQL Server Msg 1205） | 複数トランザクションが逆順でロック | アプリで再試行。更新順序を揃え、トランザクションを短くする |
| ロック待ちタイムアウト（MySQL `ERROR 1205 (HY000): Lock wait timeout exceeded`） | 長時間コミットされないトランザクション | 開きっぱなしのセッションを特定してコミット／ロールバック |

### エラーにならない「結果がおかしい」パターン

| 症状 | 原因 | 対処 |
| --- | --- | --- |
| `NOT IN` の結果が0件 | サブクエリの結果に NULL が1つでも含まれると、`NOT IN` は全行が UNKNOWN になる | `NOT EXISTS` を使う。または `WHERE customer_id IS NOT NULL` を追加 |
| 合計が倍になる | 1対多の JOIN で親の行が増えた後に `SUM` した | 先に子テーブルを集計してから JOIN する |
| LEFT JOIN なのに行が減る | 右テーブルの条件を `WHERE` に書いた | 条件を `ON` 側へ移す |
| `<>` で NULL の行が漏れる | NULL との比較は UNKNOWN | `OR col IS NULL` を追加する |
| 日付の最終日が抜ける | `BETWEEN '2026-10-01' AND '2026-10-31'` で時刻付きの列を比較 | `>= '2026-10-01' AND < '2026-11-01'` の半開区間で書く |
| 実行するたびに並び順が変わる | `ORDER BY` がない、または同値がある | 一意になるまで `ORDER BY` の列を足す |

SQLSTATE（5桁のエラーコード）は標準化されていて、`23xxx` は整合性制約違反、`42xxx` は構文・権限エラー、`40001` はシリアライズ失敗（MySQL のデッドロックもこのコード。PostgreSQL のデッドロックは `40P01`）、`22012` はゼロ除算です。アプリで再試行する条件の判定に使えます。

## 実務Tips

### 更新・削除で事故を起こさない

- `UPDATE` / `DELETE` を書いたら、**まず同じ `WHERE` で `SELECT COUNT(*)`** して件数を確認する
- トランザクションを開始してから実行し、件数を確認して `COMMIT` する
- `WHERE` を書き忘れたまま実行しないよう、`WHERE` から先に書く習慣をつける（MySQL クライアントは `--safe-updates` で `WHERE` なしの更新を拒否できる）
- 大量更新は件数を区切って複数回に分ける。1回で数百万行を更新するとロック・ログが膨らむ
- 実行前にバックアップ用テーブル（`CREATE TABLE users_bk_20261019 AS SELECT * FROM users;` など）を取っておくと戻しやすい

### 読みやすく保守しやすいSQL

- `SELECT *` はアプリのコードで使わない。列追加で結果が変わる
- テーブルには短い別名を付け、すべての列を `別名.列名` で書く
- 長いクエリは CTE（`WITH`）で段階に分ける。サブクエリの入れ子より読みやすい
- 予約語は大文字、テーブル・列名は小文字のように表記を統一する
- 日付リテラルは `'2026-10-19'`（ISO 8601）で書く。`'2026/10/19'` を受け付けないDB・設定がある

### パフォーマンス

- `WHERE` や `JOIN` に使う列にインデックスを作る。複合インデックスは**左の列から順に**使われる
- `WHERE UPPER(name) = ...` や `WHERE order_date + 1 = ...` のように**列側を加工するとインデックスが使われない**。加工は値の側で行う
- `LIKE '%田%'`（前方が `%`）は通常のインデックスを使えない。全文検索や前方一致を検討する
- `OR` が多い条件や `IN` に数千件の値を並べる書き方は、一時テーブルとの JOIN に置き換えると速くなることがある
- 遅いと感じたら推測せず、まず実行計画を見る

### セキュリティ

- アプリから SQL を組み立てるときは、**文字列連結ではなくプレースホルダ（バインド変数）**を使う。SQLインジェクションの最大の対策
- アプリ用のユーザーには必要なテーブルへの `SELECT` / `INSERT` / `UPDATE` / `DELETE` だけを付け、DDL 権限は与えない
- 調査用に本番データを抽出するときは、個人情報の列を含めない・マスクする

## 関連リンク

- [PostgreSQL ドキュメント](https://www.postgresql.org/docs/current/)
- [PostgreSQL エラーコード一覧（SQLSTATE）](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [MySQL ドキュメント](https://dev.mysql.com/doc/)
- [Transact-SQL リファレンス（SQL Server）](https://learn.microsoft.com/ja-jp/sql/t-sql/language-reference)
- [Oracle Database ドキュメント](https://docs.oracle.com/en/database/)
- [SQLite の SQL 構文](https://www.sqlite.org/lang.html)
