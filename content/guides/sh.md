---
title: sh 技術まとめ
slug: sh
excerpt: POSIX sh（シェルスクリプト）の基本ルール、実行環境とShellCheckの準備、変数・展開・条件・ループ・日付計算のよく使う構文、引数チェック付きバックアップやcron用ジョブのサンプル、dash / bash の実際のエラーメッセージと対処、現場で事故を防ぐTipsまでを1ページにまとめました。
updated: 2026-10-19
---

# sh 技術まとめ

## 基礎

sh は UNIX / Linux 標準のシェルです。コマンドを並べたテキストファイル（シェルスクリプト）を書けば、バッチ処理・テストデータ投入・ログ整理・定期実行（cron）などを自動化できます。**`#!/bin/sh` で書くなら、bash の便利機能は使えない前提で POSIX の範囲に収める**のが最大のポイントです。

### sh・bash・dash の関係

| 名前 | 中身 | 現場での注意点 |
| --- | --- | --- |
| POSIX sh | 規格（POSIX で決められたシェルの仕様） | どの UNIX でも動くスクリプトの「共通語」 |
| dash | Debian / Ubuntu の `/bin/sh` の実体 | 軽量で高速。配列・`[[ ]]`・`${var:0:3}` などは使えない |
| bash | 多くのディストリビューションのログインシェル | RHEL 系では `/bin/sh` が bash（sh モード）なので、bash 専用の書き方でも動いてしまう |
| ksh | AIX などの商用 UNIX で使われる | 古い環境では `date -d` などの GNU 拡張がない |

「RHEL では動いたのに Ubuntu で落ちた」は、ほぼこの違いが原因です。自分の環境の `/bin/sh` が何かは `ls -l /bin/sh` で確認できます。

### まず押さえる用語

| 用語 | 意味 | 例 |
| --- | --- | --- |
| シバン（shebang） | 1行目に書く、実行するシェルの指定 | `#!/bin/sh` |
| 位置パラメータ | スクリプトに渡された引数 | `$1` `$2` … `$#`（個数）`"$@"`（全部） |
| 終了ステータス | コマンドの結果。0 が成功、0 以外が失敗 | `echo $?` |
| 標準出力 / 標準エラー | 通常の出力（1番）とエラー出力（2番） | `>&2` でエラー側へ出す |
| コマンド置換 | コマンドの出力を値として使う | `TODAY=$(date +%Y%m%d)` |
| パラメータ展開 | 変数の加工・既定値の指定 | `${FILE%.*}` `${1:-default}` |
| クォート | 空白や `*` を展開させないための囲み | `"$var"`（展開する）`'$var'`（展開しない） |

### 実行方法の違い

| 書き方 | 動き | 使いどころ |
| --- | --- | --- |
| `sh script.sh` | sh で実行（シバンと実行権限は無視される） | 実行権限がないファイルを試すとき |
| `./script.sh` | シバンのシェルで実行。実行権限が必要 | 通常の実行・cron |
| `. ./script.sh` | 今のシェルで読み込む（変数が残る） | 環境変数の設定ファイルを読むとき |

## 環境構築

### 1. 動作環境を確認する

```sh
ls -l /bin/sh          # Ubuntu: /bin/sh -> dash
command -v bash dash   # インストールされているシェル
date --version         # GNU date かどうか（BSD/macOS ではエラーになる）
```

Windows では WSL（Ubuntu など）を使うのが確実です。Git Bash でも動きますが、`/bin/sh` の実体やコマンドの挙動が Linux 本番と異なる場合があります。

### 2. ShellCheck を入れる

ShellCheck は、クォート漏れや bash 専用構文を指摘してくれる静的解析ツールです。**sh を書くなら最初に入れておく**ことをおすすめします。

```sh
sudo apt install shellcheck     # Ubuntu / Debian
sudo dnf install ShellCheck     # RHEL 系（EPEL が必要な場合あり）
brew install shellcheck         # macOS

shellcheck script.sh            # シバンを見て sh / bash を判定する
shellcheck -s sh script.sh      # POSIX sh としてチェック
```

```text
In sc.sh line 3:
rm $f
   ^-- SC2086 (info): Double quote to prevent globbing and word splitting.
```

VS Code では拡張機能「ShellCheck」を入れると、保存時に同じ指摘が出ます。

### 3. エディタの設定（改行コードと文字コード）

- 改行コードは **LF**。CRLF のまま Linux に置くと動きません（エラー対応を参照）
- 文字コードは **UTF-8**（BOM なし）
- Git を使う場合は `.gitattributes` に `*.sh text eol=lf` を書いておくと、Windows で編集しても LF に揃います

### 4. 最初のスクリプトを動かす

```sh
cat > hello.sh <<'EOF'
#!/bin/sh
echo "こんにちは、$1 さん"
EOF
chmod +x hello.sh
./hello.sh 山田
sh -n hello.sh   # 構文チェックだけ（実行しない）
sh -x hello.sh 山田   # 実行したコマンドを + 付きで表示（デバッグ）
```

## コマンド

### 変数・引数

```sh
MAX_NUM=10                      # = の前後に空白を入れない
TODAY=$(date +%Y%m%d)           # 20261019
NOW=$(date +%H%M%S)             # 141002
echo "引数の数: $#  1つ目: $1"
: "${1:?No を指定してください}"    # 未指定ならメッセージを出して終了
for a in "$@"; do echo "<$a>"; done   # 空白を含む引数もそのまま扱う
```

### パラメータ展開

| 操作 | 書き方 | 結果（`v=report.csv.bak` / `p=/var/log/app/x.log`） |
| --- | --- | --- |
| 後ろから最短一致を削除 | `${v%.*}` | `report.csv` |
| 後ろから最長一致を削除 | `${v%%.*}` | `report` |
| 前から最短一致を削除 | `${v#*.}` | `csv.bak` |
| 前から最長一致を削除（拡張子） | `${v##*.}` | `bak` |
| ファイル名だけ | `${p##*/}` | `x.log` |
| ディレクトリだけ | `${p%/*}` | `/var/log/app` |
| 文字数 | `${#p}` | `18` |
| 未設定・空なら既定値 | `${U:-def}` | `def`（U は変わらない） |
| 未設定・空なら代入 | `${U:=def}` | `def`（U に代入される） |
| 未設定・空ならエラー終了 | `${U:?メッセージ}` | メッセージを出して終了 |

### 条件・入力チェック

| 操作 | コマンド・構文 |
| --- | --- |
| 数値比較 | `[ "$a" -eq 1 ]`  `-ne` `-lt` `-le` `-gt` `-ge` |
| 文字列比較 / 空文字 | `[ "$s" = "x" ]`  `[ -z "$s" ]`  `[ -n "$s" ]` |
| 数字だけかチェック | `case "$1" in ''\|*[!0-9]*) exit 1;; esac` |
| ファイル・ディレクトリの存在 | `[ -f file ]`  `[ -d dir ]`  `[ -e path ]` |
| かつ / または | `[ "$a" -ge 1 ] && [ "$a" -le 9 ]`  `[ ... ] \|\| [ ... ]` |
| 否定 | `[ ! -d "$DIR" ]` |

```sh
case "$1" in
  '' | *[!0-9]*) echo "数字で入力してください" >&2; exit 1 ;;
esac

case "$FILE" in
  *.csv) echo "CSV" ;;
  *.tsv) echo "TSV" ;;
  *)     echo "対象外: $FILE" >&2; exit 1 ;;
esac
```

`[ ]` の中では `<` `>` は**リダイレクト**、`==` は POSIX にはありません。数値は `-lt` など、文字列は `=` を使います。

### ループ・終了コード

| 操作 | コマンド・構文 |
| --- | --- |
| 回数指定 | `i=1; while [ "$i" -le 6 ]; do …; i=$((i+1)); done` |
| 一覧を順に処理 | `for f in *.csv; do [ -e "$f" ] \|\| continue; echo "$f"; done` |
| ファイルを1行ずつ | `while IFS= read -r line; do …; done < file.txt` |
| 直前の終了コード | `echo $?`（0 は成功） |
| 失敗したら止める | `./InsertData.sh "$NO" \|\| exit 1` |
| エラーで即終了・未定義変数をエラーに | `set -eu` |

`for f in *.csv` は、一致するファイルがないと `*.csv` という文字列のまま1回まわります。`[ -e "$f" ] || continue` で防ぎます。

### 入出力・リダイレクト

```sh
cmd > out.txt          # 標準出力を上書き
cmd >> out.txt         # 追記
cmd 2> err.txt         # 標準エラーだけ
cmd > all.log 2>&1     # 両方を同じファイルへ（順番が大事）
cmd > /dev/null 2>&1   # 出力を捨てる
echo "エラー" >&2      # 標準エラーに出す

cat <<EOF              # ヒアドキュメント（変数を展開する）
今日は $(date +%Y) 年
EOF
cat <<'EOF'            # 'EOF' にすると展開しない
$HOME はそのまま出る
EOF
```

`echo -e` や `echo -n` は sh によって動きが違います（dash では `-e` がそのまま出力されます）。**書式付きの出力は `printf` を使う**のが確実です。

### 日付計算（GNU date）

| 操作 | コマンド・構文 |
| --- | --- |
| システム日付 / 時刻 | `date +%Y%m%d` / `date +%H%M%S` |
| ログ用の日時 | `date '+%Y-%m-%d %H:%M:%S'` |
| 翌日 | `date -d "$DAY +1 day" +%Y%m%d` |
| 6か月前の1日 | `date -d "${YM}01 -6 month" +%Y%m%d` |
| 月末日 | `date -d "$FIRST +1 month -1 day" +%Y%m%d` |
| 日付として正しいか | `[ "$(date -d "$D" +%Y%m%d 2>/dev/null)" = "$D" ]` |

```sh
FIRST_DAY=$(date -d "$(echo "$TARGET_DAY" | cut -c1-6)01 -6 month" +%Y%m%d)
END_DAY=$(date -d "$FIRST_DAY +1 month -1 day" +%Y%m%d)
```

**「N か月前」は基準日ではなく月の1日から計算**します。`date -d "20261031 -6 month"` は存在しない「4月31日」を繰り上げて `20260501` を返すためです。`date -d` は GNU date の機能で、macOS では `date -v-1d +%Y%m%d` のように書き方が変わります。

### 数値・0埋め

```sh
echo $((7 / 2)) $((7 % 2))    # 3 1（整数のみ）
SEQ=$(printf '%012d' "$i")    # 1 → 000000000001
N=$(expr "$2" + 0)            # 008 → 8（先頭の0を外す）
```

先頭が0の値（`08` `09`）は算術式で8進数扱いになり落ちます。日付ループ・0埋め・case の詳しいハマりどころは、関連記事「半年分のテストデータを日付ループで投入するシェル」にまとめています。

## サンプル

### 引数チェック付きバックアップ（getopts・dry-run・世代削除）

```sh
#!/bin/sh
# 使い方: ./backup.sh [-n] [-d 保持日数] <対象ディレクトリ> <保存先>
set -eu

usage() {
  echo "使い方: $0 [-n] [-d 保持日数] <対象ディレクトリ> <保存先>" >&2
  exit 1
}

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >&2
}

DRY_RUN=0
KEEP_DAYS=7
while getopts nd: opt; do
  case "$opt" in
    n) DRY_RUN=1 ;;
    d) KEEP_DAYS=$OPTARG ;;
    *) usage ;;
  esac
done
shift $((OPTIND - 1))
[ $# -eq 2 ] || usage

SRC=$1
DEST=$2
case "$KEEP_DAYS" in
  '' | *[!0-9]*) echo "保持日数は数字で指定してください: $KEEP_DAYS" >&2; exit 1 ;;
esac
[ -d "$SRC" ] || { echo "ディレクトリがありません: $SRC" >&2; exit 1; }

NAME=$(basename "$SRC")
ARCHIVE="$DEST/${NAME}_$(date +%Y%m%d_%H%M%S).tar.gz"

if [ "$DRY_RUN" -eq 1 ]; then
  log "[dry-run] 作成予定: $ARCHIVE"
  [ -d "$DEST" ] && find "$DEST" -name "${NAME}_*.tar.gz" -type f -mtime +"$KEEP_DAYS" -print
  exit 0
fi

mkdir -p "$DEST"
tar czf "$ARCHIVE" -C "$(dirname "$SRC")" "$NAME"
log "作成: $ARCHIVE"

# 保持日数より古いバックアップを削除
find "$DEST" -name "${NAME}_*.tar.gz" -type f -mtime +"$KEEP_DAYS" -print -exec rm -f {} \;
log "完了"
```

```text
$ ./backup.sh -n data bk
2026-10-19 04:02:55 [dry-run] 作成予定: bk/data_20261019_040255.tar.gz
$ ./backup.sh -d x data bk
保持日数は数字で指定してください: x
```

削除を伴う処理は `-n`（dry-run）で**消える対象を先に表示**できるようにしておくと、本番で安心して実行できます。

### CSV を1行ずつ処理する

```sh
#!/bin/sh
# users.csv（id,name,dept）を1行ずつ処理する（1行目のヘッダーは飛ばす）
tail -n +2 users.csv | while IFS=, read -r id name dept || [ -n "$id" ]; do
  printf '%05d %s (%s)\n' "$id" "$name" "$dept"
done
```

```text
00001 山田 (営業)
00023 佐藤 (開発)
```

- `IFS=,` で区切り文字をカンマにし、`read -r` でバックスラッシュをそのまま読む
- `|| [ -n "$id" ]` は、**最終行に改行がない CSV** でも最後の行を取りこぼさないための書き方
- 値にカンマや改行を含む本格的な CSV は、sh ではなく awk や Python で処理する

### cron から呼ぶジョブの骨組み（二重起動防止・後始末）

```sh
#!/bin/sh
# cron から呼ぶ日次ジョブの骨組み（二重起動防止・一時ファイルの後始末つき）
set -eu
PATH=/usr/local/bin:/usr/bin:/bin
cd "$(dirname "$0")"

LOCK_DIR=/tmp/daily_job.lock
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "前回の処理が実行中のためスキップします" >&2
  exit 0
fi

TMP_FILE=$(mktemp)
trap 'rm -f "$TMP_FILE"; rmdir "$LOCK_DIR"' EXIT
trap 'exit 1' INT TERM HUP

echo "処理開始: $(date '+%Y-%m-%d %H:%M:%S')"
# ここに本処理を書く（例: 結果を一時ファイルに書いてから置き換える）
echo "result" > "$TMP_FILE"
mv "$TMP_FILE" ./result.txt
echo "処理終了: $(date '+%Y-%m-%d %H:%M:%S')"
```

```text
# crontab -e（毎日 2:00 に実行し、出力をログに追記）
0 2 * * * /opt/batch/daily_job.sh >> /var/log/daily_job.log 2>&1
```

- `mkdir` は「作成」と「存在チェック」が同時に行われるので、ロックに使える
- `trap ... EXIT` で、正常終了でもエラー終了でもロックと一時ファイルを消す
- 結果は一時ファイルに書いてから `mv` で置き換えると、途中で落ちても中途半端なファイルが残らない

## エラー対応

エラーメッセージの先頭は、`sh -c` なら `sh: 1:`、ファイル実行なら `./script.sh: 12:`（12 は行番号）のように付きます。下表は dash（Ubuntu の `/bin/sh`）と bash の実際の表示です。

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `[: =: unexpected operator`（dash）/ `[: =: unary operator expected`（bash） | `[ $a = x ]` で変数が空になり、`[ = x ]` になった | 変数を必ず `"$a"` とクォートする |
| `[: x: unexpected operator`（dash） | `[ "$a" == x ]` の `==` は bash 拡張 | `=` に直す |
| `[[: not found` | `[[ ]]` は bash 拡張 | `[ ]` に直すか、シバンを `#!/bin/bash` にする |
| `Syntax error: "(" unexpected` | 配列 `arr=(a b)` など bash 専用構文 | 配列を使わず、空白区切りの文字列や `set --` で代用する |
| `Syntax error: "}" unexpected` | `function f { ... }` は bash 拡張 | `f() { ... }` に直す |
| `Bad substitution` | `${v:0:2}` などの部分文字列は bash 拡張 | `cut -c1-2` や `${v%...}` で代用する |
| `Illegal number: 09`（dash）/ `09: value too great for base`（bash） | 先頭0付きの数値が8進数として扱われた | `expr "$x" + 0` などで先頭の0を外す |
| `printf: 08: not completely converted` | `printf '%d'` に先頭0付きの値を渡した（0 が出力されて処理は続く） | 先頭の0を外してから渡す |
| `X: parameter not set`（dash）/ `X: unbound variable`（bash） | `set -u` 中に未定義の変数を参照した | `${X:-}` で既定値を付けるか、事前に代入する |
| `source: not found` | `source` は bash 拡張 | `. ./file.sh` に直す |
| `local: not in a function` | 関数の外で `local` を使った | 関数の中だけで使う |
| `Syntax error: end of file unexpected (expecting "fi")` | `if` に対応する `fi`（`done` `esac` も同様）がない | 対応を確認。`sh -n` で事前に構文チェックする |
| `cannot open nofile: No such file` | 入力リダイレクト先がない。`[ $a < $b ]` の `<` がリダイレクトになった場合も | ファイルパスを確認。比較は `-lt` を使う |
| `xxx: not found`（dash）/ `command not found`（bash） | コマンドがない・PATH にない。`x = 1` のように `=` の前後に空白を入れた | `command -v xxx` で確認。代入は `x=1` |
| `Permission denied` | 実行権限がない | `chmod +x script.sh`、または `sh script.sh` で実行 |
| `/bin/sh^M: bad interpreter: No such file or directory` / `cannot execute: required file not found` | 改行コードが CRLF（シバン行の末尾に `\r` が付いている） | `sed -i 's/\r$//' script.sh` などで LF に変換する |
| `$'\r': command not found` / `cd: can't cd to /tmp` | 同じく CRLF。行末の `\r` がコマンドやパスの一部になっている | `file script.sh` で `with CRLF line terminators` と出たら LF に変換 |
| `date: invalid date '20260230'` | 存在しない日付、または BSD date に GNU のオプションを渡した | 入力チェックで止める。macOS は `date -v` / `date -j -f` を使う |
| `Illegal option -z`（dash の getopts） | 定義していないオプションが渡された | `*)` で使い方を表示して終了する |

### 手動では動くのに cron だと動かない

1. **PATH が違う**: cron の PATH は最小限です。スクリプト内で `PATH=` を設定するか、コマンドを絶対パスで書く
2. **カレントディレクトリが違う**: cron はホームディレクトリで実行します。`cd "$(dirname "$0")"` で移動する
3. **環境変数がない**: `.bashrc` や `.profile` は読まれません。必要な変数はスクリプト内で設定する
4. **`%` が改行扱いされる**: crontab の行の中では `%` は特別な意味を持つため、`date +\%Y\%m\%d` のようにエスケープする
5. **出力が見えない**: `>> /var/log/xxx.log 2>&1` を付けてログを残す

## 実務Tips

### 書き方の基本

- **変数は必ずダブルクォートで囲む**（`"$var"`）。空白入りのファイル名や空文字で事故が起きなくなる
- `rm -rf "$DIR/"` のように変数を使った削除は、変数が空だと `/` を消しかねない。**`"${DIR:?}"` で空ならエラー終了**させる
- シバンと中身を一致させる。bash の機能（配列・`[[ ]]`）を使うなら、迷わず `#!/bin/bash` にする
- ログやメッセージは `>&2` で標準エラーへ。標準出力はデータ専用にすると、パイプやリダイレクトで混ざらない
- 子シェルやコマンドの失敗は `|| exit 1` で止める。続行すると「どこまで処理したかわからない」状態になる

### `set -eu` の使いどころと落とし穴

- `set -e` は便利ですが、`if` の条件・`&&` `||` の左側・パイプの途中のコマンドが失敗しても止まりません
- `set -e` 下で `grep` が0件（終了コード1）だと、そこでスクリプトが終了します。0件がありうるなら `grep ... || true` とする
- `set -u` は打ち間違いの変数を見つけられるので、新規スクリプトでは付けておく

### パイプと変数

`cmd | while read ...; do n=$((n+1)); done` のように**パイプの右側で変更した変数は、ループの外に残りません**（サブシェルで実行されるため）。件数を数えたいときは、ファイルからリダイレクトで読む（`done < file`）か、ループの中で出力まで済ませます。

### 移植性

- `date -d`・`sed -i`・`grep -P` は GNU 拡張。商用 UNIX や macOS でも動かすなら、使う前に確認する
- `echo -e` / `echo -n` の代わりに `printf` を使う
- `ls` の出力をループで回さない。`for f in ./*.log` のようにグロブを使う
- `which` より `command -v` を使う（POSIX で定義されている）

### 運用

- 本番に置く前に `shellcheck` と `sh -n` を通す
- 削除・更新を伴うスクリプトには dry-run オプションを付ける
- cron 実行のものは二重起動防止とログ出力をセットにする
- 一時ファイルは `mktemp` で作り、`trap ... EXIT` で必ず消す
- 引数の意味・使い方をスクリプト先頭のコメントと `usage` に書く。半年後の自分が読む

## 関連リンク

- [POSIX Shell Command Language（The Open Group）](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)
- [POSIX ユーティリティ一覧（The Open Group）](https://pubs.opengroup.org/onlinepubs/9799919799/)
- [ShellCheck](https://www.shellcheck.net/)
- [GNU Bash マニュアル](https://www.gnu.org/software/bash/manual/)
- [GNU coreutils マニュアル（date など）](https://www.gnu.org/software/coreutils/manual/)
