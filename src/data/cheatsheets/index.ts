import type { CheatSheet } from '../../types/technology';

/**
 * チートシートは技術ごとのJSONファイル（{slug}.json）で管理し、必要になったときだけ読み込む。
 * 新しい技術のチートシートは、同じ形式のファイルを追加するだけで有効になる。
 */
const modules = import.meta.glob<{ default: CheatSheet }>('./*.json');

const pathOf = (slug: string) => `./${slug}.json`;

export const hasCheatSheet = (slug: string): boolean => pathOf(slug) in modules;

export const loadCheatSheet = async (slug: string): Promise<CheatSheet | undefined> => {
  const load = modules[pathOf(slug)];
  return load ? (await load()).default : undefined;
};
