/**
 * サイト全体の設定。サイト名・URLの変更はこのファイルだけで完結する。
 */
export const site = {
  name: 'IT Bibliotheque!',
  shortName: 'ITB',
  tagline: 'IT技術を、すぐに探せる。',
  lead: 'プログラミング、データベース、AWS、開発ツールなど現場で培った技術情報をまとめています。',
  description:
    'プログラミング言語、データベース、AWS、開発ツールなどの技術情報への入口を一か所に集約した技術情報ポータルです。',
  /**
   * 本サイト（ポータル）の公開URL。canonical / OGP / sitemap と、ビルド時の配信パス（base）に使用。末尾スラッシュなし。
   * GitHub Pages（リポジトリ ZELOSO-Lab/IT-Bibliotheque）で公開。
   */
  url: 'https://zeloso-lab.github.io/IT-Bibliotheque',
  /**
   * 各技術まとめページ（別URL）のベースURL。WordPress.com の固定ページ（/{slug}/）。
   * 技術ごとに個別URLを指定する場合は data/technologies.ts の url を直接書き換える。
   */
  summaryBaseUrl: 'https://itbibliotheque.wordpress.com',
  ogImage: '/ogp.png',
  locale: 'ja_JP',
  copyrightHolder: 'IT Bibliotheque!',
  startYear: 2026,
} as const;

/** 技術まとめページのURLを組み立てる */
export const summaryUrl = (slug: string): string => `${site.summaryBaseUrl}/${slug}/`;

/**
 * チートシート作成ツール（単体ツール）の設置パス。同一サイト内に置く（例: '/tools/cheatsheet/'）。
 * null の間はポータル内蔵の作成画面（/technology/{slug}/cheatsheet）を使う。
 * 連携仕様: docs/cheatsheet-tool-integration.md
 */
export const cheatsheetTool: { path: string | null } = {
  path: null,
};
