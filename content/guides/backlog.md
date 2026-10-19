---
title: Backlog 技術まとめ
slug: backlog
excerpt: Backlogの課題管理、Wiki、Git連携などの技術情報をまとめています。
updated: 2026-10-19
---

# Backlog 技術まとめ

## 基礎

チームで使えるプロジェクト管理・タスク管理サービス。

### 主な用途

- タスク・課題管理
- ガントチャート
- Wiki・ファイル共有
- Git / SVN連携

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[Backlog 公式ドキュメント](https://support-ja.backlog.com/hc/ja)を参照してください。

## コマンド

### コミットから課題参照

```
git commit -m "PROJ-123 ログイン画面を修正"
```

### APIで課題一覧取得

```
curl "https://example.backlog.jp/api/v2/issues?apiKey=<APIキー>&projectId[]=1"
```

### Wiki記法（Markdown）

```
## 見出し
- 箇条書き
```
コード
```
```

### 早見表：課題操作

| 操作 | コマンド・構文 |
| --- | --- |
| 課題キー | `PROJ-123` |
| コミット連携 | `git commit -m "PROJ-123 ログイン画面修正"` |
| 完了させる | `git commit -m "PROJ-123 #fix 修正完了"` |
| メンション | `@ユーザー名` |

### 早見表：ショートカット

| 操作 | コマンド・構文 |
| --- | --- |
| 課題追加 | `C` |
| 検索 | `/` |
| 課題一覧 | `G → I` |
| ヘルプ | `?` |

### 早見表：Markdown 記法

| 操作 | コマンド・構文 |
| --- | --- |
| 見出し | `## 見出し` |
| チェックリスト | `- [ ] タスク` |
| 課題リンク | `PROJ-123` |
| コード | `` ``` コード ``` `` |

### 早見表：API

| 操作 | コマンド・構文 |
| --- | --- |
| 課題一覧 | `GET /api/v2/issues?projectId[]=1&apiKey=<APIキー>` |
| 課題取得 | `GET /api/v2/issues/PROJ-123` |
| 課題追加 | `POST /api/v2/issues` |
| コメント追加 | `POST /api/v2/issues/PROJ-123/comments` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[Backlog 公式ドキュメント](https://support-ja.backlog.com/hc/ja)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[Backlog 公式ドキュメント](https://support-ja.backlog.com/hc/ja)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[Backlog 公式ドキュメント](https://support-ja.backlog.com/hc/ja)を参照してください。

## 関連リンク

- [Backlog 公式ドキュメント](https://support-ja.backlog.com/hc/ja)
