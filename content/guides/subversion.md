---
title: Apache Subversion 技術まとめ
slug: subversion
excerpt: Apache Subversionのリポジトリ作成、svnserve / Apacheでの公開、フック、バックアップ（dump / load）などサーバー運用の技術情報をまとめています。
updated: 2026-10-19
---

# Apache Subversion 技術まとめ

## 基礎

Apache Software Foundationの集中型バージョン管理システム。リポジトリの構築・運用側。

### 主な用途

- リポジトリの構築
- アクセス権の設定
- バックアップ・移行
- コミット時のチェック（フック）

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[Apache Subversion 公式ドキュメント](https://svnbook.red-bean.com/)を参照してください。

## コマンド

### リポジトリ作成と標準構成

```
svnadmin create /var/svn/repo
svn mkdir file:///var/svn/repo/{trunk,branches,tags} -m "init"
```

### svnserveで公開

```
svnserve -d -r /var/svn
# 接続: svn://server/repo
```

### バックアップと復元

```
svnadmin dump /var/svn/repo > repo.dump
svnadmin load /var/svn/new < repo.dump
```

### リポジトリの点検・情報

```
svnadmin verify /var/svn/repo
svnlook youngest /var/svn/repo
```

### 早見表：リポジトリ作成

| 操作 | コマンド・構文 |
| --- | --- |
| リポジトリを作る | `svnadmin create /var/svn/repo` |
| 標準構成を作る | `svn mkdir URL/trunk URL/branches URL/tags -m "init"` |
| 既存ソースを登録 | `svn import ./src URL/trunk -m "import"` |
| 最新リビジョン番号 | `svnlook youngest /var/svn/repo` |

### 早見表：公開・アクセス権

| 操作 | コマンド・構文 |
| --- | --- |
| svnserve 起動 | `svnserve -d -r /var/svn` |
| 認証の設定 | `conf/svnserve.conf  conf/passwd` |
| パスごとの権限 | `conf/authz  [/trunk] user = rw` |
| Apache で公開 | `mod_dav_svn  <Location /svn> DAV svn` |

### 早見表：バックアップ・移行

| 操作 | コマンド・構文 |
| --- | --- |
| ダンプ | `svnadmin dump /var/svn/repo > repo.dump` |
| ロード | `svnadmin load /var/svn/new < repo.dump` |
| ホットコピー | `svnadmin hotcopy /var/svn/repo /backup/repo` |
| 整合性チェック | `svnadmin verify /var/svn/repo` |

### 早見表：フック・調査

| 操作 | コマンド・構文 |
| --- | --- |
| コミット前チェック | `hooks/pre-commit（終了コード0以外で拒否）` |
| コミット後通知 | `hooks/post-commit` |
| 変更ファイル一覧 | `svnlook changed -r 120 /var/svn/repo` |
| ログメッセージ | `svnlook log -r 120 /var/svn/repo` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[Apache Subversion 公式ドキュメント](https://svnbook.red-bean.com/)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[Apache Subversion 公式ドキュメント](https://svnbook.red-bean.com/)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[Apache Subversion 公式ドキュメント](https://svnbook.red-bean.com/)を参照してください。

## 関連リンク

- [Apache Subversion 公式ドキュメント](https://svnbook.red-bean.com/)
