---
title: SVN 技術まとめ
slug: svn
excerpt: SVN（Subversion）のチェックアウト、コミット、ブランチ、TortoiseSVNなどの技術情報をまとめています。
updated: 2026-10-19
---

# SVN 技術まとめ

## 基礎

Subversion。集中型のバージョン管理システム。

### 主な用途

- ソース管理
- 既存プロジェクトの保守
- ドキュメント管理
- Gitへの移行前提の運用

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[SVN 公式ドキュメント](https://subversion.apache.org/docs/)を参照してください。

## コマンド

### チェックアウトと更新

```
svn checkout https://svn.example.com/repo/trunk work
svn update
```

### 状態確認とコミット

```
svn status
svn diff
svn commit -m "メッセージ"
```

### 変更の取り消し

```
svn revert file.txt
```

### 早見表：取得・更新

| 操作 | コマンド・構文 |
| --- | --- |
| チェックアウト | `svn checkout URL/trunk work` |
| 更新 | `svn update` |
| リビジョン指定 | `svn update -r 1234` |
| 情報 | `svn info` |

### 早見表：変更・コミット

| 操作 | コマンド・構文 |
| --- | --- |
| 状態 | `svn status` |
| 差分 | `svn diff` |
| 追加・削除 | `svn add file.txt svn delete old.txt` |
| コミット | `svn commit -m "メッセージ"` |

### 早見表：履歴・取り消し

| 操作 | コマンド・構文 |
| --- | --- |
| ログ | `svn log -l 10` |
| 誰が変更したか | `svn blame file.txt` |
| 変更を戻す | `svn revert file.txt` |
| 競合解決済み | `svn resolve --accept working file.txt` |

### 早見表：ブランチ

| 操作 | コマンド・構文 |
| --- | --- |
| ブランチ作成 | `svn copy URL/trunk URL/branches/feature -m "branch"` |
| 切り替え | `svn switch URL/branches/feature` |
| マージ | `svn merge URL/branches/feature` |
| タグ | `svn copy URL/trunk URL/tags/v1.0 -m "release"` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[SVN 公式ドキュメント](https://subversion.apache.org/docs/)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[SVN 公式ドキュメント](https://subversion.apache.org/docs/)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[SVN 公式ドキュメント](https://subversion.apache.org/docs/)を参照してください。

## 関連リンク

- [SVN 公式ドキュメント](https://subversion.apache.org/docs/)
