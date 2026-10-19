---
title: API 技術まとめ
slug: api
excerpt: REST API、JSON、HTTPメソッド、認証、APIテストなどの技術情報をまとめています。
updated: 2026-10-19
---

# API 技術まとめ

## 基礎

REST APIなどシステム間連携の設計・実装・テスト。

### 主な用途

- システム間連携
- Web / スマホアプリのバックエンド
- 外部サービス連携
- 自動化

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[API 公式ドキュメント](https://developer.mozilla.org/ja/docs/Web/HTTP)を参照してください。

## コマンド

### curlでGET

```
curl -s https://api.example.com/users/1
```

### curlでJSONをPOST

```
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Taro"}'
```

### 主なHTTPステータス

```
200 OK / 201 Created / 204 No Content
400 Bad Request / 401 Unauthorized / 403 Forbidden / 404 Not Found
500 Internal Server Error / 503 Service Unavailable
```

### 早見表：HTTP メソッド

| 操作 | コマンド・構文 |
| --- | --- |
| 取得 | `GET /users/1` |
| 作成 | `POST /users` |
| 更新 | `PUT /users/1   PATCH /users/1` |
| 削除 | `DELETE /users/1` |

### 早見表：ステータスコード

| 操作 | コマンド・構文 |
| --- | --- |
| 成功 | `200 OK / 201 Created / 204 No Content` |
| クライアントエラー | `400 Bad Request / 404 Not Found` |
| 認証・権限 | `401 Unauthorized / 403 Forbidden` |
| サーバエラー | `500 Internal Server Error / 503 Service Unavailable` |

### 早見表：curl

| 操作 | コマンド・構文 |
| --- | --- |
| GET | `curl -s https://api.example.com/users` |
| JSON を POST | `curl -X POST URL -H "Content-Type: application/json" -d '{"name":"Taro"}'` |
| ヘッダ表示 | `curl -i URL` |
| 認証トークン | `curl -H "Authorization: Bearer <token>" URL` |

### 早見表：設計の基本

| 操作 | コマンド・構文 |
| --- | --- |
| リソース名 | `/users  /users/{id}/orders（複数形の名詞）` |
| ページング | `GET /users?page=2&limit=20` |
| バージョン | `/v1/users` |
| エラー形式 | `{"error": {"code": "NOT_FOUND", "message": "..."}}` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[API 公式ドキュメント](https://developer.mozilla.org/ja/docs/Web/HTTP)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[API 公式ドキュメント](https://developer.mozilla.org/ja/docs/Web/HTTP)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[API 公式ドキュメント](https://developer.mozilla.org/ja/docs/Web/HTTP)を参照してください。

## 関連リンク

- [API 公式ドキュメント](https://developer.mozilla.org/ja/docs/Web/HTTP)
