---
series: 現場の声
no: 0024
title: 【C言語】関数の中でreallocしたら、ループ2周目に別の関数でセグフォ。原因は「引数の型」と「渡した値」のズレ。構造体で学ぶ Typ** / Typ* [] / Typ [][] の違い
slug: c-realloc-pointer-arg-segfault
category: C言語
tags: [C言語, realloc, ポインタ, ダブルポインタ, 構造体, 二次元配列, Segmentation fault, AddressSanitizer, Valgrind, gdb]
technologies: [c]
excerpt: 初期化関数でmallocし、内部関数でreallocして値を入れたら、ループ2周目に別の関数でSegmentation fault。原因は関数の引数の型と、実際に渡していた値のズレでした。構造体を題材に、Typ** / Typ* [] / Typ [][] のメモリ配置と渡し方の違い、gdb・Valgrind・ASanでの確認方法をまとめました。
status: draft
created: 2026-10-27
---

# 【C言語】関数の中でreallocしたら、ループ2周目に別の関数でセグフォ。原因は「引数の型」と「渡した値」のズレ。構造体で学ぶ Typ** / Typ* [] / Typ [][] の違い

## 現場の声

> 初期化関数で構造体の配列を `malloc` し、件数が増えたら内部関数の中で `realloc` して値を入れる処理を書きました。
>
> 1周目は問題なく動きます。ところが**ループの2周目、まったく別の関数の中で `Segmentation fault`**。落ちた関数を何度見直しても、おかしなところはありません。
>
> 結局の原因は、**関数の引数の型と、実際に渡していた値が違っていたこと**でした。

`realloc` のバグは、**壊した場所と落ちる場所が離れる**のが厄介なところです。落ちた関数をいくら眺めても原因は見つかりません。この記事では、構造体 `Typ` を題材に、なぜ「2周目の別の関数」で落ちるのかと、`Typ **` / `Typ *[]` / `Typ [][]` の違いを整理します。

コードはすべて gcc 13.3（Ubuntu 24.04）で実行して確認しています。

## 前提の構成

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    int  id;
    char name[16];
} Typ;              /* sizeof(Typ) = 20 バイト */
```

まず、見た目が似ている3つの宣言が、メモリ上でどう違うかを押さえます。

| 宣言 | メモリの並び | 関数に渡したときの型 | `realloc` できるか |
|---|---|---|---|
| `Typ **pp` | ポインタ1個 → その先にポインタの配列 → 各要素の先に `Typ`（**それぞれ別の塊**） | `Typ **` のまま | `malloc` した領域なら可。ただし呼び出し元に反映するには `Typ ***` で渡すか戻り値で返す |
| `Typ *arr[N]` | ポインタ N 個が**連続して**並ぶ（中身の `Typ` は別の塊） | `Typ **` に変換される | 配列そのものは**不可**。各要素 `arr[i]` は `malloc` したものなら可 |
| `Typ grid[R][C]` | `Typ` が R×C 個、**1つの塊**で並ぶ。ポインタは1つも無い | `Typ (*)[C]` に変換される（`Typ **` には**ならない**） | **不可** |

```text
Typ **pp                  Typ *arr[2]                Typ grid[2][3]
┌────┐                    ┌──────┬──────┐            ┌────┬────┬────┬────┬────┬────┐
│ pp │──┐                 │arr[0]│arr[1]│            │[0] │[0] │[0] │[1] │[1] │[1] │
└────┘  ▼                 └──┬───┴──┬───┘            │[0] │[1] │[2] │[0] │[1] │[2] │
     ┌─────┬─────┐           ▼      ▼                └────┴────┴────┴────┴────┴────┘
     │pp[0]│pp[1]│        [Typ×3] [Typ×3]              ← Typ が6個、隙間なく1列 →
     └──┬──┴──┬──┘        （別の塊）
        ▼     ▼
   [Typ×3] [Typ×3]（別の塊）
```

実際に `sizeof` とアドレスの差を出すと、違いがはっきりします（R=2, C=3）。

```text
sizeof(Typ)  = 20
sizeof pp    = 8    (ポインタ1個)
sizeof arr   = 16   (ポインタ2個)
sizeof grid  = 120  (Typ 6個)
grid[0][2] → grid[1][0] の差 = 20 バイト（連続）
pp[0] と pp[1] の先頭の差   = 96 バイト（別の塊。値は環境で変わる）
```

`int` の二次元配列での同じ話は「[二次元配列で現場がハマる7つのポイント](/articles/c-2d-array)」でも扱っています。

## ハマりどころ1：`Typ *` を値渡しして、関数の中で realloc する（今回の本命）

**症状**

```c
Typ *init_list(int n)
{
    return calloc(n, sizeof(Typ));
}

/* NG：Typ * を値渡しで受け取り、関数の中で realloc している */
void add_item(Typ *list, int *count, int id, const char *name)
{
    Typ *tmp = realloc(list, (*count + 1) * sizeof *tmp);
    if (tmp == NULL) return;
    list = tmp;                                  /* 変わるのは関数内のコピーだけ */
    list[*count].id = id;
    snprintf(list[*count].name, sizeof list[*count].name, "%s", name);
    (*count)++;
}

void print_list(const Typ *list, int count)
{
    for (int i = 0; i < count; i++) {
        printf("%d:%s\n", list[i].id, list[i].name);
    }
}

int main(void)
{
    int count = 1;
    Typ *list = init_list(count);
    list[0].id = 1;
    strcpy(list[0].name, "alpha");

    for (int loop = 0; loop < 2; loop++) {
        add_item(list, &count, 100 + loop, "item");
        print_list(list, count);                 /* ← 2周目にここで解放済み領域を読む */
    }
    free(list);
    return 0;
}
```

`-Wall` を付けても**警告は1つも出ません**。型としては正しいからです。

**原因**

C の引数は**すべて値渡し**です。`add_item` の `list` は、`main` の `list` の**コピー**です。

`realloc` は、今の場所のままで広げられないと**別の場所に新しい領域を確保して中身をコピーし、元の領域を解放します**。このとき更新されるのは関数内のコピーだけです。`main` の `list` は**解放済みの古いアドレスを指したまま**残ります。

なぜ「2周目」なのかは、gdb で `realloc` の直後を見ると分かります。

```text
(gdb) break bad1.c:14
(gdb) run
Breakpoint 1, add_item (list=0x5555555592a0, ...)   ← 1周目：その場で広げられたのでアドレスは同じ
(gdb) continue
Breakpoint 1, add_item (list=0x55555555a2e0, ...)   ← 2周目：別の場所に移動した
(gdb) print list
$1 = (Typ *) 0x55555555a2e0                        ← 関数内のコピーは新しいアドレス
(gdb) up
#1  main () at bad1.c:34
(gdb) print list
$2 = (Typ *) 0x5555555592a0                        ← main は古い（解放済みの）アドレスのまま
```

- 1周目は、たまたまその場で広げられたので、アドレスが変わらず**正しく動いて見えます**。
- 2周目で領域が移動し、`main` の `list` が解放済みの領域を指すようになります。
- その古いアドレスを、**次に触った別の関数**（ここでは `print_list`）で落ちます。

解放済み領域を読んでもすぐ落ちるとは限りません。今回の環境では値が正しく表示されたまま進み、最後の `free(list)` で `free(): double free detected` になりました。現場のように**別の関数でセグフォ**する場合も、**値がおかしくなるだけ**の場合もあります。この「落ちる場所と症状が毎回違う」のが、このバグの見つけにくさです。

**対処1：`Typ **` で受け取り、呼び出し元のポインタを書き換える。**

```c
/* OK：Typ ** で受け取り、呼び出し元の Typ * を書き換える */
int add_item(Typ **pp, int *count, int id, const char *name)
{
    Typ *tmp = realloc(*pp, (*count + 1) * sizeof *tmp);
    if (tmp == NULL) return -1;                  /* 失敗しても *pp は元のまま */
    *pp = tmp;                                   /* 呼び出し元の list が更新される */
    tmp[*count].id = id;
    snprintf(tmp[*count].name, sizeof tmp[*count].name, "%s", name);
    (*count)++;
    return 0;
}

/* 呼び出し側：& を付けて渡す */
if (add_item(&list, &count, 100 + loop, "item") != 0) { /* エラー処理 */ }
```

**対処2：新しいアドレスを戻り値で返す。**

```c
/* OK：新しい先頭アドレスを戻り値で返す（失敗時は NULL、元の領域はそのまま） */
Typ *add_item(Typ *list, int *count, int id, const char *name)
{
    Typ *tmp = realloc(list, (*count + 1) * sizeof *tmp);
    if (tmp == NULL) return NULL;
    tmp[*count].id = id;
    snprintf(tmp[*count].name, sizeof tmp[*count].name, "%s", name);
    (*count)++;
    return tmp;
}

/* 呼び出し側：必ず受け取り直す */
Typ *tmp = add_item(list, &count, 100 + loop, "item");
if (tmp == NULL) { /* エラー処理（list は有効なまま） */ }
list = tmp;
```

戻り値方式は、呼び出し側で**受け取り直すのを忘れると同じバグ**になります。チームで迷うなら、後で紹介する「構造体にまとめる」方式がいちばん安全です。

## ハマりどころ2：`Typ **` を期待する関数に `Typ *` を渡す（`&` の付け忘れ）

今回の現場の「引数の型と渡した値が違った」は、このパターンでした。

**症状**

```c
void add_item(Typ **pp, int *count, int id);   /* Typ ** を期待 */

Typ *list = calloc(count, sizeof *list);
add_item(list, &count, 100);                   /* NG：& を付け忘れ（Typ * を渡している） */
```

```text
warning: passing argument 1 of 'add_item' from incompatible pointer type [-Wincompatible-pointer-types]
note: expected 'Typ **' but argument is of type 'Typ *'
```

gcc 13 までは**警告**なのでビルドは通ります（gcc 14 以降はエラー）。実行すると、今回の環境では**落ちずに `0` が表示されました**。

**原因**

関数の中の `*pp` は、「`list` の先頭8バイト」、つまり `list[0].id` と `list[0].name` の先頭を**アドレスとして**読んでいます。

- 中身が 0 なら `NULL` とみなされ、`realloc(NULL, …)` が新しい領域を確保します。
- その新しいアドレスを `*pp = tmp` で `list[0]` の中身に**上書き**します。
- 呼び出し元の `list` は1件分の大きさのままなので、`list[count - 1]` は**確保した範囲の外**を読みます。

データの中身しだいで「落ちる」「値が化ける」「たまたま動く」が変わります。ASan を付けると `heap-buffer-overflow` として検出されます。

**対処**

- `&list` を渡します。
- `incompatible pointer type` の警告は**エラーと同じ**と考え、キャストで黙らせないでください。
- ビルドに `-Werror=incompatible-pointer-types`（できれば `-Wall -Wextra -Werror`）を付け、警告を残せないようにします。

## ハマりどころ3：`Typ *arr[N]`（ポインタの配列）を realloc する

**症状**

```c
#define N 3

void grow(Typ **arr, int n)
{
    Typ **tmp = realloc(arr, (n + 1) * sizeof *tmp);   /* arr は malloc した領域ではない */
    /* ... */
}

Typ *arr[N] = {0};      /* ポインタの配列（スタック上） */
grow(arr, N);           /* Typ *[3] → Typ ** に変換されるので警告は出ない */
```

```text
mremap_chunk(): invalid pointer
Aborted (core dumped)
```

**原因**

`Typ *arr[N]` を関数に渡すと `Typ **` に変換されるので、`Typ **` で受け取ってもコンパイラは何も言いません。しかし `arr` の実体はスタック（またはグローバル）にあり、`malloc` で確保した領域ではありません。`realloc` / `free` に渡せるのは、`malloc` / `calloc` / `realloc` が返したアドレスだけです。

**対処**

- 件数が増えるなら、最初から `Typ **arr = malloc(…)` で確保します（ハマりどころ5）。
- `Typ *arr[N]` のままなら、`realloc` してよいのは**各要素** `arr[i]`（`malloc` したもの）だけです。
- 関数のコメントに「`pp` は malloc した領域であること」と書いておきます。

## ハマりどころ4：`Typ grid[R][C]` を `Typ **` で受け取る

**症状**

```c
void print_grid(Typ **g, int rows, int cols)
{
    for (int i = 0; i < rows; i++)
        for (int j = 0; j < cols; j++)
            printf("%d ", g[i][j].id);
}

Typ grid[R][C];
print_grid(grid, R, C);             /* 警告：expected 'Typ **' but argument is of type 'Typ (*)[3]' */
print_grid((Typ **)grid, R, C);     /* キャストで黙らせると → Segmentation fault */
```

**原因**

`grid` には**ポインタが1つも入っていません**（前提の図のとおり `Typ` が6個並んでいるだけ）。`Typ **` として扱うと、`g[i]` で `grid` の先頭の `id` や `name` のバイトを**アドレスとして読み**、`g[i][j]` でそのデタラメな場所にアクセスして落ちます。

**対処：列数を型に含めて受け取る。**

```c
/* OK：列数を型に含めて受け取る（Typ g[][C] と書いても同じ） */
void print_grid(Typ (*g)[C], int rows)
{
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < C; j++) printf("%d ", g[i][j].id);
        printf("\n");
    }
}

print_grid(grid, R);   /* キャスト不要 */
```

列数が実行時に決まる場合は、VLA に対応したコンパイラなら `void f(int rows, int cols, Typ g[rows][cols])` と書けます。`Typ grid[R][C]` は大きさが固定なので、**`realloc` で伸ばすことはできません**。伸ばしたいなら `malloc` で確保し直します。

## ハマりどころ5：`Typ **`（ポインタの配列）を伸ばすのに `Typ **` で受け取る

ハマりどころ1と同じ構造が、**1段深いところで**起きるパターンです。

- `Typ *` を関数の中で `realloc` したい → `Typ **` で受け取る
- `Typ **` を関数の中で `realloc` したい → **`Typ ***` で受け取る**

「伸ばしたいものの型に `*` を1つ足す」と覚えてください。

```c
/* ポインタ配列 Typ ** そのものを伸ばすときは Typ *** で受け取る */
int add_row(Typ ***rows, int *nrows, int cols)
{
    Typ **tmp = realloc(*rows, (*nrows + 1) * sizeof *tmp);
    if (tmp == NULL) return -1;
    *rows = tmp;
    tmp[*nrows] = calloc(cols, sizeof **tmp);
    if (tmp[*nrows] == NULL) return -1;
    (*nrows)++;
    return 0;
}

Typ **rows = NULL;      /* realloc(NULL, n) は malloc(n) と同じ */
int nrows = 0;
add_row(&rows, &nrows, 4);

/* 解放は「各行 → 外側」の順 */
for (int i = 0; i < nrows; i++) free(rows[i]);
free(rows);
```

`***` が出てきたら読みにくくなってきた合図です。次の「構造体にまとめる」方式に切り替えるのがおすすめです。

## ハマりどころ6：realloc の前に取ったアドレスを使い続ける

`Typ *cur = &list[0];` のように**要素のアドレスを別の変数に覚えておく**と、`realloc` で領域が移動したあと、`cur` は解放済み領域を指します。ハマりどころ1と同じことが、引数ではなくローカル変数で起きます。

- `realloc` のあとは、要素へのポインタではなく**添字**で持ち直します。
- `p = realloc(p, …)` と同じ変数に直接代入すると、失敗時に `NULL` で上書きされて元の領域がリークします。必ず一時変数で受けてください。

詳しくは「[malloc/freeで現場がハマる8つの落とし穴](/articles/c-memory-management)」のハマりどころ2と6で解説しています。

## 安全な書き方：ポインタと件数を構造体にまとめる

`realloc` するポインタ・件数・容量を1つの構造体にまとめ、**構造体へのポインタ**を渡します。関数の中でメンバを書き換えれば、呼び出し元にもそのまま反映されます。`**` や `***` が出てこないので、型の取り違えも起きにくくなります。

```c
typedef struct {
    Typ *items;      /* realloc で動くのはここだけ */
    int  count;
    int  cap;
} TypList;

int typlist_init(TypList *l, int cap)
{
    l->items = calloc(cap, sizeof *l->items);
    l->count = 0;
    l->cap   = (l->items != NULL) ? cap : 0;
    return (l->items != NULL) ? 0 : -1;
}

int typlist_add(TypList *l, int id, const char *name)
{
    if (l->count == l->cap) {
        int new_cap = l->cap * 2;
        Typ *tmp = realloc(l->items, new_cap * sizeof *tmp);
        if (tmp == NULL) return -1;
        l->items = tmp;      /* 構造体のメンバを更新するので、呼び出し元にも反映される */
        l->cap   = new_cap;
    }
    l->items[l->count].id = id;
    snprintf(l->items[l->count].name, sizeof l->items[l->count].name, "%s", name);
    l->count++;
    return 0;
}

void typlist_free(TypList *l)
{
    free(l->items);
    l->items = NULL;
    l->count = l->cap = 0;
}

/* 呼び出し側 */
TypList list;
if (typlist_init(&list, 1) != 0) { /* エラー処理 */ }
for (int loop = 0; loop < 5; loop++) {
    if (typlist_add(&list, 100 + loop, "item") != 0) break;
}
typlist_free(&list);
```

- 容量を2倍ずつ増やすので、1件ごとに `realloc` するより速くなります。
- **`TypList` を値渡し（`TypList l`）にすると、ハマりどころ1と同じバグ**になります。必ず `TypList *` で渡します（「[構造体配列で現場がハマる8つのポイント](/articles/c-struct-array)」のハマりどころ2も参照）。

## 確認方法：gdb・Valgrind・ASan

「2周目の別の関数で落ちる」タイプのバグは、**落ちた場所ではなく、壊した場所**を探す必要があります。次の3つは、壊した場所を教えてくれます。

### AddressSanitizer（ASan）：いちばん手軽

```bash
gcc -g -fsanitize=address bad1.c -o bad1 && ./bad1
```

```text
ERROR: AddressSanitizer: heap-use-after-free on address 0x503000000040
READ of size 4 at 0x503000000040 thread T0
    #0 in print_list bad1.c:22          ← 読んだ場所（落ちた関数）
    #1 in main bad1.c:35
freed by thread T0 here:
    #0 in realloc
    #1 in add_item bad1.c:11            ← 解放した場所（原因の realloc）
    #2 in main bad1.c:34
previously allocated by thread T0 here:
    #0 in calloc
    #1 in init_list bad1.c:5            ← 最初に確保した場所
```

**「読んだ場所」「解放した場所」「確保した場所」が1回で全部出ます。** 再コンパイルが必要ですが、まず最初に試す価値があります。

### Valgrind：再コンパイルなしで使える

```bash
valgrind ./bad1
```

```text
Invalid read of size 4
   at 0x109345: print_list (bad1.c:22)
   by 0x1093F4: main (bad1.c:35)
 Address 0x4a7b040 is 0 bytes inside a block of size 20 free'd
   at 0x484DB80: realloc
   by 0x109252: add_item (bad1.c:11)
```

`was free'd` の後ろに `realloc` が出たら、今回のパターンでほぼ確定です。行番号を出すには `-g` 付きでビルドしておきます。ASan より遅いですが、ビルド手順を変えられない案件で役立ちます。

### gdb：アドレスのズレを目で確かめる

```text
(gdb) break add_item
(gdb) run
(gdb) next                 ← realloc の行を実行
(gdb) print tmp            ← 新しいアドレス
(gdb) up                   ← 呼び出し元のフレームへ
(gdb) print list           ← 呼び出し元のアドレス
```

`tmp` と呼び出し元の `list` が違っていれば、呼び出し元に反映されていません。gdb の基本操作は「[gdbで「どこで・なぜ落ちたか」を10分で突き止める手順](/articles/c-gdb-debugging)」を参照してください。

## チェックリスト

- [ ] 関数の中で `realloc` するポインタを、`Typ **` で受け取るか、戻り値で返している
- [ ] 戻り値方式の場合、呼び出し側で必ず受け取り直している
- [ ] `Typ **` を受け取る関数に、`&` を付けて渡している
- [ ] `incompatible pointer type` の警告をキャストで消していない（`-Werror` で止めている）
- [ ] `realloc` / `free` に渡しているのは `malloc` / `calloc` / `realloc` が返したアドレスだけ
- [ ] `Typ grid[R][C]` を `Typ **` で受け取っていない（`Typ (*)[C]` で受ける）
- [ ] ポインタの配列 `Typ **` を伸ばす関数は `Typ ***` で受け取っている
- [ ] `realloc` の戻り値を一時変数で受けている
- [ ] `realloc` の前に取った要素のアドレスを、後で使っていない
- [ ] 構造体（`TypList` など）を値渡しで関数に渡していない
- [ ] テストで `-fsanitize=address` か Valgrind を一度は通している

## まとめ

- C の引数は**すべて値渡し**です。関数の中で `realloc` したポインタは、**`Typ **` で受け取るか戻り値で返さない限り、呼び出し元に反映されません**。
- `realloc` は領域を**移動することがあり**、移動したかどうかは実行ごとに変わります。そのため「1周目は動き、2周目の別の関数で落ちる」という、原因から離れた場所の症状になります。
- `Typ **` / `Typ *[N]` / `Typ [R][C]` は、見た目が似ていても**メモリの並びも渡したときの型も別物**です。特に `Typ [R][C]` は `Typ **` として扱えません。
- 型が合わない警告は**バグの予告**です。キャストで黙らせず、`-Werror` で止めてください。
- 「2周目に別の関数で落ちる」と思ったら、まず **ASan** でビルドし直して実行します。壊した場所が1回で分かります。
