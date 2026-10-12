import { technologies } from '../data/technologies';
import { pageMeta, type PageMeta } from './meta';

/** ビルド時に静的HTMLとsitemapを生成するルート */
export const staticRoutes = (hasCheatSheet: (slug: string) => boolean): PageMeta[] => [
  pageMeta.home(),
  pageMeta.categories(),
  pageMeta.technologies(),
  ...technologies.map(pageMeta.technology),
  pageMeta.cheatsheets(),
  ...technologies.filter((t) => hasCheatSheet(t.slug)).map(pageMeta.cheatsheet),
  pageMeta.search(),
  pageMeta.about(),
  pageMeta.links(),
  pageMeta.privacy(),
  pageMeta.terms(),
];
