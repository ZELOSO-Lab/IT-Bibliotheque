import type { ArticleBody, ArticleMeta } from '../types/article';
import type { Technology } from '../types/technology';
import { technologies } from './technologies';

/**
 * 記事は content/articles/{シリーズ}/{連番}-{slug}.md に置くだけで一覧・記事ページ・sitemap に反映される。
 * 一覧用の front matter（?meta）と本文（ビルド時にHTML化済み）は別モジュールにし、本文は記事を開いたときだけ読み込む。
 */
const metaModules = import.meta.glob<ArticleMeta>('/content/articles/*/*.md', {
  query: '?meta',
  import: 'meta',
  eager: true,
});
const bodyModules = import.meta.glob<ArticleBody>('/content/articles/*/*.md');

/** 新しい順（作成日 → 連番） */
export const articles: ArticleMeta[] = Object.values(metaModules).sort(
  (a, b) => b.created.localeCompare(a.created) || b.no.localeCompare(a.no),
);

const pathBySlug = new Map(Object.entries(metaModules).map(([path, meta]) => [meta.slug, path]));

export const getArticleBySlug = (slug: string | undefined): ArticleMeta | undefined =>
  articles.find((a) => a.slug === slug);

export const loadArticleBody = async (slug: string): Promise<ArticleBody | undefined> => {
  const path = pathBySlug.get(slug);
  const load = path ? bodyModules[path] : undefined;
  return load ? await load() : undefined;
};

/** 記事カテゴリの一覧（記事数の多い順） */
export const articleCategories: { name: string; count: number }[] = [
  ...articles.reduce((m, a) => m.set(a.category, (m.get(a.category) ?? 0) + 1), new Map<string, number>()),
]
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => b.count - a.count);

const normalize = (s: string) => s.trim().toLowerCase();
const matches = (t: Technology, term: string) => normalize(t.name) === term || t.slug === term;

/**
 * 記事に関連する技術。front matter の technologies（slug）があればそれを使う。
 * なければカテゴリ・タグを技術名と照合し、技術名で見つからないカテゴリ（例: C言語）だけ別名でも照合する。
 */
export const getArticleTechnologies = (article: ArticleMeta): Technology[] => {
  if (article.technologies.length > 0) return technologies.filter((t) => article.technologies.includes(t.slug));
  const found = new Set<Technology>();
  for (const term of article.category.split('/').map(normalize)) {
    const byName = technologies.filter((t) => matches(t, term));
    const hits = byName.length > 0 ? byName : technologies.filter((t) => t.keywords.some((k) => normalize(k) === term));
    hits.forEach((t) => found.add(t));
  }
  for (const term of article.tags.map(normalize))
    technologies.filter((t) => matches(t, term)).forEach((t) => found.add(t));
  return technologies.filter((t) => found.has(t));
};

export const getArticlesByTechnology = (technology: Technology): ArticleMeta[] =>
  articles.filter((a) => getArticleTechnologies(a).some((t) => t.id === technology.id));
