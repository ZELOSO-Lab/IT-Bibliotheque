---
series: 現場の声
no: 0021
title: 【C言語】gdbでの単体テスト、エビデンスをExcelに貼るだけで1日終わった話と、ログ・通過ルート・判定まで自動で揃える手順
slug: gdb-ut-evidence-excel
category: C言語
tags: [C言語, gdb, 単体テスト, UT, エビデンス, Excel, dprintf, VBA]
technologies: [c]
excerpt: gdbで1ケースずつ止めて、画面をキャプチャして、Excelに貼る。50ケースで丸1日かかり、しかも「このとき何のexeで、どの分岐を通ったの？」と聞かれて答えられませんでした。gdbのバッチ実行・dprintf・CSV出力・VBAでの取り込みを組み合わせて、ログ・通過ルート・OK/NG判定までExcelに自動で揃える手順をまとめました。
status: draft
created: 2026-10-19
---

# 【C言語】gdbでの単体テスト、エビデンスをExcelに貼るだけで1日終わった話と、ログ・通過ルート・判定まで自動で揃える手順

## 現場の声

「UT のエビデンスは Excel で提出してください。各ケースで通った分岐が分かるように」

C言語の受注金額計算モジュールの単体テスト（UT）を gdb で実施することになりました。最初は次のやり方で進めていました。

1. gdb を起動して、ブレークポイントを張る
2. `run` して止まったら `print` で値を確認する
3. Tera Term の画面をキャプチャして、Excel のエビデンスシートに貼る
4. 次のケースへ（1に戻る）

50ケースで丸1日かかりました。しかもレビューで次の指摘を受けました。

- 「このキャプチャ、どのビルドの exe で取ったの？ 修正前じゃない？」
- 「異常系（DBエラー）のケース、どうやって発生させたのか書いてない」
- 「画像だと検索できないから、`rc=-2` の行がどこにあるか分からない」

結局、修正後に全ケースをもう一度キャプチャし直すことになりました。

この記事では、**エビデンスを「画像」ではなく「テキストログ」で取り、gdb をスクリプトで動かして、Excel への取り込みまで自動化する**手順を、ハマりどころ順にまとめます。gdb の基本操作は [gdbで「どこで・なぜ落ちたか」を突き止める手順](https://itbibliotheque.wordpress.com/?name=c-gdb-debugging)、ブレークポイントで止まらないときは [確実に止めるための7つのチェック](https://itbibliotheque.wordpress.com/?name=c-gdb-breakpoint-not-hit) を参照してください。

## 前提の構成

| 項目 | 内容 |
| --- | --- |
| 実行環境 | Linux サーバ（Tera Term で接続）、gcc、gdb |
| 確認したバージョン | gdb 15.1（`set logging enabled` は gdb 12 以降の書き方） |
| エビデンス提出形式 | Excel（ケース一覧シート＋ケースごとのログシート） |
| ログの受け渡し | WinSCP でサーバから Windows へコピー |

テスト対象は、数量（1〜999）と単価から受注金額を計算する関数です。100個以上は1割引、単価取得（本来は DB 参照）に失敗したら `-2` を返します。

```c
#include <stdio.h>
#include <stdlib.h>

#define QTY_MIN 1
#define QTY_MAX 999

/* 単価マスタから単価を取得する（本来はDB参照。ここでは固定値） */
int get_unit_price(const char *item_code, int *unit_price)
{
    (void)item_code;
    *unit_price = 1200;
    return 0;
}

/* 受注金額を計算する。0:正常 -1:数量エラー -2:単価取得エラー */
int calc_amount(const char *item_code, int qty, long *amount)
{
    int unit_price = 0;
    int rc;

    if (qty < QTY_MIN || qty > QTY_MAX) {
        return -1;                                  /* 22行目 */
    }
    rc = get_unit_price(item_code, &unit_price);    /* 24行目 */
    if (rc != 0) {                                  /* 25行目 */
        return -2;                                  /* 26行目 */
    }
    *amount = (long)unit_price * qty;               /* 28行目 */
    if (qty >= 100) {
        *amount = *amount * 90 / 100; /* 100個以上は1割引 */  /* 30行目 */
    }
    return 0;
}

int main(int argc, char *argv[])
{
    long amount = 0;
    int rc;

    if (argc != 3) {
        fprintf(stderr, "usage: %s ITEM QTY\n", argv[0]);
        return 1;
    }
    rc = calc_amount(argv[1], atoi(argv[2]), &amount);
    printf("rc=%d amount=%ld\n", rc, amount);      /* 45行目 */
    return rc == 0 ? 0 : 1;
}
```

ビルドは `-g -O0` で行います（最適化すると変数や行が消えて、エビデンスに `<optimized out>` が並びます）。

```bash
gcc -g -O0 -Wall -o order order.c
```

ファイル構成は次のとおりです。

```text
ut/
├── order.c          … テスト対象のソース
├── order            … テスト対象（-g -O0 でビルド）
├── cases.csv        … テストケース一覧（入力と期待値）
├── ut_trace.gdb     … 通過ルートと結果を記録する gdb スクリプト（全ケース共通）
├── UT-003.gdb       … 値を書き換える異常系ケース用の gdb スクリプト
├── run_all.sh       … 全ケースを実行して、ログと summary.csv を作る
└── evidence/
    └── 20261019_101841/
        ├── summary.csv  … Excel のケース一覧シートに貼る
        ├── UT-001.log   … ケースごとのログ
        └── ...
```

## ハマりどころ1：画面キャプチャで残すと、時間がかかるうえに検索できない

### 症状

1ケースごとに「止める → `print` → キャプチャ → Excel に貼る → トリミング」を繰り返していました。画面に収まらない出力はスクロールして複数枚になり、50ケースで数百枚の画像になりました。レビューで「`rc=-2` を確認した箇所はどこ？」と聞かれても、画像なので Excel の検索（Ctrl+F）で見つけられません。

### 原因

gdb の出力はもともと**テキスト**です。画像にした時点で、検索・比較（差分）・再利用ができなくなります。

### 対処

エビデンスはテキストのログで取り、Excel にはテキストとして取り込みます。gdb を対話で操作する代わりに、**バッチモード**で動かして出力を丸ごとファイルに残します。

```bash
gdb -q -batch -x UT-003.gdb --args ./order A001 10 2>&1 | tee evidence/UT-003.log
```

| オプション | 意味 |
| --- | --- |
| `-q` | 起動時の著作権表示を出さない |
| `-batch` | スクリプトを実行し終えたら gdb を終了する（確認の質問も出ない） |
| `-x ファイル` | gdb コマンドを書いたファイルを実行する |
| `--args` | 以降をプログラム名と引数として渡す（`run` だけで同じ引数で起動できる） |
| `2>&1 \| tee` | エラー出力も含めて画面とファイルの両方に出す |

画像を貼る作業がなくなるだけで、1ケースにかかる時間は数分から数秒になります。

## ハマりどころ2：`set logging` だけでは、プログラムの出力が残らない

### 症状

gdb にはログ機能があるので、最初は次のように書きました。

```text
set logging file evidence/UT-003.log
set logging overwrite on
set logging enabled on
shell date '+%Y-%m-%d %H:%M:%S'
shell md5sum ./order
...
```

できあがったログを見ると、**`shell` の結果（日時・md5）と、プログラム自身の `printf`（`rc=-2 amount=0`）が入っていません**。一番見せたい「プログラムの出力結果」がエビデンスから抜けていました。

### 原因

`set logging` が記録するのは **gdb 自身の出力だけ**です。`shell` で起動したコマンドの出力や、テスト対象プログラム（inferior）の標準出力は、gdb を通らずに直接端末へ出るため、ログファイルには書かれません。

なお、gdb 12 以降では `set logging on` は非推奨で、次の警告が出ます。

```text
Warning: 'set logging on', an alias for the command 'set logging enabled', is deprecated.
Use 'set logging enabled on'.
```

### 対処

gdb のログ機能は使わず、**シェル側で gdb の出力を丸ごと `tee` で受ける**のが確実です。ヘッダ（日時・対象の exe など）もシェル側で一緒に書きます。

```sh
{
  echo "ケースID : $CASE"
  echo "実施日時 : $(date '+%Y-%m-%d %H:%M:%S')"
  gdb -q -batch -x "$CASE.gdb" --args ./order "$@" 2>&1
} | tee "$LOG"
```

これで、gdb の出力・プログラムの出力・ヘッダが1つのログに時系列で入ります。

## ハマりどころ3：対話で操作すると、同じ手順を再現できない

### 症状

修正後の再テストで、「前回どこにブレークポイントを張って、何を `print` したか」を思い出せず、手順が前回と微妙に変わってしまいました。

### 原因

対話操作の手順は、どこにも残りません。

### 対処

ケースごとの操作を **gdb スクリプト（.gdb ファイル）**に書きます。スクリプト自体が「テスト手順書」になり、再テストは同じコマンドを打つだけになります。

さらに、`set trace-commands on` を入れると、実行したコマンドが先頭に `+` を付けてログに出ます。**「何を実行して、何が返ったか」がセットで残る**ので、手順と結果の両方のエビデンスになります。

```text
# ut_common.gdb（各ケースのスクリプトから source で読み込む）
set pagination off
set confirm off
set print pretty on
set trace-commands on
```

| 設定 | 目的 |
| --- | --- |
| `set pagination off` | `--Type <RET> for more--` で止まらないようにする |
| `set confirm off` | `y or n` の確認で止まらないようにする |
| `set print pretty on` | 構造体を1メンバ1行で見やすく出す |
| `set trace-commands on` | 実行したコマンドをログに残す |

## ハマりどころ4：異常系が作れず、値を書き換えたら上書きされた

### 症状

「単価取得エラー（`-2`）」のケースは、DB を止めないと発生しません。gdb で戻り値を書き換えればよいと考え、次のように操作しました。

```text
break get_unit_price
run
finish
set var rc = -1
next
next
```

ところが、`next` で進むと 26行目（`return -2`）を通らず、28行目に進んでしまいました。

```text
+finish
0x0000555555555220 in calc_amount (item_code=0x7fffffffc69e "A001", qty=10, amount=0x7fffffffbde0) at order.c:24
24	    rc = get_unit_price(item_code, &unit_price);
Value returned is $1 = 0
+set var rc = -1
+print rc
$2 = -1
+next
25	    if (rc != 0) {
+next
28	    *amount = (long)unit_price * qty;
```

### 原因

`finish` で戻った時点は、**24行目の代入（`rc = ...`）がまだ終わっていない**状態です。ここで `rc` を書き換えても、直後の代入で関数の戻り値 `0` に上書きされます。

### 対処

**代入が終わった後の行（25行目の `if`）で止めてから**書き換えます。書き換え前後の値を `print` で残せば、「どうやって異常系を発生させたか」のエビデンスにもなります。

```text
# UT-003.gdb：単価取得エラー時に -2 を返す
source ut_common.gdb
echo ===== UT-003 単価取得エラー時に -2 を返す =====\n
break order.c:25
run
print rc
set var rc = -1
print rc
next
next
finish
printf "RESULT,UT-003,expected=-2,actual=%d\n", $
continue
```

実行結果（ログ）は次のとおりです。

```text
+break order.c:25
Breakpoint 1 at 0x1223: file order.c, line 25.
+run
[Thread debugging using libthread_db enabled]
Using host libthread_db library "/lib/x86_64-linux-gnu/libthread_db.so.1".

Breakpoint 1, calc_amount (item_code=0x7fffffffc6a3 "A001", qty=10, amount=0x7fffffffbde0) at order.c:25
25	    if (rc != 0) {
+print rc
$1 = 0
+set var rc = -1
+print rc
$2 = -1
+next
26	        return -2;
+next
33	}
+finish
0x0000555555555328 in main (argc=3, argv=0x7fffffffbf18) at order.c:44
44	    rc = calc_amount(argv[1], atoi(argv[2]), &amount);
Value returned is $3 = -2
+printf "RESULT,UT-003,expected=-2,actual=%d\n", $
RESULT,UT-003,expected=-2,actual=-2
+continue
rc=-2 amount=0
[Inferior 1 (process 301) exited with code 01]
```

`finish` は関数の戻り値を `Value returned is $3 = -2` と表示し、直後の `$` でその値を参照できます。`printf` で `RESULT,...` の1行を出しておくと、あとで `grep` するだけで判定に使えます。

## ハマりどころ5：止めては `continue` を繰り返していて、通過ルートの記録が終わらない

### 症状

「各ケースで通った分岐が分かるように」と言われ、分岐ごとにブレークポイントを張って、止まるたびにキャプチャしていました。止めて、見て、`continue` するだけの作業が延々と続きます。

### 原因

ブレークポイントは「止めて調べる」ための機能です。通過したことを記録するだけなら、止める必要はありません。

### 対処

**`dprintf`（ダイナミック printf）**を使います。指定した行を通るたびにメッセージを出し、**止まらずにそのまま進みます**。ソースに `printf` を足す必要がないので、テスト対象を変更せずに済みます。

```text
# ut_trace.gdb：通過ルートと結果を記録する（全ケース共通）
set pagination off
set confirm off
dprintf order.c:22,"[通過] L22 数量範囲外 qty=%d\n", qty
dprintf order.c:26,"[通過] L26 単価取得エラー rc=%d\n", rc
dprintf order.c:28,"[通過] L28 金額計算 unit_price=%d qty=%d\n", unit_price, qty
dprintf order.c:30,"[通過] L30 1割引 amount(割引前)=%ld\n", *amount
dprintf order.c:45,"[結果] rc=%d amount=%ld\n", rc, amount
run
```

数量 100 のケースのログは次のようになります。28行目と30行目（割引）を通ったことと、そのときの値が残ります。

```text
[通過] L28 金額計算 unit_price=1200 qty=100
[通過] L30 1割引 amount(割引前)=120000
[結果] rc=0 amount=108000
rc=0 amount=108000
[Inferior 1 (process 393) exited normally]
```

分岐の行すべてに `dprintf` を置いておけば、全ケースを流したあとに「一度も `[通過]` が出ていない行」が、テストで通していない分岐（C1 網羅の漏れ）だと分かります。

> `dprintf` の行番号は、ソースを修正するとずれます。修正後の再テストでは、スクリプトの行番号が意図した行を指しているか、ログ先頭の `Dprintf 1 at ...: file order.c, line 22.` で確認してください。

## ハマりどころ6：「いつ・どの exe で」取ったエビデンスか分からない

### 症状

冒頭のとおり、レビューで「修正前の exe で取ったのでは？」と聞かれ、証明できませんでした。

### 原因

ログに、テスト対象を特定する情報が入っていませんでした。

### 対処

ログの先頭に**ヘッダ**を書きます。最低限、次の4つを入れます。

| 項目 | 取り方 | 目的 |
| --- | --- | --- |
| 実施日時 | `date '+%Y-%m-%d %H:%M:%S'` | いつ実施したか |
| 対象の exe | `md5sum ./order` | どのビルドで実施したか（再ビルドすると値が変わる） |
| gdb のバージョン | `gdb --version \| head -1` | 再現環境の記録 |
| 引数 | スクリプトの引数 | 何を入力したか |

```text
ケースID : UT-002
実施日時 : 2026-10-19 10:19:17
対象     : 9885ad42df86e6a39770189e0fd920c4  ./order
gdb      : GNU gdb (Ubuntu 15.1-1ubuntu1~24.04.1) 15.1
引数     : A001 0
----------------------------------------
```

修正のたびに md5 が変わるので、「全ケースが同じ md5 で実施されているか」をケース一覧で確認できます。

## ハマりどころ7：Excel に貼ると文字化け・表の崩れが起きる

### 症状

- サーバで作った CSV を Excel でダブルクリックして開くと、日本語が文字化けした
- ログを Excel に貼ったら、`+run` や `=====` の行が数式として扱われ、`#NAME?` になった
- ログの桁がそろわず、読みにくい

### 原因

- Linux で作ったファイルは UTF-8（BOM なし）です。Excel は CSV を開くとき、BOM がないと UTF-8 と判定しないことがあります
- 先頭が `+` `-` `=` のセルは、Excel が数式として解釈します
- 既定のフォント（プロポーショナル）では、空白で桁をそろえた出力がずれます

### 対処

- CSV の先頭に **UTF-8 の BOM** を付けて出力する（`printf '\357\273\277'`）
- ログを取り込む列は、値を入れる前に**書式を「文字列」**にする
- ログの列は **ＭＳ ゴシックなどの等幅フォント**にする

この3つは、次の「全ケース一括実行」と「VBA での取り込み」に組み込んであります。

## 全ケースを一括実行して、summary.csv を作る

テストケースを CSV に書きます（ケースID, 品目, 数量, 期待rc, 期待金額）。

```text
UT-001,A001,10,0,12000
UT-002,A001,0,-1,0
UT-004,A001,99,0,118800
UT-005,A001,100,0,108000
UT-006,A001,999,0,1078920
UT-007,A001,1000,-1,0
```

`run_all.sh` は、ケースごとにログを作り、`[結果]` と `[通過]` の行を抜き出して、期待値と比較した結果を `summary.csv` にまとめます。

```sh
#!/bin/sh
# cases.csv（ケースID,品目,数量,期待rc,期待金額）を順に実行し、
# ケースごとのログと Excel 貼り付け用の summary.csv を作る
TS=$(date +%Y%m%d_%H%M%S)
OUT=evidence/$TS
mkdir -p "$OUT"
SUMMARY=$OUT/summary.csv
printf '\357\273\277' > "$SUMMARY"   # UTF-8 BOM（Excel の文字化け防止）
echo "ケースID,品目,数量,期待rc,期待金額,実績rc,実績金額,判定,通過ルート,ログ" >> "$SUMMARY"

while IFS=, read -r CASE ITEM QTY EXP_RC EXP_AMT; do
  LOG=$OUT/$CASE.log
  {
    echo "ケースID : $CASE"
    echo "実施日時 : $(date '+%Y-%m-%d %H:%M:%S')"
    echo "対象     : $(md5sum ./order)"
    echo "gdb      : $(gdb --version | head -1)"
    echo "引数     : $ITEM $QTY"
    echo "----------------------------------------"
    gdb -q -batch -x ut_trace.gdb --args ./order "$ITEM" "$QTY" 2>&1 </dev/null
  } > "$LOG"

  RESULT=$(grep '^\[結果\]' "$LOG")
  ACT_RC=$(echo "$RESULT" | sed 's/.*rc=\([-0-9]*\).*/\1/')
  ACT_AMT=$(echo "$RESULT" | sed 's/.*amount=\([-0-9]*\).*/\1/')
  ROUTE=$(grep '^\[通過\]' "$LOG" | sed 's/^\[通過\] \(L[0-9]*\).*/\1/' | paste -sd' ' -)
  if [ "$ACT_RC" = "$EXP_RC" ] && [ "$ACT_AMT" = "$EXP_AMT" ]; then JUDGE=OK; else JUDGE=NG; fi
  echo "$CASE,$ITEM,$QTY,$EXP_RC,$EXP_AMT,$ACT_RC,$ACT_AMT,$JUDGE,$ROUTE,$CASE.log" >> "$SUMMARY"
  echo "$CASE $JUDGE"
done < cases.csv
echo "結果: $SUMMARY"
```

ポイントは次の3つです。

- 実行ごとに日時のフォルダ（`evidence/20261019_101841/`）を作るので、**前回のエビデンスを上書きしない**
- gdb に `</dev/null` を付けて、`while read` のループの入力（cases.csv）を gdb が読んでしまわないようにする
- 判定（OK/NG）はスクリプトが期待値と比較して出すので、**目視での転記ミスがなくなる**

実行結果は次のとおりです。

```text
$ ./run_all.sh
UT-001 OK
UT-002 OK
UT-004 OK
UT-005 OK
UT-006 OK
UT-007 OK
結果: evidence/20261019_101841/summary.csv
```

```text
ケースID,品目,数量,期待rc,期待金額,実績rc,実績金額,判定,通過ルート,ログ
UT-001,A001,10,0,12000,0,12000,OK,L28,UT-001.log
UT-002,A001,0,-1,0,-1,0,OK,L22,UT-002.log
UT-004,A001,99,0,118800,0,118800,OK,L28,UT-004.log
UT-005,A001,100,0,108000,0,108000,OK,L28 L30,UT-005.log
UT-006,A001,999,0,1078920,0,1078920,OK,L28 L30,UT-006.log
UT-007,A001,1000,-1,0,-1,0,OK,L22,UT-007.log
```

「通過ルート」列を見ると、L22・L28・L30 は通っていて、L26（単価取得エラー）だけがまだ通っていないことが分かります。L26 は、ハマりどころ4の `UT-003.gdb`（値の書き換え）で通します。

```sh
mkdir -p evidence/manual
{
  echo "ケースID : UT-003"
  echo "実施日時 : $(date '+%Y-%m-%d %H:%M:%S')"
  echo "対象     : $(md5sum ./order)"
  echo "----------------------------------------"
  gdb -q -batch -x UT-003.gdb --args ./order A001 10 2>&1
} | tee evidence/manual/UT-003.log
```

## Excel にまとめる

### シート構成

| シート | 中身 | 作り方 |
| --- | --- | --- |
| ケース一覧 | ケースID・入力・期待値・実績・判定・通過ルート | `summary.csv` を開いてコピーし、貼り付ける |
| UT-001, UT-002, … | ケースごとのログ全文 | 下の VBA で一括取り込み |

`summary.csv` は BOM 付きなので、Excel でダブルクリックして開いても文字化けしません。テスト仕様書の「実施結果」欄には、ケース一覧の「判定」「通過ルート」をそのまま転記（または参照）できます。

### ログをケースごとのシートに一括で取り込む VBA

WinSCP で `evidence/20261019_101841/` フォルダを Windows にコピーし、エビデンス用の Excel ブック（.xlsm）を同じ場所に保存します。標準モジュールに次のマクロを貼って実行すると、フォルダ内の `*.log` が1ファイル1シートで取り込まれます。

```vb
Option Explicit

' ブックと同じフォルダにある *.log を、1ファイル1シートで取り込む（UTF-8 のログに対応）
Sub ImportGdbLogs()
    Dim folder As String, fileName As String, text As String
    Dim stream As Object, ws As Worksheet
    Dim lines() As String, buf() As String, i As Long

    folder = ThisWorkbook.Path & "\"
    fileName = Dir(folder & "*.log")
    Do While fileName <> ""
        ' UTF-8 のテキストを読み込む
        Set stream = CreateObject("ADODB.Stream")
        stream.Charset = "UTF-8"
        stream.Open
        stream.LoadFromFile folder & fileName
        text = stream.ReadText
        stream.Close

        ' 1行1セルの配列にする（改行コード LF / CRLF の両方に対応）
        lines = Split(Replace(text, vbCr, ""), vbLf)
        ReDim buf(0 To UBound(lines), 0 To 0)
        For i = 0 To UBound(lines)
            buf(i, 0) = lines(i)
        Next i

        ' シートを追加して、文字列の書式にしてから一括で貼る
        Set ws = Worksheets.Add(After:=Worksheets(Worksheets.Count))
        ws.Name = Left(Replace(fileName, ".log", ""), 31)
        With ws.Range("A1").Resize(UBound(lines) + 1, 1)
            .NumberFormat = "@"
            .Value = buf
            .Font.Name = "ＭＳ ゴシック"
        End With
        ws.Columns("A").ColumnWidth = 120

        fileName = Dir()
    Loop
    MsgBox "取り込みが完了しました。"
End Sub
```

- 値を入れる前に `NumberFormat = "@"`（文字列）にしているので、`+run` や `=====` の行も数式にならずにそのまま入ります
- 1セルずつではなく配列で一括代入しているので、数百行のログでもすぐに終わります
- 同じ名前のシートがあるとエラーになります。取り込み直すときは、既存のログシートを削除してから実行してください

> この VBA は Windows 版 Excel 向けです。執筆環境（Linux）では実行していないため、初回はコピーしたブックで動作を確認してください。

### 画面キャプチャが必要な場合

「画面の見た目」自体がエビデンスとして求められる場合だけ、キャプチャを使います。その場合も、ログを正とし、キャプチャは補足として添付します。テキストのログがあれば、後から必要な部分を検索して示せるからです。

## 手順まとめ

1. `-g -O0` でビルドする
2. 分岐の行に `dprintf` を置いた共通スクリプト（`ut_trace.gdb`）を作る
3. 入力と期待値を `cases.csv` に書く
4. `run_all.sh` で全ケースを実行し、ログと `summary.csv` を作る
5. `summary.csv` の「通過ルート」で、通っていない分岐を確認する
6. 通っていない分岐は、ケース専用のスクリプトで `set var` を使って値を書き換えて通す
7. フォルダごと Windows にコピーし、`summary.csv` をケース一覧シートに貼り、VBA でログを取り込む

## チェックリスト

- [ ] `-g -O0` でビルドしたか（`<optimized out>` が出ていないか）
- [ ] エビデンスは画像ではなくテキストログで取っているか
- [ ] ログに、プログラム自身の出力（`printf` の結果）が入っているか
- [ ] ログ先頭に、実施日時・対象 exe の md5・引数が入っているか
- [ ] 全ケースが同じ md5 の exe で実施されているか
- [ ] 値を書き換えるケースは、代入が終わった後の行で `set var` しているか
- [ ] 書き換え前後の値を `print` でログに残しているか
- [ ] ソース修正後、`dprintf` の行番号がずれていないか
- [ ] すべての分岐行で `[通過]` が一度は出ているか
- [ ] 前回のエビデンスを上書きしていないか（日時フォルダに分かれているか）
- [ ] Excel のログ列は文字列書式・等幅フォントになっているか

## まとめ

gdb の UT で時間がかかっていた原因は、テスト自体ではなく「止める・キャプチャする・貼る」という手作業でした。gdb をスクリプトとバッチモードで動かし、`dprintf` で通過ルートを、`finish` と `printf` で結果を、シェルのヘッダで「いつ・どの exe か」をテキストに残せば、Excel には貼るだけ（VBA なら取り込むだけ）になります。

修正が入って再テストになっても、`./run_all.sh` を1回実行すれば、全ケースのエビデンスと OK/NG が新しいフォルダにそろいます。50ケースで丸1日かかっていた作業が、実行数秒と Excel への取り込み数分で終わるようになりました。
