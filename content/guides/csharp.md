---
title: C# 技術まとめ
slug: csharp
excerpt: C#と.NET / .NET Frameworkの違い、Visual Studio・.NET SDKの環境構築、dotnet CLIと基本構文・LINQの早見表、CSV集計・非同期HTTP・Web APIのサンプル、コンパイルエラーと例外の対処、業務アプリ開発の実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# C# 技術まとめ

## 基礎

C# は Microsoft が開発した、.NET 上で動くオブジェクト指向言語です。静的型付けで、LINQ（コレクションやDBへの問い合わせ構文）や async/await（非同期処理）が言語に組み込まれています。Windows の業務アプリから Web API、Linux 上のサービス、ゲーム（Unity）まで幅広く使われます。

### 主な用途

- 業務アプリ（Windows フォーム、WPF）
- Web アプリ・Web API（ASP.NET Core）
- バッチ・常駐サービス（Windows サービス、Linux のデーモン）
- ゲーム開発（Unity）

### .NET と .NET Framework の違い

現場で最初に確認すべきなのは、**対象が .NET（旧 .NET Core）か .NET Framework か**です。書ける C# のバージョンや使えるライブラリが変わります。

| 項目 | .NET（.NET 5 以降、旧 .NET Core） | .NET Framework |
| --- | --- | --- |
| 対応 OS | Windows / Linux / macOS | Windows のみ |
| 最新動向 | 毎年11月に新バージョン。新機能はこちらにのみ入る | 4.8.1 が最終。保守のみ |
| サポート | LTS（偶数バージョン、3年）と STS（奇数バージョン） | Windows の一部として提供・サポート |
| 主な用途 | 新規開発すべて | 既存システムの保守（ASP.NET Web Forms、WCF サーバーなどは .NET では使えない） |
| プロジェクト | SDK 形式の短い .csproj、dotnet CLI | 旧形式の .csproj、Visual Studio 中心 |

新規開発は **.NET の LTS 版**を選びます。.NET 8 のサポートは 2026年11月に終了するため、.NET 8 のシステムは .NET 10（LTS）への移行計画が必要です。

### まず押さえる用語

| 用語 | 意味 | 現場での注意点 |
| --- | --- | --- |
| SDK / ランタイム | 開発用ツール一式 / 実行に必要な環境 | 開発PCには SDK、サーバーにはランタイム（または自己完結型で配布） |
| ソリューション（.sln） / プロジェクト（.csproj） | 複数プロジェクトの束 / 1つのビルド単位 | プロジェクト参照の循環はできない |
| NuGet | パッケージ（ライブラリ）管理の仕組み | 社内プロキシ環境では nuget.org への接続設定が必要 |
| 名前空間（namespace） | クラスの分類 | `using` 忘れはコンパイルエラーの定番 |
| 値型 / 参照型 | `int` `struct` など / `class` `string` など | 参照型は null になりうる。null 許容参照型で警告を出せる |
| LINQ | `Where` `Select` などでデータを問い合わせる仕組み | 遅延実行。`ToList()` するまで実行されない |
| async / await | 非同期処理の構文 | `.Result` や `.Wait()` で待つと UI アプリはデッドロックする |

## 環境構築

### Windows（Visual Studio）

業務アプリ開発では Visual Studio（Community / Professional / Enterprise）が標準です。インストーラーで用途に応じたワークロードを選びます。

| ワークロード | 用途 |
| --- | --- |
| .NET デスクトップ開発 | Windows フォーム、WPF、コンソール |
| ASP.NET と Web 開発 | ASP.NET Core、Web API |
| Unity によるゲーム開発 | Unity |

Visual Studio Community は、個人・小規模組織・教育などの条件を満たす場合のみ無償で利用できます。企業での利用はライセンス条件を確認します。

### .NET SDK だけを入れる（VS Code・CI・Linux）

```powershell
# Windows（winget）
winget install Microsoft.DotNet.SDK.8
dotnet --info
```

```bash
# Ubuntu
sudo apt update
sudo apt install dotnet-sdk-8.0
dotnet --list-sdks
dotnet --list-runtimes
```

VS Code を使う場合は、拡張機能「C# Dev Kit」を入れます。

### 動作確認

```powershell
dotnet new console -n MyApp
cd MyApp
dotnet run
```

`Program.cs` には次の1行だけが生成されます（トップレベルステートメント。`Main` メソッドはコンパイラが自動生成します）。

```csharp
Console.WriteLine("Hello, World!");
```

複数の SDK が入っている環境では、`global.json` で使う SDK のバージョンを固定できます。

```powershell
dotnet new globaljson --sdk-version 8.0.100
```

## コマンド

### dotnet CLI

| 操作 | コマンド |
| --- | --- |
| テンプレート一覧 | `dotnet new list` |
| コンソール / クラスライブラリ / Web API | `dotnet new console -n MyApp` / `dotnet new classlib -n MyLib` / `dotnet new webapi -n MyApi` |
| テストプロジェクト | `dotnet new xunit -n MyApp.Tests` |
| ソリューション作成・追加 | `dotnet new sln -n MySolution` / `dotnet sln add MyApp/MyApp.csproj` |
| プロジェクト参照 | `dotnet add reference ../MyLib/MyLib.csproj` |
| パッケージ追加 | `dotnet add package Newtonsoft.Json` |
| 復元・ビルド | `dotnet restore` / `dotnet build -c Release` |
| 実行 / ファイル変更で自動再実行 | `dotnet run` / `dotnet watch run` |
| テスト | `dotnet test` |
| コード整形 | `dotnet format` |
| 発行（配布用） | `dotnet publish -c Release -r win-x64 --self-contained true` |
| 単一 exe で発行 | `dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true` |

`--self-contained true` はランタイムを同梱するため、**.NET が入っていないサーバーでも動きます**（その分サイズは大きくなります）。Linux 向けは `-r linux-x64` です。

### 早見表：基本構文

| 操作 | 構文 |
| --- | --- |
| 変数（型推論） | `var name = "Taro";` |
| 文字列補間 | `$"Hello {name}"`、書式付き `$"{price:N0}円"` |
| null 許容 | `string? s = null; var len = s?.Length ?? 0;` |
| foreach | `foreach (var x in list) { ... }` |
| switch 式 | `var label = code switch { 1 => "A", 2 => "B", _ => "?" };` |
| プロパティ | `public string Name { get; set; } = "";` |
| record | `public record User(int Id, string Name);` |
| インターフェース | `public interface IUserRepository { User? Find(int id); }` |
| 例外 | `try { ... } catch (IOException ex) { ... } finally { ... }` |
| using（自動破棄） | `using var fs = File.OpenRead(path);` |
| ファイル読込 | `var text = File.ReadAllText(path);` |

### 早見表：LINQ

| 操作 | 構文 |
| --- | --- |
| 絞り込み | `list.Where(x => x.Age >= 20)` |
| 変換 | `list.Select(x => x.Name)` |
| 並べ替え | `list.OrderBy(x => x.Dept).ThenByDescending(x => x.Age)` |
| 先頭1件（なければ null） | `list.FirstOrDefault(x => x.Id == id)` |
| 存在チェック | `list.Any(x => x.IsAdmin)` |
| 集計 | `list.Sum(x => x.Amount)` / `list.Count(x => x.Active)` |
| グループ化 | `list.GroupBy(x => x.Dept)` |
| 辞書に変換 | `list.ToDictionary(x => x.Id)` |

## サンプル

### CSV を部署別に集計する（コンソールアプリ）

```csharp
using System.Text;

var path = args.Length > 0 ? args[0] : "sales.csv";

var sales = File.ReadLines(path, Encoding.UTF8)
    .Skip(1)                                        // 見出し行を飛ばす
    .Where(line => !string.IsNullOrWhiteSpace(line))
    .Select(Sale.Parse)
    .ToList();

var byDept = sales
    .GroupBy(s => s.Dept)
    .Select(g => new { Dept = g.Key, Total = g.Sum(s => s.Amount), Count = g.Count() })
    .OrderByDescending(x => x.Total);

foreach (var x in byDept)
{
    Console.WriteLine($"{x.Dept,-6} {x.Total,10:N0}円 ({x.Count}件)");
}

record Sale(string Dept, string Item, int Amount)
{
    public static Sale Parse(string line)
    {
        var c = line.Split(',');
        if (c.Length != 3) throw new FormatException($"列数が不正です: {line}");
        return new Sale(c[0].Trim(), c[1].Trim(), int.Parse(c[2].Trim()));
    }
}
```

Excel が出力する Shift_JIS の CSV を読む場合、.NET（Core 系）では最初にエンコーディングプロバイダーの登録が必要です。

```csharp
Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
var sjis = Encoding.GetEncoding("shift_jis");
var lines = File.ReadLines(path, sjis);
```

### 非同期で Web API を呼ぶ

```csharp
using System.Net.Http.Json;

using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };

try
{
    var user = await http.GetFromJsonAsync<User>("https://api.example.com/users/1");
    Console.WriteLine(user is null ? "not found" : $"{user.Id}: {user.Name}");
}
catch (HttpRequestException ex)
{
    Console.Error.WriteLine($"HTTPエラー: {ex.StatusCode} {ex.Message}");
}
catch (TaskCanceledException)
{
    Console.Error.WriteLine("タイムアウトしました");
}

record User(int Id, string Name);
```

`HttpClient` を**リクエストのたびに new して破棄しない**のが重要です（ソケットが枯渇します）。アプリ全体で使い回すか、ASP.NET Core では `IHttpClientFactory` を使います。

### ASP.NET Core の最小 Web API

`dotnet new web -n MyApi` で作成したプロジェクトの `Program.cs` を次のように書き換えます。

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var users = new List<User> { new(1, "Sato"), new(2, "Suzuki") };

app.MapGet("/users", () => users);

app.MapGet("/users/{id:int}", (int id) =>
    users.FirstOrDefault(u => u.Id == id) is { } user
        ? Results.Ok(user)
        : Results.NotFound());

app.MapPost("/users", (User user) =>
{
    users.Add(user);
    return Results.Created($"/users/{user.Id}", user);
});

app.Run();

record User(int Id, string Name);
```

`dotnet run` で起動し、コンソールに表示された URL（`http://localhost:5xxx`）に `/users` を付けてアクセスします。

### Windows フォームで UI を固めない非同期処理

```csharp
private async void btnLoad_Click(object sender, EventArgs e)
{
    btnLoad.Enabled = false;
    try
    {
        // 重い処理は別スレッドで実行し、await の後は UI スレッドに戻る
        var count = await Task.Run(() => CountLines(@"C:\data\big.csv"));
        lblResult.Text = $"{count:N0} 行";
    }
    catch (Exception ex)
    {
        MessageBox.Show(ex.Message, "エラー", MessageBoxButtons.OK, MessageBoxIcon.Error);
    }
    finally
    {
        btnLoad.Enabled = true;
    }
}

private static int CountLines(string path) => File.ReadLines(path).Count();
```

`async void` はイベントハンドラーにだけ使います。それ以外のメソッドは `async Task` にします。

## エラー対応

### コンパイルエラー・警告

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `CS0103: The name 'xxx' does not exist in the current context`（名前 'xxx' は現在のコンテキストに存在しません） | 変数名の誤り、スコープ外の変数 | 綴り・大文字小文字・宣言位置を確認 |
| `CS0246: The type or namespace name 'Xxx' could not be found (are you missing a using directive or an assembly reference?)` | `using` 漏れ、NuGet パッケージやプロジェクト参照の不足 | `using` を追加。`dotnet add package` / `dotnet add reference` |
| `CS1061: 'Xxx' does not contain a definition for 'Yyy' ...` | メソッド名の誤り、拡張メソッドの `using`（`System.Linq` など）漏れ | 型とメソッド名を確認し、必要な `using` を追加 |
| `CS0029: Cannot implicitly convert type 'string' to 'int'` | 型の不一致 | `int.Parse` / `int.TryParse` などで変換 |
| `CS0120: An object reference is required for the non-static field, method, or property '...'` | static メソッドからインスタンスメンバーを呼んだ | インスタンスを作って呼ぶか、メンバーを static にする |
| `CS8618: Non-nullable property 'Name' must contain a non-null value when exiting constructor.` | null 許容参照型が有効で、初期化していない | `= "";` で初期化、`required` を付ける、または `string?` にする |
| `CS4014: Because this call is not awaited, execution of the current method continues before the call is completed.` | async メソッドを `await` せずに呼んだ | `await` を付ける。意図的なら `_ = DoAsync();` と明示 |
| `NETSDK1045: The current .NET SDK does not support targeting .NET X.0.` | 入っている SDK が古い | 対応する SDK をインストール。`global.json` の指定も確認 |
| `NU1101: Unable to find package Xxx. No packages exist with this id in source(s): nuget.org` | パッケージ名の誤り、プロキシで nuget.org に届かない、社内フィードの未設定 | パッケージ名を確認。`dotnet nuget list source` でソースを確認 |

### 実行時の例外

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `System.NullReferenceException: Object reference not set to an instance of an object.`（オブジェクト参照がオブジェクト インスタンスに設定されていません。） | null の変数のメンバーにアクセス | スタックトレースの行を確認。`?.` `??`、null 許容参照型の警告を活用 |
| `System.InvalidOperationException: Sequence contains no elements` | 空のシーケンスに `First()` / `Single()` / `Max()` | `FirstOrDefault()` を使い、null を判定する |
| `System.FormatException`（`Input string was not in a correct format.` など） | 数値・日付でない文字列を `Parse` した | `int.TryParse` / `DateTime.TryParseExact` を使う |
| `System.Collections.Generic.KeyNotFoundException: The given key 'xxx' was not present in the dictionary.` | 辞書に存在しないキーを参照 | `TryGetValue` を使う |
| `System.IO.IOException: The process cannot access the file '...' because it is being used by another process.`（別のプロセスで使用されているため…） | Excel などでファイルが開かれている、自分で閉じ忘れ | ファイルを閉じる。自分のコードは `using` で確実に破棄 |
| `System.InvalidOperationException: Cross-thread operation not valid: Control 'xxx' accessed from a thread other than the thread it was created on.`（有効ではないスレッド間の操作…） | 別スレッドから UI コントロールを操作した | `await` 後に UI を更新する、または `Invoke` を使う |
| `System.ArgumentException: 'Shift_JIS' is not a supported encoding name.` | .NET（Core 系）でコードページの登録をしていない | `Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);` を先に実行 |
| `You must install or update .NET to run this application.` | 実行環境に必要なランタイムがない | ランタイムをインストール、または自己完結型（`--self-contained`）で発行 |
| ボタンを押すと画面が固まる（例外なし） | UI スレッドで `.Result` / `.Wait()` を使いデッドロック | 呼び出し元から `async` / `await` に統一する |

## 実務Tips

### 設計・コーディング

- `.csproj` で `<Nullable>enable</Nullable>` を有効にし、null 関連の警告を潰しておく（新規テンプレートでは既定で有効）
- 金額は `double` ではなく `decimal` を使う
- 文字列の連結をループ内で大量に行う場合は `StringBuilder` を使う
- `IDisposable` なもの（ファイル、DB 接続、`Stream`）は `using` で必ず破棄する
- LINQ は**遅延実行**。同じクエリを何度も列挙すると、その度に DB アクセスやファイル読み込みが走る。必要なら `ToList()` で確定させる
- 例外は `catch (Exception)` で握りつぶさない。再スローするときは `throw ex;` ではなく `throw;`（スタックトレースが保持される）

### 非同期処理

- `async` は「末端から呼び出し元まで全部 async」にする（async all the way）。途中で `.Result` を挟まない
- ライブラリ側のコードでは `ConfigureAwait(false)` を検討する（UI スレッドへの不要な復帰を避ける）
- 長い処理には `CancellationToken` を受け取れるようにし、キャンセル・タイムアウトに対応する

### 保守・移行

- 既存の .NET Framework 資産は、まず「.NET Upgrade Assistant」で移行可否を調べる。Web Forms や WCF サーバーはそのまま移行できない
- NuGet パッケージのバージョンは定期的に更新し、`dotnet list package --vulnerable` で既知の脆弱性を確認する
- 設定値は `appsettings.json` と環境変数で管理し、接続文字列のパスワードはソースに書かない（開発時は User Secrets、本番は環境変数や Key Vault など）
- 文字コードは UTF-8 に統一する。既存の Shift_JIS ソースは Visual Studio で開くと文字化けしないか、変換前に必ず確認する

## 関連リンク

- [C# ドキュメント](https://learn.microsoft.com/ja-jp/dotnet/csharp/)
- [.NET ドキュメント](https://learn.microsoft.com/ja-jp/dotnet/)
- [dotnet CLI の概要](https://learn.microsoft.com/ja-jp/dotnet/core/tools/)
- [ASP.NET Core ドキュメント](https://learn.microsoft.com/ja-jp/aspnet/core/)
- [.NET のダウンロード](https://dotnet.microsoft.com/download)
- [NuGet Gallery](https://www.nuget.org/)
- [Visual Studio](https://visualstudio.microsoft.com/ja/)
