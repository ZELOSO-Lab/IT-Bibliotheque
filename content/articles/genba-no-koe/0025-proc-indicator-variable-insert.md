---
series: 現場の声
no: 0025
title: 【C言語】Pro*Cの登録処理でインジケーター（標識変数）を使う理由。NOT NULL列ではORA-01400、NULL許容列で起きる影響と7つのハマりどころ
slug: proc-indicator-variable-insert
category: C言語
tags: [C言語, Pro*C, Oracle, 標識変数, インジケーター, NULL, ORA-01400, ORA-01405]
technologies: [c, oracle-database]
excerpt: Pro*CのINSERT・UPDATEでインジケーター（標識変数）を使うと、1本のSQLのまま「値を入れる / NULLを入れる」を実行時に切り替えられます。NOT NULL列に-1を渡すとORA-01400になること、DEFAULT値が効かないこと、NULL許容列で検索・集計・後続処理に出る影響と、初期化漏れなど現場でハマる7つのポイントを、登録・更新・一括登録（indicate関数）のサンプルコード付きでまとめました。
status: draft
created: 2026-10-27
---

# 【C言語】Pro*Cの登録処理でインジケーター（標識変数）を使う理由。NOT NULL列ではORA-01400、NULL許容列で起きる影響と7つのハマりどころ

## 現場の声

> C言語（Pro*C）で登録処理を作ったとき、画面で未入力の項目をNULLで登録するために、**インジケーター（標識変数）** を使いました。
>
> 動いたのはよかったのですが、レビューで次の3つを聞かれて、うまく答えられませんでした。
>
> - インジケーターを使うメリットは何か
> - NULLを許容しないテーブル（NOT NULL列）に対してはどう作用するのか
> - NULLを許容しているテーブル（列）にはどんな影響があるのか

インジケーターは、SELECTでNULLを受け取るためのもの（構造体INTOの記事のハマりどころ6）として覚えている人が多いと思います。実は**登録・更新の側**でも重要な役割を持っています。この記事では、上の3つの質問に順番に答えたうえで、登録処理で実際にハマりやすいポイントをまとめます。

## 前提の構成

| 項目 | 内容 |
| --- | --- |
| 言語 | C言語（Oracle Pro*C/C++ の埋め込み SQL） |
| DB | Oracle Database |
| 処理 | 画面の入力内容から顧客情報を1件登録する（INSERT） |

例として、次の顧客テーブルを使います。

| 物理名 | 論理名 | 型 | NULL | 備考 |
| --- | --- | --- | --- | --- |
| CUST_CD | 顧客コード | VARCHAR2(8) | NOT NULL | 主キー |
| CUST_NAME | 顧客名 | VARCHAR2(40) | NOT NULL | |
| TEL | 電話番号 | VARCHAR2(15) | 許容 | 任意入力 |
| POINT | 保有ポイント | NUMBER(9) | 許容 | 任意入力。0 と未入力を区別する |
| RANK_CD | ランク | CHAR(1) | NOT NULL | DEFAULT 'N' |

ホスト変数の構造体と、同じ並びのインジケーター構造体は次のとおりです。

```c
typedef struct {
    char  cust_cd[8 + 1];
    char  cust_name[40 + 1];
    char  tel[15 + 1];
    int   point;
    char  rank_cd[1 + 1];
} CUST_REC;

typedef struct {        /* CUST_REC と同じ順番・同じ個数で short を並べる */
    short cust_cd;
    short cust_name;
    short tel;
    short point;
    short rank_cd;
} CUST_REC_IND;

CUST_REC     cust;
CUST_REC_IND cust_ind;

EXEC SQL INSERT INTO t_customer (cust_cd, cust_name, tel, point, rank_cd)
         VALUES (:cust:cust_ind);
```

構造体ではなく1つずつ書く場合は、`:cust.tel:cust_ind.tel` のように、ホスト変数の直後にインジケーターを続けます（`:cust.tel INDICATOR :cust_ind.tel` とも書けます）。

## まず結論：インジケーターは「NULLを入れるかどうか」のスイッチ

INSERT・UPDATEで使うインジケーターの意味は、次の2つだけです。

| インジケーターの値 | DBに渡るもの |
| --- | --- |
| **-1**（負の値） | **NULL**。ホスト変数の中身は**無視**される |
| **0 以上** | ホスト変数の値 |

SELECT・FETCHで受け取るときは、Oracleが値を設定します。

| インジケーターの値 | 意味 |
| --- | --- |
| -1 | 列の値は NULL（ホスト変数の中身は不定） |
| 0 | 値がそのまま入った |
| 0 より大きい | 値が切り捨てられた（インジケーターには元の長さが入る） |
| -2 | 値が切り捨てられ、元の長さも分からない |

冒頭の3つの質問への答えは、次のとおりです。

| 質問 | 答え |
| --- | --- |
| メリットは？ | 1本の静的SQLのまま、列ごとに「値 / NULL」を実行時に切り替えられる。0や空白でNULLを代用しなくて済む |
| NOT NULL列には？ | -1 を渡すと **ORA-01400**（UPDATEなら ORA-01407）で登録失敗。制約は回避できず、**DEFAULT値も効かない** |
| NULL許容列には？ | NULLが格納される。その結果、検索・集計・一意制約・後続のFETCHの挙動が変わる |

以下、1つずつ詳しく見ていきます。

## 質問1：インジケーターを使うメリット

### メリット1：「0」と「未入力」を区別して登録できる

ポイントが「0ポイント」なのか「まだ登録されていない」のかは、業務上は別の意味です。`int` のホスト変数だけでは、どちらも何かの数値を入れるしかありません。

インジケーターがない場合、よくあるのが**ダミー値で代用する**方法です。

```c
cust.point = -1;   /* -1 なら未入力、という社内ルール */
```

この方法だと、後続の集計やバッチ、帳票のすべてが「-1は未入力」というルールを知っている必要があります。1か所でも知らない処理があれば、-1ポイントとして合計されてしまいます。

インジケーターを使えば、DBにはそのまま **NULL**（値がない）が入ります。意味がSQLの標準どおりになるので、後続の処理が特別なルールを知る必要はありません。

### メリット2：SQLを1本のまま、組み合わせを切り替えられる

任意項目が3つあると、「入力あり / なし」の組み合わせは 2 × 2 × 2 = 8 通りです。インジケーターを使わずにNULLを登録しようとすると、

- 組み合わせごとに INSERT 文を書き分ける（8本のSQL）
- 動的SQLで列リストを組み立てる（文字列操作が複雑になり、レビューもテストも重くなる）

のどちらかになります。インジケーターなら**SQLは1本のまま**で、実行前にインジケーターの値を設定するだけです。プリコンパイル時に構文チェックされる静的SQLのメリットも残せます。

### メリット3：取得側ではNULLと切り捨てを検知できる

登録処理の前に既存データをSELECTする場合も、インジケーターがあれば、

- NULLの列で ORA-01405（フェッチした列の値が NULL）にならず、-1 で判定できる
- 文字列が切り捨てられたことを、0 より大きい値で検知できる

ようになります。更新処理（SELECT → 値を変更 → UPDATE）では、**取得したインジケーターをそのままUPDATEに渡せば、NULLの列はNULLのまま更新できる**のも利点です。

## 質問2：NOT NULL列への作用

### -1 を渡すと ORA-01400 で登録失敗する

NOT NULL制約のある列にインジケーター -1 を渡すと、その行は登録されず、エラーになります。

| 操作 | エラー |
| --- | --- |
| INSERT | ORA-01400: NULLは ("スキーマ"."T_CUSTOMER"."CUST_NAME") には挿入できません |
| UPDATE | ORA-01407: ("スキーマ"."T_CUSTOMER"."CUST_NAME") をNULLには更新できません |

`sqlca.sqlcode` には -1400（または -1407）が入ります。メッセージ（`sqlca.sqlerrm.sqlerrmc`）に**列名が含まれる**ので、エラーログには必ずメッセージ本文を出力しておきます。どの列が原因かがすぐに分かります。

```c
EXEC SQL INSERT INTO t_customer (cust_cd, cust_name, tel, point, rank_cd)
         VALUES (:cust:cust_ind);

if (sqlca.sqlcode == -1400) {
    fprintf(stderr, "必須項目が未設定: %.*s\n",
            sqlca.sqlerrm.sqlerrml, sqlca.sqlerrm.sqlerrmc);
    EXEC SQL ROLLBACK WORK;
    return -1;
}
```

つまり、**インジケーターでNOT NULL制約をすり抜けることはできません**。制約はDB側で必ずチェックされます。

### DEFAULT値も効かない

`RANK_CD` には `DEFAULT 'N'` が付いています。ここで「インジケーター -1 を渡せば DEFAULT の 'N' が入るはず」と考えるのは間違いです。

| 書き方 | 結果 |
| --- | --- |
| INSERT の列リストから `rank_cd` を**省略**する | DEFAULT の 'N' が入る |
| `rank_cd` を列リストに書き、インジケーター -1 を渡す | **NULL を明示的に挿入**したことになり、ORA-01400 |

DEFAULT値が使われるのは、**列を省略したとき**（または `VALUES` に `DEFAULT` と書いたとき）だけです。

例外として、Oracle 12c 以降で列に `DEFAULT ON NULL` を指定している場合は、INSERT で NULL を渡しても既定値に置き換わります。テーブル定義（DDL）に `ON NULL` があるかどうかは、DB設計書かデータディクショナリで確認してください。

### 必須列のインジケーターは常に 0 にする

NOT NULL列のインジケーターは、**入力チェックで値があることを確認したうえで、常に 0** にします。「未入力ならエラー」はDBに任せず、登録の前にアプリ側でチェックして、画面に分かりやすいメッセージを返すのが基本です。ORA-01400 は、チェック漏れを見つけるための最後の砦と考えます。

## 質問3：NULL許容列への影響

NULL許容列にインジケーター -1 を渡すと、エラーにはならず NULL が格納されます。登録処理そのものは成功しますが、**そのデータを使う側**の挙動が変わります。

### 影響1：`=` や `<>` の検索でヒットしなくなる

NULLはどんな値と比較しても「真」になりません。

```sql
SELECT * FROM t_customer WHERE point = 0;    -- NULL の行は出ない
SELECT * FROM t_customer WHERE point <> 0;   -- NULL の行はここにも出ない
SELECT * FROM t_customer WHERE point IS NULL; -- NULL の行はこれで取る
```

「`point = 0` と `point <> 0` を足せば全件」にはなりません。未入力も対象にしたい検索では、`IS NULL` を条件に加えるか、`NVL(point, 0) = 0` のように置き換えます。

### 影響2：集計関数ではNULLが除外される

| 式 | NULLの扱い |
| --- | --- |
| `COUNT(*)` | 数える |
| `COUNT(point)` | 数えない |
| `SUM(point)` | 無視して合計（全行NULLなら結果もNULL） |
| `AVG(point)` | **NULLを除いた件数**で割る |

`AVG(point)` と `SUM(point) / COUNT(*)` は、NULLがあると結果が変わります。帳票の数字が合わないときは、まずNULLの行がないか確認します。

### 影響3：一意制約（UNIQUE）ではNULLが何件でも入る

`TEL` にUNIQUE制約を付けていても、NULLの行は複数登録できます。「電話番号の重複は登録できない」という仕様で、未入力の行まで重複チェックの対象にしたい場合は、アプリ側で別途チェックが必要です。

### 影響4：後続処理のFETCHでORA-01405が出る

登録したデータを読む**別のプログラム**が、インジケーターなしでその列をFETCHしていると、NULLの行で ORA-01405 になります（`UNSAFE_NULL=YES` などのプリコンパイラオプションの設定による）。

NULL許容列に初めてNULLが入るようになった、というケースでは要注意です。**昨日まで動いていたバッチが、登録処理の変更をきっかけに落ちる**ことがあります。NULLを登録するようにしたら、その列を読んでいるプログラムを洗い出して、インジケーターがあるかどうかを確認します。

### 影響5：画面・帳票・ファイル出力での表示

NULLをインジケーターなしで受けたり、インジケーターを見ずにホスト変数を使ったりすると、前の行の値やゴミが表示されることがあります。取得側では、**インジケーターが -1 のときにホスト変数を使わない**（空欄やハイフンを表示する）ように、表示の処理を決めておきます。

## ハマりどころ1：インジケーターを初期化しておらず、ランダムにNULLが入る

**症状**

入力した項目が、たまにNULLで登録される。テスト環境では再現しないこともある。

**原因**

関数内で宣言した `short` は、初期化しないと**不定値**です。たまたま負の値が残っていると、その列は -1 と同じ扱いになり、ホスト変数に値があっても**エラーなしでNULLが登録**されます。

**対処**

登録の直前に、インジケーター構造体を `memset` で0にクリアしてから、NULLにしたい列だけ -1 を設定します。

```c
memset(&cust_ind, 0, sizeof(cust_ind));   /* まず全部「値あり」 */
if (cust.tel[0] == '\0') cust_ind.tel   = -1;
if (!point_entered)      cust_ind.point = -1;
```

## ハマりどころ2：FETCHで使ったインジケーターを、そのまま別テーブルのINSERTに使い回す

**症状**

移行・コピー処理で、元テーブルでは値があるはずの列が、コピー先でNULLになっている。

**原因**

FETCHのたびにOracleがインジケーターを設定します。ループの中で、前の行でNULLだった列のインジケーター（-1）がそのまま残っていたり、別の構造体用のインジケーターを間違えて渡していたりすると、意図しない列がNULLになります。

**対処**

- 取得側と登録側で、**同じ並びのインジケーター構造体**を使っていることを確認する
- 取得した値を加工してから登録する場合は、値を設定した列のインジケーターも**必ず一緒に 0 に戻す**

## ハマりどころ3：インジケーターが 0 なのに、空文字でNULLになる

**症状**

インジケーターは 0 にしているのに、NOT NULL列で ORA-01400 が出る。

**原因**

Oracleでは、**長さ0の文字列はNULLとして扱われます**。`char` 配列が空文字（`'\0'` だけ）のまま渡されたり、`VARCHAR` 型のホスト変数の `len` が 0 だったりすると、インジケーターが 0 でもNULLが入ります。プリコンパイラのオプション（`CHAR_MAP` など）によっては、空白だけの文字列でも同じことが起きます。

**対処**

必須の文字列項目は、インジケーターだけでなく**値が空でないこと**も登録前にチェックします。

## ハマりどころ4：NOT NULL列にもインジケーターを付けて、-1 を設定してしまう

**症状**

必須項目なのに、条件によって ORA-01400 で登録が失敗する。

**原因**

構造体まるごとにインジケーター構造体を付けると、NOT NULL列のインジケーターも存在します。共通関数で「空なら -1」としていると、必須列まで -1 になります。

**対処**

- 必須列は入力チェックで弾き、インジケーターは常に 0 にする
- 「空なら -1」にする共通関数は、**NULL許容列だけ**に適用する
- どの列がNOT NULLかは、DB設計書か次のSQLで確認する

```sql
SELECT column_name, nullable, data_default
  FROM user_tab_columns
 WHERE table_name = 'T_CUSTOMER'
 ORDER BY column_id;
```

`nullable` が `N` の列がNOT NULLです。`data_default` にDEFAULT値が出ます。

## ハマりどころ5：DEFAULT値を使いたいのに、列リストに含めている

**症状**

`RANK_CD` は DEFAULT 'N' のはずなのに、未入力で登録すると ORA-01400 になる。

**原因**

「質問2」で説明したとおり、列リストに書いてインジケーター -1 を渡すと、**NULLの明示的な挿入**になります。

**対処**

DEFAULT値を使いたい列は、次のどちらかにします。

- INSERT の列リストから**省略**する
- アプリ側で既定値（'N'）を設定し、インジケーターを 0 にして登録する

既定値が業務ルールとして決まっているなら、後者のほうが「どの値で登録したか」がコードから読めるので、保守しやすくなります。

## ハマりどころ6：WHERE句にインジケーター -1 を渡して、0件になる

**症状**

「電話番号が未入力の顧客」を検索するつもりで、WHERE句のホスト変数にインジケーター -1 を渡したら、0件（`sqlca.sqlcode = 1403`）になる。

**原因**

WHERE句で -1 を渡すと、条件は `tel = NULL` になります。影響1のとおり、これは**常に真になりません**。

**対処**

NULLを条件にしたいときは、SQL側で `IS NULL` を書きます。インジケーターで条件を切り替えるのではなく、SQLを分けるか、次のように書きます。

```sql
WHERE (tel = :tel OR (:tel_flg = 1 AND tel IS NULL))
```

## ハマりどころ7：インジケーターの型を int にしている

**症状**

プリコンパイルでエラーになる、または値がおかしい。

**原因**

インジケーターの型は **`short`** と決まっています。`int` や `char` は使えません。

**対処**

単独の変数も、インジケーター構造体のメンバも、すべて `short` で宣言します。

## 具体的なコード：登録・更新・一覧のサンプル一式

ここまでの内容を、そのまま組み込める形のサンプルにまとめます。ファイル構成は次のとおりです。

| ファイル | 内容 |
| --- | --- |
| `cust_rec.h` | ホスト変数・インジケーター・画面入力の構造体 |
| `ind_util.h` / `ind_util.c` | インジケーターの設定・判定（素の C。Pro*C 以外からも使える） |
| `cust_dao.pc` | 登録（INSERT）・更新（SELECT FOR UPDATE → UPDATE）・一覧（カーソル FETCH） |
| `cust_indicate.pc` | `indicate()`：複数件をインジケーター付きでまとめて登録（動的SQL＋ホスト配列） |
| `main.pc` | 動作確認用のメイン |

### テスト用のテーブル

```sql
CREATE TABLE t_customer (
    cust_cd    VARCHAR2(8)   NOT NULL,
    cust_name  VARCHAR2(40)  NOT NULL,
    tel        VARCHAR2(15),
    point      NUMBER(9),
    rank_cd    CHAR(1)       DEFAULT 'N' NOT NULL,
    CONSTRAINT pk_t_customer PRIMARY KEY (cust_cd)
);
```

### cust_rec.h：構造体の定義

ホスト変数の構造体とインジケーター構造体を、**必ず並べて同じファイルに**定義します。列を追加したときに片方だけ直す事故を防げます。

```c
/* cust_rec.h : T_CUSTOMER 1行分のホスト変数とインジケーター */
#ifndef CUST_REC_H
#define CUST_REC_H

typedef struct {
    char  cust_cd[8 + 1];       /* CUST_CD    VARCHAR2(8)  NOT NULL */
    char  cust_name[40 + 1];    /* CUST_NAME  VARCHAR2(40) NOT NULL */
    char  tel[15 + 1];          /* TEL        VARCHAR2(15)          */
    int   point;                /* POINT      NUMBER(9)             */
    char  rank_cd[1 + 1];       /* RANK_CD    CHAR(1)      NOT NULL DEFAULT 'N' */
} CUST_REC;

typedef struct {                /* CUST_REC と同じ順番・同じ個数 */
    short cust_cd;
    short cust_name;
    short tel;
    short point;
    short rank_cd;
} CUST_REC_IND;

/* 画面の入力内容 */
typedef struct {
    char  cust_cd[8 + 1];
    char  cust_name[40 + 1];
    char  tel[15 + 1];
    int   point;
    int   point_entered;        /* 1: 入力あり / 0: 未入力 */
} CUST_INPUT;

enum { RC_OK = 0, RC_REQUIRED = 1, RC_NOT_FOUND = 2, RC_DB = -1 };

#endif /* CUST_REC_H */
```

### ind_util.h / ind_util.c：インジケーターの設定・判定

「空なら -1」「-1 ならNULL」の判定を関数にまとめておくと、`-1` や `0` の数字がコードに散らばらず、読む人が意味を取り違えません。ハマりどころ3の対策として、**空白だけの文字列もNULL扱い**にしています。

```c
/* ind_util.h : インジケーターの設定・判定 */
#ifndef IND_UTIL_H
#define IND_UTIL_H

#include <stddef.h>

#define IND_VALUE ((short)0)    /* 値を渡す */
#define IND_NULL  ((short)-1)   /* NULLを渡す */

/* 空文字・空白だけなら IND_NULL、それ以外は IND_VALUE */
short ind_str(const char *s);

/* 取得したインジケーターがNULLを表すか */
int ind_is_null(short ind);

/* 取得したインジケーターが切り捨てを表すか */
int ind_is_truncated(short ind);

/* 必ず終端する文字列コピー。入りきらなければ 0 以外を返す */
int copy_str(char *dst, size_t size, const char *src);

#endif /* IND_UTIL_H */
```

```c
#include <ctype.h>
#include <stdio.h>
#include "ind_util.h"

short ind_str(const char *s)
{
    if (s == NULL) return IND_NULL;
    for (; *s != '\0'; s++) {
        if (!isspace((unsigned char)*s)) return IND_VALUE;
    }
    return IND_NULL;
}

int ind_is_null(short ind)
{
    return ind == -1;
}

int ind_is_truncated(short ind)
{
    return ind > 0 || ind == -2;
}

int copy_str(char *dst, size_t size, const char *src)
{
    int n = snprintf(dst, size, "%s", src);
    return n < 0 || (size_t)n >= size;
}
```

`strcpy` ではなく `copy_str`（`snprintf` で必ず終端する）を使うと、入力チェック漏れがあってもバッファあふれを起こしません。

### cust_dao.pc：登録・更新・一覧

```c
/* cust_dao.pc : T_CUSTOMER の登録・更新・一覧（インジケーターの使い方） */
#include <stdio.h>
#include <string.h>
#include "cust_rec.h"
#include "ind_util.h"

EXEC SQL INCLUDE SQLCA;

/* エラーメッセージ（ORA-01400 なら列名を含む）を出力する */
static void print_sql_error(const char *where)
{
    fprintf(stderr, "[%s] sqlcode=%ld %.*s\n", where, (long)sqlca.sqlcode,
            sqlca.sqlerrm.sqlerrml, sqlca.sqlerrm.sqlerrmc);
}

/* 1件登録する。未入力の任意項目は NULL で登録する */
int insert_customer(const CUST_INPUT *in)
{
    CUST_REC     cust;
    CUST_REC_IND cust_ind;

    /* 1. 必須項目はアプリ側でチェック（ORA-01400 に頼らない） */
    if (ind_str(in->cust_cd) == IND_NULL || ind_str(in->cust_name) == IND_NULL) {
        return RC_REQUIRED;
    }

    /* 2. ホスト変数とインジケーターをクリア（全部「値あり」から始める） */
    memset(&cust, 0, sizeof(cust));
    memset(&cust_ind, 0, sizeof(cust_ind));

    /* 3. 必須列：値を設定し、インジケーターは 0 のまま */
    copy_str(cust.cust_cd, sizeof(cust.cust_cd), in->cust_cd);
    copy_str(cust.cust_name, sizeof(cust.cust_name), in->cust_name);
    copy_str(cust.rank_cd, sizeof(cust.rank_cd), "N");   /* 既定値はアプリで設定 */

    /* 4. 任意列：未入力なら -1（NULL） */
    cust_ind.tel = ind_str(in->tel);
    if (cust_ind.tel == IND_VALUE) {
        copy_str(cust.tel, sizeof(cust.tel), in->tel);
    }
    if (in->point_entered) {
        cust.point = in->point;             /* 0 も「0ポイント」として登録 */
    } else {
        cust_ind.point = IND_NULL;
    }

    /* 5. 1本の静的SQLで登録 */
    EXEC SQL INSERT INTO t_customer (cust_cd, cust_name, tel, point, rank_cd)
             VALUES (:cust:cust_ind);

    if (sqlca.sqlcode != 0) {
        print_sql_error("insert_customer");
        EXEC SQL ROLLBACK WORK;
        return RC_DB;
    }
    EXEC SQL COMMIT WORK;
    return RC_OK;
}

/* 電話番号を変更する。空なら NULL にし、他の列は NULL も含めてそのまま残す */
int update_customer_tel(const char *cust_cd, const char *new_tel)
{
    CUST_REC     cust;
    CUST_REC_IND cust_ind;
    char         key[8 + 1];

    copy_str(key, sizeof(key), cust_cd);

    /* 1. 現在の値をインジケーター付きで取得（NULL の列は -1 が返る） */
    EXEC SQL SELECT cust_cd, cust_name, tel, point, rank_cd
               INTO :cust:cust_ind
               FROM t_customer
              WHERE cust_cd = :key
                FOR UPDATE;

    if (sqlca.sqlcode == 1403) {
        return RC_NOT_FOUND;
    }
    if (sqlca.sqlcode != 0) {
        print_sql_error("update_customer_tel(select)");
        return RC_DB;
    }

    /* 2. 変更する列だけ、値とインジケーターを一緒に設定する */
    cust_ind.tel = ind_str(new_tel);
    if (cust_ind.tel == IND_VALUE) {
        copy_str(cust.tel, sizeof(cust.tel), new_tel);
    }

    /* 3. point は取得したインジケーターのまま渡す（NULL なら NULL のまま） */
    EXEC SQL UPDATE t_customer
                SET tel   = :cust.tel:cust_ind.tel,
                    point = :cust.point:cust_ind.point
              WHERE cust_cd = :key;

    if (sqlca.sqlcode != 0) {
        print_sql_error("update_customer_tel(update)");
        EXEC SQL ROLLBACK WORK;
        return RC_DB;
    }
    EXEC SQL COMMIT WORK;
    return RC_OK;
}

/* 全件を一覧表示する。NULL は "-" で表示する */
int list_customers(void)
{
    CUST_REC     cust;
    CUST_REC_IND cust_ind;

    EXEC SQL DECLARE c_cust CURSOR FOR
        SELECT cust_cd, cust_name, tel, point, rank_cd
          FROM t_customer
         ORDER BY cust_cd;

    EXEC SQL OPEN c_cust;
    if (sqlca.sqlcode != 0) {
        print_sql_error("list_customers(open)");
        return RC_DB;
    }

    for (;;) {
        EXEC SQL FETCH c_cust INTO :cust:cust_ind;
        if (sqlca.sqlcode == 1403) break;           /* データの終わり */
        if (sqlca.sqlcode != 0) {
            print_sql_error("list_customers(fetch)");
            EXEC SQL CLOSE c_cust;
            return RC_DB;
        }

        if (ind_is_truncated(cust_ind.cust_name)) {
            fprintf(stderr, "%s: 顧客名が切り捨てられました\n", cust.cust_cd);
        }

        /* インジケーターが -1 の列は、ホスト変数の中身を使わない */
        printf("%-8s %-20s %-15s ", cust.cust_cd, cust.cust_name,
               ind_is_null(cust_ind.tel) ? "-" : cust.tel);
        if (ind_is_null(cust_ind.point)) {
            printf("%9s", "-");
        } else {
            printf("%9d", cust.point);
        }
        printf(" %s\n", cust.rank_cd);
    }

    EXEC SQL CLOSE c_cust;
    return RC_OK;
}
```

ポイントは次の3つです。

- **登録**：`memset` で全部 0 にしてから、任意列だけ `ind_str()` や入力フラグで -1 を設定する（ハマりどころ1・4の対策）
- **更新**：取得したインジケーターをそのまま UPDATE に渡すので、`point` がNULLの行はNULLのまま残る。変更する列だけ、**値とインジケーターを一緒に**設定する（ハマりどころ2の対策）
- **一覧**：インジケーターが -1 の列は、ホスト変数を使わずに `-` を表示する（影響5の対策）

### cust_indicate.pc：indicate() で複数件をまとめて登録する

画面の一覧入力やCSV取込のように、**複数件を一度に登録する**場合の関数です。処理の流れは次の8ステップで、コード中のコメント番号と対応しています。

| No | 処理 | 内容 |
| --- | --- | --- |
| 1 | 変数宣言 | 列ごとのホスト配列と、**同じ要素数のインジケーター配列**を宣言する |
| 2 | 変数初期化 | `memset` で全部 0 にクリア（インジケーターは全部「値あり」から始める） |
| 3 | ループを使用して値をセット | 1件ずつ必須チェック → 値を設定 → 任意列が未入力ならインジケーターを -1 |
| 4 | SQL：インサート文作成 | INSERT 文を文字列で組み立てる（値は `:v1`〜`:v5` のプレースホルダ） |
| 5 | インサート文チェック | `PREPARE` で構文・表・列の存在をチェックする |
| 6 | 結果チェック | `sqlcode` と処理件数（`sqlca.sqlerrd[2]`）を確認し、失敗した行を特定する |
| 7 | メッセージ表示 | 登録件数と、どの列をNULLで登録したかを表示する |
| 8 | 関数終了 | 戻り値で結果を返す |

```c
/* cust_indicate.pc : 複数件の顧客をインジケーター付きでまとめて登録する */
#include <stdio.h>
#include <string.h>
#include "cust_rec.h"
#include "ind_util.h"

EXEC SQL INCLUDE SQLCA;

#define MAX_ROWS 100

/*
 * indicate : 入力 count 件を T_CUSTOMER へ一括登録する
 *   戻り値 : RC_OK / RC_REQUIRED（入力エラー） / RC_DB（DBエラー）
 */
int indicate(const CUST_INPUT *in, int count)
{
    /* ---- 1. 変数宣言 ---- */
    char  cust_cd[MAX_ROWS][8 + 1];         /* ホスト配列（1要素 = 1行） */
    char  cust_name[MAX_ROWS][40 + 1];
    char  tel[MAX_ROWS][15 + 1];
    int   point[MAX_ROWS];
    char  rank_cd[MAX_ROWS][1 + 1];
    short ind_cust_cd[MAX_ROWS];            /* インジケーター配列（ホスト配列と同じ要素数） */
    short ind_cust_name[MAX_ROWS];
    short ind_tel[MAX_ROWS];
    short ind_point[MAX_ROWS];
    short ind_rank_cd[MAX_ROWS];
    char  sql_text[512];                    /* 動的に作る INSERT 文 */
    int   rows;                             /* 登録する件数（FOR 句に渡す） */
    int   i;

    if (count <= 0 || count > MAX_ROWS) {
        printf("登録件数が範囲外です（%d件）\n", count);
        return RC_REQUIRED;
    }

    /* ---- 2. 変数初期化（インジケーターは全部 0 =「値あり」から始める） ---- */
    memset(cust_cd, 0, sizeof(cust_cd));
    memset(cust_name, 0, sizeof(cust_name));
    memset(tel, 0, sizeof(tel));
    memset(point, 0, sizeof(point));
    memset(rank_cd, 0, sizeof(rank_cd));
    memset(ind_cust_cd, 0, sizeof(ind_cust_cd));
    memset(ind_cust_name, 0, sizeof(ind_cust_name));
    memset(ind_tel, 0, sizeof(ind_tel));
    memset(ind_point, 0, sizeof(ind_point));
    memset(ind_rank_cd, 0, sizeof(ind_rank_cd));
    memset(sql_text, 0, sizeof(sql_text));
    rows = count;

    /* ---- 3. ループを使用して値をセット ---- */
    for (i = 0; i < rows; i++) {
        /* 必須列：未入力ならDBに送る前にエラー（インジケーターは 0 のまま） */
        if (ind_str(in[i].cust_cd) == IND_NULL || ind_str(in[i].cust_name) == IND_NULL) {
            printf("%d件目：顧客コードと顧客名は必須です\n", i + 1);
            return RC_REQUIRED;
        }
        copy_str(cust_cd[i], sizeof(cust_cd[i]), in[i].cust_cd);
        copy_str(cust_name[i], sizeof(cust_name[i]), in[i].cust_name);
        copy_str(rank_cd[i], sizeof(rank_cd[i]), "N");      /* 既定値はアプリで設定 */

        /* 任意列：未入力なら -1（NULL） */
        ind_tel[i] = ind_str(in[i].tel);
        if (ind_tel[i] == IND_VALUE) {
            copy_str(tel[i], sizeof(tel[i]), in[i].tel);
        }
        if (in[i].point_entered) {
            point[i] = in[i].point;                         /* 0 も「0ポイント」 */
        } else {
            ind_point[i] = IND_NULL;
        }
    }

    /* ---- 4. SQL：インサート文作成 ---- */
    snprintf(sql_text, sizeof(sql_text),
             "INSERT INTO t_customer (cust_cd, cust_name, tel, point, rank_cd) "
             "VALUES (:v1, :v2, :v3, :v4, :v5)");

    /* ---- 5. インサート文チェック（PREPARE で構文・表・列の存在を確認） ---- */
    EXEC SQL PREPARE ins_stmt FROM :sql_text;
    if (sqlca.sqlcode != 0) {
        printf("INSERT文が不正です：%.*s\n", sqlca.sqlerrm.sqlerrml, sqlca.sqlerrm.sqlerrmc);
        return RC_DB;
    }

    /* rows 件を1回でまとめて実行。値とインジケーターを組で渡す */
    EXEC SQL FOR :rows EXECUTE ins_stmt
        USING :cust_cd:ind_cust_cd, :cust_name:ind_cust_name, :tel:ind_tel,
              :point:ind_point, :rank_cd:ind_rank_cd;

    /* ---- 6. 結果チェック ---- */
    if (sqlca.sqlcode != 0) {
        /* sqlerrd[2] = エラーまでに処理できた件数 → 次の行が失敗した行 */
        printf("%ld件目で登録に失敗しました（顧客コード：%s）\n",
               (long)sqlca.sqlerrd[2] + 1, cust_cd[sqlca.sqlerrd[2]]);
        printf("%.*s\n", sqlca.sqlerrm.sqlerrml, sqlca.sqlerrm.sqlerrmc);
        EXEC SQL ROLLBACK WORK;
        return RC_DB;
    }
    if (sqlca.sqlerrd[2] != rows) {
        printf("登録件数が一致しません（予定 %d件 / 実績 %ld件）\n", rows, (long)sqlca.sqlerrd[2]);
        EXEC SQL ROLLBACK WORK;
        return RC_DB;
    }
    EXEC SQL COMMIT WORK;

    /* ---- 7. メッセージ表示 ---- */
    printf("%d件登録しました\n", rows);
    for (i = 0; i < rows; i++) {
        printf("  %s 電話番号:%s ポイント:%s\n", cust_cd[i],
               ind_is_null(ind_tel[i])   ? "NULL" : "値あり",
               ind_is_null(ind_point[i]) ? "NULL" : "値あり");
    }

    /* ---- 8. 関数終了 ---- */
    return RC_OK;
}
```

ポイントは次のとおりです。

- **配列でもインジケーターの考え方は同じ**：`ind_tel[i]` が -1 の行だけ、`tel` がNULLで登録されます。行ごとに「値 / NULL」が違っても、`EXECUTE` は1回で済みます。
- **`FOR :rows` で件数を指定**：ホスト配列は `MAX_ROWS` 件分ありますが、実際に登録するのは先頭の `rows` 件だけです。
- **値を `:v1` 〜 `:v5` のプレースホルダで渡す**：入力値を SQL の文字列に直接つなげないので、SQLインジェクションの心配がありません。値とインジケーターは `USING` 句で組にして渡します。
- **失敗した行を特定できる**：配列で実行してエラーになると、`sqlca.sqlerrd[2]` にエラーまでに処理できた件数が入ります。その次の行（`sqlerrd[2]` 番目の要素）が失敗した行です。ORA-01400 なら、メッセージの列名と合わせて「何件目のどの列か」まで分かります。
- 1件でも失敗したら `ROLLBACK` し、**全件登録か0件か**のどちらかにしています。

呼び出し例と、期待される出力です。

```c
CUST_INPUT list[] = {
    /* cust_cd     cust_name   tel             point entered */
    {"C0000005", "田中電機", "045-111-2222", 300, 1},
    {"C0000006", "高橋建設", "",               0, 1},   /* tel NULL / point 0 */
    {"C0000007", "伊藤食品", "   ",            0, 0},   /* 空白だけの tel も NULL */
};
printf("rc=%d\n", indicate(list, 3));
```

```text
3件登録しました
  C0000005 電話番号:値あり ポイント:値あり
  C0000006 電話番号:NULL ポイント:値あり
  C0000007 電話番号:NULL ポイント:NULL
rc=0
```

4件目に顧客名が空のデータを入れて `indicate(list, 4)` を呼ぶと、DBに送る前に止まります。

```text
4件目：顧客コードと顧客名は必須です
rc=1
```

### main.pc：動作確認

```c
/* main.pc : 登録・更新・一覧の動作確認 */
#include <stdio.h>
#include "cust_rec.h"

EXEC SQL INCLUDE SQLCA;

int insert_customer(const CUST_INPUT *in);
int update_customer_tel(const char *cust_cd, const char *new_tel);
int list_customers(void);

int main(int argc, char *argv[])
{
    char uid[128];
    /*                cust_cd     cust_name   tel             point entered */
    CUST_INPUT ok1 = {"C0000001", "山田商店", "03-1234-5678", 120, 1};
    CUST_INPUT ok2 = {"C0000002", "佐藤工業", "",               0, 1};  /* tel NULL / point 0 */
    CUST_INPUT ok3 = {"C0000003", "鈴木物産", "06-9876-5432",   0, 0};  /* point NULL */
    CUST_INPUT ng1 = {"C0000004", "",         "",               0, 0};  /* 顧客名なし */

    if (argc < 2) {
        fprintf(stderr, "usage: %s user/password@service\n", argv[0]);
        return 1;
    }
    snprintf(uid, sizeof(uid), "%s", argv[1]);
    EXEC SQL CONNECT :uid;
    if (sqlca.sqlcode != 0) {
        fprintf(stderr, "接続失敗: %.*s\n", sqlca.sqlerrm.sqlerrml, sqlca.sqlerrm.sqlerrmc);
        return 1;
    }

    printf("ok1: %d\n", insert_customer(&ok1));
    printf("ok2: %d\n", insert_customer(&ok2));
    printf("ok3: %d\n", insert_customer(&ok3));
    printf("ng1: %d\n", insert_customer(&ng1));
    printf("upd: %d\n", update_customer_tel("C0000001", ""));   /* 電話番号を消す */

    list_customers();

    EXEC SQL COMMIT WORK RELEASE;
    return 0;
}
```

### ビルドと実行

```text
proc iname=cust_dao.pc include=. code=ansi_c
proc iname=cust_indicate.pc include=. code=ansi_c
proc iname=main.pc     include=. code=ansi_c
gcc -o cust_test main.c cust_dao.c cust_indicate.c ind_util.c \
    -I$ORACLE_HOME/precomp/public -L$ORACLE_HOME/lib -lclntsh
./cust_test scott/tiger@orclpdb
```

インクルード・ライブラリのパスは、Oracle のインストール形態（フルクライアント / Instant Client）によって変わります。現場の Makefile に合わせてください。

期待される出力は次のとおりです。

```text
ok1: 0
ok2: 0
ok3: 0
ng1: 1
upd: 0
C0000001 山田商店                 -                     120 N
C0000002 佐藤工業                 -                       0 N
C0000003 鈴木物産                 06-9876-5432            - N
```

| 確認したいこと | 結果 |
| --- | --- |
| ok2：電話番号が空 | `tel` はNULL（一覧で `-`） |
| ok2：ポイント 0 を入力 | `point` は **0**（NULLではない） |
| ok3：ポイント未入力 | `point` はNULL（一覧で `-`） |
| ng1：顧客名なし | アプリのチェックで `RC_REQUIRED`（1）。DBには送らない |
| upd：C0000001 の電話番号を消す | `tel` だけNULLになり、`point` の 120 はそのまま |
| 全件：ランク | 未入力でもアプリで設定した `N` |

日本語の列がずれて見えるのは、`printf` の桁指定が**バイト数**で数えるためです（UTF-8 の漢字は1文字3バイト）。

### おまけ：ORA-01400 をわざと出して確認する

NOT NULL列の挙動を自分の目で確かめたいときは、`insert_customer` の INSERT の直前に1行足して実行します。

```c
cust_ind.cust_name = IND_NULL;   /* 確認用。確認後は必ず消す */
```

次のようなエラーが出て、登録されないことが確認できます（メッセージは環境の言語設定によって変わります）。

```text
[insert_customer] sqlcode=-1400 ORA-01400: NULLは("SCOTT"."T_CUSTOMER"."CUST_NAME")には挿入できません
ok1: -1
```

同じように `rank_cd` のインジケーターを -1 にすると、DEFAULT 'N' があっても ORA-01400 になることも確認できます（ハマりどころ5）。

## チェックリスト

- [ ] インジケーターの型は `short` で宣言している
- [ ] インジケーター構造体は、ホスト変数の構造体と同じ順番・同じ個数になっている
- [ ] 登録の直前に、インジケーターを `memset` で 0 にクリアしている
- [ ] NOT NULL列は入力チェックで弾き、インジケーターは常に 0 にしている
- [ ] 「空なら -1」の共通処理を、NULL許容列だけに適用している
- [ ] 必須の文字列項目が空文字のまま渡らないことを確認している
- [ ] DEFAULT値を使いたい列は、列リストから省略するか、アプリで既定値を設定している
- [ ] ORA-01400 / ORA-01407 のとき、列名を含むメッセージをログに出している
- [ ] NULLを登録する列を読んでいる後続処理が、インジケーターを付けてFETCHしている
- [ ] NULLを含む検索・集計（`IS NULL` / `NVL` / `COUNT(列)` / `AVG`）の仕様を確認した

## まとめ

- **メリット**：インジケーターを使うと、1本の静的SQLのまま、列ごとに「値を入れる / NULLを入れる」を実行時に切り替えられます。0やダミー値でNULLを代用しなくて済むので、データの意味がSQLの標準どおりになります。
- **NOT NULL列**：-1 を渡すと ORA-01400（UPDATEは ORA-01407）で登録に失敗します。制約は回避できず、DEFAULT値も効きません。必須列のインジケーターは常に 0 にし、入力チェックはアプリ側で行います。
- **NULL許容列**：NULLが格納され、`=` 検索・集計・一意制約・後続処理のFETCHの挙動が変わります。NULLを登録するようにしたら、そのデータを**読む側**の処理も一緒に確認します。

インジケーターで一番多い事故は、**初期化漏れで意図しないNULLが入る**ことです。「全部 0 にクリアしてから、NULLにしたい列だけ -1」の順番を、チームの書き方として決めておくと安全です。

「既定値が入るつもりが、NULLが入った」ときの切り分け手順と対策の選び方は「[Pro*Cで「初期値が入るはず」がNULLでORA-01400](/articles/proc-indicator-null-not-default)」にまとめました。
