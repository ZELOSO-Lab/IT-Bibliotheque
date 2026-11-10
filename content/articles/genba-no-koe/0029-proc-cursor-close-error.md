---
series: 現場の声
no: 0029
title: 【C言語】Pro*CでFETCHがNOT FOUNDのあと、カーソルのCLOSEに失敗。そのまま終了してよい？ 判断基準と後始末の書き方、8つのハマりどころ
slug: proc-cursor-close-error
category: C言語
tags: [C言語, Pro*C, Oracle, カーソル, CLOSE, NOT FOUND, WHENEVER, SQLCODE, エラー処理, バッチ]
technologies: [c, oracle-database]
excerpt: Pro*Cで OPEN → FETCH → NOT FOUND → CLOSE と進み、最後のCLOSEだけ失敗したときは「終了してよい」が答えです。ただし、エラーログを出し、ROLLBACK/COMMIT と切断を明示し、戻り値は異常にしてから終了します。CLOSEが失敗する原因（接続断・COMMITで閉じたカーソル・未OPENのカーソル）、COMMITかROLLBACKかの判断表、WHENEVER SQLERROR GOTO の無限ループ、配列FETCHの取りこぼしなど8つのハマりどころと、そのまま使える後始末のテンプレートをまとめました。
status: draft
created: 2026-11-10
---

# 【C言語】Pro*CでFETCHがNOT FOUNDのあと、カーソルのCLOSEに失敗。そのまま終了してよい？ 判断基準と後始末の書き方、8つのハマりどころ

## 現場の声

> C言語（Pro*C）のバッチで、カーソルを使ってデータを読んでいます。処理の流れはこうです。
>
> カーソルオープン → フェッチ → ノットファウンド → カーソルクローズ
>
> 全件読み終わったあとの **カーソルクローズに失敗したら、そのまま終了してよい** のでしょうか？ データは全部読めているので、エラーにするのも大げさな気がします。

結論から書きます。

**終了してよいです。ただし「黙って正常終了」はダメです。** 次の4つをやってから終了します。

| やること | 理由 |
| --- | --- |
| 1. SQLCODE とメッセージをログに出す | CLOSE の失敗は「接続が切れた」などの異常のサインで、原因の調査が必要 |
| 2. エラー処理の先頭で `WHENEVER SQLERROR CONTINUE` にする | 後始末のSQLが失敗したとき、エラー処理へ戻って無限ループするのを防ぐ |
| 3. ROLLBACK（またはCOMMIT）と切断を**明示**する | 未確定の更新をどうするかを、プログラムが決める |
| 4. 戻り値は**異常終了**にする | 正常終了にすると、JP1やシェルなどの呼び出し側が障害に気づけない |

CLOSE をリトライする必要はありません。失敗の原因はほとんどが接続断やカーソルの状態の不整合で、同じ CLOSE をやり直しても直らないからです。

以下、「なぜ終了してよいのか」「COMMITとROLLBACKのどちらにするか」「現場でハマる8つのポイント」を順番に説明し、最後にそのまま使えるテンプレートを載せます。

## 前提の構成

| 項目 | 内容 |
| --- | --- |
| 言語 | C言語（Oracle Pro*C/C++ の埋め込みSQL） |
| DB | Oracle Database |
| 処理 | カーソルで受注テーブルを読み、ファイル出力や更新を行う夜間バッチ |
| 呼び出し元 | シェル、JP1 などのジョブ管理（戻り値で成否を判定） |
| プリコンパイルオプション | 特に書かない場合は既定の `MODE=ORACLE` を想定。`MODE=ANSI` との違いは本文で触れます |

例として、「[詳細設計書の書き方](/articles/detailed-design-doc-howto)」と同じ受注テーブル `T_ORDER` を読むカーソルを使います。

```c
EXEC SQL DECLARE cur_order CURSOR FOR
    SELECT order_no, cust_cd, qty
      FROM t_order
     WHERE order_date = TO_DATE(:proc_date, 'YYYYMMDD')
     ORDER BY order_no;
```

## まず整理：NOT FOUND のあとの CLOSE 失敗は「何が起きた」のか

### NOT FOUND は正常

FETCH の NOT FOUND は「**もう読む行がない**」という意味で、エラーではありません。SQLCODE の値はプリコンパイルオプションで変わります。

| オプション | NOT FOUND の SQLCODE |
| --- | --- |
| `MODE=ORACLE`（既定） | `+1403` |
| `MODE=ANSI` | `+100` |

どちらのモードでも動くように書くなら、数値ではなく `EXEC SQL WHENEVER NOT FOUND DO break;` を使うか、`sqlca.sqlcode > 0` で判定します。

### CLOSE が失敗するのは、ほぼ次の3パターン

全件読み終わったあとの CLOSE は、ふつうは失敗しません。失敗したときは、次のどれかが起きています。

| 原因 | 主なエラー | 状況 |
| --- | --- | --- |
| A. DBとの接続が切れた | ORA-03113 / ORA-03114 / ORA-03135 / ORA-01012 | DBの再起動、ネットワーク断、アイドルタイムアウト、セッションのKILL |
| B. カーソルがすでに閉じている | SQL-02114 | `MODE=ANSI` などで、ループ内の COMMIT によりカーソルが自動で閉じた、または2回 CLOSE した |
| C. カーソルが開いていない・無効 | SQL-02114 / ORA-01001 | OPEN に失敗したのにエラー処理で CLOSE した、接続をやり直したあとに古いカーソルを CLOSE した |

SQL-02114 は「Invalid SQL Cursor usage: trying to CLOSE a CLOSEd cursor」（閉じたカーソルを CLOSE しようとした）という Pro*C ランタイムのエラーです。`MODE=ORACLE` では閉じたカーソルの再 CLOSE はエラーになりませんが、`MODE=ANSI` ではエラーになります。

### 「終了してよい」理由

| 観点 | CLOSE 失敗の影響 |
| --- | --- |
| 読んだデータ | **確定している**。NOT FOUND まで読めたなら、FETCH した行はすべて正しい |
| DB側のカーソル | 接続断（A）ならセッションごと消える。B・C ならもともと閉じている。**放置しても残らない** |
| 続きの処理 | CLOSE の後に読む処理はないので、**やり直す意味がない** |
| 未確定の更新 | **ここだけは判断が必要**。次の判断表で決める |

つまり、困るのは「CLOSE できなかったこと」そのものではありません。**CLOSE が失敗するほどの異常が起きていること**と、**未確定の更新をどうするか**の2点です。だからログを残し、後始末を明示して、異常として終了します。

## 判断表：COMMIT か ROLLBACK か、戻り値はどうするか

| 処理の種類 | 状況 | 後始末 | 戻り値 |
| --- | --- | --- | --- |
| 読むだけ（SELECT → ファイル出力） | CLOSE 失敗 | ROLLBACK RELEASE（更新が無いので実害なし） | 異常（例: 8） |
| 更新あり、COMMIT はループ後に1回 | CLOSE 失敗 | **ROLLBACK RELEASE**。翌日の再実行で最初からやり直す | 異常 |
| 更新あり、ループ内で N件ごとに COMMIT | CLOSE 失敗 | 最後の COMMIT 以降を ROLLBACK。どこまで確定したかをログに出す | 異常 |
| 更新あり、仕様で「最後まで処理できたら確定」 | CLOSE だけ失敗、接続は生きている | 仕様に従い COMMIT してもよい。ただし設計書に明記する | 警告（例: 4）または異常 |
| どれでも | 接続断（ORA-03113 など） | ROLLBACK も失敗するが**想定内**。未確定の更新はDBが自動でロールバックする | 異常 |

迷ったら **ROLLBACK** にします。ROLLBACK して再実行すれば必ず元に戻せますが、間違って COMMIT したデータを戻すのは大変だからです。

「データは全部読めたのだから正常終了（0）でよいのでは」という意見もあります。それでも異常にするのは、CLOSE 失敗の原因が接続断やコーディングミスであり、**放っておくと翌日も同じことが起きる**からです。現場の規約で「警告（4）」を使う場合でも、0 にはしないでください。

## ハマりどころ1：CLOSE の結果を見ずに `return 0`

**症状**

DBの再起動と夜間バッチが重なった日に、バッチは「正常終了」したのに、後続ジョブが空のファイルを処理していた。

```c
EXEC SQL CLOSE cur_order;
EXEC SQL COMMIT WORK RELEASE;
return 0;                        /* 何が起きても正常終了 */
```

**原因**

CLOSE と COMMIT の結果を確認していません。`WHENEVER SQLERROR` も書いていないので、エラーが起きても**次の行に進むだけ**です。ジョブ管理は戻り値 0 を見て成功と判断し、後続ジョブを流します。

**対処**

SQL を実行したら、毎回 `sqlca.sqlcode` を確認します。CLOSE も例外ではありません。

```c
EXEC SQL CLOSE cur_order;
if (sqlca.sqlcode < 0) {
    log_sql_error("CLOSE cur_order");
    cleanup(RET_NG);             /* 後始末して異常終了（後述のテンプレート） */
}
```

## ハマりどころ2：NOT FOUND とエラーを区別せずにループを抜ける

**症状**

FETCH の途中で接続が切れたのに、「全件読み終わった」と同じ扱いになり、件数が少ないまま正常終了した。CLOSE で初めてエラーが出て、ようやく異常に気づいた。

```c
for (;;) {
    EXEC SQL FETCH cur_order INTO :rec;
    if (sqlca.sqlcode != 0) break;      /* NOT FOUND もエラーも同じ扱い */
    write_record(&rec);
}
```

**原因**

`!= 0` で抜けているので、`+1403`（NOT FOUND）も `-3113`（接続断）も区別できません。CLOSE の失敗は、実は **FETCH の途中で起きていた異常が、遅れて見えただけ**ということがよくあります。

**対処**

正（NOT FOUND）と負（エラー）を分けて判定します。

```c
for (;;) {
    EXEC SQL FETCH cur_order INTO :rec;
    if (sqlca.sqlcode == 1403) break;   /* MODE=ANSI なら 100 */
    if (sqlca.sqlcode < 0) {
        log_sql_error("FETCH cur_order");
        cleanup(RET_NG);
    }
    write_record(&rec);
    fetch_cnt++;
}
```

CLOSE が失敗したときは、**FETCH の件数が想定どおりか**もログで確認してください。件数が少なければ、原因は CLOSE ではなく FETCH の途中にあります。

## ハマりどころ3：WHENEVER SQLERROR GOTO で無限ループ

**症状**

CLOSE が失敗したバッチが終わらず、ログに同じエラーが何万行も出ていた。

```c
EXEC SQL WHENEVER SQLERROR GOTO sql_err;
    ...
EXEC SQL CLOSE cur_order;
EXEC SQL COMMIT WORK RELEASE;
return RET_OK;

sql_err:
    log_sql_error("SQL");
    EXEC SQL CLOSE cur_order;           /* 後始末のつもり */
    EXEC SQL ROLLBACK WORK RELEASE;
    return RET_NG;
```

**原因**

`WHENEVER` はプリコンパイラへの指示で、**ソースの下にあるすべての SQL** に効きます。エラー処理の中の CLOSE にも `GOTO sql_err` が付くので、

1. 本処理の CLOSE が失敗 → `sql_err` へ
2. エラー処理の CLOSE がまた失敗（接続が切れているので当然） → `sql_err` へ
3. 2 に戻る

と、永久に繰り返します。

Oracle が無くても確かめられるよう、Pro*C が生成する判定と同じ動きをするプログラムで再現してみます（gcc で実行確認済み。実験用に5回で止めています）。

```c
/* WHENEVER SQLERROR GOTO err の無限ループを gcc で再現する（Oracle不要） */
#include <stdio.h>

struct { int sqlcode; } sqlca;

/* Pro*C が「EXEC SQL WHENEVER SQLERROR GOTO err;」の後に生成するのと同じ判定 */
#define SQL_CHECK()  if (sqlca.sqlcode < 0) goto err

static int fetch_count = 0;
static void sql_open(void)     { sqlca.sqlcode = 0; puts("OPEN"); }
static void sql_fetch(void)    { sqlca.sqlcode = (++fetch_count <= 3) ? 0 : 1403; }
static void sql_close(void)    { sqlca.sqlcode = -3114; puts("CLOSE -> ORA-03114"); }
static void sql_rollback(void) { sqlca.sqlcode = -3114; puts("ROLLBACK -> ORA-03114"); }

int main(void)
{
    int guard = 0;                     /* 実験用の安全装置。本物のコードには無い */

    sql_open();  SQL_CHECK();
    for (;;) {
        sql_fetch(); SQL_CHECK();
        if (sqlca.sqlcode == 1403) break;
        printf("FETCH %d件目\n", fetch_count);
    }
    sql_close(); SQL_CHECK();          /* ここで失敗して err へ */
    return 0;

err:
    printf("エラー処理に入った（%d回目）SQLCODE=%d\n", ++guard, sqlca.sqlcode);
    if (guard >= 5) { puts("…以下、永久に繰り返す"); return 8; }
    sql_close();    SQL_CHECK();       /* 後始末のCLOSEがまた失敗 → err に戻る */
    sql_rollback(); SQL_CHECK();
    return 8;
}
```

実行結果です。

```text
OPEN
FETCH 1件目
FETCH 2件目
FETCH 3件目
CLOSE -> ORA-03114
エラー処理に入った（1回目）SQLCODE=-3114
CLOSE -> ORA-03114
エラー処理に入った（2回目）SQLCODE=-3114
CLOSE -> ORA-03114
エラー処理に入った（3回目）SQLCODE=-3114
CLOSE -> ORA-03114
エラー処理に入った（4回目）SQLCODE=-3114
CLOSE -> ORA-03114
エラー処理に入った（5回目）SQLCODE=-3114
…以下、永久に繰り返す
```

**対処**

エラー処理の**先頭**で `WHENEVER SQLERROR CONTINUE` に切り替えます。`WHENEVER` はソース上の位置で効くので、ラベルの直後に書けば、それより下の SQL は失敗しても次の行に進みます。

```c
sql_err:
    EXEC SQL WHENEVER SQLERROR CONTINUE;   /* 最初に書く */
    log_sql_error("SQL");
    EXEC SQL CLOSE cur_order;              /* 失敗しても戻らない */
    EXEC SQL ROLLBACK WORK RELEASE;
    return RET_NG;
```

同じ再現プログラムで、エラー処理の先頭で判定を止めると、1回で抜けて戻り値 8 で終わります。

```text
CLOSE -> ORA-03114
エラー処理 SQLCODE=-3114
CLOSE -> ORA-03114
ROLLBACK -> ORA-03114
戻り値 8 で終了
```

`WHENEVER SQLERROR STOP` も注意が必要です。エラーの時点でプログラムが止まるので、ログも出ず、戻り値も選べません。バッチでは `GOTO` か `CONTINUE` ＋自前の判定にします。

## ハマりどころ4：ループ内の COMMIT でカーソルが閉じていた

**症状**

1000件ごとに COMMIT するよう改修したら、テスト環境では動いたのに、本番では最後の CLOSE で SQL-02114 になった。

```c
for (;;) {
    EXEC SQL FETCH cur_order INTO :rec;
    if (sqlca.sqlcode == 1403) break;
    update_order(&rec);
    if (++cnt % 1000 == 0) {
        EXEC SQL COMMIT WORK;           /* ここでカーソルが閉じることがある */
    }
}
EXEC SQL CLOSE cur_order;               /* SQL-02114 */
```

**原因**

COMMIT でカーソルが閉じるかどうかは、プリコンパイルオプションで変わります。

| オプション | COMMIT / ROLLBACK のとき |
| --- | --- |
| `MODE=ORACLE`（既定）、`CLOSE_ON_COMMIT=NO` | `FOR UPDATE` のカーソル以外は開いたまま |
| `MODE=ANSI`、または `CLOSE_ON_COMMIT=YES` | **すべてのカーソルが閉じる** |

テスト環境と本番環境で Makefile やオプションファイル（`pcscfg.cfg`）の設定が違うと、片方だけで起きます。`MODE=ANSI` では閉じたカーソルの再 CLOSE がエラーになるので、最後の CLOSE で SQL-02114 が出ます。

また `MODE=ORACLE` でも、`SELECT ... FOR UPDATE` のカーソルは COMMIT でロックが外れるため、COMMIT 後の FETCH は **ORA-01002: フェッチ順序が無効です** になります。

**対処**

- ループ内で COMMIT するカーソルは、`FOR UPDATE` を付けない
- プリコンパイルオプションを Makefile に明記し、環境ごとの差をなくす（`proc MODE=ORACLE CLOSE_ON_COMMIT=NO ...`）
- `MODE=ANSI` が必要な現場なら、COMMIT のたびにカーソルを開き直す設計にする（キーで続きから読む）

オプションの差でテストと本番の動きが変わる話は、gdb の「[ブレークポイントで止まらない原因はMakefileだった話](/articles/c-gdb-breakpoint-not-hit)」とも共通です。

## ハマりどころ5：OPEN していないカーソルをエラー処理で CLOSE する

**症状**

OPEN の前の接続で失敗したのに、ログには「CLOSE失敗 SQL-02114」や「ORA-01001」だけが残り、本当の原因（接続エラー）が分からなかった。

**原因**

エラー処理で「とりあえず CLOSE」しているので、**OPEN していないカーソル**を CLOSE しています。しかも、最初のエラーの `sqlca` を CLOSE のエラーで上書きしてしまい、ログに出たのは2番目のエラーでした。

**対処**

- カーソルを開いたかどうかをフラグで持ち、**開いているときだけ CLOSE** する
- ログは、後始末の SQL を実行する**前**に出す（`sqlca` は次の SQL で上書きされる）

```c
static int cur_opened = 0;

EXEC SQL OPEN cur_order;
if (sqlca.sqlcode < 0) { log_sql_error("OPEN cur_order"); cleanup(RET_NG); }
cur_opened = 1;
    ...
EXEC SQL CLOSE cur_order;
cur_opened = 0;                          /* 成否にかかわらず、もう開いていない扱い */
if (sqlca.sqlcode < 0) { log_sql_error("CLOSE cur_order"); cleanup(RET_NG); }
```

CLOSE の直後に、**成否に関係なく** `cur_opened = 0` にしているのがポイントです。こうしておくと、CLOSE の失敗で `cleanup()` に入ったときに、もう一度 CLOSE することがありません。

## ハマりどころ6：後始末をせずに `exit()` する

**症状**

CLOSE 失敗のあとすぐ `exit(8)` したら、日によって更新が残っていたり、消えていたりした。

**原因**

COMMIT も ROLLBACK もせずにプログラムが終わったとき、未確定の更新がどうなるかは、**終わり方（正常終了・異常終了・シグナル）や環境に任せる**ことになります。プログラムとして「どうするか」を決めていないのが問題です。

**対処**

CLOSE に失敗しても、後始末は明示します。順番は次のとおりです。

1. `WHENEVER SQLERROR CONTINUE`（後始末の失敗で戻らない）
2. 開いているカーソルだけ CLOSE（失敗しても無視してよい）
3. `ROLLBACK WORK RELEASE`（判断表で COMMIT にすると決めた場合だけ COMMIT）
4. 開いているファイルを閉じる
5. 戻り値を返す

接続が切れている場合、2 と 3 も失敗します。これは**想定内**です。接続が切れたセッションの未確定の更新は、DB側で自動的にロールバックされます。後始末の失敗はログに1行出すだけにして、**後始末の中では異常終了の判定を増やさない**のがコツです。

## ハマりどころ7：エラーメッセージが途中で切れている

**症状**

ログに出たメッセージが「ORA-03113: 通信チャネルでファイルの終わりが」までで切れていて、詳細が分からなかった。

**原因**

`sqlca.sqlerrm.sqlerrmc` は**最大70バイト**です。日本語のメッセージはすぐに収まらなくなります。

**対処**

長いメッセージは `sqlglm()` で取得します。

```c
#include <sqlca.h>
#include <sqlcpr.h>                      /* sqlglm() の宣言 */

static void log_sql_error(const char *where)
{
    char   msg[512];
    size_t buf_len = sizeof(msg);
    size_t msg_len = 0;

    sqlglm(msg, &buf_len, &msg_len);     /* sqlca の内容を壊さずに読める */
    fprintf(stderr, "[SQLERR] %s SQLCODE=%ld %.*s\n",
            where, (long)sqlca.sqlcode, (int)msg_len, msg);
}
```

ログには **どの SQL か（`where`）**、**SQLCODE**、**メッセージ**、**そこまでの FETCH 件数**を必ず出します。CLOSE 失敗の調査では、「何件目まで読めたか」が一番役に立ちます。

## ハマりどころ8：配列 FETCH の NOT FOUND で、最後の数件を取りこぼす

CLOSE とは別の話ですが、同じ「OPEN → FETCH → NOT FOUND → CLOSE」の流れで、とても多い事故なので載せておきます。

**症状**

配列 FETCH（100件ずつ）に変えたら、件数が100の倍数でないときだけ、最後の端数が出力されない。

```c
for (;;) {
    EXEC SQL FOR :ARR FETCH cur_order INTO :recs;
    if (sqlca.sqlcode == 1403) break;   /* 端数の行を処理せずに抜けてしまう */
    write_records(recs, ARR);
}
```

**原因**

配列 FETCH では、**最後の端数の行を返したときに NOT FOUND になります**。たとえば250件なら、3回目の FETCH は50件を返しつつ SQLCODE が 1403 です。そこで抜けると50件を捨てます。

**対処**

累計の件数 `sqlca.sqlerrd[2]` から、今回取れた件数を計算して処理してから抜けます。

```c
long total = 0;
for (;;) {
    EXEC SQL FOR :ARR FETCH cur_order INTO :recs;
    if (sqlca.sqlcode < 0) { log_sql_error("FETCH cur_order"); cleanup(RET_NG); }

    long got = sqlca.sqlerrd[2] - total;  /* sqlerrd[2] はOPENからの累計件数 */
    total = sqlca.sqlerrd[2];
    if (got > 0) write_records(recs, got);

    if (sqlca.sqlcode == 1403) break;     /* 端数を処理してから抜ける */
}
```

`sqlerrd[2]` は CLOSE で値が変わるので、件数は **CLOSE の前に変数へ退避**しておきます。

## そのまま使えるテンプレート

ここまでの対策をまとめた形です。後始末を `cleanup()` の1か所に集めているので、どこで失敗しても同じ手順で終われます。

```c
#include <stdio.h>
#include <stdlib.h>
#include <sqlca.h>
#include <sqlcpr.h>

#define RET_OK   0
#define RET_WARN 4
#define RET_NG   8

EXEC SQL BEGIN DECLARE SECTION;
    char  proc_date[8 + 1];
    long  order_no;
    char  cust_cd[8 + 1];
    int   qty;
EXEC SQL END DECLARE SECTION;

/* カーソルは、CLOSE を書く cleanup() より上で宣言する（ソース上の順番で解釈されるため） */
EXEC SQL DECLARE cur_order CURSOR FOR
    SELECT order_no, cust_cd, qty
      FROM t_order
     WHERE order_date = TO_DATE(:proc_date, 'YYYYMMDD')
     ORDER BY order_no;

static int   connected  = 0;
static int   cur_opened = 0;
static long  fetch_cnt  = 0;
static FILE *out_fp     = NULL;

static void log_sql_error(const char *where);   /* ハマりどころ7 */

/* 後始末はここだけ。どこで失敗しても同じ順番で終わる */
static void cleanup(int ret)
{
    EXEC SQL WHENEVER SQLERROR CONTINUE;        /* 後始末の失敗で戻らない */

    fprintf(stderr, "[INFO] 終了処理 ret=%d fetch=%ld件\n", ret, fetch_cnt);

    if (cur_opened) {
        EXEC SQL CLOSE cur_order;
        cur_opened = 0;
        if (sqlca.sqlcode < 0) log_sql_error("CLOSE(cleanup)");  /* 記録だけ */
    }
    if (connected) {
        if (ret == RET_OK) {
            EXEC SQL COMMIT WORK RELEASE;
        } else {
            EXEC SQL ROLLBACK WORK RELEASE;     /* 迷ったら ROLLBACK */
        }
        connected = 0;
        if (sqlca.sqlcode < 0) log_sql_error("COMMIT/ROLLBACK(cleanup)");
    }
    if (out_fp != NULL) {
        fclose(out_fp);
        out_fp = NULL;
    }
    exit(ret);
}

int main(void)
{
    /* 接続（省略）。成功したら connected = 1 */

    EXEC SQL OPEN cur_order;
    if (sqlca.sqlcode < 0) { log_sql_error("OPEN cur_order"); cleanup(RET_NG); }
    cur_opened = 1;

    for (;;) {
        EXEC SQL FETCH cur_order INTO :order_no, :cust_cd, :qty;
        if (sqlca.sqlcode == 1403) break;               /* 正常：読み終わり */
        if (sqlca.sqlcode < 0) { log_sql_error("FETCH cur_order"); cleanup(RET_NG); }
        fetch_cnt++;
        /* 1件分の処理 */
    }

    EXEC SQL CLOSE cur_order;
    cur_opened = 0;                                     /* 成否にかかわらず */
    if (sqlca.sqlcode < 0) {
        log_sql_error("CLOSE cur_order");               /* 読んだ件数もcleanupで出る */
        cleanup(RET_NG);                                /* リトライしない */
    }

    cleanup(RET_OK);
    return RET_OK;                                      /* ここには来ない */
}
```

ポイントは4つです。

- `DECLARE CURSOR` は、そのカーソルを CLOSE する `cleanup()` より**上**に書いています。Pro*C はソースを上から順に読むので、宣言より上で CLOSE を書くとプリコンパイルエラーになります
- `WHENEVER SQLERROR` は `GOTO` を使わず、**毎回 `sqlca.sqlcode` を自分で判定**しています。どの SQL で失敗したかがログに残り、無限ループも起きません
- `cleanup()` の先頭で `WHENEVER SQLERROR CONTINUE` を書いています。`WHENEVER` はソース上の位置で効くので、他の場所で `GOTO` を使っている現場でも安全です
- 後始末の中の失敗は**記録だけ**にしています。戻り値は、最初に失敗した時点で決まった `ret` のままです

出力ファイルを作るバッチでは、**一時ファイルに書いて、最後まで成功したら `rename()` で本来の名前にする**と、異常終了時に中途半端なファイルが後続ジョブに渡りません。

## 呼び出し側（シェル・JP1）で戻り値を確かめる

プログラムで異常を返しても、呼び出し側が見ていなければ意味がありません。シェルから呼ぶ場合は、戻り値をそのまま返します。

```sh
#!/bin/sh
./order_batch "$1"
rc=$?
if [ "$rc" -ne 0 ]; then
    echo "order_batch 異常終了 rc=$rc" >&2
fi
exit "$rc"          # ここで 0 を返すと、JP1 には正常に見える
```

よくあるのは、シェルの最後の行が `echo` や `rm` で、その戻り値（0）がジョブの結果になってしまうパターンです。最後に `exit "$rc"` を書いてください。JP1 では、ジョブの「終了判定」で、警告（例: 4）と異常（例: 8）のしきい値を設計書の戻り値と合わせておきます。

## CLOSE 失敗が出たときの調査手順

| 手順 | 確認すること | 分かること |
| --- | --- | --- |
| 1 | ログの SQLCODE とメッセージ | 原因が A（接続断）・B（閉じていた）・C（未OPEN・無効）のどれか |
| 2 | FETCH の件数が想定どおりか | 少なければ、FETCH の途中で異常が起きていた（ハマりどころ2） |
| 3 | 同じ時刻のDBのアラートログ、DB再起動・メンテの予定 | 接続断の原因（再起動、タイムアウト、KILL） |
| 4 | Makefile・`pcscfg.cfg` の `MODE` / `CLOSE_ON_COMMIT` | ループ内COMMITでカーソルが閉じていないか（ハマりどころ4） |
| 5 | エラー処理で CLOSE を呼ぶ経路 | 未OPEN のカーソルを CLOSE していないか（ハマりどころ5） |
| 6 | 更新があった場合、どこまで COMMIT されたか | 再実行の方法（最初から／続きから） |

ステップ実行で確かめたいときは、gdb で `break` を CLOSE の行に置き、`print sqlca.sqlcode` で値を見るのが早いです。手順は「[gdbで「どこで・なぜ落ちたか」を10分で突き止める手順](/articles/c-gdb-debugging)」を参照してください。

## チェックリスト

- [ ] CLOSE を含むすべての SQL のあとで `sqlca.sqlcode` を確認している
- [ ] FETCH の判定で、NOT FOUND（1403 / 100）とエラー（負の値）を分けている
- [ ] エラー処理・後始末の先頭に `EXEC SQL WHENEVER SQLERROR CONTINUE;` を書いている
- [ ] カーソルを開いているかをフラグで持ち、開いているときだけ CLOSE している
- [ ] ログは後始末の SQL より前に出し、SQL名・SQLCODE・メッセージ・FETCH件数を残している
- [ ] 長いメッセージは `sqlglm()` で取得している
- [ ] CLOSE 失敗時の後始末（ROLLBACK か COMMIT か）を設計書に書いている
- [ ] CLOSE 失敗時の戻り値を 0 以外にしている
- [ ] プリコンパイルオプション（`MODE` / `CLOSE_ON_COMMIT`）を Makefile に明記している
- [ ] ループ内で COMMIT するカーソルに `FOR UPDATE` を付けていない
- [ ] 配列 FETCH では、NOT FOUND の回の端数を処理してから抜けている
- [ ] 呼び出し側のシェルで、プログラムの戻り値を `exit` で返している

## まとめ

- **NOT FOUND のあとの CLOSE 失敗は、終了してよい**です。読んだデータは確定していて、リトライしても直りません。
- ただし、**ログを出す → `WHENEVER SQLERROR CONTINUE` → ROLLBACK（または COMMIT）と切断を明示 → 異常の戻り値**の順で終わります。黙って正常終了すると、呼び出し側が障害に気づけません。
- CLOSE が失敗する原因は、**接続断**、**COMMIT で閉じたカーソル**、**未OPEN・無効なカーソル**の3つがほとんどです。CLOSE は「最後に見えた」だけで、本当の原因は FETCH の途中にあることもあるので、件数も確認します。
- COMMIT か ROLLBACK かは処理の仕様で決めます。**迷ったら ROLLBACK** が安全です。
- 後始末は `cleanup()` の1か所に集め、中で失敗しても記録だけにすると、無限ループや二重 CLOSE が起きません。

単体テストでは、「CLOSE の直前で DB 接続を切る」ケースを1つ入れておくと、後始末と戻り値をまとめて確認できます。gdb で CLOSE の行に止めて、別の端末から `ALTER SYSTEM KILL SESSION` でセッションを切れば再現できます（テスト環境で、DBA の許可を取ってから行ってください）。テスト観点の洗い出しは「[PCLテスト観点](/articles/pcl-test-case-viewpoints)」も参考になります。Pro*C のエラー処理としては、インジケーターの記事「[Pro*Cの登録処理でインジケーター（標識変数）を使う理由](/articles/proc-indicator-variable-insert)」もあわせてどうぞ。
