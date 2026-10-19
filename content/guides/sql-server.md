---
title: Microsoft SQL Server 技術まとめ
slug: sql-server
excerpt: Microsoft SQL Serverの基本操作、T-SQL、SSMS、バックアップ、エラー対応などの技術情報をまとめています。
updated: 2026-10-19
---

# Microsoft SQL Server 技術まとめ

## 基礎

Microsoft製のRDBMS。T-SQLで操作する。

### 主な用途

- 業務システム
- .NETアプリのDB
- BI・レポート
- Azure SQLへの移行

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[Microsoft SQL Server 公式ドキュメント](https://learn.microsoft.com/ja-jp/sql/sql-server/)を参照してください。

## コマンド

### sqlcmdで接続

```
sqlcmd -S localhost -U sa -d mydb
```

### 先頭N件の取得

```
SELECT TOP 10 * FROM orders ORDER BY created_at DESC;
```

### バックアップ

```
BACKUP DATABASE mydb TO DISK = 'C:\backup\mydb.bak';
```

### 早見表：接続・確認

| 操作 | コマンド・構文 |
| --- | --- |
| sqlcmd 接続 | `sqlcmd -S localhost -U sa -d db` |
| Windows 認証 | `sqlcmd -S localhost -E` |
| バージョン | `SELECT @@VERSION;` |
| DB 一覧 | `SELECT name FROM sys.databases;` |

### 早見表：T-SQL（特有）

| 操作 | コマンド・構文 |
| --- | --- |
| 先頭N件 | `SELECT TOP 10 * FROM t ORDER BY id DESC;` |
| ページング | `ORDER BY id OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY` |
| NULL 置換 | `ISNULL(col, 0)` |
| 日付書式 | `FORMAT(GETDATE(), 'yyyy/MM/dd')` |

### 早見表：メタ情報

| 操作 | コマンド・構文 |
| --- | --- |
| テーブル一覧 | `SELECT * FROM INFORMATION_SCHEMA.TABLES;` |
| 列定義 | `EXEC sp_help 'dbo.users';` |
| 実行中の処理 | `EXEC sp_who2;` |
| バッチ区切り | `GO` |

### 早見表：バックアップ

| 操作 | コマンド・構文 |
| --- | --- |
| バックアップ | `BACKUP DATABASE db TO DISK = 'C:\bk\db.bak';` |
| リストア | `RESTORE DATABASE db FROM DISK = 'C:\bk\db.bak';` |
| トランザクション | `BEGIN TRAN; ... COMMIT; / ROLLBACK;` |
| 例外処理 | `BEGIN TRY ... END TRY BEGIN CATCH ... END CATCH` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[Microsoft SQL Server 公式ドキュメント](https://learn.microsoft.com/ja-jp/sql/sql-server/)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[Microsoft SQL Server 公式ドキュメント](https://learn.microsoft.com/ja-jp/sql/sql-server/)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[Microsoft SQL Server 公式ドキュメント](https://learn.microsoft.com/ja-jp/sql/sql-server/)を参照してください。

## 関連リンク

- [Microsoft SQL Server 公式ドキュメント](https://learn.microsoft.com/ja-jp/sql/sql-server/)
