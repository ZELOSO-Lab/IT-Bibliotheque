# チートシート作成ツール連携仕様

単体のチートシート作成ツールを同じサイト内（`/tools/cheatsheet/`）に置き、ポータルの各技術ページから呼び出すための仕様です。

> 本文のパスは**サイトルートからの相対パス**です。公開URLは `https://zeloso-lab.github.io/IT-Bibliotheque/` のため、
> 例えば `/tools/cheatsheet/` の実際のURLは `https://zeloso-lab.github.io/IT-Bibliotheque/tools/cheatsheet/` になります。

## 結論

**ポータルは技術ID（slug）だけをURLで渡し、ツールは同じサイト内の公開JSONを自分で取りに行く。**

```
技術ページの「チートシートをPDFで作成」
  → /tools/cheatsheet/?tech=java          （渡すのは slug だけ）
  → ツールが GET /data/cheatsheets/java.json （同一オリジンの固定パス）
```

## 方式の比較

| 方式                                                    | 主なリスク                                                                                                     | 評価     |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------- |
| **A. slug をURLで渡し、ツールが同一サイトのJSONを取得** | 外から変えられるのは slug だけで、形式チェックで弾ける。データはビルド時に生成した静的ファイルで改ざんできない | **採用** |
| B. データ本体をURLパラメータで渡す                      | URL長の上限で途中切れ、細工したURLで任意の文字列を表示させられる、履歴やログにデータが残る                     | 不採用   |
| C. `postMessage` で渡す                                 | 送信元の確認漏れで外部サイトからデータを注入される、受け渡しのタイミング制御が複雑                             | 不採用   |
| D. `localStorage` / `sessionStorage` 経由               | 古いデータの残留、ブラウザ設定で使えない場合がある、タブ間の不整合                                             | 不採用   |
| E. ツールがポータルのソースを直接 import                | 両者のリリースが密結合になり、片方の変更で他方が壊れる                                                         | 不採用   |

## 呼び出しURL

```
{ツールの設置パス}?tech={slug}
例: /tools/cheatsheet/?tech=oracle-database
```

- `tech` 以外のパラメータは渡しません（カラー・列数・行数はツール側の画面で選ぶ）
- `tech` が無い・不正な場合、ツールは `/data/cheatsheets/index.json` から技術の選択肢を表示してください

## 公開データ

`npm run build` で `dist/data/cheatsheets/` に出力されます。元データは `src/data/cheatsheets/{slug}.json`、型定義は `src/types/cheatsheetData.ts` です（ツール側にコピーして使用可）。

### `/data/cheatsheets/{slug}.json`

```json
{
  "schemaVersion": 1,
  "technology": {
    "slug": "java",
    "name": "Java",
    "category": "programming",
    "categoryName": "Programming",
    "color": "#2563eb",
    "pagePath": "technology/java"
  },
  "groups": [
    {
      "title": "JDK コマンド",
      "items": [{ "label": "コンパイル", "code": "javac Main.java" }]
    }
  ]
}
```

### `/data/cheatsheets/index.json`

```json
{
  "schemaVersion": 1,
  "items": [
    {
      "slug": "java",
      "name": "Java",
      "...": "（technology と同じ項目）",
      "dataPath": "data/cheatsheets/java.json",
      "itemCount": 20
    }
  ]
}
```

### 互換性

- 項目の**追加**は `schemaVersion` を変えずに行います（ツールは未知の項目を無視してください）
- 項目の削除・意味の変更をするときは `schemaVersion` を上げます

## ツール側で必ず守ること

| チェック     | 内容                                                                                                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| slug の形式  | `^[a-z0-9]+(?:-[a-z0-9]+)*$` に一致しなければ読み込まない                                                                                                                                           |
| 取得先の固定 | `new URL('../../data/cheatsheets/' + slug + '.json', location.href)` のように**同一オリジンの固定パス**から取得し、`url.origin === location.origin` を確認する。URLパラメータで取得先を受け取らない |
| 形式の検証   | `schemaVersion === 1`、`technology.slug` が要求した slug と一致、文字列・配列の型、件数と文字数の上限                                                                                               |
| 表示方法     | `textContent`（React なら通常の `{text}`）で表示する。`innerHTML` / `dangerouslySetInnerHTML` は使わない                                                                                            |
| カラー       | `^#[0-9a-f]{6}$` に一致する値だけを CSS に使う                                                                                                                                                      |
| CSP          | `<meta http-equiv="Content-Security-Policy">` で読み込み先を `'self'` に限定する                                                                                                                    |

最小の実装例: [`docs/examples/cheatsheet-tool-minimal.html`](examples/cheatsheet-tool-minimal.html)

## 設置と切り替え

1. ツールのビルド成果物を、このリポジトリの `public/tools/cheatsheet/` に置く（ビルド時にそのまま公開される）
   - ツール側のベースパスは `/IT-Bibliotheque/tools/cheatsheet/`（または相対パス `./`）に設定する
2. `src/config/site.ts` の `cheatsheetTool.path` を `'/tools/cheatsheet/'` にする
3. `npm run build` → 技術ページ・チートシート一覧のボタンがすべてツールの呼び出しに切り替わる

`cheatsheetTool.path` が `null` の間は、ポータル内蔵の作成画面（`/technology/{slug}/cheatsheet`）が使われます。
