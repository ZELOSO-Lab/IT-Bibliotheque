---
title: Visual Studio 技術まとめ
slug: visual-studio
excerpt: Visual Studioのエディションとワークロード、インストールと初期設定、デバッグ・編集のショートカット、MSBuild・dotnet・NuGetのコマンド、.editorconfigなどの設定例、よくあるビルドエラーと対処、現場の実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# Visual Studio 技術まとめ

## 基礎

Visual Studio は、Microsoft の Windows 向け統合開発環境（IDE）です。C# / VB.NET による .NET アプリ、C++ のネイティブアプリ、ASP.NET の Web アプリなどを、**編集・ビルド・デバッグ・テスト・発行まで1つのツールで**行えます。日本の業務システム開発、特に Windows フォーム・WPF・ASP.NET の保守案件では今も標準的な開発環境です。

軽量エディタの **VS Code とは別製品**です。ソリューション（`.sln`）単位の大規模開発、強力なデバッガー、フォームデザイナーが必要なら Visual Studio を使います。

### 主な用途

- C# / .NET 開発（コンソール・Web API・バッチ）
- Windows アプリ（Windows フォーム・WPF）
- C++ 開発（Windows ネイティブ・DLL）
- デバッグ・プロファイリング（メモリ・CPU の調査）

### エディション

| エディション | 料金 | 注意点 |
| --- | --- | --- |
| Community | 無料 | 個人・学習・OSS 向け。**一定規模以上の企業では業務利用に制限**がある（ライセンス条項を必ず確認） |
| Professional | 有償（サブスクリプション） | 一般的な企業の業務開発 |
| Enterprise | 有償（サブスクリプション） | 高度なテスト・診断機能などを含む大規模開発向け |

### まず押さえる用語

| 用語 | 意味 | 現場での注意点 |
| --- | --- | --- |
| ソリューション（`.sln`） | 複数のプロジェクトをまとめる単位 | 開くのは基本的に `.sln`。プロジェクト単体で開くと参照が解決しないことがある |
| プロジェクト（`.csproj` / `.vcxproj`） | ビルドの単位。1プロジェクト＝1つの exe / dll | 中身は MSBuild の XML。直接編集もできる |
| ワークロード | インストールする機能のまとまり | 必要なワークロードが入っていないとプロジェクトが読み込めない |
| 構成（Debug / Release） | ビルド設定の組み合わせ | **本番に出すのは Release**。Debug は最適化なし |
| プラットフォーム（Any CPU / x86 / x64） | 対象 CPU | 32bit の DLL や Oracle クライアントを使う場合は x86 / x64 を揃える |
| ターゲットフレームワーク | `.NET Framework 4.8` / `net8.0` など | .NET Framework と .NET（旧 .NET Core）は別物。混同しない |
| NuGet | .NET のパッケージ管理 | パッケージの参照はプロジェクトファイルに記録される |
| ソリューション エクスプローラー | ファイル・参照を一覧するウィンドウ | 表示されていなければ `Ctrl+Alt+L` |

## 環境構築

### 1. Visual Studio Installer でインストール

1. 公式サイトからインストーラー（`VisualStudioSetup.exe`）をダウンロードして実行
2. 必要な**ワークロード**だけにチェックを入れる
3. 「言語パック」タブで日本語（必要なら英語も）を選ぶ
4. インストール後、Microsoft アカウント（または職場アカウント）でサインインする（有償版はライセンス認証のため）

| ワークロード（画面表示） | ワークロード ID | 用途 |
| --- | --- | --- |
| .NET デスクトップ開発 | `Microsoft.VisualStudio.Workload.ManagedDesktop` | Windows フォーム・WPF・コンソール |
| ASP.NET と Web 開発 | `Microsoft.VisualStudio.Workload.NetWeb` | ASP.NET Core・Web API |
| C++ によるデスクトップ開発 | `Microsoft.VisualStudio.Workload.NativeDesktop` | C++ の Windows アプリ・DLL |
| データの保存と処理 | `Microsoft.VisualStudio.Workload.Data` | SQL Server のデータベースプロジェクトなど |

後から機能を足すときは、スタートメニューの「Visual Studio Installer」→ 対象バージョンの「変更」から行います。

### 2. オフライン環境へのインストール（レイアウト作成）

インターネットに出られない開発端末向けには、ネットにつながる PC でインストール用ファイル一式（レイアウト）を作ります。

```bat
vs_professional.exe --layout C:\VSLayout ^
  --add Microsoft.VisualStudio.Workload.ManagedDesktop ^
  --add Microsoft.VisualStudio.Workload.NetWeb ^
  --includeRecommended --lang ja-JP
```

できたフォルダをコピーし、対象端末でフォルダ内のインストーラーを実行します。ブートストラッパー名（`vs_community.exe` / `vs_professional.exe` / `vs_enterprise.exe`）はエディションに合わせます。

### 3. 最初にやっておく設定

| 設定 | 場所 |
| --- | --- |
| 行番号を表示 | ツール → オプション → テキスト エディター → すべての言語 → 行番号 |
| 起動時の動作 | ツール → オプション → 環境 → スタートアップ |
| フォント・配色 | ツール → オプション → 環境 → フォントおよび色 |
| ショートカットの変更 | ツール → オプション → 環境 → キーボード |
| 設定のバックアップ | ツール → 設定のインポートとエクスポート |

### 4. 動作確認

1. 「新しいプロジェクトの作成」→「コンソール アプリ」（C#）を選ぶ
2. `Ctrl+F5` で実行し、`Hello, World!` が表示されれば OK
3. `Console.WriteLine` の行で `F9` を押してブレークポイントを置き、`F5` で止まることを確認する

## コマンド

### デバッグ

| 操作 | キー |
| --- | --- |
| デバッグ開始 / 続行 | `F5` |
| デバッグなしで実行 | `Ctrl+F5` |
| デバッグ停止 | `Shift+F5` |
| 再起動 | `Ctrl+Shift+F5` |
| ブレークポイントの設定 / 解除 | `F9` |
| すべてのブレークポイントを削除 | `Ctrl+Shift+F9` |
| ステップオーバー / ステップイン / ステップアウト | `F10` / `F11` / `Shift+F11` |
| カーソル行まで実行 | `Ctrl+F10` |
| プロセスにアタッチ | `Ctrl+Alt+P` |
| 例外設定 | `Ctrl+Alt+E` |
| イミディエイト ウィンドウ | `Ctrl+Alt+I` |

ブレークポイントの赤丸を右クリック →「条件」で、**特定の値のときだけ止める**・**止めずにログを出す（アクション）**設定ができます。

### 編集

| 操作 | キー |
| --- | --- |
| 選択行をコメント / 解除 | `Ctrl+K, Ctrl+C` / `Ctrl+K, Ctrl+U` |
| ドキュメントのフォーマット | `Ctrl+K, Ctrl+D` |
| 選択範囲のフォーマット | `Ctrl+K, Ctrl+F` |
| クイック アクション（using 追加など） | `Ctrl+.` |
| 名前の変更 | `Ctrl+R, Ctrl+R` |
| 行の複製 | `Ctrl+D` |
| 行の削除 | `Ctrl+Shift+L` |
| 行の移動 | `Alt+↑` / `Alt+↓` |
| 矩形選択 | `Alt+ドラッグ` / `Shift+Alt+矢印` |
| 一致する次の箇所にカーソル追加 | `Shift+Alt+.` |
| アウトラインの切り替え（すべて） | `Ctrl+M, Ctrl+L` |
| 定義に折りたたむ | `Ctrl+M, Ctrl+O` |
| IntelliSense の表示 | `Ctrl+Space` |

### 移動・検索

| 操作 | キー |
| --- | --- |
| 定義へ移動 / ピーク表示 | `F12` / `Alt+F12` |
| 実装へ移動 | `Ctrl+F12` |
| すべての参照を検索 | `Shift+F12` |
| どこでも検索（Go To All） | `Ctrl+T` |
| 機能の検索（メニュー・設定） | `Ctrl+Q` |
| ファイル内検索 / 置換 | `Ctrl+F` / `Ctrl+H` |
| ソリューション内検索 / 置換 | `Ctrl+Shift+F` / `Ctrl+Shift+H` |
| 前の位置に戻る / 進む | `Ctrl+-` / `Ctrl+Shift+-` |
| ソリューション エクスプローラー | `Ctrl+Alt+L` |
| 出力ウィンドウ | `Ctrl+Alt+O` |
| エラー一覧 | `Ctrl+\, Ctrl+E` |

`Ctrl+K, Ctrl+C` のような表記は「`Ctrl+K` を押してから `Ctrl+C`」の2段階操作です。

### ビルド

| 操作 | キー・メニュー |
| --- | --- |
| ソリューションのビルド | `Ctrl+Shift+B` |
| リビルド | ビルド → ソリューションのリビルド |
| クリーン | ビルド → ソリューションのクリーン |
| 構成の切り替え | ツールバーの「Debug / Release」 |
| 発行（publish） | プロジェクトを右クリック → 発行 |

### MSBuild（コマンドラインビルド）

スタートメニューの **「Developer Command Prompt for VS」** または **「Developer PowerShell for VS」** から実行すると、`msbuild` に PATH が通っています。

```bat
msbuild MySolution.sln /p:Configuration=Release
msbuild MySolution.sln /t:Rebuild /p:Configuration=Release /p:Platform=x64 /m
msbuild MySolution.sln /t:Restore
msbuild MyApp.csproj /p:Configuration=Release /v:minimal /fl /flp:logfile=build.log
```

| オプション | 意味 |
| --- | --- |
| `/t:Build` / `/t:Rebuild` / `/t:Clean` / `/t:Restore` | 実行するターゲット |
| `/p:Configuration=Release` | 構成 |
| `/p:Platform=x64` | プラットフォーム（ソリューションでは `"Any CPU"` のように空白を含むことがある） |
| `/m` | 並列ビルド |
| `/v:minimal` | ログの詳細度（`quiet` / `minimal` / `normal` / `detailed` / `diagnostic`） |
| `/fl /flp:logfile=build.log` | ログをファイルに出力 |

バッチから MSBuild の場所を探すには、Visual Studio に同梱の `vswhere.exe` を使います。

```bat
"%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" -latest -requires Microsoft.Component.MSBuild -find MSBuild\**\Bin\MSBuild.exe
```

### dotnet CLI（.NET / .NET Core 系のプロジェクト）

```bat
dotnet --list-sdks                       :: インストール済みSDK
dotnet new console -n MyApp              :: プロジェクト作成
dotnet build -c Release
dotnet run
dotnet test
dotnet publish -c Release -r win-x64 --self-contained false
dotnet add package Newtonsoft.Json
```

### NuGet（パッケージ マネージャー コンソール）

ツール → NuGet パッケージ マネージャー → パッケージ マネージャー コンソール で実行します。上部の「既定のプロジェクト」を確認してから実行します。

```powershell
Install-Package Newtonsoft.Json
Install-Package Newtonsoft.Json -Version 13.0.3
Update-Package Newtonsoft.Json
Uninstall-Package Newtonsoft.Json
Get-Package                       # 導入済みパッケージ
Update-Package -Reinstall         # 参照が壊れたときの再インストール
```

## サンプル

### .editorconfig（コードスタイルと文字コードの統一）

ソリューションのルートに置くと、Visual Studio が読み込んでフォーマットと警告に反映します。

```ini
root = true

[*]
charset = utf-8
end_of_line = crlf
insert_final_newline = true
trim_trailing_whitespace = true

[*.cs]
indent_style = space
indent_size = 4
csharp_new_line_before_open_brace = all
dotnet_sort_system_directives_first = true
csharp_style_var_for_built_in_types = false:suggestion
# 未使用の変数を警告に
dotnet_diagnostic.IDE0059.severity = warning
```

### Directory.Build.props（全プロジェクト共通の設定）

ソリューションフォルダに置くと、配下の SDK 形式プロジェクトすべてに適用されます。

```xml
<Project>
  <PropertyGroup>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
    <TreatWarningsAsErrors Condition="'$(Configuration)' == 'Release'">true</TreatWarningsAsErrors>
    <Company>Example Co., Ltd.</Company>
  </PropertyGroup>
</Project>
```

### launchSettings.json（デバッグ時の引数・環境変数）

`Properties/launchSettings.json` に記述します。プロジェクトのプロパティ →「デバッグ」→「デバッグ起動プロファイル UI を開く」からも編集できます。

```json
{
  "profiles": {
    "MyApp": {
      "commandName": "Project",
      "commandLineArgs": "--date 2026-10-01 --dry-run",
      "environmentVariables": {
        "DOTNET_ENVIRONMENT": "Development"
      }
    }
  }
}
```

### デバッグしやすいコードの例（C#）

```csharp
using System.Diagnostics;

public static class Program
{
    public static int Main(string[] args)
    {
        Debug.WriteLine("Debug ビルドのときだけ出力ウィンドウに出る");
        Trace.WriteLine("Release でも出力される");

#if DEBUG
        Console.WriteLine("Debug 構成でのみコンパイルされる");
#endif

        try
        {
            var count = int.Parse(args.Length > 0 ? args[0] : "10");
            Console.WriteLine($"count = {count}");
            return 0;
        }
        catch (FormatException ex)
        {
            // 例外発生時の値をウォッチ／ローカル ウィンドウで確認する
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }
}
```

### nuget.config（社内フィードやプロキシ）

ソリューションと同じフォルダに置くと、そのソリューションで使うパッケージソースを固定できます。

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <clear />
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
    <add key="company" value="https://nuget.example.co.jp/v3/index.json" />
  </packageSources>
  <config>
    <add key="http_proxy" value="http://proxy.example.co.jp:8080" />
  </config>
</configuration>
```

## エラー対応

| エラー・症状 | 主な原因 | 対処 |
| --- | --- | --- |
| `CS0246: 型または名前空間の名前 'X' が見つかりませんでした` | `using` 不足、NuGet パッケージ・プロジェクト参照の不足 | `Ctrl+.` で `using` を追加。パッケージを復元（ソリューションを右クリック →「NuGet パッケージの復元」） |
| `CS0103: 現在のコンテキストに 'X' という名前は存在しません` | 変数名の誤り、スコープ外、`#if` で除外されている | 宣言場所とスペル、構成（Debug / Release）を確認 |
| `MSB3027` / `MSB3021`（ファイルをコピーできない・別のプロセスで使用中） | 前回起動した exe が残っている、ウイルス対策ソフトのロック | タスクマネージャーで該当プロセスを終了。`bin` `obj` を削除してリビルド |
| `NETSDK1045`（現在の .NET SDK は対象の .NET をサポートしていない） | 必要なバージョンの SDK が未インストール | `dotnet --list-sdks` で確認し、該当 SDK を入れる。Visual Studio Installer で更新 |
| `NU1101`（パッケージが見つからない）/ `NU1301`（ソースを読み込めない） | パッケージ名の誤り、社内プロキシ、フィード設定 | `nuget.config` のソースとプロキシ設定を確認。ブラウザで `https://api.nuget.org/v3/index.json` が開けるか確認 |
| プロジェクトが「読み込まれていません」「サポートされていません」 | 必要なワークロード・ターゲットパックが入っていない | 右クリックで表示される理由を読み、Visual Studio Installer で不足分を追加 |
| `The breakpoint will not currently be hit. No symbols have been loaded for this document.`（ブレークポイントにヒットしない） | Release 構成、古い dll が実行されている、デバッグ対象プロセスが違う | Debug 構成でリビルド。デバッグ → ウィンドウ → モジュール でシンボルの読み込み状態を確認 |
| `LNK2019: 未解決の外部シンボル` | C++ でライブラリ（`.lib`）のリンク不足、宣言だけで実装がない | プロジェクトのプロパティ → リンカー → 入力 → 追加の依存ファイル を確認。x86 / x64 の不一致も確認 |
| `C1083: include ファイルを開けません。` | インクルードパスの設定不足 | プロパティ → C/C++ → 全般 → 追加のインクルード ディレクトリ を確認 |
| `BadImageFormatException`（実行時） | 32bit / 64bit の不一致（x86 の DLL を x64 で読み込むなど） | プラットフォームを揃える。「32 ビットを優先」の設定も確認 |
| ビルドは通るのに変更が反映されない／挙動がおかしい | `obj` の中間ファイルの不整合、`.vs` フォルダの破損 | Visual Studio を閉じて `bin` `obj` `.vs` を削除し、開き直してリビルド |

**ビルドエラーの読み方**

1. エラー一覧ではなく**出力ウィンドウ**（`Ctrl+Alt+O`）で、最初に出たエラーを見る。後続のエラーは連鎖であることが多い
2. エラーコード（`CS0246`、`MSB3027` など）で検索すると公式ドキュメントが見つかる
3. エラー一覧の「ビルドのみ」/「ビルド + IntelliSense」の切り替えで、IntelliSense だけの誤検知を除外する
4. 原因がわからないときは、ツール → オプション → プロジェクトおよびソリューション → ビルド/実行 で **MSBuild の出力の詳細度を「詳細」**にして再ビルドする

## 実務Tips

### 環境の差をなくす

- チーム内で **Visual Studio のバージョン・ワークロード・.NET SDK のバージョン**を揃える。`global.json` で SDK のバージョンを固定できる
- コードスタイルは個人のオプション設定ではなく **`.editorconfig` をリポジトリに入れて**共有する
- `.vs` `bin` `obj` `*.user` はGit（SVN）にコミットしない。Visual Studio 用の `.gitignore` テンプレートを使う
- ツール → 設定のインポートとエクスポート で `.vssettings` を書き出しておくと、PC 交換時に設定をすぐ戻せる

### デバッグを速くする

- 例外がどこで起きたかわからないときは、例外設定（`Ctrl+Alt+E`）で **Common Language Runtime Exceptions にチェック**を入れると、`catch` される前に止まる
- 長いループは**条件付きブレークポイント**で、問題のデータのときだけ止める
- 実行中のサービスや IIS 上の Web アプリは、**プロセスにアタッチ**（`Ctrl+Alt+P`）してデバッグできる
- データヒントのピン留めやウォッチ式で、毎回同じ変数を探す手間を減らす
- .NET ではホットリロードでデバッグ中にコードを修正できるが、変更できない種類の修正もある。反映されないときは再起動する

### リリース作業の注意点

- **本番に配置するのは必ず Release 構成**でビルドしたもの。Debug ビルドは遅く、`#if DEBUG` のコードが含まれる
- 配置物は Visual Studio の画面操作ではなく、`msbuild` / `dotnet publish` のコマンドで作り、手順書や CI に残す（誰がやっても同じ物ができる）
- 構成マネージャー（ビルド → 構成マネージャー）で、ソリューション構成とプロジェクトごとのプラットフォームが意図どおりか確認する
- 発行プロファイル（`.pubxml`）に接続先やパスワードを保存しない

### ライセンス・運用

- Community エディションは、組織の規模によって**業務利用できない**場合がある。会社で使う前にライセンス条項と社内ルールを確認する
- 有償版はサインインによるライセンス確認がある。長期間オフラインの端末ではライセンスの更新に注意する
- Visual Studio Installer の更新はプロジェクトの区切りで行う。リリース直前の更新は SDK やコンパイラの差分でトラブルの元になる

## 関連リンク

- [Visual Studio 公式ドキュメント](https://learn.microsoft.com/ja-jp/visualstudio/)
- [Visual Studio のダウンロード](https://visualstudio.microsoft.com/ja/downloads/)
- [Visual Studio のキーボード ショートカット](https://learn.microsoft.com/ja-jp/visualstudio/ide/default-keyboard-shortcuts-in-visual-studio)
- [MSBuild のドキュメント](https://learn.microsoft.com/ja-jp/visualstudio/msbuild/msbuild)
- [.NET のドキュメント](https://learn.microsoft.com/ja-jp/dotnet/)
- [NuGet のドキュメント](https://learn.microsoft.com/ja-jp/nuget/)
