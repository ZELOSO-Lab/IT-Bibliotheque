---
series: 現場の声
no: 0031
title: 【C言語】ループの中で i++ しただけなのに、1 のはずが 5桁の数字に。原因は「見るタイミング」「別の i」「範囲外書き込み」「最適化」「printf の書式」。切り分け手順と対処法
slug: c-loop-counter-garbage-value
category: C言語
tags: [C言語, 変数, 初期化, シャドーイング, バッファオーバーフロー, gdb, watch, 最適化, printf, AddressSanitizer, Valgrind]
technologies: [c]
excerpt: int i = 0; でループの中で i++ しただけなのに、確認したら 1 ではなく -18136 や 32767 のような5桁の数字。原因は「初期化前の値を見ている」「別スコープの i を見ている」「配列の範囲外書き込みで上書きされた」「-O2 で gdb の表示がずれる」「printf の書式違い」のどれかです。gcc 13 / gdb 15 で再現した実行結果付きで、5分で切り分ける手順と再発防止のビルドオプションをまとめました。
status: draft
created: 2026-11-11
---

# 【C言語】ループの中で i++ しただけなのに、1 のはずが 5桁の数字に。原因は「見るタイミング」「別の i」「範囲外書き込み」「最適化」「printf の書式」。切り分け手順と対処法

## 現場の声

> こんなコードを書きました。
>
> ```c
> int i = 0;
>
> for (int iCnt = 0; iCnt < 10; iCnt++) {
>     if (…条件…) {
>         i++;
>     }
> }
> ```
>
> `i++` のあとで `i` の値を確認したら、**1 ではなく5桁の数字**が入っていました。`int i = 0;` で初期化しているのに、なぜ？

`int i = 0;` と書いてあるのに `i` がおかしな値に見えるとき、原因は「`i++` が壊れている」ことではありません。ほとんどは次の5つのどれかです。

1. **初期化される前の `i` を見ている**（確認するタイミングの問題）
2. **別の `i` を見ている**（ループの中で宣言し直した、グローバルの `i` が見えている）
3. **配列の範囲外書き込みで `i` が上書きされた**（本当に値が壊れている）
4. **最適化（`-O2`）のせいで gdb の表示が当てにならない**
5. **printf の書式や引数が間違っている**（値は正しく、表示だけがおかしい）

この記事では、5つすべてを実際に再現し、**どこで見たか（gdb か printf か）から原因を絞り込む手順**と、再発させないためのビルドオプションをまとめます。

コードはすべて gcc 13.3 / gdb 15.1（Ubuntu 24.04、x86-64）で実行して確認しています。ゴミ値の具体的な数字は環境や実行のたびに変わるので、「こういう形の数字になる」という目安として読んでください。

> 補足：いただいたコードの `for(int iCnt=0; iCnt<10; iCnt++;)` は、`iCnt++` の後ろに `;` があるので本来はコンパイルエラーになります（`error: expected ')' before ';' token`）。記事への転記時に付いたものとして、ここでは `iCnt++)` として扱います。

## まず結論：どこで見たかで原因を絞る

| 5桁の値を見た場所 | 疑う原因 | すぐできる確認 |
| --- | --- | --- |
| gdb で止めて `print i` | 初期化前・実行前の行で止まっている（ハマりどころ1・2） | `next` で1行進めてからもう一度 `print i` |
| gdb で止めて `print i` | 別の関数のフレームにいる／グローバルの `i` が見えている（ハマりどころ4） | `bt` と `info locals`、`frame` で `i` のあるフレームへ |
| gdb で止めて `print i` | `-O2` でビルドしている（ハマりどころ6） | `-O0 -g` で作り直して同じ手順 |
| printf で出力 | ループの中で `int i;` を宣言し直している（ハマりどころ3） | `-Wshadow` を付けてコンパイル |
| printf で出力 | 書式や引数の間違い（ハマりどころ7） | `-Wall`（`-Wformat`）の警告を見る |
| どちらで見ても、途中から値が飛ぶ | 配列の範囲外書き込み（ハマりどころ5） | gdb の `watch i`、または `-fsanitize=address` |

5桁のゴミ値でよく見るのが **`32767`（16進で `0x7fff`）** や **`21845`（`0x5555`）**、**`-18136` のような負の数**です。これらは**スタックに残っていたアドレスの一部**であることが多く（x86-64 Linux ではスタックのアドレスが `0x7fff…`、プログラム本体のアドレスが `0x5555…` で始まりやすい）、「初期化前の値」や「関係ない場所の値」を見ているサインです。

## 前提の構成

以降の例は、この形を基本にします（`check()` は「偶数なら真」を返すだけの関数で、正しく動けば `i` は 5 になります）。

```c
#include <stdio.h>
static int check(int n) { return n % 2 == 0; }
int main(void)
{
    int i = 0;
    int iCnt;

    for (iCnt = 0; iCnt < 10; iCnt++) {
        if (check(iCnt)) {
            i++;
        }
    }
    printf("i = %d\n", i);
    return 0;
}
```

```
$ gcc -O0 -g a.c -o a
$ ./a
i = 5
```

コード自体は正しく、printf で見れば `i = 5` です。それでも「5桁の数字」が見えるのはどんなときかを、順番に見ていきます。

## ハマりどころ1：初期化される前の i を gdb で見ている（いちばん多い）

gdb で `break main` して `run` すると、**`int i = 0;` の行で止まります**。この時点ではまだ `i = 0` は実行されていません。ここで `print i` すると、スタックに残っていたゴミ値が表示されます。

```
(gdb) break main
(gdb) run
Breakpoint 1, main () at a.c:5
5	    int i = 0;
(gdb) print i
$1 = -18136          ← まだ初期化されていない（ゴミ値）
(gdb) next
8	    for (iCnt = 0; iCnt < 10; iCnt++) {
(gdb) print i
$2 = 0               ← 1行進めると 0 になる
```

`-18136` は16進で `0xffffb928` です。同じ実行で `argv` のアドレスが `0x7fffffffb938` だったので、**スタックに残っていたアドレスの下位部分**がそのまま見えていたことになります。別のプログラムでは同じ位置で `32767`（`0x7fff`）が出ました。

**対処**

- gdb の表示は「**この行をこれから実行する**」という意味です。止まった行の代入は、まだ反映されていません。
- 値を確認したい行の**次の行**で止めるか、止まってから `next` で1行進めてから `print` します。

## ハマりどころ2：i++ の行で止めると「1つ前の値」が見える

ハマりどころ1と同じ理屈で、`break` を `i++;` の行に置くと、**`i++` を実行する前の値**が表示されます。1周目なら `0`、2周目なら `1` です。

```
(gdb) break 10        ← i++ の行
(gdb) run
(gdb) print i
$1 = 0               ← i++ の前。1周目は 0 で正しい
(gdb) next
(gdb) print i
$2 = 1               ← i++ の後
```

「1 になっていない」と感じたら、まず**どの行で止まっているか**（gdb が表示している行番号とソース）を確認してください。毎周の値を追いたいときは、`display i` を使うと止まるたびに自動で表示されます。

## ハマりどころ3：ループの中で int i; を宣言し直している（シャドーイング）

ループの中に `int i;` があると、**外側の `i` とは別の変数**になります。内側の `i` は初期化されていないので、`i++` はゴミ値に 1 を足すだけです。

```c
int main(void)
{
    int i = 0;
    int iCnt;

    for (iCnt = 0; iCnt < 10; iCnt++) {
        int i;              /* ← 内側でもう一度宣言してしまった */
        if (iCnt % 2 == 0) {
            i++;
            printf("loop: i = %d\n", i);
        }
    }
    printf("after: i = %d\n", i);
    return 0;
}
```

```
$ ./shadow
loop: i = -417235959
loop: i = -417235958
loop: i = -417235957
loop: i = -417235956
loop: i = -417235955
after: i = 0          ← 外側の i は一度も増えていない
```

ゴミ値の桁数は実行のたびに変わり、5桁になることもあります。長い関数の途中で、コピーしてきたブロックに `int i;` が紛れ込んでいるパターンが現場では多いです。

**対処**

`-Wshadow` を付けると、宣言の時点で警告が出ます。`-Wall` には含まれないので、**明示的に付ける**必要があります。

```
$ gcc -O0 -g -Wall -Wextra -Wshadow shadow.c -o shadow
shadow.c:8:13: warning: declaration of 'i' shadows a previous local [-Wshadow]
    8 |         int i;              /* ← 内側でもう一度宣言してしまった */
      |             ^
shadow.c:4:9: note: shadowed declaration is here
    4 |     int i = 0;
      |         ^
```

注意点として、gcc は **`-O0` だと未初期化変数の警告（`-Wmaybe-uninitialized`）を出さないことがあります**。上の例も `-O0 -Wall -Wextra` だけでは何も出ませんでした。警告チェック用に、一度 `-O2 -Wall` でもビルドしてみてください。

```
$ gcc -O2 -Wall -c shadow.c
shadow.c:10:14: warning: 'i' may be used uninitialized [-Wmaybe-uninitialized]
```

clang なら `-O0` でも `variable 'i' is uninitialized when used here [-Wuninitialized]` が出ます。

## ハマりどころ4：gdb で別のフレーム・グローバルの i を見ている

gdb の `print i` は、**いま止まっている関数から見える `i`** を表示します。`step` で `check()` の中に入ったまま `print i` すると、`main` の `i` ではなく、別の `i` が表示されることがあります。

```c
int i = 12345;                   /* 別ファイルや共通ヘッダにある「i」 */

static int check(int n)
{
    return n % 2 == 0;           /* ← ここで止まって print i すると？ */
}

int main(void)
{
    int i = 0;
    /* …ループは前提の構成と同じ… */
}
```

```
(gdb) break check
(gdb) run
Breakpoint 1, check (n=0) at glob.c:7
(gdb) print i
$1 = 12345           ← グローバルの i が見えている
(gdb) up
#1  0x000055555555518a in main () at glob.c:16
(gdb) print i
$2 = 0               ← main のフレームに移ると、main の i
```

グローバルに `i` がなければ `No symbol "i" in current context.` と出るので気付けますが、**共通ヘッダや別ファイルに `i` という名前のグローバル変数があると、黙って別の値が出ます**。

**対処**

- 止まったら `bt`（どの関数にいるか）を確認し、`up` / `frame 番号` で `i` を宣言した関数のフレームに移ってから `print` します。
- `info locals` で、そのフレームのローカル変数を一覧できます。
- 同名のグローバル変数は `-Wshadow` で `shadows a global declaration` と警告されます。

## ハマりどころ5：配列の範囲外書き込みで i が上書きされた（本当に壊れている）

ここまでは「見方」の問題でしたが、これは**本当に `i` の値が壊れている**ケースです。隣にある配列に範囲外の書き込みをすると、たまたま隣に置かれていた `i` が上書きされます。

```c
#include <stdio.h>

#define MAX_REC 5                       /* 5件までの想定で作った */

int main(void)
{
    int iCnt;
    int i = 0;                          /* 偶数件数のカウンタ */
    int buf[MAX_REC];
    int n = 7;                          /* 実際には7件来た */

    for (iCnt = 0; iCnt < n; iCnt++) {
        if (iCnt % 2 == 0) {
            i++;
        }
        buf[iCnt] = iCnt * 10000;       /* ← 6件目以降は範囲外 */
    }
    printf("i = %d\n", i);
    return buf[0];
}
```

```
$ gcc -O0 -g -fno-stack-protector ovf.c -o ovf
$ ./ovf
i = 60000             ← 正しくは 4。buf[6] への書き込みで上書きされた
```

この環境では `buf[6]` の位置に `i` が置かれていたため、`buf[6] = 60000` がそのまま `i` に入りました。**変数がメモリのどこに並ぶかはコンパイラ次第**で、宣言の順番を変えるだけで壊れる変数が変わります（`iCnt` が壊れてループが途中で終わることもあります）。

なお、Ubuntu の gcc のようにスタック保護（`-fstack-protector`）が既定で有効な環境では、関数の終わりで `*** stack smashing detected ***: terminated` と出て異常終了することがあります。一方、スタック保護が無効な古い環境や本番のビルド設定では、**何のエラーも出ずに値だけが壊れます**。

**対処1：gdb の watch で「誰が書き換えたか」を捕まえる**

`watch i` を仕掛けると、`i` の値が変わった瞬間に止まり、古い値と新しい値を表示してくれます。

```
(gdb) break 12
(gdb) run
(gdb) watch i
Hardware watchpoint 2: i
(gdb) continue
Old value = 0
New value = 1
main () at ovf.c:16
…（i++ による正しい変化が続く）…
(gdb) continue
Hardware watchpoint 2: i

Old value = 4
New value = 60000
main () at ovf.c:12
12	    for (iCnt = 0; iCnt < n; iCnt++) {
```

止まった位置は「書き換えた**次**の行」です。直前に実行した 16行目 `buf[iCnt] = iCnt * 10000;` が犯人だと分かります。`i++` 以外の場所で値が変わったら、それが原因の行です。watch の使い方の詳細は「[gdbを使い倒す応用編](/articles/c-gdb-advanced-commands)」を参照してください。

**対処2：AddressSanitizer（ASan）で範囲外書き込みそのものを検出する**

`-fsanitize=address` を付けてビルドし直すと、範囲外に書き込んだ**その行**で止まります。

```
$ gcc -O0 -g -fsanitize=address ovf.c -o ovf_asan
$ ./ovf_asan
==551==ERROR: AddressSanitizer: stack-buffer-overflow on address 0x7f3f48800034 …
WRITE of size 4 at 0x7f3f48800034 thread T0
    #0 0x55ef05fc436c in main ovf.c:16
…
    [32, 52) 'buf' (line 9) <== Memory access at offset 52 overflows this variable
```

「`buf`（20バイト）の直後に4バイト書いた、場所は 16行目」と、原因がそのまま出ます。配列の件数は定数で決め打ちせず、**ループ条件に配列の要素数を使う**（`iCnt < n && iCnt < MAX_REC`）か、件数を超えたらエラーにしてください。

## ハマりどころ6：-O2 でビルドしたまま gdb で値を見ている

最適化を有効にすると、変数はメモリではなくレジスタに置かれたり、計算そのものが別の形に書き換えられたりします。そのため gdb で見る値が**ソースの見た目と一致しなくなります**。

**症状1：i++ の行に止まれない**

```
$ gcc -O2 -g opt.c check.c -o opt
$ gdb -q ./opt
(gdb) break 12        ← i++ の行
Breakpoint 1 at 0x109a: file opt.c, line 16.   ← 16行目（return 0）に移された
```

`-O2` では `if (check(iCnt)) i++;` が分岐なしの命令（`cmp` と `sbb`）にまとめられ、**`i++` の行に対応する命令がなくなりました**。gdb は近くの別の行にブレークポイントを置き直すので、思っていたタイミングで止まりません。

**症状2：`<optimized out>` と表示される**

```
(gdb) up
#1  … in count_even (max=max@entry=10) at opt3.c:17
17	    report(max);
(gdb) print i
$1 = <optimized out>
```

`i` を最後に使い終わった後は、`i` が入っていたレジスタが別の用途に再利用されるため、gdb は値を表示できません。デバッグ情報の精度によっては、`<optimized out>` ではなく**関係ない値（別の変数が入ったレジスタの値）**が表示されることもあります。

**対処**

- デバッグするときは **`-O0 -g`** でビルドし直します（`-Og` でもかなり追いやすくなります）。
- Makefile の `CFLAGS` が `-O2` のままになっていないか確認してください。「`-g` を付けたのに止まらない・値がおかしい」の典型例は「[gdbのブレークポイントで止まらない。原因はMakefileだった話](/articles/c-gdb-breakpoint-not-hit)」にまとめています。
- 本番と同じ `-O2` でしか再現しない場合は、gdb の表示ではなく **printf（ログ）で値を出して確認**します。

## ハマりどころ7：printf の書式・引数が間違っている（表示だけがおかしい）

`i` の値は正しいのに、出力の仕方を間違えているパターンです。printf は型をチェックしないので、**書式と引数が合っていないと、関係ない値を表示します**。

```c
int    i = 5;
long   l = 5;
double d = 5.0;

printf("1: %d\n", &i);        /* & を付けてしまった */
printf("2: %d\n");            /* 引数を渡し忘れた */
printf("3: %ld\n", i);        /* int を %ld で */
printf("4: %d\n", d);         /* double を %d で */
printf("5: %d\n", l);         /* long を %d で（x86-64では偶然合うことが多い） */
```

```
$ ./fmt
1: -1733828252        ← アドレスの下位32ビット
2: 6                  ← たまたまレジスタに残っていた値
3: 5
4: -1258269248        ← 関係ない値
5: 5
$ ./fmt
1: 172606116          ← 実行のたびに変わる
2: 4
3: 5
4: 645944768
5: 5
```

3 と 5 は x86-64 Linux ではたまたま正しく見えますが、**環境が変わると壊れる**書き方です。特に `scanf` の癖で `&i` を付けてしまう 1 と、ログ関数の引数を足し忘れる 2 は現場でよく見ます。

**対処**

`-Wall`（に含まれる `-Wformat`）で全部警告されます。

```
fmt.c:8:17: warning: format '%d' expects argument of type 'int', but argument 2 has type 'int *' [-Wformat=]
fmt.c:9:17: warning: format '%d' expects a matching 'int' argument [-Wformat=]
fmt.c:10:18: warning: format '%ld' expects argument of type 'long int', but argument 2 has type 'int' [-Wformat=]
fmt.c:11:17: warning: format '%d' expects argument of type 'int', but argument 2 has type 'double' [-Wformat=]
fmt.c:12:17: warning: format '%d' expects argument of type 'int', but argument 2 has type 'long int' [-Wformat=]
```

自作のログ関数（`log_write(const char *fmt, ...)` など）は、宣言に `__attribute__((format(printf, 1, 2)))` を付けると、printf と同じチェックがかかります。

## ハマりどころ8：for 文の「;」の位置

今回いただいたコードの `iCnt++;)` はコンパイルエラーになるので実害はありませんが、**`;` の位置の間違いでコンパイルが通ってしまう**ものもあります。

```c
for (iCnt = 0; iCnt < 10; iCnt++);   /* ← 行末の ; でループの中身が空になる */
{
    if (check(iCnt)) {
        i++;                          /* ループ後に1回だけ実行される */
    }
}
```

この場合 `i` はゴミ値にはなりませんが、「10回回るはずが1回しか数えていない」という別の症状になります（ループを抜けた時点の `iCnt` は 10 なので、`check(10)` が真になって `i` は 1）。上のようにインデントがそろっていれば、`-Wall` に含まれる `-Wmisleading-indentation` で警告されます。

```
semi.c:6:5: warning: this 'for' clause does not guard... [-Wmisleading-indentation]
```

ループの `{` は `for` と同じ行に書く書き方にそろえると、この間違いは起きにくくなります。

## 5分で切り分ける手順

1. **printf で見たのか、gdb で見たのかを確認する**
2. printf なら、`-Wall -Wextra -Wshadow` でコンパイルし直し、**警告をすべて読む**（書式・シャドーイング）
3. gdb なら、**`-O0 -g` でビルドされているか**を確認する（`CFLAGS`、`make clean` してから再ビルド）
4. gdb で止まっている**行と関数**を確認する（`bt`、`frame`、`info locals`）。止まった行はまだ実行されていない
5. それでも途中で値が飛ぶなら、`watch i` で**誰が書き換えたか**を捕まえる
6. 並行して `-fsanitize=address` でビルドして実行し、**範囲外書き込みがないか**を確認する
7. 未初期化が疑わしければ、`valgrind --track-origins=yes` で実行する

Valgrind は再コンパイルなしで、未初期化の値を使った場所と、その変数がどこで作られたかを教えてくれます（ハマりどころ3の例）。

```
$ valgrind --track-origins=yes ./shadow
==766== Conditional jump or move depends on uninitialised value(s)
…
==766==    by 0x10918B: main (shadow.c:11)
==766==  Uninitialised value was created by a stack allocation
==766==    at 0x109149: main (shadow.c:3)
```

## 再発させないための対処

### 1. 開発用のビルドオプションをそろえる

```makefile
# 開発・デバッグ用
CFLAGS_DEBUG = -O0 -g -Wall -Wextra -Wshadow -Wformat=2
# テスト時に一度は通す
CFLAGS_ASAN  = -O0 -g -fsanitize=address -fno-omit-frame-pointer
# 未初期化の警告チェック用（gcc は -O0 だと出ないことがある）
CFLAGS_WARN  = -O2 -Wall -Wextra
```

警告を見逃さないように、可能なら `-Werror` で警告をエラーにします。

### 2. 未初期化をわざと目立たせる（gcc 12 以降）

`-ftrivial-auto-var-init=pattern` を付けると、初期化されていないローカル変数が毎回同じ「目立つ値」で埋められます。

```
$ gcc -O0 -g -ftrivial-auto-var-init=pattern shadow.c -o shadow
$ ./shadow
loop: i = -16843009   ← 0xfefefeff。毎回同じ値になるので「未初期化だ」と分かる
```

テスト環境だけで使うのがおすすめです。`=zero`（0で埋める）にすると、この例では `loop: i = 1` と**正しそうに見えてしまい、バグが隠れます**。

### 3. 書き方で防ぐ

- 変数は**使う場所の近くで宣言し、宣言と同時に初期化**する
- カウンタに `i` のような1文字の名前を使わず、`iEvenCnt` のように**何を数えるか分かる名前**にする（シャドーイングもグローバルとの衝突も起きにくくなる）
- グローバル変数には `g_` などの接頭辞を付け、ローカル変数と名前が重ならないようにする
- 配列に書き込むループは、**ループ条件に配列の要素数**（`sizeof(buf) / sizeof(buf[0])`）を使う。要素数の求め方は「[変数のサイズを知りたいときは sizeof におまかせ](/articles/c-sizeof-variable-size)」を参照

## チェックリスト

- [ ] 値を確認したのが printf か gdb かを区別した
- [ ] gdb で止まった行は「これから実行する行」だと理解して見ている
- [ ] gdb で `bt` / `info locals` を見て、`i` を宣言した関数のフレームで `print` している
- [ ] `-O0 -g` でビルドし直してから gdb で確認した（`make clean` 済み）
- [ ] `-Wall -Wextra -Wshadow` で警告ゼロにした
- [ ] 一度 `-O2 -Wall` でもビルドし、未初期化の警告がないことを確認した
- [ ] printf の書式と引数の型・数が合っている（`&` を付けていない）
- [ ] `watch i` で、`i++` 以外の場所で値が変わっていないことを確認した
- [ ] `-fsanitize=address` でビルドして、範囲外書き込みがないことを確認した
- [ ] 配列に書き込むループの条件に、配列の要素数を使っている

## まとめ

- `int i = 0;` と書いた変数が5桁の数字に見えるとき、`i++` が壊れていることはまずありません。**見るタイミング・見ている変数・表示方法のどれかが間違っているか、別の場所の書き込みで壊されています**。
- gdb で止まった行は**まだ実行されていません**。初期化の行で `print i` すると、`32767` や `-18136` のような**スタックに残ったアドレスの一部**が見えます。
- ループの中の `int i;` は**別の変数**です。`-Wshadow` で見つかります。
- 途中で値が飛ぶなら**配列の範囲外書き込み**を疑い、`watch i` で書き換えた行を捕まえ、ASan で原因の行を確定します。
- `-O2` のまま gdb で値を見ると、`<optimized out>` や関係ない値が出ます。デバッグは **`-O0 -g`** で行います。
- printf の書式違いは `-Wall` で全部見つかります。**警告はゼロにしてから**値を疑ってください。
