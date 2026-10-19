---
title: GitHub 技術まとめ
slug: github
excerpt: GitHubのリポジトリ管理、Pull Request、GitHub Actionsなどの技術情報をまとめています。
updated: 2026-10-19
---

# GitHub 技術まとめ

## 基礎

Gitリポジトリのホスティングサービス。Pull RequestやActionsを提供。

### 主な用途

- リポジトリ管理
- Pull Requestレビュー
- GitHub Actions（CI/CD）
- OSS公開

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[GitHub 公式ドキュメント](https://docs.github.com/ja)を参照してください。

## コマンド

### リポジトリのクローン

```
git clone https://github.com/owner/repo.git
```

### GitHub CLIでPR作成

```
gh pr create --title "タイトル" --body "説明"
```

### Actionsの最小例

```
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test
```

### 早見表：リポジトリ

| 操作 | コマンド・構文 |
| --- | --- |
| クローン | `git clone https://github.com/owner/repo.git` |
| フォーク後の上流追加 | `git remote add upstream https://github.com/owner/repo.git` |
| SSH 確認 | `ssh -T git@github.com` |
| Issue を閉じる | `git commit -m "Fix bug (fixes #12)"` |

### 早見表：GitHub CLI

| 操作 | コマンド・構文 |
| --- | --- |
| ログイン | `gh auth login` |
| PR 作成 | `gh pr create --fill` |
| PR 一覧・取得 | `gh pr list gh pr checkout 34` |
| リポジトリ作成 | `gh repo create my-app --private` |

### 早見表：Actions

| 操作 | コマンド・構文 |
| --- | --- |
| トリガー | `on:   push:     branches: [main]` |
| ジョブ | `jobs:   test:     runs-on: ubuntu-latest` |
| チェックアウト | `- uses: actions/checkout@v4` |
| シークレット | `${{ secrets.API_KEY }}` |

### 早見表：Markdown

| 操作 | コマンド・構文 |
| --- | --- |
| コード | `` ```js console.log(1); ``` `` |
| チェックリスト | `- [ ] 未完了 - [x] 完了` |
| メンション・参照 | `@user  #12  owner/repo#34` |
| 折りたたみ | `<details><summary>詳細</summary>…</details>` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[GitHub 公式ドキュメント](https://docs.github.com/ja)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[GitHub 公式ドキュメント](https://docs.github.com/ja)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[GitHub 公式ドキュメント](https://docs.github.com/ja)を参照してください。

## 関連リンク

- [GitHub 公式ドキュメント](https://docs.github.com/ja)
