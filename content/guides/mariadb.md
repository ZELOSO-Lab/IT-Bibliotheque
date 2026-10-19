---
title: MariaDB 技術まとめ
slug: mariadb
excerpt: MariaDBのインストール、基本操作、MySQLとの違い、エラー対応などの技術情報をまとめています。
updated: 2026-10-19
---

# MariaDB 技術まとめ

## 基礎

MySQL互換のオープンソースRDBMS。

### 主な用途

- MySQLの代替
- Webサービス
- Linuxディストリ標準のDB
- 業務システム

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[MariaDB 公式ドキュメント](https://mariadb.com/kb/en/)を参照してください。

## コマンド

### 接続

```
mariadb -u root -p mydb
```

### ユーザー作成と権限付与

```
CREATE USER 'app'@'%' IDENTIFIED BY 'password';
GRANT ALL ON mydb.* TO 'app'@'%';
```

### バックアップ

```
mariadb-dump -u root -p mydb > backup.sql
```

### 早見表：接続・確認

| 操作 | コマンド・構文 |
| --- | --- |
| 接続 | `mariadb -u root -p db` |
| バージョン | `SELECT VERSION();` |
| DB 一覧 | `SHOW DATABASES;` |
| テーブル一覧 | `SHOW TABLES;` |

### 早見表：サービス

| 操作 | コマンド・構文 |
| --- | --- |
| 起動 | `sudo systemctl start mariadb` |
| 自動起動 | `sudo systemctl enable mariadb` |
| 初期セキュリティ設定 | `sudo mariadb-secure-installation` |
| 状態確認 | `systemctl status mariadb` |

### 早見表：ユーザー・権限

| 操作 | コマンド・構文 |
| --- | --- |
| ユーザー作成 | `CREATE USER 'app'@'localhost' IDENTIFIED BY 'pass';` |
| 権限付与 | `GRANT ALL ON db.* TO 'app'@'localhost';` |
| 反映 | `FLUSH PRIVILEGES;` |
| ユーザー一覧 | `SELECT user, host FROM mysql.user;` |

### 早見表：バックアップ

| 操作 | コマンド・構文 |
| --- | --- |
| ダンプ | `mariadb-dump -u root -p db > backup.sql` |
| 全DB | `mariadb-dump -u root -p --all-databases > all.sql` |
| リストア | `mariadb -u root -p db < backup.sql` |
| 文字コード確認 | `SHOW VARIABLES LIKE 'character_set%';` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[MariaDB 公式ドキュメント](https://mariadb.com/kb/en/)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[MariaDB 公式ドキュメント](https://mariadb.com/kb/en/)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[MariaDB 公式ドキュメント](https://mariadb.com/kb/en/)を参照してください。

## 関連リンク

- [MariaDB 公式ドキュメント](https://mariadb.com/kb/en/)
