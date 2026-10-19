---
title: Oracle Database 技術まとめ
slug: oracle-database
excerpt: Oracle Databaseの基本操作、SQL*Plus、PL/SQL、エラー対応（ORA-）などの技術情報をまとめています。
updated: 2026-10-19
---

# Oracle Database 技術まとめ

## 基礎

エンタープライズ向けRDBMS。基幹システムで広く利用。

### 主な用途

- 基幹システム
- 大規模業務データ
- PL/SQLによるバッチ
- 高可用性構成

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[Oracle Database 公式ドキュメント](https://docs.oracle.com/en/database/)を参照してください。

## コマンド

### SQL*Plusで接続

```
sqlplus user/password@//host:1521/service_name
```

### テーブル一覧

```
SELECT table_name FROM user_tables ORDER BY table_name;
```

### 先頭N件の取得

```
SELECT * FROM orders ORDER BY created_at DESC
FETCH FIRST 10 ROWS ONLY;
```

### エラー番号の意味を調べる

```
oerr ora 00942
```

### 早見表：接続・SQL*Plus

| 操作 | コマンド・構文 |
| --- | --- |
| 接続 | `sqlplus user/pass@//host:1521/service` |
| 管理者で接続 | `sqlplus / as sysdba` |
| スクリプト実行 | `@script.sql` |
| 表示整形 | `SET LINESIZE 200 SET PAGESIZE 100` |

### 早見表：ディクショナリ

| 操作 | コマンド・構文 |
| --- | --- |
| テーブル一覧 | `SELECT table_name FROM user_tables;` |
| 列定義 | `DESC employees` |
| インデックス | `SELECT * FROM user_indexes WHERE table_name = 'EMP';` |
| セッション | `SELECT sid, serial#, username, status FROM v$session;` |

### 早見表：SQL（Oracle 特有）

| 操作 | コマンド・構文 |
| --- | --- |
| 先頭N件 | `SELECT * FROM t ORDER BY id FETCH FIRST 10 ROWS ONLY;` |
| NULL 置換 | `NVL(col, 0)` |
| 日付書式 | `TO_CHAR(SYSDATE, 'YYYY/MM/DD HH24:MI:SS')` |
| ダミー表 | `SELECT SYSDATE FROM dual;` |

### 早見表：PL/SQL

| 操作 | コマンド・構文 |
| --- | --- |
| 無名ブロック | `BEGIN   DBMS_OUTPUT.PUT_LINE('Hello'); END; /` |
| 出力を有効化 | `SET SERVEROUTPUT ON` |
| 例外処理 | `EXCEPTION WHEN NO_DATA_FOUND THEN ...` |
| コンパイルエラー確認 | `SHOW ERRORS` |

### 早見表：よくあるエラー

| 操作 | コマンド・構文 |
| --- | --- |
| ORA-00942 | `表またはビューが存在しない（権限・スキーマ名を確認）` |
| ORA-00001 | `一意制約違反（重複キー）` |
| ORA-01017 | `ユーザー名/パスワードが無効` |
| ORA-12541 | `リスナーが起動していない（lsnrctl status）` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[Oracle Database 公式ドキュメント](https://docs.oracle.com/en/database/)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[Oracle Database 公式ドキュメント](https://docs.oracle.com/en/database/)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[Oracle Database 公式ドキュメント](https://docs.oracle.com/en/database/)を参照してください。

## 関連リンク

- [Oracle Database 公式ドキュメント](https://docs.oracle.com/en/database/)
