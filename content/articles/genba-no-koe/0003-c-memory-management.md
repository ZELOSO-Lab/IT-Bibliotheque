---
series: 現場の声
no: 0003
title: 【C言語】テストでは動くのに本番で落ちる。malloc/freeで現場がハマる8つの落とし穴と、メモリ事故を防ぐ書き方
slug: c-memory-management
category: C言語
tags: [C言語, メモリ管理, malloc, free, メモリリーク, Valgrind, AddressSanitizer]
excerpt: 「テストでは動くのに本番で落ちる」「長時間動かすとメモリが増え続ける」。C言語のmalloc/freeで現場がハマる8つの落とし穴と、Valgrind・AddressSanitizerを使った調べ方、事故を防ぐ書き方をまとめました。
status: draft
created: 2026-10-12
---

# 【C言語】テストでは動くのに本番で落ちる。malloc/freeで現場がハマる8つの落とし穴と、メモリ事故を防ぐ書き方

## 現場の声

> 「単体テストは全部 OK でした」
>
> そう報告して結合テストに入った翌週、客先の常駐機で**3日に1回プロセスが落ちる**という連絡が来ました。ログには `Segmentation fault` の1行だけ。手元で何度動かしても再現しません。
>
> 調べてみると原因は2つ。エラー時の分岐で `free` が漏れていて**メモリが少しずつ増え続けていた**こと、そして別の関数で**解放済みの領域を参照していた**こと。テスト環境では、たまたま解放済みの領域に古い値が残っていたので動いていただけでした。

C言語のメモリ事故は「その場で落ちない」のが厄介です。この記事では、現場で本当に多い落とし穴と、ツールでの見つけ方、事故を防ぐ書き方を整理します。

## 前提：C言語のメモリは4つの領域に分かれる

| 領域 | 何が置かれるか | 寿命 | 解放 |
| --- | --- | --- | --- |
| スタック | 関数内のローカル変数・引数 | 関数を抜けるまで | 自動 |
| ヒープ | `malloc` / `calloc` / `realloc` で確保した領域 | `free` するまで | **手動** |
| 静的領域 | グローバル変数・`static` 変数 | プログラム終了まで | 自動 |
| 読み取り専用領域 | 文字列リテラル（`"abc"`）など | プログラム終了まで | — |

```c
#include <stdlib.h>

int g_count;                      /* 静的領域 */

void sample(void)
{
    int local = 10;               /* スタック：関数を抜けると消える */
    static int calls = 0;         /* 静的領域：値が残り続ける */
    char *msg = "hello";          /* msg 自体はスタック、"hello" は読み取り専用領域 */
    int *buf = malloc(100 * sizeof *buf);   /* buf はスタック、指す先はヒープ */

    /* ... */
    free(buf);                    /* ヒープだけは自分で返す */
}
```

**ヒープだけが「自分で確保して、自分で返す」領域**です。以下の落とし穴は、ほぼすべてヒープの扱いか、スタックの寿命の勘違いで起きます。

## ハマりどころ1：エラー時の分岐で free を忘れる（メモリリーク）

**症状**

長時間動かすとメモリ使用量が少しずつ増え、最終的に `malloc` が `NULL` を返して異常終了する。

**原因**

正常系では `free` しているが、途中の `return` で抜ける分岐で漏れている。

```c
/* NG：途中の return で buf が漏れる */
int load_file(const char *path)
{
    char *buf = malloc(4096);
    if (buf == NULL) return -1;

    FILE *fp = fopen(path, "r");
    if (fp == NULL) {
        return -1;                /* ← buf が解放されない */
    }
    /* ... */
    fclose(fp);
    free(buf);
    return 0;
}
```

**対処：後始末を関数の最後に1か所にまとめる（goto cleanup パターン）。**

```c
/* OK：どこで失敗しても cleanup を通る */
int load_file(const char *path)
{
    int   ret = -1;
    char *buf = NULL;
    FILE *fp  = NULL;

    buf = malloc(4096);
    if (buf == NULL) goto cleanup;

    fp = fopen(path, "r");
    if (fp == NULL) goto cleanup;

    /* ... 処理 ... */
    ret = 0;

cleanup:
    if (fp != NULL) fclose(fp);
    free(buf);                    /* free(NULL) は何もしないので安全 */
    return ret;
}
```

- 変数は**関数の先頭で `NULL` 初期化**しておくと、どこから `cleanup` に飛んでも安全に解放できます。
- Linux カーネルでも使われている定番の書き方です。「goto は禁止」というコーディング規約の現場でも、後始末用途だけは許可されていることが多いので確認してみてください。

## ハマりどころ2：free した後も使い続ける（解放後使用）

**症状**

たまにだけ落ちる。値が化ける。手元では再現しない。

**原因**

`free` しても、ポインタ変数の中身（アドレス）はそのまま残ります。その後に参照すると、すでに別の用途に再利用された領域を読み書きしてしまいます。**解放直後はたまたま古い値が残っていることが多い**ので、テストでは動いてしまいます。

```c
char *name = malloc(32);
strcpy(name, "tanaka");
free(name);
printf("%s\n", name);        /* NG：解放後使用。動くこともあるので気づきにくい */
```

**対処：free した直後に NULL を代入する。**

```c
free(name);
name = NULL;                 /* 以後の誤用は NULL 参照として即座に落ちるので発見しやすい */
```

マクロにしておくと徹底しやすくなります。

```c
#define SAFE_FREE(p) do { free(p); (p) = NULL; } while (0)
```

ただし、同じ領域を指す**別のポインタ**（構造体のメンバや、引数で渡した先のコピー）は `NULL` になりません。「誰がこの領域の持ち主か」を決めておくことが本質的な対策です（ハマりどころ8）。

## ハマりどころ3：二重解放

**症状**

`free(): double free detected in tcache 2` や `munmap_chunk(): invalid pointer` と表示されて異常終了する。

**原因**

同じ領域を2回 `free` している。呼び出し元と呼び出し先の両方で解放しているケースが典型です。

```c
void save_and_free(char *data) { /* ... */ free(data); }

char *data = malloc(100);
save_and_free(data);
free(data);                  /* NG：関数の中ですでに解放済み */
```

**対処**

- 関数名やコメントで「この関数は引数を解放する」ことを明示する（例：`xxx_take()`、`xxx_destroy()`）
- 基本は「確保した側が解放する」に統一する
- `SAFE_FREE` で `NULL` にしておけば、同じ変数での二重解放は `free(NULL)` になり無害化されます

## ハマりどころ4：malloc のサイズ計算を間違える

**症状**

文字列の末尾が化ける。別の変数の値が勝手に変わる。

**原因：よくある3パターン**

```c
/* NG1：文字列の終端 '\0' の分を確保していない */
char *copy = malloc(strlen(src));          /* +1 が必要 */
strcpy(copy, src);

/* NG2：要素数だけ渡して、型のサイズを掛けていない */
int *nums = malloc(n);                     /* n バイトしかない。n * sizeof(int) が必要 */

/* NG3：ポインタのサイズを取っている */
struct Item *item = malloc(sizeof(item));  /* ポインタのサイズ（8バイト）しか確保されない */
```

**対処：`sizeof *変数名` の形で書く。**

```c
char *copy = malloc(strlen(src) + 1);
int  *nums = malloc(n * sizeof *nums);
struct Item *item = malloc(sizeof *item);
```

`sizeof *nums` は「`nums` が指す先の型のサイズ」です。後から型を変えてもサイズ計算がずれません。

## ハマりどころ5：ローカル変数のアドレスを返す

**症状**

関数から受け取った文字列が、次の関数を呼んだ瞬間に壊れる。

**原因**

ローカル変数（スタック）は関数を抜けた時点で寿命が終わります。そのアドレスを返しても、指す先はすぐ別の関数呼び出しで上書きされます。

```c
/* NG */
char *make_message(int code)
{
    char msg[64];
    sprintf(msg, "error code=%d", code);
    return msg;              /* gcc なら -Wall で warning: function returns address of local variable */
}
```

**対処：呼び出し元がバッファを用意して渡す。**

```c
/* OK：バッファとサイズを受け取る（標準ライブラリと同じ形） */
void make_message(char *out, size_t out_size, int code)
{
    snprintf(out, out_size, "error code=%d", code);
}

/* 呼び出し側 */
char msg[64];
make_message(msg, sizeof msg, 42);
```

ヒープで返す方法（`malloc` して返し、呼び出し元が `free`）もありますが、解放責任が呼び出し元に移るので、関数のコメントに必ず明記します。

## ハマりどころ6：realloc の戻り値を同じ変数に直接代入する

**症状**

メモリ不足のときだけ、元のデータが失われてリークする。

**原因**

`realloc` は失敗すると `NULL` を返しますが、**元の領域は解放されずに残ります**。同じ変数に代入すると、元の領域のアドレスを失います。

```c
/* NG */
list = realloc(list, new_cap * sizeof *list);   /* 失敗すると list が NULL になり、元の領域がリーク */
```

**対処：一時変数で受ける。**

```c
/* OK */
int *tmp = realloc(list, new_cap * sizeof *list);
if (tmp == NULL) {
    /* list はまだ有効。エラー処理して、後で free(list) する */
    return -1;
}
list = tmp;
cap  = new_cap;
```

また、`realloc` は領域を**別の場所に移動することがあります**。移動前のアドレスを別の変数に覚えていると、そちらは解放済み領域を指すことになります（ハマりどころ2）。

## ハマりどころ7：malloc した領域を初期化せずに使う

**症状**

デバッグビルドでは動くのに、リリースビルドや別の環境で値がおかしくなる。

**原因**

`malloc` で確保した領域の中身は**不定**です。たまたま 0 が入っている環境では動きますが、それは保証されていません。

**対処**

- 0 で初期化したい場合は `calloc` を使う（要素数とサイズを別々に渡すので、掛け算のオーバーフローも検出してくれる）
- 構造体は確保直後に全メンバへ値を入れる

```c
struct Item *items = calloc(count, sizeof *items);   /* 全バイト 0 で確保 */
if (items == NULL) { /* エラー処理 */ }
```

## ハマりどころ8：「誰が free するのか」が決まっていない

**症状**

リーク・二重解放・解放後使用が、修正しても別の場所でまた出てくる。

**原因**

ここまでの落とし穴の根本原因です。ポインタが関数や構造体の間で受け渡されるうちに、「この領域を最後に free するのは誰か（所有者）」が曖昧になっています。

**対処：確保と解放を対にした関数を用意し、コメントで所有権を明記する。**

```c
/* item.h */
typedef struct {
    char *name;
    int   price;
} Item;

/* 生成：戻り値は呼び出し元が item_destroy() で解放すること */
Item *item_create(const char *name, int price);

/* 破棄：NULL を渡しても安全 */
void item_destroy(Item *item);
```

```c
/* item.c */
#include <stdlib.h>
#include <string.h>
#include "item.h"

Item *item_create(const char *name, int price)
{
    Item *item = calloc(1, sizeof *item);
    if (item == NULL) return NULL;

    item->name = malloc(strlen(name) + 1);
    if (item->name == NULL) {
        free(item);
        return NULL;
    }
    strcpy(item->name, name);
    item->price = price;
    return item;
}

void item_destroy(Item *item)
{
    if (item == NULL) return;
    free(item->name);            /* 中身から先に解放する */
    free(item);
}
```

- **`create` と `destroy` を必ずペアで呼ぶ**、とだけ覚えればよい形にします。
- メンバに `malloc` した領域を持つ構造体は、`free(item)` だけだとメンバ側がリークします。解放は「中身 → 外側」の順です。

## ツールでメモリ事故を見つける

目視レビューだけでメモリ事故を見つけるのは困難です。現場では次の2つを使います。

### AddressSanitizer（gcc / clang に内蔵）

コンパイルオプションを1つ足すだけで、解放後使用・二重解放・範囲外アクセス・リークを**発生した行で**止めてくれます。

```text
$ gcc -g -O0 -fsanitize=address -fno-omit-frame-pointer -o app main.c
$ ./app
==12345==ERROR: AddressSanitizer: heap-use-after-free on address 0x602000000010 ...
READ of size 1 at 0x602000000010 thread T0
    #0 ... in main main.c:9
...
freed by thread T0 here:
    #0 ... in free
    #1 ... in main main.c:8
```

- 「どの行で読んだか」と「どの行で free したか」の両方が表示されます。
- 実行速度は2倍程度遅くなるので、テスト用ビルドで使います。
- Windows の MSYS2 では UCRT64 の gcc が AddressSanitizer に対応していないため、clang64 環境の clang か、Linux（WSL）で実行します。

### Valgrind（Linux）

再コンパイル不要で、既存の実行ファイルをそのまま検査できます。

```text
$ valgrind --leak-check=full ./app
==23456== 4,096 bytes in 1 blocks are definitely lost in loss record 1 of 1
==23456==    at 0x...: malloc (vg_replace_malloc.c:...)
==23456==    by 0x...: load_file (main.c:6)
==23456==    by 0x...: main (main.c:30)
```

`definitely lost` がリークです。表示された行の `malloc` に対応する `free` がどの分岐で漏れているかを確認します。

## 事故を防ぐ書き方（まとめ）

### 1. 確保するとき

- `malloc(個数 * sizeof *変数)` の形で書く
- 戻り値の `NULL` チェックを必ず行う
- 初期化が必要なら `calloc` を使う

### 2. 使うとき

- 文字列の確保は `strlen + 1`
- コピーは `snprintf` / `memcpy` など**サイズを渡す関数**を使う
- `realloc` は一時変数で受ける

### 3. 解放するとき

- 関数内の後始末は `goto cleanup` で1か所にまとめる
- `free` の直後に `NULL` を代入する
- 構造体は `create` / `destroy` をペアで用意し、中身から先に解放する

### 4. 確認するとき

- テスト用ビルドに `-fsanitize=address` を付けて全テストを流す
- 長時間動かすプログラムは Valgrind の `--leak-check=full` で終了時のリークをゼロにする

## チェックリスト

- [ ] `malloc` / `calloc` / `realloc` の戻り値をすべて `NULL` チェックしている
- [ ] サイズ計算は `sizeof *変数` の形で書いている
- [ ] 文字列の確保に `+1`（終端 `'\0'`）が入っている
- [ ] エラー時の `return` でも確保した領域が解放される
- [ ] `free` の直後に `NULL` を代入している
- [ ] ローカル変数のアドレスを返していない
- [ ] `realloc` を一時変数で受けている
- [ ] ヒープ領域を持つ構造体に `create` / `destroy` がある
- [ ] 関数のコメントに「誰が解放するか」が書いてある
- [ ] AddressSanitizer / Valgrind でエラー・リークがゼロ

## まとめ

- C言語のメモリ事故は**その場で落ちない**ため、テストをすり抜けて本番で発覚します。
- 防ぎ方の基本は、`goto cleanup` で後始末を1か所に集めること、`free` 後に `NULL` を入れること、そして「誰が free するか」を関数の設計で決めることです。
- 目視では限界があるので、AddressSanitizer と Valgrind を**テスト工程に組み込む**のが一番の近道です。

次の記事では、メモリ管理と切り離せない「ポインタ」でよくある勘違いを扱います。
