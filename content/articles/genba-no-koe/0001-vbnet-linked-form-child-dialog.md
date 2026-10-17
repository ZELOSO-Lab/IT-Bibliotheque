---
series: 現場の声
no: 0001
title: 【VB.NET】「リンクとして追加」された既存画面に子画面を足したら他プロジェクトが全滅した話と、正しい追加手順
slug: vbnet-linked-form-add-child-dialog
category: Visual Studio / VB.NET
tags: [VB.NET, Visual Studio, Windows Forms, partial class, リンクとして追加, Designer.vb, ShowDialog]
excerpt: 既存ソリューションで、別フォルダから「リンクとして追加」されている画面に子画面を追加するときのハマりどころ8つと、事故らない追加手順をまとめました。
status: draft
created: 2026-10-12
---

# 【VB.NET】「リンクとして追加」された既存画面に子画面を足したら他プロジェクトが全滅した話と、正しい追加手順

## 現場の声

> 「既存画面から開く子画面を1枚追加するだけの簡単な改修です」
>
> そう言われて着手した案件でした。ところが既存画面の .vb ファイルは、プロジェクトのフォルダに実体がなく、**別フォルダから“リンク”で参照されているだけ**。しかも画面のレイアウト（Designer.vb）と処理（メソッド）が別ファイルに分かれていて、どこに何を足せばいいのか分からない。
>
> とりあえず自分のプロジェクトに子画面を追加し、親画面のボタンから呼ぶ1行を書いたら、自分のプロジェクトはビルドが通りました。ところが翌朝、**同じ親画面をリンクしている別プロジェクトがビルドエラーで全滅**していました。

この記事では、同じ状況で詰まりやすいポイントと、事故らない追加手順を順番に整理します。

## 前提の構成

よくある構成を例にします。

```text
C:\src\Sales\
├─ Sales.sln
├─ Common\                      ← 共通画面の「実体」がある場所（プロジェクトではないただのフォルダ）
│   └─ Forms\
│       ├─ CustomerForm.vb            … イベントハンドラなど（Partial Class）
│       ├─ CustomerForm.Designer.vb   … 画面レイアウト（自動生成 / Partial Class）
│       ├─ CustomerForm.Logic.vb      … 業務メソッドを分けたファイル（Partial Class）
│       └─ CustomerForm.resx
├─ SalesApp\                    ← プロジェクトA（Common の画面を「リンクとして追加」）
│   └─ SalesApp.vbproj
└─ SalesAdmin\                  ← プロジェクトB（同じ画面をリンクで共有）
    └─ SalesAdmin.vbproj
```

- 対象は .NET Framework の Windows Forms（旧形式の .vbproj）です。SDK形式（.NET 6 以降）との違いは最後に補足します。
- 「既存画面」＝ `CustomerForm`、新しく追加する「子画面」＝ `CustomerSearchDialog`（顧客検索ダイアログ）とします。

## まず確認：リンクファイルとは何か

ソリューションエクスプローラーでファイルアイコンに**小さな矢印**が付いているものがリンクファイルです。.vbproj の中身はこうなっています。

```xml
<Compile Include="..\Common\Forms\CustomerForm.vb">
  <Link>Forms\CustomerForm.vb</Link>
  <SubType>Form</SubType>
</Compile>
<Compile Include="..\Common\Forms\CustomerForm.Designer.vb">
  <Link>Forms\CustomerForm.Designer.vb</Link>
  <DependentUpon>CustomerForm.vb</DependentUpon>
</Compile>
```

ポイントは2つだけです。

1. **ファイルの実体は1つ**。どのプロジェクトから開いて編集しても、`Common\Forms` の元ファイルを書き換えています。
2. **コンパイルはプロジェクトごと**。同じソースが SalesApp と SalesAdmin でそれぞれ別々にビルドされます。

この2点を押さえると、以下のハマりどころはほぼ説明がつきます。

## ハマりどころ1：子画面を「自分のプロジェクトだけ」に追加して、他プロジェクトが全滅

冒頭の事故の原因です。

- 親画面 `CustomerForm.vb` に `New CustomerSearchDialog()` を書いた → この変更は**元ファイル**に入る
- 子画面 `CustomerSearchDialog` は SalesApp にしか存在しない
- SalesAdmin も同じ親画面をコンパイルするので、`型 'CustomerSearchDialog' が定義されていません。`（BC30002）で落ちる

**対処：子画面も親画面と同じ場所（`Common\Forms`）に実体を置き、親画面をリンクしている全プロジェクトに子画面もリンクする。**

親画面をどのプロジェクトがリンクしているかは、ソリューションフォルダで検索すれば一発で分かります。

```powershell
# 親画面をリンクしている .vbproj を洗い出す
Get-ChildItem -Recurse -Filter *.vbproj | Select-String "CustomerForm.vb" | Select-Object Path -Unique
```

> 「一部のプロジェクトでだけ子画面を使いたい」場合は、親画面に直接 `New` を書かず、条件付きコンパイル（`#If`）やイベント経由で呼び出し側に任せる設計にします（後述の「応用」参照）。

## ハマりどころ2：リンクフォルダに「新しい項目の追加」をしても、実体は自分のプロジェクトに作られる

ソリューションエクスプローラー上の `Forms` フォルダはリンクの**表示上のフォルダ**です。そこで「追加 → 新しい項目 → Windows フォーム」を実行すると、ファイルの実体は `SalesApp\Forms\` に作られ、`Common` には入りません。結果としてハマりどころ1と同じ状態になります。

**対処：子画面はまず普通に作り、ファイルを `Common\Forms` へ移動してから、各プロジェクトに「リンクとして追加」し直す。**（手順は後述）

## ハマりどころ3：.vb だけリンクして、Designer.vb と .resx を忘れる

「既存の項目の追加」で .vb だけを選んでリンクすると、次のような症状が出ます。

| リンク漏れ | 症状 |
| --- | --- |
| `.Designer.vb` | `InitializeComponent` が宣言されていない（BC30451）／コントロール名が見つからない |
| `.resx` | ビルドは通るが、実行時に画像やアイコンの読み込みで `MissingManifestResourceException` |
| `DependentUpon` の指定なし | ファイルが親の下にぶら下がらず、デザイナーで開けない／resx の埋め込み名がずれる |

**対処：.vb / .Designer.vb / .resx の3点セットでリンクし、.vbproj に `DependentUpon` と `SubType` を書く。**

```xml
<Compile Include="..\Common\Forms\CustomerSearchDialog.vb">
  <Link>Forms\CustomerSearchDialog.vb</Link>
  <SubType>Form</SubType>
</Compile>
<Compile Include="..\Common\Forms\CustomerSearchDialog.Designer.vb">
  <Link>Forms\CustomerSearchDialog.Designer.vb</Link>
  <DependentUpon>CustomerSearchDialog.vb</DependentUpon>
</Compile>
<EmbeddedResource Include="..\Common\Forms\CustomerSearchDialog.resx">
  <Link>Forms\CustomerSearchDialog.resx</Link>
  <DependentUpon>CustomerSearchDialog.vb</DependentUpon>
</EmbeddedResource>
```

## ハマりどころ4：Partial Class の分割ファイルは「同じプロジェクト・同じ名前空間」でないと別クラスになる

「フォームとメソッドでファイルが分かれている」構成は、`Partial Class` で1つのクラスを複数ファイルに分けています。

```vb
' CustomerForm.Designer.vb（自動生成）
<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()>
Partial Class CustomerForm
    Inherits System.Windows.Forms.Form
    ' ... InitializeComponent など
End Class

' CustomerForm.vb（イベントハンドラ）
Public Class CustomerForm
    ' ...
End Class

' CustomerForm.Logic.vb（業務メソッド）
Partial Class CustomerForm
    ' ...
End Class
```

ここで起きがちなミスは2つです。

- **分割ファイルの一部だけを別プロジェクトに置く。** Partial Class はプロジェクト（アセンブリ）をまたいで合体しません。片方のプロジェクトにしか `Logic.vb` がないと、そのプロジェクトでは `Logic` 側のメソッドが存在しないことになります。
- **名前空間がずれる。** 片方のファイルにだけ `Namespace Forms` を書くと、`Forms.CustomerForm` と `CustomerForm` という**別のクラス**が2つできます。エラーは「InitializeComponent が見つからない」「既に宣言されています」など、原因が分かりにくい形で出ます。

**対処：子画面のメソッドを別ファイルに分ける場合も、3ファイル（.vb / .Designer.vb / .Logic.vb）を同じ場所に置き、同じプロジェクト群にまとめてリンクする。`Namespace` の書き方は既存の親画面ファイルと完全に揃える。**

## ハマりどころ5：同じソースでも、プロジェクトごとに「ルート名前空間」と「Imports」が違う

VB.NET 特有の落とし穴です。VB.NET ではプロジェクトのプロパティで次の設定を持っており、**リンクされたファイルはリンク先プロジェクトの設定でコンパイルされます**。

| 設定 | 場所 | 起きること |
| --- | --- | --- |
| ルート名前空間 | プロジェクトのプロパティ → アプリケーション | 同じ `CustomerSearchDialog` が SalesApp では `SalesApp.CustomerSearchDialog`、SalesAdmin では `SalesAdmin.CustomerSearchDialog` になる |
| インポートされた名前空間 | プロジェクトのプロパティ → 参照 | SalesApp ではプロジェクト全体で `System.Data` を Imports 済みだが SalesAdmin では未設定、という差でビルドエラー |
| Option Strict / Option Explicit | プロジェクトのプロパティ → コンパイル | 片方は Strict Off、片方は On のため、暗黙の型変換がエラーになる |

**対処：共有ファイルにはプロジェクト設定に頼らない書き方をする。**

```vb
Option Strict On
Option Explicit On

Imports System.Data
Imports System.Windows.Forms

Public Class CustomerSearchDialog
    ' ...
End Class
```

- `Option` と `Imports` をファイル先頭に明示すると、どのプロジェクトでも同じ結果でコンパイルされます。
- 名前空間を完全修飾で比較・リフレクションしているコード（`Type.GetType("SalesApp.CustomerSearchDialog")` など）は、プロジェクトによって結果が変わるので避けます。

## ハマりどころ6：Designer.vb を手で直して画面が開かなくなる

子画面の作成中に、Designer.vb を直接編集して壊すケースもよくあります。

- `InitializeComponent` の中にロジック（DB 読み込み、条件分岐）を書く → デザイナーが解釈できず「デザイナーを読み込めません」
- フォームのクラスより前に別のクラスを書く → 「クラス X はデザインできますが、ファイル内の最初のクラスではありません」
- 両方のプロジェクトで同時にデザイナーを開いて保存 → 実体が1つなので後勝ちで上書きされる

**対処：**

- `InitializeComponent` には手を入れない。初期化処理はコンストラクタか `Load` イベントに書く
- フォームの .vb ファイルでは、フォームのクラスを先頭に置く
- リンクファイルのデザイナーは**1つのプロジェクトからだけ**開く
- デザイナー作業の前に必ずコミット（またはファイルを退避）しておく

## ハマりどころ7：呼び出し方で「親の後ろに隠れる」「前回の値が残る」

親画面からの呼び出しは、次の形を基本形にします。

```vb
' CustomerForm.vb（親画面）
Private Sub btnSearch_Click(sender As Object, e As EventArgs) Handles btnSearch.Click
    Using dlg As New CustomerSearchDialog(txtCustomerCode.Text)
        If dlg.ShowDialog(Me) = DialogResult.OK Then
            txtCustomerCode.Text = dlg.SelectedCustomerCode
            txtCustomerName.Text = dlg.SelectedCustomerName
        End If
    End Using
End Sub
```

よくある失敗と理由です。

| 書き方 | 起きること |
| --- | --- |
| `CustomerSearchDialog.ShowDialog()`（既定インスタンス） | 2回目に開いたとき前回の入力値が残る。`My.Forms` はプロジェクト単位なので、リンク共有と相性が悪い |
| `ShowDialog()`（Owner なし） | 別ウィンドウに切り替えて戻ると、子画面が親の後ろに隠れて操作できなくなる |
| `Show()`（モードレス）で値を受け取る | 次の行を実行した時点で、まだユーザーは何も選んでいない |
| `Using` を使わない | `ShowDialog` で開いたフォームは閉じても破棄されないので、リソースが残る |

`StartPosition` を `CenterParent` にしても、**Owner を渡さないと中央に出ません**。`ShowDialog(Me)` の `Me` が重要です。

## ハマりどころ8：コンストラクタを追加したら画面が真っ白

子画面にデータを渡すためにコンストラクタを追加すると、`InitializeComponent()` の呼び出しを忘れがちです。忘れると、コントロールが1つもない空のフォームが表示されます。

```vb
' CustomerSearchDialog.vb（子画面）
Option Strict On
Option Explicit On

Imports System.Windows.Forms

Public Class CustomerSearchDialog

    ' 親画面に返す値（読み取り専用で公開）
    Public ReadOnly Property SelectedCustomerCode As String = ""
    Public ReadOnly Property SelectedCustomerName As String = ""

    Private ReadOnly _initialKeyword As String

    ' デザイナー用：引数なしコンストラクタは残しておく
    Public Sub New()
        Me.New("")
    End Sub

    Public Sub New(initialKeyword As String)
        InitializeComponent()          ' ← これを忘れると真っ白
        _initialKeyword = initialKeyword
    End Sub

    Private Sub CustomerSearchDialog_Load(sender As Object, e As EventArgs) Handles MyBase.Load
        txtKeyword.Text = _initialKeyword
        Me.AcceptButton = btnOK
        Me.CancelButton = btnCancel
    End Sub

    Private Sub btnOK_Click(sender As Object, e As EventArgs) Handles btnOK.Click
        If dgvResult.CurrentRow Is Nothing Then
            MessageBox.Show(Me, "顧客を選択してください。", Me.Text,
                            MessageBoxButtons.OK, MessageBoxIcon.Information)
            Return
        End If

        _SelectedCustomerCode = CStr(dgvResult.CurrentRow.Cells("colCode").Value)
        _SelectedCustomerName = CStr(dgvResult.CurrentRow.Cells("colName").Value)
        Me.DialogResult = DialogResult.OK   ' 設定するとフォームが閉じる
    End Sub

    Private Sub btnCancel_Click(sender As Object, e As EventArgs) Handles btnCancel.Click
        Me.DialogResult = DialogResult.Cancel
    End Sub

End Class
```

- 引数なしの `New()` を残すのは、デザイナーがフォームを開くときに使うためです。
- 戻り値は `ReadOnly Property` で公開し、親画面から子画面のコントロール（`dlg.txtKeyword.Text` など）を直接触らないようにします。コントロール名を変えたときに親画面が壊れなくなります。
- メソッドを別ファイルに分ける既存ルールがある場合は、`btnOK_Click` から呼ぶ検索処理などを `CustomerSearchDialog.Logic.vb`（`Partial Class CustomerSearchDialog`）に置きます。

## 事故らない追加手順（まとめ）

### 1. 影響範囲を調べる

- 親画面 `CustomerForm.vb` をリンクしている .vbproj をすべて洗い出す（ハマりどころ1の PowerShell）
- 各プロジェクトのルート名前空間、インポートされた名前空間、Option Strict を確認する
- 親画面の分割ルール（`.Logic.vb` など）と `Namespace` の書き方を確認する

### 2. 子画面を作る

1. どれか1つのプロジェクトで「追加 → 新しい項目 → Windows フォーム」から `CustomerSearchDialog` を作る
2. デザイナーで画面を作り、ビルドが通るところまで確認する
3. 既存ルールに合わせて `CustomerSearchDialog.Logic.vb` を作り、`Partial Class` にする

### 3. 実体を共通フォルダへ移す

1. ソリューションエクスプローラーで子画面を「プロジェクトから除外」する
2. エクスプローラーで `.vb` / `.Designer.vb` / `.Logic.vb` / `.resx` を `Common\Forms\` に移動する
3. ファイル先頭に `Option Strict On` / `Option Explicit On` / 必要な `Imports` を明記する

### 4. 全プロジェクトにリンクする

1. 各プロジェクトで「追加 → 既存の項目」を開き、`Common\Forms\` の子画面ファイルをすべて選ぶ
2. 「追加」ボタン右の▼から **「リンクとして追加」** を選ぶ
3. .vbproj を開き（プロジェクトのアンロード → 編集）、`.Designer.vb` / `.Logic.vb` / `.resx` に `DependentUpon` を付ける（ハマりどころ3の XML）

### 5. 親画面から呼び出す

- `Using` + `ShowDialog(Me)` + `DialogResult` で呼ぶ（ハマりどころ7のコード）
- 親画面の編集は1つのプロジェクトからだけ行う

### 6. ソリューション全体で確認する

- 「ソリューションのリビルド」で全プロジェクトがビルドできることを確認する
- リンクしている各アプリで子画面を開き、デザイナーでも開けることを確認する
- コミット対象に `Common\Forms\` の新規ファイルが含まれていることを確認する（プロジェクトフォルダの外なので漏れやすい）

## チェックリスト

- [ ] 親画面をリンクしている全プロジェクトを把握した
- [ ] 子画面の実体は親画面と同じ共通フォルダにある
- [ ] .vb / .Designer.vb / .resx（と分割ファイル）をセットでリンクした
- [ ] .vbproj に `DependentUpon` と `SubType` が入っている
- [ ] Partial Class の全ファイルで `Namespace` が揃っている
- [ ] ファイル先頭に `Option Strict` / `Option Explicit` / `Imports` を明記した
- [ ] `InitializeComponent` に手を入れていない
- [ ] コンストラクタで `InitializeComponent()` を呼んでいる
- [ ] `Using` + `ShowDialog(Me)` で呼び出している
- [ ] ソリューション全体のリビルドが通る
- [ ] 共通フォルダの新規ファイルがコミットに含まれている

## 応用：子画面を一部のプロジェクトでだけ使いたい場合

親画面に直接 `New CustomerSearchDialog()` と書くと、親画面をリンクする全プロジェクトに子画面が必要になります。一部のプロジェクトだけで使いたい場合は、親画面は「検索ボタンが押された」ことだけを知らせ、子画面を開くのは各プロジェクト側に任せます。

```vb
' CustomerForm.vb（共通・親画面）
Public Event SearchRequested As EventHandler

Private Sub btnSearch_Click(sender As Object, e As EventArgs) Handles btnSearch.Click
    RaiseEvent SearchRequested(Me, EventArgs.Empty)
End Sub

Public Sub SetCustomer(code As String, name As String)
    txtCustomerCode.Text = code
    txtCustomerName.Text = name
End Sub
```

```vb
' SalesApp 側（子画面をリンクしているプロジェクトだけ）
Dim f As New CustomerForm()
AddHandler f.SearchRequested,
    Sub(s, e)
        Using dlg As New CustomerSearchDialog()
            If dlg.ShowDialog(f) = DialogResult.OK Then
                f.SetCustomer(dlg.SelectedCustomerCode, dlg.SelectedCustomerName)
            End If
        End Using
    End Sub
f.Show()
```

プロジェクト数が少なく手早く済ませたい場合は、プロジェクトのプロパティ → コンパイル → 詳細コンパイルオプションで `USE_SEARCH_DIALOG=True` のような定数を定義し、`#If USE_SEARCH_DIALOG Then ... #End If` で囲む方法もあります。ただし分岐が増えると読みにくくなるので、恒久的にはイベント方式がおすすめです。

## 補足：SDK形式（.NET 6 以降）の .vbproj の場合

- プロジェクトフォルダ配下のファイルは自動で取り込まれますが、外部フォルダのファイルは従来どおり `<Compile Include="..." Link="..." />` で明示が必要です。
- `Link` は属性で書けます（`<Compile Include="..\Common\Forms\CustomerSearchDialog.vb" Link="Forms\CustomerSearchDialog.vb" />`）。
- `DependentUpon` によるデザイナーとの関連付けが必要な点は同じです。

## まとめ

- リンクファイルは**実体が1つ、コンパイルはプロジェクトごと**。この2点を意識するだけで事故の大半は防げます。
- 子画面は親画面と同じ共通フォルダに置き、親画面をリンクしている**全プロジェクトにセットでリンク**します。
- 共有ファイルは `Option` と `Imports` を明記して、プロジェクト設定の違いに左右されないようにします。
- 呼び出しは `Using` + `ShowDialog(Me)`、受け渡しはコンストラクタと `ReadOnly Property` が基本形です。

「子画面を1枚足すだけ」の改修ほど、影響範囲の確認を最初にやっておくと安全です。
