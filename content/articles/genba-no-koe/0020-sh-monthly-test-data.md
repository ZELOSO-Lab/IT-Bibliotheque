---
series: 現場の声
no: 0020
title: 【sh】半年分のテストデータを日付ループで投入するシェルを作った話と、日付計算・0埋め・caseでハマった7つのこと
slug: sh-monthly-test-data
category: シェルスクリプト
tags: [sh, シェルスクリプト, date, printf, case, テストデータ, Linux]
technologies: [sh]
excerpt: 「基準日から半年分、1日ずつテストデータを入れておいて」。shで日付ループのシェルを書いたら、半年前の計算がずれる、月末が1日足りない、08で落ちる、テーブルが切り替わらない…とハマりどころの連続でした。入力チェックから日付計算・12桁の0埋め・caseまで、動く形にまとめました。
status: draft
created: 2026-10-18
---

# 【sh】半年分のテストデータを日付ループで投入するシェルを作った話と、日付計算・0埋め・caseでハマった7つのこと

## 現場の声

> 「性能試験用に、基準日から**半年分のデータを1日ずつ**入れておいてください。1日あたりの件数は指定できるように」
>
> 1件ずつ INSERT するシェル `InsertData.sh` はすでにあったので、それを日付ごとに呼び出す親シェルを sh で書くことにしました。やることは「基準日の半年前の1日から、月末まで1日ずつ回す」を6か月分。簡単だと思っていました。
>
> ところが、**基準日を31日にすると開始月が1か月ずれる**、**各月の末日だけデータがない**、**要素数に 08 を入れると落ちる**、**3か月目以降のデータが全部同じテーブルに入る**…。1つ直すと次が出てくる状態で、思った以上に時間がかかりました。

**結論：shの日付ループは「月の1日を基準に計算する」「比較は `-le`」「数値は先頭の0を外してから計算する」「case には必ず `*)` を書く」の4つを守れば、ほぼ事故りません。**

この記事では、実際に作ったシェルを例に、ハマったポイントと直し方を順番に紹介します。コード例と実行結果は、Linux（dash / GNU date）で実行して確認したものです。

## 前提の構成

| 項目 | 内容 |
| --- | --- |
| シェル | `/bin/sh`（Linux では dash や bash の sh モード） |
| 日付計算 | GNU date（`date -d` が使える環境。Linux 標準） |
| 親シェル | `CreateData.sh <No> <要素数> <基準日YYYYMMDD>` |
| 子シェル | `InsertData.sh <No> <要素数> <対象日> <テーブル名>`（1日分のデータを投入） |

親シェルでやることは次のとおりです。

1. 入力値（No、要素数、基準日）をチェックする
2. システム日付（YYYYMMDD）と時刻（hhmmss）を取得する（ログ用）
3. No をメンバーIDに、要素数を `MAX_NUM` に、基準日を `TARGET_DAY` に入れる
4. 6回ループする（`month_offset` = 0〜5）
   - `FIRST_DAY` = 基準日の半年前の月の1日 ＋ `month_offset` か月
   - `END_DAY` = `FIRST_DAY` の月の末日
   - `month_offset` によって投入先テーブルを切り替える（0 → `TB6`、1 → `TB5` … 5 → `TB1`。古い月ほど番号が大きいテーブル）
   - `FIRST_DAY` から `END_DAY` まで1日ずつ `./InsertData.sh No MAX_NUM 対象日 TABLE_NAME` を呼ぶ

子シェル `InsertData.sh` では、ループカウンタ `i` を**左0埋め12桁**の連番（`000000000001`）にしてデータを作ります。この記事の例では、DB に入れる代わりに INSERT 文を出力しています。

## ハマりどころ1：基準日が31日だと、半年前の計算が1か月ずれる

最初は、基準日からそのまま6か月引いていました。

```sh
FIRST_DAY=$(date -d "$TARGET_DAY -6 month" +%Y%m%d)
```

基準日が `20261031` のときの結果です。

```text
$ date -d "20261031 -6 month" +%Y%m%d
20260501
```

4月になってほしいのに、**5月1日**になりました。2026年10月31日の6か月前は「4月31日」ですが、そんな日はないので、date が翌日の5月1日に繰り上げたためです。同じように `20260831 -6 month` は2月31日 → `20260303` になります。

**対処：日付ではなく「月の1日」から計算します。** 基準日の年月（先頭6桁）に `01` を付けてから月を引けば、存在しない日付は生まれません。

```sh
BASE_MONTH=$(echo "$TARGET_DAY" | cut -c1-6)01      # 20261031 → 20261001
FIRST_DAY=$(date -d "$BASE_MONTH -6 month +$month_offset month" +%Y%m%d)
```

`month_offset` を0〜5で回すと、`20260401`、`20260501`…`20260901` の6か月分になります。

## ハマりどころ2：月末日は「翌月1日の前日」で出す

月末日を「30日」「31日」で決め打ちすると、2月やうるう年で必ず事故ります。**`FIRST_DAY` に1か月足して1日引く**のが確実です。

```sh
END_DAY=$(date -d "$FIRST_DAY +1 month -1 day" +%Y%m%d)
```

```text
$ date -d "20260401 +1 month -1 day" +%Y%m%d
20260430
$ date -d "20280201 +1 month -1 day" +%Y%m%d
20280229
```

`FIRST_DAY` は必ず1日なので、ハマりどころ1のような繰り上げは起きません。

## ハマりどころ3：`[ $DAY < $END_DAY ]` は比較ではなくリダイレクト

日付のループ条件を、ほかの言語の感覚で書いてしまいました。

```sh
while [ $DAY < $END_DAY ]; do     # ✕
```

```text
sh: 1: cannot open 20260430: No such file
```

`[ ]` の中でも `<` は**リダイレクト**として解釈され、「20260430 というファイルから読み込む」という意味になります。`>` にすると、**その名前の空ファイルが作られてしまいます**。

**対処：数値の比較は `-lt` `-le` `-gt` `-ge` `-eq` `-ne` を使います。** YYYYMMDD は数値として大小比較できるので、そのまま使えます。

| やりたいこと | 書き方 |
| --- | --- |
| a < b | `[ "$a" -lt "$b" ]` |
| a <= b | `[ "$a" -le "$b" ]` |
| a > b | `[ "$a" -gt "$b" ]` |
| a >= b | `[ "$a" -ge "$b" ]` |
| a = b（数値） | `[ "$a" -eq "$b" ]` |
| a = b（文字列） | `[ "$a" = "$b" ]` |

## ハマりどころ4：`-lt` にしたら、月末日だけデータがない

メモには「ループ（FIRST_DAY < END_DAY）」と書いていたので、そのまま `-lt` にしました。

```sh
DAY=20260401
END_DAY=20260430
n=0
while [ "$DAY" -lt "$END_DAY" ]; do
  n=$((n + 1))
  DAY=$(date -d "$DAY +1 day" +%Y%m%d)
done
echo "$n 日分"
```

```text
29 日分
```

4月は30日あるのに29日分。**`END_DAY` そのものがループに入っていません。** テストでは「月末締め」の処理だけデータがなく、後から気づきました。

**対処：末日を含めるときは `-le`（以下）にします。**

```sh
while [ "$DAY" -le "$END_DAY" ]; do
```

「〜まで」の条件は、設計メモの段階で**末日を含むのか**をはっきり書いておくと、こうした取りこぼしを防げます。

## ハマりどころ5：`08` `09` で落ちる（先頭0は8進数扱い）

要素数に `008` と入力したら、計算のところで落ちました。日付から日の部分を切り出して計算したときも同じです。

```text
$ DD=$(echo 20260409 | cut -c7-8); echo $((DD + 1))
sh: 1: Illegal number: 09

$ printf "%012d\n" 08
sh: 1: printf: 08: not completely converted
000000000000
```

shの算術式や `printf` は、**先頭が0の数字を8進数**として扱います。8進数に8と9はないので、`08` `09` はエラーになります（bash では `value too great for base` というメッセージになります）。`printf` のほうは警告を出しつつ **0 を出力して先に進んでしまう**ので、気づかないまま不正なデータが入る危険があります。

**対処：入力を受け取ったら、先頭の0を外してから使います。** `expr` で0を足すと、10進数として読み直されます。

```sh
MAX_NUM=$(expr "$2" + 0)    # 008 → 8
```

```text
$ expr 08 + 0
8
```

日付の加減算は、自分で日・月を切り出して計算せず、**`date -d` に任せる**のが安全です。

## ハマりどころ6：12桁の0埋めは `printf "%012d"`。ただし桁あふれは切られない

子シェルでは、ループカウンタ `i` を12桁の0埋めにしてキーを作ります。

```sh
SEQ=$(printf "%012d" "$i")    # 1 → 000000000001
```

ここで注意したいのは、**12桁を超える数値は切り捨てられず、そのまま13桁で出力される**ことです。

```text
$ X=$(printf "%012d" 1234567890123); echo "$X ${#X}"
1234567890123 13
```

DB の項目が `CHAR(12)` なら、INSERT の時点でエラーになるか、環境によっては切り捨てられます。**要素数の上限は入力チェックで止めておきます。**

```sh
if [ "$MAX_NUM" -lt 1 ] || [ "$MAX_NUM" -gt 999999999999 ]; then
  echo "要素数は 1〜999999999999 で入力してください: $2" >&2
  exit 1
fi
```

## ハマりどころ7：case に `*)` がなく、前のループのテーブル名が残る

`month_offset` によって投入先のテーブル（TB6〜TB1）を切り替える case を、最初は動作確認のつもりで2件だけ書き、残りを後回しにしていました。

```sh
for month_offset in 0 1 2 3 4 5; do
  case "$month_offset" in
    0) TABLE_NAME=TB6 ;;
    1) TABLE_NAME=TB5 ;;
  esac
  echo "$month_offset -> $TABLE_NAME"
done
```

```text
0 -> TB6
1 -> TB5
2 -> TB5
3 -> TB5
4 -> TB5
5 -> TB5
```

case の値が0と1以外のとき、どの分岐にも入らず、**変数には前のループの値（TB5）が残ったまま**になります。エラーにならないので、残りの分岐を書き忘れたまま実行し、3か月目以降のデータがすべて TB5 に入っていました。

**対処は3つです。**

1. ループの先頭で変数を空にする（`TABLE_NAME=''`）
2. ループで回す値（0〜5）のすべてに分岐を書く
3. case には必ず `*)` を書き、想定外の値ならエラーで止める

```sh
TABLE_NAME=''
case "$month_offset" in
  0) TABLE_NAME=TB6 ;;
  1) TABLE_NAME=TB5 ;;
  2) TABLE_NAME=TB4 ;;
  3) TABLE_NAME=TB3 ;;
  4) TABLE_NAME=TB2 ;;
  5) TABLE_NAME=TB1 ;;
  *) echo "想定外の month_offset です: $month_offset" >&2; exit 1 ;;
esac
```

また、case は**文字列のパターン一致**です。値が `00` のように0埋めされていると `0)` には一致しません。数値として扱いたい値は、ハマりどころ5と同じく先頭の0を外してから渡します。

## 完成したシェル

### 子シェル（InsertData.sh）

```sh
#!/bin/sh
# 使い方: ./InsertData.sh <No> <要素数> <対象日YYYYMMDD> <テーブル名>
NO=$1
MAX_NUM=$2
TARGET_DAY=$3
TABLE_NAME=$4

i=1
while [ "$i" -le "$MAX_NUM" ]; do
  SEQ=$(printf "%012d" "$i")
  echo "INSERT INTO ${TABLE_NAME} (MEMBER_ID, SEQ_NO, TARGET_DAY) VALUES ('${NO}', '${SEQ}', '${TARGET_DAY}');"
  i=$((i + 1))
done
```

### 親シェル（CreateData.sh）

```sh
#!/bin/sh
# 使い方: ./CreateData.sh <No> <要素数> <基準日YYYYMMDD>
# 基準日の6か月前の月から6か月分、1日ずつ InsertData.sh を呼び出す

# ---- 入力値チェック ----
if [ $# -ne 3 ]; then
  echo "使い方: $0 <No> <要素数> <基準日YYYYMMDD>" >&2
  exit 1
fi

for v in "$1" "$2" "$3"; do
  case "$v" in
    '' | *[!0-9]*) echo "数字で入力してください: '$v'" >&2; exit 1 ;;
  esac
done

MEMBER_ID=$1                       # No はメンバーIDとして使う
MAX_NUM=$(expr "$2" + 0)           # 先頭の0を外す（008 → 8）
TARGET_DAY=$3

if [ "$MAX_NUM" -lt 1 ] || [ "$MAX_NUM" -gt 999999999999 ]; then
  echo "要素数は 1〜999999999999 で入力してください: $2" >&2
  exit 1
fi

if [ ${#TARGET_DAY} -ne 8 ] || [ "$(date -d "$TARGET_DAY" +%Y%m%d 2>/dev/null)" != "$TARGET_DAY" ]; then
  echo "基準日が正しい日付ではありません: $TARGET_DAY" >&2
  exit 1
fi

# ---- システム日付・時刻（ログ用）----
SYS_DATE=$(date +%Y%m%d)
SYS_TIME=$(date +%H%M%S)
echo "開始: ${SYS_DATE} ${SYS_TIME} No=${MEMBER_ID} 要素数=${MAX_NUM} 基準日=${TARGET_DAY}" >&2

# ---- 6か月分のループ ----
BASE_MONTH=$(echo "$TARGET_DAY" | cut -c1-6)01           # 基準日の月の1日
for month_offset in 0 1 2 3 4 5; do
  FIRST_DAY=$(date -d "$BASE_MONTH -6 month +$month_offset month" +%Y%m%d)
  END_DAY=$(date -d "$FIRST_DAY +1 month -1 day" +%Y%m%d)

  TABLE_NAME=''
  case "$month_offset" in
    0) TABLE_NAME=TB6 ;;
    1) TABLE_NAME=TB5 ;;
    2) TABLE_NAME=TB4 ;;
    3) TABLE_NAME=TB3 ;;
    4) TABLE_NAME=TB2 ;;
    5) TABLE_NAME=TB1 ;;
    *) echo "想定外の month_offset です: $month_offset" >&2; exit 1 ;;
  esac

  DAY=$FIRST_DAY
  while [ "$DAY" -le "$END_DAY" ]; do
    ./InsertData.sh "$MEMBER_ID" "$MAX_NUM" "$DAY" "$TABLE_NAME" || exit 1
    DAY=$(date -d "$DAY +1 day" +%Y%m%d)
  done
done
echo "終了: $(date +%Y%m%d) $(date +%H%M%S)" >&2
```

ポイントは次のとおりです。

- 基準日は「8桁」かつ「`date -d` で読み直して同じ値になる」ことで、`20260230` のような存在しない日付をはじきます
- 子シェルが失敗したら `|| exit 1` で止めます。続行すると、どこまで入ったかわからなくなります
- ログは `>&2`（標準エラー）に出し、標準出力のデータと混ざらないようにします

### 実行結果

```text
$ ./CreateData.sh 1001 2 20261031 > out.sql
開始: 20261018 142153 No=1001 要素数=2 基準日=20261031
終了: 20261018 142154

$ head -3 out.sql
INSERT INTO TB6 (MEMBER_ID, SEQ_NO, TARGET_DAY) VALUES ('1001', '000000000001', '20260401');
INSERT INTO TB6 (MEMBER_ID, SEQ_NO, TARGET_DAY) VALUES ('1001', '000000000002', '20260401');
INSERT INTO TB6 (MEMBER_ID, SEQ_NO, TARGET_DAY) VALUES ('1001', '000000000001', '20260402');

$ wc -l out.sql
366 out.sql
```

4月〜9月の183日 × 要素数2 = 366件。月ごとの件数と投入先は次のとおりで、末日の取りこぼしもありません。

| 月 | 日数 | 件数 | テーブル |
| --- | --- | --- | --- |
| 2026/04 | 30 | 60 | TB6 |
| 2026/05 | 31 | 62 | TB5 |
| 2026/06 | 30 | 60 | TB4 |
| 2026/07 | 31 | 62 | TB3 |
| 2026/08 | 31 | 62 | TB2 |
| 2026/09 | 30 | 60 | TB1 |

入力エラーの例です。

```text
$ ./CreateData.sh 1001 2 20260230
基準日が正しい日付ではありません: 20260230
$ ./CreateData.sh 1001 0x 20261018
数字で入力してください: '0x'
```

> **補足：`date -d` は GNU date の機能です。** Linux では標準で使えますが、macOS（BSD date）や AIX・Solaris などの商用UNIXでは使えません。その環境では `date -j -f`（macOS）を使うか、日付計算だけ Perl や awk に任せる方法を検討します。

## チェックリスト

- [ ] 「N か月前」の計算は、基準日ではなく**月の1日**から行っている
- [ ] 月末日は `date -d "$FIRST_DAY +1 month -1 day"` で出している
- [ ] 数値の比較に `<` `>` ではなく `-lt` `-le` などを使っている
- [ ] 「〜まで」のループで、末日を含めるなら `-le` にしている
- [ ] 入力値や切り出した日付は、先頭の0を外してから計算している（`expr "$x" + 0`）
- [ ] 0埋めの桁数を超える値を、入力チェックで止めている
- [ ] case に `*)` を書き、ループ内で使う変数は毎回初期化している
- [ ] 子シェルの失敗で止まるようにしている（`|| exit 1`）

## まとめ

- shの日付ループは、**月の1日を基準に `date -d` で計算する**と、存在しない日付や月末のずれが起きません。
- `[ ]` の中の `<` はリダイレクトです。数値の比較は `-lt` `-le`、末日を含めるなら `-le`。
- 先頭が0の数字は8進数扱いで、`08` `09` が落ちます。`printf "%012d"` は0埋めできても、桁あふれは止めてくれません。
- case は `*)` で想定外を止め、ループ内の変数は毎回初期化します。

テストデータ投入のシェルは「一度動けば終わり」になりがちですが、日付や件数を変えて何度も使うものです。入力チェックと止まる仕組みを最初に入れておくと、後で自分が助かります。
