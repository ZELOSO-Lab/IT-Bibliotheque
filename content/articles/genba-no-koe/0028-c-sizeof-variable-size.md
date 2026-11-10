---
series: 現場の声
no: 0028
title: 【C言語】変数のサイズを知りたいときは sizeof におまかせ。型・配列・構造体・ポインタのサイズを調べる3つの方法と、現場でハマる8つの勘違い
slug: c-sizeof-variable-size
category: C言語
tags: [C言語, sizeof, 型, 配列, 構造体, ポインタ, パディング, size_t, gdb]
technologies: [c]
excerpt: 「int は4バイト、long は8バイト」と決め打ちで書いたら、Windows でファイルのレイアウトがずれた。変数や型のサイズは覚えるものではなく sizeof で調べるものです。確認用プログラム・gdb・コンパイル時チェックの3つの調べ方と、%zu・配列とポインタ・文字列・構造体のパディング・malloc した領域・size_t の比較でハマる8つの勘違いを、実行結果付きでまとめました。
status: draft
created: 2026-10-29
---

# 【C言語】変数のサイズを知りたいときは sizeof におまかせ。型・配列・構造体・ポインタのサイズを調べる3つの方法と、現場でハマる8つの勘違い

## 現場の声

> 固定長ファイルを読み書きする処理で、レコードの長さを「`int` が4バイト、`long` が8バイト、`char[11]` が11バイト……」と手で足し算して `#define REC_LEN 31` と書いていました。
>
> Linux では動いていたのに、**Windows でビルドしたツールで読ませるとデータが途中からずれる**。さらに構造体を `fwrite` したファイルは、手計算より**数バイト大きい**。
>
> 結局、サイズは**自分で計算するものではなく `sizeof` に聞くもの**でした。

C言語の型のサイズは、規格で「最低これ以上」としか決まっておらず、**OS・コンパイラ・32bit/64bit で変わります**。構造体にはコンパイラが隙間（パディング）を入れます。手計算や「たぶん4バイト」は、環境が変わった瞬間にバグになります。

この記事では、`sizeof` でサイズを調べる方法と、`sizeof` を使っていても起きる勘違いを整理します。

コードはすべて gcc 13.3（Ubuntu 24.04, x86_64）と gdb 15.1 で実行して確認しています。

## 前提：sizeof は「バイト数」を返す演算子

```c
sizeof(型名)      /* 型のサイズ。型名のときは ( ) が必須 */
sizeof 式         /* 変数や式のサイズ。( ) は付けても付けなくてもよい */
```

- `sizeof` は**関数ではなく演算子**です。結果は**コンパイル時に決まり**、実行時のコストはありません（可変長配列 VLA だけは例外で実行時に計算されます）。
- 結果の型は **`size_t`**（符号なし整数）です。単位は**バイト**で、`sizeof(char)` は**必ず 1** です。
- `sizeof 変数` の形で書くと、後から変数の型を変えても書き直しが要りません。

代表的な環境でのサイズは次のとおりです。**表は目安であり、最終的には自分の環境で `sizeof` を実行して確かめます。**

| 型 | Linux 64bit（LP64） | Windows 64bit（LLP64） | 32bit 環境（ILP32） |
|---|---|---|---|
| `char` | 1 | 1 | 1 |
| `short` | 2 | 2 | 2 |
| `int` | 4 | 4 | 4 |
| `long` | **8** | **4** | **4** |
| `long long` | 8 | 8 | 8 |
| `float` / `double` | 4 / 8 | 4 / 8 | 4 / 8 |
| ポインタ（`void *` など） | **8** | **8** | **4** |
| `size_t` | 8 | 8 | 4 |

`long` とポインタが環境によって変わるのがポイントです。Linux 64bit の値はこの記事のコンテナで実行した結果、それ以外は各環境のデータモデルの一般的な値です。

## サイズを調べる3つの方法

### 方法1：確認用のプログラムを1本持っておく

いちばん確実なのは、**ターゲット環境のコンパイラで**次のようなプログラムを動かすことです。

```c
#include <stdio.h>
#include <stddef.h>
#include <stdint.h>

typedef struct {
    char   kubun;      /* 区分 */
    int    id;
    char   name[11];
    double amount;
} Order;

int main(void)
{
    int    arr[10];
    char   buf[] = "abc";
    char  *msg   = "abc";
    Order  od;
    Order *po = &od;

    printf("int       : %zu\n", sizeof(int));
    printf("long      : %zu\n", sizeof(long));
    printf("void *    : %zu\n", sizeof(void *));
    printf("int64_t   : %zu\n", sizeof(int64_t));
    printf("arr       : %zu\n", sizeof arr);
    printf("arr[0]    : %zu\n", sizeof arr[0]);
    printf("要素数    : %zu\n", sizeof arr / sizeof arr[0]);
    printf("buf       : %zu\n", sizeof buf);
    printf("msg       : %zu\n", sizeof msg);
    printf("Order     : %zu\n", sizeof(Order));
    printf("po        : %zu\n", sizeof po);
    printf("*po       : %zu\n", sizeof *po);
    printf("od.name   : %zu\n", sizeof od.name);
    printf("offset kubun=%zu id=%zu name=%zu amount=%zu\n",
           offsetof(Order, kubun), offsetof(Order, id),
           offsetof(Order, name), offsetof(Order, amount));
    return 0;
}
```

```text
$ gcc -Wall -Wextra -o sizes sizes.c && ./sizes
int       : 4
long      : 8
void *    : 8
int64_t   : 8
arr       : 40
arr[0]    : 4
要素数    : 10
buf       : 4
msg       : 8
Order     : 32
po        : 8
*po       : 32
od.name   : 11
offset kubun=0 id=4 name=8 amount=24
```

メンバの合計は 1 + 4 + 11 + 8 = 24 バイトなのに、`sizeof(Order)` は **32** です。理由はハマりどころ6で説明します。

### 方法2：gdb で聞く（プログラムを書き換えなくてよい）

`-g` 付きでビルドしてあれば、gdb の `print` で `sizeof` がそのまま使えます。型のサイズだけなら**プログラムを実行しなくても**表示できます。

```text
$ gdb -q ./sizes
(gdb) print sizeof(Order)
$1 = 32
(gdb) print sizeof(long)
$2 = 8
(gdb) break main
(gdb) run
(gdb) print sizeof(arr)/sizeof(arr[0])
$3 = 10
```

構造体なら **`ptype /o`** が便利です。各メンバの**オフセット・サイズ・隙間（hole）**まで一覧で出ます。

```text
(gdb) ptype /o Order
type = struct {
/*      0      |       1 */    char kubun;
/* XXX  3-byte hole      */
/*      4      |       4 */    int id;
/*      8      |      11 */    char name[11];
/* XXX  5-byte hole      */
/*     24      |       8 */    double amount;

                               /* total size (bytes):   32 */
                             }
```

gdb の基本操作は「[gdbで「どこで・なぜ落ちたか」を10分で突き止める手順](/articles/c-gdb-debugging)」、応用は「[gdbを使い倒す応用編](/articles/c-gdb-advanced-commands)」を参照してください。

### 方法3：コンパイル時に確かめる（実行しなくてよい）

**サイズが変わったらビルドを止めたい**ときは、C11 の `_Static_assert` を使います。固定長レコードや通信電文の構造体に入れておくと、環境が変わってもすぐ気づけます。

```c
_Static_assert(sizeof(Order) == 24, "Order size mismatch");
```

```text
sizes.c:2:1: error: static assertion failed: "Order size mismatch"
```

メッセージは**英数字で書く**のがおすすめです。gcc 13 では日本語のメッセージが `\37777777743…` のように文字化けして表示されました。

**サイズの値そのものをコンパイラに表示させる**小技もあります。わざと型の合わない代入を書くと、警告メッセージにサイズが出ます（確認したら消してください）。

```c
char (*check)[sizeof(Order)] = 1;
```

```text
warning: initialization of 'char (*)[32]' from 'int' makes pointer from integer without a cast
```

`[32]` の部分が `sizeof(Order)` の値です。クロスコンパイラしか無く、ターゲットで実行できない環境で役に立ちます。

## ハマりどころ1：「int は4バイト、long は8バイト」と決めつける

**症状：** Linux では動くのに、Windows や 32bit 環境でファイル・電文のレイアウトがずれる。値があふれる。

**原因：** 前提の表のとおり、`long` は Linux 64bit で 8 バイト、Windows では 4 バイトです。ポインタも 32bit 環境では 4 バイトです。

**対処：** **サイズに意味がある変数は `<stdint.h>` の固定幅の型**を使います。

```c
#include <stdint.h>

int32_t  count;     /* どの環境でも 4 バイト */
int64_t  amount;    /* どの環境でも 8 バイト */
uint8_t  flag;      /* どの環境でも 1 バイト */
```

- ファイル・通信・DB の列など**外部とやり取りするデータ**は、固定幅の型にします。
- ループ変数や一時的な計算は `int` のままで構いません。
- ポインタを整数に入れるときは `long` ではなく `intptr_t` / `uintptr_t` を使います。

## ハマりどころ2：sizeof の結果を `%d` で表示する

**症状：** 警告が出る。環境によってはおかしな値が表示される。

```c
printf("%d\n", sizeof(data));
```

```text
warning: format '%d' expects argument of type 'int', but argument 2 has type 'long unsigned int' [-Wformat=]
```

**原因：** `sizeof` の結果は `size_t` です。x86_64 の Linux では 8 バイトの符号なし整数で、`int`（4 バイト）とは別の型です。今回の環境ではたまたま `40` と表示されましたが、書式と型が合わない `printf` は**未定義動作**です。

**対処：** `size_t` は **`%zu`** で表示します。

```c
printf("%zu\n", sizeof data);
```

古い Visual Studio（2013 以前）は `%zu` に対応していないため、`%Iu` を使うか、`(unsigned long)` にキャストして `%lu` で表示します。

## ハマりどころ3：関数に渡した配列を sizeof する

**症状：** 関数の中で `sizeof(arr)` が **8**（ポインタのサイズ）になる。要素数の計算や `memset` が途中までしか効かない。

```c
void print_size(int arr[])
{
    printf("関数の中: %zu\n", sizeof(arr));   /* 8 */
}

int data[10];
printf("%zu\n", sizeof data);   /* 40 */
print_size(data);               /* 関数の中: 8 */
```

```text
warning: 'sizeof' on array function parameter 'arr' will return size of 'int *' [-Wsizeof-array-argument]
```

**原因：** 配列を関数に渡すと、**先頭要素へのポインタ**に変換されます。`int arr[]` と書いても、引数の型は `int *` です。

`char *` を受け取る関数で `memset(buf, 0, sizeof buf)` と書くのも同じミスです。64 バイトの配列を渡しても、0 で埋まるのは先頭の 8 バイトだけでした。

```text
warning: argument to 'sizeof' in 'memset' call is the same expression as the destination; did you mean to provide an explicit length? [-Wsizeof-pointer-memaccess]
```

**対処：** 配列を関数に渡すときは、**要素数（またはバイト数）を別の引数で渡す**のが C の決まりごとです。

```c
void clear_buf(char *buf, size_t size)
{
    memset(buf, 0, size);
}

char line[64];
clear_buf(line, sizeof line);                  /* 宣言したスコープで sizeof する */
fgets(line, sizeof line, fp);                  /* 標準関数も同じ形 */
```

要素数を求める `sizeof arr / sizeof arr[0]` は、**配列を宣言したスコープの中でだけ**正しく動きます。詳しくは「[ポインタでハマる8つの勘違い](/articles/c-pointer-pitfalls)」のハマりどころ3、二次元配列の場合は「[二次元配列で現場がハマる7つのポイント](/articles/c-2d-array)」を参照してください。

## ハマりどころ4：ポインタの sizeof と、指す先の sizeof を取り違える

**症状：** `malloc` した領域が小さすぎて、書き込んだ瞬間かしばらく後に落ちる。

```c
int   *p    = malloc(10 * sizeof p);       /* sizeof p はポインタの 8。たまたま足りるが意図と違う */
Order *item = malloc(sizeof(item));        /* 8 バイトしか確保されない。Order は 32 バイト */
```

**原因：** `sizeof p` は**ポインタ変数そのもの**のサイズ（8）、`sizeof *p` は**指す先**のサイズ（`int` なら 4）です。

```text
sizeof p=8 sizeof *p=4
```

**対処：** 確保するときは **`sizeof *変数名`** の形で書きます。型名を二度書かないので、型を変えてもずれません。

```c
int   *p    = malloc(10 * sizeof *p);
Order *item = malloc(sizeof *item);
```

`malloc` / `realloc` のサイズ計算の落とし穴は「[malloc/freeで現場がハマる8つの落とし穴](/articles/c-memory-management)」のハマりどころ4にまとめています。

## ハマりどころ5：文字列の sizeof と strlen を混同する

**症状：** 文字列の長さが1つ多い（または少ない）。`char *` の文字列の長さが常に 8 になる。

```c
char  buf[] = "abc";
char *msg   = "abc";

sizeof buf      /* 4：'a' 'b' 'c' '\0' の配列のサイズ */
sizeof msg      /* 8：ポインタのサイズ */
strlen(buf)     /* 3：'\0' の手前までの文字数 */
sizeof "abc"    /* 4：文字列リテラルも '\0' を含む配列 */
```

**原因：** `sizeof` は**入れ物の大きさ**、`strlen` は**中身の文字数**です。`sizeof` は終端の `'\0'` も数え、ポインタに対しては文字列の長さを一切知りません。

**対処：**

| 知りたいこと | 使うもの |
|---|---|
| 中に入っている文字数 | `strlen(s)` |
| 書き込める最大バイト数（`'\0'` 込み） | 配列なら `sizeof buf`、ポインタなら別途サイズを持つ |
| 構造体の文字列メンバの大きさ | `sizeof od.name`（メンバに対する `sizeof` は配列のサイズになる） |

`snprintf(od.name, sizeof od.name, "%s", src);` のように、**書き込み先の配列に対して `sizeof`** を使うのが安全な形です。

## ハマりどころ6：構造体のサイズがメンバの合計にならない（パディング）

**症状：** 現場の声のとおり、手計算した 24 バイトと `sizeof(Order)` の 32 バイトが合わない。

**原因：** CPU が効率よく読めるように、コンパイラはメンバの**境界をそろえる隙間（パディング）**を入れます。`int` は 4 の倍数、`double` は 8 の倍数のアドレスに置かれるため、方法2の `ptype /o` のとおり、`kubun` の後ろに 3 バイト、`name` の後ろに 5 バイトの隙間ができます。

**対処：**

1. **サイズは `sizeof`、位置は `offsetof`（`<stddef.h>`）で求める。** 手で足し算しない。
2. **大きい型から順に並べる**と隙間が減ります。

```c
typedef struct {
    double amount;      /* 8 */
    int    id;          /* 4 */
    char   kubun;       /* 1 */
    char   name[11];    /* 11 */
} Order2;               /* sizeof(Order2) = 24 */
```

3. 固定長ファイルや電文のレイアウトに使う構造体は、**`_Static_assert` でサイズを固定**しておく（方法3）。

パディングの詳しい話と、構造体をファイルに保存するときの注意は「[構造体配列のソート・検索・保存でハマる8つのポイント](/articles/c-struct-array)」のハマりどころ7・8を参照してください。

## ハマりどころ7：malloc した配列の要素数を sizeof で求めようとする

**症状：** `malloc(100 * sizeof *list)` で確保したのに、`sizeof list / sizeof list[0]` が **0** や **1** になる。

```c
Order *list = malloc(100 * sizeof *list);
size_t n = sizeof list / sizeof list[0];   /* 8 / 32 = 0 */
```

**原因：** `list` はポインタです。`sizeof` はコンパイル時に型だけを見るので、**実行時に確保した大きさは分かりません**。

**対処：** **件数（と確保済みの容量）を自分で変数に持ちます。** ポインタと件数を構造体にまとめておくと、渡し忘れが起きません。

```c
typedef struct {
    Order  *items;
    size_t  count;      /* 使っている件数 */
    size_t  cap;        /* 確保済みの件数 */
} OrderList;
```

`realloc` で伸ばす配列をこの形で安全に扱う方法は「[関数の中でreallocしたら、ループ2周目に別の関数でセグフォ](/articles/c-realloc-pointer-arg-segfault)」で解説しています。

## ハマりどころ8：sizeof の結果（size_t）と int を比べる・引き算する

**症状：** 後ろから回すループが止まらない。`-1` が配列のサイズより「大きい」と判定される。

```c
int arr[3] = {10, 20, 30};

for (size_t i = sizeof arr / sizeof arr[0] - 1; i >= 0; i--) {   /* 止まらない */
    printf("%d\n", arr[i]);
}

int len = -1;
if (len < sizeof arr) { /* 通らない */ }
```

```text
30
20
10
-184259856     ← i が 0 から巨大な値に戻り、配列の外を読んでいる
-1
...
-1 が 12 より大きいと判定された
```

```text
warning: comparison of unsigned expression in '>= 0' is always true [-Wtype-limits]
warning: comparison of integer expressions of different signedness: 'int' and 'long unsigned int' [-Wsign-compare]
```

**原因：** `size_t` は**符号なし**です。0 から 1 を引くと負にはならず、最大値（18446744073709551615）に戻ります。また `int` と比べると `int` 側が符号なしに変換され、`-1` は巨大な値になります。

**対処：**

```c
size_t n = sizeof arr / sizeof arr[0];

for (size_t i = n; i-- > 0; ) {      /* 後ろから回すときの定番 */
    printf("%d\n", arr[i]);
}

if (len < 0 || (size_t)len < sizeof arr) { ... }   /* 負の値を先に弾いてから比べる */
```

`-Wall -Wextra` を付けると、上の2つの警告はどちらも出ます。警告を無視しないことが一番の対策です。

## 知っておくと得する sizeof の性質

- **`sizeof` の中の式は実行されません。** `sizeof(i++)` を書いても `i` は増えません（確認結果は `4 0`。サイズは 4、`i` は 0 のまま）。副作用のある式は入れないでください。
- **C では `sizeof 'a'` は 4** です。文字定数の型が `int` だからです（C++ では 1）。
- `sizeof` は**型を変えたときの修正漏れを防ぐ道具**でもあります。`memcpy(&dst, &src, sizeof dst)` のように、数字の代わりに `sizeof` を書く癖をつけましょう。

## サイズを調べる手順（まとめ）

1. 型や構造体のサイズを知りたい → **ターゲット環境で `sizeof` を表示する**（方法1）か、**gdb の `print sizeof(型)`**（方法2）
2. 構造体のどこに隙間があるか知りたい → **gdb の `ptype /o 型名`**、またはコードで `offsetof`
3. サイズが変わったら困る → **`_Static_assert(sizeof(型) == N, "...")`** をヘッダに置く（方法3）
4. 実行できない環境で値だけ知りたい → **わざと警告を出してメッセージで読む**（確認したら消す）
5. 配列の要素数 → **宣言したスコープで `sizeof arr / sizeof arr[0]`**。関数に渡すなら件数も一緒に渡す

## チェックリスト

- [ ] サイズを手計算した `#define` や数字の直書きが残っていない
- [ ] ファイル・電文・DB とやり取りする変数は `int32_t` などの固定幅の型にしている
- [ ] `sizeof` の結果は `%zu` で表示している
- [ ] 関数の引数（配列・`char *`）に対して `sizeof` していない。サイズは別の引数で渡している
- [ ] `malloc` のサイズは `個数 * sizeof *変数` の形で書いている
- [ ] 文字数は `strlen`、書き込める大きさは `sizeof 配列` と使い分けている
- [ ] 構造体のサイズ・オフセットは `sizeof` / `offsetof` で求めている
- [ ] レイアウトが決まっている構造体に `_Static_assert` を入れている
- [ ] `malloc` した配列の件数は変数で持っている
- [ ] `size_t` のループで `i >= 0` を条件にしていない
- [ ] `-Wall -Wextra` の `sizeof` 関連・符号の警告が 0 件になっている

## まとめ

- 型や変数のサイズは**環境で変わります**。覚えたり手で足したりせず、**`sizeof` に聞きましょう**。
- 調べ方は3つ。**確認用プログラム**、**gdb の `print sizeof` / `ptype /o`**、**`_Static_assert` によるコンパイル時チェック**です。
- `sizeof` は**型を見る**演算子です。関数に渡した配列・`malloc` した領域・`char *` の文字列に対しては、**ポインタのサイズ**しか返しません。
- 構造体には**パディング**が入ります。サイズは `sizeof`、位置は `offsetof` で求めます。
- 結果は**符号なしの `size_t`**。表示は `%zu`、`int` との比較と後ろ向きのループに注意します。
