---
title: JavaScript 技術まとめ
slug: javascript
excerpt: JavaScriptの基本文法、DOM操作、非同期処理、エラー対応などの技術情報をまとめています。
updated: 2026-10-19
---

# JavaScript 技術まとめ

## 基礎

Webブラウザで動作するスクリプト言語。Node.jsでサーバ側にも利用。

### 主な用途

- Webフロントエンド
- Node.jsサーバ
- ブラウザ操作の自動化
- SPA開発

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[JavaScript 公式ドキュメント](https://developer.mozilla.org/ja/docs/Web/JavaScript)を参照してください。

## コマンド

### DOM要素の取得とイベント

```
const button = document.querySelector('#submit');
button.addEventListener('click', () => { /* 処理 */ });
```

### fetchでAPI呼び出し

```
const res = await fetch('/api/users');
if (!res.ok) throw new Error(res.statusText);
const users = await res.json();
```

### 配列の変換・絞り込み

```
const names = users
  .filter((u) => u.active)
  .map((u) => u.name);
```

### 早見表：変数・構文

| 操作 | コマンド・構文 |
| --- | --- |
| 定数・変数 | `const a = 1; let b = 2;` |
| テンプレート文字列 | `` `Hello ${name}` `` |
| 分割代入 | `const { id, name } = user;` |
| スプレッド | `const merged = { ...a, ...b };` |

### 早見表：配列

| 操作 | コマンド・構文 |
| --- | --- |
| 変換 | `arr.map((x) => x * 2)` |
| 絞り込み | `arr.filter((x) => x > 0)` |
| 集計 | `arr.reduce((sum, x) => sum + x, 0)` |
| 検索 | `arr.find((x) => x.id === id)` |

### 早見表：DOM

| 操作 | コマンド・構文 |
| --- | --- |
| 要素取得 | `document.querySelector('#id')` |
| イベント | `el.addEventListener('click', handler);` |
| クラス操作 | `el.classList.toggle('active');` |
| テキスト設定 | `el.textContent = "Hello";` |

### 早見表：非同期

| 操作 | コマンド・構文 |
| --- | --- |
| fetch | `const res = await fetch('/api'); const data = await res.json();` |
| Promise.all | `await Promise.all([p1, p2]);` |
| タイマー | `setTimeout(() => { ... }, 1000);` |
| 例外処理 | `try { ... } catch (e) { console.error(e); }` |

### 早見表：Node.js / npm

| 操作 | コマンド・構文 |
| --- | --- |
| プロジェクト作成 | `npm init -y` |
| パッケージ追加 | `npm install axios` |
| スクリプト実行 | `npm run build` |
| 実行 | `node app.js` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[JavaScript 公式ドキュメント](https://developer.mozilla.org/ja/docs/Web/JavaScript)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[JavaScript 公式ドキュメント](https://developer.mozilla.org/ja/docs/Web/JavaScript)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[JavaScript 公式ドキュメント](https://developer.mozilla.org/ja/docs/Web/JavaScript)を参照してください。

## 関連リンク

- [JavaScript 公式ドキュメント](https://developer.mozilla.org/ja/docs/Web/JavaScript)
