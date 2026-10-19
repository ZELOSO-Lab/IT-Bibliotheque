---
title: GitLab 技術まとめ
slug: gitlab
excerpt: GitLabのリポジトリ管理、マージリクエスト、GitLab CI/CDなどの技術情報をまとめています。
updated: 2026-10-19
---

# GitLab 技術まとめ

## 基礎

Gitリポジトリ管理とCI/CDを備えたDevOpsプラットフォーム。

### 主な用途

- リポジトリ管理
- マージリクエスト
- CI/CD
- セルフホスト運用

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[GitLab 公式ドキュメント](https://docs.gitlab.com/)を参照してください。

## コマンド

### .gitlab-ci.yml の最小例

```
stages: [test]

test:
  stage: test
  image: node:22
  script:
    - npm ci
    - npm test
```

### リモート追加

```
git remote add origin git@gitlab.com:group/project.git
```

### MRを作りながらpush

```
git push -o merge_request.create origin feature/login
```

### 早見表：リポジトリ

| 操作 | コマンド・構文 |
| --- | --- |
| クローン | `git clone git@gitlab.com:group/project.git` |
| リモート追加 | `git remote add origin git@gitlab.com:group/project.git` |
| SSH 確認 | `ssh -T git@gitlab.com` |
| MR 作成付き push | `git push -o merge_request.create origin feature/x` |

### 早見表：.gitlab-ci.yml

| 操作 | コマンド・構文 |
| --- | --- |
| ステージ | `stages: [build, test, deploy]` |
| ジョブ | `test:   stage: test   script:     - npm test` |
| ブランチ限定 | `rules:   - if: $CI_COMMIT_BRANCH == "main"` |
| 成果物 | `artifacts:   paths: [dist/]` |

### 早見表：CI 変数

| 操作 | コマンド・構文 |
| --- | --- |
| ブランチ名 | `$CI_COMMIT_BRANCH` |
| コミット SHA | `$CI_COMMIT_SHORT_SHA` |
| プロジェクト | `$CI_PROJECT_NAME` |
| MR 判定 | `$CI_PIPELINE_SOURCE == "merge_request_event"` |

### 早見表：コミット連携

| 操作 | コマンド・構文 |
| --- | --- |
| Issue を閉じる | `git commit -m "Fix login (closes #12)"` |
| Issue 参照 | `#12` |
| MR 参照 | `!34` |
| メンション | `@username` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[GitLab 公式ドキュメント](https://docs.gitlab.com/)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[GitLab 公式ドキュメント](https://docs.gitlab.com/)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[GitLab 公式ドキュメント](https://docs.gitlab.com/)を参照してください。

## 関連リンク

- [GitLab 公式ドキュメント](https://docs.gitlab.com/)
