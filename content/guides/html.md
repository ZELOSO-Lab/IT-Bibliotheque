---
title: HTML 技術まとめ
slug: html
excerpt: HTMLのタグ、フォーム、セマンティクス、CSSとの連携などの技術情報をまとめています。
updated: 2026-10-19
---

# HTML 技術まとめ

## 基礎

Webページの構造を記述するマークアップ言語。

### 主な用途

- Webページ制作
- メールテンプレート
- Webアプリの画面
- SEO・アクセシビリティ対応

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[HTML 公式ドキュメント](https://developer.mozilla.org/ja/docs/Web/HTML)を参照してください。

## コマンド

### 基本テンプレート

```
<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ページタイトル</title>
</head>
<body>
</body>
</html>
```

### フォーム

```
<label for="email">メール</label>
<input id="email" type="email" name="email" required>
```

### セマンティックな構造

```
<header>…</header>
<nav>…</nav>
<main>…</main>
<footer>…</footer>
```

### 早見表：文書構造

| 操作 | コマンド・構文 |
| --- | --- |
| 基本 | `<!doctype html> <html lang="ja">` |
| 文字コード | `<meta charset="UTF-8">` |
| ビューポート | `<meta name="viewport" content="width=device-width, initial-scale=1">` |
| CSS 読込 | `<link rel="stylesheet" href="style.css">` |

### 早見表：セマンティクス

| 操作 | コマンド・構文 |
| --- | --- |
| ページ構造 | `<header> <nav> <main> <footer>` |
| 記事・節 | `<article> <section> <aside>` |
| 見出し | `<h1>…</h1> ～ <h6>…</h6>` |
| リスト | `<ul><li>…</li></ul>` |

### 早見表：リンク・画像

| 操作 | コマンド・構文 |
| --- | --- |
| リンク | `<a href="/about">About</a>` |
| 新しいタブ | `<a href="…" target="_blank" rel="noopener">` |
| 画像 | `<img src="a.png" alt="説明" width="200" height="100">` |
| 遅延読込 | `<img src="a.png" alt="" loading="lazy">` |

### 早見表：フォーム

| 操作 | コマンド・構文 |
| --- | --- |
| 入力欄 | `<label for="email">メール</label> <input id="email" type="email" required>` |
| 選択 | `<select name="pref"><option>東京</option></select>` |
| チェック | `<input type="checkbox" name="agree">` |
| 送信 | `<button type="submit">送信</button>` |

### 早見表：テーブル

| 操作 | コマンド・構文 |
| --- | --- |
| 基本 | `<table><thead>…</thead><tbody>…</tbody></table>` |
| 見出しセル | `<th scope="col">名前</th>` |
| 結合 | `<td colspan="2">  <td rowspan="2">` |
| キャプション | `<caption>売上一覧</caption>` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[HTML 公式ドキュメント](https://developer.mozilla.org/ja/docs/Web/HTML)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[HTML 公式ドキュメント](https://developer.mozilla.org/ja/docs/Web/HTML)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[HTML 公式ドキュメント](https://developer.mozilla.org/ja/docs/Web/HTML)を参照してください。

## 関連リンク

- [HTML 公式ドキュメント](https://developer.mozilla.org/ja/docs/Web/HTML)
