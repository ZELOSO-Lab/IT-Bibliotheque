---
title: Git 技術まとめ
slug: git
excerpt: Gitの基本用語と仕組み、Windowsでのインストールと初期設定（改行コード・日本語ファイル名・認証）、目的別の基本操作コマンド早見表と日常で使うコマンド、履歴の書き換え（過去のコミットメッセージの修正、他人名義になったコミットの修正）、ブランチ運用やコンフリクト解消のサンプル、よくあるエラーの対処、事故を防ぐ実務TipsとSVNからの移行の要点までを1ページにまとめました。
updated: 2026-11-14
---

# Git 技術まとめ

## 基礎

Git は、各自の PC に**リポジトリの全履歴を複製して**作業する分散型のバージョン管理システムです。コミットはまず手元に記録され、`git push` で GitHub・GitLab・Bitbucket・社内サーバーなどのリモートリポジトリに共有します。

### 主な用途

- ソースコードの管理とチーム開発（プルリクエスト / マージリクエストによるレビュー）
- ブランチを使った並行開発・リリース管理
- 変更履歴の調査（いつ・誰が・なぜ変えたか）
- CI/CD（自動テスト・自動デプロイ）の起点

### まず押さえる用語

| 用語 | 意味 | 現場での注意点 |
| --- | --- | --- |
| 作業ツリー | 実際に編集しているファイル | `git status` で状態を確認する |
| ステージ（インデックス） | 次のコミットに含める変更を置く場所 | `git add` で載せる。載せ忘れはコミットされない |
| コミット | 変更の記録。ハッシュ値（`a1b2c3d`）で識別 | 手元に記録されるだけ。push するまで共有されない |
| ブランチ | コミットを指す名札（ポインタ） | 作成・切り替えは一瞬。気軽に作ってよい |
| HEAD | 今いるブランチ（コミット）を指す | 「detached HEAD」はブランチ外にいる状態 |
| リモート / origin | 共有先のリポジトリ。`origin` は既定の名前 | `git remote -v` で URL を確認 |
| リモート追跡ブランチ | `origin/main` など、最後に fetch した時点のリモートの状態 | 自動では最新にならない。`git fetch` で更新 |
| マージ / リベース | ブランチの変更を統合する方法 | 共有済みのブランチはリベースしない |

### 3つの場所と流れ

```text
作業ツリー --git add--> ステージ --git commit--> ローカルリポジトリ --git push--> リモート
     ^                                                  |                       |
     +-------------- git switch / git restore ----------+  <---- git fetch -----+
```

`git pull` は `git fetch`（取得）と `git merge`（または `git rebase`）をまとめて実行するコマンドです。

### SVN との違い（SVN 経験者向け）

| SVN | Git | 補足 |
| --- | --- | --- |
| `svn checkout` | `git clone` | Git は全履歴を取得する |
| `svn update` | `git pull` | |
| `svn commit` | `git add` → `git commit` → `git push` | Git はコミットと共有が別 |
| `svn revert` | `git restore` | |
| `svn copy`（ブランチ） | `git switch -c` | Git のブランチはフォルダではない |
| `svn log` / `svn blame` | `git log` / `git blame` | |
| リビジョン番号 | コミットハッシュ | 連番ではない |

SVN 側の操作は「SVN」「Apache Subversion」「TortoiseSVN」の各ページを参照してください。

## 環境構築

### 1. インストール

| OS | 方法 |
| --- | --- |
| Windows | Git for Windows をインストール（Git Bash・Git Credential Manager が同梱） |
| macOS | `xcode-select --install`、または `brew install git` |
| Ubuntu / Debian | `sudo apt install git` |
| RHEL / Rocky / Alma | `sudo dnf install git` |

Git for Windows のインストーラーでは、エディタ（VS Code など）、既定のブランチ名（`main`）、改行コードの扱いを選べます。迷ったら改行コードは「Checkout Windows-style, commit Unix-style line endings」（`core.autocrlf=true`）のままで構いません。

### 2. 初期設定

```sh
git config --global user.name "Yamada Taro"
git config --global user.email "taro.yamada@example.co.jp"
git config --global init.defaultBranch main
git config --global core.quotepath false      # 日本語ファイル名を \346\227... と表示させない
git config --global pull.rebase false         # pull はマージで統合（チームの方針に合わせる）
git config --global pull.ff only              # 早送りできないときは pull を止める（知らぬ間のマージを防ぐ）
git config --global core.editor "code --wait" # コミットメッセージを VS Code で書く
git config --global --list                    # 設定の確認
git var GIT_AUTHOR_IDENT                      # 次にコミットしたときの作者（名前 <メール>）
```

`user.name` / `user.email` はコミットの作者として記録されます。**他人の `.gitconfig` を丸ごとコピー・マージしない**でください（コミットが他人名義になります）。比べるときは `git config --global --list` の一覧で比べ、必要な項目だけを `git config` で設定します。`git config --global user.useConfigOnly true` にすると、名前が未設定のときに PC 名から推測せずコミットを止めます。

Windows 環境で追加しておくと良い設定:

```sh
git config --global core.autocrlf true        # チェックアウト時 CRLF、コミット時 LF
git config --global core.longpaths true       # 260文字を超えるパスを扱う
git config --global credential.helper manager # Git Credential Manager で認証情報を保存
```

社内プロキシや社内CAがある場合:

```sh
git config --global http.proxy http://proxy.example.co.jp:8080
git config --global http.sslBackend schannel  # Windows の証明書ストアを使う（Git for Windows）
```

### 3. 認証の準備

| 方式 | 設定 | 注意点 |
| --- | --- | --- |
| HTTPS | 初回 push 時にブラウザーまたはトークンで認証。Git Credential Manager が保存 | GitHub はパスワード認証不可。個人アクセストークンか GCM を使う |
| SSH | `ssh-keygen -t ed25519 -C "メール"` で鍵を作り、公開鍵をサービスに登録 | 社内ネットワークでは 22 番ポートが閉じていることが多い |

```sh
ssh-keygen -t ed25519 -C "taro.yamada@example.co.jp"
cat ~/.ssh/id_ed25519.pub        # この内容を GitHub / GitLab に登録
ssh -T git@github.com            # 接続テスト
```

### 4. 動作確認

```sh
git --version
git clone https://github.com/example/project.git
cd project
git status
git log --oneline -5
```

## コマンド

### 目的別の基本操作コマンド早見表

迷ったら、まずこの表から探してください。各コマンドの詳しい使い方は下の各節にあります。

| やりたいこと | コマンド | ひとこと |
| --- | --- | --- |
| リポジトリを手元に複製 | `git clone URL` | フォルダ名を変えるなら `git clone URL 名前` |
| 新しくリポジトリを作る | `git init` | 既存フォルダを Git 管理にする |
| 今の状態を確認 | `git status` | 迷ったらまずこれ。`-sb` で短く表示 |
| 変更内容を見る | `git diff` / `git diff --staged` | ステージ前 / ステージ後 |
| コミットに含める | `git add ファイル` / `git add -p` | `-p` は変更の塊ごとに選べる |
| コミットする | `git commit -m "メッセージ"` | 1コミット1目的 |
| 履歴を見る | `git log --oneline --graph -20` | 全ブランチは `--all` |
| リモートの変更を取得（作業は変えない） | `git fetch` | 取り込む前に中身を確認できる |
| リモートの変更を取り込む | `git pull` | fetch + merge（または rebase） |
| リモートに送る | `git push` | 初回は `git push -u origin ブランチ名` |
| ブランチを作って切り替え | `git switch -c feature/x` | 元にした地点は今いるコミット |
| ブランチを切り替え | `git switch main` | 未コミットの変更は持ち越される |
| ブランチを統合 | `git merge feature/x` | 今いるブランチに取り込む |
| 作業中の変更を一時退避 | `git stash` / `git stash pop` | 急な割り込み対応に |
| 変更を破棄 | `git restore ファイル` | 元に戻せない |
| ステージを解除 | `git restore --staged ファイル` | 変更は残る |
| 直前のコミットを修正 | `git commit --amend` | push 前だけ |
| 古いコミットのメッセージを修正 | `git rebase -i -r ハッシュ^` → `reword` | push 済みなら force push が必要 |
| push 済みのコミットを打ち消す | `git revert ハッシュ` | 履歴を書き換えないので安全 |
| 誤操作の前に戻す | `git reflog` → `git reset --hard HEAD@{n}` | コミットしたものはほぼ取り戻せる |
| 誰がその行を変えたか | `git blame ファイル` | `-L 10,20` で行範囲を指定 |
| 特定のコミットだけ取り込む | `git cherry-pick ハッシュ` | 別ブランチの修正を移す |

### 基本の流れ

```sh
git status                         # 状態確認（迷ったらまずこれ）
git add src/login.ts               # ステージ
git add .                          # カレント以下をすべてステージ
git add -p                         # 変更を塊ごとに選んでステージ
git commit -m "ログイン画面に入力チェックを追加"
git push origin main
git pull                           # リモートの変更を取り込む
```

### ブランチ

```sh
git switch -c feature/login        # 作成して切り替え
git switch main                    # 切り替え
git switch -c hotfix origin/main   # リモートの main から作成
git branch -a                      # 一覧（リモート含む）
git branch -vv                     # 追跡先と進み・遅れを表示
git merge feature/login            # 今のブランチに取り込む
git merge --no-ff feature/login    # 必ずマージコミットを作る
git branch -d feature/login        # マージ済みブランチを削除
git push -u origin feature/login   # 初回 push と追跡設定
git push origin --delete feature/login   # リモートブランチを削除
git fetch --prune                  # 消えたリモートブランチの追跡を掃除
```

### リモートとの同期（fetch / pull / push）

```sh
git remote -v                      # リモートの URL を確認
git fetch                          # リモートの最新を取得（作業ブランチは変わらない）
git status                         # 「ahead N」= 未 push、「behind N」= 未取り込み
git log --oneline HEAD..origin/main   # リモートにあって手元にないコミット
git log --oneline origin/main..HEAD   # 手元にあってリモートにないコミット（未 push）
git merge origin/main              # 確認してから取り込む（マージ）
git rebase origin/main             # 確認してから取り込む（自分のコミットを付け直す。未 push のときだけ）
git pull --ff-only                 # 早送りできるときだけ取り込む
git pull --rebase                  # 未 push の自分のコミットを最新の上に付け直す
git push -u origin feature/x       # 初回 push と追跡設定
git push --force-with-lease --force-if-includes   # 履歴を書き換えたあとの上書き（自分のブランチだけ）
```

`git pull` は fetch と merge を一度に行うため、**ローカルとリモートが分岐していると、知らないうちにマージコミットができます**。`git fetch` → 確認 → `merge` / `rebase` の順に分けるか、`pull.ff only` を設定しておくと事故が減ります。

### 履歴・差分

```sh
git log --oneline --graph --all -20   # 全ブランチの流れ
git log -p src/login.ts               # ファイルの変更履歴と差分
git log --author="Yamada" --since="2 weeks ago"
git log -S "calcTax"                  # その文字列を追加・削除したコミットを検索
git diff                              # 作業ツリーとステージの差分
git diff --staged                     # ステージとコミットの差分（コミット予定の内容）
git diff main...feature/login         # 分岐してからの feature 側の変更
git show a1b2c3d                      # 特定コミットの内容
git blame src/login.ts                # 行ごとの最終変更者
git grep "TODO"                       # 管理下のファイルを検索
```

### 取り消し

| やりたいこと | コマンド | 注意点 |
| --- | --- | --- |
| 作業ツリーの変更を破棄 | `git restore file.txt` | 元に戻せない |
| ステージを解除 | `git restore --staged file.txt` | 変更自体は残る |
| ファイルを過去の版に戻す | `git restore --source=HEAD~1 file.txt` | |
| 直前のコミットを修正 | `git commit --amend` | **push 前だけ**。作者と作者日時は元のまま |
| 直前のコミットの作者を自分にする | `git commit --amend --reset-author --no-edit` | 自分が書いたコミットだけに使う |
| 間違えた amend を取り消す | `git reset --soft HEAD@{1}` | 自分の変更はステージに残る |
| 直前のコミットを取り消して変更は残す | `git reset --soft HEAD~1` | push 前だけ |
| push 済みのコミットを打ち消す | `git revert a1b2c3d` | 打ち消しコミットを作るので安全 |
| 管理外のファイルを削除 | `git clean -n`（確認）→ `git clean -fd` | `-n` で必ず先に確認 |
| 消したコミットを探す | `git reflog` | 約90日分の HEAD の移動履歴 |

### 履歴を整える（push 前の自分のブランチ）

`git rebase -i` は、コミットの並び（ToDo リスト）をエディターで編集して履歴を作り直します。**push 前の自分のブランチ**に使うのが原則です。

```sh
git rebase -i HEAD~3               # 直近3コミットを編集
git rebase -i -r a1b2c3d^          # a1b2c3d から後を編集（途中のマージを残す）
git rebase --continue              # 止まった（コンフリクト・メッセージ編集）ところから再開
git rebase --abort                 # 開始前に戻す
git reset --hard ORIG_HEAD         # 完了した rebase を取り消す
```

| ToDo の命令 | 略記 | 意味 |
| --- | --- | --- |
| `pick` | `p` | そのまま使う |
| `reword` | `r` | 中身はそのまま、**メッセージだけ直す** |
| `edit` | `e` | そこで止めて、中身を修正（`git commit --amend` → `--continue`） |
| `squash` | `s` | 1つ前のコミットにまとめ、メッセージも合わせて編集 |
| `fixup` | `f` | 1つ前のコミットにまとめ、メッセージは捨てる |
| `drop` | `d` | コミットを削除 |
| `merge -C` / `merge -c` | | `-r` のときのマージ。`-c` にするとマージのメッセージを編集できる |

- 途中にマージコミットがあるときは **`-r`（`--rebase-merges`）を付けます**。付けないとマージが消え、取り込んだ他人のコミットまで作り直されます
- 起点はマージがあると `HEAD~N` で数えにくいので、`git log --oneline --graph` でハッシュを確認し `ハッシュ^` で指定します
- エディターで書くメッセージは、`#` で始まる行がコメントとして捨てられます。チケット番号は `(#120)` のように末尾に書くか、`git config --global core.commentChar ";"` にします

### 一時退避・タグ・その他

```sh
git stash push -m "作業途中"       # 変更を退避
git stash list
git stash pop                      # 戻して退避を削除
git cherry-pick a1b2c3d            # 特定コミットだけ取り込む
git tag -a v1.0.0 -m "リリース 1.0.0"
git push origin v1.0.0
git remote -v                      # リモートの URL
git remote set-url origin https://git.example.co.jp/team/project.git
git config --global --list         # 設定の一覧
git config --show-origin pull.ff   # その設定がどのファイルに書かれているか
git config --show-origin --show-scope --get-all user.name   # global / local のどちらに書かれているか
git config --global alias.lg "log --oneline --graph --all -20"   # エイリアス（git lg）
```

## サンプル

### ブランチを切って開発し、プルリクエストを出す

```sh
git switch main
git pull
git switch -c feature/1234-login-validation
# ...編集...
git add -p
git commit -m "#1234 ログインIDの桁数チェックを追加"
git push -u origin feature/1234-login-validation
# → GitHub / GitLab でプルリクエスト（マージリクエスト）を作成
```

レビュー中に main が進んだら、自分のブランチに取り込みます。

```sh
git fetch origin
git merge origin/main           # 共有ブランチなのでマージで取り込む
git push
```

### コンフリクトを解消する

```sh
git merge origin/main
# CONFLICT (content): Merge conflict in src/login.ts
# Automatic merge failed; fix conflicts and then commit the result.
git status                      # both modified: のファイルを確認
```

```text
<<<<<<< HEAD
const MAX_LENGTH = 20;
=======
const MAX_LENGTH = 32;
>>>>>>> origin/main
```

1. `<<<<<<<` 〜 `>>>>>>>` を正しい内容に書き換え、記号の行を消す
2. `git add src/login.ts`
3. ビルド・テスト後に `git commit`（メッセージは自動で入る）

やり直したいときは `git merge --abort`（リベース中なら `git rebase --abort`）で開始前に戻せます。片方を丸ごと採用するなら `git checkout --ours ファイル` / `git checkout --theirs ファイル` のあと `git add` します。

### .gitignore と .gitattributes（Windows 混在チーム向け）

```gitignore
# .gitignore
bin/
obj/
.vs/
*.user
node_modules/
dist/
.env
*.log
~$*
Thumbs.db
```

```gitattributes
# .gitattributes：改行コードをリポジトリ側で統一する
* text=auto eol=lf
*.bat text eol=crlf
*.cmd text eol=crlf
*.xlsx binary
*.docx binary
*.png binary
```

`.gitattributes` を置くと、各自の `core.autocrlf` の設定に関係なく改行コードが揃います。

### 間違えて main に直接コミットした（push 前）

```sh
git switch -c feature/fix-typo   # 今のコミットごと新ブランチを作る
git switch main
git reset --hard origin/main     # main をリモートと同じ状態に戻す
```

### 10個以上前のコミットメッセージを直す（push 済みの自分のブランチ）

```sh
git branch backup/feature-120           # 失敗しても戻れるように保存
git log --oneline --graph -15           # 直したいコミットのハッシュ（例: 1107db0）を確認
git rebase -i -r 1107db0^               # その親から rebase。マージがあっても -r で残す
# エディターで  pick 1107db0 あ  →  reword 1107db0 あ  に変えて保存
# 次の画面で新しいメッセージを書いて保存（先頭を # にしない）
git diff backup/feature-120             # 何も出なければ中身は変わっていない
git push --force-with-lease --force-if-includes
```

main など共有ブランチに入ったコミットは書き換えません。原因の調べ方（知らぬ間の pull）、8つのハマりどころ、チームへの連絡方法は記事「[Git Bash で知らぬ間に pull していた？ 10個以上前の雑なコミットメッセージを直す手順](/articles/git-unexpected-pull-reword-old-commit/)」にまとめています。

### コミットが同僚の名前・同じ日時になった（push 前）

同僚の git config を自分の設定にマージしたあと、Git GUI でコミットしたら作者が同僚になった、というケースです。作者が他人なら `user.name` / `user.email` の上書き、**日時まで同僚のコミットと同じなら「最新コミットを訂正」（Amend）**で同僚のコミットを作り直しています。

```sh
git log -3 --format='%h 作者=%an %ad コミッター=%cn %cd %s'   # 作者日時が元のコミットと同じなら Amend
git reflog -3                                    # commit (amend) の1つ下が Amend 前
git config --global user.name "Yamada Taro"      # 先に自分の名前に戻す（local にもあれば --unset）
git config --global user.email "taro.yamada@example.co.jp"
git branch backup/before-fix
git reset --soft HEAD@{1}                        # Amend を取り消す（変更はステージに残る）
git commit -m "#215 受注一覧に件数表示を追加"     # 新規コミットとしてやり直す
```

Git GUI では、コミット欄右上の「最新コミットを訂正」のチェック（Ctrl+E）を外し、見出しが「コミットメッセージ:」になっていることを確認してからコミットします。push を断られて pull した場合、作者だけが違う場合、push 済みの場合の直し方と、他人の設定から持ち込んではいけない項目は記事「[同僚の git config をマージしたら、コミットが同僚の名前・同じ日時になった](/articles/git-config-merge-commit-as-coworker/)」にまとめています。

### SVN リポジトリを Git に移行する

```sh
# authors.txt：SVN ユーザー名 = 名前 <メール>
# yamada = Yamada Taro <taro.yamada@example.co.jp>
git svn clone https://svn.example.com/repos/project \
  --stdlayout --authors-file=authors.txt project-git
cd project-git
git branch -a                    # SVN のブランチ・タグは remotes/origin/... として取り込まれる
git remote add origin https://git.example.co.jp/team/project.git
git push -u origin main
```

`git svn` は環境によって別パッケージ（Ubuntu は `git-svn`）です。履歴が長いと数時間かかるため、事前に小さなリポジトリで試します。

## エラー対応

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `! [rejected] main -> main (fetch first)` / `error: failed to push some refs to` | リモートに自分が持っていないコミットがある | `git pull` で取り込んでから再 push |
| `! [rejected] main -> main (non-fast-forward)` | amend や reset でローカル履歴を書き換えた | 共有ブランチなら `git pull` で統合。自分専用ブランチなら `git push --force-with-lease` |
| `fatal: Need to specify how to reconcile divergent branches.` | pull の統合方法が未設定でローカルとリモートが分岐 | `git pull --no-rebase`（マージ）か `--rebase`。恒久的には `git config --global pull.rebase false` |
| `fatal: Not possible to fast-forward, aborting.` | `pull.ff only` の設定で、分岐したブランチの pull を止めた（正常な動作） | `git fetch` で状況を確認し、`git merge origin/main` か `git rebase origin/main` を選ぶ |
| `! [rejected] ... (stale info)` | `--force-with-lease` で push したが、最後に fetch した後に誰かが push していた | 上書きせず `git fetch`。同僚のコミットを取り込んでから書き換えをやり直す |
| `! [rejected] ... (remote ref updated since checkout)` | `--force-if-includes` が、fetch しただけで取り込んでいないコミットを検知 | 同上。自動 fetch する IDE で起きやすい |
| `Aborting commit due to empty commit message.` | メッセージが空。エディターで `#` から書き始めた行はコメントとして捨てられる | `git commit --amend -m "メッセージ"`（rebase 中なら続けて `git rebase --continue`） |
| `error: There was a problem with the editor 'vi'.` | エディターを `:cq` などエラーで閉じた | マージ中なら `git merge --abort`、rebase 中なら `git rebase --abort` で戻す |
| `fatal: refusing to merge unrelated histories` | 履歴が無関係なリポジトリ同士（README 付きで作ったリモートなど）を統合 | 意図どおりなら `git pull origin main --allow-unrelated-histories` |
| `CONFLICT (content): Merge conflict in ...` | 同じ箇所を双方で変更 | 上記「コンフリクトを解消する」の手順 |
| `error: Your local changes to the following files would be overwritten by merge:` | 未コミットの変更があるファイルを pull が書き換えようとした | `git stash` → `git pull` → `git stash pop`、またはコミットしてから pull |
| `fatal: not a git repository (or any of the parent directories): .git` | リポジトリの外で実行 | `cd` でリポジトリ内に移動 |
| `fatal: The current branch feature has no upstream branch.` | 新しいブランチを初めて push | `git push -u origin feature` |
| `error: pathspec '...' did not match any file(s) known to git` | ファイル名・ブランチ名の誤り、リモートブランチ未取得 | 名前を確認。ブランチなら `git fetch` してから再実行 |
| `error: the branch '...' is not fully merged.` | マージしていないブランチを `-d` で削除しようとした | 不要と確認できたら `git branch -D` |
| `fatal: Unable to create '.../.git/index.lock': File exists.` | 別の Git 処理が実行中、または異常終了の残骸 | Git を使うツール（IDE など）を閉じ、残っていれば `.git/index.lock` を削除 |
| `You are in 'detached HEAD' state.` | タグや過去のコミットを直接チェックアウトした | 戻るなら `git switch main`。作業を残すなら `git switch -c 新ブランチ` |
| `Author identity unknown` / `*** Please tell me who you are.` | `user.name` / `user.email` が未設定 | 「初期設定」の `git config` を実行 |
| エラーは出ないが、コミットの作者が他人になる | 他人の `.gitconfig` の `[user]` をコピーした、Git GUI の「最新コミットを訂正」で他人のコミットを作り直した | `git config --show-origin --show-scope --get-all user.name` で確認。直し方は上記サンプル |
| `fatal: Authentication failed for 'https://...'` | パスワード認証（GitHub は不可）、トークンの期限切れ | 個人アクセストークンを使う。Windows は「資格情報マネージャー」の古い情報を削除 |
| `Permission denied (publickey).` | SSH 公開鍵が未登録、別の鍵を使っている | `ssh -T git@github.com` で確認、`~/.ssh/config` で鍵を指定 |
| `SSL certificate problem: unable to get local issuer certificate` | 社内プロキシによる SSL 検査、社内CA | Windows は `git config --global http.sslBackend schannel`。それ以外は `http.sslCAInfo` に社内CA証明書を指定 |
| `fatal: detected dubious ownership in repository at '...'` | リポジトリの所有者が実行ユーザーと異なる（共有フォルダ・別ユーザーで clone） | 内容を確認のうえ `git config --global --add safe.directory パス` |
| `Filename too long` | Windows のパス長制限 | `git config --global core.longpaths true`、浅いフォルダで clone |
| `warning: in the working copy of '...', LF will be replaced by CRLF the next time Git touches it` | `core.autocrlf=true` による改行変換の予告 | 動作上は問題ない。`.gitattributes` で改行方針を統一すると出なくなる |

**`--force` は使わない**: リモートを強制上書きすると他人のコミットを消します。どうしても必要なら、他人の push を検知して止まる `git push --force-with-lease` を使い、共有ブランチ（main / develop）では使いません。

## 実務Tips

### 事故を防ぐ習慣

- 作業前に `git status` と `git branch` で**今どのブランチにいるか**を確認する。プロンプトにブランチ名を表示すると取り違えが減る
- コミット前に `git diff --staged` を見る。`git add .` で不要ファイル（`.env`・ログ・個人設定）を混ぜない
- **push 済みのコミットは書き換えない**（amend・rebase・reset しない）。取り消しは `git revert`
- `git pull` でエディター（Git Bash では vim）が開いたら、それはマージコミットのメッセージ入力。`:wq` でも `:q` でもマージが確定する。やめるなら `:cq` → `git merge --abort`
- 動いている人の設定を参考にするときは、`.gitconfig` を丸ごとコピーしない。`user.*`・認証情報（`credential.*`、ID・パスワード入りの URL やプロキシ）は写さず、必要な項目だけ `git config` で設定する
- 失敗したと思ったら、慌てて操作を重ねる前に `git reflog` を見る。コミットしたものはほぼ確実に取り戻せる
- パスワード・APIキーを誤ってコミットしたら、履歴から消すより先に**キーを無効化（ローテーション）**する。push 済みなら複製されている前提で動く

### コミットとブランチの運用

- 1コミット1目的。メッセージの1行目に「何をしたか」、チケット番号を入れる（例: `#1234 ログインIDの桁数チェックを追加`）
- main への直接 push はリポジトリ設定（ブランチ保護）で禁止し、プルリクエスト経由にする
- ブランチ名は `feature/1234-説明`・`fix/...`・`hotfix/...` のように種類と番号で揃える
- 長生きするブランチほどコンフリクトが増える。こまめに main を取り込み、小さく早くマージする
- マージ済みブランチは削除し、`git fetch --prune` で手元も掃除する

### Windows・日本語環境の注意点

- 改行コードは `.gitattributes` で統一する。`core.autocrlf` を人ごとにバラバラにすると、全行差分のコミットが発生する
- Excel・Word・画像などのバイナリは差分もマージもできない。大きなファイルや頻繁に変わるバイナリは Git LFS か別の管理方法を検討する
- 大文字・小文字だけのファイル名変更（`Readme.md` → `README.md`）は Windows では認識されにくい。`git mv Readme.md README.md` を使う
- 共有フォルダ（ネットワークドライブ）上にリポジトリを置かない。ロックや `dubious ownership` の原因になる
- 社内CA・プロキシ環境では、Git だけでなく npm・pip なども同じ問題が起きる。設定方法をチームの手順書にまとめておく

### SVN から移行するチームへ

- SVN の「コミット＝即共有」に慣れていると **push 忘れ**が起きやすい。最初は「commit したら push」をセットで覚える
- SVN のロック運用（Excel 設計書など）は Git にはそのまま移せない。設計書は SVN や共有ストレージに残す判断も現実的
- いきなり全面移行せず、新規案件から Git にし、既存システムは `git svn` で履歴ごと移行してから切り替える

## 関連リンク

- [Git 公式ドキュメント](https://git-scm.com/doc)
- [Pro Git（日本語版）](https://git-scm.com/book/ja/v2)
- [Git コマンドリファレンス](https://git-scm.com/docs)
- [Git ダウンロード](https://git-scm.com/downloads)
- [git-svn リファレンス](https://git-scm.com/docs/git-svn)
- [gitattributes リファレンス](https://git-scm.com/docs/gitattributes)
