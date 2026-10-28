---
series: 現場の声
no: 0027
title: 【C言語】gdbを使い倒す応用編。1000件中1件だけ金額がマイナスになるバグを、条件付きbreak・watch -l・.gdbinit・逆実行で追い詰める10のテクニック
slug: c-gdb-advanced-commands
category: C言語
tags: [C言語, gdb, デバッグ, ウォッチポイント, 条件付きブレークポイント, .gdbinit, 逆実行, fork]
technologies: [c]
excerpt: bt・break・print は使えるのに、1000件のうち1件だけおかしいデータを追うのに半日かかる。原因はgdbの「基本操作しか使っていない」ことでした。.gdbinit、構造体・リストの表示、$_streqでの文字列条件、commands、watch -l、until/advance/skip、set var/return、fork した子プロセスの追跡、record による逆実行まで、実務で効く応用テクニックを実際の出力付きでまとめました。
status: draft
created: 2026-10-28
---

# 【C言語】gdbを使い倒す応用編。1000件中1件だけ金額がマイナスになるバグを、条件付きbreak・watch -l・.gdbinit・逆実行で追い詰める10のテクニック

## 現場の声

> 夜間バッチの帳票で「合計金額が合わない」と問い合わせがありました。調べると、1000件の受注のうち1件だけ金額がマイナスになっていました。
>
> `bt`・`break`・`print` は使えるようになっていたので、gdb で追いかけ始めたのですが、
>
> - gdb を起動するたびに、同じブレークポイントと設定を打ち直す
> - 構造体を `print` すると1行に詰まって読めない。連結リストの150件目を見るのに `->next` を150回書けない
> - `break ... if o->cust == "C0000150"` と書いたのに、一度も止まらない
> - `watch` を張ったのに、関数を抜けたら消えてしまう
> - 帳票を出す処理は `fork` した子プロセスで動いていて、ブレークポイントで止まらない
> - `next` を押しすぎて通り過ぎ、`run` からやり直し
>
> と、gdb の操作そのものに時間を取られて、原因にたどり着くまで半日かかりました。

gdb の基本（落ちた場所を `bt` で見る、`break` で止める、`print` で見る）は「[gdbで「どこで・なぜ落ちたか」を10分で突き止める手順](/articles/c-gdb-debugging)」で、止まらないときのビルドの確認は「[gdbのブレークポイントで止まらない。原因はMakefileだった話](/articles/c-gdb-breakpoint-not-hit)」で、スクリプトとバッチ実行は「[gdbでの単体テスト、エビデンスを自動で揃える手順](/articles/gdb-ut-evidence-excel)」で扱いました。

この記事はその続きの**応用編**です。「どこで落ちたか」ではなく、**「大量のデータの中の1件が、いつ・どこでおかしくなったか」**を短時間で突き止めるためのコマンドを、上の6つの困りごとに沿って紹介します。

## 前提の構成

- OS：Ubuntu 24.04（RHEL 系でも同じ手順で使えます）
- gcc 13.3 / gdb 15.1
- ビルド：`gcc -g -O0 -Wall -o batch batch.c`（`-g` と `-O0` は必須です。理由は 0016 の記事を参照）

例として、受注1000件を読み込み、金額を計算し、キャンペーンの値引きをしてから、子プロセスで帳票を出す夜間バッチを使います。実際の現場のコードを、記事用に小さくしたものです。

```c
/* batch.c : 受注データを集計する夜間バッチ（記事用に簡略化） */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/wait.h>

typedef struct Order {
    int  id;
    char cust[9];          /* 顧客コード 8桁 + '\0' */
    int  qty;
    long amount;
    struct Order *next;
} Order;

static int unit_price(const char *cust)
{
    return (cust[7] == '7') ? 1200 : 1000;
}

static void calc_amount(Order *o)
{
    o->amount = (long)unit_price(o->cust) * o->qty;
    if (o->qty >= 100)
        o->amount = o->amount * 9 / 10;    /* 100個以上は1割引 */
}

static void apply_campaign(Order *head, const char *cust)
{
    for (Order *o = head; o != NULL; o = o->next) {
        if (strcmp(o->cust, cust) == 0)
            o->amount -= 500;               /* 500円引き */
    }
}

static Order *load_orders(int n)
{
    Order *head = NULL, **tail = &head;
    for (int i = 1; i <= n; i++) {
        Order *o = calloc(1, sizeof(Order));
        o->id = i;
        snprintf(o->cust, sizeof o->cust, "C%07d", i % 500);
        o->qty = (i * 37) % 150;
        *tail = o;
        tail = &o->next;
    }
    return head;
}

static void write_report(const Order *head)
{
    long total = 0;
    int  count = 0;
    for (const Order *o = head; o != NULL; o = o->next) {
        total += o->amount;
        count++;
    }
    printf("report: count=%d total=%ld\n", count, total);
    fflush(stdout);
}

int main(int argc, char *argv[])
{
    int n = (argc > 1) ? atoi(argv[1]) : 1000;
    Order *head = load_orders(n);

    for (Order *o = head; o != NULL; o = o->next)
        calc_amount(o);
    apply_campaign(head, "C0000150");

    pid_t pid = fork();
    if (pid == 0) {                         /* 子プロセスで帳票を出力 */
        write_report(head);
        _exit(0);
    }
    waitpid(pid, NULL, 0);
    puts("batch: done");
    return 0;
}
```

記事中で使う行番号は次のとおりです。

| 行 | 内容 |
| --- | --- |
| 23 | `calc_amount` で金額を計算する行 |
| 25 | 100個以上の1割引 |
| 30〜32 | `apply_campaign` のループと500円引き |
| 52 | `write_report` の先頭（子プロセスで動く） |
| 67〜69 | `main` の計算ループとキャンペーン呼び出し |
| 71 | `fork` |

先に答えを書いておくと、バグは**数量0（キャンセル）の受注にもキャンペーンの500円引きをしていて、金額が -500 円になる**ことです。この記事では、答えを知らない状態から gdb だけでここにたどり着く手順を追います。

## ハマりどころ1：起動するたびに、同じ設定とブレークポイントを打ち直している

### 症状

gdb を起動するたびに `set print pretty on` を打ち、`break` を3つ打ち、条件を付け直す。1日に20回起動すると、それだけで数十分かかります。上矢印で前回のコマンドを呼び出そうとしても、gdb を終了すると履歴が消えています。

### 原因

gdb の設定やブレークポイントは、何もしなければ**そのセッション限り**です。起動時に自動で読み込む設定ファイル（`.gdbinit`）を用意していないことが原因です。

### 対処

**① ホームディレクトリに `~/.gdbinit` を置き、全プロジェクト共通の設定を書く**

```text
# ~/.gdbinit : 全プロジェクト共通の設定
set history save on
set history size 10000
set history filename ~/.gdb_history
set history remove-duplicates unlimited
set pagination off
set confirm off
set print pretty on
set print elements 200
set print null-stop on
```

| 設定 | 効果 |
| --- | --- |
| `set history save on` ほか | コマンド履歴をファイルに保存する。次回の起動でも上矢印や `Ctrl+R` で前回のコマンドを呼び出せる |
| `set pagination off` | 出力が長いときの `--Type <RET> for more--` で止まらない |
| `set confirm off` | `run` のやり直しや `quit` で「本当にいいですか？」と聞かれない |
| `set print pretty on` | 構造体を1メンバ1行で表示する（ハマりどころ2） |
| `set print elements 200` | 配列・文字列の表示を200要素で打ち切る（`0` で無制限） |
| `set print null-stop on` | `char` 配列を、`'\0'` の位置で表示を止める（後ろのゴミを表示しない） |

**② プロジェクト専用の設定は、プロジェクトのフォルダの `./.gdbinit` に書く**

ユーザー定義コマンド（ハマりどころ3）やよく使うブレークポイントは、プロジェクトごとに `./.gdbinit` に書きます。ただし、**そのままでは読み込まれません**。gdb は、知らないフォルダの `.gdbinit` を勝手に実行しないように、次の警告を出して読み込みを断ります。

```text
warning: File "/home/dev/batch/.gdbinit" auto-loading has been declined by your `auto-load safe-path' set to "$debugdir:$datadir/auto-load".
To enable execution of this file add
	add-auto-load-safe-path /home/dev/batch/.gdbinit
line to your configuration file "/home/dev/.gdbinit".
```

警告に書いてあるとおり、`~/.gdbinit` に許可する行を足します。

```text
add-auto-load-safe-path /home/dev/batch/.gdbinit
```

> `set auto-load safe-path /`（すべて許可）でも警告は消えますが、他人が作ったフォルダの `.gdbinit` も実行されるようになります。共有サーバーでは、プロジェクトのパスだけを許可してください。

**③ その日に張ったブレークポイントは `save breakpoints` で保存する**

条件やコマンド（ハマりどころ4・5）を付けたブレークポイントは、ファイルに保存して次回 `source` で読み込めます。

```text
(gdb) save breakpoints bp.gdb
Saved to file 'bp.gdb'.
```

保存されたファイルは、そのまま gdb のスクリプトです。

```text
break calc_amount
  condition $bpnum $_streq(o->cust, "C0000150")
break batch.c:32
  commands
    silent
    printf "campaign: id=%d amount=%ld\n", o->id, o->amount
    continue
  end
tbreak write_report
```

次回は、起動時に `-x` で読み込むか、起動後に `source` します。

```text
$ gdb -q -x bp.gdb ./batch
```

## ハマりどころ2：構造体が1行に詰まって読めない、欲しいメンバだけ見られない

### 症状

```text
(gdb) print *head
$1 = {id = 1, cust = "C0000001", qty = 37, amount = 37000, next = 0x5555555592d0}
```

メンバが多い構造体だと横に長く折り返され、どれがどのメンバか分かりません。また、構造体の定義を確認するたびにソースを開いています。

### 原因

gdb の表示形式の設定と、型を調べるコマンドを使っていないことが原因です。

### 対処

**① `set print pretty on` で1メンバ1行にする**（ハマりどころ1の `.gdbinit` に入れておけば毎回不要）

```text
(gdb) set print pretty on
(gdb) print *head
$4 = {
  id = 1,
  cust = "C0000001",
  qty = 37,
  amount = 37000,
  next = 0x5555555592d0
}
```

**② 型は `ptype` / `whatis` で調べる**

```text
(gdb) ptype Order
type = struct Order {
    int id;
    char cust[9];
    int qty;
    long amount;
    struct Order *next;
}
(gdb) whatis head->cust
type = char [9]
(gdb) print sizeof(Order)
$6 = 40
```

`ptype` は中身まで展開し、`whatis` は型名だけを返します。ソースを開かなくても、「このメンバは `char [9]` だから、8桁＋終端で入る」とその場で確認できます。

**③ 表示形式と範囲を指定する**

```text
(gdb) print/x head->qty              ← 16進
$5 = 0x25
(gdb) print head->cust[1]@7          ← 配列の途中から7個
$4 = "0000001"
(gdb) print/c head->cust[0]          ← 文字として
$5 = 67 'C'
(gdb) x/s head->cust                 ← メモリを文字列として
0x5555555592a4:	"C0000001"
(gdb) x/16xb head                    ← 先頭から16バイトを16進で
0x5555555592a0:	0x01	0x00	0x00	0x00	0x43	0x30	0x30	0x30
0x5555555592a8:	0x30	0x30	0x30	0x31	0x00	0x00	0x00	0x00
```

`x/16xb` は「範囲外書き込みで隣のメンバが壊れていないか」を見るときに使います。`'\0'` の後ろや、メンバの間の詰め物（パディング）まで、メモリの並びそのものを確認できます。

**④ 表示した値は `$番号` で再利用する**

`print` の結果には `$1`、`$2` … と番号が付き、あとから式の中で使えます。直前の値は `$`、その前は `$$` です。

```text
(gdb) print head->amount
$1 = 37000
(gdb) print $ * 2
$2 = 74000
(gdb) print $1 + 1
$3 = 37001
```

長い式を何度も打ち直す代わりに、`$番号` で参照すると打ち間違いが減ります。

## ハマりどころ3：連結リストの150件目を見られない、マイナスのデータを探せない

### 症状

`print head->next->next->id` は書けますが、150件目を見るのに `->next` を149回は書けません。「`amount` がマイナスのものは何件目か」を探す方法も分かりません。

### 原因

gdb の中で**変数（コンビニエンス変数）とループ**が使えることを知らないのが原因です。

### 対処

**① `$` で始まる変数と `while` で、リストをたどる**

`apply_campaign` の後（71行目）で止めて、マイナスの受注を探します。

```text
(gdb) break batch.c:71
(gdb) run
(gdb) set $o = head
(gdb) while $o
 >if $o->amount < 0
  >printf "id=%d cust=%s qty=%d amount=%ld\n", $o->id, $o->cust, $o->qty, $o->amount
  >end
 >set $o = $o->next
 >end
id=150 cust=C0000150 qty=0 amount=-500
```

1000件の中から、**id=150、数量0、金額 -500 円**の1件が見つかりました。`$o` のように `$` で始まる名前は、プログラムの変数ではなく gdb が持つ変数です。型はそのとき代入した値の型（ここでは `Order *`）になります。

**② よく使う処理は `define` でコマンドにする**

毎回 `while` を打つのは大変なので、プロジェクトの `./.gdbinit` にユーザー定義コマンドとして書いておきます。

```text
# ./.gdbinit : このプロジェクト専用（batch）
define plist
  if $argc == 0
    set $o = head
  else
    set $o = $arg0
  end
  set $n = 0
  while $o && $n < 20
    printf "%4d %-8s qty=%3d amount=%7ld\n", $o->id, $o->cust, $o->qty, $o->amount
    set $o = $o->next
    set $n = $n + 1
  end
end
document plist
Order の連結リストを先頭から20件表示する。使い方: plist [先頭ポインタ]
end

define pneg
  set $o = $arg0
  while $o
    if $o->amount < 0
      printf "id=%d cust=%s qty=%d amount=%ld\n", $o->id, $o->cust, $o->qty, $o->amount
    end
    set $o = $o->next
  end
end
document pneg
amount がマイナスの受注だけを表示する。使い方: pneg 先頭ポインタ
end
```

```text
(gdb) plist
   1 C0000001 qty= 37 amount=  37000
   2 C0000002 qty= 74 amount=  74000
   3 C0000003 qty=111 amount=  99900
   4 C0000004 qty=148 amount= 133200
   ...（20件まで）
(gdb) plist head->next->next
   3 C0000003 qty=111 amount=  99900
   ...
(gdb) pneg head
id=150 cust=C0000150 qty=0 amount=-500
(gdb) help plist
Order の連結リストを先頭から20件表示する。使い方: plist [先頭ポインタ]
```

- 引数は `$arg0`、`$arg1` …、引数の個数は `$argc` で受け取ります。
- `document` を書いておくと `help` で説明が出るので、チームで共有するときに使い方を伝えやすくなります。
- **件数の上限（ここでは20件）を必ず付けます。** リストが壊れて循環していると、`while` が終わらなくなるためです（止まらなくなったら `Ctrl+C`）。

## ハマりどころ4：条件付きブレークポイントで、文字列の条件が効かない

### 症状

顧客コード `C0000150` の受注で止めたくて、次のように書きました。

```text
(gdb) break calc_amount if o->cust == "C0000150"
Breakpoint 1 at 0x12c2: file batch.c, line 23.
(gdb) run
[Detaching after fork from child process 454]
report: count=1000 total=72098660
batch: done
[Inferior 1 (process 451) exited normally]
```

エラーにならないのに、**一度も止まらずに終わります**。

### 原因

C言語と同じで、`==` は文字列の中身ではなく**配列とリテラルの比較**になるため、常に偽（0）になります。止めてから確認すると、中身が同じでも 0 です。

```text
(gdb) print head->cust == "C0000001"
$1 = 0
(gdb) print $_streq(head->cust, "C0000001")
$2 = 1
```

### 対処

**① 文字列の比較は `$_streq` を使う**

gdb には、条件式で使える便利関数が用意されています。

| 関数 | 用途 |
| --- | --- |
| `$_streq(a, b)` | 文字列が等しいか（`strcmp(a, b) == 0` に相当） |
| `$_strlen(s)` | 文字列の長さ |
| `$_memeq(a, b, n)` | 先頭 n バイトが等しいか（`memcmp` に相当。固定長の項目向き） |
| `$_regex(s, "正規表現")` | 正規表現に一致するか |

```text
(gdb) break calc_amount if $_streq(o->cust, "C0000150")
Breakpoint 1 at 0x12c2: file batch.c, line 23.
(gdb) run
Breakpoint 1, calc_amount (o=0x55555555ae90) at batch.c:23
23	    o->amount = (long)unit_price(o->cust) * o->qty;
(gdb) print *o
$1 = {id = 150, cust = "C0000150", qty = 0, amount = 0, next = 0x55555555aec0}
```

> プログラム自身の `strcmp` を条件に書く方法（`if strcmp(o->cust, "C0000150") == 0`）もありますが、止まるたびにプログラムの関数を呼び出すので遅く、関数が呼べない状態だとエラーになります。`$_streq` は gdb の中だけで比較するので、こちらを使います。

**② 条件は後から付け外しする（`condition`）**

条件を変えるたびにブレークポイントを消して作り直す必要はありません。番号を指定して条件だけを変えます。

```text
(gdb) break calc_amount
Breakpoint 1 at 0x12c2: file batch.c, line 23.
(gdb) condition 1 o->qty == 0              ← 数量0のときだけ止める
(gdb) run
Breakpoint 1, calc_amount (o=0x55555555ae90) at batch.c:23
(gdb) print o->id
$1 = 150
(gdb) condition 1                          ← 条件を外す
Breakpoint 1 now unconditional.
```

**③ 「N回目」で止める（`ignore`）、1回だけ止める（`tbreak`）**

```text
(gdb) ignore 1 99
Will ignore next 99 crossings of breakpoint 1.
(gdb) tbreak write_report
Temporary breakpoint 2 at 0x5555555554c0: file batch.c, line 52.
(gdb) info breakpoints
Num     Type           Disp Enb Address            What
1       breakpoint     keep y   0x00005555555552c2 in calc_amount at batch.c:23
	breakpoint already hit 1 time
	ignore next 99 hits
2       breakpoint     del  y   0x00005555555554c0 in write_report 
                                                   at batch.c:52
```

- `ignore 1 99` は、ブレークポイント1を次の99回は素通りし、100回目で止めます。**「何件目で壊れるか分からないが、500件目より後」**のような絞り込みに使えます。
- `info breakpoints` の `breakpoint already hit N times` で、**その行を何回通ったか**が分かります。ループの回数が想定どおりかの確認にも使えます。
- `tbreak` は1回止まると自動で消えるブレークポイントです（`Disp` が `del`）。
- 一時的に止めたくないときは、消さずに `disable 番号`、戻すときは `enable 番号` を使います。

## ハマりどころ5：止まるたびに、同じ `print` を何回も打っている

### 症状

ブレークポイントで止まるたびに `print o->id`、`print o->amount`、`continue` を打つ。100回止まると300回の入力になります。

### 原因

ブレークポイントには、**止まったときに自動で実行するコマンド**を登録できます。これを使っていないのが原因です。

### 対処

**① `commands` で、止まったときの処理を登録する**

500円引きをしている32行目を通るたびに、値引き前後の金額を出力して、そのまま進めます。

```text
(gdb) break batch.c:32
Breakpoint 1 at 0x136b: file batch.c, line 32.
(gdb) commands
Type commands for breakpoint(s) 1, one per line.
End with a line saying just "end".
>silent
>printf "campaign: id=%d qty=%d amount=%ld -> %ld\n", o->id, o->qty, o->amount, o->amount - 500
>continue
>end
(gdb) run
campaign: id=150 qty=0 amount=0 -> -500
campaign: id=650 qty=50 amount=50000 -> 49500
[Detaching after fork from child process 503]
report: count=1000 total=72098660
batch: done
```

- `silent`：止まったときの `Breakpoint 1, ...` の表示を出さない
- `printf`：C言語の `printf` と同じ書式で、必要な値だけを1行で出す
- `continue`：止まらずに進む

この出力で、**数量0（金額0円）の受注にも500円引きをしている**ことが一目で分かりました。

> 「通ったら1行出して進むだけ」なら `dprintf` でも同じことができます（0021 の記事で解説）。`commands` は、`if` で分岐したり、条件を満たしたときだけ止める（`continue` を書かない）など、**処理を組み立てたいとき**に使います。

**② 1行進むたびに見たい値は `display` に登録する**

```text
(gdb) display o->qty
1: o->qty = 111
(gdb) display/x o->amount
2: /x o->amount = 0x1b198
(gdb) info display
Auto-display expressions now in effect:
Num Enb Expression
1:   y  o->qty
2:   y  /x o->amount
(gdb) undisplay 1
```

`display/x` のように表示形式も指定できます。不要になったら `undisplay 番号` で外します。

## ハマりどころ6：`watch` が関数を抜けると消える、条件付き `watch` が別の変数を見る

### 症状

id=150 の `amount` がどこで -500 に書き換わるのかを知りたくて、`calc_amount` で止めてから `watch` を張りました。

```text
(gdb) break calc_amount if o->id == 150
(gdb) run
Breakpoint 1, calc_amount (o=0x55555555ae90) at batch.c:23
(gdb) watch o->amount
Hardware watchpoint 2: o->amount
(gdb) continue
Continuing.

Watchpoint 2 deleted because the program has left the block in
which its expression is valid.
main (argc=1, argv=0x7fffffffbbb8) at batch.c:67
```

`calc_amount` を抜けた瞬間に、ウォッチポイントが消えてしまいました。

### 原因

`watch o->amount` は、「**`o` という式**が指す `amount`」を見張ります。`o` は `calc_amount` のローカル変数なので、関数を抜けると式が評価できなくなり、ウォッチポイントは自動で削除されます。

### 対処

**① `watch -l`（`-location`）で、式ではなく「アドレス」を見張る**

```text
(gdb) watch -l o->amount
Hardware watchpoint 2: -location o->amount
(gdb) delete 1
(gdb) continue
Continuing.

Hardware watchpoint 2: -location o->amount

Old value = 0
New value = -500
apply_campaign (head=0x5555555592a0, cust=0x555555556026 "C0000150")
    at batch.c:30
30	    for (Order *o = head; o != NULL; o = o->next) {
(gdb) bt
#0  apply_campaign (head=0x5555555592a0, cust=0x555555556026 "C0000150")
    at batch.c:30
#1  0x00005555555555ae in main (argc=1, argv=0x7fffffffbbb8) at batch.c:69
```

`-l` を付けると、張った時点の `o->amount` のアドレスを見張り続けるので、関数を抜けても消えません。**`apply_campaign` の中で 0 → -500 に書き換わった**ことが分かりました。

> **止まった行は「書き換えた行の次」です。** ウォッチポイントは書き込みが終わった直後に止まるため、表示される行（30行目）ではなく、その直前に実行した行（32行目の `o->amount -= 500;`）が書き換えた犯人です。

また、`calc_amount` の中で `0 * 1000 = 0` を代入したときは止まっていません。ハードウェアウォッチポイントは、**値が変わったとき**だけ止まります。

**② 条件付き `watch` は、変数ではなくアドレスで条件を書く**

「マイナスになったときだけ止めたい」と思って、次のように書くと危険です。

```text
(gdb) watch -l o->amount if o->amount < 0      ← ✕
```

条件の `o` は、**止まった場所のスコープ**で評価されます。`apply_campaign` で止まったときの `o` は、`apply_campaign` のループ変数（今処理している別の受注）なので、見張っている受注とは別のデータを見て判定してしまいます。

アドレスを gdb の変数に取っておき、それで条件を書きます。

```text
(gdb) set $amt = &o->amount
(gdb) watch -l *$amt if *$amt < 0
Hardware watchpoint 2: -location *$amt
(gdb) continue

Hardware watchpoint 2: -location *$amt

Old value = 0
New value = -500
apply_campaign (head=0x5555555592a0, cust=0x555555556026 "C0000150")
    at batch.c:30
```

**③ 読み込みも見張れる（`rwatch` / `awatch`）**

| コマンド | 止まるとき |
| --- | --- |
| `watch` | 書き込みで値が変わったとき |
| `rwatch` | 読み込まれたとき |
| `awatch` | 読み込み・書き込みのどちらでも |

`rwatch` は「この値を参照しているのはどこか」を探すときに使います。ただし、`strcmp` などのライブラリ関数は高速化のため隣のメモリもまとめて読むので、**見張っていない隣のメンバを読んだだけでも止まる**ことがあります（今回の例でも、`cust` を比較する `strcmp` の中で `qty` の `rwatch` に引っかかりました）。

> ハードウェアウォッチポイントは、CPU の機能を使うので高速ですが、x86_64 では同時に4か所（合計32バイト）程度までです。数を超えたり、大きな構造体全体を見張ったりすると `Software watchpoint` になり、1命令ずつ実行するため**極端に遅く**なります。見張るのは、本当に必要なメンバだけにします。

## ハマりどころ7：`next` を連打して、ループや関係ない関数で時間を使う

### 症状

1000回まわるループの後ろを見たいのに、`next` を押すとループの先頭に戻ってしまう。`step` で自分の関数に入りたいのに、毎回 `unit_price` のような小さな関数に入ってしまう。

### 原因

「指定した場所まで進める」コマンドと、「この関数には入らない」設定を使っていないことが原因です。

### 対処

**① ループを抜けるまで進める：`until`**

ループの最後の行（45行目）で `until` を打つと、ループの先頭に戻ったあと、**ループを抜けるまで一気に進みます**。

```text
Breakpoint 1, load_orders (n=1000) at batch.c:45
45	        tail = &o->next;
(gdb) until
39	    for (int i = 1; i <= n; i++) {
(gdb) until
47	    return head;
```

`next` なら 1000 × 7 行分の入力が必要なところを、2回で抜けられます。行番号を指定して `until 47` と書くこともできます。

**② 指定した行まで進める：`advance`**

```text
Breakpoint 1, main (argc=1, argv=0x7fffffffbbb8) at batch.c:64
64	    int n = (argc > 1) ? atoi(argv[1]) : 1000;
(gdb) advance 69
main (argc=1, argv=0x7fffffffbbb8) at batch.c:69
69	    apply_campaign(head, "C0000150");
```

`advance` は、一時的なブレークポイントを張って `continue` するのと同じです。読み込みと計算の1000件のループを、1回の入力で通り過ぎます。

**③ 入りたくない関数を登録する：`skip`**

```text
(gdb) skip function unit_price
Function unit_price will be skipped when stepping.
(gdb) break calc_amount
(gdb) run
Breakpoint 1, calc_amount (o=0x5555555592a0) at batch.c:23
23	    o->amount = (long)unit_price(o->cust) * o->qty;
(gdb) step
24	    if (o->qty >= 100)
```

`step` しても `unit_price` には入りません。共通部品のファイルごと飛ばすなら `skip file common.c`、登録したものは `info skip` で確認できます。`skip` も `./.gdbinit` に書いておけます。

**④ 今の関数を最後まで進める：`finish`**

うっかり入ってしまった関数は、`finish` で呼び出し元に戻ります。戻り値も表示されます。

## ハマりどころ8：異常系を試すたびに、ソースを書き換えてビルドし直している

### 症状

「単価が取れなかったら？」「数量が100以上だったら？」を試すたびに、テスト用にソースを書き換えてビルドし直し、試したあとに元に戻す。戻し忘れのリスクもあります。

### 原因

gdb で、**実行中の変数の値や関数の戻り値をその場で変えられる**ことを使っていないのが原因です。

### 対処

**① 変数を書き換える：`set var`**

数量0の受注（id=150）を、数量120に書き換えて、1割引のルートを通します。

```text
Breakpoint 1, calc_amount (o=0x55555555ae90) at batch.c:23
23	    o->amount = (long)unit_price(o->cust) * o->qty;
(gdb) set var o->qty = 120
(gdb) next
24	    if (o->qty >= 100)
(gdb) next
25	        o->amount = o->amount * 9 / 10;    /* 100個以上は1割引 */
(gdb) next
26	}
(gdb) print o->amount
$2 = 108000
```

`120 × 1000 × 0.9 = 108000` で、割引の計算が正しいことが確認できました。

> 書き換えるタイミングに注意してください。値を使う行を実行した**後**に書き換えても、結果には反映されません。0021 の記事のハマりどころ4も参照してください。

**② 関数をその場で呼ぶ：`print 関数(引数)`**

```text
(gdb) print unit_price("C0000007")
$1 = 1200
```

末尾が7の顧客は単価1200円になることを、プログラムを動かさずに確認できます。

**③ 関数の戻り値を差し替える：`return`**

`unit_price` で止めて、戻り値を 9999 にして呼び出し元に戻します（`set confirm off` にしている場合、確認は出ません）。

```text
Breakpoint 1, unit_price (cust=0x5555555592a4 "C0000001") at batch.c:18
18	    return (cust[7] == '7') ? 1200 : 1000;
(gdb) return 9999
Make unit_price return now? (y or n) y
#0  0x00005555555552d2 in calc_amount (o=0x5555555592a0) at batch.c:23
(gdb) next
24	    if (o->qty >= 100)
(gdb) print o->amount
$1 = 369963
```

`9999 × 37 = 369963` で、差し替えた単価で計算されています。DB や外部ファイルから値を取る関数でも、**エラーの戻り値を返させれば異常系のルートを通せます**。

**④ 行を飛ばす：`jump`**

`jump 26` で25行目（割引）を実行せずに26行目から再開できます。ただし、`jump` は**その行から `continue` する**ので、止めたい場合は先に `tbreak 26` を張っておきます。

```text
(gdb) tbreak 26
(gdb) jump 26
Continuing at 0x55555555532f.

Temporary breakpoint 2, calc_amount (o=0x555555559300) at batch.c:26
26	}
```

> `jump` は、変数の初期化を飛ばすなど、通常では起きない状態を作れてしまいます。関数をまたいで飛ぶのは避け、同じ関数の中で使ってください。

## ハマりどころ9：`fork` した子プロセスで、ブレークポイントに止まらない

### 症状

帳票を出す `write_report` にブレークポイントを張ったのに、止まらずに最後まで実行されます。

```text
(gdb) break write_report
Breakpoint 1 at 0x14c0: file batch.c, line 52.
(gdb) run
[Detaching after fork from child process 705]
report: count=1000 total=72098660
batch: done
[Inferior 1 (process 702) exited normally]
```

### 原因

`write_report` は `fork` した**子プロセス**で動いています。gdb は標準では親プロセスを追い続け、子プロセスは切り離します（`Detaching after fork from child process`）。そのため、子プロセス側のブレークポイントでは止まりません。

### 対処

**① 子プロセスを追う：`set follow-fork-mode child`**

```text
(gdb) set follow-fork-mode child
(gdb) break write_report
(gdb) run
[Attaching after Thread 0x7ffff7fad740 (LWP 714) fork to child process 717]
[New inferior 2 (process 717)]
[Detaching after fork from parent process 714]
[Inferior 1 (process 714) detached]

Thread 2.1 "batch" hit Breakpoint 1, write_report (head=0x5555555592a0)
    at batch.c:52
52	    long total = 0;
(gdb) bt
#0  write_report (head=0x5555555592a0) at batch.c:52
#1  0x00005555555555c8 in main (argc=1, argv=0x7fffffffbbb8) at batch.c:73
```

子プロセスで止まりました。

**② 親も子も止めたまま行き来する：`set detach-on-fork off`**

```text
(gdb) set detach-on-fork off
(gdb) info inferiors          ← プロセスの一覧
(gdb) inferior 1              ← 親プロセスに切り替える
```

親と子の両方を gdb の管理下に置き、`inferior 番号` で切り替えます。親が子の終了を待つ処理（`waitpid`）がある場合は、子を進めないと親も進まないので注意します。

**③ スレッドの場合**

`pthread` で複数スレッドが動いているプログラムでは、次のコマンドを使います。

| コマンド | 用途 |
| --- | --- |
| `info threads` | スレッドの一覧と、それぞれが今どこにいるか |
| `thread 番号` | スレッドを切り替える |
| `thread apply all bt` | **全スレッドのバックトレース**を一度に出す（固まったプロセスの調査で最初に打つ） |
| `set scheduler-locking step` | `step`/`next` の間、他のスレッドを止めておく |
| `break 行 thread 番号` | 特定のスレッドでだけ止める |

デッドロックで固まったプロセスにアタッチ（`gdb -p PID`）して `thread apply all bt` を打つと、どのスレッドがどのロックを待っているかが分かります。

## ハマりどころ10：行き過ぎて、`run` から最初からやり直している

### 症状

おかしな値になったところまで進めたものの、「その直前に何が起きたか」を見る前に通り過ぎてしまう。`run` からやり直すと、また1000件分の待ち時間がかかります。

### 原因

gdb には、実行を記録して**巻き戻す（逆実行）**機能があります。これを知らないのが原因です。

### 対処

**① `record` してから進め、`reverse-*` で戻る**

```text
Breakpoint 1, calc_amount (o=0x555555560740) at batch.c:23
23	    o->amount = (long)unit_price(o->cust) * o->qty;
(gdb) record
(gdb) next
24	    if (o->qty >= 100)
(gdb) next
25	        o->amount = o->amount * 9 / 10;    /* 100個以上は1割引 */
(gdb) next
26	}
(gdb) print o->amount
$1 = 90900
(gdb) reverse-next
25	        o->amount = o->amount * 9 / 10;    /* 100個以上は1割引 */
(gdb) print o->amount
$2 = 101000
```

`reverse-next` で1行戻ると、**変数の値も戻ります**（割引前の 101000）。`reverse-step`、`reverse-continue`、`reverse-finish` もあります。記録を止めるときは `record stop` です。

**② `watch` と組み合わせると、「誰が書き換えたか」を後ろ向きに探せる**

いちばん強力なのはこの使い方です。おかしな値を見つけた時点から、**ウォッチポイントを張って逆向きに `continue`** すると、最後に書き換えた場所で止まります。

```text
(gdb) break apply_campaign
(gdb) run
(gdb) record
(gdb) advance 71
main (argc=1, argv=0x7fffffffbb88) at batch.c:71
71	    pid_t pid = fork();
(gdb) set $o = head
(gdb) while $o->id != 150
 >set $o = $o->next
 >end
(gdb) print $o->amount
$1 = -500
(gdb) watch -l $o->amount
Hardware watchpoint 2: -location $o->amount
(gdb) reverse-continue
Continuing.

Hardware watchpoint 2: -location $o->amount

Old value = -500
New value = 0
0x000055555555537e in apply_campaign (head=0x5555555592a0, 
    cust=0x555555556026 "C0000150") at batch.c:32
32	            o->amount -= 500;               /* 500円引き */
(gdb) print o->id
$2 = 150
```

**-500 円を作ったのは32行目の `o->amount -= 500;`**、と1回で特定できました。逆向きなので `Old value`（-500）と `New value`（0）の表示も逆になります。

**③ 「Process record does not support instruction」で止まる場合**

最近の CPU と glibc の組み合わせでは、`record` 中に `strcmp` などのライブラリ関数を通ると、次のエラーで記録が止まることがあります。

```text
Process record does not support instruction 0x62 at address 0x7ffff7d9b436.
Process record: failed to record execution log.

Program stopped.
__strcmp_evex () at ../sysdeps/x86_64/multiarch/strcmp-evex.S:314
```

glibc が、gdb の記録機能が対応していない AVX-512 命令（EVEX）の版の `strcmp` を使っていることが原因です。`run` の**前に**、glibc に古い命令の版を使わせる環境変数を設定すると回避できます。

```text
(gdb) set environment GLIBC_TUNABLES=glibc.cpu.hwcaps=-AVX512F,-AVX2
(gdb) run
```

> `record` は1命令ずつ記録するため、通常の数百倍遅くなり、メモリも使います。プログラムの最初からではなく、**怪しい範囲の直前で `record` を始める**のがコツです。範囲が広くて現実的でない場合は、`rr`（記録・再生専用のデバッガ）を使う方法もあります。

## 応用編のコマンド早見表

基本のコマンドは 0007 の記事の早見表を参照してください。ここでは応用編で使ったものをまとめます。

| やりたいこと | コマンド |
| --- | --- |
| 起動時に設定を読み込む | `~/.gdbinit`、`./.gdbinit`（＋ `add-auto-load-safe-path`） |
| ブレークポイントを保存・復元 | `save breakpoints ファイル` / `source ファイル` |
| 構造体を見やすく表示 | `set print pretty on` |
| 型を調べる | `ptype 型や式` / `whatis 式` |
| メモリをそのまま見る | `x/16xb アドレス` / `x/s アドレス` |
| 前の結果を使う | `$` / `$$` / `$番号` |
| gdb の変数とループ | `set $p = head` / `while 条件 ... end` |
| ユーザー定義コマンド | `define 名前 ... end` / `document 名前 ... end` |
| 文字列で条件付きブレーク | `break 場所 if $_streq(式, "文字列")` |
| 条件を後から変更・解除 | `condition 番号 式` / `condition 番号` |
| N回素通りする | `ignore 番号 回数` |
| 1回だけ止まる | `tbreak 場所` |
| 一時的に無効・有効 | `disable 番号` / `enable 番号` |
| 止まったら自動で実行 | `commands 番号 ... end`（`silent` / `continue`） |
| 1行ごとに自動表示 | `display/形式 式` / `undisplay 番号` |
| アドレスを見張る | `watch -l 式` |
| 読み込みを見張る | `rwatch 式` / `awatch 式` |
| ループを抜けるまで進む | `until` / `until 行` |
| 指定行まで進む | `advance 行` |
| 関数に入らない | `skip function 名前` / `skip file ファイル` |
| 変数を書き換える | `set var 式 = 値` |
| 関数を呼ぶ | `print 関数(引数)` |
| 戻り値を差し替えて戻る | `return 値` |
| 行を飛ばす | `tbreak 行` → `jump 行` |
| 子プロセスを追う | `set follow-fork-mode child` |
| 親子両方を管理する | `set detach-on-fork off` / `info inferiors` / `inferior 番号` |
| 全スレッドの呼び出し履歴 | `thread apply all bt` |
| 実行を記録・巻き戻す | `record` / `reverse-next` / `reverse-continue` / `record stop` |

## 「1件だけおかしい」を追い詰める手順（まとめ）

### 1. 準備（最初に1回）

1. `~/.gdbinit` に履歴の保存・`print pretty`・`pagination off` を書く
2. プロジェクトの `./.gdbinit` に、データ構造を表示するユーザー定義コマンド（`plist` など）を書き、`add-auto-load-safe-path` で許可する

### 2. おかしなデータを特定する

1. 処理の終わりに近い行（今回は71行目）で止める
2. ユーザー定義コマンドや `while` で、**おかしなデータが何件目・どのキーか**を特定する（今回は id=150）

### 3. いつ・どこで壊れたかを特定する

- **前から追う場合**：そのデータのときだけ止まる条件付きブレークポイント（`if o->id == 150` / `$_streq`）で止め、`watch -l` でアドレスを見張って `continue`
- **後ろから追う場合**：怪しい範囲の手前で `record`、壊れた後で `watch -l` を張って `reverse-continue`
- 止まった行の**直前の行**が書き換えた行

### 4. 直し方を確認する

1. `set var` や `return` で、修正後の値やエラーの戻り値を作って、別のルートも試す
2. ソースを直してビルドし、同じ `bp.gdb` を `-x` で読み込んで再確認する

今回の修正は、キャンペーンの対象を「数量が1以上の受注」に限定することです。

```c
        if (strcmp(o->cust, cust) == 0 && o->qty > 0)
            o->amount -= 500;               /* 500円引き */
```

## チェックリスト

- [ ] `-g -O0` でビルドしている（0016 の記事）
- [ ] `~/.gdbinit` に履歴の保存・`print pretty`・`pagination off` を書いた
- [ ] プロジェクトの `./.gdbinit` を `add-auto-load-safe-path` で許可した
- [ ] よく張るブレークポイントは `save breakpoints` で保存している
- [ ] 文字列の条件は `==` ではなく `$_streq` で書いている
- [ ] 条件を変えるときは `condition` で付け替えている（作り直していない）
- [ ] 止まるたびに打つコマンドは `commands` か `display` に登録した
- [ ] ローカル変数経由の `watch` には `-l` を付けている
- [ ] 条件付き `watch` の条件は、ローカル変数ではなくアドレス（`$変数`）で書いている
- [ ] ウォッチポイントで止まったら、表示された行の**直前の行**を確認している
- [ ] `fork` する処理は `follow-fork-mode` を設定してから追っている
- [ ] `record` は怪しい範囲の直前から始めている

## まとめ

- gdb の基本操作（`bt` / `break` / `print`）だけでは、**大量データの中の1件**を追うのに時間がかかります。時間を取られているのは、バグではなく gdb の操作です。
- **`.gdbinit` とユーザー定義コマンド**で毎回の準備をなくし、**`$_streq`・`condition`・`ignore`** で「その1件」だけで止め、**`watch -l`** で書き換えた場所を捕まえます。
- 行き過ぎても、**`record` と `reverse-continue`** で戻れます。`watch` と組み合わせると、「この値を最後に書き換えたのは誰か」を後ろ向きに一発で探せます。

今回のバグは、ソースを読めば1行の条件漏れでした。しかし1000件・複数の関数・子プロセスにまたがると、読むだけで見つけるのは大変です。gdb に「その1件で止まって、書き換えた瞬間を教えて」と頼めるようになると、調査の時間は半日から数分になります。
