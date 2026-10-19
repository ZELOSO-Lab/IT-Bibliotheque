---
title: API 技術まとめ
slug: api
excerpt: REST APIの基本（HTTPメソッド・ステータスコード・JSON・認証）、curlやPostmanによる確認環境、よく使うcurlコマンド、API設計とクライアント実装のサンプル、通信エラーやCORS・401/415への対処、設計と運用の実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# API 技術まとめ

## 基礎

Web API は、HTTP を使ってシステム同士がデータをやり取りする仕組みです。現在の主流は **REST API**（URL で「リソース」を表し、HTTP メソッドで操作を表す設計スタイル）で、データ形式には **JSON** を使います。画面のない Web アプリと考えるとわかりやすく、ブラウザの代わりにプログラムや `curl` がリクエストを送ります。

### リクエストとレスポンスの構造

```http
POST /v1/users HTTP/1.1
Host: api.example.com
Content-Type: application/json
Accept: application/json
Authorization: Bearer eyJhbGciOi...

{"name": "山田太郎", "email": "taro@example.com"}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /v1/users/123

{"id": 123, "name": "山田太郎", "email": "taro@example.com"}
```

| 要素 | 内容 | 現場での注意点 |
| --- | --- | --- |
| メソッド | `GET` `POST` `PUT` `PATCH` `DELETE` など | 操作の種類を表す |
| URL（パス・クエリ） | `/v1/users?page=2` | クエリの日本語・記号は URL エンコードが必要 |
| ヘッダー | `Content-Type` `Authorization` `Accept` など | **`Content-Type: application/json` の付け忘れ**がエラーの定番 |
| ボディ | JSON などのデータ本体 | 文字コードは UTF-8 |
| ステータスコード | `200` `404` など3桁の数字 | 成功・失敗はまずここで判定する |

### HTTP メソッド

| メソッド | 用途 | 例 | 安全 | 冪等 |
| --- | --- | --- | --- | --- |
| `GET` | 取得 | `GET /users/1` | ○ | ○ |
| `POST` | 作成・処理の実行 | `POST /users` | × | × |
| `PUT` | 全体を置き換え（更新） | `PUT /users/1` | × | ○ |
| `PATCH` | 一部を更新 | `PATCH /users/1` | × | ×（設計次第） |
| `DELETE` | 削除 | `DELETE /users/1` | × | ○ |
| `HEAD` / `OPTIONS` | ヘッダーだけ取得 / 使えるメソッドの確認（CORS のプリフライト） | `OPTIONS /users` | ○ | ○ |

**安全**＝サーバーの状態を変えない、**冪等**＝同じリクエストを何度送っても結果が同じ、という意味です。タイムアウト時に**安全にリトライできるのは冪等なメソッドだけ**で、`POST` の再送は二重登録の原因になります。

### ステータスコード

| コード | 意味 | 使いどころ |
| --- | --- | --- |
| `200 OK` | 成功 | 取得・更新の成功 |
| `201 Created` | 作成成功 | `POST` で作成。`Location` ヘッダーに新しい URL |
| `204 No Content` | 成功・ボディなし | `DELETE` の成功など |
| `301` / `302` / `308` | リダイレクト | `curl` は `-L` を付けないと追従しない |
| `304 Not Modified` | キャッシュが有効 | `ETag` / `If-None-Match` と組み合わせる |
| `400 Bad Request` | リクエストが不正 | JSON 形式の誤り、必須項目の欠落 |
| `401 Unauthorized` | **認証**されていない | トークンなし・期限切れ・誤り |
| `403 Forbidden` | 認証済みだが**権限**がない | 他人のデータへのアクセス |
| `404 Not Found` | リソースがない | URL 誤り、ID が存在しない |
| `405 Method Not Allowed` | メソッドが許可されていない | `GET` 専用の URL に `POST` |
| `409 Conflict` | 状態の競合 | 重複登録、楽観ロックの失敗 |
| `415 Unsupported Media Type` | ボディの形式が非対応 | `Content-Type` の誤り |
| `422 Unprocessable Content` | 形式は正しいが内容が不正 | 入力チェックエラー（`400` を使う設計も多い） |
| `429 Too Many Requests` | 回数制限超過 | `Retry-After` ヘッダーの秒数だけ待つ |
| `500 Internal Server Error` | サーバー内部のエラー | サーバー側のバグ・未処理の例外 |
| `502 Bad Gateway` / `504 Gateway Timeout` | 中継先（アプリ本体）の異常・応答なし | ロードバランサー・プロキシの背後のアプリを確認 |
| `503 Service Unavailable` | 一時的に利用不可 | メンテナンス・過負荷 |

### 認証方式

| 方式 | ヘッダー例 | 特徴 |
| --- | --- | --- |
| API キー | `X-API-Key: xxxxx`（名称はサービスごと） | 簡単。漏れたら即無効化が必要 |
| Basic 認証 | `Authorization: Basic <ユーザー:パスワードのBase64>` | Base64 は暗号ではない。**HTTPS 必須** |
| Bearer トークン | `Authorization: Bearer <アクセストークン>` | OAuth 2.0 / OpenID Connect で取得。期限付き |
| JWT | Bearer トークンの形式の一つ（`xxxxx.yyyyy.zzzzz`） | 中身は Base64URL で**誰でも読める**。秘密情報を入れない |

## 環境構築

### 1. curl を使えるようにする

| OS | 状況 |
| --- | --- |
| Windows 10（1803 以降）/ 11 | `curl.exe` が標準搭載 |
| macOS / Linux | 標準搭載（なければ `apt install curl` など） |

```sh
curl --version
```

**Windows PowerShell 5.1 では `curl` が `Invoke-WebRequest` の別名**になっており、curl のオプションが通じません。PowerShell では必ず **`curl.exe`** と拡張子付きで実行します（PowerShell 7 ではこの別名は削除されています）。

### 2. JSON を見やすくする（jq）

```sh
curl -s https://api.example.com/users | jq .
curl -s https://api.example.com/users | jq '.[] | {id, name}'
```

Windows は `winget install jqlang.jq` で入れられます。jq がない環境では `python -m json.tool` でも整形できます。

### 3. GUI ツール

| ツール | 用途 |
| --- | --- |
| Postman | リクエストの保存・共有、環境変数、テスト自動化 |
| VS Code の REST Client 拡張機能 | `.http` ファイルにリクエストを書いて実行。Git で管理できる |
| ブラウザの開発者ツール（Network タブ） | 画面から呼ばれている API の実際のリクエスト・レスポンスを確認 |
| Swagger UI | OpenAPI 定義からドキュメントと試行画面を生成 |

### 4. 社内プロキシ環境

```sh
# 環境変数で指定（多くのツールが参照する）
export HTTPS_PROXY=http://proxy.example.co.jp:8080
export NO_PROXY=localhost,127.0.0.1,.example.co.jp
# curl のオプションで指定
curl -x http://proxy.example.co.jp:8080 https://api.example.com/
```

Windows（コマンドプロンプト）は `set HTTPS_PROXY=http://proxy.example.co.jp:8080` です。

## コマンド

### 早見表：curl

| 操作 | コマンド |
| --- | --- |
| GET | `curl -s https://api.example.com/users` |
| JSON を POST | `curl -X POST URL -H "Content-Type: application/json" -d '{"name":"Taro"}'` |
| JSON を POST（curl 7.82 以降） | `curl --json '{"name":"Taro"}' URL` |
| ファイルの JSON を送る | `curl -H "Content-Type: application/json" --data-binary @body.json URL` |
| ヘッダー付きで表示 | `curl -i URL` |
| ヘッダーだけ表示 | `curl -I URL`（HEAD リクエスト） |
| 通信の詳細（TLS・送信ヘッダー） | `curl -v URL` |
| 認証トークン | `curl -H "Authorization: Bearer <token>" URL` |
| Basic 認証 | `curl -u user:password URL` |
| ステータスコードだけ表示 | `curl -s -o /dev/null -w "%{http_code}\n" URL` |
| 応答時間を表示 | `curl -s -o /dev/null -w "%{time_total}\n" URL` |
| リダイレクトに追従 | `curl -L URL` |
| エラー時に終了コードを返す | `curl -f URL` / `curl --fail-with-body URL` |
| タイムアウト | `curl --connect-timeout 5 --max-time 30 URL` |
| ファイルに保存 | `curl -o out.json URL` |
| クエリを URL エンコード | `curl -G URL --data-urlencode "q=東京 本社"` |

`-s` は進捗表示を消すオプションですが、エラーメッセージも消えます。スクリプトでは `-sS`（進捗は消してエラーは表示）が便利です。

### Windows での JSON の書き方

```bat
:: コマンドプロンプト: 外側を " にし、内側の " を \" でエスケープ
curl.exe -X POST https://api.example.com/users -H "Content-Type: application/json" -d "{\"name\":\"Taro\"}"
```

```powershell
# PowerShell: クォートの事故を避けるならファイルから送るのが確実
curl.exe -X POST https://api.example.com/users -H "Content-Type: application/json" --data-binary "@body.json"

# PowerShell ネイティブのコマンド（結果がオブジェクトで返る）
$body = @{ name = "Taro" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri https://api.example.com/users -ContentType "application/json; charset=utf-8" -Body $body
```

### 早見表：設計の基本

| 項目 | 例 |
| --- | --- |
| リソース名 | `/users` `/users/{id}/orders`（複数形の名詞） |
| ページング | `GET /users?page=2&limit=20` |
| 絞り込み・並び替え | `GET /users?status=active&sort=-created_at` |
| バージョン | `/v1/users` |
| エラー形式 | `{"error": {"code": "NOT_FOUND", "message": "..."}}` |
| 日時 | ISO 8601 形式（`2026-10-19T09:00:00+09:00`） |

## サンプル

### API 仕様を OpenAPI で書く

```yaml
openapi: 3.0.3
info:
  title: User API
  version: 1.0.0
paths:
  /v1/users/{id}:
    get:
      summary: ユーザーを1件取得
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: 成功
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/User"
        "404":
          description: 該当なし
components:
  schemas:
    User:
      type: object
      required: [id, name]
      properties:
        id:
          type: integer
          example: 123
        name:
          type: string
          example: 山田太郎
```

OpenAPI 定義があれば、Swagger UI でのドキュメント公開、クライアントコードの自動生成、モックサーバーの起動ができます。**仕様書を Excel ではなく OpenAPI で管理**すると、実装との食い違いを減らせます。

### エラーレスポンスの形式（RFC 9457 Problem Details）

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/validation-error",
  "title": "入力内容に誤りがあります",
  "status": 400,
  "detail": "email の形式が正しくありません",
  "instance": "/v1/users"
}
```

標準化された形式を使うと、クライアントのエラー処理を共通化できます。独自形式にする場合も、**全 API で同じ形**にそろえることが重要です。

### ページング付き一覧のレスポンス

```json
{
  "items": [
    { "id": 1, "name": "山田太郎" },
    { "id": 2, "name": "佐藤花子" }
  ],
  "page": 2,
  "limit": 20,
  "total": 345
}
```

### 動作確認スクリプト（bash ＋ curl ＋ jq）

```sh
#!/bin/bash
set -euo pipefail
BASE=https://api.example.com/v1
TOKEN="${API_TOKEN:?API_TOKEN を設定してください}"

# 作成して ID を取り出す
id=$(curl -sS --fail-with-body -X POST "$BASE/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"テスト太郎","email":"test@example.com"}' | jq -r '.id')
echo "created id=$id"

# 取得してステータスを確認
code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE/users/$id")
[ "$code" = "200" ] && echo "OK" || { echo "NG: $code"; exit 1; }
```

### ブラウザ・Node.js からの呼び出し（fetch）

```javascript
async function getUser(id) {
  const res = await fetch(`https://api.example.com/v1/users/${id}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000), // 10秒でタイムアウト
  });
  if (!res.ok) {
    // fetch は 404 や 500 では例外にならない。ステータスを自分で判定する
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}
```

## エラー対応

まず**「通信自体が失敗したのか」「HTTP のステータスコードが返ってきたのか」**を切り分けます。前者は curl のエラー番号、後者はステータスコードとレスポンスボディを見ます。

### 通信エラー（curl）

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `curl: (6) Could not resolve host: api.example.com` | ホスト名の誤り、DNS、プロキシ未設定 | URL の綴りを確認。社内ネットワークなら `HTTPS_PROXY` か `-x` を設定 |
| `curl: (7) Failed to connect to localhost port 8080 after 0 ms: Couldn't connect to server`（古い版は `Connection refused`） | サーバーが起動していない、ポート違い、ファイアウォール | サーバーの起動とポートを確認。Windows は `netstat -ano \| findstr :8080` |
| `curl: (28) Connection timed out after 5001 milliseconds` / `Operation timed out after …` | 経路の遮断（FW・セキュリティグループ）、サーバーの処理が遅い | 接続段階か応答待ちかを `-v` で確認。前者はネットワーク、後者はサーバー側の処理を調べる |
| `curl: (60) SSL certificate problem: unable to get local issuer certificate` | 社内プロキシの SSL 検査（独自のルート証明書）、中間証明書の不足 | 社内のルート証明書を `--cacert` で指定、または OS の証明書ストアに登録。`-k` は検証を無効にするため本番・スクリプトでは使わない |
| `curl: (35) schannel: next InitializeSecurityContext failed: … revocation …`（Windows） | 証明書の失効確認サーバーに到達できない（プロキシ環境） | `--ssl-no-revoke` を付ける（社内ポリシーを確認のうえ） |
| `curl: (22) The requested URL returned error: 404` | `-f` 付きで 4xx / 5xx を受け取った | ステータスに応じて下表で対処 |

### HTTP エラー・クライアント側のエラー

| 症状・メッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `401 Unauthorized` | トークンなし・期限切れ・`Bearer` の綴り誤り | `-v` で `Authorization` ヘッダーが実際に送られているか確認。トークンを再取得 |
| `403 Forbidden` | 権限不足、IP 制限、WAF によるブロック | 権限・許可 IP を確認。ボディに理由が書かれていることが多い |
| `415 Unsupported Media Type` | `Content-Type: application/json` がない（curl の `-d` は既定で `application/x-www-form-urlencoded`） | `-H "Content-Type: application/json"` か `--json` を使う |
| `400 Bad Request`（JSON パースエラー） | JSON の構文誤り（末尾のカンマ、シングルクォート）、シェルのクォート崩れ | `jq . body.json` で構文チェック。ファイルから `--data-binary @body.json` で送る |
| `405 Method Not Allowed` | メソッド違い、URL 末尾の `/` の有無 | API 仕様のメソッドとパスを確認 |
| `429 Too Many Requests` | 回数制限超過 | `Retry-After` に従って待つ。指数バックオフでリトライ |
| `Access to fetch at '…' from origin '…' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.` | ブラウザの CORS 制限。**サーバー側の設定の問題** | API サーバーで許可するオリジンを設定する。プリフライト（`OPTIONS`）にも応答させる。curl では発生しない |
| `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON` | JSON のつもりが HTML（エラーページ・ログイン画面）が返っている | ステータスコードと `Content-Type` を確認。URL・認証・プロキシを見直す |
| 日本語が文字化けする | `charset` の不一致、Windows のコンソールの文字コード | UTF-8 で送受信する。PowerShell では `-ContentType "application/json; charset=utf-8"` を指定 |

## 実務Tips

### 設計

- URL は**名詞（リソース）**、操作は**メソッド**で表す。`/getUsers` `/deleteUser?id=1` のような動詞の URL は避ける
- 命名規則（`snake_case` か `camelCase`）、日時形式（ISO 8601）、エラー形式、ページングの形を**最初に決めて全 API で統一**する
- 一覧 API には必ず**ページングと上限**を付ける。全件返す API はデータ増加で必ず遅くなる
- 破壊的な変更（項目の削除・型の変更）は新しいバージョン（`/v2`）で出す。項目の追加は互換性を保てるので、クライアントは**知らない項目を無視する**実装にする
- 決済・発注のように二重実行が困るものは、`Idempotency-Key` ヘッダーなどで重複リクエストを検出できるようにする

### セキュリティ

- 通信は必ず HTTPS。API キーやトークンを**URL のクエリに載せない**（アクセスログやブラウザ履歴に残る）
- トークン・API キーをソースコードや Git に書かない。環境変数やシークレット管理サービスを使う
- 他人の ID を指定してデータを取得できないか（認可漏れ）を必ずテストする。API の脆弱性で特に多い
- エラーレスポンスにスタックトレースや SQL を含めない
- CORS の `Access-Control-Allow-Origin: *` を、認証が必要な API に安易に設定しない

### 連携・運用

- 外部 API を呼ぶ側は、**タイムアウトを必ず設定**する（既定値が無制限のライブラリもある）
- リトライは冪等な操作に限定し、間隔を指数的に延ばす（1秒→2秒→4秒）。`5xx` と `429` だけを対象にし、`4xx` はリトライしない
- リクエスト ID（`X-Request-Id` など）をログに出し、呼び出し側と呼ばれる側でログを突き合わせられるようにする
- 外部サービスの API は仕様変更・廃止の告知（Changelog・メール）を購読しておく
- 動作確認の curl コマンドや `.http` ファイルを手順書・リポジトリに残しておくと、障害時の切り分けが速くなる

## 関連リンク

- [MDN: HTTP](https://developer.mozilla.org/ja/docs/Web/HTTP)
- [curl 公式ドキュメント](https://curl.se/docs/)
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- [jq（GitHub）](https://github.com/jqlang/jq)
