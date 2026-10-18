---
series: 現場の声
no: 0007
title: 【C言語】printfデバッグで3日溶かした話と、gdbで「どこで・なぜ落ちたか」を10分で突き止める手順
slug: c-gdb-debugging
category: C言語
tags: [C言語, gdb, デバッグ, Segmentation fault, コアダンプ, ブレークポイント, VS Code]
excerpt: Segmentation faultの原因をprintfで追いかけて3日。gdbを使えば「どこで・なぜ落ちたか」は10分で分かります。現場でgdbを使い始めるときにハマる7つのポイントと、実際のデバッグ手順をまとめました。
status: draft
created: 2026-10-12
---

# 【C言語】printfデバッグで3日溶かした話と、gdbで「どこで・なぜ落ちたか」を10分で突き止める手順

## 現場の声

> 「`Segmentation fault (core dumped)` で落ちます。原因を調べてください」
>
> 怪しそうな場所に `printf("ここまで来た\n");` を入れて、ビルドして、実行。表示されたら次の場所へ……。ところが、**確実に通っているはずの printf が表示されない**ので、どんどん前の方を疑うことになり、3日かけても原因が分かりませんでした。
>
> 先輩に相談すると、「gdb で `bt` 打った？」の一言。実行して `bt` と打つと、**落ちた行と、そこまでの関数の呼び出し順**が一瞬で表示されました。printf が表示されなかったのは、出力がバッファに溜まったまま、表示される前にプロセスが落ちていたからでした。

gdb はコマンドが多くて敷居が高く見えますが、現場で使うのは**10個程度**です。この記事では、gdb を使い始めるときにハマるポイントと、実際のバグを追いかける手順を、実際の出力と一緒に紹介します。

## 前提の構成

次のプログラムを例にします。バグが2つ入っています。

```c
/* avg.c */
#include <stdio.h>
#include <string.h>

typedef struct {
    int  id;
    char name[16];
    int  score;
} Record;

static int sum_scores(const Record *list, int count)
{
    int total = 0;
    for (int i = 0; i <= count; i++) {      /* バグ1：<= になっている */
        total += list[i].score;
    }
    return total;
}

static const Record *find_by_id(const Record *list, int count, int id)
{
    for (int i = 0; i < count; i++) {
        if (list[i].id == id) return &list[i];
    }
    return NULL;
}

int main(void)
{
    Record list[3] = {
        {1, "Sato",   70},
        {2, "Tanaka", 85},
        {3, "Suzuki", 90},
    };
    int count = 3;

    int total = sum_scores(list, count);
    printf("average = %d\n", total / count);

    const Record *r = find_by_id(list, count, 4);
    printf("name = %s\n", r->name);          /* バグ2：NULL チェックなし */
    return 0;
}
```

- 環境は Linux（gcc 13 / gdb 15）です。Windows の MSYS2 でも、コマンドは同じです（環境構築は「環境構築」の記事を参照）。
- 平均点は (70 + 85 + 90) / 3 = 81 になるはずです。

## ハマりどころ1：printf デバッグが「嘘をつく」

**症状**

落ちる直前の printf が表示されない。そのため、落ちた場所を実際より前だと勘違いする。

**原因**

標準出力（`stdout`）は**バッファリング**されます。端末に出すときは改行ごと、ファイルやパイプ（`./avg > log.txt`、`./avg | tee`）に出すときはバッファがいっぱいになるまで溜められます。表示される前にプロセスが落ちると、溜まっていた出力は**捨てられます**。

実際、上の `avg.c` をパイプ経由で実行すると、`average = ...` の行すら表示されずに終了します。

```text
$ ./avg | cat
Segmentation fault (core dumped)
```

**対処**

- デバッグ用の出力は、バッファリングされない**標準エラー出力**に出す：`fprintf(stderr, "...\n");`
- どうしても `stdout` を使うなら、直後に `fflush(stdout);`
- そもそも「どこで落ちたか」を調べるなら、printf ではなく gdb を使う

## ハマりどころ2：`-g` を付けずにビルドして、行番号が出ない

**症状**

```text
(gdb) bt
...
#4  0x0000555555555321 in main ()            ← ファイル名も行番号も出ない
(gdb) frame 4
(gdb) print r
No symbol "r" in current context.            ← 変数も見られない
```

**原因**

デバッグ情報（どの機械語がソースの何行目に当たるか、変数名は何か）が実行ファイルに入っていません。関数名だけは分かりますが、何行目で落ちたのか、変数に何が入っていたのかは調べられません。

**対処：`-g` を付けて、最適化を切ってビルドし直す。**

```text
$ gcc -std=c11 -Wall -Wextra -g -O0 -o avg avg.c
```

Makefile の `CFLAGS` に最初から `-g -O0` を入れておくと、毎回悩まずに済みます。

## ハマりどころ3：落ちた場所が「自分のコードではない」

**症状**

gdb で実行すると、見たことのない関数で止まる。

```text
$ gdb -q ./avg
Reading symbols from ./avg...
(gdb) run
Starting program: /home/user/work/avg
average = 11004

Program received signal SIGSEGV, Segmentation fault.
__strlen_evex () at ../sysdeps/x86_64/multiarch/strlen-evex-base.S:81
81	../sysdeps/x86_64/multiarch/strlen-evex-base.S: No such file or directory.
```

`strlen` のソースが見つからない、というメッセージに戸惑いますが、これは**標準ライブラリの中で落ちた**という意味です。標準ライブラリのバグではなく、たいていは**自分のコードが変な値を渡している**のが原因です。

**対処：`bt`（バックトレース）で呼び出し元をたどる。**

```text
(gdb) bt
#0  __strlen_evex () at ../sysdeps/x86_64/multiarch/strlen-evex-base.S:81
#1  0x00007ffff7c6ada8 in __printf_buffer (...) at ./stdio-common/vfprintf-process-arg.c:435
#2  0x00007ffff7c6b73b in __vfprintf_internal (...) at ./stdio-common/vfprintf-internal.c:1544
#3  0x00007ffff7c601b3 in __printf (format=<optimized out>) at ./stdio-common/printf.c:33
#4  0x0000555555555321 in main () at avg.c:40
```

下から読むと「`main` の 40 行目で `printf` を呼び、その中の `strlen` で落ちた」と分かります。**自分のソースファイル名が出てくる一番上のフレーム**（ここでは `#4`）に移動して、変数を確認します。

```text
(gdb) frame 4
#4  0x0000555555555321 in main () at avg.c:40
40	    printf("name = %s\n", r->name);          /* バグ2：NULL チェックなし */
(gdb) print r
$1 = (const Record *) 0x0
```

`r` が `0x0`（NULL）です。`find_by_id` が「見つからない」場合に `NULL` を返すのに、チェックせずに `r->name` を使っていたことが分かりました。ここまで、gdb を起動してから**コマンド4つ**です。

## ハマりどころ4：変数が `<optimized out>` で見えない

**症状**

```text
(gdb) print total
$1 = <optimized out>
```

ステップ実行すると、行が前後に飛ぶ。

**原因**

`-O2` などの最適化を付けてビルドすると、変数がレジスタだけに置かれたり、計算自体が消されたりします。

**対処**

- デバッグ用には `-O0`（または gcc 推奨の `-Og`）でビルドする
- 本番と同じ最適化でしか再現しないバグの場合は、`volatile` を一時的に付ける、`-O2 -g` のまま `disassemble` と `info registers` で追う、などの手段がありますが、まずは `-O0` で再現するかを確認します

## ハマりどころ5：値がおかしいとき、どこから見ればよいか分からない

**症状**

落ちはしないが、平均点が 81 ではなく `11004` のような値になる（実行のたびに変わることもある）。

**対処：ブレークポイントで止めて、ステップ実行しながら変数を見る。**

```text
(gdb) break sum_scores
Breakpoint 1 at 0x1178: file avg.c, line 12.
(gdb) run
Breakpoint 1, sum_scores (list=0x7fffffffbdf0, count=3) at avg.c:12
12	    int total = 0;
(gdb) info args
list = 0x7fffffffbdf0
count = 3
(gdb) print *list@count
$1 = {{id = 1, name = "Sato", '\000' <repeats 11 times>, score = 70}, {id = 2, name = "Tanaka\000...", score = 85}, {id = 3, name = "Suzuki\000...", score = 90}}
```

- `info args` で引数の一覧、`info locals` でローカル変数の一覧が見られます。
- `print *list@count` は「`list` の指す先から `count` 個分」を表示します。関数に渡されたポインタは配列の長さを持っていないので、`@` で個数を指定します（ポインタの記事の「配列とポインタ」を参照）。

引数は正しいので、ループの中を追います。`display` を使うと、1行進むたびに変数が自動で表示されます。

```text
(gdb) display i
(gdb) display total
(gdb) next
...
14	        total += list[i].score;
1: i = 3
2: total = 245
(gdb) next
13	    for (int i = 0; i <= count; i++) {
1: i = 3
2: total = 33012
(gdb) print list[i]
$2 = {id = -2091772160, name = "\357%{\002\340\276...", score = 32767}
```

`i = 3` のときに、存在しない4件目（`list[3]`）を読んで、でたらめな値を足していました。ループ条件 `i <= count` を `i < count` に直せば解決です。

ループが1000回回る場合に `next` を1000回打つのは現実的ではありません。そのときは**条件付きブレークポイント**を使います。

```text
(gdb) break avg.c:14 if i >= count
(gdb) run
```

## ハマりどころ6：「いつの間にか値が書き換わる」を追えない

**症状**

ある変数の値が、どこで書き換わったのか分からない。配列の範囲外書き込みで、隣の変数が壊されている疑いがある。

**対処：ウォッチポイント（`watch`）で、値が変わった瞬間に止める。**

```text
(gdb) break main
(gdb) run
(gdb) watch count
Hardware watchpoint 2: count
(gdb) continue

Hardware watchpoint 2: count

Old value = 3
New value = 0
some_function (...) at foo.c:57
57	        buf[i] = 0;
```

- 値が変わった行で止まり、変更前後の値が表示されます。
- 上の例のように、`count` とは関係ない `buf[i] = 0;` の行で止まった場合は、`buf` の範囲外書き込みで隣の `count` を壊している、と分かります。
- ウォッチポイントは、変数がスコープ内にある状態で設定します（ローカル変数ならその関数で止めてから）。

## ハマりどころ7：本番環境でしか落ちず、gdb で再現できない

**症状**

客先や長時間運転の環境でだけ落ちる。手元では再現しない。

**対処A：コアダンプを取得して、後から gdb で調べる。**

コアダンプは「落ちた瞬間のメモリの写し」です。これがあれば、手元で `bt` や `print` ができます。

```text
$ ulimit -c unlimited          # このシェルでコアダンプの出力を有効化
$ ./avg
Segmentation fault (core dumped)
$ gdb ./avg core               # 実行ファイルとコアファイルを指定
(gdb) bt
```

- Ubuntu や RHEL などでは、コアダンプが systemd-coredump に回収されていることがあります。その場合は `coredumpctl list` で確認し、`coredumpctl gdb <PID>` で開きます。
- コアダンプを調べるときは、**落ちたときと同じ実行ファイル**（同じソース・同じビルド）が必要です。リリース時に `-g` 付きの実行ファイルを保管しておく運用にすると、後から必ず調べられます。

**対処B：動いているプロセスにアタッチする。**

止まっている（固まっている）プロセスの状態を見たいときは、プロセス ID を指定してつなぎます。

```text
$ pidof avg
12345
$ gdb -p 12345
(gdb) bt                       # 今どこで止まっているか
(gdb) detach                   # プロセスを止めずに切り離す
```

権限エラー（`ptrace: Operation not permitted`）になる場合は、`sudo gdb -p 12345` で実行します。

## 現場で使う gdb コマンド早見表

| やりたいこと | コマンド | 短縮形 |
| --- | --- | --- |
| 実行開始（引数付き） | `run 引数...` | `r` |
| 落ちた場所の呼び出し履歴 | `backtrace` | `bt` |
| 呼び出し元の関数に移動 | `frame 番号` / `up` / `down` | `f` |
| 関数・行で止める | `break 関数名` / `break ファイル:行` | `b` |
| 条件付きで止める | `break ファイル:行 if 条件` | |
| ブレークポイント一覧・削除 | `info breakpoints` / `delete 番号` | `i b` / `d` |
| 1行進む（関数には入らない） | `next` | `n` |
| 1行進む（関数の中に入る） | `step` | `s` |
| 今の関数を抜けるまで進む | `finish` | `fin` |
| 次のブレークポイントまで進む | `continue` | `c` |
| 変数の値を表示 | `print 式` / `print/x 式`（16進） | `p` |
| 配列の先頭から N 個表示 | `print *ポインタ@N` | |
| 毎回自動で表示 | `display 式` | |
| 値が変わったら止める | `watch 変数` | |
| 引数・ローカル変数の一覧 | `info args` / `info locals` | |
| 前後のソースを表示 | `list` | `l` |
| 終了 | `quit` | `q` |

- 何も入力せずに Enter を押すと、直前のコマンドを繰り返します（`next` を連打するときに便利です）。
- `gdb -tui ./avg` で起動するか、起動後に `Ctrl+X` → `A` を押すと、ソースを表示しながらデバッグできます。

## 「どこで・なぜ落ちたか」を突き止める手順（まとめ）

### 1. デバッグできるビルドを作る

```text
$ gcc -std=c11 -Wall -Wextra -g -O0 -o avg avg.c
```

### 2. 落ちた場所を特定する

1. `gdb -q ./avg` → `run`
2. 落ちたら `bt`
3. 自分のソースファイル名が出ている一番上のフレームに `frame 番号` で移動
4. その行で使っている変数を `print` で確認（`NULL`、範囲外の添字、でたらめな値を探す）

### 3. 値がおかしくなった原因をさかのぼる

1. 怪しい関数に `break` を張って `run`
2. `info args` / `info locals` で入力値を確認
3. `display` で変数を表示させながら `next` / `step`
4. ループが長いときは条件付きブレークポイント、値が勝手に変わるときは `watch`

### 4. 再現しない場合

- 本番環境でコアダンプを有効にして、落ちたときのコアファイルを回収する
- 固まっている場合は `gdb -p` でアタッチして `bt`

### 5. 修正したら確認する

- 修正後、同じ手順で再実行して症状が消えたことを確認
- 範囲外アクセスやメモリ破壊が疑われる場合は、AddressSanitizer（`-fsanitize=address`）でも確認する（「メモリ管理」の記事を参照）

### 補足：VS Code から使う場合

「環境構築」の記事の `launch.json` を用意すると、VS Code の画面上でブレークポイント（行番号の左をクリック）・ステップ実行（F10 / F11）・変数の確認ができます。中で動いているのは同じ gdb なので、デバッグコンソールで `-exec bt` や `-exec print *list@3` のように、gdb のコマンドを直接打つこともできます。

## チェックリスト

- [ ] デバッグ用ビルドに `-g -O0` を付けている
- [ ] デバッグ出力は `stderr` に出している（または `fflush(stdout)` している）
- [ ] 落ちたら最初に `bt` を見ている
- [ ] 標準ライブラリの中で落ちたときは、`frame` で自分のコードまで戻っている
- [ ] ポインタは `print p` と `print *p` で、住所と中身の両方を確認している
- [ ] ループのバグは条件付きブレークポイントで追っている
- [ ] 値が勝手に変わる場合は `watch` を使っている
- [ ] 本番環境でコアダンプを取得できる設定になっている
- [ ] リリースした実行ファイルと同じビルドの、`-g` 付き実行ファイルを保管している

## まとめ

- printf デバッグは、出力のバッファリングのせいで「落ちた場所」を見誤ることがあります。
- 落ちたら `run` → `bt` → `frame` → `print`。この4つだけで、多くの `Segmentation fault` は10分以内に原因が分かります。
- 値がおかしいときは `break` / `display` / `next`、勝手に値が変わるときは `watch`、本番でしか落ちないときはコアダンプを使います。

次の記事では、gdb やシリアル接続の作業ログを確実に残すための「Tera Term でのログ取得」を扱います。
