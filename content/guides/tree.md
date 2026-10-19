---
title: tree 技術まとめ
slug: tree
excerpt: treeコマンドのオプション、Windows / Linuxでの使い方、出力例などの技術情報をまとめています。
updated: 2026-10-19
---

# tree 技術まとめ

## 基礎

ディレクトリ構成をツリー形式で表示するコマンド。

### 主な用途

- ディレクトリ構成の確認
- 資料用の構成図作成
- 納品物の確認
- README作成

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[tree 公式ドキュメント](https://learn.microsoft.com/ja-jp/windows-server/administration/windows-commands/tree)を参照してください。

## コマンド

### Windows: ファイルも表示

```
tree /F
```

### Windows: テキストに出力

```
tree /F /A > tree.txt
```

### Linux: 深さ指定・除外

```
tree -L 2 -I 'node_modules|dist'
```

### 早見表：Windows

| 操作 | コマンド・構文 |
| --- | --- |
| フォルダのみ | `tree` |
| ファイルも表示 | `tree /F` |
| ASCII 罫線 | `tree /F /A` |
| ファイルへ出力 | `tree /F /A > tree.txt` |

### 早見表：Linux / macOS

| 操作 | コマンド・構文 |
| --- | --- |
| 基本 | `tree` |
| 階層を制限 | `tree -L 2` |
| 除外 | `tree -I 'node_modules\|dist'` |
| 隠しファイルも | `tree -a` |

### 早見表：Linux オプション

| 操作 | コマンド・構文 |
| --- | --- |
| ディレクトリのみ | `tree -d` |
| サイズ表示 | `tree -h` |
| フルパス | `tree -f` |
| パターン一致のみ | `tree -P '*.ts'` |

### 早見表：インストール

| 操作 | コマンド・構文 |
| --- | --- |
| Ubuntu / Debian | `sudo apt install tree` |
| RHEL / CentOS | `sudo dnf install tree` |
| macOS | `brew install tree` |
| Markdown 用 | `tree -L 2 --charset=ascii` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[tree 公式ドキュメント](https://learn.microsoft.com/ja-jp/windows-server/administration/windows-commands/tree)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[tree 公式ドキュメント](https://learn.microsoft.com/ja-jp/windows-server/administration/windows-commands/tree)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[tree 公式ドキュメント](https://learn.microsoft.com/ja-jp/windows-server/administration/windows-commands/tree)を参照してください。

## 関連リンク

- [tree 公式ドキュメント](https://learn.microsoft.com/ja-jp/windows-server/administration/windows-commands/tree)
