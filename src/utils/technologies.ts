import { categories } from '../data/categories';
import { technologies } from '../data/technologies';
import type { CategoryId, Technology } from '../types/technology';

export const belongsTo = (technology: Technology, categoryId: CategoryId): boolean =>
  technology.category === categoryId || (technology.subCategories?.includes(categoryId) ?? false);

export const getTechnologiesByCategory = (categoryId: CategoryId): Technology[] =>
  technologies.filter((t) => belongsTo(t, categoryId));

export const getFeaturedTechnologies = (): Technology[] =>
  technologies.filter((t) => t.featured).sort((a, b) => (a.featuredOrder ?? Infinity) - (b.featuredOrder ?? Infinity));

/** 登録日の新しい順。同日の場合はデータの後ろ（後から追加したもの）を優先 */
export const getRecentTechnologies = (limit: number): Technology[] =>
  technologies
    .map((t, index) => ({ t, index }))
    .sort((a, b) => b.t.createdAt.localeCompare(a.t.createdAt) || b.index - a.index)
    .slice(0, limit)
    .map(({ t }) => t);

export const getRelatedTechnologies = (technology: Technology, limit: number): Technology[] =>
  getTechnologiesByCategory(technology.category)
    .filter((t) => t.id !== technology.id)
    .slice(0, limit);

export const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
