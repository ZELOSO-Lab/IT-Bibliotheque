---
series: 現場の声
no: 0032
title: 【Git】同僚の git config をマージしたら、コミットが同僚の名前・同じ日時になった。原因は user.name の上書きと Git GUI の「最新コミットを訂正」
slug: git-config-merge-commit-as-coworker
category: Git
tags: [Git, Git GUI, git config, user.name, git commit --amend, reset-author, reflog, コミット作者]
technologies: [git]
excerpt: fetch できない原因を探して、同僚Aさんの git config と比べて足りない設定をマージした。fetch は通るようになったが、コミットしたら Aさんの名前で、しかも Aさんのコミットと同じタイムスタンプで記録された。原因は「user.name / user.email まで上書きした」と「Git GUI の『最新コミットを訂正』（Amend）で Aさんのコミットを書き換えた」の2つです。作者とコミッターの違い、見分け方、push 前・pull 後・push 後のケース別の直し方、他人の設定から持ち込んではいけない項目、8つのハマりどころを実行結果付きでまとめました。
status: draft
created: 2026-11-14
---

# 【Git】同僚の git config をマージしたら、コミットが同僚の名前・同じ日時になった。原因は user.name の上書きと Git GUI の「最新コミットを訂正」

## 現場の声

> fetch がエラーで通らない。動いている同僚の**Aさんと git config を比べたら、自分の設定にはない項目がいくつもあった**ので、足りないものをマージした。これで fetch はできるようになった。
>
> ところが、そのあと Git GUI（日本語化済み）でコミットしたら、**作者が Aさんの名前になっている**。しかも**日時まで Aさんのコミットとまったく同じ**。自分は Aさんのアカウントを借りた覚えもないし、日時が同じになる理由もわからない……。

結論を先に書きます。原因は**2つ重なっています**。

- **原因1：Aさんの `user.name` / `user.email` まで取り込んだ。** Git はコミットの作者名を、手元の設定ファイルに書かれた `user.name` / `user.email` から決めます。設定をまるごとマージすると、自分の名前が Aさんの名前で上書きされます。
- **原因2：Git GUI で「最新コミットを訂正」（Amend）になっていた。** 「日時まで同じ」は Amend の症状です。Amend は**直前のコミット（＝ fetch で取り込んだ Aさんのコミット）を作り直す**操作で、**作者と作者日時は元のコミットのまま**残ります。日本語化で表示が変わり、チェックが入っていることに気づきにくくなっています。
- **push 前なら完全に戻せます。** `git reflog` で Amend 前のコミットを確認し、`git reset --soft HEAD@{1}` で Amend を取り消して、**新規コミット**としてやり直します。作者だけが違う場合は、設定を直してから `git commit --amend --reset-author --no-edit` です。
- **push 済みなら、force push の前に必ず Aさんとチームに相談します。** Aさんのコミットを書き換えた状態で `--force` すると、Aさんのコミットが共有リポジトリから消えます。

この記事のコマンドは、Git 2.43.0（Ubuntu 24.04）で共有リポジトリと Aさん・自分の2つのクローンを作って実行し、結果を確認しています。Git GUI のメニュー名は、Git for Windows に同梱されている Git GUI の日本語訳（git-gui の `po/ja.po`）に合わせています。結果の日時は、読みやすいように例の値に置き換えています。

## 前提の構成

この記事では、次の状況を例にします。

- 共有ブランチ `develop` に、Aさんの `#210 受注一覧の並び順を修正` が push されている
- 自分（山田）は fetch・pull でそれを取り込み、`#215 受注一覧に件数表示を追加` をコミットするつもりだった
- 自分の `~/.gitconfig` には、Aさんの設定ファイルから足りない項目をコピーしてある（`[user]` の段落も含めて）

本来できるはずだった履歴と、実際にできた履歴は次のとおりです。

```text
本来（新規コミット）
* 00b0651 #215 受注一覧に件数表示を追加     ← 自分の名前・今の日時
* d0db3e5 #210 受注一覧の並び順を修正       ← Aさんのコミット（そのまま）

実際（最新コミットを訂正）
* 3376e19 #210 受注一覧の並び順を修正       ← Aさんの名前・Aさんの日時。中身は Aさんの変更＋自分の変更
                                              （Aさんの d0db3e5 は手元の develop から外れた）
```

## 第1部：何が起きたのか

### コミットには「作者」と「コミッター」の2人が記録される

Git のコミットには、名前と日時の組が**2つ**入っています。

| 項目 | 意味 | どこから決まるか | `git log` の表示 |
| --- | --- | --- | --- |
| 作者（Author）と作者日時 | その変更を**書いた人**と、最初に書いた日時 | `user.name` / `user.email` と現在時刻。**Amend では元のコミットの値を引き継ぐ** | `Author:` と `Date:`（普段見ているのはこちら） |
| コミッター（Committer）とコミット日時 | そのコミットを**作った（作り直した）人**と日時 | `user.name` / `user.email` と現在時刻（Amend でも更新される） | `--format=fuller` か `%cn` / `%cd` で表示 |

`git log` や Git GUI の履歴表示（gitk）が普段見せているのは**作者**の方です。「日時が同じ」に見えたのは、作者日時が元のコミットから引き継がれたためです。

### 原因1：`[user]` の段落ごとマージした

Git の設定は3か所のファイルに書かれ、**後のものが優先**されます。

| スコープ | ファイル | 範囲 |
| --- | --- | --- |
| system | Git のインストール先（Git for Windows なら `C:\Program Files\Git\etc\gitconfig`） | PC の全ユーザー |
| global | `~/.gitconfig`（Windows は `C:\Users\ユーザー名\.gitconfig`） | 自分の全リポジトリ |
| local | 各リポジトリの `.git/config` | そのリポジトリだけ（**最優先**） |

Aさんの `.gitconfig` を見ながら足りない行を足すと、次のように `[user]` も取り込まれがちです。

```ini
[user]
	name = A-san                     ← Aさんの名前
	email = a-san@example.co.jp      ← Aさんのメール
[http]
	proxy = http://proxy.example.co.jp:8080
	sslBackend = schannel            ← fetch が通るようになったのはこのあたり
[core]
	autocrlf = true
```

今どの値が使われていて、それが**どのファイルに書かれているか**は、次のコマンドで確認できます。

```text
$ git config --show-origin --show-scope --get-all user.name
global	file:C:/Users/yamada/.gitconfig	A-san

$ git var GIT_AUTHOR_IDENT          # 次にコミットしたときの作者
A-san <a-san@example.co.jp> 1794614978 +0900
```

### 原因2：Git GUI の「最新コミットを訂正」で Aさんのコミットを作り直した

Git GUI のコミット欄の右上には「**最新コミットを訂正**」というチェックボックスがあります（英語版は「Amend Last Commit」。古い Git GUI では「新規コミット」「最新コミットを訂正」のラジオボタン）。メニューの「コミット」→「最新コミットを訂正」、ショートカット **Ctrl+E** でも同じ状態になります。

チェックが入ると、Git GUI は次のように動きます。

1. 直前のコミット（ここでは fetch・pull で取り込んだ Aさんの `#210`）のメッセージを、コミット欄に読み込む
2. コミット欄の見出しが「コミットメッセージ:」から「**訂正したコミットメッセージ:**」に変わる
3. 「コミット」を押すと、**直前のコミットを捨てて、自分の変更を足した新しいコミットを作る**。このとき作者名・作者メール・作者日時は**元のコミットのものをそのまま使う**

コマンドで同じことをすると、次の結果になります。

```text
$ git commit --amend --no-edit        # Git GUI の「最新コミットを訂正」と同じ
$ git log -1
commit 3376e19fb6956aa4a5c7b75593c1693f2b33e5c3
Author: A-san <a-san@example.co.jp>
Date:   Thu Nov 12 18:30:00 2026 +0900      ← Aさんが最初にコミットした日時のまま

    #210 受注一覧の並び順を修正
```

日本語化した直後は、ボタンやメニューの位置を探しながら操作します。そのとき、チェックボックスや Ctrl+E で「最新コミットを訂正」に切り替わっても気づきにくくなります。

### 症状から原因を見分ける

作者・作者日時・コミッターの3つを並べて表示すると、どちらの原因かがわかります。

```sh
git log -3 --format='%h  作者=%an <%ae> %ad  コミッター=%cn %cd  %s' --date=format:'%Y-%m-%d %H:%M'
```

| 作者 | 作者日時 | メッセージ | 原因 |
| --- | --- | --- | --- |
| Aさん | Aさんのコミットと同じ | Aさんのもの | **Amend**（原因2）。コミッターも Aさんなら原因1も重なっている |
| Aさん | 自分がコミットした時刻 | 自分が書いたもの | **設定の上書きだけ**（原因1）。新規コミットはできている |
| 自分 | 自分がコミットした時刻 | 自分が書いたもの | 正常な新規コミット |

今回の結果は1行目です。

```text
3376e19  作者=A-san <a-san@example.co.jp> 2026-11-12 18:30  コミッター=A-san 2026-11-13 09:12  #210 受注一覧の並び順を修正
```

`git reflog` にも Amend の記録が残ります。

```text
$ git reflog -3
3376e19 HEAD@{0}: commit (amend): #210 受注一覧の並び順を修正
d0db3e5 HEAD@{1}: pull: Fast-forward
...
```

`commit (amend)` の1つ下（`HEAD@{1}`）が、**Amend 前の Aさんのコミット**です。直し方はこの記録を使います。

## 第2部：直し方

### 手順0：まず自分の名前に戻す（全ケース共通）

```sh
git config --global user.name "Yamada Taro"
git config --global user.email "taro.yamada@example.co.jp"
git config --show-origin --show-scope --get-all user.name   # global だけが出ること
git var GIT_AUTHOR_IDENT                                     # 自分の名前になっていること
```

`local	file:.git/config	A-san` のように **local の行も出たら**、リポジトリ側にも Aさんの名前が書かれています。そのリポジトリで `git config --unset user.name` と `git config --unset user.email` を実行して消します（local が最優先なので、global を直しても変わりません）。

Git GUI では「編集」→「オプション…」の「**ユーザ名**」「**電子メールアドレス**」で確認できます。左が「（リポジトリ名） リポジトリ」（local）、右が「大域（全てのリポジトリ）」（global）です。

### どのケースか判断する

| 状態 | 見分け方 | 直し方 |
| --- | --- | --- |
| A. Amend した・push していない | `git status` が `[ahead 1, behind 1]`、reflog に `commit (amend)` | 手順A：`git reset --soft HEAD@{1}` |
| B. Amend した・push を断られて pull した | `git log --graph` に**同じメッセージのコミットが2つ**とマージコミット | 手順B：`git reset --soft origin/develop` |
| C. 新規コミットだが作者が Aさん・push していない | 作者日時が自分の時刻、`[ahead N]` | 手順C：`--reset-author` で作り直す |
| D. push 済み | `git status` に ahead がない | 手順D：**相談してから**決める |

### 手順A：Amend を取り消して、新規コミットでやり直す（push 前）

```sh
git branch backup/before-fix            # 念のため今の状態を保存
git reflog -3                           # HEAD@{1} が Amend 前（Aさんの d0db3e5）であることを確認
git reset --soft HEAD@{1}               # Amend を取り消す。自分の変更はステージに残る
git status -s                           # 自分が変更したファイルだけが M で出る
git log -1 --oneline                    # d0db3e5 #210 ...（Aさんのコミットが元どおり）
git commit -m "#215 受注一覧に件数表示を追加"
```

```text
$ git log -3 --format='%h  作者=%an %ad  %s' --date=format:'%Y-%m-%d %H:%M'
00b0651  作者=Yamada Taro 2026-11-13 09:20  #215 受注一覧に件数表示を追加
d0db3e5  作者=A-san 2026-11-12 18:30  #210 受注一覧の並び順を修正
$ git status -sb
## develop...origin/develop [ahead 1]
$ git push
   d0db3e5..00b0651  develop -> develop
```

`--soft` は「コミットだけを戻し、ファイルとステージはそのまま」にするオプションです。`--hard` にすると自分の変更が消えるので使いません。Git GUI で直すなら、`git reset --soft` のあとに Git GUI を開き直し（または「再スキャン」）、「最新コミットを訂正」の**チェックが外れていること**を確認してからコミットします。

### 手順B：push を断られて pull してしまったとき（push 前）

Amend したコミットは、共有リポジトリの Aさんのコミットとは別物です。そのため push は `! [rejected] develop -> develop (non-fast-forward)` で断られます。ここで `git pull` すると、次のように**同じメッセージのコミットが2つ**並びます。

```text
$ git log --oneline --graph --format='%h %an %s'
*   60b5156 A-san Merge branch 'develop' of https://git.example.co.jp/team/order-system
|\
| * 8f070b8 A-san #210 受注一覧の並び順を修正     ← 共有リポジトリの本物
* | 44b2dcf A-san #210 受注一覧の並び順を修正     ← Amend で作り直した偽物（自分の変更入り）
|/
* 9cea385 A-san #200 初版
```

マージ後のファイルの中身は正しい（Aさんの変更＋自分の変更）ので、**履歴だけを共有リポジトリの状態に戻し、差分を1つの新規コミットにまとめ直します**。

```sh
git branch backup/before-fix
git fetch
git reset --soft origin/develop         # 履歴を共有リポジトリに合わせる。ファイルはマージ後のまま
git diff --staged                       # 自分の変更だけが出ることを確認
git commit -m "#215 受注一覧に件数表示を追加"
git diff backup/before-fix              # 何も出なければ、ファイルの中身は変わっていない
git push
```

```text
$ git log --oneline --graph --format='%h %an %s'
* eb3d644 Yamada Taro #215 受注一覧に件数表示を追加
* 8f070b8 A-san #210 受注一覧の並び順を修正
* 9cea385 A-san #200 初版
```

### 手順C：作者だけが Aさんになっている（push 前）

Amend ではなく新規コミットはできているが、作者が Aさんになっている場合です。手順0で設定を直してから、作り直します。

```sh
# 直前の1つだけ
git commit --amend --reset-author --no-edit

# 複数ある場合：まず「自分がまだ push していないコミット」だけが出ることを確認
git log origin/develop..HEAD --format='%h %an %s'
git rebase origin/develop --exec 'git commit --amend --no-edit --reset-author'
```

```text
$ git log origin/develop..HEAD --format='%h %an <%ae> %s'
7c708af A-san <a-san@example.co.jp> #217 帳票ボタンを追加
a48e16a A-san <a-san@example.co.jp> #216 件数の書式を修正
$ git rebase origin/develop --exec 'git commit --amend --no-edit --reset-author'
$ git log origin/develop..HEAD --format='%h %an <%ae> %s'
847e789 Yamada Taro <taro.yamada@example.co.jp> #217 帳票ボタンを追加
96a4213 Yamada Taro <taro.yamada@example.co.jp> #216 件数の書式を修正
```

`--reset-author` は、作者を今の `user.name` / `user.email` に、作者日時を現在時刻に置き換えます。**付けずに `--amend` しても作者は変わりません**（ハマりどころ5）。

### 手順D：push 済みのとき

push 済みのコミットを直すには、履歴を書き換えて force push するしかありません。ブランチによって判断が分かれます。

| ブランチ | 判断 |
| --- | --- |
| 自分だけが使う作業ブランチ（`feature/215` など） | 手順A〜Cで直し、`git push --force-with-lease --force-if-includes`。手順は記事「[Git Bash で知らぬ間に pull していた？ 10個以上前の雑なコミットメッセージを直す手順](/articles/git-unexpected-pull-reword-old-commit/)」の手順7を参照 |
| `develop` / `main` など共有ブランチ | **自分では書き換えない。** Aさんとリーダーに状況を伝え、「書き換えて全員が取り直す」か「そのまま残して記録で補足する」かを決めてもらう |

共有ブランチは、ほかの人がすでに取り込んでいる可能性があります。書き換えると、全員の手元と共有リポジトリの履歴が食い違います。「名前が違う」だけなら、**履歴はそのままにして、チケットや PR の説明に「#215 の作者は山田（設定ミス）」と書いておく**のが一番安全です。

相談するときは、次の情報を添えると判断が早くなります。

```text
develop に push した 3376e19 が、Aさん名義・Aさんの日時になっています。
原因：git config に Aさんの user.name/user.email をコピーしたことと、Git GUI の「最新コミットを訂正」で Aさんの d0db3e5 を作り直したことです。
影響：d0db3e5（#210）が develop から外れ、3376e19 に #210 と #215 の変更がまとめて入っています。
設定はすでに直しました。書き換えて force push するか、このまま残すか判断をお願いします。
```

## 他人の設定から持ち込んではいけない項目

「動いている人の設定をコピーする」のは、fetch・push のトラブルでよく使われる手です。ただし、**人に紐づく設定**まで写すと、今回のように他人になりすましたり、他人の認証情報を使ったりします。

| 設定 | 持ち込むと何が起きるか | 扱い |
| --- | --- | --- |
| `user.name` / `user.email` | コミットが他人名義になる | **絶対に写さない** |
| `user.signingkey` / `commit.gpgsign` | 他人の鍵で署名しようとして失敗する（鍵がない） | 写さない |
| `credential.*`、URL に埋め込んだ ID・パスワード（`https://a-san:xxxx@...`） | **他人のアカウントで fetch・push する**。権限・監査ログが Aさんになる | 写さない。自分の認証を設定する |
| `http.proxy` に ID・パスワードが入っている（`http://a-san:pass@proxy...:8080`） | 他人のアカウントでプロキシを通る | ホスト名・ポートだけ写し、認証は自分のものにする |
| `core.sshCommand`、`url.<base>.insteadOf` | 他人の鍵ファイルのパスや、別の URL に向く | 意味がわかる場合だけ、自分の環境に合わせて写す |
| `includeIf` / `include.path`、`safe.directory`、`core.editor` | 他人の PC にしかないパスを指す | パスを自分の環境に直す |
| `http.sslBackend`、`http.sslCAInfo`、`core.autocrlf`、`core.longpaths`、`core.quotepath`、`pull.*` | チーム共通の設定。fetch が通るようになったのは多くの場合このあたり | 写してよい（意味を確認してから） |
| `alias.*`、`gui.*`、`color.*` | 見た目・好みの設定 | 写してもよい |

「fetch できるようになった」理由が `credential.*` や URL・プロキシの埋め込み認証だった場合は、**Aさんの認証情報で fetch している**ことになります。設定を消して自分の認証で fetch できるか確認し、Aさんにも伝えてください。Aさんのパスワードやトークンが自分の PC に保存されたままになっていれば、Aさんに変更してもらう必要があります。

### 安全な比べ方・取り込み方

ファイルを丸ごとマージせず、**一覧で比べて、必要な項目だけを `git config` で1つずつ設定**します。

```sh
# 自分の設定を「キー=値」の一覧にする（Aさんにも同じコマンドで出してもらう）
git config --global --list | sort > my-config.txt
# Aさんの一覧（a-config.txt）と比べる。WinMerge でも可
diff my-config.txt a-config.txt

# 必要な項目だけを設定する
git config --global http.sslBackend schannel
git config --global core.longpaths true
```

一覧は1行1項目なので、どの項目を取り込むかを1行ずつ判断できます。`user.` で始まる行と、ID・パスワード・パスが入っている行は飛ばします。

## 再発防止

### 1. コミットする前に作者を確認する

```sh
git var GIT_AUTHOR_IDENT        # 次のコミットの作者（名前 <メール> 時刻）
```

設定を触ったあとは、最初のコミットの前にこれを実行します。Git GUI なら「編集」→「オプション…」のユーザ名欄を見ます。

### 2. 名前が未設定ならコミットさせない

```sh
git config --global user.useConfigOnly true
```

`user.name` / `user.email` が設定ファイルにないとき、Git は PC 名などから作者を推測します。`useConfigOnly` を有効にすると推測をやめて、`Author identity unknown` でコミットを止めます。

### 3. 会社用の名前・メールは別ファイルにして、フォルダで切り替える

```ini
# ~/.gitconfig
[includeIf "gitdir:C:/work/"]
	path = ~/.gitconfig-work

# ~/.gitconfig-work（自分の会社用の名前だけを書く）
[user]
	name = Yamada Taro
	email = taro.yamada@example.co.jp
```

`C:/work/` 以下のリポジトリでだけ `.gitconfig-work` が読み込まれます。`[user]` が `.gitconfig` 本体にないので、他人の設定と見比べたときに混ざりにくくなります。`includeIf` で読み込んだ値は、`git config --show-origin` で読み込み元のファイル名が表示されます。

### 4. Git GUI でコミットする前に見出しを見る

コミット欄の見出しが「**コミットメッセージ:**」なら新規コミット、「**訂正したコミットメッセージ:**」なら Amend です。コミット欄に**自分が書いていないメッセージ**が最初から入っていたら、「最新コミットを訂正」のチェックが入っています。チェックを外してからコミットします。

## ハマりどころ1：`--global` を直したのに、まだ Aさんの名前になる

### 症状

`git config --global user.name "Yamada Taro"` を実行したのに、`git var GIT_AUTHOR_IDENT` が Aさんのままになる。

### 原因

リポジトリの `.git/config`（local）にも Aさんの `user.name` が書かれています。local は global より優先されます。

```text
$ git config --show-origin --show-scope --get-all user.name
global	file:C:/Users/yamada/.gitconfig	Yamada Taro
local	file:.git/config	A-san          ← こちらが使われる
```

### 対処

そのリポジトリで local の値を消します。

```sh
git config --unset user.name
git config --unset user.email
```

## ハマりどころ2：Amend したまま push しようとして断られる

### 症状

`git push` が `! [rejected] develop -> develop (non-fast-forward)` で断られる。`git status` は `[ahead 1, behind 1]`。

### 原因

Amend で、共有リポジトリにある Aさんのコミット `d0db3e5` を手元で `3376e19` に作り直しました。共有リポジトリから見ると「`d0db3e5` を消して別のコミットに置き換える push」になるので、Git が止めています。**断られたのは正しい動作**です。

### 対処

pull も force push もせず、手順A（`git reset --soft HEAD@{1}`）で Amend を取り消します。

## ハマりどころ3：断られたので pull したら、同じコミットが2つになった

### 症状

`#210 受注一覧の並び順を修正` が2つと、`Merge branch 'develop' of ...` ができた。

### 原因

本物（共有リポジトリの `d0db3e5`）と、Amend で作った偽物（`3376e19`）は**別のコミット**です。pull はこの2つを「別々の変更」としてマージします。

### 対処

push する前なら、手順B（`git reset --soft origin/develop` → 新規コミット）で1本の履歴に戻します。この状態で push すると、偽物の `#210`（中身は自分の変更入り）が共有リポジトリに残り、あとから見た人が混乱します。

## ハマりどころ4：断られたので `--force` で push し、Aさんのコミットを消した

### 症状

`git push --force` は成功したが、共有リポジトリの `develop` から Aさんのコミット `d0db3e5` が消え、Aさん名義の `3376e19` に置き換わった。Aさんが次に push しようとすると断られる。

### 原因

`--force` は「共有リポジトリを自分の手元と同じにする」操作です。Amend で作り直したコミットで、Aさんのコミットを上書きしました。

### 対処

すぐに Aさんとリーダーに連絡します。`d0db3e5` は Aさんの手元にも、自分の `git reflog` にも残っているので、手順Dの相談内容に「`--force` してしまった」ことを加えて戻し方を決めます。**共有ブランチでは `--force` を使わない**のが原則です。自分の作業ブランチでも `--force-with-lease --force-if-includes` を使います。

## ハマりどころ5：`--reset-author` を付けずに Amend して、作者が変わらない

### 症状

設定を直してから `git commit --amend --no-edit` したが、作者は Aさんのまま。コミッターだけが自分になった。

```text
$ git commit --amend --no-edit
$ git log -1 --format='作者=%an  コミッター=%cn'
作者=A-san  コミッター=Yamada Taro
```

### 原因

Amend は**作者を引き継ぐ**のが仕様です。今回の「日時が同じ」も同じ仕組みで起きています。

### 対処

`--reset-author` を付けます。

```text
$ git commit --amend --no-edit --reset-author
$ git log -1 --format='作者=%an  コミッター=%cn'
作者=Yamada Taro  コミッター=Yamada Taro
```

ただし、**Aさんのコミットを Amend してしまった場合（手順A・B）は `--reset-author` で直しません。** 自分名義にはなりますが、Aさんの変更まで「山田が書いた」ことになり、Aさんの元のコミットは消えたままです。

## ハマりどころ6：`.mailmap` で直そうとしたら、Aさんの全コミットが自分名義になった

### 症状

「履歴を書き換えずに表示名だけ直せる」と聞いて `.mailmap` に Aさん → 自分の対応を書いたら、`git log` や `git blame` で **Aさんが本当に書いたコミットまで**自分の名前になった。

```text
$ cat .mailmap
Yamada Taro <taro.yamada@example.co.jp> A-san <a-san@example.co.jp>
$ git log --format='%h %an → %aN  %s'
00b0651 Yamada Taro → Yamada Taro  #215 受注一覧に件数表示を追加
d0db3e5 A-san → Yamada Taro  #210 受注一覧の並び順を修正      ← Aさんの本物のコミット
```

### 原因

`.mailmap` は**コミット単位ではなく、名前とメールの組み合わせ単位**で表示名を置き換えます。今回の誤ったコミットは Aさんの本物の名前・メールで記録されているので、Aさんのすべてのコミットが対象になります。

### 対処

`.mailmap` は消します。`.mailmap` が役に立つのは「昔の自分の別メールを今のメールにまとめる」ような場合です。今回のように**他人の名前で記録されたコミット**を区別する方法はないので、push 前に直す（手順A〜C）か、手順Dで記録を残します。

## ハマりどころ7：fetch が通るようになった理由が、Aさんの認証情報だった

### 症状

設定を直したら、また fetch できなくなった。あるいは、共有リポジトリの監査ログやサーバーのアクセス記録に、自分の操作が Aさんとして残っていた。

### 原因

マージした設定に、Aさんの ID・パスワードを埋め込んだ URL やプロキシ、`credential.*` が含まれていました。

```sh
git config --show-origin --get-regexp '^(credential|http|url|remote)\.'   # 認証に関係する設定を一覧表示
```

### 対処

Aさんの認証情報が入った設定を消し、自分のアカウントで認証します（Windows は「資格情報マネージャー」に Aさんの情報が保存されていないかも確認します）。Aさんには「自分の PC に認証情報が残っていた」ことを伝えます。fetch が本当に通らない原因は、多くの場合 `http.sslBackend schannel`（社内CA）や `http.proxy` のホスト名・ポートです。詳しくは「[Git 技術まとめ](/technology/git/guide/)」のエラー対応を参照してください。

## ハマりどころ8：`rebase --exec` で、Aさんのコミットまで自分名義にした

### 症状

手順Cで `git rebase HEAD~5 --exec 'git commit --amend --no-edit --reset-author'` としたら、範囲に入っていた Aさんのコミットまで作者が自分になり、ハッシュも変わった。

### 原因

`--exec` は、範囲に入った**すべてのコミット**で実行されます。`HEAD~5` のように数で指定すると、pull で取り込んだ他人のコミットが混ざります。

### 対処

範囲は「まだ push していない自分のコミット」に限り、**`origin/ブランチ名` を起点**にします。実行前に `git log origin/develop..HEAD --format='%h %an %s'` で、対象が自分のコミットだけであることを確認します。やってしまったら、`backup/...` ブランチか `git reflog` の rebase 前の位置に `git reset --hard` で戻してやり直します。

## 手順まとめ

| 手順 | コマンド | 確認すること |
| --- | --- | --- |
| 1. 原因を調べる | `git log -3 --format='%h %an %ad %cn %cd %s'` / `git reflog -3` | 作者日時が元のコミットと同じか、`commit (amend)` があるか |
| 2. 設定を直す | `git config --global user.name/user.email` | `git config --show-origin --show-scope --get-all user.name` に local の行がない |
| 3. 保存 | `git branch backup/before-fix` | |
| 4a. Amend を戻す | `git reset --soft HEAD@{1}` → `git commit` | `git log` で Aさんのコミットが元のハッシュに戻った |
| 4b. pull 後なら | `git fetch` → `git reset --soft origin/develop` → `git commit` | `git diff backup/before-fix` が空 |
| 4c. 作者だけ違う | `git commit --amend --reset-author --no-edit`（複数は `rebase origin/develop --exec ...`） | 対象が自分のコミットだけ |
| 5. push | `git push`（push 前のケース） | `[ahead N]` で force が不要なこと |
| 6. push 済みなら | 書き換える前に Aさん・リーダーに相談 | 共有ブランチは書き換えない |
| 7. 後片付け | 他人の認証情報の削除、`user.useConfigOnly true` | `git var GIT_AUTHOR_IDENT` が自分 |

## チェックリスト

- [ ] `git config --show-origin --show-scope --get-all user.name` で、global・local とも自分の名前になっている
- [ ] `git var GIT_AUTHOR_IDENT` が自分の名前とメールになっている
- [ ] 他人の設定から、`user.*`・`credential.*`・ID やパスワード入りの URL / プロキシを持ち込んでいない
- [ ] 作業前に `backup/...` ブランチを作った
- [ ] Amend だった場合は `git reset --soft HEAD@{1}` で戻し、Aさんのコミットが元のハッシュのまま残っている
- [ ] push を断られても `git pull` や `git push --force` をしていない
- [ ] `--reset-author` は自分が書いたコミットだけに使った
- [ ] `.mailmap` で他人名義のコミットをごまかしていない
- [ ] push 済みの共有ブランチは書き換えず、Aさん・リーダーに相談した
- [ ] Git GUI のコミット欄の見出しが「コミットメッセージ:」（新規コミット）になっている
- [ ] `git config --global user.useConfigOnly true` を設定した

## まとめ

- **作者が他人になったら設定、日時まで同じなら Amend を疑います。** Git のコミットには作者とコミッターの2組の名前・日時があり、Amend は作者と作者日時を引き継ぎます。
- **他人の git config は丸ごとマージしません。** `git config --global --list` で一覧にして比べ、チーム共通の設定だけを `git config` で1つずつ足します。`user.*` と認証情報は写しません。
- **push 前なら `git reset --soft HEAD@{1}` で Amend を取り消して、新規コミットでやり直せます。** pull してしまったら `git reset --soft origin/ブランチ`、作者だけ違うなら `--reset-author` です。
- **push 済みの共有ブランチは、自分で force push しません。** 書き換えるかどうかは Aさんとチームで決め、書き換えないなら記録で補足します。

履歴の書き換え（rebase -i・reword）と force push の安全な使い方は「[Git Bash で知らぬ間に pull していた？ 10個以上前の雑なコミットメッセージを直す手順](/articles/git-unexpected-pull-reword-old-commit/)」に、Git の基本コマンド・取り消し方・エラー対応は「[Git 技術まとめ](/technology/git/guide/)」にまとめています。
