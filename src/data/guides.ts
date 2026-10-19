import type { ArticleBody, GuideMeta } from '../types/article';

/**
 * 技術まとめは content/guides/{技術slug}.md で管理する。全技術に必須で、ない場合はビルドが止まる。
 * 初版は npm run guides:generate で技術データから生成し、本文は .md を直接書き換えて充実させる。
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

export const loadGuideBody = async (slug: string): Promise<ArticleBody | undefined> => {
  const path = pathBySlug.get(slug);
  const load = path ? bodyModules[path] : undefined;
  return load ? await load() : undefined;
};

/** 技術まとめページのパス（ポータル内）。アンカーを付けると該当項目へ移動する */
export const guidePath = (slug: string, anchor?: string): string =>
  `/technology/${slug}/guide${anchor ? `#${anchor}` : ''}`;
