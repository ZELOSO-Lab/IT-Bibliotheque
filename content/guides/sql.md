---
title: SQL 技術まとめ
slug: sql
excerpt: SQLの基本構文、SELECT、JOIN、集計、サブクエリ、パフォーマンスなどの技術情報をまとめています。
updated: 2026-10-19
---

# SQL 技術まとめ

## 基礎

データベースを操作する問い合わせ言語。SELECT / JOIN / 集計など。

### 主な用途

- データ抽出
- 集計・レポート
- データ移行
- パフォーマンス調査

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。

## コマンド

### JOIN

```
SELECT o.id, c.name
FROM orders o
INNER JOIN customers c ON c.id = o.customer_id;
```

### グループ集計

```
SELECT category, COUNT(*), SUM(amount)
FROM sales
GROUP BY category
HAVING SUM(amount) > 10000;
```

### 更新前に件数確認

```
SELECT COUNT(*) FROM users WHERE status = 'old';
UPDATE users SET status = 'archived' WHERE status = 'old';
```

### 早見表：SELECT

| 操作 | コマンド・構文 |
| --- | --- |
| 基本 | `SELECT id, name FROM users WHERE age >= 20 ORDER BY name;` |
| 重複排除 | `SELECT DISTINCT dept FROM users;` |
| あいまい検索 | `WHERE name LIKE '%田%'` |
| 範囲・複数 | `WHERE price BETWEEN 100 AND 500   AND status IN ('A', 'B')` |

### 早見表：JOIN

| 操作 | コマンド・構文 |
| --- | --- |
| 内部結合 | `SELECT * FROM a INNER JOIN b ON b.a_id = a.id;` |
| 左外部結合 | `SELECT * FROM a LEFT JOIN b ON b.a_id = a.id;` |
| 存在チェック | `WHERE EXISTS (SELECT 1 FROM b WHERE b.a_id = a.id)` |
| 自己結合 | `FROM emp e JOIN emp m ON m.id = e.manager_id` |

### 早見表：集計

| 操作 | コマンド・構文 |
| --- | --- |
| 件数・合計 | `SELECT COUNT(*), SUM(amount), AVG(amount) FROM sales;` |
| グループ化 | `SELECT dept, COUNT(*) FROM users GROUP BY dept;` |
| 集計後の絞り込み | `GROUP BY dept HAVING COUNT(*) >= 5` |
| ウィンドウ関数 | `ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC)` |

### 早見表：更新系

| 操作 | コマンド・構文 |
| --- | --- |
| INSERT | `INSERT INTO users (id, name) VALUES (1, 'Taro');` |
| UPDATE | `UPDATE users SET name = 'Jiro' WHERE id = 1;` |
| DELETE | `DELETE FROM users WHERE id = 1;` |
| トランザクション | `BEGIN; ... COMMIT;  -- 失敗時 ROLLBACK;` |

### 早見表：定義（DDL）

| 操作 | コマンド・構文 |
| --- | --- |
| テーブル作成 | `CREATE TABLE users (   id INT PRIMARY KEY,   name VARCHAR(100) NOT NULL );` |
| 列追加 | `ALTER TABLE users ADD email VARCHAR(255);` |
| インデックス | `CREATE INDEX idx_users_name ON users(name);` |
| CASE 式 | `CASE WHEN score >= 80 THEN 'A' ELSE 'B' END` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。

## 関連リンク

> 関連リンクは現在準備中です。
