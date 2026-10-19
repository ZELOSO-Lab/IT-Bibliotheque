---
title: sh 技術まとめ
slug: sh
excerpt: sh（シェルスクリプト）の変数、引数、条件分岐、ループ、日付計算、終了コードなどの技術情報をまとめています。
updated: 2026-10-19
---

# sh 技術まとめ

## 基礎

UNIX / Linux標準のシェル。バッチ処理やデータ投入の自動化に使うシェルスクリプト。

### 主な用途

- バッチ処理の自動化
- テストデータの投入
- ログ・ファイルの整理
- 定期実行（cron）

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[sh 公式ドキュメント](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)を参照してください。

## コマンド

### システム日付・時刻

```
TODAY=$(date +%Y%m%d)   # 20261018
NOW=$(date +%H%M%S)     # 141002
```

### 半年前の1日と月末（GNU date）

```
FIRST_DAY=$(date -d "$(echo $TARGET_DAY | cut -c1-6)01 -6 month" +%Y%m%d)
END_DAY=$(date -d "$FIRST_DAY +1 month -1 day" +%Y%m%d)
```

### 数字チェック

```
case "$1" in
  '' | *[!0-9]*) echo "数字で入力してください" >&2; exit 1 ;;
esac
```

### 回数指定のループと終了コード

```
i=1
while [ "$i" -le 6 ]; do
  ./InsertData.sh "$NO" "$MAX_NUM" || exit 1
  i=$((i + 1))
done
```

### 早見表：変数・引数

| 操作 | コマンド・構文 |
| --- | --- |
| 代入（= の前後に空白なし） | `MAX_NUM=10` |
| 引数 / 引数の数 | `$1 $2 … / $#` |
| コマンドの結果を代入 | `TODAY=$(date +%Y%m%d)` |
| 未指定ならエラー終了 | `: "${1:?No を指定してください}"` |

### 早見表：条件・入力チェック

| 操作 | コマンド・構文 |
| --- | --- |
| 数値比較 | `[ "$a" -eq 1 ]  -ne -lt -le -gt -ge` |
| 文字列比較 / 空文字 | `[ "$s" = "x" ]  [ -z "$s" ]` |
| 数字だけかチェック | `case "$1" in ''\|*[!0-9]*) exit 1;; esac` |
| ファイルの存在 | `[ -f file ]  [ -d dir ]` |

### 早見表：ループ・終了コード

| 操作 | コマンド・構文 |
| --- | --- |
| 回数指定 | `i=1; while [ $i -le 6 ]; do …; i=$((i+1)); done` |
| 一覧を順に処理 | `for f in *.csv; do echo "$f"; done` |
| 直前の終了コード | `echo $?   # 0 は成功` |
| 失敗したら止める | `./InsertData.sh "$NO" \|\| exit 1` |

### 早見表：日付（GNU date）

| 操作 | コマンド・構文 |
| --- | --- |
| システム日付 / 時刻 | `date +%Y%m%d / date +%H%M%S` |
| 6か月前の1日 | `date -d "${YM}01 -6 month" +%Y%m%d` |
| 月末日 | `date -d "$FIRST +1 month -1 day" +%Y%m%d` |
| 翌日 | `date -d "$DAY +1 day" +%Y%m%d` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[sh 公式ドキュメント](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[sh 公式ドキュメント](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[sh 公式ドキュメント](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)を参照してください。

## 関連リンク

- [sh 公式ドキュメント](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)
