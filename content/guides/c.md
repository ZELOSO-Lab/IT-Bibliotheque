---
title: C 技術まとめ
slug: c
excerpt: C言語の基本文法、コンパイル、ポインタ、メモリ管理などの技術情報をまとめています。
updated: 2026-10-19
---

# C 技術まとめ

## 基礎

組込み・OS・ミドルウェアで使われる手続き型言語。

### 主な用途

- 組込み開発
- OS・ドライバ
- ミドルウェア
- 性能重視の処理

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[C 公式ドキュメント](https://en.cppreference.com/w/c)を参照してください。

## コマンド

### コンパイルと実行

```
gcc -Wall -O2 -o app main.c
./app
```

### Hello, World

```
#include <stdio.h>

int main(void) {
    printf("Hello, World\n");
    return 0;
}
```

### メモリ確保と解放

```
int *p = malloc(sizeof(int) * n);
if (p == NULL) { /* エラー処理 */ }
free(p);
```

### 早見表：基本

| 操作 | コマンド・構文 |
| --- | --- |
| コンパイル | `gcc -Wall -O2 -o app main.c` |
| デバッグ情報付き | `gcc -g -O0 -o app main.c` |
| 複数ファイル | `gcc -o app main.c util.c` |
| Hello, World | `printf("Hello\n");` |

### 早見表：型と変数

| 操作 | コマンド・構文 |
| --- | --- |
| 整数・小数 | `int n = 10; double d = 3.14;` |
| 配列 | `int a[5] = {1, 2, 3, 4, 5};` |
| 文字列 | `char s[] = "abc";` |
| 構造体 | `struct Point { int x; int y; };` |

### 早見表：制御構文

| 操作 | コマンド・構文 |
| --- | --- |
| if | `if (x > 0) { ... } else { ... }` |
| for | `for (int i = 0; i < n; i++) { ... }` |
| while | `while (cond) { ... }` |
| switch | `switch (c) { case 1: ...; break; default: ...; }` |

### 早見表：ポインタ・メモリ

| 操作 | コマンド・構文 |
| --- | --- |
| アドレスと参照 | `int *p = &n; *p = 20;` |
| 動的確保 | `int *p = malloc(sizeof(int) * n);` |
| 解放 | `free(p); p = NULL;` |
| 文字列コピー | `strncpy(dst, src, sizeof(dst) - 1);` |

### 早見表：入出力

| 操作 | コマンド・構文 |
| --- | --- |
| 書式付き出力 | `printf("%d %s %.2f\n", n, s, d);` |
| ファイルを開く | `FILE *fp = fopen("a.txt", "r");` |
| 1行読む | `fgets(buf, sizeof(buf), fp);` |
| 閉じる | `fclose(fp);` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[C 公式ドキュメント](https://en.cppreference.com/w/c)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[C 公式ドキュメント](https://en.cppreference.com/w/c)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[C 公式ドキュメント](https://en.cppreference.com/w/c)を参照してください。

## 関連リンク

- [C 公式ドキュメント](https://en.cppreference.com/w/c)
