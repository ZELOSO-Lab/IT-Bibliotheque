---
title: C# 技術まとめ
slug: csharp
excerpt: C#の基本文法、.NET開発環境、サンプルコード、エラー対応などの技術情報をまとめています。
updated: 2026-10-19
---

# C# 技術まとめ

## 基礎

.NETで動くオブジェクト指向言語。業務アプリやWindowsアプリで利用。

### 主な用途

- 業務アプリ
- Windowsアプリ
- Web API（ASP.NET Core）
- Unity

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[C# 公式ドキュメント](https://learn.microsoft.com/ja-jp/dotnet/csharp/)を参照してください。

## コマンド

### プロジェクト作成と実行

```
dotnet new console -n MyApp
cd MyApp
dotnet run
```

### LINQで絞り込み

```
var adults = users
    .Where(u => u.Age >= 20)
    .OrderBy(u => u.Name)
    .ToList();
```

### 非同期処理

```
var json = await httpClient.GetStringAsync(url);
```

### 早見表：dotnet CLI

| 操作 | コマンド・構文 |
| --- | --- |
| 新規作成 | `dotnet new console -n MyApp` |
| 実行 | `dotnet run` |
| ビルド | `dotnet build -c Release` |
| パッケージ追加 | `dotnet add package Newtonsoft.Json` |

### 早見表：基本構文

| 操作 | コマンド・構文 |
| --- | --- |
| 変数（型推論） | `var name = "Taro";` |
| 文字列補間 | `$"Hello {name}"` |
| null許容 | `string? s = null; var len = s?.Length ?? 0;` |
| foreach | `foreach (var x in list) { ... }` |

### 早見表：クラス

| 操作 | コマンド・構文 |
| --- | --- |
| プロパティ | `public string Name { get; set; }` |
| record | `public record User(int Id, string Name);` |
| コンストラクタ | `public User(int id) { Id = id; }` |
| インターフェース | `public interface IRepo { User Find(int id); }` |

### 早見表：LINQ

| 操作 | コマンド・構文 |
| --- | --- |
| 絞り込み | `list.Where(x => x.Age >= 20)` |
| 変換 | `list.Select(x => x.Name)` |
| 並べ替え | `list.OrderBy(x => x.Id)` |
| 先頭1件 | `list.FirstOrDefault(x => x.Id == id)` |

### 早見表：非同期・例外

| 操作 | コマンド・構文 |
| --- | --- |
| async/await | `var s = await client.GetStringAsync(url);` |
| try-catch | `try { ... } catch (IOException ex) { ... }` |
| using | `using var fs = File.OpenRead(path);` |
| ファイル読込 | `var text = File.ReadAllText(path);` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[C# 公式ドキュメント](https://learn.microsoft.com/ja-jp/dotnet/csharp/)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[C# 公式ドキュメント](https://learn.microsoft.com/ja-jp/dotnet/csharp/)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[C# 公式ドキュメント](https://learn.microsoft.com/ja-jp/dotnet/csharp/)を参照してください。

## 関連リンク

- [C# 公式ドキュメント](https://learn.microsoft.com/ja-jp/dotnet/csharp/)
