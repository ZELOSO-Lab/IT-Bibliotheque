---
title: Visual Studio 技術まとめ
slug: visual-studio
excerpt: Visual Studioのインストール、プロジェクト作成、デバッグ、ビルドエラー対応などの技術情報をまとめています。
updated: 2026-10-19
---

# Visual Studio 技術まとめ

## 基礎

Microsoftの統合開発環境（IDE）。C# / .NET開発で利用。

### 主な用途

- C# / .NET開発
- Windowsアプリ
- C++開発
- デバッグ・プロファイリング

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[Visual Studio 公式ドキュメント](https://learn.microsoft.com/ja-jp/visualstudio/)を参照してください。

## コマンド

### よく使うショートカット

```
F5            デバッグ開始
Ctrl+F5       デバッグなしで実行
F9            ブレークポイント
Ctrl+Shift+B  ビルド
```

### NuGetパッケージ追加（PMC）

```
Install-Package Newtonsoft.Json
```

### コマンドラインでビルド

```
msbuild MySolution.sln /p:Configuration=Release
```

### 早見表：デバッグ

| 操作 | コマンド・構文 |
| --- | --- |
| デバッグ開始 | `F5` |
| デバッグなし実行 | `Ctrl+F5` |
| ステップオーバー / イン | `F10 / F11` |
| ブレークポイント | `F9` |

### 早見表：編集

| 操作 | コマンド・構文 |
| --- | --- |
| コメント | `Ctrl+K, Ctrl+C（解除 Ctrl+K, Ctrl+U）` |
| 整形 | `Ctrl+K, Ctrl+D` |
| クイック修正 | `Ctrl+.` |
| 名前の変更 | `Ctrl+R, Ctrl+R` |

### 早見表：移動・検索

| 操作 | コマンド・構文 |
| --- | --- |
| 定義へ移動 | `F12` |
| すべての参照 | `Shift+F12` |
| どこでも検索 | `Ctrl+T` |
| ソリューション内検索 | `Ctrl+Shift+F` |

### 早見表：ビルド・パッケージ

| 操作 | コマンド・構文 |
| --- | --- |
| ソリューションのビルド | `Ctrl+Shift+B` |
| NuGet（PMC） | `Install-Package Newtonsoft.Json` |
| コマンドラインビルド | `msbuild App.sln /p:Configuration=Release` |
| 出力ウィンドウ | `Ctrl+Alt+O` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[Visual Studio 公式ドキュメント](https://learn.microsoft.com/ja-jp/visualstudio/)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[Visual Studio 公式ドキュメント](https://learn.microsoft.com/ja-jp/visualstudio/)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[Visual Studio 公式ドキュメント](https://learn.microsoft.com/ja-jp/visualstudio/)を参照してください。

## 関連リンク

- [Visual Studio 公式ドキュメント](https://learn.microsoft.com/ja-jp/visualstudio/)
