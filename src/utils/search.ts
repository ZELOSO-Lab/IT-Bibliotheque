import { getCategory } from '../data/categories';
import type { Technology } from '../types/technology';

/** 全角/半角・大文字小文字・空白や記号の差を吸収する */
export const normalize = (value: string): string =>
  value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\-_.・/]+/g, '');

type IndexedTechnology = {
  technology: Technology;
  name: string;
  keywords: string[];
  category: string[];
  description: string;
};

const buildIndex = (items: Technology[]): IndexedTechnology[] =>
  items.map((technology) => {
    const category = getCategory(technology.category);
    const subCategories = (technology.subCategories ?? []).map(getCategory);
    return {
      technology,
      name: normalize(technology.name),
      keywords: [technology.slug, ...technology.keywords].map(normalize),
      category: [category, ...subCategories].flatMap((c) => [c.id, c.name, c.label, ...c.keywords].map(normalize)),
      description: normalize(`${technology.summary} ${technology.description}`),
    };
  });

/** 一致の強さでスコアリング。0 は不一致 */
const scoreToken = (entry: IndexedTechnology, token: string): number => {
  if (entry.name === token) return 100;
  if (entry.keywords.includes(token)) return 80;
  if (entry.name.startsWith(token)) return 70;
  if (entry.keywords.some((k) => k.startsWith(token))) return 50;
  if (entry.name.includes(token)) return 40;
  if (entry.category.includes(token)) return 35;
  if (entry.keywords.some((k) => k.includes(token))) return 30;
  if (entry.category.some((c) => c.startsWith(token))) return 20;
  if (entry.description.includes(token)) return 10;
  return 0;
};

/**
 * 技術名・別名・キーワード・カテゴリ・説明を対象に検索する。
 * スペース区切りの複数語は AND 条件。結果はスコア順。
 */
export const createSearcher = (items: Technology[]) => {
  const index = buildIndex(items);
  return (query: string): Technology[] => {
    const tokens = query
      .split(/[\s\u3000]+/)
      .map(normalize)
      .filter(Boolean);
    if (tokens.length === 0) return [];
    return index
      .map((entry, order) => {
        let score = 0;
        for (const token of tokens) {
          const s = scoreToken(entry, token);
          if (s === 0) return { entry, order, score: 0 };
          score += s;
        }
        return { entry, order, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .map((r) => r.entry.technology);
  };
};
