/** カテゴリID。カテゴリを増やす場合はここと data/categories.ts に追加する。 */
export type CategoryId = 'programming' | 'web' | 'database' | 'cloud' | 'devtools' | 'terminal' | 'pm';

export type Category = {
  id: CategoryId;
  /** 表示名（英語） */
  name: string;
  /** 表示名（日本語の補足） */
  label: string;
  description: string;
  /** 検索用キーワード（例: "db" → Database） */
  keywords: string[];
  /** 表示順（昇順） */
  order: number;
};

/** 技術詳細ページに並べる項目。外部まとめページ内のアンカーへリンクする。 */
export type SectionKey = 'basics' | 'setup' | 'commands' | 'samples' | 'errors' | 'tips' | 'links';

export type Technology = {
  id: string;
  /** 正式表示名 */
  name: string;
  /** URL用スラッグ（英数字・ハイフン） */
  slug: string;
  /** 主カテゴリ（パンくず・アクセントカラーに使用） */
  category: CategoryId;
  /** 副カテゴリ（例: JavaScript は Web にも表示） */
  subCategories?: CategoryId[];
  /** 技術ページ・SEO用の説明 */
  description: string;
  /** カード用の短い説明 */
  summary: string;
  /** 技術まとめページ（別URL） */
  url: string;
  /** アイコンキー（utils/icons.ts に登録）。未登録・未指定なら汎用アイコン */
  icon?: string;
  /** 別名・表記ゆれ・検索用キーワード */
  keywords: string[];
  /** 「よく使う技術」に表示するか */
  featured?: boolean;
  /** 「よく使う技術」の表示順（昇順） */
  featuredOrder?: number;
  /** 登録日（YYYY-MM-DD）。「最近追加された技術」に使用 */
  createdAt: string;
  /** 項目ごとのリンクを個別に上書きする場合に指定 */
  sectionUrls?: Partial<Record<SectionKey, string>>;
};

/** 技術ページに表示する補足情報（クイックリファレンス等）。技術まとめページへの導線を補う最小限の内容 */
export type QuickRef = {
  title: string;
  code: string;
};

export type TechnologyDetail = {
  /** 公式サイト / 公式ドキュメント */
  officialUrl?: string;
  /** 主な用途 */
  useCases: string[];
  /** よく使うコマンド・構文（3〜4件） */
  quickRefs: QuickRef[];
};

/** チートシート（PDF出力用）。1項目 = 1セル */
export type CheatSheetItem = {
  label: string;
  code: string;
};

export type CheatSheetGroup = {
  title: string;
  items: CheatSheetItem[];
};

export type CheatSheet = {
  groups: CheatSheetGroup[];
};
