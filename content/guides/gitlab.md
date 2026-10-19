---
title: GitLab 技術まとめ
slug: gitlab
excerpt: GitLabの基本用語とマージリクエストの流れ、SSH鍵・アクセストークン・GitLab Runnerの準備、よく使うgit / glabコマンドと.gitlab-ci.ymlの書き方、パイプラインのサンプル、よくあるエラーと対処、セルフホスト運用を含む実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# GitLab 技術まとめ

## 基礎

GitLabは、Gitリポジトリ管理・マージリクエストによるレビュー・Issue管理・CI/CD・コンテナレジストリまでを1つにまとめた DevOps プラットフォームです。SaaS 版の **GitLab.com** と、自社サーバーに構築する **セルフマネージド版** があり、日本の企業では「社内ネットワークに GitLab を立てて使う」形もよく見られます。

### まず押さえる用語

| 用語 | 意味 | 現場での注意点 |
| --- | --- | --- |
| グループ / サブグループ | プロジェクトと権限をまとめる単位（`group/subgroup/project`） | 権限は上位グループから継承される |
| プロジェクト | リポジトリ＋Issue＋CI などの入れ物 | GitHub の「リポジトリ」に相当 |
| マージリクエスト（MR） | ブランチの変更を取り込む依頼とレビューの場 | GitHub の Pull Request と同じもの。`!34` で参照 |
| パイプライン | `.gitlab-ci.yml` に従って実行される CI/CD の一連の処理 | ステージ（stage）ごとに順に進む |
| ジョブ | パイプラインの中の1つの処理（テスト・ビルドなど） | 同じステージのジョブは並列に動く |
| Runner | ジョブを実際に実行するエージェント | セルフマネージド版では自分で用意する必要がある |
| 保護ブランチ | push・マージできるロールを制限したブランチ | 「push できない」の原因になりやすい |
| ロール | Guest / Reporter / Developer / Maintainer / Owner | 保護ブランチへのマージは通常 Maintainer 以上 |

### マージリクエストの基本の流れ

1. Issue を作り、作業内容を書く（Issue 画面の「マージリクエストを作成」からブランチごと作ることもできる）
2. 作業ブランチで変更し、push する
3. MR を作る。タイトルの先頭に `Draft:` を付けると作業中としてマージを防げる
4. パイプラインが成功し、承認（Approve）を得る
5. マージする。必要に応じて「コミットをスカッシュ」「ソースブランチを削除」にチェック
6. MR の説明に `Closes #12` と書いておくと、既定ブランチへのマージ時に Issue が閉じる

### パイプラインの考え方

```text
stages:  build ──▶ test ──▶ deploy
jobs:    build      unit      deploy-stg
                    lint      deploy-prod（手動）
```

前のステージのジョブがすべて成功すると次のステージに進みます。`needs` を使うとステージの順番を待たずに、依存するジョブが終わった時点で開始できます。

## 環境構築

### 1. Git の初期設定

Windows は Git for Windows をインストールし、名前とメールアドレスを設定します。

```sh
git config --global user.name "Yamada Taro"
git config --global user.email "taro@example.com"   # GitLab に登録したメールアドレス
git config --global init.defaultBranch main
git config --global core.autocrlf true               # Windows の場合
```

### 2. 認証方式を決める

| 方式 | URL の形 | 特徴 |
| --- | --- | --- |
| SSH 鍵 | `git@gitlab.example.com:group/project.git` | 一度設定すれば入力不要。22番ポートが閉じている環境では使えない |
| HTTPS ＋ パーソナルアクセストークン | `https://gitlab.example.com/group/project.git` | 2要素認証を有効にしたアカウントはパスワードの代わりにトークンが必須 |
| プロジェクト / グループアクセストークン | 同上 | 個人に紐づかないボット用。CI や外部ツール連携向け |
| デプロイトークン / デプロイキー | 同上 | 読み取り専用のクローンやレジストリ取得用 |

パーソナルアクセストークンは「ユーザー設定 → アクセストークン」で作成し、Git 操作だけなら `read_repository` / `write_repository` のスコープで足ります。**必ず有効期限を設定**します。

### 3. SSH 鍵の登録

```sh
ssh-keygen -t ed25519 -C "taro@example.com"
cat ~/.ssh/id_ed25519.pub     # Windows: type %USERPROFILE%\.ssh\id_ed25519.pub
# 「ユーザー設定 → SSH 鍵」に貼り付けて登録

ssh -T git@gitlab.com          # セルフマネージドなら git@gitlab.example.com
# Welcome to GitLab, @taro!
```

### 4. GitLab Runner の用意（セルフマネージド・専用ランナー）

GitLab.com ではインスタンスランナーがすぐ使えますが、社内 GitLab や社内リソースにアクセスするジョブでは Runner を自分で登録します。

1. プロジェクト（またはグループ）の「設定 → CI/CD → Runners」で新しいランナーを作成し、タグを決めて**ランナー認証トークン（`glrt-` で始まる）**を取得する
2. 実行するサーバーに `gitlab-runner` をインストールする
3. 登録して、Executor（実行方式）を選ぶ

```sh
# Linux
sudo gitlab-runner register --url https://gitlab.example.com --token glrt-xxxxxxxx
sudo gitlab-runner list
sudo gitlab-runner verify
sudo gitlab-runner status
```

```powershell
# Windows（gitlab-runner.exe を C:\GitLab-Runner に置いた場合、管理者 PowerShell）
cd C:\GitLab-Runner
.\gitlab-runner.exe register --url https://gitlab.example.com --token glrt-xxxxxxxx
.\gitlab-runner.exe install
.\gitlab-runner.exe start
```

| Executor | 特徴 | 向いている場面 |
| --- | --- | --- |
| `shell` | Runner のホスト上で直接コマンドを実行 | Windows のビルド（MSBuild など）、既存サーバーの流用 |
| `docker` | ジョブごとにコンテナを起動。`image:` が使える | Linux の一般的な CI。環境を汚さない |
| `kubernetes` | Kubernetes の Pod でジョブを実行 | 大規模・オートスケール |

設定は `config.toml`（Linux の root 実行なら `/etc/gitlab-runner/config.toml`、Windows は exe と同じフォルダー）に保存されます。

## コマンド

### リポジトリ操作

```sh
git clone git@gitlab.com:group/project.git
git remote add origin git@gitlab.com:group/project.git
git switch -c feature/login
git push -u origin feature/login
```

### push オプションで MR を作る

GitLab は `git push -o` で MR の作成や CI のスキップを指定できます。

```sh
# MR を作りながら push
git push -o merge_request.create origin feature/login

# マージ先・タイトル・マージ後のブランチ削除も指定
git push -o merge_request.create \
         -o merge_request.target=main \
         -o merge_request.title="ログイン画面の入力チェック" \
         -o merge_request.remove_source_branch \
         origin feature/login

# このpushではパイプラインを動かさない
git push -o ci.skip origin feature/docs
```

### 早見表：リポジトリ

| 操作 | コマンド・構文 |
| --- | --- |
| クローン | `git clone git@gitlab.com:group/project.git` |
| リモート追加 | `git remote add origin git@gitlab.com:group/project.git` |
| SSH 確認 | `ssh -T git@gitlab.com` |
| MR 作成付き push | `git push -o merge_request.create origin feature/x` |
| CI をスキップ | `git push -o ci.skip`（またはコミットメッセージに `[skip ci]`） |

### GitLab CLI（glab）

| 操作 | コマンド |
| --- | --- |
| ログイン | `glab auth login`（セルフマネージドはホスト名を入力） |
| MR 作成 | `glab mr create --fill` |
| MR 一覧 / 詳細 | `glab mr list` / `glab mr view 34` |
| MR をローカルに取得 | `glab mr checkout 34` |
| MR を承認 / マージ | `glab mr approve 34` / `glab mr merge 34` |
| Issue 一覧 / 作成 | `glab issue list` / `glab issue create` |
| パイプラインの状態 | `glab ci status` |
| パイプラインを対話表示 | `glab ci view` |

### 早見表：.gitlab-ci.yml の主なキーワード

| キーワード | 用途 | 例 |
| --- | --- | --- |
| `stages` | ステージの順番 | `stages: [build, test, deploy]` |
| `image` | ジョブを動かすコンテナイメージ（docker Executor） | `image: node:22` |
| `script` | 実行するコマンド（必須） | `script: [npm ci, npm test]` |
| `before_script` / `after_script` | script の前後に実行 | 認証や後片付け |
| `rules` | ジョブを実行する条件 | `- if: $CI_COMMIT_BRANCH == "main"` |
| `needs` | 依存ジョブ（ステージを待たずに開始） | `needs: [build]` |
| `artifacts` | 成果物を保存・後続ジョブへ渡す | `paths: [dist/]`、`expire_in: 1 week` |
| `cache` | 依存パッケージの再利用 | `key: { files: [package-lock.json] }` |
| `variables` | 変数 | `NODE_ENV: production` |
| `tags` | 使う Runner をタグで指定 | `tags: [windows]` |
| `when` | 実行タイミング | `when: manual`（手動実行） |
| `environment` | デプロイ先の記録 | `name: production` |
| `include` | 他ファイルの読み込み | `- local: ci/test.yml` |
| `extends` | 共通設定の継承 | `extends: .node-base` |

### 早見表：定義済み CI 変数

| 変数 | 内容 |
| --- | --- |
| `$CI_COMMIT_BRANCH` | ブランチ名（MR パイプラインやタグでは空） |
| `$CI_COMMIT_TAG` | タグ名（タグのパイプラインのみ） |
| `$CI_COMMIT_SHORT_SHA` | コミット SHA の先頭8文字 |
| `$CI_DEFAULT_BRANCH` | 既定ブランチ名 |
| `$CI_PROJECT_NAME` | プロジェクト名 |
| `$CI_PIPELINE_SOURCE` | 起動元（`push`、`merge_request_event`、`schedule`、`web` など） |
| `$CI_MERGE_REQUEST_IID` | MR 番号（MR パイプラインのみ） |
| `$CI_REGISTRY_IMAGE` | コンテナレジストリのイメージパス |
| `$CI_JOB_TOKEN` | ジョブ用の一時トークン |

### 早見表：コミット連携・クイックアクション

| 操作 | 構文 |
| --- | --- |
| Issue を閉じる | `git commit -m "Fix login (closes #12)"` |
| Issue / MR 参照 | `#12` / `!34` |
| メンション | `@username` |
| コメントで担当を設定 | `/assign @username` |
| ラベル付与 | `/label ~bug` |
| MR を下書きに切り替え | `/draft` |
| 承認 | `/approve` |

## サンプル

### Node.js アプリのパイプライン

```yaml
# .gitlab-ci.yml
stages: [build, test, deploy]

default:
  image: node:22
  cache:
    key:
      files: [package-lock.json]
    paths: [.npm/]

variables:
  npm_config_cache: "$CI_PROJECT_DIR/.npm"

# MR パイプラインとブランチパイプラインの二重実行を防ぐ
workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH && $CI_OPEN_MERGE_REQUESTS
      when: never
    - if: $CI_COMMIT_BRANCH

build:
  stage: build
  script:
    - npm ci
    - npm run build
  artifacts:
    paths: [dist/]
    expire_in: 1 week

test:
  stage: test
  needs: [build]
  script:
    - npm ci
    - npm test

deploy-stg:
  stage: deploy
  script:
    - ./scripts/deploy.sh stg
  environment:
    name: staging
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

deploy-prod:
  stage: deploy
  script:
    - ./scripts/deploy.sh prod
  environment:
    name: production
  rules:
    - if: $CI_COMMIT_TAG
      when: manual
```

`deploy-prod` はタグを打ったときだけ表示され、画面の再生ボタンを押すまで実行されません。

### Windows Runner（shell Executor）でのビルド

```yaml
build-windows:
  stage: build
  tags: [windows]          # Windows Runner に付けたタグ
  script:
    - dotnet --info
    - dotnet build .\MyApp.sln -c Release
  artifacts:
    paths:
      - MyApp/bin/Release/
```

Windows の shell Executor では、ジョブのスクリプトは PowerShell で実行されます（Runner の `config.toml` の `shell` 設定で決まる）。`&&` などシェルの書き方の違いに注意します。

### 共通設定を include / extends で使い回す

```yaml
# ci/templates.yml
.node-base:
  image: node:22
  before_script:
    - npm ci

# .gitlab-ci.yml
include:
  - local: ci/templates.yml

lint:
  extends: .node-base
  stage: test
  script:
    - npm run lint
```

先頭が `.` のジョブ名は「隠しジョブ」で、それ自体は実行されずテンプレートとして使えます。

## エラー対応

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `Permission denied (publickey).` | SSH 鍵が未登録、別の鍵が使われている | `ssh -vT git@gitlab.example.com` で使われている鍵を確認し、公開鍵を登録する |
| `remote: HTTP Basic: Access denied.` | パスワードの誤り、2要素認証が有効なのにパスワードを使った、トークン期限切れ | パーソナルアクセストークンを作り直してパスワード欄に入力する。Windows は資格情報マネージャーの古い情報を削除 |
| `remote: GitLab: You are not allowed to push code to protected branches on this project.` | 保護ブランチに直接 push した、ロールが足りない | 作業ブランチに push して MR を作る。設定は「設定 → リポジトリ → 保護ブランチ」 |
| `! [rejected] main -> main (non-fast-forward)` | リモートに手元にないコミットがある | `git pull --rebase` してから push |
| ジョブが `pending` のまま `This job is stuck because ...` | 使える Runner がない、ジョブの `tags` と一致する Runner がない、Runner が停止中 | 「設定 → CI/CD → Runners」でオンラインか確認。`tags` を見直す。タグなしジョブを許可する設定も確認 |
| `jobs config should contain at least one visible job` | 実行されるジョブが1つもない（全部隠しジョブ、`rules` ですべて除外） | `rules` の条件を見直す。パイプラインエディタで検証する |
| `jobs:test config contains unknown keys: ...` | キーワードの綴り誤り・インデントのずれ | パイプラインエディタの「検証」や CI Lint で確認する |
| `ERROR: Job failed: exit code 1` | `script` 内のコマンドが失敗した | その直前のログを読む。ローカルで同じコマンドを再現する |
| `x509: certificate signed by unknown authority` | 社内 GitLab の自己署名・社内 CA 証明書を Runner が信頼していない | `gitlab-runner register` に `--tls-ca-file` で CA 証明書を指定する（`config.toml` の `tls-ca-file`） |
| `SSL certificate problem: self signed certificate in certificate chain` | 手元の Git が社内 CA を信頼していない | Windows なら `git config --global http.sslBackend schannel`。検証の無効化はしない |
| MR パイプラインとブランチパイプラインが2本動く | `rules` の書き方で両方の条件に当たっている | サンプルの `workflow: rules` で重複を防ぐ |

**「ジョブが動かない」の切り分け順**

1. パイプライン画面でジョブが**作られているか**を見る（作られていなければ `rules` / `workflow` の問題）
2. 作られて `pending` なら Runner の問題。オンラインか、タグが合っているか、プロジェクトに割り当てられているかを確認する
3. 動いて失敗しているならスクリプトの問題。ログの最初のエラーから読む

## 実務Tips

### MR とブランチの運用

- 既定ブランチは保護し、「マージは Maintainer のみ・push は禁止」にする。承認ルールで最低1名のレビューを必須にする
- 「パイプラインが成功しなければマージできない」設定を有効にする（設定 → マージリクエスト）
- 作業中の MR はタイトルに `Draft:` を付けておくと、誤マージを防げる
- MR のテンプレートは `.gitlab/merge_request_templates/*.md` に置くと、作成時に選べる

### CI/CD

- `rules` と古い `only` / `except` は同じジョブで併用できない。新規に書くなら `rules` に統一する
- パスワードなどは YAML に書かず「設定 → CI/CD → 変数」に登録し、**マスク**と**保護**（保護ブランチ・タグのパイプラインでのみ使える）を設定する
- `artifacts` には `expire_in` を付ける。付けないとストレージを圧迫する
- 長いパイプラインは `needs` で依存関係を明示すると速くなる。古いパイプラインが不要なら `interruptible: true` を付ける
- 共通の CI 設定は別プロジェクトに置き、`include: project:` で各プロジェクトから読み込むと全体の修正が1か所で済む

### セルフマネージド運用

- バージョンアップは**決められたアップグレードパス**に沿って段階的に行う。一気に複数メジャーを飛ばさない
- バックアップは `gitlab-backup create` だけでなく、`/etc/gitlab/gitlab.rb` と `/etc/gitlab/gitlab-secrets.json` も別途保存する（シークレットがないと復元しても CI 変数などが読めない）
- Runner は GitLab 本体と別サーバーに置く。ビルド負荷で GitLab の画面が重くなるのを防ぐ
- shell Executor の Runner はジョブ間で環境が共有されるため、信頼できるプロジェクトにだけ割り当てる

## 関連リンク

- [GitLab Docs](https://docs.gitlab.com/)
- [GitLab Runner ドキュメント](https://docs.gitlab.com/runner/)
- [GitLab CLI（glab）](https://gitlab.com/gitlab-org/cli)
- [Pro Git（日本語版）](https://git-scm.com/book/ja/v2)
