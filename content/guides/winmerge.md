---
title: WinMerge 技術まとめ
slug: winmerge
excerpt: WinMergeのファイル比較、フォルダ比較、マージ、フィルタ設定などの技術情報をまとめています。
updated: 2026-10-19
---

# WinMerge 技術まとめ

## 基礎

Windows用のファイル・フォルダ差分比較ツール。

### 主な用途

- ソースの差分確認
- フォルダ比較
- 設定ファイルの比較
- リリース前チェック

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[WinMerge 公式ドキュメント](https://winmerge.org/)を参照してください。

## コマンド

### コマンドラインで比較

```
WinMergeU.exe C:\old\file.txt C:\new\file.txt
```

### フォルダを再帰比較

```
WinMergeU.exe /r C:\old C:\new
```

### よく使うショートカット

```
Alt+↓ / Alt+↑  次 / 前の差分
Alt+→         右へコピー
Alt+←         左へコピー
```

### 早見表：起動

| 操作 | コマンド・構文 |
| --- | --- |
| ファイル比較 | `WinMergeU.exe a.txt b.txt` |
| フォルダ比較 | `WinMergeU.exe /r C:\old C:\new` |
| 片側読み取り専用 | `WinMergeU.exe /wl old.txt new.txt` |
| レポート出力 | `WinMergeU.exe /r old new /minimize /noninteractive /or report.html` |

### 早見表：差分移動

| 操作 | コマンド・構文 |
| --- | --- |
| 次の差分 | `Alt+↓` |
| 前の差分 | `Alt+↑` |
| 最初 / 最後 | `Alt+Home / Alt+End` |
| 再比較 | `F5` |

### 早見表：マージ

| 操作 | コマンド・構文 |
| --- | --- |
| 右へコピー | `Alt+→` |
| 左へコピー | `Alt+←` |
| すべて右へ | `マージ → すべて右へコピー` |
| 元に戻す | `Ctrl+Z` |

### 早見表：設定

| 操作 | コマンド・構文 |
| --- | --- |
| 空白を無視 | `編集 → 設定 → 比較 → 空白: 無視` |
| 大文字小文字無視 | `比較 → 大文字と小文字を区別しない` |
| 改行コード無視 | `比較 → 改行コードの違いを無視` |
| フィルタ | `ツール → フィルター（*.class などを除外）` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[WinMerge 公式ドキュメント](https://winmerge.org/)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[WinMerge 公式ドキュメント](https://winmerge.org/)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[WinMerge 公式ドキュメント](https://winmerge.org/)を参照してください。

## 関連リンク

- [WinMerge 公式ドキュメント](https://winmerge.org/)
