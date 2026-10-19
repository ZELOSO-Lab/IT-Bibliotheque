---
title: GitHub 技術まとめ
slug: github
excerpt: GitHubの基本用語とPull Requestの流れ、Git for Windows・SSH鍵・PAT・GitHub CLIの初期設定、よく使うgit / ghコマンド、GitHub Actionsのワークフロー例、push時のよくあるエラーと対処、チーム運用の実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# GitHub 技術まとめ

## 基礎

GitHubは、Gitリポジトリをインターネット上（または社内の GitHub Enterprise Server）でホスティングし、**Pull Request によるコードレビュー**、**Issue による課題管理**、**GitHub Actions による CI/CD** をまとめて提供するサービスです。Git そのものは手元で動くバージョン管理ツールで、GitHub はその「共有置き場＋コラボレーション機能」と考えると整理しやすくなります。

### まず押さえる用語

| 用語 | 意味 | 現場での注意点 |
| --- | --- | --- |
| リポジトリ | ソースと履歴の入れ物。`owner/repo` の形で指定する | Public / Private / Internal（組織内公開）を作成時に必ず確認する |
| Organization | チームや会社単位でリポジトリと権限をまとめる単位 | 業務のリポジトリは個人アカウントではなく Organization 配下に置く |
| ブランチ | 作業の枝。既定ブランチは多くの場合 `main` | 古いリポジトリは `master` のこともある |
| Pull Request（PR） | ブランチの変更を取り込んでもらうための依頼とレビューの場 | GitLab の「マージリクエスト（MR）」と同じもの |
| フォーク | 他人のリポジトリを自分のアカウントに丸ごとコピーしたもの | OSS への貢献で使う。社内では同一リポジトリ内のブランチ運用が多い |
| Issue | 課題・バグ・要望のチケット | `#12` で参照、PR 本文の `Closes #12` で自動クローズ |
| GitHub Actions | リポジトリに置いた YAML で動く CI/CD | `.github/workflows/*.yml` に置く |
| ブランチ保護 / ルールセット | `main` への直接 push 禁止、レビュー必須などの制約 | 「push できない」の原因になることが多い |

### Pull Request の基本の流れ

1. `main` を最新にして、作業用ブランチを切る（`git switch -c feature/login`）
2. 変更してコミットし、ブランチを push する（`git push -u origin feature/login`）
3. GitHub 上または `gh pr create` で PR を作る。レビュアーを指定する
4. Actions の CI が通り、レビューで Approve をもらう
5. マージする（Merge commit / Squash and merge / Rebase and merge のどれかをチームで決めておく）
6. 作業ブランチを削除し、手元の `main` を `git pull` で更新する

### マージ方式の違い

| 方式 | 履歴の残り方 | 向いている場面 |
| --- | --- | --- |
| Create a merge commit | ブランチのコミットがすべて残り、マージコミットが1つ増える | 履歴をそのまま残したい |
| Squash and merge | PR のコミットを1つにまとめて取り込む | 「fix typo」のような細かいコミットを残したくない（多くのチームの標準） |
| Rebase and merge | コミットを1つずつ `main` の先頭に付け替える | 履歴を一直線に保ちたい |

## 環境構築

### 1. Git をインストールして初期設定する

Windows は **Git for Windows** をインストールします（Git Bash と、HTTPS 認証用の Git Credential Manager が同梱されています）。`winget install --id Git.Git -e` でも入ります。

```sh
git --version
git config --global user.name "Yamada Taro"
git config --global user.email "taro@example.com"   # GitHub に登録したメールアドレス
git config --global init.defaultBranch main
git config --global core.autocrlf true    # Windows。macOS / Linux は input
git config --list --show-origin           # 設定の確認と、どのファイルに書かれているか
```

### 2. 認証方式を決める

2021年8月以降、**Git 操作でアカウントのパスワードは使えません**。HTTPS なら PAT（Personal Access Token）か Git Credential Manager のブラウザー認証、または SSH 鍵を使います。

| 方式 | URL の形 | 特徴 |
| --- | --- | --- |
| HTTPS ＋ Git Credential Manager | `https://github.com/owner/repo.git` | 初回にブラウザーでサインインするだけ。Windows で一番手軽 |
| HTTPS ＋ PAT | 同上 | トークンをパスワード欄に入力する。fine-grained token なら対象リポジトリと権限を絞れる |
| SSH 鍵 | `git@github.com:owner/repo.git` | 社内プロキシで 22 番ポートが塞がれていることがある |

### 3. SSH 鍵を作って登録する

```powershell
# Windows（PowerShell）。Git Bash でも同じ ssh-keygen が使える
ssh-keygen -t ed25519 -C "taro@example.com"
# 保存先はそのまま Enter（%USERPROFILE%\.ssh\id_ed25519）、パスフレーズを設定

# ssh-agent を自動起動にして鍵を登録（管理者 PowerShell）
Get-Service ssh-agent | Set-Service -StartupType Automatic
Start-Service ssh-agent
ssh-add $env:USERPROFILE\.ssh\id_ed25519

# 公開鍵をクリップボードへ → GitHub の Settings → SSH and GPG keys に貼る
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | Set-Clipboard
```

```sh
ssh -T git@github.com
# Hi taro! You've successfully authenticated, but GitHub does not provide shell access.
```

### 4. GitHub CLI（gh）を入れる

```sh
winget install --id GitHub.cli -e    # Windows
gh --version
gh auth login                        # GitHub.com → HTTPS か SSH → ブラウザーで認証
gh auth status                       # ログイン中のアカウントとスコープを確認
```

`gh auth login` で HTTPS を選ぶと、git の認証情報ヘルパーも gh が設定してくれます。

## コマンド

### 日常の git 操作

```sh
git clone https://github.com/owner/repo.git
git switch main && git pull                  # main を最新に
git switch -c feature/login                  # ブランチ作成＋切り替え
git add -p                                   # 差分を確認しながらステージ
git commit -m "ログイン画面の入力チェックを追加"
git push -u origin feature/login             # 初回 push（上流ブランチを設定）
git fetch --prune                            # 削除済みリモートブランチの追跡を掃除
git remote -v                                # リモート URL の確認
git remote set-url origin git@github.com:owner/repo.git   # HTTPS → SSH に切り替え
```

### 早見表：リポジトリ

| 操作 | コマンド・構文 |
| --- | --- |
| クローン | `git clone https://github.com/owner/repo.git` |
| フォーク後の上流追加 | `git remote add upstream https://github.com/owner/repo.git` |
| 上流の取り込み | `git fetch upstream && git merge upstream/main` |
| SSH 確認 | `ssh -T git@github.com` |
| Issue を閉じる | `git commit -m "Fix bug (fixes #12)"` |

### GitHub CLI（gh）

| 操作 | コマンド |
| --- | --- |
| ログイン / 状態確認 | `gh auth login` / `gh auth status` |
| リポジトリ作成 | `gh repo create my-app --private` |
| 既存フォルダーから作成して push | `gh repo create my-app --private --source=. --push` |
| クローン | `gh repo clone owner/repo` |
| ブラウザーで開く | `gh browse` |
| PR 作成 | `gh pr create --fill`（コミットからタイトルと本文を作る） |
| 下書き PR | `gh pr create --draft --base main --title "..." --body "..."` |
| PR 一覧 / 自分関連 | `gh pr list` / `gh pr status` |
| PR をローカルに取得 | `gh pr checkout 34` |
| PR の差分 / 詳細 | `gh pr diff 34` / `gh pr view 34 --web` |
| レビュー | `gh pr review 34 --approve` / `gh pr review 34 --request-changes -b "理由"` |
| マージ | `gh pr merge 34 --squash --delete-branch` |
| Issue 作成 / 一覧 | `gh issue create --title "..." --body "..."` / `gh issue list --assignee @me` |
| Actions の実行一覧 | `gh run list` |
| 実行を見守る / 失敗ログ | `gh run watch` / `gh run view <run-id> --log-failed` |
| 手動実行 | `gh workflow run deploy.yml -f env=stg` |
| シークレット登録 | `gh secret set API_KEY`（値は対話入力） |

### 早見表：Actions の構文

| 項目 | 書き方 |
| --- | --- |
| トリガー | `on: push`、`on: pull_request`、`on: workflow_dispatch` |
| ブランチ限定 | `on.push.branches: [main]` |
| 実行環境 | `runs-on: ubuntu-latest` / `windows-latest` |
| チェックアウト | `- uses: actions/checkout@v4` |
| シークレット | `${{ secrets.API_KEY }}` |
| ジョブの依存 | `needs: build` |
| 条件 | `if: github.ref == 'refs/heads/main'` |
| トークン権限 | `permissions: contents: read` |

### 早見表：GitHub の Markdown

```markdown
- [ ] 未完了のタスク
- [x] 完了したタスク

@user でメンション、#12 で Issue / PR、owner/repo#34 で他リポジトリを参照

<details><summary>詳細ログ</summary>

ここは折りたたまれる

</details>

> [!NOTE]
> 補足情報を目立たせる（WARNING / IMPORTANT なども使える）
```

## サンプル

### Node.js の CI（PR と main への push で実行）

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
```

`concurrency` で、同じブランチに続けて push したとき古い実行を自動でキャンセルします。`permissions` は `GITHUB_TOKEN` の権限を最小にするために明示します。

### 手動実行＋環境選択のデプロイ

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  workflow_dispatch:
    inputs:
      env:
        description: デプロイ先
        type: choice
        options: [stg, prod]
        default: stg

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.env }}
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: npm ci && npm run build
      - name: Deploy
        run: ./scripts/deploy.sh "${{ inputs.env }}"
        env:
          API_KEY: ${{ secrets.API_KEY }}
```

`environment` を使うと、環境ごとのシークレットや「承認者のレビュー後に実行」といった保護ルールを設定できます。

### PR テンプレートと CODEOWNERS

```markdown
<!-- .github/pull_request_template.md -->
## 概要

## 変更内容
- 

## 確認方法
- [ ] ローカルで動作確認した
- [ ] テストを追加・更新した

## 関連 Issue
Closes #
```

```text
# .github/CODEOWNERS（パスごとに自動でレビュアーを割り当てる）
*               @my-org/dev-team
/docs/          @my-org/docs-team
*.sql           @yamada
```

### SSH の 22 番ポートが塞がれている環境

```text
# ~/.ssh/config（Windows は %USERPROFILE%\.ssh\config）
Host github.com
  HostName ssh.github.com
  Port 443
  User git
```

## エラー対応

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `remote: Support for password authentication was removed on August 13, 2021.` | HTTPS でアカウントのパスワードを入力した | PAT を作ってパスワード欄に入力するか、`gh auth login` / Git Credential Manager でブラウザー認証する |
| `Permission denied (publickey).` | SSH 鍵が GitHub に未登録、ssh-agent に鍵がない、別の鍵が使われている | `ssh -T git@github.com` で確認。`ssh-add -l` で鍵を確認し、公開鍵を GitHub に登録する |
| `ssh: connect to host github.com port 22: Connection timed out` | 社内ネットワークで 22 番ポートが閉じている | サンプルの `~/.ssh/config` で `ssh.github.com` の 443 番を使うか、HTTPS に切り替える |
| `remote: Repository not found.` | URL の誤り、または Private リポジトリへの権限がない（別アカウントで認証している） | `git remote -v` を確認。Windows は資格情報マネージャーに残った古い github.com の認証情報を削除する |
| `The requested URL returned error: 403` | 書き込み権限がない、PAT のスコープ不足、SSO 未承認 | リポジトリの権限、PAT の対象リポジトリと権限、組織の SSO 承認を確認する |
| `! [rejected] main -> main (fetch first)` / `(non-fast-forward)` | リモートに手元にないコミットがある | `git pull --rebase` で取り込んでから再度 push。`--force` は共有ブランチで使わない |
| `remote: error: GH006: Protected branch update failed` / `GH013: Repository rule violations found` | ブランチ保護・ルールセットで直接 push が禁止されている | 作業ブランチに push して PR を作る |
| `remote: error: GH001: Large files detected.` | 100 MB を超えるファイルをコミットした | 履歴からファイルを除いてコミットし直す。大きなファイルは Git LFS かリポジトリ外で管理 |
| `fatal: refusing to merge unrelated histories` | README 付きで作った GitHub リポジトリに、別に `git init` したものを push しようとした | 中身を確認したうえで `git pull origin main --allow-unrelated-histories` |
| `SSL certificate problem: unable to get local issuer certificate` | 社内プロキシが通信を検査している | Windows なら `git config --global http.sslBackend schannel` で OS の証明書ストアを使う。検証の無効化はしない |
| Actions で `Resource not accessible by integration` | `GITHUB_TOKEN` の権限不足 | ワークフローの `permissions:` に必要な権限（例: `pull-requests: write`）を追加 |
| Actions のジョブが `Queued` のまま進まない | セルフホストランナーが停止、`runs-on` のラベル不一致 | ランナーの状態とラベルを確認する |

**認証エラーの切り分け順**

1. `git remote -v` で、HTTPS と SSH のどちらで接続しているかを確認する
2. SSH なら `ssh -vT git@github.com` で、どの鍵が試されているかを見る
3. HTTPS なら `gh auth status` で、どのアカウントでログインしているかを見る
4. 個人用と会社用のアカウントを併用している場合は、資格情報マネージャー（Windows）に残った認証情報の取り違えを疑う

## 実務Tips

### ブランチと PR の運用

- `main` には**ブランチ保護（またはルールセット）**を設定し、「PR 必須」「レビュー1件以上」「CI 成功必須」にする
- PR は小さく分ける。目安は**レビューが30分以内に終わる量**。大きな変更は Draft PR で早めに方向性を見てもらう
- PR の本文に「何を・なぜ・どう確認したか」を書く。テンプレートを用意すると書き漏れが減る
- `Closes #12` などのキーワードは、PR が**既定ブランチにマージされたとき**に Issue を閉じる
- マージ済みブランチは自動削除の設定（Settings → General → Automatically delete head branches）を有効にする

### セキュリティ

- パスワード・API キー・接続文字列を**コミットしない**。一度 push すると履歴に残り、削除コミットでは消えない。漏れたら**まずキーを無効化**する
- `.gitignore` に `.env`、`*.pem`、ビルド成果物を最初から入れておく
- PAT は fine-grained token で**対象リポジトリと権限を絞り、有効期限を付ける**
- Actions のシークレットはログでマスクされるが、`echo` で加工して出力すると漏れることがある
- 外部のアクションは信頼できるものだけを使い、重要なワークフローではタグではなくコミット SHA で固定することも検討する

### Windows 環境での注意

- 改行コードは `core.autocrlf` と `.gitattributes`（`* text=auto`、`*.sh text eol=lf`、`*.bat text eol=crlf`）で揃える。シェルスクリプトが CRLF になると Linux で動かない
- Windows はファイル名の大文字小文字を区別しない。`Readme.md` → `README.md` の変更は `git mv` で行う
- パスが長いとエラーになる場合は `git config --global core.longpaths true`
- 個人と会社の GitHub アカウントを1台で使う場合は、SSH の `Host` エイリアスで鍵を分けるか、リポジトリごとに `user.email` を設定する

### 作業ミスの防止

- `git push --force` の代わりに `git push --force-with-lease` を使う（他人の push を上書きしない）
- コミット前に `git status` と `git diff --staged` を見る癖をつける
- Actions の YAML は小さな変更でも PR 上で一度動かしてからマージする。`workflow_dispatch` を付けておくと手動で再実行できる

## 関連リンク

- [GitHub Docs（日本語）](https://docs.github.com/ja)
- [GitHub Actions ドキュメント](https://docs.github.com/ja/actions)
- [SSH を使用した GitHub への接続](https://docs.github.com/ja/authentication/connecting-to-github-with-ssh)
- [GitHub CLI マニュアル](https://cli.github.com/manual/)
- [Pro Git（日本語版）](https://git-scm.com/book/ja/v2)
- [Git for Windows](https://gitforwindows.org/)
