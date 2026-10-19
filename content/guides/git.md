---
title: Git 技術まとめ
slug: git
excerpt: Gitの基本用語と仕組み、Windowsでのインストールと初期設定（改行コード・日本語ファイル名・認証）、日常で使うコマンド、ブランチ運用やコンフリクト解消のサンプル、よくあるエラーの対処、事故を防ぐ実務TipsとSVNからの移行の要点までを1ページにまとめました。
updated: 2026-10-19
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
git config --global core.editor "code --wait" # コミットメッセージを VS Code で書く
git config --global --list                    # 設定の確認
```

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
| 直前のコミットを修正 | `git commit --amend` | **push 前だけ** |
| 直前のコミットを取り消して変更は残す | `git reset --soft HEAD~1` | push 前だけ |
| push 済みのコミットを打ち消す | `git revert a1b2c3d` | 打ち消しコミットを作るので安全 |
| 管理外のファイルを削除 | `git clean -n`（確認）→ `git clean -fd` | `-n` で必ず先に確認 |
| 消したコミットを探す | `git reflog` | 約90日分の HEAD の移動履歴 |

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
