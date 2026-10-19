---
title: MySQL 技術まとめ
slug: mysql
excerpt: MySQLのインストール、基本操作、ユーザー管理、バックアップ、エラー対応などの技術情報をまとめています。
updated: 2026-10-19
---

# MySQL 技術まとめ

## 基礎

Webサービスで定番のオープンソースRDBMS。

### 主な用途

- Webサービス
- CMS
- 業務システム
- 分析用データベース

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[MySQL 公式ドキュメント](https://dev.mysql.com/doc/)を参照してください。

## コマンド

### 接続

```
mysql -u root -p -h localhost mydb
```

### DB・テーブル一覧

```
SHOW DATABASES;
SHOW TABLES;
DESCRIBE users;
```

### バックアップとリストア

```
mysqldump -u root -p mydb > backup.sql
mysql -u root -p mydb < backup.sql
```

### 早見表：接続・確認

| 操作 | コマンド・構文 |
| --- | --- |
| 接続 | `mysql -u root -p -h localhost db` |
| DB 一覧 | `SHOW DATABASES;` |
| テーブル定義 | `SHOW CREATE TABLE users\G` |
| 実行中の処理 | `SHOW PROCESSLIST;` |

### 早見表：ユーザー・権限

| 操作 | コマンド・構文 |
| --- | --- |
| ユーザー作成 | `CREATE USER 'app'@'%' IDENTIFIED BY 'pass';` |
| 権限付与 | `GRANT ALL ON db.* TO 'app'@'%';` |
| 権限確認 | `SHOW GRANTS FOR 'app'@'%';` |
| パスワード変更 | `ALTER USER 'app'@'%' IDENTIFIED BY 'new';` |

### 早見表：SQL（MySQL 特有）

| 操作 | コマンド・構文 |
| --- | --- |
| 先頭N件 | `SELECT * FROM t ORDER BY id LIMIT 10 OFFSET 20;` |
| NULL 置換 | `IFNULL(col, 0)` |
| 日付書式 | `DATE_FORMAT(NOW(), '%Y-%m-%d')` |
| UPSERT | `INSERT ... ON DUPLICATE KEY UPDATE name = VALUES(name);` |

### 早見表：バックアップ・性能

| 操作 | コマンド・構文 |
| --- | --- |
| ダンプ | `mysqldump -u root -p db > backup.sql` |
| リストア | `mysql -u root -p db < backup.sql` |
| 実行計画 | `EXPLAIN SELECT ...;` |
| インデックス作成 | `CREATE INDEX idx_name ON users(name);` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[MySQL 公式ドキュメント](https://dev.mysql.com/doc/)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[MySQL 公式ドキュメント](https://dev.mysql.com/doc/)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[MySQL 公式ドキュメント](https://dev.mysql.com/doc/)を参照してください。

## 関連リンク

- [MySQL 公式ドキュメント](https://dev.mysql.com/doc/)
