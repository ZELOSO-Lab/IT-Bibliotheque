---
title: Git 技術まとめ
slug: git
excerpt: Gitの基本コマンド、ブランチ運用、コンフリクト解消、トラブル対応などの技術情報をまとめています。
updated: 2026-10-19
---

# Git 技術まとめ

## 基礎

分散型バージョン管理システム。コマンドとブランチ運用。

### 主な用途

- ソース管理
- チーム開発
- ブランチ運用
- 変更履歴の調査

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[Git 公式ドキュメント](https://git-scm.com/book/ja/v2)を参照してください。

## コマンド

### 基本の流れ

```
git status
git add .
git commit -m "メッセージ"
git push origin main
```

### ブランチ作成と切り替え

```
git switch -c feature/login
git switch main
```

### 直前のコミットを修正

```
git commit --amend
```

### 作業中の変更を退避

```
git stash
git stash pop
```

### 早見表：基本

| 操作 | コマンド・構文 |
| --- | --- |
| 状態確認 | `git status` |
| ステージ | `git add .` |
| コミット | `git commit -m "メッセージ"` |
| プッシュ | `git push origin main` |

### 早見表：ブランチ

| 操作 | コマンド・構文 |
| --- | --- |
| 作成して切替 | `git switch -c feature/x` |
| 切替 | `git switch main` |
| 一覧 | `git branch -a` |
| マージ | `git merge feature/x` |

### 早見表：履歴・差分

| 操作 | コマンド・構文 |
| --- | --- |
| ログ | `git log --oneline --graph -20` |
| 差分 | `git diff git diff --staged` |
| 変更者 | `git blame file.txt` |
| 特定コミット | `git show <hash>` |

### 早見表：取り消し

| 操作 | コマンド・構文 |
| --- | --- |
| 作業変更を破棄 | `git restore file.txt` |
| ステージ解除 | `git restore --staged file.txt` |
| 直前コミット修正 | `git commit --amend` |
| 打ち消しコミット | `git revert <hash>` |

### 早見表：リモート・退避

| 操作 | コマンド・構文 |
| --- | --- |
| 取得 | `git fetch origin git pull` |
| クローン | `git clone URL` |
| 一時退避 | `git stash git stash pop` |
| リモート確認 | `git remote -v` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[Git 公式ドキュメント](https://git-scm.com/book/ja/v2)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[Git 公式ドキュメント](https://git-scm.com/book/ja/v2)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[Git 公式ドキュメント](https://git-scm.com/book/ja/v2)を参照してください。

## 関連リンク

- [Git 公式ドキュメント](https://git-scm.com/book/ja/v2)
