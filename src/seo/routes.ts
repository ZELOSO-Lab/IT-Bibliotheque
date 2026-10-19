import { technologies } from '../data/technologies';
import type { ArticleMeta } from '../types/article';
import { pageMeta, type PageMeta } from './meta';

/** ビルド時に静的HTMLとsitemapを生成するルート */
export const staticRoutes = (
  hasCheatSheet: (slug: string) => boolean,
  articles: ArticleMeta[],
  guideSlugs: string[],
): PageMeta[] => [
  pageMeta.home(),
  pageMeta.categories(),
  pageMeta.technologies(),
  ...technologies.map(pageMeta.technology),
  ...technologies.filter((t) => guideSlugs.includes(t.slug)).map(pageMeta.guide),
  pageMeta.cheatsheets(),
  ...technologies.filter((t) => hasCheatSheet(t.slug)).map(pageMeta.cheatsheet),
  pageMeta.articles(),
  ...articles.map(pageMeta.article),
  pageMeta.search(),
  pageMeta.about(),
  pageMeta.links(),
  pageMeta.privacy(),
  pageMeta.terms(),
];
