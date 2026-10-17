---
series: 現場の声
no: 0016
title: 【C言語】gdbのブレークポイントで止まらない。原因はMakefileだった話と、確実に止めるための7つのチェック
slug: c-gdb-breakpoint-not-hit
category: C言語
tags: [C言語, gdb, Makefile, デバッグ, ブレークポイント, 最適化, gcc]
excerpt: gdbでブレークポイントを張ったのに、素通りしてプログラムが終わってしまう。原因はコードではなくMakefileのビルド設定でした。ブレークポイントで止まらないときに確認する7つのポイントと、デバッグビルドを確実に作るMakefileの書き方をまとめました。
status: draft
created: 2026-10-16
---

# 【C言語】gdbのブレークポイントで止まらない。原因はMakefileだった話と、確実に止めるための7つのチェック

## 現場の声

> gdb で `break calc.c:8` と打って `run`。ところが、**ブレークポイントで止まらずに、プログラムが最後まで実行されて終わって**しまいます。
>
> 行番号を変えても、関数名で張っても同じ。gdb の使い方が間違っているのかと思い、コマンドを何度も見直しました。
>
> 結局、原因はコードでも gdb の操作でもなく、**Makefile のビルド設定**でした。Makefile にデバッグ用の設定を追加してビルドし直したところ、あっさりブレークポイントで止まるようになりました。

**結論：ブレークポイントで止まらないときは、gdb の操作より先に「デバッグできる実行ファイルになっているか」を疑います。** 具体的には、`-g`（デバッグ情報）と `-O0`（最適化なし）が、**すべての .o ファイルとリンクに**効いているかです。

gdb の基本的な使い方は、前回の記事「[【C言語】printfデバッグで3日溶かした話と、gdbで「どこで・なぜ落ちたか」を10分で突き止める手順](https://itbibliotheque.wordpress.com/?name=c-gdb-debugging)」で紹介しました。この記事では、その手前でつまずく「止まらない」問題に絞って、原因の切り分け方と Makefile の直し方を紹介します。

## 前提の構成

次の2ファイルを、Makefile でビルドする例で説明します。

```c
/* main.c */
#include <stdio.h>
#include "calc.h"

int main(void)
{
    int scores[3] = {70, 85, 90};
    int total = sum_scores(scores, 3);
    printf("average = %d\n", total / 3);
    return 0;
}
```

```c
/* calc.c */
#include "calc.h"

int sum_scores(const int *scores, int count)
{
    int total = 0;
    for (int i = 0; i < count; i++) {
        total += scores[i];      /* ← 8行目。ここで止めたい */
    }
    return total;
}
```

```c
/* calc.h */
#ifndef CALC_H
#define CALC_H
int sum_scores(const int *scores, int count);
#endif
```

最初の Makefile は、リリース用の設定だけが書かれていました。

```make
CC     = gcc
CFLAGS = -std=c11 -Wall -O2
OBJS   = main.o calc.o

avg: $(OBJS)
	$(CC) -o $@ $(OBJS)

clean:
	rm -f avg $(OBJS)
```

- 環境は Linux（gcc 13 / gdb 15 / GNU Make）です。この記事のコマンドと出力は、すべてこの環境で実際に実行したものです。

## ハマりどころ1：`-g` が付いていない

**症状**

ファイル名と行番号でブレークポイントを張ると、次のメッセージが出ます。

```text
$ gdb -q ./avg
(gdb) break calc.c:8
No symbol table is loaded.  Use the "file" command.
Make breakpoint pending on future shared library load? (y or [n])
```

関数名で張ると設定はできますが、止まった場所が**アドレスだけ**で、ファイル名も行番号も出ません。

```text
(gdb) break sum_scores
Breakpoint 1 at 0x11f0
(gdb) run
Breakpoint 1, 0x00005555555551f0 in sum_scores ()
```

**原因**

Makefile の `CFLAGS` に `-g` がないため、実行ファイルに**デバッグ情報（どの機械語がソースの何行目か）が入っていません**。gdb は「calc.c の 8 行目」がどこなのか分かりません。

**確認方法**

gdb を `-q` なしで起動すると、最初に教えてくれます。

```text
$ gdb ./avg
Reading symbols from ./avg...
(No debugging symbols found in ./avg)
```

`file` コマンドでも確認できます。デバッグ情報があれば `with debug_info` と表示されます。

```text
$ file avg
avg: ELF 64-bit LSB pie executable, x86-64, ..., not stripped               ← デバッグ情報なし
avg: ELF 64-bit LSB pie executable, x86-64, ..., with debug_info, not stripped  ← あり
```

**対処**

`CFLAGS` に `-g` を追加します（最適化については「ハマりどころ4」）。

## ハマりどころ2：Makefile を直したのに「up to date」で作り直されない

**症状**

`CFLAGS` に `-g` を足して `make` したのに、何もビルドされない。当然、gdb の結果も変わらない。

```text
$ make
make: 'avg' is up to date.
```

**原因**

make は「**ソースファイルが .o より新しいか**」だけを見て、作り直すかどうかを決めます。Makefile の中身（`CFLAGS`）が変わったことは、標準では判定材料になりません。そのため、`-g` なしで作った古い .o と実行ファイルがそのまま使われます。

**対処**

フラグを変えたら、必ず一度クリーンビルドします。

```text
$ make clean
$ make
```

## ハマりどころ3：一部の .o だけが古い（いちばん気づきにくい）

**症状**

`main.c` のブレークポイントでは止まるのに、`calc.c` のブレークポイントだけ張れない。

```text
(gdb) break calc.c:8
No source file named calc.c.
Make breakpoint pending on future shared library load? (y or [n]) n
(gdb) break main.c:8
Breakpoint 1 at 0x1199: file main.c, line 8.
```

**原因**

`CFLAGS` に `-g` を足したあと、`make clean` をせずに `main.c` だけ修正して `make` すると、**作り直されるのは main.o だけ**です。

```text
$ make
gcc -std=c11 -Wall -g -O0   -c -o main.o main.c
gcc -o avg main.o calc.o          ← calc.o は -g なしの古いまま
```

実行ファイルの中で、デバッグ情報を持っているのは main.c の部分だけ、という状態になります。

**確認方法**

.o ごとに、どのオプションでコンパイルされたかを確認できます（`-g` 付きの .o には、コンパイル時のオプションが記録されています）。

```text
$ readelf --debug-dump=info main.o | grep -m1 -o 'GNU C.*-O[0-9s]'
GNU C11 13.3.0 -mtune=generic -march=x86-64 -g -O0
$ readelf --debug-dump=info calc.o | grep -m1 -o 'GNU C.*-O[0-9s]'
                                       ← 何も出ない＝デバッグ情報なし
```

**対処**

- `make clean` してからビルドする
- Makefile 自体を .o の依存関係に入れて、Makefile を変えたら全部作り直されるようにする（後述の Makefile 例）

## ハマりどころ4：`-O2` のまま `-g` を付けて、関数や行が消えている

**症状**

`-g` は付いているのに、関数にブレークポイントを張れない。または、指定した行とは違う行に張られる、何回か通るはずなのに1回しか止まらない。

```text
(gdb) break is_valid
Function "is_valid" not defined.
Make breakpoint pending on future shared library load? (y or [n])
```

**原因**

`-O2` で最適化すると、コンパイラは次のようなことをします。

- 小さな関数を呼び出し元に埋め込む（インライン展開）
- 結果が分かりきっている計算や、使われない処理を消す
- 処理の順番を入れ替える、ループをまとめる

たとえば、次の `is_valid` は、引数が定数（70, 85, 90）なので、`-O2` ではコンパイル時に結果が決まり、**関数そのものが実行ファイルから消えます**。消えた関数では止まりようがありません。

```c
static int is_valid(int score)
{
    int ok = (score >= 0 && score <= 100);
    return ok;
}
```

同じソースを `-g -O0` でビルドすると、普通に止まります。

```text
(gdb) break is_valid
Breakpoint 1 at 0x1194: file t.c, line 5.
(gdb) run
Breakpoint 1, is_valid (score=70) at t.c:5
5	    int ok = (score >= 0 && score <= 100);
```

**対処**

- デバッグ用のビルドは `-g -O0` にする（gcc 推奨の `-Og` でも可）
- `-O2` は付けたまま `-g` だけ足す、という直し方では不十分なことがある

## ハマりどころ5：自前のルールやリンク行で、`CFLAGS` が使われていない

**症状**

`CFLAGS` に `-g -O0` を入れて `make clean` もしたのに、まだデバッグ情報が入らない。

**原因**

Makefile のルールを自分で書いている場合、そのルールで `$(CFLAGS)` を使っていないと、いくら `CFLAGS` を直しても効きません。

```make
# ✕ CFLAGS を使っていない
%.o: %.c
	$(CC) -c -o $@ $<

# ✕ リンク時に -s（シンボル削除）が入っている
avg: $(OBJS)
	$(CC) -s -o $@ $(OBJS)
```

`-s` を付けてリンクすると、.o に入っていたデバッグ情報が**リンクの時点で削除**されます。`file` の結果が `stripped` になっていたら、これが原因です。

```text
$ file avg
avg: ELF 64-bit LSB pie executable, x86-64, ..., stripped
```

**対処**

- `make` を実行したときに表示されるコンパイルコマンドに、`-g -O0` が**実際に入っているか**を目で確認する
- コンパイル行・リンク行の両方で `$(CFLAGS)` を使う
- デバッグビルドでは `-s` や `strip` を外す（リリース時だけ strip する）

## ハマりどころ6：pending に `y` と答えて、永遠に止まらない

**症状**

ブレークポイントを張ったときの質問に `y` と答えると、エラーにならずに受け付けられたように見える。しかし `run` しても止まらない。

```text
(gdb) break calc.c:8
No symbol table is loaded.  Use the "file" command.
Make breakpoint pending on future shared library load? (y or [n]) y
Breakpoint 1 (calc.c:8) pending.
(gdb) run
average = 81
[Inferior 1 (process 356) exited normally]
```

**原因**

`pending`（保留）は、「後から読み込まれる共有ライブラリ（.so）の中にあるはずなので、読み込まれたら張る」という意味です。デバッグ情報がないだけの場合、待っていても永遠に張られません。

**対処**

- この質問が出たら、**`y` と答える前に「デバッグ情報が入っているか」を疑う**（ハマりどころ1〜5）
- `info breakpoints` で、`<PENDING>` になっていないか確認する
- 本当に共有ライブラリの中に張りたい場合だけ `y` を選ぶ

## ハマりどころ7：gdb で開いている実行ファイルが、ビルドしたものと違う

**症状**

ビルドし直したのに、gdb の挙動がまったく変わらない。

**原因**

`make` で作られるのはカレントディレクトリの `./avg` なのに、gdb では `bin/avg` やインストール先（`/usr/local/bin/avg`）など、**別の場所の古い実行ファイル**を開いていることがあります。起動スクリプト経由で実行していると、特に気づきにくいです。

**対処**

- gdb にはパスを明示して渡す：`gdb ./avg`
- `ls -l` で、開いている実行ファイルの更新時刻がビルドした時刻と一致するか確認する
- gdb の中で `info files` を実行すると、今開いているファイルのパスが分かります

## 確実に止めるための Makefile

上のハマりどころをまとめて防ぐ Makefile の例です。`make DEBUG=1` でデバッグビルド、`make` でリリースビルドになり、**フラグを切り替えたら自動で全部作り直されます**。

```make
CC      = gcc
CFLAGS  = -std=c11 -Wall -Wextra
LDFLAGS =
TARGET  = avg
OBJS    = main.o calc.o

# make DEBUG=1 でデバッグビルド（-g でデバッグ情報、-O0 で最適化なし）
ifeq ($(DEBUG),1)
  CFLAGS += -g -O0
else
  CFLAGS += -O2
endif

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $(OBJS)

# Makefile やビルドフラグが変わったら .o を作り直す
%.o: %.c calc.h Makefile .build-flags
	$(CC) $(CFLAGS) -c -o $@ $<

.build-flags: FORCE
	@echo '$(CFLAGS)' | cmp -s - $@ || echo '$(CFLAGS)' > $@

clean:
	rm -f $(TARGET) $(OBJS) .build-flags

.PHONY: clean FORCE
```

ポイントは3つです。

- **`DEBUG=1` で `-g -O0`**：デバッグ用とリリース用の設定を、Makefile を書き換えずに切り替えられます。
- **`.build-flags`**：今の `CFLAGS` をファイルに書いておき、前回と違うときだけ更新します。.o がこのファイルに依存しているので、フラグが変われば全部作り直されます（ハマりどころ2・3の対策）。
- **`Makefile` を依存関係に入れる**：Makefile を編集したときも全部作り直されます。

実行するとこうなります。リリースビルドのあとに `make DEBUG=1` とするだけで、すべての .o が `-g -O0` で作り直されています。

```text
$ make
gcc -std=c11 -Wall -Wextra -O2 -c -o main.o main.c
gcc -std=c11 -Wall -Wextra -O2 -c -o calc.o calc.c
gcc -std=c11 -Wall -Wextra -O2  -o avg main.o calc.o
$ make DEBUG=1
gcc -std=c11 -Wall -Wextra -g -O0 -c -o main.o main.c
gcc -std=c11 -Wall -Wextra -g -O0 -c -o calc.o calc.c
gcc -std=c11 -Wall -Wextra -g -O0  -o avg main.o calc.o
$ gdb -q ./avg
(gdb) break calc.c:8
Breakpoint 1 at 0x1216: file calc.c, line 8.
(gdb) run
Breakpoint 1, sum_scores (scores=0x7fffffffbd8c, count=3) at calc.c:8
8	        total += scores[i];
(gdb) info locals
i = 0
total = 0
```

既存の Makefile を大きく変えられない場合は、最低限、次の2点だけでも効果があります。

1. `CFLAGS` に `-g -O0` を入れる（またはデバッグ用の設定を追加する）
2. フラグを変えたら `make clean` してからビルドする

## ブレークポイントで止まらないときの切り分け手順（まとめ）

### 1. 実行ファイルにデバッグ情報があるか

```text
$ file ./avg                     # with debug_info / stripped を確認
$ gdb ./avg                      # (No debugging symbols found) が出ないか
```

- `No debugging symbols` / `stripped` → `-g` が付いていない、または `-s` で消えている（ハマりどころ1・5）

### 2. すべての .o にデバッグ情報があるか

```text
$ readelf --debug-dump=info calc.o | grep -m1 -o 'GNU C.*-O[0-9s]'
```

- 特定のファイルだけ `No source file named xxx.c` → その .o が古い（ハマりどころ3）
- `make clean` → `make` で作り直す

### 3. 最適化が効いていないか

- `Function "xxx" not defined`、指定と違う行に張られる、変数が `<optimized out>` → `-O0` にする（ハマりどころ4）

### 4. ビルドコマンドに本当にフラグが入っているか

- `make` の出力に表示される gcc のコマンドを見て、コンパイル行とリンク行の両方を確認する（ハマりどころ5）

### 5. gdb で開いているのは、今ビルドしたファイルか

- `gdb ./avg` のようにパスを明示する、`info files` で確認する（ハマりどころ7）

## チェックリスト

- [ ] デバッグ用ビルドで `-g -O0`（または `-Og`）を付けている
- [ ] `make` の出力で、すべてのコンパイル行に `-g -O0` が入っているのを確認した
- [ ] リンク行に `-s` が入っていない（`file` の結果が `with debug_info, not stripped`）
- [ ] Makefile のフラグを変えたら `make clean` している（または自動で作り直される Makefile にしている）
- [ ] 一部のファイルだけ止まらない場合は、その .o が古くないか確認した
- [ ] pending の質問に、理由なく `y` と答えていない
- [ ] gdb にはビルドした実行ファイルのパスを明示して渡している

## まとめ

- gdb のブレークポイントで止まらない原因の多くは、gdb の操作ではなく**ビルド設定**です。
- `-g` で**デバッグ情報を入れる**、`-O0` で**最適化を切る**。この2つが、すべての .o とリンクに効いている必要があります。
- make はフラグの変更を検知しないので、フラグを変えたら `make clean`。Makefile 側で自動的に作り直されるようにしておくと、同じ事故を防げます。

止まるようになったら、あとは前回の記事「[gdbで「どこで・なぜ落ちたか」を10分で突き止める手順](https://itbibliotheque.wordpress.com/?name=c-gdb-debugging)」の `bt` / `print` / `display` / `watch` で原因を追いかけましょう。
