import type { CheatSheet } from '../types/technology';

export type Orientation = 'portrait' | 'landscape';

export type CheatSheetCell = {
  group: string;
  label: string;
  code: string;
};

export type LayoutOptions = {
  columns: number;
  /** null は「自動」（1ページに収まる行数を計算） */
  rows: number | null;
};

/** A4 を 96dpi の CSS ピクセルで表したサイズ */
export const A4_PX = { short: 794, long: 1123 } as const;

export const pageSize = (orientation: Orientation) =>
  orientation === 'portrait' ? { width: A4_PX.short, height: A4_PX.long } : { width: A4_PX.long, height: A4_PX.short };

export const COLUMN_CHOICES = [1, 2, 3, 4] as const;
export const ROW_CHOICES = [2, 3, 4, 5, 6, 7, 8, 10, 12] as const;

/** 選択されたグループの項目を1次元のセル配列にする */
export const flattenCells = (sheet: CheatSheet, groupTitles: Set<string>): CheatSheetCell[] =>
  sheet.groups
    .filter((g) => groupTitles.has(g.title))
    .flatMap((g) => g.items.map((item) => ({ group: g.title, ...item })));

/** 実際に使う行数。「自動」の場合は全項目が1ページに収まる行数 */
export const resolveRows = (cellCount: number, { columns, rows }: LayoutOptions): number =>
  rows ?? Math.max(1, Math.ceil(cellCount / columns));

/** 列数 × 行数 ごとにページへ分割する */
export const paginate = <T>(cells: T[], options: LayoutOptions): T[][] => {
  const perPage = options.columns * resolveRows(cells.length, options);
  const pages: T[][] = [];
  for (let i = 0; i < cells.length; i += perPage) pages.push(cells.slice(i, i + perPage));
  return pages.length > 0 ? pages : [[]];
};

/** カラープリセット。category は技術のカテゴリ色を使う */
export const COLOR_PRESETS = [
  { id: 'category', label: 'カテゴリ色', value: null },
  { id: 'blue', label: 'ブルー', value: '#1d4ed8' },
  { id: 'green', label: 'グリーン', value: '#15803d' },
  { id: 'orange', label: 'オレンジ', value: '#c2410c' },
  { id: 'purple', label: 'パープル', value: '#7c3aed' },
  { id: 'red', label: 'レッド', value: '#b91c1c' },
  { id: 'mono', label: 'モノクロ', value: '#1f2937' },
] as const;

/** 印刷用のカテゴリ色（ライトテーマの値。紙面は常に白背景） */
export const CATEGORY_PRINT_COLORS: Record<string, string> = {
  programming: '#2563eb',
  web: '#0e7490',
  database: '#15803d',
  cloud: '#c2410c',
  devtools: '#7c3aed',
  terminal: '#475569',
  pm: '#be185d',
};
