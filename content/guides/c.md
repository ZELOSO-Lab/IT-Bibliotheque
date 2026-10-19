---
title: C 技術まとめ
slug: c
excerpt: C言語の基本文法とポインタ・メモリ管理の考え方、gcc / Visual Studio での環境構築、コンパイルやデバッグのコマンド、ファイル処理や動的配列のサンプル、コンパイルエラー・実行時エラーの対処、現場で事故を防ぐ実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# C 技術まとめ

## 基礎

C言語は、組込み機器・OS・ドライバ・ミドルウェアなど「ハードウェアに近く、性能が重要な場所」で使われる手続き型言語です。ソースコードをコンパイラで機械語に変換して実行します。メモリを直接扱える反面、**範囲外アクセスや解放忘れをコンパイラも実行環境も止めてくれない**のが最大の特徴であり、注意点です。

### 主な用途

- 組込み開発（マイコン、家電、車載、産業機器）
- OS・デバイスドライバ（Linux カーネルなど）
- ミドルウェア・ライブラリ（データベース、言語処理系、通信ライブラリ）
- 性能重視の処理、他言語から呼び出すネイティブライブラリ

### まず押さえる用語

| 用語 | 意味 | 現場での注意点 |
| --- | --- | --- |
| コンパイル / リンク | ソースを機械語（.o / .obj）に変換し、ライブラリと結合して実行ファイルを作る | エラーが「コンパイル時」か「リンク時」かで原因の探し方が変わる |
| ヘッダファイル（.h） | 関数の宣言・型・マクロをまとめたファイル | 宣言だけで実体はない。実体（.c やライブラリ）がないとリンクエラー |
| プリプロセッサ | `#include` `#define` `#ifdef` をコンパイル前に処理する | マクロは単純な文字置換。引数は必ず括弧で囲む |
| ポインタ | メモリ上のアドレスを保持する変数 | 未初期化・解放済み・NULL のポインタを使うとクラッシュ |
| スタック / ヒープ | 関数内の変数が置かれる領域 / `malloc` で確保する領域 | ローカル変数のアドレスを関数の外へ返さない |
| 未定義動作（UB） | 規格上、結果が保証されない操作 | 「たまたま動く」が最も危険。最適化レベルを変えると壊れる |
| 規格（C89/C99/C11/C17/C23） | 言語仕様のバージョン | 組込みでは古い規格や独自拡張のコンパイラが残っていることが多い |

### 型のサイズは環境依存

`int` や `long` のサイズは規格で固定されていません。特に **`long` は 64bit Linux では 8バイト、64bit Windows では 4バイト**です。サイズが重要な箇所（通信データ、ファイルフォーマット、レジスタ）では `<stdint.h>` の `int32_t` `uint8_t` などを使います。

| 型 | 典型的なサイズ | printf 書式 |
| --- | --- | --- |
| `char` | 1バイト（符号の有無は処理系依存） | `%c` / `%d` |
| `int` | 4バイト | `%d` |
| `long` | 4 または 8バイト | `%ld` |
| `long long` | 8バイト | `%lld` |
| `size_t` | ポインタと同じ幅（符号なし） | `%zu` |
| `double` | 8バイト | `%f`（scanf では `%lf`） |
| ポインタ | 4 または 8バイト | `%p` |

### 文字列は「NUL終端の char 配列」

C の文字列は末尾に `'\0'` が付いた `char` 配列です。`"abc"` は4バイト必要です。文字列の長さを別に持たないため、**コピー先のサイズを常に意識する**必要があります。

## 環境構築

### Linux

```bash
# Debian / Ubuntu
sudo apt update
sudo apt install build-essential gdb    # gcc, make, libc の開発用ファイル一式

# RHEL / Rocky / AlmaLinux / Fedora
sudo dnf install gcc make gdb

gcc --version
```

### Windows

| 方法 | コンパイラ | 向いている場面 |
| --- | --- | --- |
| Visual Studio（Community 等） | MSVC（`cl.exe`） | Windows 向けアプリ・DLL、社内標準が Visual Studio の現場 |
| MSYS2 + MinGW-w64 | gcc | Linux と同じ gcc / make を Windows で使いたい |
| WSL（Windows Subsystem for Linux） | gcc | Linux 向けのコードを開発する（推奨） |

Visual Studio の場合は、インストーラーで「**C++ によるデスクトップ開発**」ワークロードを選びます。コマンドで使うときは、スタートメニューの「**Developer Command Prompt for VS**」（または Developer PowerShell）を開くと `cl` にパスが通っています。

```powershell
cl /W4 /utf-8 main.c      # main.exe ができる
.\main.exe
```

MSYS2 の場合は、インストール後に「MSYS2 UCRT64」ターミナルで次を実行します。

```bash
pacman -S mingw-w64-ucrt-x86_64-gcc mingw-w64-ucrt-x86_64-gdb make
gcc --version
```

### 動作確認

```c
#include <stdio.h>

int main(void) {
    printf("Hello, World\n");
    return 0;
}
```

```bash
gcc -Wall -O2 -o app main.c
./app
```

エディタは VS Code ＋ C/C++ 拡張機能が定番です。組込み開発では、マイコンメーカーの IDE やクロスコンパイラ（例: `arm-none-eabi-gcc`）を使います。

## コマンド

### gcc の主なオプション

| オプション | 用途 |
| --- | --- |
| `-o app` | 出力ファイル名を指定する |
| `-c` | コンパイルだけ行い、オブジェクトファイル（.o）を作る |
| `-Wall -Wextra` | 主要な警告を有効にする（常に付ける） |
| `-Werror` | 警告をエラー扱いにする（CI で有効） |
| `-std=c11` / `-std=c17` | 準拠する規格を指定する |
| `-O0` / `-O2` | 最適化なし（デバッグ用） / 通常の最適化 |
| `-g` | デバッグ情報を付ける |
| `-I dir` | ヘッダの検索パスを追加する |
| `-L dir` / `-lname` | ライブラリの検索パス / リンクするライブラリ（`-lm` は数学ライブラリ） |
| `-D NAME=値` | マクロを定義する（`-DDEBUG`） |
| `-E` | プリプロセス結果だけを出力する（マクロ展開の確認） |
| `-fsanitize=address,undefined` | メモリ破壊・未定義動作を実行時に検出する |

### ビルドと実行

```bash
gcc -Wall -O2 -o app main.c                 # 1ファイル
gcc -Wall -O2 -o app main.c util.c -lm      # 複数ファイル＋数学ライブラリ
gcc -g -O0 -o app main.c                    # デバッグ用
gcc -c util.c                               # util.o だけ作る
gcc -E main.c | less                        # マクロ展開後のソースを確認
./app; echo $?                              # 終了コードの確認（Windows cmd は echo %ERRORLEVEL%）
```

`-l` はソースファイルより**後ろ**に書きます。前に書くとリンカが未解決シンボルを解決できないことがあります。

### デバッグ（gdb）

```bash
gcc -g -O0 -o app main.c
gdb ./app
```

| gdb コマンド | 意味 |
| --- | --- |
| `run 引数` | 実行開始 |
| `break main` / `break util.c:42` | ブレークポイント |
| `next` / `step` | 1行実行（関数に入らない / 入る） |
| `print 変数` | 値の表示（`print *p`、`print arr[0]@10`） |
| `bt` | バックトレース（クラッシュ箇所の特定に必須） |
| `continue` / `quit` | 続行 / 終了 |

### メモリ不具合の検出

```bash
gcc -g -fsanitize=address,undefined -o app main.c && ./app   # AddressSanitizer
valgrind --leak-check=full ./app                               # Valgrind（Linux）
```

### 早見表：構文

| 操作 | 構文 |
| --- | --- |
| 整数・小数 | `int n = 10; double d = 3.14;` |
| 配列 | `int a[5] = {1, 2, 3, 4, 5};` |
| 配列の要素数 | `sizeof(a) / sizeof(a[0])` |
| 文字列 | `char s[] = "abc";` |
| 構造体 | `typedef struct { int x; int y; } Point;` |
| if / for / while | `if (x > 0) { ... }` / `for (int i = 0; i < n; i++)` / `while (cond)` |
| switch | `switch (c) { case 1: ...; break; default: ...; }` |
| アドレスと参照 | `int *p = &n; *p = 20;` |
| 動的確保 / 解放 | `int *p = malloc(sizeof *p * n);` / `free(p); p = NULL;` |
| 安全な文字列コピー | `snprintf(dst, sizeof dst, "%s", src);` |
| 書式付き出力 | `printf("%d %s %.2f\n", n, s, d);` |
| ファイル | `FILE *fp = fopen("a.txt", "r"); fgets(buf, sizeof buf, fp); fclose(fp);` |

## サンプル

### CSV を読んで集計する（エラー処理込み）

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* CSV（名前,点数）を読み込み、合計と平均を表示する */
int main(int argc, char *argv[])
{
    if (argc < 2) {
        fprintf(stderr, "usage: %s file.csv\n", argv[0]);
        return EXIT_FAILURE;
    }

    FILE *fp = fopen(argv[1], "r");
    if (fp == NULL) {
        perror(argv[1]);               /* 例: data.csv: No such file or directory */
        return EXIT_FAILURE;
    }

    char line[256];
    long total = 0;
    int count = 0;

    while (fgets(line, sizeof(line), fp) != NULL) {
        line[strcspn(line, "\r\n")] = '\0';   /* 改行（CRLFも）を削除 */
        char *comma = strchr(line, ',');
        if (comma == NULL) continue;          /* 不正な行は読み飛ばす */
        *comma = '\0';

        char *end;
        long score = strtol(comma + 1, &end, 10);
        if (end == comma + 1) continue;       /* 数値でない（見出し行など） */

        printf("%-10s %3ld\n", line, score);
        total += score;
        count++;
    }
    fclose(fp);

    if (count > 0) {
        printf("count=%d total=%ld avg=%.2f\n", count, total, (double)total / count);
    }
    return EXIT_SUCCESS;
}
```

ポイントは、`fopen` の戻り値を必ず確認すること、`atoi` ではなく**変換失敗を検出できる `strtol`** を使うこと、Windows で作られた CSV の **CRLF** を考慮することです。

### 可変長配列（realloc の正しい使い方）

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int *data;
    size_t size;
    size_t capacity;
} IntVec;

static int vec_push(IntVec *v, int value)
{
    if (v->size == v->capacity) {
        size_t newcap = (v->capacity == 0) ? 4 : v->capacity * 2;
        int *p = realloc(v->data, newcap * sizeof *p);
        if (p == NULL) return -1;     /* 失敗時も元の v->data は有効 */
        v->data = p;
        v->capacity = newcap;
    }
    v->data[v->size++] = value;
    return 0;
}

static void vec_free(IntVec *v)
{
    free(v->data);
    v->data = NULL;
    v->size = v->capacity = 0;
}

int main(void)
{
    IntVec v = {0};
    for (int i = 1; i <= 10; i++) {
        if (vec_push(&v, i * i) != 0) {
            fprintf(stderr, "out of memory\n");
            vec_free(&v);
            return EXIT_FAILURE;
        }
    }
    for (size_t i = 0; i < v.size; i++) {
        printf("%zu: %d\n", i, v.data[i]);
    }
    vec_free(&v);
    return EXIT_SUCCESS;
}
```

`v->data = realloc(v->data, ...)` と直接代入すると、失敗時に NULL で上書きされて元のメモリがリークします。**一時変数で受けてから代入**するのが定石です。

### 複数ファイル構成の Makefile

```makefile
CC      = gcc
CFLAGS  = -std=c11 -Wall -Wextra -O2
LDLIBS  = -lm
SRCS    := $(wildcard src/*.c)
OBJS    := $(SRCS:.c=.o)
TARGET  := app

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^ $(LDLIBS)

%.o: %.c
	$(CC) $(CFLAGS) -MMD -MP -c -o $@ $<

-include $(OBJS:.o=.d)

.PHONY: clean
clean:
	$(RM) $(TARGET) $(OBJS) $(OBJS:.o=.d)
```

`-MMD -MP` でヘッダの依存関係（.d ファイル）が自動生成され、ヘッダだけを変更したときも正しく再ビルドされます。レシピ行の先頭は**スペースではなくタブ**です。

### ヘッダファイルの書き方（インクルードガード）

```c
/* util.h */
#ifndef UTIL_H
#define UTIL_H

#include <stddef.h>

double hyp(double a, double b);       /* 宣言だけ書く。実体は util.c */
extern int g_debug_level;             /* グローバル変数も extern で宣言のみ */

#endif /* UTIL_H */
```

## エラー対応

### コンパイル・リンク時（gcc）

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `fatal error: xxx.h: No such file or directory` | ヘッダのパスが通っていない、開発用パッケージ未導入 | `-I` でパスを追加。ライブラリの `-dev` / `-devel` パッケージを入れる |
| `error: expected ';' before '}' token` | セミコロンの付け忘れ | 指摘行の**1つ前の行**も確認する |
| `warning: implicit declaration of function 'xxx'` | `#include` 忘れ、宣言のない関数の呼び出し | 対応するヘッダ（`printf` なら `<stdio.h>`）を include。C99 以降は規格違反で、GCC 14 以降は既定でエラー |
| `undefined reference to 'xxx'` | 関数の実体がリンクされていない | .c ファイルの指定漏れ、`-l` の指定漏れ（`sqrt` なら `-lm`）、`-l` の順序を確認 |
| `collect2: error: ld returned 1 exit status` | リンカのエラー（上の行に本当の原因がある） | 直前に出ている `undefined reference` などを読む |
| `multiple definition of 'xxx'` | ヘッダに変数・関数の**定義**を書いて複数の .c から include | ヘッダには宣言（`extern`）だけを書き、定義は1つの .c に置く |
| `warning: format '%d' expects argument of type 'int', but argument 2 has type 'char *'` | printf の書式と引数の型の不一致 | 型に合った書式にする（`size_t` は `%zu`、`long` は `%ld`） |

### MSVC（Visual Studio）

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `C4996: 'strcpy': This function or variable may be unsafe. Consider using strcpy_s instead.` | 安全でないとされる関数の使用（SDL チェック有効時はエラー） | `snprintf` などに置き換える。移植性のため従来関数を使う場合はプロジェクトで `_CRT_SECURE_NO_WARNINGS` を定義 |
| `LNK2019: 未解決の外部シンボル` | 関数の実体やライブラリ（.lib）が不足 | プロジェクトにソースを追加、リンカの「追加の依存ファイル」に .lib を追加 |
| `LNK1104: ファイル 'xxx.exe' を開くことができません` | 実行中の exe を上書きしようとしている | 実行中のプログラムを終了してから再ビルド |
| `C4819: ファイルは、現在のコード ページ (932) で表示できない文字を含んでいます` | UTF-8（BOMなし）のソースを Shift_JIS として読んでいる | コンパイルオプションに `/utf-8` を付ける |

### 実行時

| 症状・メッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `Segmentation fault (core dumped)` | NULL・未初期化・解放済みポインタの参照、配列の範囲外アクセス、スタックオーバーフロー | `-g` 付きでビルドし、gdb の `bt` でクラッシュ位置を特定。`-fsanitize=address` で再現させる |
| `free(): double free detected in tcache 2` | 同じポインタを2回 `free` した | `free` 後に `p = NULL;` を代入する（`free(NULL)` は何もしない） |
| `ERROR: AddressSanitizer: heap-buffer-overflow` | 確保したサイズを超えて書き込んだ | 表示されたスタックトレースの行を確認。終端 `'\0'` の1バイト分を忘れていないか |
| 文字化け | ソースの文字コードと実行環境（コンソール）の文字コードの不一致 | ソースを UTF-8 に統一し、MSVC は `/utf-8`、Windows コンソールは `chcp 65001` |
| 最適化（`-O2`）を付けると結果が変わる | 未定義動作（初期化忘れ、符号付き整数のオーバーフローなど） | `-Wall -Wextra` の警告をすべて解消し、`-fsanitize=undefined` で確認 |

## 実務Tips

### 安全なコードの基本

- **警告はすべて直す**。`-Wall -Wextra`（MSVC は `/W4`）を常に付け、可能なら CI で `-Werror` にする
- `malloc` / `fopen` / `realloc` の**戻り値は必ずチェック**する
- `gets` は使わない（C11 で削除済み）。`strcpy` / `strcat` / `sprintf` より、サイズを渡す `snprintf` / `fgets` を使う
- `strncpy` は**コピー元が長いと終端 `'\0'` を付けない**。使う場合は `dst[sizeof dst - 1] = '\0';` を必ず追加する
- 確保と解放は同じ関数（または対になる関数）で行い、エラー時の解放漏れを防ぐ。後始末を1か所に集める `goto cleanup;` パターンは C では正当な手法
- マクロより `static inline` 関数や `enum` / `const` を使う。マクロを使うなら引数と全体を括弧で囲む

### 移植性・保守性

- サイズが重要な型は `<stdint.h>` の固定幅整数（`uint32_t` など）を使う
- 構造体をそのままファイルや通信に書き出さない（パディングとエンディアンが環境で異なる）
- グローバル変数は最小限に。ファイル内でしか使わない関数・変数には `static` を付ける
- 改行コードと文字コード（UTF-8 / Shift_JIS）はプロジェクトで統一し、`.editorconfig` などで明示する

### デバッグ・品質

- テスト時は `-fsanitize=address,undefined` 付きでビルドしたものを一度は通す
- クラッシュはまず `bt`（バックトレース）。core ファイルを残すには `ulimit -c unlimited`
- 静的解析ツール（`cppcheck`、`clang-tidy`、gcc の `-fanalyzer`）を併用する
- 組込みや車載では、MISRA C などのコーディング規約が求められることが多い。早い段階で確認する

## 関連リンク

- [cppreference.com（C リファレンス）](https://en.cppreference.com/w/c)
- [GCC オンラインドキュメント](https://gcc.gnu.org/onlinedocs/)
- [GNU Make マニュアル](https://www.gnu.org/software/make/manual/)
- [GDB ドキュメント](https://sourceware.org/gdb/documentation/)
- [Microsoft C/C++ ドキュメント（MSVC）](https://learn.microsoft.com/ja-jp/cpp/)
- [MSYS2](https://www.msys2.org/)
