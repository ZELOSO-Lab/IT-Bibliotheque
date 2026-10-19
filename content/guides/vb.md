---
title: VB 技術まとめ
slug: vb
excerpt: VBA・VB.NET・VB6の違いと使い分け、Excel VBAとVB.NETの環境構築、VBEの操作とVBA・VB.NETの構文早見表、高速な集計マクロやフォルダ一括処理のサンプル、実行時エラー番号ごとの原因と対処、業務マクロを安全に保守する実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# VB 技術まとめ

## 基礎

VB（Visual Basic）は Microsoft の BASIC 系言語の総称です。現場で「VB」と言われたときは、**VBA（Office マクロ）・VB.NET・VB6 のどれを指すのか**を最初に確認します。文法は似ていますが、動く環境もできることも別物です。

### 主な用途

- Excel / Access の VBA マクロ（集計・帳票作成・定型作業の自動化）
- Windows フォームによる業務アプリ（VB.NET）
- 既存システムの保守（VB6・VB.NET で作られた社内システム）

### VBA・VB.NET・VB6 の違い

| 項目 | VBA | VB.NET | VB6 |
| --- | --- | --- | --- |
| 動く場所 | Excel・Access・Word などの Office アプリの中 | .NET / .NET Framework | VB6 ランタイム（Windows） |
| 開発環境 | Office 付属の VBE（Visual Basic Editor） | Visual Studio | Visual Basic 6.0（開発環境のサポートは終了済み） |
| 主な用途 | Office 操作の自動化 | 業務アプリ、ライブラリ | 古い業務アプリの保守 |
| エラー処理 | `On Error GoTo` | `Try ... Catch` | `On Error GoTo` |
| 配列の添字 | 既定は 0 始まり（`Option Base 1` で変更可）。セル範囲から読んだ配列は 1 始まり | 0 始まり | 既定は 0 始まり |
| 今後 | Office とともに継続 | サポートは継続。新しい言語機能の追加は基本的に行わない方針 | 新規開発には使わない |

### まず押さえる用語（VBA）

| 用語 | 意味 | 現場での注意点 |
| --- | --- | --- |
| VBE | VBA の編集画面（Excel で `Alt + F11`） | 標準モジュールにマクロを書く |
| 標準モジュール / シートモジュール | 汎用のコード置き場 / シートのイベント（`Worksheet_Change` など）を書く場所 | イベントを書く場所を間違えると動かない |
| オブジェクト | `Workbook` `Worksheet` `Range` など、操作対象 | `Set` を付けて代入する（`Set ws = ...`） |
| ThisWorkbook / ActiveWorkbook | マクロが書かれたブック / 今アクティブなブック | 他ブックを開くと ActiveWorkbook が変わる。基本は ThisWorkbook や変数で指定 |
| `.xlsm` | マクロ有効ブック | `.xlsx` で保存するとマクロは消える |
| 参照設定 | 外部ライブラリを使う設定（VBE の「ツール」→「参照設定」） | PC ごとにライブラリの有無が違うと「参照不可」になる |

## 環境構築

### Excel VBA

1. 「ファイル」→「オプション」→「リボンのユーザー設定」で「**開発**」にチェックを入れる
2. `Alt + F11` で VBE を開き、「挿入」→「標準モジュール」
3. VBE の「ツール」→「オプション」で「**変数の宣言を強制する**」にチェック（新しいモジュールの先頭に `Option Explicit` が自動で入る）
4. ブックは `.xlsm`（マクロ有効ブック）で保存する

動作確認として次のマクロを書き、カーソルを中に置いて `F5` で実行します。

```vb
Option Explicit

Sub Hello()
    Worksheets("Sheet1").Range("A1").Value = "Hello"
    MsgBox "完了しました"
End Sub
```

### マクロが実行できないとき

- インターネットやメールから入手したファイルは、マクロがブロックされることがある。ファイルを右クリック→「プロパティ」→「**許可する**」にチェックを入れて開き直す
- 社内で配布するマクロは、「トラスト センター」→「**信頼できる場所**」に登録したフォルダに置く運用が確実
- マクロの設定（「ファイル」→「オプション」→「トラスト センター」→「トラスト センターの設定」）は、会社のポリシーで固定されていることが多い。勝手に変更せず情報システム部門に確認する

### VB.NET

Visual Studio のインストーラーで「**.NET デスクトップ開発**」ワークロードを選び、新規プロジェクトで言語に「Visual Basic」を選びます。.NET SDK だけでもコマンドで作成できます。

```powershell
dotnet new console -lang VB -n MyApp
cd MyApp
dotnet run

dotnet new winforms -lang VB -n MyFormsApp   # Windows フォーム（Windows のみ）
```

## コマンド

### VBE のショートカット

| 操作 | キー |
| --- | --- |
| VBE を開く / Excel に戻る | `Alt + F11` |
| マクロの一覧から実行（Excel 画面） | `Alt + F8` |
| 実行 / 中断 | `F5` / `Ctrl + Break` |
| 1行ずつ実行（ステップイン） | `F8` |
| ブレークポイントの設定・解除 | `F9` |
| イミディエイト ウィンドウ | `Ctrl + G`（`Debug.Print` の出力先。`?Range("A1").Value` で値の確認も可） |
| 入力候補を表示 | `Ctrl + Space` |
| 定義へ移動 | `Shift + F2` |

### 早見表：VBA 基本

| 操作 | 構文 |
| --- | --- |
| 変数宣言 | `Dim i As Long, s As String` |
| オブジェクト代入 | `Set ws = ThisWorkbook.Worksheets("Sheet1")` |
| メッセージ | `MsgBox "完了しました"` |
| 確認ダイアログ | `If MsgBox("実行しますか？", vbYesNo) = vbNo Then Exit Sub` |
| If | `If x > 0 Then ... ElseIf x = 0 Then ... Else ... End If` |
| For | `For i = 1 To 10 ... Next i` |
| For Each | `For Each c In ws.Range("A1:A10") ... Next c` |
| Do While | `Do While i < 10 ... Loop` |
| Select Case | `Select Case n ... Case 1 ... Case Else ... End Select` |
| 文字列連結 | `s = "合計: " & total` |
| 関数 | `Function Add(a As Long, b As Long) As Long ... Add = a + b ... End Function` |

`Dim a, b As Long` と書くと、**`a` は Long ではなく Variant** になります。1つずつ `As` を付けます。

### 早見表：Excel 操作

| 操作 | 構文 |
| --- | --- |
| セルに書き込む | `ws.Range("A1").Value = 100` / `ws.Cells(1, 1).Value = 100` |
| 最終行 | `lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row` |
| 範囲を配列に読む | `data = ws.Range("A2:C100").Value`（1始まりの2次元配列） |
| 配列を範囲に書く | `ws.Range("A2").Resize(UBound(data, 1), UBound(data, 2)).Value = data` |
| シートを追加 | `Set ws = Worksheets.Add(After:=Worksheets(Worksheets.Count))` |
| ブックを開く・閉じる | `Set wb = Workbooks.Open(path, ReadOnly:=True)` / `wb.Close SaveChanges:=False` |
| 画面更新停止 | `Application.ScreenUpdating = False` |
| 確認メッセージ抑止 | `Application.DisplayAlerts = False` |
| 自動計算を止める | `Application.Calculation = xlCalculationManual` |

### 早見表：エラー処理

| 操作 | 構文 |
| --- | --- |
| VBA: エラー時にジャンプ | `On Error GoTo ErrHandler` |
| VBA: エラー内容 | `Err.Number` / `Err.Description` |
| VBA: エラーを無視 | `On Error Resume Next`（直後に `Err.Number` を確認） |
| VBA: 無視を解除 | `On Error GoTo 0` |
| VB.NET: 例外処理 | `Try ... Catch ex As IOException ... Finally ... End Try` |
| VB.NET: 自動破棄 | `Using sr As New StreamReader(path) ... End Using` |

### 早見表：VB.NET 基本

| 操作 | 構文 |
| --- | --- |
| 変数 | `Dim name As String = "Taro"` |
| 型推論 | `Dim list = New List(Of String)()` |
| 文字列補間 | `$"Hello {name}"` |
| For Each | `For Each x In list ... Next` |
| 関数 | `Function Add(a As Integer, b As Integer) As Integer ... Return a + b ... End Function` |
| ラムダ・LINQ | `list.Where(Function(x) x.Age >= 20).ToList()` |
| 短絡評価 | `If a IsNot Nothing AndAlso a.Count > 0 Then` |
| 三項演算 | `Dim s = If(flag, "Yes", "No")` |

VB.NET の `And` / `Or` は**両辺を必ず評価**します。null チェックと組み合わせるときは `AndAlso` / `OrElse` を使います。

## サンプル

### 部署別に集計する（配列＋Dictionary で高速化）

セルを1つずつ読み書きすると遅いため、**範囲をまとめて配列に読み込み、結果もまとめて書き出す**のが基本です。

```vb
Option Explicit

' 「売上」シート（A:部署, B:品目, C:金額、1行目は見出し）を部署別に合計し、「集計」シートへ出力する
Sub SumByDept()
    Dim ws As Worksheet, outWs As Worksheet
    Dim data As Variant, result() As Variant
    Dim dict As Object, k As Variant
    Dim lastRow As Long, i As Long, r As Long

    Set ws = ThisWorkbook.Worksheets("売上")
    lastRow = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row
    If lastRow < 2 Then
        MsgBox "データがありません", vbExclamation
        Exit Sub
    End If

    data = ws.Range("A2:C" & lastRow).Value           ' 2次元配列（1始まり）

    Set dict = CreateObject("Scripting.Dictionary")
    For i = 1 To UBound(data, 1)
        If IsNumeric(data(i, 3)) Then
            dict(CStr(data(i, 1))) = dict(CStr(data(i, 1))) + CDbl(data(i, 3))
        End If
    Next i

    ReDim result(1 To dict.Count, 1 To 2)
    r = 1
    For Each k In dict.Keys
        result(r, 1) = k
        result(r, 2) = dict(k)
        r = r + 1
    Next k

    Set outWs = ThisWorkbook.Worksheets("集計")
    outWs.Cells.ClearContents
    outWs.Range("A1:B1").Value = Array("部署", "合計")
    outWs.Range("A2").Resize(dict.Count, 2).Value = result

    MsgBox dict.Count & " 部署を集計しました", vbInformation
End Sub
```

### フォルダ内のブックを順に処理する（エラー処理と後始末）

```vb
Option Explicit

Sub ProcessFolder()
    Dim folder As String, fileName As String
    Dim wb As Workbook

    On Error GoTo ErrHandler
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False

    folder = ThisWorkbook.Path & "\input\"
    fileName = Dir(folder & "*.xlsx")
    Do While fileName <> ""
        Set wb = Workbooks.Open(folder & fileName, ReadOnly:=True)
        Debug.Print fileName, wb.Worksheets(1).Range("A1").Value
        wb.Close SaveChanges:=False
        Set wb = Nothing
        fileName = Dir()                                ' 次のファイル
    Loop

CleanUp:
    Application.ScreenUpdating = True                   ' 必ず元に戻す
    Application.DisplayAlerts = True
    Exit Sub

ErrHandler:
    MsgBox "エラー " & Err.Number & ": " & Err.Description & vbCrLf & fileName, vbExclamation
    If Not wb Is Nothing Then wb.Close SaveChanges:=False
    Resume CleanUp
End Sub
```

`ScreenUpdating` などを変更したマクロは、**エラーで止まった場合も元に戻るように**後始末を1か所にまとめます。

### VB.NET: CSV を集計するコンソールアプリ

```vb
Option Strict On
Option Explicit On

Imports System.IO
Imports System.Linq
Imports System.Text

Module Program
    Sub Main(args As String())
        Dim csvPath = If(args.Length > 0, args(0), "sales.csv")
        Try
            Dim totals As New Dictionary(Of String, Integer)
            For Each line In File.ReadLines(csvPath, Encoding.UTF8).Skip(1)
                If String.IsNullOrWhiteSpace(line) Then Continue For
                Dim cols = line.Split(","c)
                Dim amount As Integer
                If cols.Length <> 3 OrElse Not Integer.TryParse(cols(2), amount) Then
                    Console.Error.WriteLine($"スキップ: {line}")
                    Continue For
                End If
                Dim dept = cols(0).Trim()
                Dim current As Integer
                totals.TryGetValue(dept, current)
                totals(dept) = current + amount
            Next

            For Each kv In totals.OrderByDescending(Function(x) x.Value)
                Console.WriteLine($"{kv.Key,-6} {kv.Value,10:N0}円")
            Next
        Catch ex As FileNotFoundException
            Console.Error.WriteLine($"ファイルがありません: {ex.FileName}")
        End Try
    End Sub
End Module
```

VB.NET は**大文字小文字を区別しません**。`path` という変数名は `System.IO.Path` クラスと紛らわしいため避けています。

## エラー対応

### VBA の実行時エラー

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `実行時エラー '9': インデックスが有効範囲にありません。` | シート名・ブック名の誤り（全角半角・空白）、配列の範囲外 | シート名を確認。配列は `LBound` / `UBound` で範囲を確認 |
| `実行時エラー '13': 型が一致しません。` | 数値の変数に文字列や空白、エラー値（`#N/A`）を代入 | `IsNumeric` / `IsError` で事前にチェック |
| `実行時エラー '91': オブジェクト変数または With ブロック変数が設定されていません。` | `Set` の付け忘れ、`Find` で見つからず Nothing | `Set` を付ける。`If Not rng Is Nothing Then` で判定 |
| `実行時エラー '1004': アプリケーション定義またはオブジェクト定義のエラーです。` | 範囲指定の誤り（行0など）、シート修飾なしの `Cells` が別シートを指す、保護されたシートへの書き込み | `ws.Range(ws.Cells(1, 1), ws.Cells(2, 2))` のように**すべてシートで修飾**する |
| `実行時エラー '6': オーバーフローしました。` | `Integer`（上限 32,767）に大きな値を代入 | 行番号などは `Long` を使う |
| `実行時エラー '11': 0 で除算しました。` | 割る数が 0 または空セル | 割る前に 0 をチェック |
| `実行時エラー '424': オブジェクトが必要です。` | オブジェクトでない値に `Set`、変数名の誤り | `Option Explicit` で変数名の誤りを検出 |
| `実行時エラー '53': ファイルが見つかりません。` | パスの誤り、`\` の付け忘れ | `Dir(path) <> ""` で存在確認してから処理 |
| `実行時エラー '429': ActiveX コンポーネントはオブジェクトを作成できません。` | `CreateObject` の対象が PC に入っていない・登録されていない | 対象ソフト・ライブラリの有無を確認。Mac では `Scripting.Dictionary` は使えない |

### VBA のコンパイルエラー

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `コンパイル エラー: 変数が定義されていません。` | `Option Explicit` 下で未宣言の変数（多くは綴り間違い） | `Dim` で宣言する。綴りを確認 |
| `コンパイル エラー: Sub または Function が定義されていません。` | プロシージャ名の誤り、参照設定の不足 | 名前を確認。参照設定に「参照不可」がないか確認 |
| `コンパイル エラー: プロジェクトまたはライブラリが見つかりません。` | 参照設定のライブラリが PC にない（Office のバージョン違いなど） | 「ツール」→「参照設定」で「参照不可:」の項目を外す。配布するマクロは `CreateObject` の遅延バインディングにする |
| `コンパイル エラー: ブロック If に対応する End If がありません。` | `End If` の不足、インデントの崩れ | インデントを揃えて対応を確認 |
| 64ビット版 Office で `Declare` 文がコンパイルエラーになる | Windows API の宣言が32ビット版 Office 用のまま | `Declare PtrSafe` に変更し、ポインタやハンドルの型を `LongPtr` にする |
| マクロ実行時に「セキュリティ リスク」の赤いバーが出て実行できない | インターネットから入手したファイル（MOTW 付き）のマクロがブロックされた | ファイルのプロパティで「許可する」にチェック、または信頼できる場所に置く |

### VB.NET

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `BC30451: 'xxx' is not declared. It may be inaccessible due to its protection level.` | 変数名の誤り、スコープ外、`Imports` 漏れ | 綴り・宣言位置・`Imports` を確認 |
| `BC30002: Type 'Xxx' is not defined.` | 名前空間の `Imports` 漏れ、参照・NuGet パッケージ不足 | `Imports` を追加、参照を追加 |
| `BC30512: Option Strict On disallows implicit conversions from 'String' to 'Integer'.` | 暗黙の型変換 | `Integer.Parse` / `Integer.TryParse` / `CInt` で明示的に変換 |
| `BC42104: Variable 'xxx' is used before it has been assigned a value.` | 初期化前の変数の使用（警告） | 宣言時に初期値を代入する |
| `System.NullReferenceException: Object reference not set to an instance of an object.` | `Nothing` のオブジェクトのメンバーにアクセス | `IsNot Nothing` で判定。`New` の付け忘れを確認 |

## 実務Tips

### VBA を壊れにくく書く

- すべてのモジュールの先頭に **`Option Explicit`**。綴り間違いによるバグの大半を防げる
- `Select` / `Activate` を使わず、`ws.Range("A1").Value = ...` のように**オブジェクトを変数で直接指定**する（マクロの記録で生成されたコードは書き直す）
- 整数は `Integer` ではなく `Long` を使う（行数が 32,767 を超えるとオーバーフローする）
- 大量データは**配列で一括読み書き**し、`ScreenUpdating = False` と `Calculation = xlCalculationManual` を併用する。終了時とエラー時に必ず元に戻す
- `On Error Resume Next` は必要な1行だけを囲み、直後に `On Error GoTo 0` で戻す。マクロ全体に掛けると不具合を見逃す
- 最終行の取得は `End(xlUp)` が定番。`UsedRange` は書式だけが残った行も含むため、想定より大きくなることがある

### 配布・保守

- 参照設定（事前バインディング）は開発中は補完が効いて便利だが、配布先の Office のバージョン違いで「参照不可」になりやすい。配布版は `CreateObject` の遅延バインディングにする
- `ThisWorkbook.Path` は、OneDrive / SharePoint 同期フォルダ上では `https://...` の URL を返すことがある。ファイル操作の基準パスはシートに設定欄を設けるなどして明示する
- マクロ付きブックは壊れることがある。モジュールをエクスポート（`.bas` / `.cls`）して、ソースをバージョン管理しておく
- VBScript（`.vbs`）は Microsoft が非推奨化を発表している。新しい自動化には PowerShell を使う
- VBA のパスワード保護は強固なセキュリティではない。機密情報や接続パスワードをコードに書かない

### VB.NET

- プロジェクト設定で **`Option Strict On`** を既定にする。暗黙の型変換による実行時エラーをコンパイル時に検出できる
- VB6 からの移行コードに残りがちな `On Error GoTo` は、`Try ... Catch` に書き換える
- C# と同じ .NET のライブラリが使えるため、新しいライブラリのサンプルが C# しかなくても読み替えられる。新規開発の言語選定では、将来の保守要員の確保も考えて C# も検討する
- 文字列の比較は `=` で可能だが、`Option Compare Text` の設定で大文字小文字の扱いが変わる。プロジェクトで統一する

## 関連リンク

- [Visual Basic ドキュメント（.NET）](https://learn.microsoft.com/ja-jp/dotnet/visual-basic/)
- [Office VBA リファレンス](https://learn.microsoft.com/ja-jp/office/vba/api/overview/)
- [Excel VBA リファレンス](https://learn.microsoft.com/ja-jp/office/vba/api/overview/excel)
- [VBA 言語リファレンス](https://learn.microsoft.com/ja-jp/office/vba/api/overview/language-reference)
- [.NET ドキュメント](https://learn.microsoft.com/ja-jp/dotnet/)
- [Visual Studio](https://visualstudio.microsoft.com/ja/)
