---
title: HTML 技術まとめ
slug: html
excerpt: HTMLの文書構造とセマンティクス、確認環境の用意、タグの早見表、フォームやテーブルのサンプル、文字化けやバリデーションエラーへの対処、アクセシビリティとSEOの実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# HTML 技術まとめ

## 基礎

HTML（HyperText Markup Language）は、Webページの**構造と意味**を記述するマークアップ言語です。見た目は CSS、動きは JavaScript が担当し、HTML は「ここは見出し」「ここはナビゲーション」「ここは入力欄」という**意味付け**に専念するのが現在の基本です。

現在の HTML は WHATWG が管理する **HTML Living Standard** で、「HTML5」のような版番号による区切りはなくなりました。文書の先頭に `<!doctype html>` を書けば、ブラウザは標準モードで描画します。

### まず押さえる用語

| 用語 | 意味 | 現場での注意点 |
| --- | --- | --- |
| 要素（タグ） | `<p>…</p>` のような構造の単位 | `<img>` `<br>` `<input>` などの空要素は閉じタグを書かない |
| 属性 | 要素に付ける追加情報（`href` `alt` `id` など） | 値は `"` で囲む習慣にしておくと事故が少ない |
| セマンティクス | 要素が持つ意味 | `<div>` だらけにせず、意味のある要素を選ぶ。支援技術・検索エンジンが読む |
| DOCTYPE | `<!doctype html>` | 省略すると互換（Quirks）モードになり、CSS の解釈が変わる |
| ブロック／インライン | 表示の振る舞い | 現在は CSS の `display` で決まる。HTML 側は「コンテンツモデル」で入れ子の可否が決まる |
| 文字参照 | `&lt;` `&gt;` `&amp;` `&quot;` | 本文に `<` や `&` をそのまま書かない |
| ARIA | `role` `aria-*` 属性 | **ネイティブ要素で表現できるならARIAは使わない**のが原則 |

### よく使う要素の分類

| 分類 | 要素 | 用途 |
| --- | --- | --- |
| 文書 | `html` `head` `body` `title` `meta` `link` | ページ全体の枠と設定 |
| セクション | `header` `nav` `main` `footer` `article` `section` `aside` | ページの領域 |
| 見出し・本文 | `h1`～`h6` `p` `ul` `ol` `li` `dl` `blockquote` | 文章構造 |
| テキスト | `a` `strong` `em` `code` `time` `br` `span` | 文中の意味付け |
| 埋め込み | `img` `picture` `video` `audio` `iframe` `svg` | 画像・動画 |
| フォーム | `form` `label` `input` `select` `textarea` `button` `fieldset` | 入力 |
| 表 | `table` `caption` `thead` `tbody` `tr` `th` `td` | 表形式データ |
| 対話 | `details` `summary` `dialog` | 開閉・モーダル |

## 環境構築

HTML 自体はインストール不要です。**エディタ・ブラウザ・ローカルWebサーバー・検証ツール**の4つを揃えれば十分です。

### 1. エディタ

Visual Studio Code が定番です。`!` を入力して Tab（Emmet）で基本テンプレートが展開されます。保存時の文字コードは**UTF-8（BOMなし）**にします（右下のステータスバーで確認・変更できます）。

### 2. ブラウザと開発者ツール

Chrome / Edge / Firefox の開発者ツールで、DOM・CSS・ネットワーク・コンソールを確認します。社内システムでは利用ブラウザが指定されていることが多いので、**対象ブラウザで必ず確認**します。

### 3. ローカルWebサーバー

HTML ファイルをダブルクリック（`file://`）で開くと、`fetch` や ES Modules が動かない、絶対パス `/css/style.css` が解決できない、などの差が出ます。簡易サーバーで `http://localhost` から開くのが確実です。

```sh
# Python がある場合（Windows は python、環境により py）
python -m http.server 8000
# → http://localhost:8000/ を開く
```

VS Code 拡張機能の「Live Server」を使うと、保存時に自動でリロードされます。

### 4. 検証ツール

- **W3C Nu HTML Checker**（https://validator.w3.org/nu/）: URL・ファイル・直接入力で文法をチェック
- 社外に出せない画面は、Java があればローカル版 `vnu.jar` で検証できます

```sh
java -jar vnu.jar index.html
java -jar vnu.jar --skip-non-html public/   # ディレクトリ配下をまとめて
```

- Chrome の Lighthouse（開発者ツールの「Lighthouse」タブ）でアクセシビリティ・SEO の基本項目を確認

## コマンド

HTML にコマンドはないため、ここでは**ブラウザ操作のショートカット**と**構文の早見表**をまとめます。

### ブラウザの操作（Chrome / Edge、Windows）

| 操作 | キー |
| --- | --- |
| 開発者ツールを開く | `F12` / `Ctrl+Shift+I` |
| 要素を選択して調べる | `Ctrl+Shift+C` |
| ページのソースを表示 | `Ctrl+U` |
| キャッシュを無視して再読み込み | `Ctrl+Shift+R` / `Ctrl+F5` |
| スマホ表示の切り替え（開発者ツール表示中） | `Ctrl+Shift+M` |

macOS では `Ctrl` を `Cmd`、`Shift+I` を `Option+I` に読み替えます。「ソース表示」はサーバーから届いた HTML、「要素」タブは JavaScript 実行後の DOM です。**両者は違う**ことを覚えておくと調査が速くなります。

### 早見表：文書構造

| 操作 | 構文 |
| --- | --- |
| 基本 | `<!doctype html> <html lang="ja">` |
| 文字コード | `<meta charset="UTF-8">`（`head` の先頭近くに書く） |
| ビューポート | `<meta name="viewport" content="width=device-width, initial-scale=1">` |
| 説明文 | `<meta name="description" content="ページの説明">` |
| CSS 読込 | `<link rel="stylesheet" href="style.css">` |
| JS 読込 | `<script src="app.js" defer></script>` |

### 早見表：セマンティクス

| 操作 | 構文 |
| --- | --- |
| ページ構造 | `<header> <nav> <main> <footer>` |
| 記事・節 | `<article> <section> <aside>` |
| 見出し | `<h1>…</h1> ～ <h6>…</h6>`（レベルを飛ばさない） |
| リスト | `<ul><li>…</li></ul>` / `<ol>` / `<dl><dt>…</dt><dd>…</dd></dl>` |
| 日時 | `<time datetime="2026-10-19">10月19日</time>` |

### 早見表：リンク・画像

| 操作 | 構文 |
| --- | --- |
| リンク | `<a href="/about">About</a>` |
| 新しいタブ | `<a href="…" target="_blank" rel="noopener">` |
| ページ内リンク | `<a href="#faq">FAQへ</a>` ／ 飛び先 `<h2 id="faq">` |
| 電話・メール | `<a href="tel:0312345678">` `<a href="mailto:info@example.com">` |
| 画像 | `<img src="a.png" alt="説明" width="200" height="100">` |
| 遅延読込 | `<img src="a.png" alt="" loading="lazy">` |

### 早見表：フォーム

| 操作 | 構文 |
| --- | --- |
| 入力欄 | `<label for="email">メール</label> <input id="email" type="email" required>` |
| 選択 | `<select name="pref"><option>東京</option></select>` |
| チェック | `<input type="checkbox" name="agree">` |
| 送信 | `<button type="submit">送信</button>` |
| 入力制約 | `minlength` `maxlength` `pattern` `min` `max` `step` |
| 入力補助 | `autocomplete="email"` `inputmode="numeric"` |

### 早見表：テーブル

| 操作 | 構文 |
| --- | --- |
| 基本 | `<table><thead>…</thead><tbody>…</tbody></table>` |
| 見出しセル | `<th scope="col">名前</th>` |
| 結合 | `<td colspan="2">  <td rowspan="2">` |
| キャプション | `<caption>売上一覧</caption>` |

## サンプル

### 基本テンプレート（業務画面の土台）

```html
<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>案件一覧 | 社内ポータル</title>
  <meta name="description" content="登録済み案件の一覧と検索">
  <link rel="icon" href="/favicon.ico">
  <link rel="stylesheet" href="/css/style.css">
  <script src="/js/app.js" defer></script>
</head>
<body>
  <a href="#main" class="skip-link">本文へスキップ</a>
  <header>
    <p class="logo"><a href="/">社内ポータル</a></p>
    <nav aria-label="グローバル">
      <ul>
        <li><a href="/projects" aria-current="page">案件</a></li>
        <li><a href="/reports">レポート</a></li>
      </ul>
    </nav>
  </header>
  <main id="main">
    <h1>案件一覧</h1>
    <!-- ページ固有の内容 -->
  </main>
  <footer>
    <p><small>&copy; 2026 Example Inc.</small></p>
  </footer>
</body>
</html>
```

`<h1>` はページの主題を表す見出しとして1つにするのが一般的です。`defer` を付けた script は HTML の解析を止めず、DOM 構築後に順番どおり実行されます。

### アクセシブルな入力フォーム

```html
<form action="/contact" method="post" novalidate>
  <fieldset>
    <legend>お問い合わせ</legend>

    <label for="name">氏名 <span aria-hidden="true">*</span></label>
    <input id="name" name="name" type="text" autocomplete="name" required>

    <label for="email">メールアドレス</label>
    <input id="email" name="email" type="email" autocomplete="email"
           required aria-describedby="email-help">
    <p id="email-help">返信先になります。</p>

    <label for="tel">電話番号（ハイフンなし）</label>
    <input id="tel" name="tel" type="tel" inputmode="numeric" pattern="[0-9]{10,11}">

    <label for="category">種別</label>
    <select id="category" name="category">
      <option value="">選択してください</option>
      <option value="product">製品について</option>
      <option value="other">その他</option>
    </select>

    <label for="body">内容</label>
    <textarea id="body" name="body" rows="5" maxlength="1000"></textarea>

    <label><input type="checkbox" name="agree" required> 個人情報の取り扱いに同意する</label>
  </fieldset>
  <button type="submit">送信する</button>
</form>
```

- `label` の `for` と `input` の `id` を一致させると、ラベルクリックで入力欄にフォーカスし、読み上げにも対応します
- `novalidate` はブラウザ標準のエラー表示を止め、JavaScript で独自表示するときに付けます。付けなければブラウザが `required` などをチェックします
- **ブラウザ側のチェックは回避できる**ので、サーバー側でも必ず検証します

### データテーブル

```html
<table>
  <caption>2026年度 月別売上（単位: 千円）</caption>
  <thead>
    <tr>
      <th scope="col">月</th>
      <th scope="col">東京</th>
      <th scope="col">大阪</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">4月</th>
      <td>1,200</td>
      <td>860</td>
    </tr>
  </tbody>
</table>
```

レイアウト目的で `<table>` を使うのは避け、表形式のデータにだけ使います。

### レスポンシブ画像と開閉UI

```html
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="新オフィスの外観" width="1200" height="630">
</picture>

<details>
  <summary>よくある質問: パスワードを忘れた</summary>
  <p>ログイン画面の「パスワードを忘れた方」から再設定してください。</p>
</details>
```

`<img>` に `width` と `height` を書いておくと、読み込み前に領域が確保され、レイアウトのずれ（CLS）を防げます。

## エラー対応

HTML は文法が間違っていてもブラウザが補正して表示するため、**エラーに気づきにくい**のが特徴です。バリデーターと開発者ツールのコンソールで確認します。

| 症状・メッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| 文字化けする | `<meta charset>` とファイルの実際の文字コード（Shift_JIS など）が不一致、サーバーの `Content-Type` ヘッダーが別の文字コード | ファイルを UTF-8 で保存し直し、`<meta charset="UTF-8">` を `head` 先頭近くに書く。サーバー側の charset 設定も確認 |
| `Failed to load resource: the server responded with a status of 404 (Not Found)` | CSS・画像・JS のパス間違い、大文字小文字の違い | 開発者ツールの Network タブで実際のURLを確認。Linux サーバーはファイル名の大文字小文字を区別する |
| `Refused to apply style from '…' because its MIME type ('text/html') is not a supported stylesheet MIME type, and strict MIME checking is enabled.` | CSS のURLが404などで HTML（エラーページ）が返っている | CSS のパスを修正する。サーバーが `.css` を `text/css` で返しているか確認 |
| `Mixed Content: The page at '…' was loaded over HTTPS, but requested an insecure …` | HTTPS のページから `http://` の画像・スクリプトを読み込んでいる | 参照先を `https://` にする。ルート相対パス（`/img/a.png`）にする |
| `[DOM] Found 2 elements with non-unique id #email` | 同じ `id` が複数ある | `id` はページ内で一意にする。繰り返し部品は `class` を使う |
| `An invalid form control with name='…' is not focusable.` | `required` の入力欄が非表示（`display:none` など）のまま送信された | 非表示の項目から `required` を外すか、`disabled` にする |
| バリデーター: `Stray end tag “div”.` | 閉じタグが余分、または開始タグとの対応ずれ | エディタのタグ対応表示や整形機能で入れ子を確認 |
| バリデーター: `An “img” element must have an “alt” attribute, except under certain conditions.` | `alt` 属性がない | 意味のある画像は内容を説明、装飾画像は `alt=""` |
| バリデーター: `Element “div” not allowed as child of element “ul” in this context.` | 入れ子のルール違反（`ul` 直下は `li` のみ） | `li` の中に入れる。`p` の中に `div` を入れるのも不可 |
| レイアウトが他のブラウザと違う | `<!doctype html>` がない（互換モード） | 1行目に `<!doctype html>` を書く。BOM や空行の前置きにも注意 |
| 修正が反映されない | ブラウザ・CDN・プロキシのキャッシュ | `Ctrl+Shift+R`。本番はファイル名やクエリにバージョンを付ける（`style.css?v=20261019`） |

**表示崩れの切り分け順**

1. バリデーターでタグの閉じ忘れ・入れ子違反がないか確認する（崩れの原因の多くは HTML 側）
2. 開発者ツールの「要素」タブで、想定どおりの DOM ツリーになっているか確認する
3. 「スタイル」ペインで、どの CSS ルールが効いている／打ち消されているかを見る
4. Network タブで CSS・画像が 200 で取得できているか確認する

## 実務Tips

### セマンティクスとアクセシビリティ

- **クリックできるものは `<button>` か `<a>`** にする。`<div onclick>` はキーボードで操作できず、読み上げもされない
- 使い分けは「画面遷移・URLが変わる＝`<a>`」「処理を実行する＝`<button>`」
- `form` 内の `<button>` は既定で `type="submit"`。送信しないボタンは `type="button"` を明記する（意図しない送信の定番原因）
- 見出しは見た目の大きさではなく**階層**で選ぶ。サイズは CSS で調整する
- 画像の `alt` は「画像が表示されなかったときに代わりに読む文」として書く。「画像」「写真」だけの alt は意味がない
- プレースホルダーは入力すると消えるので、**ラベルの代わりにしない**
- 色だけで状態を伝えない（エラーは赤字＋文言、必須は色＋「必須」表記）

### パフォーマンスとSEO

- `<title>` と `<meta name="description">` はページごとに固有の内容にする
- ファーストビュー外の画像は `loading="lazy"`、ファーストビューのメイン画像には付けない
- `<script>` は `defer`（順序保持）か `async`（順序不問・独立したスクリプト）を付けて `head` に置く
- 画像は `width` `height` を指定し、可能なら WebP / AVIF を `<picture>` で出し分ける

### セキュリティ

- ユーザー入力を HTML に出力するときは、サーバー側テンプレートのエスケープ機能を必ず使う（XSS 対策）。JavaScript では `innerHTML` ではなく `textContent` を使う
- `target="_blank"` には `rel="noopener"` を付ける。現在の主要ブラウザは既定で noopener 扱いですが、古い環境や明示性のために付けておくのが無難です
- 外部サイトの `iframe` は `sandbox` 属性で権限を絞る
- フォームの送信先は HTTPS にし、パスワード欄は `type="password"` と `autocomplete="current-password"` / `"new-password"` を指定する

### 業務システム・メールでの注意

- 社内向けでも、**ブラウザの対象範囲を最初に決める**（新しめの要素や属性が使えるかが変わる）
- HTML メールはメールソフトの対応が限定的なため、Web と同じ書き方は通用しない。`<table>` レイアウトとインライン CSS が依然として主流で、必ず実機で表示確認する
- 帳票印刷がある画面は、印刷用 CSS（`@media print`）と改ページ（`break-before: page`）まで含めて設計する

## 関連リンク

- [MDN Web Docs: HTML](https://developer.mozilla.org/ja/docs/Web/HTML)
- [HTML Living Standard（WHATWG）](https://html.spec.whatwg.org/multipage/)
- [W3C Nu HTML Checker](https://validator.w3.org/nu/)
- [MDN: アクセシビリティ](https://developer.mozilla.org/ja/docs/Web/Accessibility)
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
