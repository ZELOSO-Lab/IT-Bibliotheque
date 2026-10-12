import { site } from '../config/site';
import type { Technology } from '../types/technology';

export type PageMeta = {
  title: string;
  description: string;
  /** サイトルートからのパス（例: /technology/java） */
  path: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  noindex?: boolean;
};

const withSiteName = (title: string) => `${title} | ${site.name}`;

const isAbsolute = (path: string) => /^https?:\/\//.test(path);

/** ファイル（画像等）の絶対URL */
export const assetUrl = (path: string): string => (isAbsolute(path) ? path : `${site.url}${path}`);

/** ページの絶対URL。静的ホスティングのディレクトリ形式（/technology/java/）に合わせて末尾スラッシュを付ける */
export const pageUrl = (path: string): string =>
  isAbsolute(path) ? path : `${site.url}${path.endsWith('/') ? path : `${path}/`}`;

/** 各ページのメタ情報。ページコンポーネントとビルド時のHTML生成で共用する */
export const pageMeta = {
  home: (): PageMeta => ({
    title: `${site.name} | ${site.tagline}`,
    description: site.description,
    path: '/',
  }),
  categories: (): PageMeta => ({
    title: withSiteName('カテゴリ一覧'),
    description: 'プログラミング、Web、データベース、クラウド、開発ツールなどカテゴリ別に技術情報を探せます。',
    path: '/categories',
  }),
  technologies: (): PageMeta => ({
    title: withSiteName('技術一覧'),
    description: '登録されているすべての技術をカテゴリで絞り込みながら一覧できます。',
    path: '/technologies',
  }),
  technology: (t: Technology): PageMeta => ({
    title: withSiteName(`${t.name} 技術情報まとめ`),
    description: t.description,
    path: `/technology/${t.slug}`,
    ogType: 'article',
  }),
  cheatsheets: (): PageMeta => ({
    title: withSiteName('チートシート一覧'),
    description:
      '各技術のチートシートをA4のPDFで作成・ダウンロードできます。カラー・列数・行数を選ぶだけで自動レイアウトします。',
    path: '/cheatsheets',
  }),
  cheatsheet: (t: Technology): PageMeta => ({
    title: withSiteName(`${t.name} チートシート（PDF）`),
    description: `${t.name}のよく使うコマンド・構文をA4 1枚にまとめたチートシート。カラー・列数・行数を選んでPDFでダウンロードできます。`,
    path: `/technology/${t.slug}/cheatsheet`,
  }),
  search: (): PageMeta => ({
    title: withSiteName('技術検索'),
    description: '技術名・別名・キーワード・カテゴリから技術情報を検索できます。',
    path: '/search',
  }),
  about: (): PageMeta => ({
    title: withSiteName('このサイトについて'),
    description: `${site.name}の目的と使い方について。`,
    path: '/about',
  }),
  links: (): PageMeta => ({
    title: withSiteName('関連リンク'),
    description: '各技術の技術まとめページへのリンク集です。',
    path: '/links',
  }),
  privacy: (): PageMeta => ({
    title: withSiteName('プライバシーポリシー'),
    description: `${site.name}のプライバシーポリシー。`,
    path: '/privacy',
  }),
  terms: (): PageMeta => ({
    title: withSiteName('利用規約'),
    description: `${site.name}の利用規約。`,
    path: '/terms',
  }),
  notFound: (): PageMeta => ({
    title: withSiteName('ページが見つかりません'),
    description: 'お探しのページは見つかりませんでした。',
    path: '/404',
    noindex: true,
  }),
};
