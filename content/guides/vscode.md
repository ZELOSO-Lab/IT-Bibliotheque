---
title: VS Code 技術まとめ
slug: vscode
excerpt: Visual Studio Code（VS Code）の設定、拡張機能、ショートカット、デバッグなどの技術情報をまとめています。
updated: 2026-10-19
---

# VS Code 技術まとめ

## 基礎

Visual Studio Code。拡張機能が豊富な軽量コードエディタ。

### 主な用途

- コード編集
- デバッグ
- リモート開発（SSH / コンテナ）
- Git操作

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[VS Code 公式ドキュメント](https://code.visualstudio.com/docs)を参照してください。

## コマンド

### フォルダを開く

```
code .
```

### よく使うショートカット（Windows）

```
Ctrl+P        ファイルを開く
Ctrl+Shift+P  コマンドパレット
Ctrl+Shift+F  全体検索
Alt+Shift+F   フォーマット
```

### 拡張機能のインストール

```
code --install-extension esbenp.prettier-vscode
```

### 早見表：基本操作（Win / Mac）

| 操作 | コマンド・構文 |
| --- | --- |
| ファイルを開く | `Ctrl+P / Cmd+P` |
| コマンドパレット | `Ctrl+Shift+P / Cmd+Shift+P` |
| サイドバー切替 | `Ctrl+B / Cmd+B` |
| ターミナル | `` Ctrl+@ / Ctrl+` `` |

### 早見表：編集

| 操作 | コマンド・構文 |
| --- | --- |
| 行の複製 | `Shift+Alt+↓ / Shift+Option+↓` |
| 行の移動 | `Alt+↑↓ / Option+↑↓` |
| マルチカーソル | `Alt+クリック / Option+クリック` |
| 同じ語を選択追加 | `Ctrl+D / Cmd+D` |

### 早見表：検索・移動

| 操作 | コマンド・構文 |
| --- | --- |
| 全体検索 | `Ctrl+Shift+F / Cmd+Shift+F` |
| 定義へ移動 | `F12` |
| シンボル名変更 | `F2` |
| 行へ移動 | `Ctrl+G` |

### 早見表：CLI・設定

| 操作 | コマンド・構文 |
| --- | --- |
| フォルダを開く | `code .` |
| 差分表示 | `code --diff a.txt b.txt` |
| 拡張機能を入れる | `code --install-extension <id>` |
| 保存時に整形 | `"editor.formatOnSave": true` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[VS Code 公式ドキュメント](https://code.visualstudio.com/docs)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[VS Code 公式ドキュメント](https://code.visualstudio.com/docs)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[VS Code 公式ドキュメント](https://code.visualstudio.com/docs)を参照してください。

## 関連リンク

- [VS Code 公式ドキュメント](https://code.visualstudio.com/docs)
