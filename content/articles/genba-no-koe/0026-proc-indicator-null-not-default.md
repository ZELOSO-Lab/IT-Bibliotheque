---
series: 現場の声
no: 0026
title: 【C言語】Pro*Cで「初期値が入るはず」がNULLでORA-01400。インジケーター（標識変数）5つの勘違いと切り分け手順
slug: proc-indicator-null-not-default
category: C言語
tags: [C言語, Pro*C, Oracle, 標識変数, インジケーター, NULL, DEFAULT, ORA-01400, ORA-01407]
technologies: [c, oracle-database]
excerpt: Pro*Cでインジケーター（標識変数）を -1 にすると「何も指定しない」ではなく「NULLを指定した」ことになります。ホスト変数の初期値も、列のDEFAULT値も使われず、NOT NULL列ではORA-01400になります。UPDATEで現状維持のつもりがNULLで上書きされる、2件目からだけエラーになる、配列INSERTで前回の値が残るなど、現場で多い5つの勘違いと、原因を5分で特定する切り分け手順、対策パターンの選び方をまとめました。
status: draft
created: 2026-10-28
---

# 【C言語】Pro*Cで「初期値が入るはず」がNULLでORA-01400。インジケーター（標識変数）5つの勘違いと切り分け手順

## 現場の声

> Pro*Cで受注の登録処理を作りました。区分（STATUS）は画面で未入力なら、テーブルに `DEFAULT '0'` が付いているので **'0' が入るはず**だと思っていました。
>
> ところが実行すると、**ORA-01400: NULLは挿入できません** で落ちました。SQL*Plusで同じINSERTを試すと成功するのに、Pro*Cからだと失敗します。
>
> さらに、別のバッチでは1件目は成功して、**2件目からだけ**同じエラーになりました。

原因はどちらも、**インジケーター（標識変数）の -1 を「値を指定しない」という意味だと勘違いしていた**ことです。

インジケーターの基本（メリット、NOT NULL列・NULL許容列への影響）は「[Pro*Cの登録処理でインジケーター（標識変数）を使う理由](/articles/proc-indicator-variable-insert)」で解説しています。この記事では、その中でも事故が多い「**初期値が入るつもりが、NULLが入る**」パターンに絞って、勘違いの種類・切り分け手順・対策の選び方をまとめます。

## 前提の構成

| 項目 | 内容 |
| --- | --- |
| 言語 | C言語（Oracle Pro*C/C++ の埋め込み SQL） |
| DB | Oracle Database |
| 処理 | 受注データの登録（INSERT）と、備考の更新（UPDATE） |

例として、「[詳細設計書の書き方](/articles/detailed-design-doc-howto)」と同じ受注テーブル `T_ORDER` を少し簡略化して使います。

| 物理名 | 論理名 | 型 | NULL | 既定値 |
| --- | --- | --- | --- | --- |
| ORDER_NO | 受注番号 | NUMBER(10) | NOT NULL | （主キー） |
| CUST_CD | 顧客コード | VARCHAR2(8) | NOT NULL | |
| QTY | 数量 | NUMBER(3) | NOT NULL | |
| STATUS | 区分 | CHAR(1) | NOT NULL | DEFAULT '0' |
| ORDER_DATE | 受注日 | DATE | NOT NULL | DEFAULT SYSDATE |
| NOTE | 備考 | VARCHAR2(100) | 許容 | |

```c
typedef struct {
    long  order_no;
    char  cust_cd[8 + 1];
    int   qty;
    char  status[1 + 1];
    char  order_date[8 + 1];     /* YYYYMMDD */
    char  note[100 + 1];
} ORDER_REC;

typedef struct {                 /* ORDER_REC と同じ順番・同じ個数 */
    short order_no;
    short cust_cd;
    short qty;
    short status;
    short order_date;
    short note;
} ORDER_REC_IND;
```

## まず結論：インジケーター -1 は「NULLを指定した」という意味

勘違いの根っこは1つです。

| 思っていたこと | 実際の動き |
| --- | --- |
| -1 にすると、その列は「指定なし」になる | -1 にすると、その列に **NULLを明示的に指定した**ことになる |

「指定なし」なら、Oracleは何かの初期値で補ってくれます。しかし「NULLを指定した」場合は、Oracleは**そのままNULLを使います**。そのため、次の3種類の「初期値」は、どれも使われません。

| 期待した初期値 | -1 のとき使われるか | 理由 |
| --- | --- | --- |
| ホスト変数に入れておいた値 | **使われない** | -1 のとき、ホスト変数の中身は無視される |
| 列の `DEFAULT` 値 | **使われない** | DEFAULT が使われるのは、列を**省略**したときだけ |
| 前回（UPDATE前）の値 | **使われない** | UPDATE の SET に書いた列は、NULLで**上書き**される |

その結果、NOT NULL列なら INSERT は **ORA-01400**、UPDATE は **ORA-01407** になります。NULL許容列なら、エラーにならず**黙ってNULLが入ります**。こちらのほうが、見つかるのが遅れるぶん厄介です。

以下、現場で多い5つの勘違いを順番に見ていきます。

## 勘違い1：ホスト変数に初期値を入れておけば、その値が入る

**症状**

構造体の初期化で `status` に `"0"` を入れているのに、区分が未入力のときだけ ORA-01400 になる。

```c
memset(&ord, 0, sizeof(ord));
strcpy(ord.status, "0");                 /* 初期値のつもり */

/* 画面の値を詰める共通処理 */
copy_field(ord.status, scr.status, &ord_ind.status);   /* 空なら -1 にする */

EXEC SQL INSERT INTO t_order (order_no, cust_cd, qty, status, order_date, note)
         VALUES (:ord.order_no, :ord.cust_cd, :ord.qty,
                 :ord.status:ord_ind.status,
                 TO_DATE(:ord.order_date, 'YYYYMMDD'),
                 :ord.note:ord_ind.note);
```

**原因**

`copy_field()` が「画面が空ならインジケーターを -1」にしています。インジケーターが -1 のとき、Oracleは**ホスト変数を読みません**。`ord.status` に `"0"` が入っていても関係なく、NULLが渡ります。

**対処**

既定値を使う列は、**インジケーターを 0 にしたうえで**、ホスト変数に既定値を入れます。「空なら -1」の共通処理は、NULL許容列だけに使います。

```c
if (scr.status[0] == '\0') {
    strcpy(ord.status, "0");             /* 既定値 */
} else {
    strcpy(ord.status, scr.status);
}
ord_ind.status = 0;                      /* NOT NULL列は常に 0 */
```

## 勘違い2：列に DEFAULT があるから、NULLなら既定値になる

**症状**

SQL*Plusで動作確認したときは成功したのに、Pro*Cからだと ORA-01400 になる。

**原因**

SQL*Plusで確認したSQLと、Pro*Cで実行しているSQLが**別物**です。

| 確認した場所 | 実行したSQL | 結果 |
| --- | --- | --- |
| SQL*Plus | `INSERT INTO t_order (order_no, cust_cd, qty) VALUES (1, 'C0000001', 5);` | 成功。`STATUS` は '0'、`ORDER_DATE` は SYSDATE |
| Pro*C | 列リストに `status` を書き、インジケーター -1 で実行 | ORA-01400 |

SQL*Plusでは列を**省略**しているので DEFAULT が使われます。Pro*Cでは列を**書いてNULLを指定**しているので、DEFAULT は使われません。単体テストで「SQLの確認はSQL*Plusで済ませた」ときに起きやすい勘違いです。動作確認には、**実際にプログラムが発行するのと同じ列リスト**のSQLを使います。

**対処**

対策は複数あります。選び方は後半の「対策パターンの選び方」にまとめました。なお、Oracle 12c 以降で列に `DEFAULT ON NULL` が付いている場合だけは、INSERT でNULLを渡しても既定値に置き換わります（詳しくは後述）。

## 勘違い3：UPDATEでインジケーター -1 にすれば、その列は更新されない

**症状**

備考だけを変更する画面で、受注日を入力しなかったら ORA-01407 になった。NULL許容列の備考では、**前の値が消えて**NULLになっていた。

```c
/* 未入力の項目は -1 にして「更新しない」つもり */
EXEC SQL UPDATE t_order
            SET order_date = TO_DATE(:ord.order_date:ord_ind.order_date, 'YYYYMMDD'),
                note       = :ord.note:ord_ind.note
          WHERE order_no   = :ord.order_no;
```

**原因**

SET に書いた列は、インジケーターが -1 なら **NULLで上書き**されます。「その列だけ更新しない」という意味はありません。

| 列 | -1 を渡した結果 |
| --- | --- |
| ORDER_DATE（NOT NULL） | ORA-01407: (…"ORDER_DATE") をNULLには更新できません |
| NOTE（NULL許容） | エラーなし。元の備考が**消えて** NULL になる |

NULL許容列のほうは、エラーにならないので気づくのが遅れます。「備考がいつの間にか消えている」という問い合わせで発覚することが多いパターンです。

**対処**

「更新しない」と「NULLにする（クリアする）」は、別の指示です。フラグを1つ追加して、SQLで区別します。

```c
short upd_note;   /* 1: 備考を更新する / 0: 更新しない */

EXEC SQL UPDATE t_order
            SET note = CASE WHEN :upd_note = 1
                            THEN :ord.note:ord_ind.note
                            ELSE note
                       END
          WHERE order_no = :ord.order_no;
```

| upd_note | ord_ind.note | 結果 |
| --- | --- | --- |
| 0 | どちらでも | 現状維持 |
| 1 | 0 | 入力値で更新 |
| 1 | -1 | NULLでクリア |

項目が少ないなら、「更新する列だけを並べたUPDATE」を画面ごとに別のSQLとして書くほうが読みやすくなります。NOT NULL列は、そもそも SET に入れないか、入力チェックで必ず値を入れます。

## 勘違い4：static・グローバル変数は 0 で初期化されるから安全

**症状**

バッチで受注を連続登録すると、**1件目は成功して、2件目以降で** ORA-01400 になる。または、2件目以降の備考に値があるのにNULLで登録されている。

**原因**

C言語の `static` 変数やグローバル変数は、プログラム開始時に1回だけ 0 で初期化されます。インジケーターを「空なら -1」とだけ書いていると、**一度 -1 になった列は、次の行で値があっても 0 に戻りません**。

```c
static ORDER_REC_IND ord_ind;    /* 最初の1回だけ 0 */

for (...) {
    /* NG：空のときだけ -1。値があるときに 0 に戻していない */
    if (ord.status[0] == '\0') ord_ind.status = -1;
    if (ord.note[0]   == '\0') ord_ind.note   = -1;

    EXEC SQL INSERT ...;
}
```

Oracleなしで確かめられるよう、INSERTの代わりに「DBに渡るもの」を表示するプログラムで再現してみます（gcc で実行確認済み）。

```c
/* ind_sim.c : Oracleなしで「前回の -1 が残る」を確かめる */
#include <stdio.h>
#include <string.h>

typedef struct {
    char  cust_cd[8 + 1];
    char  status[1 + 1];
    char  note[100 + 1];
} ORDER_REC;

typedef struct {
    short cust_cd;
    short status;
    short note;
} ORDER_REC_IND;

static ORDER_REC     ord;       /* static なので最初だけ 0 で初期化される */
static ORDER_REC_IND ord_ind;

/* INSERT の代わりに「DBに渡るもの」を表示する */
static void fake_insert(int no)
{
    printf("%d件目: cust_cd=%-8s status=%-4s note=%s\n", no,
           ord_ind.cust_cd < 0 ? "NULL" : ord.cust_cd,
           ord_ind.status  < 0 ? "NULL" : ord.status,
           ord_ind.note    < 0 ? "NULL" : ord.note);
}

/* NG：空のときだけ -1 を代入し、値があるときに 0 へ戻さない */
static void set_ind_ng(void)
{
    if (ord.status[0] == '\0') ord_ind.status = -1;
    if (ord.note[0]   == '\0') ord_ind.note   = -1;
}

/* OK：毎回、両方向に代入する */
static void set_ind_ok(void)
{
    ord_ind.cust_cd = 0;                                /* NOT NULL列は常に 0 */
    ord_ind.status  = 0;
    ord_ind.note    = (short)(ord.note[0] == '\0' ? -1 : 0);
}

int main(void)
{
    static const char *in[][3] = {
        { "C0000001", "",  ""         },   /* 区分も備考も未入力 */
        { "C0000002", "1", "至急"     },
        { "C0000003", "2", "午前着"   },
    };
    int i;

    puts("--- NG ---");
    for (i = 0; i < 3; i++) {
        strcpy(ord.cust_cd, in[i][0]);
        strcpy(ord.status,  in[i][1]);
        strcpy(ord.note,    in[i][2]);
        set_ind_ng();
        fake_insert(i + 1);
    }

    memset(&ord_ind, 0, sizeof(ord_ind));
    puts("--- OK ---");
    for (i = 0; i < 3; i++) {
        strcpy(ord.cust_cd, in[i][0]);
        strcpy(ord.status,  in[i][1][0] ? in[i][1] : "0");  /* 既定値はアプリで入れる */
        strcpy(ord.note,    in[i][2]);
        set_ind_ok();
        fake_insert(i + 1);
    }
    return 0;
}
```

```text
$ gcc -Wall -Wextra -o ind_sim ind_sim.c && ./ind_sim
--- NG ---
1件目: cust_cd=C0000001 status=NULL note=NULL
2件目: cust_cd=C0000002 status=NULL note=NULL
3件目: cust_cd=C0000003 status=NULL note=NULL
--- OK ---
1件目: cust_cd=C0000001 status=0    note=NULL
2件目: cust_cd=C0000002 status=1    note=至急
3件目: cust_cd=C0000003 status=2    note=午前着
```

NG版では、1件目で -1 になった `status` と `note` が、2件目・3件目にも残っています。実際のDBなら、`status` は NOT NULL なので **2件目以降も ORA-01400**、`note` はエラーにならずに**値が消えて**登録されます。1件目が未入力でなければ、「途中の1件が未入力だった以降、全部おかしい」という分かりにくい症状になります。

**対処**

インジケーターは、**毎回、-1 と 0 の両方向に代入**します。`if` で -1 だけを書くのではなく、三項演算子で必ずどちらかを代入する形に統一すると、戻し忘れが起きません。

```c
ord_ind.note = (short)(ord.note[0] == '\0' ? -1 : 0);
```

ループの先頭で `memset(&ord_ind, 0, sizeof(ord_ind));` を入れるのも有効です。ただし、途中で別の処理がインジケーターを書き換えることもあるので、**登録の直前に全列のインジケーターが決まる**書き方のほうが安全です。

## 勘違い5：配列INSERTでも、インジケーター配列を宣言すれば大丈夫

**症状**

100件ずつまとめて登録する処理で、最後の端数（例：37件）の回だけ、一部の行の備考がNULLになる。

```c
#define MAX_ROWS 100

char  arr_note[MAX_ROWS][100 + 1];
short arr_note_ind[MAX_ROWS];

EXEC SQL FOR :n
    INSERT INTO t_order (order_no, cust_cd, qty, note)
    VALUES (:arr_no, :arr_cust, :arr_qty, :arr_note:arr_note_ind);
```

**原因**

ホスト配列では、インジケーターも**要素ごと**に設定が必要です。前回の100件分の設定がそのまま残っていて、今回値を詰めた行のうち、インジケーターを更新しなかった要素に前回の -1 が残っていました。勘違い4の配列版です。

**対処**

- 行を詰めるループの中で、**値と一緒にインジケーターも必ず代入**する
- 1回分を詰め始める前に、インジケーター配列を `memset` で 0 にクリアする
- `FOR :n` の `n` は、今回詰めた件数にする（`MAX_ROWS` のままにしない）

```c
memset(arr_note_ind, 0, sizeof(arr_note_ind));
for (i = 0; i < n; i++) {
    strcpy(arr_note[i], src[i].note);
    arr_note_ind[i] = (short)(src[i].note[0] == '\0' ? -1 : 0);
}
```

一括登録の書き方は「[インジケーターを使う理由](/articles/proc-indicator-variable-insert)」の `cust_indicate.pc` も参考にしてください。

## 切り分け手順：ORA-01400 が出たら、この順番で確認する

「初期値が入るはずなのにNULL」のエラーは、次の5ステップでほぼ原因を特定できます。

| 手順 | 確認すること | 分かること |
| --- | --- | --- |
| 1 | エラーメッセージの列名 | どの列でNULLになったか |
| 2 | 列定義（NULLABLE / DATA_DEFAULT / DEFAULT_ON_NULL） | NOT NULLか、既定値はあるか |
| 3 | 実行直前のインジケーター | -1 が渡っているか |
| 4 | 1件目から失敗するか、2件目以降からか | 勘違い1・2か、勘違い4・5か |
| 5 | インジケーターが 0 なら、ホスト変数の中身 | 空文字でNULLになっていないか |

### 1. メッセージから列名を特定する

ORA-01400 のメッセージには、**スキーマ名・テーブル名・列名**が含まれます。エラー時は `sqlca.sqlerrm.sqlerrmc` を必ずログに出します。

```c
if (sqlca.sqlcode < 0) {
    fprintf(stderr, "[insert_order] sqlcode=%ld %.*s\n",
            sqlca.sqlcode, sqlca.sqlerrm.sqlerrml, sqlca.sqlerrm.sqlerrmc);
}
```

```text
[insert_order] sqlcode=-1400 ORA-01400: NULLは("SCOTT"."T_ORDER"."STATUS")には挿入できません
```

### 2. 列定義を確認する

DB設計書と実際のテーブル定義がずれていることもあるので、データディクショナリで確認します。

```sql
SELECT column_name, nullable, data_default, default_on_null
  FROM user_tab_columns
 WHERE table_name = 'T_ORDER'
 ORDER BY column_id;
```

| 列 | 見るポイント |
| --- | --- |
| `NULLABLE` | `N` なら NOT NULL |
| `DATA_DEFAULT` | DEFAULT 値。ここに値があっても、-1 を渡せば使われない |
| `DEFAULT_ON_NULL` | `YES` なら、INSERT でNULLを渡しても既定値になる（12c 以降） |

### 3. 実行直前のインジケーターを出力する

推測で直さず、**SQLを実行する直前の値**を確認します。デバッグ用の出力関数を1つ用意しておくと便利です。

```c
static void dump_ind(const char *tag, const ORDER_REC_IND *ind)
{
    fprintf(stderr, "[%s] ind: order_no=%d cust_cd=%d qty=%d "
                    "status=%d order_date=%d note=%d\n", tag,
            ind->order_no, ind->cust_cd, ind->qty,
            ind->status, ind->order_date, ind->note);
}
```

gdb を使うなら、INSERT の直前で止めて `p ord_ind` と打つと、構造体ごと表示できます（止まらないときは「[gdbのブレークポイントで止まらない](/articles/c-gdb-breakpoint-not-hit)」を参照）。

```text
(gdb) p ord_ind
$1 = {order_no = 0, cust_cd = 0, qty = 0, status = -1, order_date = 0, note = -1}
```

### 4. 1件目から失敗するか、2件目以降から失敗するか

| 失敗のしかた | 疑う勘違い |
| --- | --- |
| 1件目から（未入力のとき毎回） | 勘違い1・2：既定値のつもりで -1 を設定している |
| 2件目以降から | 勘違い4・5：前の行の -1 が残っている |
| UPDATE だけ失敗 / 値が消える | 勘違い3：-1 を「更新しない」の意味で使っている |

### 5. インジケーターが 0 なのにNULLなら、空文字を疑う

インジケーターが 0 でも、ホスト変数が**空文字**ならOracleはNULLとして扱います（Oracleでは長さ0の文字列はNULLです）。詳しくは「[インジケーターを使う理由](/articles/proc-indicator-variable-insert)」のハマりどころ3を参照してください。

## 対策パターンの選び方

「未入力なら既定値」を実現する方法は、主に5つあります。

| パターン | 書き方 | 向いている場面 | 注意点 |
| --- | --- | --- | --- |
| A. アプリで既定値を設定 | ホスト変数に `"0"` を入れ、インジケーター 0 | 既定値が**業務ルール**として決まっている | 既定値がDBとアプリの2か所に書かれる |
| B. 列リストから省略 | INSERT に `status` を書かない | その処理では**常に**既定値でよい | 入力がある場合と同じSQLにできない |
| C. SQLで NVL | `NVL(:ord.status:ord_ind.status, '0')` | SQLを1本のまま、未入力時だけ既定値にしたい | 既定値がSQLにも書かれる |
| D. `DEFAULT ON NULL` | `ALTER TABLE t_order MODIFY status DEFAULT ON NULL '0';` | どのプログラムから登録されても既定値を保証したい | DDL変更が必要。12c 以降。標準では INSERT のみが対象 |
| E. UPDATE の現状維持 | `CASE WHEN :upd_flg = 1 THEN ... ELSE 列 END` | 「更新しない」と「クリア」を区別したい | フラグの意味を設計書に書く |

### おすすめは A

迷ったら **A（アプリで既定値を設定し、インジケーターは 0）** をおすすめします。

- 「どの値で登録したか」がコードを読めば分かる
- 単体テストの期待値が、DB定義を見なくても決まる
- 必須列のインジケーターは「常に 0」という単純なルールで統一できる

テーブルの DEFAULT は、Pro*C以外（SQL*Plusでの手作業、別システムからの連携）で登録されたときの**保険**と考えます。

### C の書き方

SQLを1本のまま保ちたい場合は、NVL で受け止めます。

```c
EXEC SQL INSERT INTO t_order (order_no, cust_cd, qty, status, order_date, note)
         VALUES (:ord.order_no, :ord.cust_cd, :ord.qty,
                 NVL(:ord.status:ord_ind.status, '0'),
                 NVL(TO_DATE(:ord.order_date:ord_ind.order_date, 'YYYYMMDD'), SYSDATE),
                 :ord.note:ord_ind.note);
```

`NVL` の第2引数に `DEFAULT` キーワードは書けません。既定値をSQLにも書くことになるので、DB設計書の既定値と一致しているかをレビューで確認します。

### D の注意点

`DEFAULT ON NULL` を付けた列は、自動的に NOT NULL になります。また、Oracle 12c〜21c の `DEFAULT ON NULL` は **INSERT だけ**が対象で、UPDATE でNULLを渡すと ORA-01407 になります。Oracle 23ai 以降では `DEFAULT ON NULL FOR INSERT AND UPDATE` と書くと UPDATE も対象になります。どちらも既存テーブルの定義変更なので、アプリの修正だけで済むなら A を優先します。

## チェックリスト

- [ ] インジケーター -1 は「NULLを指定する」意味であり、「指定なし」ではないことをチームで共有した
- [ ] NOT NULL列のインジケーターは、常に 0 にしている
- [ ] 既定値を使う列は、アプリで既定値を設定するか、列リストから省略している
- [ ] SQL*Plusでの動作確認に、プログラムと同じ列リストのSQLを使っている
- [ ] UPDATE で「更新しない」と「NULLでクリア」を区別している
- [ ] インジケーターは毎回 -1 / 0 の両方向に代入している（`if` で -1 だけにしていない）
- [ ] 配列INSERTでは、要素ごとにインジケーターを代入し、`FOR :n` を今回の件数にしている
- [ ] ORA-01400 / ORA-01407 のとき、列名を含むメッセージをログに出している
- [ ] テストケースに「未入力 → 入力あり」の順で連続登録するケースを入れている

## まとめ

- **インジケーター -1 は「NULLを指定した」という意味**です。ホスト変数の値も、列の DEFAULT 値も、UPDATE 前の値も使われません。NOT NULL列なら ORA-01400 / ORA-01407、NULL許容列なら黙ってNULLが入ります。
- 現場で多いのは、**既定値のつもりの -1**（勘違い1・2）、**更新しないつもりの -1**（勘違い3）、**前の行から残った -1**（勘違い4・5）の3系統です。
- エラーが出たら、**列名 → 列定義 → 実行直前のインジケーター → 何件目から失敗するか**の順で確認すると、5分で原因が絞れます。
- 対策は、**アプリで既定値を入れてインジケーターは 0** が基本です。インジケーターは「NULL許容列で、本当にNULLを入れたいときだけ -1」と決めておくと、この種の事故はほぼ防げます。

単体テストでは「1件目が未入力、2件目が入力あり」の順で連続登録するケースを必ず入れてください。勘違い4・5は、このケースでしか見つかりません。テストケースの作り方は「[PCLテスト観点](/articles/pcl-test-case-viewpoints)」も参考になります。
