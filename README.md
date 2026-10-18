# IT Bibliotheque!

技術情報ポータル（React + TypeScript + Vite の静的サイト）。各技術の詳細は別URLの「技術まとめページ」で管理し、本サイトは入口に徹する。

## コマンド

```bash
npm install
npm run dev        # 開発サーバ
npm run lint       # ESLint
npm run format     # Prettier で整形
npm run wp:generate # WordPress 用の技術まとめページ雛形を wordpress/ に生成
npm run build      # 型チェック + ビルド（dist/ に静的ファイル一式を出力）
npm run preview    # ビルド結果の確認
```

## 公開構成

- ポータル（このリポジトリ）: GitHub Pages などの静的ホスティング。`.github/workflows/deploy.yml` で main への push 時に自動公開
- 技術まとめページ: WordPress.com（https://itbibliotheque.wordpress.com/{slug}/）。雛形と手順は [`wordpress/`](wordpress/README.md)
- 記事（シリーズ「現場の声」など）: ポータル内の `/articles/` と `/articles/{slug}/`。原稿は `content/articles/`。WordPress.com にも同じ原稿から投稿できる
- 公開URLが決まったら `src/config/site.ts` の `url` を更新する（canonical・OGP・sitemap に反映）

サブパスで公開する場合（例: GitHub Pages のプロジェクトサイト）: `BASE_PATH=/repo-name/ npm run build`

## よく行う変更

| やりたいこと                        | 編集するファイル                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| サイト名・URL・キャッチコピー       | `src/config/site.ts`                                                                                   |
| 技術を追加                          | `src/data/technologies.ts` に `define({...})` を1件追加                                                |
| 技術まとめページのURL変更           | `src/data/technologies.ts` の `url`（一括なら `site.summaryBaseUrl`）                                  |
| 「よく使う技術」と並び順            | 各技術の `featured` / `featuredOrder`                                                                  |
| カテゴリ追加                        | `src/types/technology.ts` の `CategoryId` と `src/data/categories.ts`、色は `src/styles/variables.css` |
| 技術ページの項目（基礎・環境構築…） | `src/data/sections.ts`                                                                                 |
| 技術まとめをポータル内に書く        | `content/guides/{技術slug}.md` を置く（下記「技術まとめ」）                                            |
| 記事を追加                          | `content/articles/{シリーズ}/{連番4桁}-{slug}.md` を置く（下記「記事」）                               |
| ナビ・検索例                        | `src/data/navigation.ts`                                                                               |
| アイコン追加                        | `src/utils/icons.ts`（Simple Icons から個別 import）                                                   |
| 色                                  | `src/styles/variables.css`（ライト / ダーク / カテゴリ色）                                             |

## 記事

`content/articles/{シリーズ}/{連番4桁}-{slug}.md` を置いて main に push すると、記事一覧・記事ページ・sitemap に反映される。

- 先頭の front matter: `series` `no` `title` `slug` `category` `tags` `excerpt` `created` は必須（欠けているとビルドが止まる）
- 関連する技術は `category`・`tags` を技術名と照合して自動で決まる。明示する場合は `technologies: [c, oracle-database]`（技術の slug）
- 本文は GitHub 互換の Markdown。ビルド時に HTML 化するのでブラウザに Markdown パーサーは載らない
- 本文の先頭 H1 はタイトルと重複するため表示しない。H2 が目次になる
- WordPress 用の記事間リンク `https://itbibliotheque.wordpress.com/?name={slug}` は、ポータルでは `/articles/{slug}/` に自動で置き換わる

## 技術まとめ

`content/guides/{技術slug}.md` を置くと `/technology/{slug}/guide/` に技術まとめページができ、技術ページの「項目から探す」・まとめリンク・関連リンク一覧がポータル内のページに切り替わる（置いていない技術は従来どおり WordPress へリンク）。

- front matter: `title` `slug`（技術の slug）`excerpt` `updated` は必須
- H2 を `基礎` `環境構築` `コマンド` `サンプル` `エラー対応` `実務Tips` `関連リンク` にすると、技術ページの各項目からその見出しへ直接移動できる（`src/data/sections.ts` の label と一致させる）

## 技術データの例

```ts
define({
  name: 'Oracle Database',
  slug: 'oracle-database',           // URL: /technology/oracle-database
  category: 'database',
  summary: 'カード用の短い説明',
  description: '技術ページ・SEO用の説明',
  url: 'https://example.com/oracle', // 省略時は summaryBaseUrl/slug/
  icon: 'oracle',                    // 未登録なら頭文字アイコン
  keywords: ['oracle', 'オラクル', 'sql', 'database'],
  featured: true,
  featuredOrder: 5,
  createdAt: '2026-10-01',
}),
```

## 構成

```
src/
├── components/   Header, Footer, SearchBox, TechnologyCard, CategoryCard, Breadcrumb ほか
├── pages/        Home, Technologies, Categories, TechnologyDetail, Search, About, Links, Privacy, Terms, NotFound
├── data/         technologies.ts, categories.ts, details.ts, sections.ts, navigation.ts
├── types/        technology.ts
├── hooks/        useTechnologySearch.ts, usePageMeta.ts, useTheme.ts
├── utils/        search.ts, technologies.ts, icons.ts
├── seo/          meta.ts（ページ別メタ）, head.ts, routes.ts
├── config/       site.ts
└── styles/       variables.css, global.css
```

## SEO・静的配信

`npm run build` 時に `vite.config.ts` のプラグインが以下を生成する。

- 全ルートの `index.html`（ページ固有の title / description / OGP / canonical 入り）
- `sitemap.xml`、`robots.txt`、`404.html`（SPAフォールバック）

ページを追加したら `src/App.tsx`・`src/seo/meta.ts`・`src/seo/routes.ts` に登録する。

## 検索

`src/utils/search.ts`。技術名・別名/キーワード・カテゴリ（`db` 等のカテゴリキーワード含む）・説明が対象。全角半角・大文字小文字・空白/記号の差は吸収。スペース区切りは AND。

## アイコン

Simple Icons（CC0）を使用。Java・Oracle・Microsoft 製品・AWS など、商標上の理由で Simple Icons に収録されていない技術はカテゴリ色の頭文字アイコンで表示する。
