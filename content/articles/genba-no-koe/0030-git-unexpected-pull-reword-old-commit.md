---
series: 現場の声
no: 0030
title: 【Git】Git Bash で知らぬ間に pull していた？ 原因の見つけ方と、10個以上前の雑なコミットメッセージを直す手順（rebase -i / --rebase-merges / force-with-lease）
slug: git-unexpected-pull-reword-old-commit
category: Git
tags: [Git, Git Bash, git pull, git rebase, reword, force-with-lease, reflog, コミットメッセージ]
technologies: [git]
excerpt: Git Bash で作業していたら、いつの間にか pull してマージコミットができていた。さらに「あ」「修正」と適当に書いたコミットメッセージに修正依頼。10個以上前のメッセージは git rebase -i の reword で直せますが、途中にマージがあると --rebase-merges を付けないと他人のコミットまで書き換わります。知らぬ間の pull の正体と見つけ方、メッセージを安全に直す手順、push 済みのときの force-with-lease とチームへの影響、8つのハマりどころを実行結果付きでまとめました。
status: draft
created: 2026-11-11
---

# 【Git】Git Bash で知らぬ間に pull していた？ 原因の見つけ方と、10個以上前の雑なコミットメッセージを直す手順（rebase -i / --rebase-merges / force-with-lease）

## 現場の声

> Git Bash で作業ブランチにコミットして push しただけのつもりが、`git log` を見ると **`Merge branch 'main' of https://...` というコミット**ができている。**pull した覚えはない**のに、他の人のコミットまで混ざっている。
>
> しかも、急いでいたので途中のコミットメッセージを「あ」「修正」「とりあえず」で済ませていた。レビューで**「コミットメッセージを直してください」**と言われたが、問題のコミットは**10個以上前**。`git commit --amend` は直前のコミットしか直せないし、どうすればいいのか……。

結論を先に書きます。

- **Git Bash が勝手に pull することはありません。** ほとんどは「push を断られて `git pull` した」「pull でエディター（vim）が開き、閉じたらマージが確定した」「VS Code などの同期ボタン」のどれかです。`git reflog` を見れば、いつ pull したかが残っています。
- **10個以上前のメッセージは `git rebase -i` の `reword` で直せます。** ただし途中にマージコミットがある（知らぬ間の pull でできた）場合は、**`--rebase-merges`（`-r`）を必ず付けます**。付けないと、マージが消えて**他人のコミットのハッシュまで変わります**。
- **push 済みなら `git push --force-with-lease --force-if-includes`** で上書きします。`--force` は使いません。書き換えてよいのは**自分の作業ブランチだけ**で、main など共有ブランチに入ったコミットは直しません。

この記事のコマンドは、Git 2.43.0（Ubuntu 24.04）で実際にリポジトリを作って実行し、結果を確認しています。Git for Windows の Git Bash でも同じコマンドで動きます。

## 前提の構成

この記事では、次の状況を例にします。

- 自分（山田）はチケット #120「受注登録の入力チェック」を `feature/120` ブランチで開発している
- 途中で同僚（佐藤）の `#88 帳票出力の改修` が main に入り、それを pull で取り込んだ
- 直したいのは、11コミット前の「**あ**」というメッセージ

```text
$ git log --oneline --graph
* de11923 #120 受注登録の入力チェック10
* 0887f73 #120 受注登録の入力チェック9
* 32a3405 #120 受注登録の入力チェック8
* f360b42 #120 受注登録の入力チェック7
* a1df380 #120 受注登録の入力チェック6
*   77ef433 Merge branch 'main' of https://git.example.co.jp/team/order-system.git
|\
| * 40f7c5d #88 帳票出力の改修          ← 佐藤さんのコミット（main に入っている）
* | 1107db0 あ                           ← これを直したい
* | 863db98 #120 受注登録の入力チェック5
* | dd64715 #120 受注登録の入力チェック4
* | e594685 #120 受注登録の入力チェック3
* | d402d76 #120 受注登録の入力チェック2
* | 0039f1b #120 受注登録の入力チェック1
|/
* b88c4cd 初期コミット
```

`Merge branch 'main' of ...` が「知らぬ間の pull」でできたマージコミットです。まずはこの正体から見ていきます。

## 第1部：「知らぬ間に pull」の正体

### Git Bash は勝手に pull しない

Git Bash はただのシェル（bash）です。プロンプトにブランチ名が出るのは `.git` の中を読んでいるだけで、**fetch も pull もしません**。pull が起きたのなら、どこかで誰か（自分か、ツール）が実行しています。現場で多いのは次の5つです。

| よくある原因 | 何が起きるか | 見分け方 |
| --- | --- | --- |
| push を断られ、ヒントに従って `git pull` した | `hint: ... use 'git pull' before pushing again.` を見て実行。リモートと分岐していればマージコミットができる | `git reflog` に `pull: Merge made by the 'ort' strategy.` |
| `git pull` で vim が開き、よく分からず閉じた | マージコミットのメッセージ入力画面。`:wq` でも `:q` でも**マージが確定**する | 同上。メッセージが `Merge branch 'main' of ...` のまま |
| VS Code の「変更の同期」ボタン・ステータスバーの ⟳ | **pull と push をまとめて実行**する。`git.postCommitCommand` が `sync` だとコミットのたびに同期 | VS Code の「出力」→「Git」に `git pull` の記録 |
| Sourcetree・TortoiseGit などの GUI | 「プル」「同期」ボタン。起動時の自動 fetch と混同しやすい | 各ツールのログ。reflog にも `pull` が残る |
| エイリアス・自作スクリプト | `alias gp='git pull && git push'` など、人からもらった設定 | `alias`、`git config --get-regexp alias` |

いちばん多いのは**1つ目と2つ目の組み合わせ**です。push が `rejected` になり、ヒントどおり `git pull` すると vim が開く。Git Bash に慣れていないと「とりあえず `:wq`」で閉じてしまい、**自分では「エラーが出たので何かした」程度の記憶しか残りません**。

なお、VS Code の `git.autofetch`（自動フェッチ）は **fetch だけ**で、作業ブランチは変わりません。ただし後で説明するとおり、`--force-with-lease` の安全装置を無効にしてしまうので注意が必要です。

### いつ pull したかを調べる

`git reflog` には、HEAD がいつ・どの操作で動いたかが残っています（既定で約90日）。

```text
$ git reflog | grep pull
77ef433 HEAD@{5}: pull: Merge made by the 'ort' strategy.
b88c4cd HEAD@{13}: initial pull
```

`pull: Merge made by ...` があれば、そこで pull によるマージが起きています。`pull: Fast-forward` なら、リモートのコミットを積み増しただけでマージコミットはできていません。

マージコミットだけを一覧するには `--merges` を使います。

```sh
git log --merges --oneline          # マージコミットだけ
git show --stat 77ef433             # そのマージで何が入ったか
git log --oneline 77ef433^1..77ef433^2   # マージで取り込んだ側のコミット
```

### 再発防止：pull を「早送りだけ」にする

知らぬ間にマージコミットができるのを防ぐには、pull を**早送り（fast-forward）できるときだけ成功する**設定にします。

```sh
git config --global pull.ff only
```

この設定で、ローカルとリモートが分岐しているときに `git pull` すると、マージせずに止まります。

```text
$ git pull
hint: Diverging branches can't be fast-forwarded, you need to either:
hint:
hint: 	git merge --no-ff
hint:
hint: or:
hint:
hint: 	git rebase
hint:
fatal: Not possible to fast-forward, aborting.
```

止まったら、**`git fetch` → `git log --oneline --graph --all -20` で状況を見てから**、チームのルールに合わせて `git merge origin/main` か `git rebase origin/main` を自分で選びます。Git for Windows のインストーラーにも「`git pull` の既定の動作」を選ぶ画面があり、「Only ever fast-forward」を選ぶと同じ設定になります。

ついでに、Git Bash で vim が開いて困らないように、エディターを変えておきます。

```sh
git config --global core.editor "code --wait"   # VS Code
# git config --global core.editor notepad       # メモ帳（Git for Windows）
```

## 第2部：10個以上前のコミットメッセージを直す

### まず「直してよいか」を判断する

コミットメッセージを直すと、**そのコミットと、それより後のコミットすべてのハッシュが変わります**（履歴の書き換え）。誰がそのコミットを持っているかで、やり方が変わります。

| 状況 | 方法 | チームへの影響 |
| --- | --- | --- |
| まだ push していない | `git rebase -i -r` で reword → 普通に push | なし |
| 自分の作業ブランチに push 済み（PR のレビュー中など） | `git rebase -i -r` で reword → `git push --force-with-lease --force-if-includes` | そのブランチを取得した人に連絡が必要 |
| main / develop など共有ブランチに入っている | **書き換えない** | 書き換えると全員の手元と食い違う |
| PR を「Squash and merge」で取り込む運用 | 個々のメッセージは main に残らないので、**PR のタイトル・説明の修正で足りるか**レビュアーに確認 | なし |

今回のケースは2つ目（自分の `feature/120` に push 済み、PR でレビュー中）です。

### 手順1：作業前の状態をブランチで保存する

失敗してもすぐ戻れるように、今の状態に名札を付けておきます。

```sh
git status                          # 未コミットの変更がないことを確認（あれば commit か stash）
git branch backup/feature-120       # 今の状態を保存（push はしない）
```

### 手順2：直したいコミットのハッシュを調べる

```sh
git log --oneline --graph -15
```

直したいのは `1107db0 あ` です。**何個前かを数える必要はありません**。ハッシュを控えておきます（理由はハマりどころ1）。

### 手順3：`git rebase -i -r` を「直したいコミットの1つ前」から始める

```sh
git rebase -i -r 1107db0^
```

- `-i`（`--interactive`）：やることの一覧（ToDo リスト）をエディターで編集する
- `-r`（`--rebase-merges`）：**マージコミットを残したまま**書き換える
- `1107db0^`：`^` は「1つ前（親）」。直したいコミット自身を一覧に含めるため、その親から始める

エディターに次の一覧が開きます（コメント行は一部省略）。

```text
label onto

# Branch main
reset b88c4cd # 初期コミット
pick 40f7c5d #88 帳票出力の改修
label main

reset onto
pick 1107db0 あ
merge -C 77ef433 main # Merge branch 'main' of https://git.example.co.jp/team/order-system.git
pick a1df380 #120 受注登録の入力チェック6
pick f360b42 #120 受注登録の入力チェック7
pick 32a3405 #120 受注登録の入力チェック8
pick 0887f73 #120 受注登録の入力チェック9
pick de11923 #120 受注登録の入力チェック10
```

`label`・`reset`・`merge` は「マージの形を作り直すための命令」です。**触るのは `pick 1107db0 あ` の行だけ**です。

### 手順4：`pick` を `reword` に変えて保存する

```text
reword 1107db0 あ
```

`reword` は `r` と1文字で書いても構いません。複数のコミットを直すなら、その行もすべて `reword` にします。

Git Bash の vim で編集する場合の操作です。

| やること | キー |
| --- | --- |
| 直したい行の `pick` の上にカーソルを移動 | 矢印キー |
| `pick` を消して `reword` と入力 | `cw` → `reword` と入力 → `Esc` |
| 保存して閉じる（rebase を進める） | `:wq` → `Enter` |
| **何もせずに中止する** | `:cq` → `Enter`（`:q` では中止にならない） |

### 手順5：新しいメッセージを書く

保存すると、`reword` にしたコミットごとにメッセージの編集画面が開きます。「あ」を消して、正しいメッセージを書いて保存します。

```text
数量の上限チェックを追加 (#120)
```

**チケット番号を先頭の `#` で始めないでください。** `#` で始まる行はコメントとして捨てられます（ハマりどころ3）。

完了すると次のように表示されます。

```text
Successfully rebased and updated refs/heads/feature/120.
```

### 手順6：結果を確認する

```text
$ git log --oneline --graph -13
* 5a488f5 #120 受注登録の入力チェック10
* 247266c #120 受注登録の入力チェック9
* 4ee3ac4 #120 受注登録の入力チェック8
* bd1375a #120 受注登録の入力チェック7
* 08fa703 #120 受注登録の入力チェック6
*   178e5a5 Merge branch 'main' of https://git.example.co.jp/team/order-system.git
|\
| * 40f7c5d #88 帳票出力の改修          ← ハッシュが変わっていない（正しい）
* | 00d4cc8 数量の上限チェックを追加 (#120)   ← 直った
* | 863db98 #120 受注登録の入力チェック5   ← これより前は変わらない
...
```

確認するポイントは3つです。

1. 直したコミットのメッセージが変わっている
2. **他人のコミット（`40f7c5d`）のハッシュが変わっていない**
3. ファイルの中身が変わっていない（`git diff backup/feature-120` が**何も出力しない**）

```sh
git diff backup/feature-120         # 何も出なければ、中身は1文字も変わっていない
```

### 手順7：push する（push 済みの場合）

push 済みのブランチは、ハッシュが変わったため普通の push は断られます。

```text
$ git push
 ! [rejected]        feature/120 -> feature/120 (non-fast-forward)
error: failed to push some refs to 'https://git.example.co.jp/team/order-system.git'
hint: Updates were rejected because the tip of your current branch is behind
hint: its remote counterpart. If you want to integrate the remote changes,
hint: use 'git pull' before pushing again.
```

**ここで `git pull` してはいけません**（ハマりどころ5）。上書きで push します。

```sh
git push --force-with-lease --force-if-includes
```

```text
 + ffc2656...5f9f163 feature/120 -> feature/120 (forced update)
```

`(forced update)` と出れば完了です。最後に、手順1のバックアップを消します（しばらく残しておいても構いません）。

```sh
git branch -D backup/feature-120
```

## ハマりどころ1：`HEAD~10` で数えると、マージがあるとずれる

### 症状

「10個前だから」と `git rebase -i HEAD~11` としたら、直したいコミットが一覧に出てこない、または余計なコミットまで出てくる。

### 原因

`HEAD~11` は「**1つ目の親だけをたどって11個前**」という意味です。マージコミットには親が2つあり、`git log` に表示される順番と、`~` で数える順番が一致しません。

### 対処

数えずに、**ハッシュに `^` を付けて**指定します。

```sh
git log --oneline --graph -15       # ハッシュを確認
git rebase -i -r 1107db0^           # 直したいコミットの親から
```

## ハマりどころ2：`-r` を付けずに rebase して、他人のコミットまで書き換える

### 症状

`git rebase -i 1107db0^` で reword したら、マージコミットが消え、**同僚のコミット `#88 帳票出力の改修` のハッシュが変わった**。

```text
$ git rebase -i 1107db0^      # -r なし
$ git log --oneline --graph
* 545fab1 #120 受注登録の入力チェック10
* 254b5d0 #120 受注登録の入力チェック9
* c8af291 #120 受注登録の入力チェック8
* 076e891 #120 受注登録の入力チェック7
* 818955c #120 受注登録の入力チェック6
* c30f41c #88 帳票出力の改修           ← 40f7c5d だったものが別のコミットに
* 00d4cc8 数量の上限チェックを追加 (#120)
* 863db98 #120 受注登録の入力チェック5
...
```

### 原因

`-r` なしの rebase は、**マージを捨てて一直線に並べ直します**。マージで取り込んだ他人のコミットも「自分のコミット」と同じように作り直されるため、ハッシュが変わります。このまま push すると、main に入っている `40f7c5d` と、作業ブランチの `c30f41c` という**同じ内容の別コミット**ができ、PR に他人の変更が自分の差分として表示されます。

### 対処

途中にマージがあるときは、**必ず `-r`（`--rebase-merges`）を付けます**。やってしまったら、手順1のバックアップに戻してやり直します。

```sh
git reset --hard backup/feature-120
git rebase -i -r 1107db0^
```

## ハマりどころ3：メッセージを `#120 ...` で始めたら、空として中止された

### 症状

メッセージ編集画面で `#120 数量の上限チェックを追加` と書いて保存したら、rebase が途中で止まった。

```text
Aborting commit due to empty commit message.
You can amend the commit now, with

  git commit --amend

Once you are satisfied with your changes, run

  git rebase --continue
```

### 原因

エディターで書くメッセージでは、**`#` で始まる行はコメント**として捨てられます。1行しか書いていなければ、メッセージが空になります（`git commit -m "#120 ..."` のように `-m` で渡す場合は捨てられないため、気づきにくい）。

### 対処

止まった状態で、メッセージを付け直して続けます。

```sh
git commit --amend -m "数量の上限チェックを追加 (#120)"
git rebase --continue
```

チケット番号を先頭に書く運用のチームでは、コメント記号を変えておくと安全です。

```sh
git config --global core.commentChar ";"
```

## ハマりどころ4：vim から抜けられない、`:q` で閉じたら確定した

### 症状

Git Bash で `git pull` や `git rebase -i` をすると、見慣れない画面（vim）が開き、文字も打てないし閉じ方も分からない。適当に `:q` で閉じたら、**マージや rebase がそのまま進んでしまった**。

### 原因

Git は、エディターが**エラーなしで終了すれば「内容を確定した」**とみなします。`:q`（変更せずに閉じる）も正常終了なので、マージコミットのメッセージは初期値のまま確定し、rebase の ToDo は**全部 `pick` のまま**実行されます（ToDo を空にして保存した場合だけ、rebase は何もせずに中止されます）。

### 対処

- vim で**中止したいときは `:cq`**（エラー終了）で閉じる。そのあと状況に合わせて後始末する

| どこで `:cq` したか | Git の表示 | 後始末 |
| --- | --- | --- |
| pull のマージメッセージ | `Not committing merge; use 'git commit' to complete the merge.` | `git merge --abort` で pull 前に戻る |
| rebase の ToDo 一覧 | `There was a problem with the editor` | rebase は始まっていない。何もしなくてよい |
| reword のメッセージ | rebase が途中で止まる | `git rebase --abort` で開始前に戻る |

- 進んでしまったマージや rebase は、完了後でも `git reset --hard ORIG_HEAD`（または手順1のバックアップ）で戻せる
- そもそも vim を使わないように `core.editor` を VS Code などに変える（第1部の最後）

## ハマりどころ5：push を断られて `git pull` し、履歴が二重になる

### 症状

書き換え後に `git push` が `rejected` になり、ヒントどおり `git pull` したら、**古い「あ」と新しい「数量の上限チェック…」の両方**が履歴に並び、マージコミットがもう1つ増えた。

### 原因

リモートには書き換え前の履歴、手元には書き換え後の履歴があります。pull でこの2つをマージすると、**同じ変更が2組**残ります。これこそ「知らぬ間の pull」の再現です。

### 対処

書き換え後の push は `--force-with-lease` で上書きします。pull してしまったら、バックアップか reflog で pull の直前に戻します。

```sh
git reflog                          # "pull: Merge made by" の1つ前の HEAD@{n} を探す
git reset --hard HEAD@{1}           # 例：直前の状態に戻す
```

## ハマりどころ6：`--force` で上書きし、同僚のコミットを消す

### 症状

`git push --force` で上書きしたら、その間に同僚が同じブランチへ push していたレビュー指摘の修正コミットが消えた。

### 原因

`--force` は、**リモートの状態を確認せずに**手元の内容で丸ごと置き換えます。

### 対処

`--force-with-lease` を使います。「自分が最後に見たリモートの状態から変わっていなければ上書きする」ため、誰かが push していれば止まります。

```text
$ git push --force-with-lease
 ! [rejected]        feature/120 -> feature/120 (stale info)
```

`stale info` で止まったら、上書きせずにハマりどころ8の手順で同僚のコミットを取り込みます。

## ハマりどころ7：自動 fetch のせいで `--force-with-lease` が素通りする

### 症状

`--force-with-lease` を使ったのに、同僚のコミットが消えた。

### 原因

`--force-with-lease` が比べるのは「リモート追跡ブランチ（`origin/feature/120`）」です。VS Code の `git.autofetch` や GUI ツールが**裏で `git fetch` すると、同僚のコミットを含む最新の状態が「自分が最後に見た状態」に更新**されます。その結果、「変わっていない」と判断され、上書きが通ってしまいます。

### 対処

`--force-if-includes`（Git 2.30 以降）を併用します。fetch で取得しただけで、**手元のブランチに取り込んでいないコミット**があると止まります。

```text
$ git fetch                          # 自動 fetch を再現
$ git push --force-with-lease --force-if-includes
 ! [rejected]        feature/120 -> feature/120 (remote ref updated since checkout)
```

毎回打つのが面倒なら、エイリアスにしておきます。

```sh
git config --global alias.pushf "push --force-with-lease --force-if-includes"
git pushf
```

## ハマりどころ8：同僚の push を取り込もうと rebase したら、直したメッセージが元に戻った

### 症状

`stale info` で止まったので、`git fetch` → `git rebase origin/feature/120` で同僚のコミットを取り込んだら、**直したはずの「あ」が元に戻っていた**。

```text
hint: use --reapply-cherry-picks to include skipped commits
```

### 原因

rebase は、**中身（差分）が同じコミットはすでに取り込み済み**とみなしてスキップします。メッセージだけ直したコミットは中身が書き換え前と同じなので、全部スキップされ、リモートの（書き換え前の）履歴に同僚のコミットが乗っただけの状態になります。

### 対処

**リモートの最新に合わせてから、reword をやり直す**のがいちばん確実です。

```sh
git fetch
git reset --hard origin/feature/120   # 同僚のコミットを含む最新に合わせる（自分の書き換えは捨てる）
git rebase -i -r 1107db0^              # reword をやり直す
git push --force-with-lease --force-if-includes
```

`git reset --hard` の前に、未 push の自分のコミットが残っていないか `git log origin/feature/120..HEAD` で確認してください（書き換えたコミット以外が出たら、先に退避します）。

## マージコミットのメッセージも直したいとき

レビューで「`Merge branch 'main' of https://...` も分かりやすくして」と言われることもあります。`-r` の ToDo にある `merge -C` を **`merge -c`（小文字）** に変えると、マージコミットのメッセージを編集できます。

```text
merge -c 77ef433 main # Merge branch 'main' of https://git.example.co.jp/team/order-system.git
```

```text
$ git log --oneline --graph -8
*   85101f3 main の最新（#88 帳票出力）を取り込み
|\
| * 40f7c5d #88 帳票出力の改修
* | 1107db0 あ
```

`-C` は「元のメッセージをそのまま使う」、`-c` は「元のメッセージを編集してから使う」です。

## チームへの影響と連絡

### 影響を受ける人

書き換えたブランチを**すでに取得している人**全員です。PR のレビュアー、ペアで同じブランチに push している人、そのブランチから派生ブランチを切った人が該当します。

### force push の前後に送る連絡の例

```text
【連絡】feature/120 を force push します（コミットメッセージの修正のみ）
- 対象：feature/120（PR #345）
- 内容：11コミット前の「あ」を「数量の上限チェックを追加 (#120)」に修正。ファイルの中身は変更なし
- 影響：feature/120 を取得済みの方は、手元のハッシュが変わります
- お願い：取得済みの方は、次のどちらかで最新にしてください
  - 手元に未 push のコミットがない：git fetch && git reset --hard origin/feature/120
  - 手元に未 push のコミットがある：git pull --rebase
  ※ 普通の git pull（マージ）はしないでください。履歴が二重になります
```

### 受け取った側の対応

| 手元の状態 | コマンド | 結果 |
| --- | --- | --- |
| 未 push のコミットがない | `git fetch` → `git reset --hard origin/feature/120` | リモートと完全に同じになる |
| 未 push のコミットがある | `git pull --rebase` | 自分のコミットだけが書き換え後の履歴の上に乗る |
| 普通の `git pull` をしてしまった | `git reset --hard ORIG_HEAD` で pull 前に戻し、上のどちらかをやり直す | |

実際に、書き換え前のブランチに1コミット足した状態で `git pull --rebase` すると、**自分のコミット1つだけ**が付け直されることを確認しています。

```text
$ git pull --rebase
Successfully rebased and updated refs/heads/feature/120.
$ git log --oneline -1
6031bb3 テスト追加(佐藤)
```

一方、`pull.rebase` を設定していない環境で普通に `git pull` すると、`fatal: Need to specify how to reconcile divergent branches.` で止まります（`pull.rebase false` の人はマージされてしまうので注意）。

## 直さない判断もある

- **main・develop に入ったコミット**は書き換えません。全員の手元と CI・リリースタグの履歴が食い違います。誤ったメッセージは、次のコミットや PR の説明で補足します
- **Squash and merge で取り込む PR** は、個々のコミットメッセージが main に残りません。レビュアーに「PR タイトルとマージ時のメッセージで直す形でよいか」を確認すると、force push 自体が不要になります
- 書き換えのたびにレビュー済みのコメントが「Outdated」になるツールもあります。修正依頼が複数あるなら、**まとめて1回で**書き換えます

## 手順まとめ

| 手順 | コマンド | 確認すること |
| --- | --- | --- |
| 1. 保存 | `git status` → `git branch backup/feature-120` | 未コミットの変更がない |
| 2. 対象を探す | `git log --oneline --graph -15` | 直したいコミットのハッシュ |
| 3. rebase 開始 | `git rebase -i -r <ハッシュ>^` | 一覧に直したいコミットがある |
| 4. reword | `pick` → `reword`（`r`）にして保存 | 他の行は触らない |
| 5. メッセージ | 新しいメッセージを書いて保存 | 先頭を `#` にしない |
| 6. 確認 | `git log --oneline --graph` / `git diff backup/feature-120` | 他人のハッシュが不変、差分なし |
| 7. push | `git push --force-with-lease --force-if-includes` | `(forced update)` |
| 8. 連絡 | チームに force push を連絡 | 受け取り側の手順を添える |

## チェックリスト

- [ ] 「知らぬ間の pull」は `git reflog | grep pull` で確認した
- [ ] `git config --global pull.ff only` を設定し、勝手にマージされないようにした
- [ ] 書き換えるのは自分の作業ブランチだけで、main・develop には手を入れていない
- [ ] 作業前に `backup/...` ブランチを作った
- [ ] rebase の起点は `HEAD~N` ではなく `<ハッシュ>^` で指定した
- [ ] 途中にマージコミットがあるので `-r`（`--rebase-merges`）を付けた
- [ ] 新しいメッセージの先頭を `#` にしていない
- [ ] 書き換え後に他人のコミットのハッシュが変わっていない
- [ ] `git diff backup/...` が空（中身は変わっていない）
- [ ] push は `--force-with-lease --force-if-includes` で行い、`--force` は使っていない
- [ ] push を断られても `git pull` していない
- [ ] 影響を受ける人に、受け取り側の手順付きで連絡した

## まとめ

- **Git Bash は勝手に pull しません。** push を断られて実行した `git pull`、開いた vim を閉じたことによるマージの確定、IDE の同期ボタンが主な原因です。`git reflog` に記録が残り、`pull.ff only` で再発を防げます。
- **何個前のコミットでも、`git rebase -i -r <ハッシュ>^` → `reword` でメッセージを直せます。** 途中にマージがあるときに `-r` を忘れると、他人のコミットまで作り直されます。
- **push 済みなら `--force-with-lease --force-if-includes`。** 断られても `git pull` せず、同僚の push があったら最新に合わせてから reword をやり直します。
- 書き換えてよいのは**自分の作業ブランチだけ**です。force push したら、受け取り側の手順を添えてチームに連絡しましょう。

Git の基本コマンド・取り消し方・エラー対応は、[Git 技術まとめ](/technology/git/guide/)にまとめています。同僚の設定をマージしたらコミットが同僚名義になったときの直し方は「[同僚の git config をマージしたら、コミットが同僚の名前・同じ日時になった](/articles/git-config-merge-commit-as-coworker/)」を参照してください。
