---
title: SQLite 技術まとめ
slug: sqlite
excerpt: SQLiteの基本操作、CLI、アプリへの組込み、注意点などの技術情報をまとめています。
updated: 2026-10-19
---

# SQLite 技術まとめ

## 基礎

ファイル1つで動く軽量な組込みデータベース。

### 主な用途

- スマホ・デスクトップアプリ
- テスト用DB
- 小規模Webアプリ
- ローカルデータ保存

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[SQLite 公式ドキュメント](https://www.sqlite.org/docs.html)を参照してください。

## コマンド

### DBを開く

```
sqlite3 app.db
```

### テーブル一覧・定義

```
.tables
.schema users
```

### CSVを取り込む

```
.mode csv
.import data.csv users
```

### 早見表：CLI

| 操作 | コマンド・構文 |
| --- | --- |
| 開く・作成 | `sqlite3 app.db` |
| テーブル一覧 | `.tables` |
| 定義表示 | `.schema users` |
| 終了 | `.quit` |

### 早見表：表示設定

| 操作 | コマンド・構文 |
| --- | --- |
| 見出し表示 | `.headers on` |
| 表形式 | `.mode table` |
| CSV 取込 | `.mode csv .import data.csv users` |
| 結果をファイルへ | `.output result.txt` |

### 早見表：SQL

| 操作 | コマンド・構文 |
| --- | --- |
| テーブル作成 | `CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);` |
| 自動採番 | `INTEGER PRIMARY KEY は ROWID の別名` |
| UPSERT | `INSERT INTO t ... ON CONFLICT(id) DO UPDATE SET name = excluded.name;` |
| 日時 | `datetime('now', 'localtime')` |

### 早見表：運用

| 操作 | コマンド・構文 |
| --- | --- |
| バックアップ | `.backup backup.db` |
| ダンプ | `sqlite3 app.db .dump > dump.sql` |
| 最適化 | `VACUUM;` |
| 外部キー有効化 | `PRAGMA foreign_keys = ON;` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[SQLite 公式ドキュメント](https://www.sqlite.org/docs.html)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[SQLite 公式ドキュメント](https://www.sqlite.org/docs.html)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[SQLite 公式ドキュメント](https://www.sqlite.org/docs.html)を参照してください。

## 関連リンク

- [SQLite 公式ドキュメント](https://www.sqlite.org/docs.html)
