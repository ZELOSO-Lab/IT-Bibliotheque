import type { ArticleBody, GuideMeta } from '../types/article';

/**
 * 技術まとめは content/guides/{技術slug}.md に置くだけで、技術ページの「項目から探す」とまとめリンクがポータル内のページに切り替わる。
 * 置いていない技術は、従来どおり外部の技術まとめページ（technology.url）へリンクする。
 */
const metaModules = import.meta.glob<GuideMeta>('/content/guides/*.md', {
  query: '?meta',
  import: 'meta',
  eager: true,
});
const bodyModules = import.meta.glob<ArticleBody>('/content/guides/*.md');

const pathBySlug = new Map(Object.entries(metaModules).map(([path, meta]) => [meta.slug, path]));

export const getGuide = (slug: string | undefined): GuideMeta | undefined => {
  const path = slug ? pathBySlug.get(slug) : undefined;
  return path ? metaModules[path] : undefined;
};

export const hasGuide = (slug: string): boolean => pathBySlug.has(slug);

export const loadGuideBody = async (slug: string): Promise<ArticleBody | undefined> => {
  const path = pathBySlug.get(slug);
  const load = path ? bodyModules[path] : undefined;
  return load ? await load() : undefined;
};

/** 技術まとめページのパス（ポータル内）。アンカーを付けると該当項目へ移動する */
export const guidePath = (slug: string, anchor?: string): string =>
  `/technology/${slug}/guide${anchor ? `#${anchor}` : ''}`;
