---
title: Microsoft Access 技術まとめ
slug: microsoft-access
excerpt: Accessのオブジェクト構成とファイル形式、導入時の32/64ビットやトラストセンターの設定、Access SQL・関数・VBA・ショートカットの早見表、DAOやExcel連携のサンプル、実行時エラー3021・3061などの対処、分割運用や破損対策の実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# Microsoft Access 技術まとめ

## 基礎

Microsoft Access は Office 製品群に含まれる Windows 用のデスクトップデータベースです。**テーブル・クエリ・フォーム・レポート**を GUI で作り、マクロや VBA で処理を自動化できるため、部署内の業務ツールや Excel 管理からの置き換えに広く使われています。データベースエンジンは ACE（旧 Jet）で、SQL Server などのデータを**リンクテーブル**として扱うフロントエンドにもなります。

### 主な用途

- 部署内の業務ツール（受発注・在庫・顧客台帳など）
- 小規模なデータ管理と帳票（レポート）の作成
- Excel で管理していたデータの移行・集計
- SQL Server などのデータベースの簡易フロントエンド

### オブジェクトの種類

| オブジェクト | 役割 | 現場での注意点 |
| --- | --- | --- |
| テーブル | データの保存先 | 主キーを必ず設定する。オートナンバーは連番が保証されない（欠番が出る） |
| クエリ | 抽出・集計・更新（SQL） | 選択・集計・クロス集計・追加・更新・削除・テーブル作成などの種類がある |
| フォーム | 入力・表示画面 | テーブルを直接開かせず、フォーム経由で入力させる |
| レポート | 印刷用の帳票 | 宛名ラベル・請求書・グループ集計など |
| マクロ | GUI で組む簡易処理 | `AutoExec` という名前のマクロは起動時に自動実行される |
| モジュール | VBA のコード | 標準モジュールとフォーム/レポートのモジュールがある |

### ファイル形式と上限

| 拡張子 | 内容 |
| --- | --- |
| `.accdb` | 現在の標準形式（Access 2007 以降） |
| `.mdb` | Access 2003 以前の形式。新規作成には使わない |
| `.accde` | VBA をコンパイル済みにし、ソースを編集できなくした配布用ファイル |
| `.laccdb` / `.ldb` | 開いている間に作られるロックファイル。誰が開いているかが記録される |

- **1ファイルの上限は 2GB**（システムオブジェクトを含む）。添付ファイル型や画像で一気に増える
- 同時接続は理論上 255 ユーザーですが、ファイル共有方式のため**実用は数人〜十数人程度**が目安
- データ型は `短いテキスト`（最大255文字）、`長いテキスト`、`数値`、`日付/時刻`、`通貨`、`オートナンバー`、`Yes/No` などを使う

## 環境構築

### 1. Access を用意する

- Microsoft 365 または Office 永続版のうち、**Access を含むプラン・エディション**が必要です（含まれないプランもあるため、契約内容を確認する）
- Access は **Windows 版のみ**です。Mac では動きません
- 作成済みのアプリを動かすだけなら、無償の **Access Runtime** を使えます（デザインの変更はできない）

### 2. 32ビット版か64ビット版かを確認する

`ファイル → アカウント → Access のバージョン情報` で確認できます。ビット数の違いは次の場面で問題になります。

| 場面 | 影響 |
| --- | --- |
| VBA の `Declare` 文（Windows API 呼び出し） | 64ビット版では `Declare PtrSafe` と `LongPtr` が必要 |
| 外部プログラムから ACE OLEDB / ODBC で接続 | 呼び出し側（Excel、.NET、PowerShell）とビット数を合わせる |
| 古い ActiveX コントロール・アドイン | 64ビット版で動かないものがある |

同じPCに32ビット版と64ビット版の Office を混在させることはできません。

### 3. 信頼できる場所を設定する

VBA やマクロを含むファイルは、既定では「セキュリティの警告」が出てコードが無効になります。共有フォルダで運用する場合は、フォルダを信頼できる場所に登録します。

1. `ファイル → オプション → トラスト センター → トラスト センターの設定`（バージョンにより「セキュリティ センター」表記）
2. `信頼できる場所 → 新しい場所の追加`
3. ネットワーク上のフォルダなら「ネットワーク上の信頼できる場所を許可する」にチェックを入れてから追加する

インターネットやメールから入手したファイルは、Windows がブロック情報（Mark of the Web）を付けるためマクロが実行されません。ファイルのプロパティで「許可する」にチェックを入れてから開きます。

### 4. VBA の参照設定を確認する

VBE（`Alt+F11`）の `ツール → 参照設定` で、使うライブラリにチェックを入れます。DAO を使う場合は `Microsoft Office xx.0 Access database engine Object Library` が必要です（通常は既定で有効）。**「参照不可:」と表示された項目があると、無関係な関数までコンパイルエラーになります。**

## コマンド

### Access SQL の書き方（他のDBとの違い）

| 操作 | Access SQL | 補足 |
| --- | --- | --- |
| 選択 | `SELECT 顧客名, 売上 FROM 売上表 WHERE 売上 >= 10000;` | |
| 文字列 | `WHERE 都道府県 = "東京"` | `'東京'` も可 |
| 日付リテラル | `WHERE 受注日 >= #2026/10/01#` | 日付は `#` で囲む。VBA から組み立てるときは `#yyyy/mm/dd#` 形式にする |
| あいまい検索 | `WHERE 氏名 LIKE "*田*"` | `*` は任意の文字列、`?` は任意の1文字（ANSI-92 モードでは `%` / `_`） |
| パラメータ | `WHERE 受注日 BETWEEN [開始日] AND [終了日]` | 実行時に入力を求められる |
| 文字列連結 | `[姓] & " " & [名]` | `+` は NULL を含むと結果が NULL になる |
| 条件分岐 | `IIf([点数] >= 80, "合格", "不合格")` | `CASE` 式は使えない。多分岐は `Switch()` |
| NULL 置換 | `Nz([売上], 0)` | Access 内でのみ使える（外部接続からは不可） |
| 複数 JOIN | `FROM (A INNER JOIN B ON ...) INNER JOIN C ON ...` | 3つ以上のテーブルを結合するときは**括弧が必要** |
| クロス集計 | `TRANSFORM Sum(金額) SELECT 顧客 FROM 売上 GROUP BY 顧客 PIVOT Format(日付,"yyyy/mm");` | |
| 完全外部結合 | 非対応 | LEFT JOIN と RIGHT JOIN を `UNION` する |

### よく使う関数

| 操作 | 関数 |
| --- | --- |
| 条件 | `IIf([点数] >= 80, "合格", "不合格")` / `Switch([区分]=1, "個人", [区分]=2, "法人", True, "その他")` |
| 日付書式 | `Format(Date(), "yyyy/mm/dd")`（分は `nn`） |
| 日付計算 | `DateAdd("m", 1, [日付])` / `DateDiff("d", [開始], [終了])` / `DateSerial(Year(Date()), Month(Date()) + 1, 0)`（月末） |
| 文字列 | `Left([コード], 3)` / `Mid([コード], 2, 3)` / `Replace([電話], "-", "")` / `Trim([氏名])` |
| 型変換 | `CLng([数量])` / `CDate("2026/10/19")` / `Val([文字列])` |
| 定義域集計 | `DSum("金額", "売上", "顧客ID = 1")` / `DCount("*", "売上")` / `DMax("受注日", "売上")` |
| 1件取得 | `DLookup("氏名", "顧客", "ID = " & [顧客ID])` |

`DLookup` などの定義域集計関数は手軽ですが遅いため、クエリの各行やループの中で大量に呼ばないようにします。

### VBA の基本操作

| 操作 | コード |
| --- | --- |
| フォームを開く | `DoCmd.OpenForm "F_顧客", , , "顧客ID = 10"` |
| レポートを印刷プレビュー | `DoCmd.OpenReport "R_請求書", acViewPreview, , "請求ID = 5"` |
| クエリ実行（警告なし） | `CurrentDb.Execute "DELETE FROM 一時表", dbFailOnError` |
| 保存済みクエリを開く | `DoCmd.OpenQuery "Q_売上集計"` |
| レコードセット | `Set rs = CurrentDb.OpenRecordset("顧客", dbOpenDynaset)` |
| 影響行数 | `db.Execute strSQL, dbFailOnError: Debug.Print db.RecordsAffected` |
| 再計算・再表示 | `Me.Requery` / `Me.Recalc` |
| 現在のレコードを保存 | `If Me.Dirty Then Me.Dirty = False` |
| 警告の抑止 | `DoCmd.SetWarnings False` …処理… `DoCmd.SetWarnings True` |

`DoCmd.RunSQL` と `SetWarnings False` の組み合わせは、エラーが起きても**黙って一部の行だけ処理される**ことがあります。更新系は `CurrentDb.Execute ..., dbFailOnError` を使います。

### メニュー操作

| 操作 | 場所 |
| --- | --- |
| 最適化/修復 | `ファイル → 情報 → データベースの最適化/修復` |
| 閉じるときに最適化 | `ファイル → オプション → 現在のデータベース →「閉じるときに最適化する」` |
| 起動時のフォーム | `ファイル → オプション → 現在のデータベース →「フォームの表示」` |
| フロント/バックエンド分割 | `データベース ツール → データの移動 → Access データベース` |
| リンクテーブル更新 | `外部データ → リンク テーブル マネージャー` |
| リレーションシップ | `データベース ツール → リレーションシップ` |
| オブジェクトの依存関係 | `データベース ツール → オブジェクトの依存関係` |
| ACCDE 作成 | `ファイル → 名前を付けて保存 → ACCDE の作成` |

### ショートカット

| キー | 動作 |
| --- | --- |
| `Alt+F11` | VBE（VBA エディター）を開く |
| `Ctrl+G` | イミディエイトウィンドウ（`?DCount("*","顧客")` で式を試せる） |
| `F5` / `F8` / `F9` | 実行 / ステップ実行 / ブレークポイント |
| `F11` | ナビゲーションウィンドウの表示/非表示 |
| `Shift` を押しながら開く | 起動時の処理（`AutoExec` や起動フォーム）をスキップ |
| `Ctrl+;` | 現在の日付を入力 |
| `Ctrl+Enter` | フィールド内で改行 |

### コマンドラインスイッチ

```powershell
& "C:\Program Files\Microsoft Office\root\Office16\MSACCESS.EXE" "C:\db\app.accdb" /compact   # 最適化して終了
& "...\MSACCESS.EXE" "C:\db\app.accdb" /x M_夜間処理     # マクロを実行
& "...\MSACCESS.EXE" "C:\db\app.accdb" /runtime          # ランタイムモードで起動
& "...\MSACCESS.EXE" "C:\db\app.accdb" /decompile        # VBA の P コードを破棄（不安定時の対処）
```

`MSACCESS.EXE` の場所は Office のバージョンとインストール形態で変わります。

## サンプル

### レコードセットで1件ずつ処理する（DAO・エラー処理付き）

```vb
Public Sub 顧客ランク更新()
    On Error GoTo ErrHandler
    Dim db As DAO.Database
    Dim rs As DAO.Recordset

    Set db = CurrentDb
    Set rs = db.OpenRecordset( _
        "SELECT 顧客ID, 累計金額, ランク FROM 顧客 WHERE 有効 = True", dbOpenDynaset)

    Do Until rs.EOF
        rs.Edit
        rs!ランク = IIf(Nz(rs!累計金額, 0) >= 1000000, "A", "B")
        rs.Update
        rs.MoveNext
    Loop

ExitHere:
    If Not rs Is Nothing Then rs.Close
    Set rs = Nothing
    Set db = Nothing
    Exit Sub
ErrHandler:
    MsgBox "エラー " & Err.Number & ": " & Err.Description, vbExclamation
    Resume ExitHere
End Sub
```

この例のように全件を同じ規則で更新するだけなら、ループより `UPDATE` クエリ1本のほうが速く確実です。

### パラメータ付きクエリを VBA から安全に実行する

```vb
Dim qdf As DAO.QueryDef
Set qdf = CurrentDb.CreateQueryDef("", _
    "PARAMETERS p顧客ID Long, p開始日 DateTime; " & _
    "DELETE FROM 売上明細 WHERE 顧客ID = p顧客ID AND 受注日 < p開始日;")
qdf.Parameters("p顧客ID") = Me!顧客ID
qdf.Parameters("p開始日") = #2026/4/1#
qdf.Execute dbFailOnError
Debug.Print qdf.RecordsAffected & " 件削除"
```

文字列連結で SQL を組み立てると、`'` を含む値でエラー 3075 が出たり、日付の書式で誤動作したりします。パラメータを使えば型の変換も任せられます。

### トランザクションでまとめて確定する

```vb
Dim ws As DAO.Workspace, db As DAO.Database
Set ws = DBEngine.Workspaces(0)
Set db = CurrentDb
On Error GoTo Rollback
ws.BeginTrans
db.Execute "INSERT INTO 出荷 SELECT * FROM 出荷予定 WHERE 確定 = True", dbFailOnError
db.Execute "DELETE FROM 出荷予定 WHERE 確定 = True", dbFailOnError
ws.CommitTrans
Exit Sub
Rollback:
ws.Rollback
MsgBox "処理を取り消しました: " & Err.Description
```

### Excel・CSV との入出力

```vb
' クエリ結果を Excel に出力（先頭行は列名）
DoCmd.TransferSpreadsheet acExport, acSpreadsheetTypeExcel12Xml, _
    "Q_月次売上", "C:\work\月次売上.xlsx", True

' Excel のシートを取り込む
DoCmd.TransferSpreadsheet acImport, acSpreadsheetTypeExcel12Xml, _
    "T_取込", "C:\work\受注.xlsx", True, "Sheet1!"

' CSV を取り込む（インポート定義「受注CSV定義」を使用）
DoCmd.TransferText acImportDelim, "受注CSV定義", "T_取込", "C:\work\受注.csv", True
```

CSV の文字コード（Shift_JIS / UTF-8）や列の型は、一度ウィザードで取り込み、「詳細設定」から**インポート定義を保存**しておくと毎回同じ条件で取り込めます。

### リンクテーブルの接続先を一括で張り替える

```vb
Public Sub リンク更新(ByVal バックエンドパス As String)
    Dim tdf As DAO.TableDef
    For Each tdf In CurrentDb.TableDefs
        If Left(tdf.Connect, 10) = ";DATABASE=" Then
            tdf.Connect = ";DATABASE=" & バックエンドパス
            tdf.RefreshLink
        End If
    Next
End Sub
' 例: リンク更新 "\\fileserver\share\app_be.accdb"
```

開発環境と本番環境でバックエンドの場所が違う場合に、起動時の処理として使えます。

## エラー対応

エラー番号は日本語版・英語版で共通です。日本語版では翻訳されたメッセージが表示されるため、**番号で検索**すると情報を見つけやすくなります。

| 番号 | メッセージ（英語版） | 主な原因 | 対処 |
| --- | --- | --- | --- |
| 3021 | `No current record.` | 0件のレコードセットや EOF の位置で値を読んだ | `If Not rs.EOF Then` で確認してから読む |
| 3022 | `The changes you requested to the table were not successful because they would create duplicate values in the index, primary key, or relationship.` | 主キー・一意インデックスの重複 | 既存データを確認。追加クエリの重複条件を見直す |
| 3061 | `Too few parameters. Expected 1.` | VBA から実行した SQL にフォーム参照や存在しない列名がある | 列名の綴りを確認。`[Forms]![F_xx]![yy]` は値を連結するか QueryDef のパラメータで渡す |
| 3075 | `Syntax error (missing operator) in query expression '...'.` | 文字列の `'` / `"` の不足、日付の `#` 漏れ、値に `'` が含まれる | `Debug.Print strSQL` で組み立て後のSQLを確認。パラメータクエリに変更 |
| 3078 | `The Microsoft Access database engine cannot find the input table or query '...'.` | テーブル名・クエリ名の誤り、リンク切れ | 名前を確認。リンクテーブル マネージャーで再リンク |
| 3044 | `'...' is not a valid path.` | リンクテーブルの接続先フォルダが存在しない（ドライブ文字の違いなど） | UNC パス（`\\server\share\...`）でリンクし直す |
| 3027 | `Cannot update. Database or object is read-only.` | 読み取り専用ファイル・フォルダ、更新できないクエリ（集計・一部のJOIN） | フォルダの書き込み権限を確認。クエリの構造を見直す |
| 3218 / 3260 | `Could not update; currently locked.` など | 他のユーザーが同じレコード・ページを編集中 | 時間をおいて再試行。長時間の編集状態を作らない |
| 3343 | `Unrecognized database format '...'.` | ファイル破損、新しい形式のファイルを古い環境で開いた | 最適化/修復を実行。だめならバックアップから復元 |
| 3265 | `Item not found in this collection.` | `rs!列名` の列がない、フィールド名の誤り | SQL の `SELECT` 句に列があるか確認 |
| 2501 | `The OpenForm action was canceled.`（`OpenReport` なども同様） | フォーム/レポートの `Open` イベントで `Cancel = True`、データなしで印刷中止 | 呼び出し側で `If Err.Number = 2501 Then Resume Next` などで処理 |
| 94 | `Invalid use of Null` | NULL のフィールドを String などの変数に代入 | `Nz(rs!列, "")` で受ける |
| 13 | `Type mismatch` | 型の違う値を代入・比較 | `CLng` / `CDate` で変換し、`IsNumeric` / `IsDate` で事前確認 |

### その他のよくあるトラブル

| 症状 | 主な原因 | 対処 |
| --- | --- | --- |
| コンパイルエラー「ユーザー定義型は定義されていません。」 | 参照設定が外れている（`DAO.Database` などが認識されない） | `ツール → 参照設定` で「参照不可:」を外し、必要なライブラリを選ぶ |
| コンパイルエラー「プロジェクトまたはライブラリが見つかりません。」 | 参照しているライブラリが別バージョン・未インストール | 参照設定を修正。他PCに配布するなら参照設定を最小限にする |
| `The 'Microsoft.ACE.OLEDB.12.0' provider is not registered on the local machine.` | 外部プログラムと Office（ACE エンジン）のビット数不一致、エンジン未導入 | 呼び出し側を同じビット数で動かすか、Access Database Engine 再頒布可能パッケージを導入 |
| マクロが無効と表示される | 信頼できる場所でない、Mark of the Web | 「信頼できる場所」に登録。ファイルのプロパティでブロックを解除 |
| ファイルが急に大きくなる・動作が重い | 削除・一時テーブルの作成で領域が解放されていない | 最適化/修復を定期的に実行する |
| 「データベースは破損している可能性があります」 | 書き込み中のネットワーク切断、強制終了 | 全員を閉じさせ、コピーを取ってから最適化/修復。復旧できなければバックアップから戻す |

## 実務Tips

### 分割して運用する

- 複数人で使うなら、**バックエンド（テーブルだけ）とフロントエンド（クエリ・フォーム・レポート・VBA）に分割**する
- フロントエンドは**各ユーザーのPCにコピー**して使う。1つのフロントエンドを共有フォルダで全員が開くと破損しやすい
- フロントエンドを更新したら配布が必要。起動用のバッチや VBA でサーバーから最新版をコピーする仕組みを作っておくと楽
- バックエンドへのリンクは UNC パス（`\\server\share\app_be.accdb`）で張る。ドライブ文字はPCごとに違うことがある

### 破損とデータ消失を防ぐ

- バックエンドは**毎日コピーでバックアップ**する（誰も開いていない時間帯に。`.laccdb` が残っていれば使用中）
- 無線LANや VPN 越しで共有ファイルを開くと破損しやすい。遠隔拠点で使うならバックエンドを SQL Server に移し、Access はフロントエンドとして使う
- 2GB に近づく前に、添付ファイル型をやめてファイルパスだけ保存する、古いデータを別ファイルに分けるなどの対策をとる
- 最適化/修復は**必ずコピーを取ってから**実行する

### 設計・開発の作法

- すべてのモジュールの先頭に `Option Explicit` を書く（VBE の `ツール → オプション →「変数の宣言を強制する」`）
- テーブル名・クエリ名に接頭辞（`T_` / `Q_` / `F_` / `R_` / `M_`）を付けると一覧で探しやすい
- フィールド名に空白や記号を使わない。使った場合は `[受注 日]` のように角かっこが必須になる
- 金額は `通貨` 型、数値計算に `倍精度浮動小数点型` を使うと端数誤差が出ることがある
- 配布前に VBE の `デバッグ → コンパイル` でエラーがないことを確認し、利用者には `.accde` を配る（元の `.accdb` は必ず保管する）

### 限界を見極める

- 同時利用者が増えた、データが数百MBを超えた、拠点間で使いたい、といった時点で SQL Server（Express でも可）への移行を検討する
- 移行しても、フォーム・レポートはリンクテーブル経由でそのまま使える部分が多い。重い集計はパススルークエリで SQL Server 側に実行させる
- 「作った本人しか直せない」状態が最大のリスク。テーブル定義とクエリの目的、VBA の処理概要を残しておく

## 関連リンク

- [Access のヘルプとラーニング（Microsoft サポート）](https://support.microsoft.com/ja-jp/access)
- [Access VBA リファレンス](https://learn.microsoft.com/ja-jp/office/vba/api/overview/access)
- [SQL Server のドキュメント（移行先の検討に）](https://learn.microsoft.com/ja-jp/sql/sql-server/)
