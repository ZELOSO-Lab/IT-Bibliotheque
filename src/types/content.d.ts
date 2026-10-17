/** content/articles/*.md はビルド時に vite.config.ts の articles プラグインで変換される */
declare module '*.md' {
  import type { ArticleHeading } from './article';
  export const html: string;
  export const headings: ArticleHeading[];
}
