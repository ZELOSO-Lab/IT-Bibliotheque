---
title: JavaScript 技術まとめ
slug: javascript
excerpt: JavaScriptの基本文法とDOM操作・非同期処理の考え方、Node.jsとnpmの環境構築、よく使う構文とコマンド、fetchやCSV集計のサンプル、よくあるエラーと対処、現場でハマりやすいポイントまでを1ページにまとめました。
updated: 2026-10-19
---

# JavaScript 技術まとめ

## 基礎

JavaScript は Web ブラウザで動作するスクリプト言語です。画面の操作（DOM 操作）や API との通信を担い、今の Web フロントエンドはほぼすべて JavaScript（または JavaScript に変換される TypeScript）で書かれています。**Node.js** を使うと、サーバーやコマンドラインツールもJavaScriptで書けます。

### 主な用途

| 用途 | 代表的なライブラリ・ツール | 一言でいうと |
| --- | --- | --- |
| Webフロントエンド | 素の DOM API、React、Vue.js | 画面の表示・入力チェック・API 呼び出し |
| SPA開発 | React、Vue.js、Angular、Vite | ページ遷移なしで動く業務画面 |
| Node.jsサーバ | Express、Fastify、NestJS | API サーバー、BFF |
| ブラウザ操作の自動化 | Playwright、Puppeteer | E2E テスト、定型作業の自動化 |
| ツール・ビルド | npm scripts、ESLint、Prettier | 開発用のスクリプトや品質チェック |

### まず押さえる用語

| 用語 | 意味 | 現場での注意点 |
| --- | --- | --- |
| ECMAScript（ES） | JavaScript の言語仕様。毎年改訂（ES2015 = ES6 が大きな転換点） | 古い資料の `var` や `function` だらけのコードは ES5 時代の書き方 |
| DOM | HTML をプログラムから操作するための API | `document.querySelector` などはブラウザ専用。Node.js にはない |
| Node.js | ブラウザ外で JavaScript を動かす実行環境 | 偶数バージョンの **LTS（長期サポート版）** を使う |
| npm | Node.js のパッケージマネージャー | `package.json` に依存を記録する |
| ES Modules（ESM） | `import` / `export` によるモジュール方式 | Node.js の旧来方式 `require`（CommonJS）と混在させると混乱しやすい |
| 非同期処理 | 通信やファイル読み込みの完了を待たずに次へ進む仕組み | `async` / `await` で順番に書くのが基本 |
| TypeScript | JavaScript に型を付けた言語 | 中〜大規模の開発では TypeScript を採用することが多い |

### 基本文法

```javascript
const name = 'Taro';          // 再代入しない値は const
let count = 0;                // 再代入する値だけ let（var は使わない）

const user = { id: 1, name, tags: ['admin'] };
const { id, tags = [] } = user;              // 分割代入（既定値つき）
const merged = { ...user, active: true };    // スプレッドでコピー＋追加

console.log(`Hello ${name}`);                // テンプレート文字列

const add = (a, b) => a + b;                 // アロー関数
const city = user.address?.city ?? '未設定'; // オプショナルチェーン＋null合体

if (count === 0) {                           // 比較は === を使う
  count += 1;
}
```

## 環境構築

ブラウザで動かすだけなら、HTML ファイルに `<script>` を書けばインストールは不要です。ここでは開発に必要な Node.js と npm の準備を説明します。

### 1. Node.js をインストールする

| 方法 | 向いている場面 |
| --- | --- |
| 公式サイト（nodejs.org）の **LTS 版インストーラー** | まず動かしたい、1つのバージョンで十分 |
| バージョン管理ツール（Windows: nvm-windows / fnm、macOS・Linux: nvm / fnm） | 案件ごとに Node.js のバージョンが違う |

インストール後、**新しいターミナルを開いて**確認します。

```sh
node -v
npm -v
```

### 2. プロジェクトを作る

```sh
mkdir myapp && cd myapp
npm init -y                  # package.json を作成
npm install axios            # 本番で使う依存（dependencies）
npm install -D eslint        # 開発時だけ使う依存（devDependencies）
```

`node_modules` フォルダは Git にコミットせず、`.gitignore` に追加します。`package-lock.json` は**コミットします**（全員が同じバージョンを使うため）。

### 3. `import` を使う設定（ES Modules）

`package.json` に `"type": "module"` を書くと、`.js` ファイルで `import` / `export` が使えます。

```json
{
  "name": "myapp",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "lint": "eslint ."
  }
}
```

`npm start`、`npm run dev` のように `scripts` に書いたコマンドを実行できます。`node --watch` はファイル変更時に自動で再起動します。

### 4. 社内プロキシ環境の場合

```sh
npm config set proxy http://proxy.example.co.jp:8080
npm config set https-proxy http://proxy.example.co.jp:8080
npm config get proxy
```

SSL インスペクションがある環境では、社内CAの証明書を `npm config set cafile <パス>` で指定します（Node.js 本体の通信には環境変数 `NODE_EXTRA_CA_CERTS` を使います）。`strict-ssl false` で検証を無効にするのは避けます。

### 5. エディタとブラウザの開発者ツール

VS Code が定番です。ブラウザでは **F12（開発者ツール）**の「Console」でエラーを、「Network」で通信内容（ステータス・レスポンス）を確認します。原因調査はまずこの2つから始めます。

## コマンド

### npm

| 操作 | コマンド |
| --- | --- |
| 依存をインストール | `npm install` |
| lock ファイル通りに厳密にインストール（CI 向け） | `npm ci` |
| パッケージ追加（開発用） | `npm install -D vitest` |
| パッケージ削除 | `npm uninstall axios` |
| スクリプト実行 | `npm run build` |
| インストールせずにコマンド実行 | `npx eslint .` |
| 更新可能なパッケージ | `npm outdated` |
| 脆弱性チェック | `npm audit` |
| 依存関係の確認 | `npm ls axios` |

### Node.js

```sh
node app.js                  # 実行
node                         # REPL（終了は .exit または Ctrl+C を2回）
node --watch app.js          # 変更を監視して自動再起動
node --inspect app.js        # Chrome / VS Code のデバッガを接続できる
node -e "console.log(process.version)"
```

### DOM 要素の取得とイベント

```javascript
const button = document.querySelector('#submit');
button.addEventListener('click', () => { /* 処理 */ });
```

### fetch で API 呼び出し

```javascript
const res = await fetch('/api/users');
if (!res.ok) throw new Error(res.statusText);
const users = await res.json();
```

### 早見表：配列

| 操作 | コマンド・構文 |
| --- | --- |
| 変換 | `arr.map((x) => x * 2)` |
| 絞り込み | `arr.filter((x) => x > 0)` |
| 集計 | `arr.reduce((sum, x) => sum + x, 0)` |
| 検索 | `arr.find((x) => x.id === id)` |
| 含むか | `arr.includes(3)` / `arr.some((x) => x > 10)` |
| 数値ソート | `arr.sort((a, b) => a - b)` |

### 早見表：DOM

| 操作 | コマンド・構文 |
| --- | --- |
| 要素取得 | `document.querySelector('#id')` / `document.querySelectorAll('.item')` |
| イベント | `el.addEventListener('click', handler);` |
| クラス操作 | `el.classList.toggle('active');` |
| テキスト設定 | `el.textContent = 'Hello';` |
| 属性 | `el.getAttribute('href')` / `el.dataset.id` |
| 読み込み完了後に実行 | `<script src="app.js" defer></script>` |

### 早見表：非同期

| 操作 | コマンド・構文 |
| --- | --- |
| fetch | `const res = await fetch('/api'); const data = await res.json();` |
| 並列実行 | `await Promise.all([p1, p2]);` |
| 一部失敗しても全結果を受け取る | `await Promise.allSettled([p1, p2]);` |
| タイマー | `setTimeout(() => { ... }, 1000);` |
| 例外処理 | `try { ... } catch (e) { console.error(e); }` |

## サンプル

### タイムアウト付きの API 呼び出し

```javascript
// タイムアウト付きで JSON を取得する（Node.js 18 以降・ブラウザ共通）
export async function getJson(url, { timeoutMs = 10000 } = {}) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${url}`);
  }
  return res.json();
}

// 複数の API を並列で呼び、失敗したものも含めて結果を受け取る
export async function getAll(urls) {
  const results = await Promise.allSettled(urls.map((u) => getJson(u)));
  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? { url: urls[i], data: r.value }
      : { url: urls[i], error: r.reason.message },
  );
}
```

`fetch` は **HTTP 404 や 500 でも例外にならず**、`res.ok` が `false` になるだけです。ステータスを確認しないと、エラーページを JSON として解析しようとして別のエラーになります。

### フォーム送信を API 経由で行う（ブラウザ）

```html
<form id="user-form">
  <input name="name" required>
  <button type="submit">登録</button>
  <p id="message" role="status"></p>
</form>
<script type="module">
  const form = document.querySelector('#user-form');
  const message = document.querySelector('#message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();                       // 画面遷移を止める
    const body = Object.fromEntries(new FormData(form));
    const button = form.querySelector('button');
    button.disabled = true;                   // 二重送信防止
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      message.textContent = '登録しました';
    } catch (err) {
      message.textContent = `登録に失敗しました（${err.message}）`;
    } finally {
      button.disabled = false;
    }
  });
</script>
```

ユーザー入力を画面に出すときは `innerHTML` ではなく **`textContent`** を使います（XSS 対策）。

### CSV を集計する Node.js スクリプト

```javascript
// CSV を読み込み、部署ごとの合計を出す（Node.js 標準モジュールのみ）
import { readFile, writeFile } from 'node:fs/promises';

const [, , src = 'sales.csv', out = 'summary.json'] = process.argv;

const text = await readFile(src, 'utf8');
const [header, ...lines] = text.replace(/^﻿/, '').trim().split(/\r?\n/);
const cols = header.split(',');

const totals = {};
for (const line of lines) {
  const row = Object.fromEntries(line.split(',').map((v, i) => [cols[i], v]));
  const amount = Number(row['金額']);
  if (Number.isNaN(amount)) {
    console.warn('不正な行をスキップ:', line);
    continue;
  }
  totals[row['部署']] = (totals[row['部署']] ?? 0) + amount;
}

await writeFile(out, JSON.stringify(totals, null, 2), 'utf8');
console.log(totals);
```

```sh
node summary.js sales.csv summary.json
```

トップレベルの `await` を使うため、ES Modules（`"type": "module"` または拡張子 `.mjs`）で実行します。Excel 出力の CSV に付く BOM（`﻿`）と Windows の改行（`\r\n`）を最初に処理しているのがポイントです。値にカンマや改行を含む本格的な CSV は、専用のライブラリで解析します。

## エラー対応

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `TypeError: Cannot read properties of undefined (reading 'name')` | `undefined` のプロパティを参照（API の戻り値が想定と違う、要素が見つからない） | `console.log` で直前の値を確認。`user?.name` で安全に参照 |
| `TypeError: Cannot read properties of null (reading 'addEventListener')` | `querySelector` が要素を見つけられず `null` を返した | セレクタの誤りを確認。`<script>` に `defer` を付け、HTML の読み込み後に実行する |
| `ReferenceError: x is not defined` | 変数名のタイプミス、スコープ外、import 忘れ | スペルと宣言場所を確認 |
| `TypeError: Assignment to constant variable.` | `const` で宣言した変数に再代入 | 再代入が必要なら `let` にする |
| `TypeError: xxx is not a function` | 関数でない値を呼び出した（名前の衝突、import の誤り、名前付き export とデフォルト export の取り違え） | `typeof xxx` で型を確認。`import { xxx }` と `import xxx` を見直す |
| `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON` | JSON のつもりで HTML（エラーページや index.html）を受け取った | Network タブで URL とステータスを確認 |
| `SyntaxError: Unexpected end of JSON input` | 空のレスポンスを `res.json()` で解析した | 204 などの空応答では `json()` を呼ばない |
| `SyntaxError: Cannot use import statement outside a module` | CommonJS として扱われるファイルで `import` を使った | `package.json` に `"type": "module"`、またはブラウザでは `<script type="module">` |
| `ReferenceError: require is not defined in ES module scope, you can use import instead` | ES Modules のファイルで `require` を使った | `import` に書き換える |
| `Error: Cannot find module 'axios'` | パッケージ未インストール、パスの誤り | `npm install` を実行。相対パスなら `./` と拡張子を確認 |
| `Access to fetch at '...' from origin '...' has been blocked by CORS policy` | 別オリジン（ドメイン・ポート違い）の API がアクセスを許可していない | **API サーバー側**で `Access-Control-Allow-Origin` を設定。開発時は開発サーバーのプロキシ機能を使う |
| `TypeError: Failed to fetch`（Node.js では `TypeError: fetch failed`） | ネットワーク到達不可、CORS、DNS、証明書エラー | Network タブ・Console の直前のメッセージを確認。Node.js は `error.cause` に詳細が入る |
| `Error: listen EADDRINUSE: address already in use :::3000` | ポートが他のプロセスで使用中 | 前回起動したプロセスを止める。Windows は `netstat -ano \| findstr :3000` で PID を調べる |
| `RangeError: Maximum call stack size exceeded` | 無限再帰 | 再帰の終了条件を確認 |
| `npm error code ERESOLVE` / `ERESOLVE unable to resolve dependency tree` | パッケージ同士の peerDependencies が合わない | 依存のバージョンを揃える。`--legacy-peer-deps` は一時回避として理由を残して使う |
| `'node' は、内部コマンドまたは外部コマンド、…として認識されていません。` | PATH が通っていない | インストール後にターミナルを開き直す。それでもだめなら PATH を確認 |

**非同期のエラーに注意**: `await` を付け忘れると、エラーが `try` / `catch` で捕まらず `Uncaught (in promise)` としてコンソールに出ます。Node.js では未処理の Promise の拒否でプロセスが終了します。

## 実務Tips

### 書き方の基本

- **比較は `===` / `!==`**。`==` は型変換が入るため `'0' == 0` が `true` になる
- `var` は使わず `const` を基本、再代入するものだけ `let`
- 配列の `sort()` は**既定で文字列として比較**する。`[10, 9, 1].sort()` は `[1, 10, 9]`。数値は `sort((a, b) => a - b)`
- `0.1 + 0.2` は `0.30000000000000004`。金額は整数（円単位）で扱う
- `'5' + 1` は `'51'`、`'5' - 1` は `4`。フォームの値は文字列なので `Number()` で変換してから計算する

### 非同期処理

- `async` 関数を呼ぶときは `await` を忘れない。ESLint の `no-floating-promises`（typescript-eslint）などで検出できる
- ループの中で1件ずつ `await` すると遅い。独立した処理は `Promise.all` で並列にする（ただし大量の同時リクエストで相手に負荷をかけない）
- `fetch` は HTTP エラーで例外にならない。共通のラッパー関数で `res.ok` を確認する

### セキュリティ

- ユーザー入力を `innerHTML` に入れない（XSS）。表示は `textContent`
- API キーや秘密情報をフロントエンドの JavaScript に書かない。ビルドしても**利用者のブラウザから丸見え**
- `npm audit` を定期的に実行し、使っていないパッケージは削除する。知名度の低いパッケージの追加は慎重に

### 運用・チーム開発

- Node.js のバージョンを `package.json` の `engines` や `.nvmrc` で明示し、チームと CI で揃える
- CI では `npm install` ではなく **`npm ci`** を使う（lock ファイルと完全に一致させる）
- フォーマットは Prettier、静的チェックは ESLint に任せ、レビューでは中身の議論に集中する
- 規模が大きくなりそうなら最初から TypeScript を採用する。後からの移行は手間がかかる
- 社内のレガシーブラウザ対応が必要な場合は、使える構文を事前に確認する（Internet Explorer はサポート終了済み）

## 関連リンク

- [MDN Web Docs: JavaScript](https://developer.mozilla.org/ja/docs/Web/JavaScript)
- [MDN: JavaScript ガイド](https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide)
- [MDN: Fetch API](https://developer.mozilla.org/ja/docs/Web/API/Fetch_API)
- [Node.js 公式サイト](https://nodejs.org/ja)
- [Node.js ドキュメント](https://nodejs.org/docs/latest/api/)
- [npm Docs](https://docs.npmjs.com/)
- [ECMAScript 仕様（TC39）](https://tc39.es/ecma262/)
