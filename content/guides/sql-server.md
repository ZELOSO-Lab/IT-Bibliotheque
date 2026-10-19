---
title: Microsoft SQL Server 技術まとめ
slug: sql-server
excerpt: SQL Serverの基本用語とエディション、インストールと接続設定、sqlcmd・T-SQLのよく使うコマンド、ストアドプロシージャやバックアップのサンプル、Msg 18456などの代表的なエラーと対処、運用でハマりやすいポイントまで、現場で必要になる情報を1ページにまとめました。
updated: 2026-10-19
---

# Microsoft SQL Server 技術まとめ

## 基礎

SQL Server は Microsoft 製のリレーショナルデータベース（RDBMS）です。SQL の方言である **T-SQL（Transact-SQL）** で操作し、Windows 中心の業務システムや .NET アプリのデータベースとして広く使われています。Linux 版・Docker 版もあり、クラウドでは Azure SQL Database / Azure SQL Managed Instance、AWS RDS for SQL Server として利用できます。

### 主な用途

- 業務システム（販売・生産・会計など）のデータベース
- .NET（C# / VB.NET）アプリのバックエンド
- BI・レポート（SSRS / SSIS / SSAS、Power BI のデータソース）
- オンプレミスから Azure SQL への移行元

### まず押さえる用語

| 用語 | 意味 | 現場での注意点 |
| --- | --- | --- |
| インスタンス | 1台のOS上で動く SQL Server の実体。既定インスタンスと名前付きインスタンスがある | 名前付きは `サーバー名\インスタンス名`（例: `localhost\SQLEXPRESS`）で接続する |
| データベース | テーブルなどをまとめた単位。データファイル（`.mdf`）とログファイル（`.ldf`）で構成 | ログファイルは放置すると肥大化する（後述） |
| スキーマ | データベース内の名前空間。既定は `dbo` | `dbo.users` のように**スキーマ名を付けて書く**のが基本 |
| ログイン / ユーザー | ログインはインスタンス単位、ユーザーはデータベース単位 | リストア後に「ログインはあるのに入れない」（孤立ユーザー）が起きる |
| 認証モード | Windows 認証のみ、または SQL Server 認証との混在モード | インストール既定は Windows 認証のみ。`sa` で入れない原因になる |
| 復旧モデル | FULL / SIMPLE / BULK_LOGGED。ログの扱いを決める | FULL なのにログバックアップを取らないとログが増え続ける |
| 照合順序（Collation） | 文字列の比較・並び順のルール | 日本語環境の既定は `Japanese_CI_AS`（大文字小文字を区別しない） |
| SQL Server エージェント | ジョブ（定期実行）を動かすサービス | Express エディションには含まれない |

### エディション

| エディション | 費用 | 用途・制限 |
| --- | --- | --- |
| Enterprise | 有償 | 大規模・高可用性。機能制限なし |
| Standard | 有償 | 一般的な業務システム。CPU・メモリ使用量に上限あり |
| Express | 無償 | 小規模向け。データベースサイズ・メモリ・CPUに上限あり、エージェントなし |
| Developer | 無償 | Enterprise 相当の機能。**開発・テスト専用**で本番利用は不可 |

上限値はバージョンごとに変わるため、採用前に各バージョンの「エディションとサポートされている機能」を確認します。

### 主なツール

| ツール | 用途 |
| --- | --- |
| SSMS（SQL Server Management Studio） | 定番の管理GUI。クエリ実行・バックアップ・権限管理など |
| sqlcmd | コマンドラインのクエリ実行ツール。バッチやジョブで使う |
| SQL Server 構成マネージャー | サービス・ネットワークプロトコル（TCP/IP）の設定 |
| PowerShell `SqlServer` モジュール | `Invoke-Sqlcmd` などで運用を自動化 |
| VS Code（MSSQL 拡張） | 開発者向けの軽量クライアント。Mac/Linux でも使える |

## 環境構築

### 1. Windows にインストールする

1. Microsoft のサイトからインストーラーを入手する（検証なら Developer、軽い用途なら Express）
2. 「カスタム」でインストールし、**データベースエンジン サービス**を選ぶ
3. 「データベース エンジンの構成」で認証モードを選ぶ。アプリから SQL 認証で接続するなら**混在モード**にして `sa` のパスワードを設定する
4. 「SQL Server 管理者の指定」で「現在のユーザーの追加」を押す（忘れると誰も管理者権限で入れない）
5. 照合順序は既定（日本語 Windows なら `Japanese_CI_AS`）のままが無難。既存システムに合わせる場合は事前に確認する
6. SSMS は**別途ダウンロードしてインストール**する

### 2. Docker で試す（Linux / Mac / WSL）

```sh
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStr0ng!Pass" \
  -p 1433:1433 --name sql1 -d mcr.microsoft.com/mssql/server:2022-latest

docker logs sql1          # 起動ログを確認
```

`sa` のパスワードは複雑さの要件（8文字以上、英大文字・小文字・数字・記号のうち3種類）を満たさないと**コンテナが起動直後に停止**します。

### 3. リモートから接続できるようにする

既定のままでは他のPCから接続できないことが多いです。次を順に確認します。

1. **SQL Server 構成マネージャー** →「SQL Server ネットワークの構成」→ 対象インスタンスのプロトコル →「TCP/IP」を**有効**にし、サービスを再起動
2. 既定インスタンスは TCP 1433。名前付きインスタンスは動的ポートのため、**SQL Server Browser サービス**（UDP 1434）を起動するか、固定ポートを設定する
3. Windows ファイアウォールでポートを許可する

```powershell
New-NetFirewallRule -DisplayName "SQL Server 1433" -Direction Inbound -Protocol TCP -LocalPort 1433 -Action Allow
New-NetFirewallRule -DisplayName "SQL Browser" -Direction Inbound -Protocol UDP -LocalPort 1434 -Action Allow

# サービスの再起動（既定インスタンス / 名前付きインスタンス）
Restart-Service -Name MSSQLSERVER -Force
Restart-Service -Name 'MSSQL$SQLEXPRESS' -Force
```

### 4. 接続を確認する

```powershell
sqlcmd -S localhost -E -Q "SELECT @@VERSION"                 # Windows 認証
sqlcmd -S localhost\SQLEXPRESS -U sa -P "YourStr0ng!Pass" -Q "SELECT @@SERVERNAME"
sqlcmd -S 192.168.1.10,1433 -U app_user -d mydb               # ポート指定は「,」
```

新しいクライアント（ODBC Driver 18、Microsoft.Data.SqlClient、新しい sqlcmd）は**既定で暗号化が有効**です。自己署名証明書のサーバーに接続すると証明書エラーになるため、検証環境では `-C`（サーバー証明書を信頼）や接続文字列の `TrustServerCertificate=True` を付けます。本番では正式な証明書を設定します。

### 接続文字列の例（.NET）

```text
Server=db01\SQLEXPRESS;Database=mydb;User Id=app_user;Password=...;TrustServerCertificate=True;
Server=db01;Database=mydb;Integrated Security=True;Encrypt=True;
```

## コマンド

### sqlcmd の主なオプション

| オプション | 用途 | 例 |
| --- | --- | --- |
| `-S` | 接続先サーバー（`サーバー\インスタンス` / `サーバー,ポート`） | `-S db01\SQLEXPRESS` |
| `-E` | Windows 認証で接続 | `-E` |
| `-U` / `-P` | SQL 認証のログイン名 / パスワード | `-U sa` |
| `-d` | 接続するデータベース | `-d mydb` |
| `-Q` | クエリを実行して終了 | `-Q "SELECT COUNT(*) FROM dbo.users"` |
| `-i` / `-o` | 入力SQLファイル / 出力ファイル | `-i deploy.sql -o result.log` |
| `-b` | エラー時に終了コードを返す（バッチで必須） | `-b` |
| `-W` / `-s` / `-h -1` | 末尾空白の除去 / 区切り文字 / 見出しなし | CSV風に出すときに使う |
| `-v` | sqlcmd 変数を渡す（SQL側は `$(名前)`） | `-v DBNAME=mydb` |
| `-C` | サーバー証明書を検証せず信頼する | 検証環境のみ |

### 確認・メタ情報

```sql
SELECT @@VERSION;                                  -- バージョン
SELECT name, state_desc, recovery_model_desc FROM sys.databases;
SELECT * FROM INFORMATION_SCHEMA.TABLES ORDER BY TABLE_SCHEMA, TABLE_NAME;
EXEC sp_help 'dbo.users';                          -- 列・インデックス・制約
EXEC sp_helptext 'dbo.usp_GetOrders';              -- ストアドの定義
EXEC sp_who2;                                      -- 接続・ブロッキングの一覧
EXEC sp_spaceused;                                 -- DBのサイズ
DBCC SQLPERF(LOGSPACE);                            -- ログ使用率
```

`GO` は T-SQL の命令ではなく、SSMS / sqlcmd が解釈する**バッチ区切り**です。アプリから送るSQLに `GO` を含めると構文エラーになります。

### T-SQL 特有の構文

| 操作 | 構文 |
| --- | --- |
| 先頭N件 | `SELECT TOP (10) * FROM dbo.orders ORDER BY created_at DESC;` |
| ページング | `ORDER BY id OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY` |
| NULL 置換 | `ISNULL(col, 0)` / `COALESCE(col1, col2, 0)` |
| 条件 | `IIF(score >= 80, 'A', 'B')` / `CASE WHEN ... END` |
| 安全な型変換 | `TRY_CONVERT(int, '12a')` → 変換できなければ NULL |
| 日付書式 | `CONVERT(varchar(10), GETDATE(), 111)` → `yyyy/mm/dd` |
| 日付計算 | `DATEADD(day, -7, GETDATE())` / `DATEDIFF(day, start_date, end_date)` / `EOMONTH(GETDATE())` |
| 文字列連結 | `CONCAT(last_name, ' ', first_name)`（NULL は空文字扱い） |
| 行の連結 | `STRING_AGG(name, ',')`（2017以降） |
| 採番値の取得 | `SCOPE_IDENTITY()` / `OUTPUT inserted.id` |
| 一時テーブル | `#tmp`（セッション内）/ `##tmp`（全体）/ テーブル変数 `@t` |
| Unicode 文字列 | `N'山田'`（`nvarchar` には `N` を付ける） |

### トランザクションと例外処理

```sql
SET XACT_ABORT ON;   -- エラー時にトランザクション全体を確実にロールバック
BEGIN TRY
    BEGIN TRAN;
    UPDATE dbo.stock SET qty = qty - 1 WHERE item_id = 100;
    INSERT INTO dbo.stock_log(item_id, diff) VALUES (100, -1);
    COMMIT;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    THROW;           -- 元のエラーを呼び出し元へ再送出
END CATCH;
```

### バックアップ・リストア

```sql
-- 完全バックアップ（圧縮・チェックサム付き）
BACKUP DATABASE mydb TO DISK = N'D:\backup\mydb_full.bak'
  WITH COMPRESSION, CHECKSUM, INIT, STATS = 10;

-- ログバックアップ（復旧モデルが FULL の場合）
BACKUP LOG mydb TO DISK = N'D:\backup\mydb_log.trn' WITH COMPRESSION;

-- 運用中の世代に影響を与えない臨時バックアップ
BACKUP DATABASE mydb TO DISK = N'D:\backup\mydb_copy.bak' WITH COPY_ONLY;

-- バックアップの中身・検証
RESTORE FILELISTONLY FROM DISK = N'D:\backup\mydb_full.bak';
RESTORE VERIFYONLY  FROM DISK = N'D:\backup\mydb_full.bak';

-- 別名・別パスでリストア
RESTORE DATABASE mydb_test FROM DISK = N'D:\backup\mydb_full.bak'
  WITH MOVE 'mydb'     TO N'D:\data\mydb_test.mdf',
       MOVE 'mydb_log' TO N'D:\data\mydb_test_log.ldf',
       STATS = 10;
```

`MOVE` の左側は**論理ファイル名**です。`RESTORE FILELISTONLY` の `LogicalName` 列で確認します。

### ユーザー・権限

```sql
CREATE LOGIN app_user WITH PASSWORD = N'Str0ng!Pass', CHECK_POLICY = ON;
USE mydb;
CREATE USER app_user FOR LOGIN app_user;
ALTER ROLE db_datareader ADD MEMBER app_user;
ALTER ROLE db_datawriter ADD MEMBER app_user;
GRANT EXECUTE ON SCHEMA::dbo TO app_user;      -- ストアド実行権限
```

### PowerShell から実行する

```powershell
Install-Module SqlServer -Scope CurrentUser
Invoke-Sqlcmd -ServerInstance "db01\SQLEXPRESS" -Database mydb `
  -Query "SELECT TOP (5) * FROM dbo.orders" -TrustServerCertificate
```

`SqlServer` モジュールの新しいバージョンでは暗号化が既定で必須になっており、自己署名証明書の環境では `-TrustServerCertificate` が必要です。

## サンプル

### テーブル作成（よくある型の選び方）

```sql
CREATE TABLE dbo.customers (
    customer_id   int IDENTITY(1,1) NOT NULL CONSTRAINT PK_customers PRIMARY KEY,
    customer_code varchar(20)   NOT NULL CONSTRAINT UQ_customers_code UNIQUE,
    name          nvarchar(100) NOT NULL,          -- 日本語は nvarchar
    email         varchar(255)  NULL,
    credit_limit  decimal(12,0) NOT NULL CONSTRAINT DF_customers_limit DEFAULT (0),
    created_at    datetime2(0)  NOT NULL CONSTRAINT DF_customers_created DEFAULT (SYSDATETIME()),
    updated_at    datetime2(0)  NULL
);
CREATE INDEX IX_customers_name ON dbo.customers(name);
```

制約に名前を付けておくと、後で `ALTER TABLE ... DROP CONSTRAINT` するときに自動生成名（`DF__customers__cr__3B75D760` のような名前）を調べずに済みます。

### ストアドプロシージャ（パラメータ付き検索）

```sql
CREATE OR ALTER PROCEDURE dbo.usp_GetOrders
    @CustomerId int,
    @From date,
    @To   date
AS
BEGIN
    SET NOCOUNT ON;
    SELECT o.order_id, o.order_date, o.amount
    FROM dbo.orders AS o
    WHERE o.customer_id = @CustomerId
      AND o.order_date >= @From
      AND o.order_date <  DATEADD(day, 1, @To)   -- 終了日を含める
    ORDER BY o.order_date;
END;
GO
EXEC dbo.usp_GetOrders @CustomerId = 1, @From = '2026-10-01', @To = '2026-10-31';
```

`CREATE OR ALTER` は SQL Server 2016 SP1 以降で使えます。`SET NOCOUNT ON` で「(n 行処理されました)」のメッセージを抑止し、アプリ側の誤動作や余計な通信を防ぎます。

### 動的SQLは sp_executesql でパラメータ化する

```sql
DECLARE @sql nvarchar(max) = N'SELECT * FROM dbo.customers WHERE name LIKE @kw';
EXEC sys.sp_executesql @sql, N'@kw nvarchar(100)', @kw = N'%山田%';
```

文字列連結で値を埋め込む `EXEC('... ' + @input)` は SQL インジェクションの原因になります。

### いま重い・止まっているクエリを調べる

```sql
SELECT r.session_id, r.blocking_session_id, r.status, r.wait_type,
       r.wait_time, r.cpu_time, r.total_elapsed_time,
       DB_NAME(r.database_id) AS db, t.text AS sql_text
FROM sys.dm_exec_requests AS r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) AS t
WHERE r.session_id <> @@SPID
ORDER BY r.total_elapsed_time DESC;
```

`blocking_session_id` が 0 以外なら、その番号のセッションにブロックされています。原因のセッションを確認したうえで、やむを得ない場合だけ `KILL 番号;` で切断します（ロールバックに時間がかかることがあります）。

### インデックスの断片化を確認する

```sql
SELECT OBJECT_NAME(ips.object_id) AS table_name, i.name AS index_name,
       ips.avg_fragmentation_in_percent, ips.page_count
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') AS ips
JOIN sys.indexes AS i ON i.object_id = ips.object_id AND i.index_id = ips.index_id
WHERE ips.page_count > 1000
ORDER BY ips.avg_fragmentation_in_percent DESC;

ALTER INDEX IX_customers_name ON dbo.customers REORGANIZE;   -- 軽め
ALTER INDEX ALL ON dbo.customers REBUILD;                    -- 重め（Standardはオフライン）
UPDATE STATISTICS dbo.customers WITH FULLSCAN;
```

### Express 向け：タスクスケジューラで日次バックアップ

Express には SQL Server エージェントがないため、PowerShell スクリプトをタスクスケジューラで実行します。

```powershell
# daily_backup.ps1
$ts   = Get-Date -Format "yyyyMMdd_HHmm"
$path = "D:\backup\mydb_$ts.bak"
sqlcmd -S "localhost\SQLEXPRESS" -E -b -Q "BACKUP DATABASE mydb TO DISK = N'$path' WITH CHECKSUM, INIT"
if ($LASTEXITCODE -ne 0) { exit 1 }
# 14日より古いバックアップを削除
Get-ChildItem D:\backup\mydb_*.bak | Where-Object LastWriteTime -lt (Get-Date).AddDays(-14) | Remove-Item
```

バックアップ先フォルダには、**SQL Server サービスのアカウント**（例: `NT Service\MSSQL$SQLEXPRESS`）の書き込み権限が必要です。

## エラー対応

| エラー | 主な原因 | 対処 |
| --- | --- | --- |
| `Msg 18456 Login failed for user 'xxx'.` | パスワード誤り、ログインが無効、Windows 認証のみのモード、既定DBが開けない | 下の「18456 の切り分け」を参照 |
| `A network-related or instance-specific error occurred while establishing a connection to SQL Server.`（`error: 26 - Error Locating Server/Instance Specified` / `error: 40 - Could not open a connection to SQL Server`） | サーバー名・インスタンス名の誤り、TCP/IP 無効、SQL Browser 停止、ファイアウォール | `サーバー\インスタンス` の綴り、構成マネージャーの TCP/IP、Browser サービス、1433/1434 の通信を確認 |
| `The certificate chain was issued by an authority that is not trusted.` | 新しいドライバーは既定で暗号化し、自己署名証明書を拒否する | 検証環境は `TrustServerCertificate=True` / `-C`。本番は信頼された証明書を設定 |
| `Cannot open database "xxx" requested by the login. The login failed.`（Msg 4060） | DB名の誤り、ログインに対応するユーザーがない | DB名を確認。`CREATE USER ... FOR LOGIN` でユーザーを作る |
| `Invalid object name 'xxx'.`（Msg 208） | テーブル名の誤り、別DBに接続している、スキーマ違い | `SELECT DB_NAME();` で接続先を確認し、`dbo.xxx` のようにスキーマを付ける |
| `Invalid column name 'xxx'.`（Msg 207） | 列名の誤り、列追加前のDBに接続 | `sp_help` で列を確認 |
| `Violation of PRIMARY KEY constraint '...'. Cannot insert duplicate key in object '...'.`（Msg 2627） | 主キー・一意制約の重複 | 既存行を確認。再実行で二重登録していないか見直す |
| `The INSERT statement conflicted with the FOREIGN KEY constraint "...".`（Msg 547） | 親テーブルに存在しない値を登録 | 親データを先に登録する。投入順序を見直す |
| `String or binary data would be truncated.`（Msg 8152 / 2628） | 列の長さを超える値 | 2019以降の Msg 2628 は列名と値が表示される。列長を広げるか入力を検証 |
| `Conversion failed when converting the varchar value 'abc' to data type int.`（Msg 245） | 文字列列に数値以外が混在、暗黙の型変換 | `TRY_CONVERT` で不正データを洗い出す |
| `Divide by zero error encountered.`（Msg 8134） | 0 で除算 | `x / NULLIF(y, 0)` で NULL にする |
| `Transaction (Process ID n) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.`（Msg 1205） | 複数処理が逆順でロックを取り合った | アプリ側で再試行。更新するテーブル・行の順序を揃え、トランザクションを短くする |
| `The transaction log for database 'xxx' is full due to 'LOG_BACKUP'.`（Msg 9002） | FULL 復旧モデルでログバックアップを取っていない | ログバックアップを取る。不要なら SIMPLE に変更（下の Tips 参照） |
| `Exclusive access could not be obtained because the database is in use.`（Msg 3101） | リストア先DBに接続が残っている | `ALTER DATABASE mydb SET SINGLE_USER WITH ROLLBACK IMMEDIATE;` 後にリストア |
| `Cannot open backup device '...'. Operating system error 5(Access is denied.).`（Msg 3201） | サービスアカウントにフォルダの権限がない | SQL Server サービスアカウントに書き込み権限を付与 |
| `Execution Timeout Expired.`（.NET） | クエリが遅い、ブロッキング | 上の「重いクエリを調べる」で原因を特定。安易にタイムアウトを延ばさない |

### 18456 の切り分け

クライアントには `State 1` としか表示されません。**本当の State はサーバーのエラーログ**（SSMS の「管理」→「SQL Server ログ」、または `ERRORLOG` ファイル）に出ます。

| State | 意味 | 対処 |
| --- | --- | --- |
| 2 / 5 | ログインが存在しない | ログイン名の綴り、`CREATE LOGIN` 済みか確認 |
| 7 | ログインが無効化されている | `ALTER LOGIN xxx ENABLE;` |
| 8 | パスワードが違う | パスワードを確認・リセット |
| 38 | 指定した（既定の）データベースが開けない | DB名・既定DBを確認、DB にユーザーがあるか確認 |
| 58 | Windows 認証のみのサーバーに SQL 認証で接続した | サーバーのプロパティ →「セキュリティ」→「SQL Server 認証モードと Windows 認証モード」に変更し、サービス再起動 |

`sa` を使う場合は次も確認します。

```sql
ALTER LOGIN sa ENABLE;
ALTER LOGIN sa WITH PASSWORD = N'NewStr0ng!Pass';
```

### リストア後にユーザーが入れない（孤立ユーザー）

別サーバーでリストアすると、DB内ユーザーとログインの SID が一致せずログインできなくなります。

```sql
-- 対応するログインがないユーザーを探す
SELECT dp.name FROM sys.database_principals AS dp
LEFT JOIN sys.server_principals AS sp ON sp.sid = dp.sid
WHERE dp.type = 'S' AND sp.sid IS NULL AND dp.name NOT IN ('guest', 'INFORMATION_SCHEMA', 'sys');

ALTER USER app_user WITH LOGIN = app_user;   -- 同名ログインにひも付け直す
```

## 実務Tips

### ログファイルの肥大化を防ぐ

- 復旧モデル FULL は**ログバックアップを定期的に取る前提**です。取らないとログファイルが増え続け、ディスクを使い切ります
- 「ポイントインタイムリストア不要」なら `ALTER DATABASE mydb SET RECOVERY SIMPLE;` にする
- ログが減らない理由は `SELECT name, log_reuse_wait_desc FROM sys.databases;` で確認できる（`LOG_BACKUP` / `ACTIVE_TRANSACTION` など）
- `DBCC SHRINKFILE` は一時的な対処です。定期実行すると断片化と再拡張を繰り返すため避けます

### 日本語・文字コード

- 日本語を入れる列は `nvarchar` にし、リテラルは `N'...'` と書く。`N` を忘れると照合順序によっては `?` に化けます
- 照合順序 `Japanese_CI_AS` は大文字小文字を区別しません（`'abc' = 'ABC'` が真）。区別したい列は `_CS_` の照合順序を指定します
- ひらがな・カタカナ、全角・半角の区別は照合順序の `_KS`（かな）`_WS`（文字幅）で決まります。検索で「ヒットしない／しすぎる」ときに確認します
- SSMS の結果を Excel に貼ると先頭ゼロや日付が変わることがあります。CSV 出力時は文字コード（UTF-8 / Shift_JIS）も確認します

### パフォーマンス

- 遅いクエリは SSMS の「実際の実行プランを含める」（`Ctrl+M`）で確認し、Table Scan / Key Lookup と推定行数のずれを見る
- `WHERE CONVERT(varchar, order_date, 111) = '2026/10/19'` のように**列に関数をかけるとインデックスが効かない**。範囲条件（`>= '2026-10-19' AND < '2026-10-20'`）で書く
- `varchar` 列を `N'...'` で比較すると暗黙変換でインデックスが効かないことがある。パラメータの型を列に合わせる
- `NOLOCK`（`READ UNCOMMITTED`）は未コミットデータを読み、**行の重複・欠落**も起こり得ます。ブロッキング対策なら `READ_COMMITTED_SNAPSHOT` の有効化を検討します
- `FORMAT` 関数は便利ですが遅いため、大量行では `CONVERT` を使う

### 運用・作業ミスの防止

- 本番作業の前に `SELECT @@SERVERNAME, DB_NAME();` で接続先を確認する。SSMS では接続ごとにステータスバーの色を変えられる（接続ダイアログの「オプション」→「カスタム色を使用する」）
- 更新・削除は `BEGIN TRAN;` → 実行 → 件数を確認 → `COMMIT` / `ROLLBACK` の順で行う。トランザクションを開いたまま放置するとブロッキングの原因になる
- バックアップは**リストアできて初めて意味がある**。定期的に別環境へリストアして確認し、`DBCC CHECKDB` で整合性も確認する
- 週1回程度の `DBCC CHECKDB`、インデックス保守、統計更新をジョブ化する
- `sa` をアプリで使わない。アプリ用ログインには必要なロールだけを付ける

## 関連リンク

- [SQL Server のドキュメント](https://learn.microsoft.com/ja-jp/sql/sql-server/)
- [Transact-SQL リファレンス](https://learn.microsoft.com/ja-jp/sql/t-sql/language-reference)
- [SQL Server Management Studio（SSMS）のダウンロード](https://learn.microsoft.com/ja-jp/sql/ssms/download-sql-server-management-studio-ssms)
- [sqlcmd ユーティリティ](https://learn.microsoft.com/ja-jp/sql/tools/sqlcmd/sqlcmd-utility)
- [データベース エンジンのイベントとエラー](https://learn.microsoft.com/ja-jp/sql/relational-databases/errors-events/database-engine-events-and-errors)
- [Docker で SQL Server Linux コンテナーを実行する](https://learn.microsoft.com/ja-jp/sql/linux/quickstart-install-connect-docker)
