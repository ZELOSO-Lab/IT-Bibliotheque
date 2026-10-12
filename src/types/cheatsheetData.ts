/**
 * チートシート作成ツールへ渡す公開データの形式（/data/cheatsheets/*.json）。
 * ツール側はこのファイルをコピーして型として利用できる。
 * 互換性のない変更をする場合は CHEATSHEET_SCHEMA_VERSION を上げる。
 */
export const CHEATSHEET_SCHEMA_VERSION = 1;

export type CheatSheetDataItem = {
  label: string;
  code: string;
};

export type CheatSheetDataGroup = {
  title: string;
  items: CheatSheetDataItem[];
};

export type CheatSheetDataTechnology = {
  slug: string;
  name: string;
  category: string;
  categoryName: string;
  /** 推奨カラー（カテゴリ色、#rrggbb） */
  color: string;
  /** ポータルの技術ページ（サイトルートからの相対パス。例: technology/java） */
  pagePath: string;
};

/** /data/cheatsheets/{slug}.json */
export type CheatSheetData = {
  schemaVersion: typeof CHEATSHEET_SCHEMA_VERSION;
  technology: CheatSheetDataTechnology;
  groups: CheatSheetDataGroup[];
};

/** /data/cheatsheets/index.json */
export type CheatSheetIndex = {
  schemaVersion: typeof CHEATSHEET_SCHEMA_VERSION;
  items: (CheatSheetDataTechnology & {
    /** サイトルートからの相対パス（例: data/cheatsheets/java.json） */
    dataPath: string;
    itemCount: number;
  })[];
};
