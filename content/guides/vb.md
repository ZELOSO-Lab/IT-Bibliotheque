---
title: VB 技術まとめ
slug: vb
excerpt: VB（Visual Basic / VB.NET / VBA）の基本文法、サンプル、エラー対応などの技術情報をまとめています。
updated: 2026-10-19
---

# VB 技術まとめ

## 基礎

Visual Basic / VB.NET / VBA。業務アプリやOffice自動化で利用。

### 主な用途

- 業務アプリ
- Excel / Access のVBAマクロ
- Windowsフォーム
- 既存システム保守

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[VB 公式ドキュメント](https://learn.microsoft.com/ja-jp/dotnet/visual-basic/)を参照してください。

## コマンド

### VBA: セルへの書き込み

```
Worksheets("Sheet1").Range("A1").Value = "Hello"
```

### VBA: 最終行の取得

```
Dim lastRow As Long
lastRow = Cells(Rows.Count, 1).End(xlUp).Row
```

### VB.NET: ループ

```
For i As Integer = 1 To 10
    Console.WriteLine(i)
Next
```

### 早見表：VBA 基本

| 操作 | コマンド・構文 |
| --- | --- |
| 変数宣言 | `Dim i As Long Dim s As String` |
| メッセージ | `MsgBox "完了しました"` |
| If | `If x > 0 Then   ... Else   ... End If` |
| For | `For i = 1 To 10   ... Next i` |

### 早見表：Excel 操作

| 操作 | コマンド・構文 |
| --- | --- |
| セル | `Range("A1").Value = 100` |
| 最終行 | `lastRow = Cells(Rows.Count, 1).End(xlUp).Row` |
| シート指定 | `Worksheets("Sheet1").Activate` |
| 画面更新停止 | `Application.ScreenUpdating = False` |

### 早見表：VB.NET 基本

| 操作 | コマンド・構文 |
| --- | --- |
| 変数 | `Dim name As String = "Taro"` |
| For Each | `For Each x In list   ... Next` |
| 関数 | `Function Add(a As Integer, b As Integer) As Integer   Return a + b End Function` |
| 文字列補間 | `$"Hello {name}"` |

### 早見表：エラー処理

| 操作 | コマンド・構文 |
| --- | --- |
| VBA | `On Error GoTo ErrHandler ... ErrHandler:   MsgBox Err.Description` |
| VB.NET | `Try   ... Catch ex As Exception   ... End Try` |
| エラー無視（VBA） | `On Error Resume Next` |
| 元に戻す（VBA） | `On Error GoTo 0` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[VB 公式ドキュメント](https://learn.microsoft.com/ja-jp/dotnet/visual-basic/)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[VB 公式ドキュメント](https://learn.microsoft.com/ja-jp/dotnet/visual-basic/)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[VB 公式ドキュメント](https://learn.microsoft.com/ja-jp/dotnet/visual-basic/)を参照してください。

## 関連リンク

- [VB 公式ドキュメント](https://learn.microsoft.com/ja-jp/dotnet/visual-basic/)
