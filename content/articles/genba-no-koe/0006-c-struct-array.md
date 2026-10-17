---
series: 現場の声
no: 0006
title: 【C言語】構造体配列をソート・検索・ファイル保存したら値が壊れた。現場でハマる8つのポイントと安全な書き方
slug: c-struct-array
category: C言語
tags: [C言語, 構造体, 構造体配列, qsort, bsearch, パディング, fwrite]
excerpt: 構造体配列のコピーで値が共有される、qsortの比較関数でオーバーフロー、fwriteで保存したファイルが別環境で読めない。C言語の構造体配列で現場がハマる8つのポイントと、安全な書き方をまとめました。
status: draft
created: 2026-10-12
---

# 【C言語】構造体配列をソート・検索・ファイル保存したら値が壊れた。現場でハマる8つのポイントと安全な書き方

## 現場の声

> 「社員マスタを構造体配列で持って、社員番号順に並べ替えて、ファイルに保存しておいてください」
>
> 構造体を定義して、配列にデータを詰めて、`qsort` で並べ替え。テストでは問題なかったのに、本番データでは**並び順がところどころおかしい**。さらに `fwrite` で丸ごと保存したファイルを、別チームの機器で読み込むと**値が全部ずれている**。
>
> 調べると、比較関数で引き算をしていたせいでオーバーフローしていたこと、そして構造体の中に**見えない隙間（パディング）**があり、機器によってその大きさが違っていたことが原因でした。

構造体配列は「表のデータ」を扱う基本形ですが、コピー・ソート・保存のそれぞれに落とし穴があります。この記事では、現場で実際に多いものを順番に整理します。

## 前提の構成

この記事では次の社員データを例にします。

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define NAME_LEN 32

typedef struct {
    int    id;                 /* 社員番号 */
    char   name[NAME_LEN];     /* 氏名（'\0' を含めて 32 バイト） */
    int    dept;               /* 部署コード */
    double salary;             /* 月給 */
} Employee;

Employee staff[] = {
    {1003, "Sato",   10, 280000.0},
    {1001, "Tanaka", 20, 320000.0},
    {1002, "Suzuki", 10, 300000.0},
};
size_t staff_count = sizeof staff / sizeof staff[0];
```

- `typedef` で `Employee` という型名を付けておくと、毎回 `struct` を書かずに済みます。
- 件数は `sizeof 配列 / sizeof 配列[0]` で求めます（配列を宣言したスコープの中でだけ有効）。

## ハマりどころ1：`.` と `->` の使い分けで迷う

**症状**

`error: 'e' is a pointer; did you mean to use '->'?` や `request for member 'id' in something not a structure or union`。

**原因**

- 構造体**そのもの**のメンバには `.`
- 構造体への**ポインタ**からメンバをたどるときは `->`（`(*p).id` の省略形）

```c
Employee  e = staff[0];
Employee *p = &staff[0];

printf("%d\n", e.id);        /* 構造体そのもの */
printf("%d\n", p->id);       /* ポインタ経由 */
printf("%d\n", staff[1].id); /* 配列の要素は構造体そのもの */
printf("%d\n", (p + 1)->id); /* ポインタを進めて -> */
```

**対処：変数の型を見て決める。** `staff[i]` は構造体なので `.`、関数の引数で `Employee *` を受け取ったら `->` です。

## ハマりどころ2：構造体を値渡しして、関数内の変更が反映されない

**症状**

関数で昇給処理をしたのに、呼び出し元の配列は変わっていない。

**原因**

構造体を引数に渡すと**丸ごとコピー**されます（ポインタの記事で扱った「すべて値渡し」と同じです）。

```c
/* NG：e はコピー */
void raise_salary(Employee e, double rate)
{
    e.salary *= rate;
}

raise_salary(staff[0], 1.05);   /* staff[0] は変わらない */
```

**対処：書き換える関数はポインタで受け取り、読むだけの関数は `const` ポインタで受け取る。**

```c
void raise_salary(Employee *e, double rate)
{
    e->salary *= rate;
}

void print_employee(const Employee *e)
{
    printf("%5d %-10s %3d %10.0f\n", e->id, e->name, e->dept, e->salary);
}

raise_salary(&staff[0], 1.05);
print_employee(&staff[0]);
```

構造体が大きい場合、値渡しはコピーのコストもかかります。**構造体は基本的にポインタで渡す**と覚えておくと迷いません。

## ハマりどころ3：文字列メンバに `=` で代入してしまう

**症状**

`error: assignment to expression with array type`。

**原因**

配列は `=` で代入できません。構造体の中の `char name[32]` も同じです。

```c
Employee e;
e.name = "Yamada";          /* NG：コンパイルエラー */
strcpy(e.name, longname);   /* 危険：32文字以上だとあふれて隣のメンバを壊す */
```

**対処：サイズを指定してコピーする。**

```c
snprintf(e.name, sizeof e.name, "%s", src);    /* 長すぎる場合は切り詰めて必ず '\0' で終わる */
```

`strncpy` は、コピー元が長いと終端の `'\0'` を付けないため、単独で使うと文字列が終わらなくなります。`snprintf` を使うのが安全です。

## ハマりどころ4：ポインタメンバを持つ構造体をコピーして、データが共有される

**症状**

配列をコピーしてから片方を書き換えたら、もう片方も変わった。片方を解放したら、もう片方で落ちた。

**原因**

構造体の `=` によるコピーは**メンバをそのままコピー（浅いコピー）**します。メンバがポインタだと、住所だけがコピーされ、指す先は共有されます。

```c
typedef struct {
    int   id;
    char *memo;     /* malloc した文字列を指す */
} Note;

Note a = { 1, NULL };
a.memo = malloc(16);
strcpy(a.memo, "hello");

Note b = a;          /* b.memo は a.memo と同じ住所 */
b.memo[0] = 'H';     /* a.memo も "Hello" になる */
free(a.memo);
printf("%s\n", b.memo);   /* 解放後使用 */
```

**対処**

- できるだけ**固定長の配列メンバ**（`char memo[64]`）にして、ポインタメンバを避ける
- ポインタメンバが必要なら、中身までコピーする関数（深いコピー）を用意する

```c
int note_copy(Note *dst, const Note *src)
{
    dst->id = src->id;
    dst->memo = NULL;
    if (src->memo != NULL) {
        dst->memo = malloc(strlen(src->memo) + 1);
        if (dst->memo == NULL) return -1;
        strcpy(dst->memo, src->memo);
    }
    return 0;
}
```

## ハマりどころ5：qsort の比較関数で引き算をしてオーバーフロー

**症状**

ほとんど正しく並ぶのに、一部の値（大きな正の数と負の数の組み合わせなど）だけ順番がおかしい。

**原因**

比較関数を `return a->id - b->id;` と書くと、差が `int` の範囲を超えたときにオーバーフローして符号が反転します。`double` のメンバを比較するときは、差を `int` に変換した時点で `0.5` が `0` に切り捨てられます。

**対処：大小比較で -1 / 0 / 1 を返す。**

```c
/* 社員番号の昇順 */
int cmp_by_id(const void *a, const void *b)
{
    const Employee *ea = a;
    const Employee *eb = b;
    return (ea->id > eb->id) - (ea->id < eb->id);
}

/* 部署の昇順、同じ部署なら月給の降順 */
int cmp_by_dept_salary(const void *a, const void *b)
{
    const Employee *ea = a;
    const Employee *eb = b;
    if (ea->dept != eb->dept) {
        return (ea->dept > eb->dept) - (ea->dept < eb->dept);
    }
    return (ea->salary < eb->salary) - (ea->salary > eb->salary);   /* 降順は左右を逆にする */
}

qsort(staff, staff_count, sizeof staff[0], cmp_by_id);
```

- `qsort` の第3引数は**要素1つのサイズ**です。`sizeof staff`（配列全体）や `sizeof(Employee *)` を渡すと壊れます。`sizeof 配列[0]` と書くのが安全です。
- 文字列メンバの比較は `strcmp(ea->name, eb->name)` をそのまま返します。
- `qsort` は**安定ソートではありません**。同じキーの要素の順番が入れ替わることがあるので、順番を保ちたい場合は第2キーを比較関数に入れます。

## ハマりどころ6：bsearch をソートしていない配列や別のキーで使う

**症状**

存在するはずの社員番号で検索しても `NULL` が返る。

**原因**

`bsearch`（二分探索）は、**同じ比較関数でソート済み**の配列でしか正しく動きません。部署順にソートした配列を社員番号で検索しても見つかりません。

**対処：検索キーで同じ比較関数を使い、ソートと検索をセットにする。**

```c
qsort(staff, staff_count, sizeof staff[0], cmp_by_id);

Employee key = { .id = 1002 };     /* 比較に使うメンバだけ入れる */
Employee *found = bsearch(&key, staff, staff_count, sizeof staff[0], cmp_by_id);

if (found != NULL) {
    print_employee(found);
} else {
    printf("not found\n");
}
```

件数が少ない（数百件程度）なら、ソートせずに `for` ループで順番に探すほうが単純で、バグも入りにくいです。

## ハマりどころ7：構造体のサイズが「メンバの合計」と一致しない（パディング）

**症状**

`sizeof(Employee)` がメンバのサイズの合計より大きい。通信や外部ファイルのフォーマットと合わない。

**原因**

CPU が効率よく読めるように、コンパイラはメンバの間や末尾に**隙間（パディング）**を入れます。

```c
typedef struct {
    char  flag;     /* 1バイト */
    int   count;    /* 4バイト */
    char  code;     /* 1バイト */
} Sample;           /* 合計 6 バイトのはずが、sizeof は 12 になることが多い */
```

```text
 offset 0    1    2    3    4    5    6    7    8    9    10   11
       ┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
       │flag│ 隙間（3バイト）│     count（4バイト） │code│ 隙間（3バイト）│
       └────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘
```

**対処**

- メンバは**サイズの大きい順**に並べると隙間が減る（`int count; char flag; char code;` なら 8 バイト）
- 外部フォーマットと合わせる必要がある構造体には、サイズの確認を入れておく

```c
_Static_assert(sizeof(Sample) == 8, "Sample のサイズが想定と違います");   /* C11 */
```

- `#pragma pack(1)` で隙間をなくす方法もありますが、CPU によってはアクセスが遅くなったり落ちたりします。通信やファイルとのやりとりは、次のハマりどころの方法で行うのが安全です。

## ハマりどころ8：構造体配列を fwrite で丸ごと保存して、別環境で読めない

**症状**

保存したファイルを、別の OS・別の CPU・別のコンパイラでビルドしたプログラムで読むと値がずれる。古いバージョンのファイルが読めなくなる。

**原因**

`fwrite(staff, sizeof staff[0], count, fp)` は、メモリの中身をそのまま書き出します。次の要素が環境によって変わるため、**同じプログラムでしか読めないファイル**になります。

- パディングの大きさ（ハマりどころ7）
- `int` / `long` のサイズ（`long` は Windows 64bit で4バイト、Linux 64bit で8バイト）
- バイトオーダー（エンディアン）
- 構造体にメンバを追加したときのレイアウト

**対処：テキスト（CSV）で保存するか、メンバを1つずつ決まった形式で書き出す。**

```c
/* CSV で保存：人が読めて、環境に依存しない */
int save_csv(const char *path, const Employee *list, size_t count)
{
    FILE *fp = fopen(path, "w");
    if (fp == NULL) return -1;

    fprintf(fp, "id,name,dept,salary\n");
    for (size_t i = 0; i < count; i++) {
        fprintf(fp, "%d,%s,%d,%.0f\n",
                list[i].id, list[i].name, list[i].dept, list[i].salary);
    }
    return fclose(fp) == 0 ? 0 : -1;    /* fclose の失敗（ディスクフルなど）も確認する */
}
```

```c
/* CSV から読み込み */
size_t load_csv(const char *path, Employee *list, size_t max)
{
    FILE *fp = fopen(path, "r");
    if (fp == NULL) return 0;

    char line[256];
    size_t n = 0;
    fgets(line, sizeof line, fp);                 /* ヘッダ行を読み飛ばす */
    while (n < max && fgets(line, sizeof line, fp) != NULL) {
        Employee e = {0};
        if (sscanf(line, "%d,%31[^,],%d,%lf", &e.id, e.name, &e.dept, &e.salary) == 4) {
            list[n++] = e;
        }
    }
    fclose(fp);
    return n;
}
```

- `%31[^,]` は「カンマ以外を最大31文字」読む指定です。`name` のサイズ（32）から `'\0'` の1を引いた数を書きます。
- バイナリで保存する必要がある場合は、`int32_t` など**サイズが決まった型**を使い、メンバを1つずつ、エンディアンを決めて書き出します。

## 安全な書き方（まとめ）

### 1. 定義する

- `typedef struct { ... } 型名;` で型名を付ける
- 文字列メンバは固定長配列にし、長さを `#define` で定義する
- メンバはサイズの大きい順に並べる

### 2. 渡す

- 書き換える関数は `型名 *`、読むだけの関数は `const 型名 *` で受け取る
- 配列を渡すときは件数も一緒に渡す

### 3. 並べ替える・探す

- 比較関数は引き算ではなく大小比較で書く
- `qsort` / `bsearch` の要素サイズは `sizeof 配列[0]`
- `bsearch` はソートと同じ比較関数で使う

### 4. 保存する

- 基本は CSV などのテキスト形式
- バイナリにするなら固定サイズの型で1メンバずつ書く
- `fclose` の戻り値も確認する

## チェックリスト

- [ ] 構造体そのものは `.`、ポインタは `->` で使い分けている
- [ ] 構造体はポインタで関数に渡し、読むだけなら `const` を付けている
- [ ] 文字列メンバへのコピーは `snprintf` でサイズを指定している
- [ ] ポインタメンバを持つ構造体を `=` でコピーしていない（または深いコピー関数がある）
- [ ] 比較関数で引き算をしていない
- [ ] `qsort` / `bsearch` に要素1つのサイズを渡している
- [ ] `bsearch` の前に同じ比較関数でソートしている
- [ ] 外部フォーマットと合わせる構造体に `_Static_assert` でサイズ確認を入れている
- [ ] 構造体を `fwrite` で丸ごと保存していない

## まとめ

- 構造体配列は「表のデータ」を扱う基本形です。**構造体はポインタで渡す**を基本にすると、値渡しの勘違いを防げます。
- `qsort` の比較関数は引き算ではなく大小比較で書き、`bsearch` は同じ比較関数でソートしてから使います。
- 構造体には見えない隙間（パディング）があります。ファイルや通信には、構造体をそのまま書き出さず、決まった形式に変換して保存します。

次の記事では、ここまでの記事で出てきたバグを実際に追いかける「gdb でのデバッグ」を扱います。
