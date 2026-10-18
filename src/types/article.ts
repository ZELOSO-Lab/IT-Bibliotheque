/** 記事（content/articles/{シリーズ}/{連番}-{slug}.md）の front matter */
export type ArticleMeta = {
  /** シリーズ名（例: 現場の声） */
  series: string;
  /** シリーズのフォルダ名（例: genba-no-koe） */
  seriesSlug: string;
  /** 連番（例: 0001） */
  no: string;
  title: string;
  /** URL用スラッグ（/articles/{slug}） */
  slug: string;
  /** 記事カテゴリ（例: C言語、Visual Studio / VB.NET） */
  category: string;
  tags: string[];
  /** 関連する技術の slug（省略時はカテゴリ・タグから自動で判定） */
  technologies: string[];
  /** 一覧・SEO用の抜粋 */
  excerpt: string;
  /** 作成日（YYYY-MM-DD） */
  created: string;
};

export type ArticleHeading = { id: string; text: string };

/** ビルド時に Markdown から生成する本文 */
export type ArticleBody = {
  html: string;
  /** 目次（h2） */
  headings: ArticleHeading[];
};

/** 技術まとめ（content/guides/{技術slug}.md）の front matter */
export type GuideMeta = {
  /** 技術の slug（/technology/{slug}/guide） */
  slug: string;
  title: string;
  excerpt: string;
  /** 更新日（YYYY-MM-DD） */
  updated: string;
};
