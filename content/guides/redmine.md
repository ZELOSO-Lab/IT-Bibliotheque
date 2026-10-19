---
title: Redmine 技術まとめ
slug: redmine
excerpt: Redmineのチケット運用、ワークフロー、プラグイン、設定などの技術情報をまとめています。
updated: 2026-10-19
---

# Redmine 技術まとめ

## 基礎

オープンソースのプロジェクト管理・課題管理ツール。

### 主な用途

- 課題・バグ管理
- 進捗管理（ガントチャート）
- Wiki
- SVN / Git連携

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[Redmine 公式ドキュメント](https://www.redmine.org/projects/redmine/wiki/Guide)を参照してください。

## コマンド

### コミットからチケット参照

```
git commit -m "ログイン画面を修正 refs #123"
git commit -m "不具合を修正 fixes #123"
```

### REST APIでチケット取得

```
curl -H "X-Redmine-API-Key: <APIキー>" \
  https://redmine.example.com/issues.json?project_id=1
```

### Wiki記法（Textile）

```
h2. 見出し
* 箇条書き
<pre>コード</pre>
```

### 早見表：チケット操作

| 操作 | コマンド・構文 |
| --- | --- |
| 参照（コミット） | `git commit -m "ログイン修正 refs #123"` |
| 完了（コミット） | `git commit -m "不具合修正 fixes #123"` |
| チケットリンク | `#123` |
| 関連付け | `関連するチケット → 関連している / ブロックしている` |

### 早見表：Textile 記法

| 操作 | コマンド・構文 |
| --- | --- |
| 見出し | `h2. 見出し` |
| 太字・リンク | `*太字*  "表示":https://example.com` |
| リスト | `* 箇条書き # 番号付き` |
| コード | `<pre><code class="sql">SELECT 1;</code></pre>` |

### 早見表：REST API

| 操作 | コマンド・構文 |
| --- | --- |
| チケット一覧 | `GET /issues.json?project_id=1&status_id=open` |
| チケット取得 | `GET /issues/123.json` |
| チケット作成 | `POST /issues.json  {"issue": {"project_id": 1, "subject": "..."}}` |
| 認証 | `X-Redmine-API-Key: <APIキー>` |

### 早見表：運用

| 操作 | コマンド・構文 |
| --- | --- |
| フィルタ保存 | `チケット一覧 → 条件指定 → 保存` |
| ガントチャート | `プロジェクト → ガントチャート` |
| Wiki リンク | `[[ページ名]]` |
| ウォッチ | `チケット右上「ウォッチ」で通知` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[Redmine 公式ドキュメント](https://www.redmine.org/projects/redmine/wiki/Guide)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[Redmine 公式ドキュメント](https://www.redmine.org/projects/redmine/wiki/Guide)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[Redmine 公式ドキュメント](https://www.redmine.org/projects/redmine/wiki/Guide)を参照してください。

## 関連リンク

- [Redmine 公式ドキュメント](https://www.redmine.org/projects/redmine/wiki/Guide)
