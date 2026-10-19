---
title: Microsoft Access 技術まとめ
slug: microsoft-access
excerpt: Microsoft Accessのテーブル、クエリ、フォーム、VBAなどの技術情報をまとめています。
updated: 2026-10-19
---

# Microsoft Access 技術まとめ

## 基礎

Officeのデスクトップデータベース。小規模な業務アプリで利用。

### 主な用途

- 部署内の業務ツール
- 小規模データ管理
- 帳票作成
- Excelからの移行

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[Microsoft Access 公式ドキュメント](https://support.microsoft.com/ja-jp/access)を参照してください。

## コマンド

### 選択クエリ

```
SELECT 顧客名, 売上 FROM 売上表 WHERE 売上 >= 10000;
```

### VBA: クエリ実行

```
CurrentDb.Execute "DELETE FROM 一時表", dbFailOnError
```

### VBA: フォームを開く

```
DoCmd.OpenForm "F_顧客一覧"
```

### 早見表：クエリ（SQL）

| 操作 | コマンド・構文 |
| --- | --- |
| 選択 | `SELECT * FROM 顧客 WHERE 都道府県 = "東京";` |
| パラメータ | `WHERE 日付 BETWEEN [開始日] AND [終了日]` |
| あいまい検索 | `WHERE 氏名 LIKE "*田*"` |
| NULL 置換 | `Nz([売上], 0)` |

### 早見表：関数

| 操作 | コマンド・構文 |
| --- | --- |
| 条件 | `IIf([点数] >= 80, "合格", "不合格")` |
| 日付書式 | `Format(Date(), "yyyy/mm/dd")` |
| 集計 | `DSum("金額", "売上", "顧客ID = 1")` |
| 検索 | `DLookup("氏名", "顧客", "ID = 1")` |

### 早見表：VBA

| 操作 | コマンド・構文 |
| --- | --- |
| フォームを開く | `DoCmd.OpenForm "F_顧客"` |
| クエリ実行 | `CurrentDb.Execute "DELETE FROM 一時表", dbFailOnError` |
| レコードセット | `Set rs = CurrentDb.OpenRecordset("顧客")` |
| 警告を止める | `DoCmd.SetWarnings False` |

### 早見表：メンテナンス

| 操作 | コマンド・構文 |
| --- | --- |
| 最適化/修復 | `ファイル → 情報 → データベースの最適化/修復` |
| 分割 | `データベースツール → Access データベース（フロント/バックエンド分割）` |
| リンクテーブル更新 | `外部データ → リンク テーブル マネージャー` |
| サイズ上限 | `1ファイル 2GB まで` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[Microsoft Access 公式ドキュメント](https://support.microsoft.com/ja-jp/access)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[Microsoft Access 公式ドキュメント](https://support.microsoft.com/ja-jp/access)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[Microsoft Access 公式ドキュメント](https://support.microsoft.com/ja-jp/access)を参照してください。

## 関連リンク

- [Microsoft Access 公式ドキュメント](https://support.microsoft.com/ja-jp/access)
