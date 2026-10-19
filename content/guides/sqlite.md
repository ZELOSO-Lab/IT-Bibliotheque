---
title: SQLite 技術まとめ
slug: sqlite
excerpt: SQLiteの仕組みと向き不向き、CLI（sqlite3）の導入、よく使うドットコマンドとSQL、Pythonからの利用やCSV取込のサンプル、database is lockedなどよくあるエラーの対処、WALやバックアップなど運用の実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# SQLite 技術まとめ

## 基礎

SQLite は、**ファイル1つがそのままデータベースになる**軽量な組込み型のリレーショナルデータベースです。サーバープロセスがなく、アプリケーションにライブラリとして組み込んで使います。スマートフォンアプリ、ブラウザ、デスクトップアプリ、各種ツールの設定保存など、非常に多くの場所で使われています。ソースコードはパブリックドメインで、ライセンス費用はかかりません。

### 主な用途

- スマホ・デスクトップアプリのローカルデータ保存
- テスト用・試作用のデータベース
- 小規模な Web アプリ、社内ツール
- CSV などのデータを SQL で集計・加工する作業用 DB

### サーバー型 RDBMS との違い

| 項目 | SQLite | MySQL・PostgreSQL・Oracle など |
| --- | --- | --- |
| 構成 | アプリに組み込むライブラリ。DB は1ファイル | 独立したサーバープロセスにネットワーク経由で接続 |
| 導入 | インストール・設定不要 | サーバー構築、ユーザー・権限の設定が必要 |
| 同時書き込み | **書き込みは同時に1つだけ**（DB全体で直列化） | 行単位のロックで多数が同時に書き込める |
| ユーザー・権限 | なし（ファイルのアクセス権がすべて） | DB ユーザーと GRANT で管理 |
| 型 | 列の型は「目安」（型アフィニティ）。STRICT テーブルで厳密化できる | 列の型が厳密 |
| バックアップ | ファイルのコピー（ただし作法あり、後述） | 専用ツール |

**向いている**: 1台のマシン内で使うデータ、読み取り中心、書き込みが少ない〜中程度の用途。
**向いていない**: 多数のクライアントからの同時書き込み、ネットワーク越しの共有（ファイルサーバー上の DB ファイルを複数 PC から使う運用など）。

### 型アフィニティ

SQLite の値の型は `NULL`・`INTEGER`・`REAL`・`TEXT`・`BLOB` の5種類だけです。列に宣言した型は「その型に寄せる」程度の意味しかなく、通常のテーブルでは `INTEGER` 列に `'abc'` も入ってしまいます。

| よくある疑問 | 答え |
| --- | --- |
| 日付型は？ | ない。`TEXT`（`'2026-10-19 09:00:00'` の ISO 8601 形式）か `INTEGER`（UNIX 時刻）で保存する |
| 真偽値は？ | ない。`0` / `1` の整数で保存する |
| 自動採番は？ | `INTEGER PRIMARY KEY` の列は ROWID の別名になり、自動で採番される |
| 型を厳密にしたい | 3.37.0 以降はテーブル定義の末尾に `STRICT` を付ける |

## 環境構築

### 1. CLI（sqlite3）を入れる

| 環境 | 方法 |
| --- | --- |
| Windows | 公式ダウンロードページの「sqlite-tools-win-x64-*.zip」を展開し、`sqlite3.exe` のあるフォルダを `PATH` に追加 |
| macOS | 標準で入っている。新しい版が必要なら `brew install sqlite` |
| Ubuntu / Debian | `sudo apt install sqlite3` |
| RHEL / Rocky / Alma | `sudo dnf install sqlite` |

```bash
sqlite3 --version
sqlite3 app.db          # ファイルがなければ、最初の書き込み時に作成される
```

### 2. GUI ツール

CLI に慣れていない場合は、無償の GUI ツール（DB Browser for SQLite、DBeaver など）が便利です。テーブル定義の確認や CSV の取り込みを画面から行えます。

### 3. プログラムから使う

多くの言語は追加のサーバーなしで SQLite を扱えます。

| 言語 | 利用方法 |
| --- | --- |
| Python | 標準ライブラリの `sqlite3` モジュール（インストール不要） |
| Node.js | `better-sqlite3` などのパッケージ。新しい Node.js では組込みの `node:sqlite` もある |
| Java | SQLite JDBC ドライバー（`org.xerial:sqlite-jdbc`） |
| .NET | `Microsoft.Data.Sqlite` |
| PHP | PDO（`pdo_sqlite`） |

```bash
# Python に組み込まれている SQLite のバージョン（使える機能の確認に使う）
python3 -c "import sqlite3; print(sqlite3.sqlite_version)"
```

**CLI のバージョンと、アプリが使う SQLite ライブラリのバージョンは別**です。新しい構文（`RETURNING` など）が CLI では動くのにアプリでは動かない場合は、ライブラリ側のバージョンを確認します。

### 4. 最初に設定しておく PRAGMA

```sql
PRAGMA foreign_keys = ON;      -- 外部キー制約を有効化（既定は無効、接続ごとに必要）
PRAGMA journal_mode = WAL;     -- 読み書きの同時実行性が上がる（DBファイルに記録される）
PRAGMA busy_timeout = 5000;    -- ロック中なら最大5秒待つ（接続ごとに必要）
```

## コマンド

### CLI の基本（ドットコマンド）

| 操作 | コマンド・構文 |
| --- | --- |
| 開く・作成 | `sqlite3 app.db` |
| テーブル一覧 | `.tables` |
| 定義表示 | `.schema users` |
| 接続中のDBファイル | `.databases` |
| SQL ファイルを実行 | `.read script.sql` |
| ヘルプ | `.help` |
| 終了 | `.quit`（または `.exit`、Ctrl+D） |

ドットコマンドは行頭に書き、末尾に `;` は付けません。SQL 文は `;` で終わるまで実行されません。

### 表示設定

| 操作 | コマンド・構文 |
| --- | --- |
| 見出し表示 | `.headers on` |
| 表形式 | `.mode table`（罫線付きは `.mode box`、3.33.0以降） |
| CSV 形式 | `.mode csv` |
| Markdown の表 | `.mode markdown` |
| 実行時間を表示 | `.timer on` |
| 結果をファイルへ | `.output result.txt`（戻すときは `.output`） |
| 次の1回だけファイルへ | `.once result.csv` |

### インポート・エクスポート

| 操作 | コマンド・構文 |
| --- | --- |
| CSV 取込（新規テーブル） | `.import --csv data.csv users`（1行目が列名になる） |
| CSV 取込（既存テーブル、見出し行を飛ばす） | `.import --csv --skip 1 data.csv users`（3.32.0以降） |
| 旧来の CSV 取込 | `.mode csv` → `.import data.csv users` |
| CSV 出力 | `.headers on` → `.mode csv` → `.once out.csv` → `SELECT ...;` |
| コマンドラインから CSV 出力 | `sqlite3 -header -csv app.db "SELECT * FROM users;" > users.csv` |

### SQL

| 操作 | コマンド・構文 |
| --- | --- |
| テーブル作成 | `CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);` |
| 自動採番 | `INTEGER PRIMARY KEY` は ROWID の別名で自動採番される |
| UPSERT（3.24.0以降） | `INSERT INTO t ... ON CONFLICT(id) DO UPDATE SET name = excluded.name;` |
| 登録した行を返す（3.35.0以降） | `INSERT INTO users (name) VALUES ('a') RETURNING id;` |
| 現在日時（UTC） | `datetime('now')` |
| 現在日時（ローカル） | `datetime('now', 'localtime')` |
| 日付の計算 | `date('now', '+7 days')`、`date('now', 'start of month')` |
| 日付の書式 | `strftime('%Y-%m', ordered_at)` |
| 文字列連結 | `last_name \|\| ' ' \|\| first_name` |
| 列の追加・削除 | `ALTER TABLE users ADD COLUMN tel TEXT;` / `ALTER TABLE users DROP COLUMN tel;`（削除は3.35.0以降） |
| JSON | `json_extract(data, '$.a.b')`、`data ->> '$.a'`（`->>` は3.38.0以降） |

### 運用

| 操作 | コマンド・構文 |
| --- | --- |
| バックアップ（稼働中でも安全） | `.backup backup.db` |
| バックアップ（SQL、3.27.0以降） | `VACUUM INTO 'backup.db';` |
| ダンプ | `sqlite3 app.db .dump > dump.sql` |
| ダンプから復元 | `sqlite3 new.db < dump.sql` |
| 最適化（空き領域の解放） | `VACUUM;` |
| 統計情報の更新 | `ANALYZE;`（または `PRAGMA optimize;`） |
| 整合性チェック | `PRAGMA integrity_check;`（高速版は `PRAGMA quick_check;`） |
| 外部キー有効化 | `PRAGMA foreign_keys = ON;` |
| 実行計画 | `EXPLAIN QUERY PLAN SELECT ...;` |

## サンプル

### テーブル作成（STRICT・外部キー）

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id         INTEGER PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
) STRICT;

CREATE TABLE orders (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount     INTEGER NOT NULL,
  ordered_at TEXT NOT NULL
) STRICT;

CREATE INDEX idx_orders_user ON orders(user_id);
```

`DEFAULT` に関数を使うときは `DEFAULT (datetime('now', 'localtime'))` のように**かっこで囲む**必要があります。STRICT テーブルでは `amount` に `'abc'` を入れようとするとエラーになります。

### UPSERT と RETURNING

```sql
INSERT INTO users (email, name) VALUES ('taro@example.com', '山田');

-- 同じメールアドレスがあれば名前を更新
INSERT INTO users (email, name) VALUES ('taro@example.com', '山田太郎')
  ON CONFLICT(email) DO UPDATE SET name = excluded.name;

-- 採番された id を受け取る
INSERT INTO users (email, name) VALUES ('hanako@example.com', '佐藤花子')
  RETURNING id;
```

### 月別集計（ウィンドウ関数、3.25.0以降）

```sql
SELECT strftime('%Y-%m', ordered_at)       AS ym,
       SUM(amount)                         AS sales,
       SUM(SUM(amount)) OVER (ORDER BY strftime('%Y-%m', ordered_at)) AS cumulative
  FROM orders
 GROUP BY ym
 ORDER BY ym;
```

### Python から使う

```python
import sqlite3
from contextlib import closing

DB_PATH = "app.db"

with closing(sqlite3.connect(DB_PATH, timeout=5)) as conn:
    conn.row_factory = sqlite3.Row             # 列名でアクセスできるようにする
    conn.execute("PRAGMA foreign_keys = ON")

    # with conn: のブロックを抜けると COMMIT（例外なら ROLLBACK）される
    with conn:
        conn.execute(
            "INSERT INTO users (email, name) VALUES (?, ?)",   # 必ずプレースホルダを使う
            ("jiro@example.com", "鈴木次郎"),
        )

    for row in conn.execute("SELECT id, name FROM users ORDER BY id"):
        print(row["id"], row["name"])
```

`with conn:` は**トランザクションを確定するだけで、接続は閉じません**。接続を確実に閉じるには `contextlib.closing` などを併用します。

### Excel の CSV を取り込んで集計する

Excel で保存した CSV は Shift_JIS の場合が多く、そのままでは文字化けします。UTF-8 に変換してから取り込みます。

```powershell
# PowerShell 7.1 以降: Shift_JIS → UTF-8 に変換
Get-Content .\sales.csv -Encoding 932 | Set-Content .\sales_utf8.csv -Encoding utf8
```

```bash
sqlite3 work.db
```

```text
sqlite> .import --csv sales_utf8.csv sales
sqlite> .mode box
sqlite> SELECT 店舗, SUM(CAST(金額 AS INTEGER)) AS 合計 FROM sales GROUP BY 店舗 ORDER BY 合計 DESC;
```

`.import` で新規作成したテーブルの列はすべて `TEXT` になるため、数値として集計するときは `CAST` します。

## エラー対応

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `database is locked` | 他の接続が書き込み中（またはトランザクションを開いたまま） | `PRAGMA busy_timeout` を設定する。トランザクションを短くし、COMMIT 忘れを探す。WAL モードにする |
| `unable to open database file` | パスの誤り、フォルダが存在しない、権限不足 | 絶対パスで指定する。親フォルダの存在と書き込み権限を確認 |
| `attempt to write a readonly database` | DB ファイル、または**フォルダ**に書き込み権限がない | ジャーナルファイルを作るためフォルダにも書き込み権限が必要。Web サーバーの実行ユーザーにも注意 |
| `no such table: users` | テーブル名の誤り、**別のファイルを開いている** | `.databases` で開いているファイルを確認。相対パスだと作業フォルダ次第で空のDBが新規作成される |
| `no such column: nmae` | 列名の誤り、文字列リテラルを `"` で囲んだ（ビルドによっては列名扱い） | `.schema` で列名を確認。文字列リテラルは `'` で囲む |
| `near "SELEC": syntax error` | 構文エラー、古いバージョンで未対応の構文 | `near` の箇所を確認。`sqlite_version()` で版を確認する |
| `UNIQUE constraint failed: users.email` | 一意制約・主キーの重複 | 既存データを確認、`ON CONFLICT` を使う |
| `NOT NULL constraint failed: users.name` | NOT NULL 列に NULL | 値の渡し漏れを確認、`DEFAULT` を設定 |
| `FOREIGN KEY constraint failed` | 親テーブルに存在しない値（`foreign_keys = ON` のとき） | 親を先に登録する。制約名や列名は表示されないので、`PRAGMA foreign_key_check;` で違反行を探す |
| `table users has 4 columns but 2 values were supplied` | 列名を省略した INSERT で値の数が不足 | `INSERT INTO users (email, name) VALUES (...)` のように列名を明示する |
| `cannot store TEXT value in INTEGER column orders.amount` | STRICT テーブルに型が合わない値 | アプリ側で型を変換して渡す |
| `cannot start a transaction within a transaction` | `BEGIN` の二重実行（ドライバーが自動で BEGIN している場合も） | 既存のトランザクションを COMMIT / ROLLBACK してから開始する |
| `database disk image is malformed` | ファイル破損（コピー途中のファイル、ネットワークドライブ、強制終了など） | すぐにファイルをコピーして保全。`.recover` で救出したデータを新しいDBに入れる |
| `file is not a database` | SQLite 以外のファイル、暗号化された DB | ファイルの中身・暗号化の有無を確認 |

**壊れた DB から救出する（3.29.0以降の CLI）**

```bash
cp broken.db broken_copy.db                  # まず保全
sqlite3 broken_copy.db ".recover" > recovered.sql
sqlite3 new.db < recovered.sql
sqlite3 new.db "PRAGMA integrity_check;"     # ok と表示されれば整合性に問題なし
```

## 実務Tips

### ファイルの置き場所と同時アクセス

- **ネットワークドライブ（共有フォルダ）上の DB ファイルを複数の PC から使わない**。ファイルロックが正しく働かず、破損の原因になる。Windows の部署共有フォルダで Access の代わりに使う運用は特に注意する
- 複数ユーザーが同時に書き込む用途になったら、サーバー型の RDBMS（PostgreSQL・MySQL など）への移行を検討する
- 相対パスで DB を開くと、起動したフォルダによって**別の空ファイルが作られる**。アプリでは実行ファイル基準の絶対パスにする
- WAL モードは同じマシン内での読み書きの同時実行性が上がるが、ネットワークファイルシステムでは使えない

### バックアップ

- WAL モードでは DB 本体のほかに `app.db-wal`・`app.db-shm` ができる。**稼働中に `app.db` だけをコピーすると、最新の変更が含まれない・壊れたコピーになる**ことがある
- 稼働中のバックアップは `.backup` コマンドか `VACUUM INTO`、各言語のオンラインバックアップ API（Python なら `conn.backup()`）を使う
- ファイルコピーでバックアップするなら、アプリを止めて全接続を閉じてから行う

### SQL を書くときの注意

- **外部キーは既定で無効**。接続のたびに `PRAGMA foreign_keys = ON;` を実行しないと、制約を書いても効かない
- `datetime('now')` は **UTC**。日本時間が必要なら `'localtime'` を付けるか、UTC で保存して表示時に変換する（どちらかに統一する）
- 日時は `'YYYY-MM-DD HH:MM:SS'` 形式の文字列で保存すると、文字列比較でも正しく範囲検索・並べ替えができる
- 文字列リテラルは `'`（シングルクォート）で囲む。`"` で囲むと列名として解釈され、列がない場合だけ文字列として扱われるため、思わぬバグになる
- `LIKE` は ASCII 文字だけ大文字小文字を区別しない。全角英字やかなの揺れは吸収しない
- 列の型変更や制約の追加は `ALTER TABLE` でできないことが多い。新しいテーブルを作ってデータを移し、名前を付け替える
- 大量の INSERT は**1つのトランザクションにまとめる**。1件ずつ自動コミットすると桁違いに遅い

### テスト用途

- `sqlite3.connect(":memory:")` のように `:memory:` を指定すると、メモリ上だけの DB になり単体テストに便利
- ただし本番が MySQL・PostgreSQL なら、型の厳密さ・日付関数・UPSERT 構文などが異なる。SQLite で通ったテストが本番 DB で落ちることがあるので、結合テストは本番と同じ DB で行う

## 関連リンク

- [SQLite 公式ドキュメント](https://www.sqlite.org/docs.html)
- [SQLite ダウンロード](https://www.sqlite.org/download.html)
- [SQLite CLI（sqlite3）の使い方](https://www.sqlite.org/cli.html)
- [SQLite の SQL 構文](https://www.sqlite.org/lang.html)
- [PRAGMA 一覧](https://www.sqlite.org/pragma.html)
- [Python sqlite3 モジュール](https://docs.python.org/ja/3/library/sqlite3.html)
