import { Marked, type Tokens } from 'marked';
import type { ArticleBody, ArticleHeading, ArticleMeta } from '../types/article';

/** WordPress 用原稿の記事間リンク（https://itbibliotheque.wordpress.com/?name={slug}）をポータル内リンクに置き換える */
const WORDPRESS_ARTICLE_LINK = /^https?:\/\/itbibliotheque\.wordpress\.com\/\?name=([\w-]+)$/;

const REQUIRED_KEYS = ['series', 'no', 'title', 'slug', 'category', 'excerpt', 'created'] as const;

const parseValue = (value: string): string | string[] => {
  const v = value.trim();
  if (v.startsWith('[') && v.endsWith(']')) {
    return v
      .slice(1, -1)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return v.replace(/^(['"])(.*)\1$/, '$2');
};

/**
 * 記事ファイルを front matter と本文 Markdown に分ける。先頭の H1 はタイトルと重複するため除く。
 * 必須項目が欠けている場合はビルドを止める（公開データの品質を保証）。
 */
export const parseArticleSource = (raw: string, filePath: string): { meta: ArticleMeta; markdown: string } => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) throw new Error(`Front matter がありません: ${filePath}`);
  const [, head = '', body = ''] = match;

  const fields: Record<string, string | string[]> = {};
  for (const line of head.split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) fields[line.slice(0, i).trim()] = parseValue(line.slice(i + 1));
  }
  const text = (key: string) => {
    const v = fields[key];
    return typeof v === 'string' ? v : '';
  };
  const missing = REQUIRED_KEYS.filter((k) => !text(k));
  if (missing.length > 0) throw new Error(`Front matter に ${missing.join(', ')} がありません: ${filePath}`);

  const seriesSlug = filePath.split(/[\\/]/).at(-2) ?? '';
  const list = (key: string) => {
    const v = fields[key];
    return Array.isArray(v) ? v : [];
  };
  return {
    meta: {
      series: text('series'),
      seriesSlug,
      no: text('no'),
      title: text('title'),
      slug: text('slug'),
      category: text('category'),
      tags: list('tags'),
      technologies: list('technologies'),
      excerpt: text('excerpt'),
      created: text('created'),
    },
    markdown: body.replace(/^\s*# .*\r?\n/, ''),
  };
};

const ENTITIES: Record<string, string> = { '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&amp;': '&' };

/** 見出しのHTML（コード・強調を含む）から目次用のテキストを取り出す */
const htmlToText = (html: string): string =>
  html.replace(/<[^>]+>/g, '').replace(/&(?:lt|gt|quot|#39|amp);/g, (e) => ENTITIES[e] ?? e);

/**
 * CommonMark の規則では「**」の直後・直前が括弧や句読点で、外側が日本語だと太字にならない
 * （例: **「境界値」**と）。コード以外に残った「**…**」を太字に変換する。
 */
const fixCjkStrong = (html: string): string => {
  const codes: string[] = [];
  const masked = html.replace(/<pre[\s\S]*?<\/pre>|<code>[\s\S]*?<\/code>/g, (m) => `\uE000${codes.push(m) - 1}\uE000`);
  return masked
    .replace(/\*\*(?=\S)([^*\n]+?)(?<=\S)\*\*/g, '<strong>$1</strong>')
    .replace(/\uE000(\d+)\uE000/g, (_, i: string) => codes[Number(i)] ?? '');
};

/** Markdown を本文HTMLに変換する（ビルド時のみ実行。ブラウザにパーサーを載せない） */
export const renderArticle = (markdown: string, articleUrl: (slug: string) => string): ArticleBody => {
  const headings: ArticleHeading[] = [];
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading(token: Tokens.Heading) {
        const inner = this.parser.parseInline(token.tokens);
        if (token.depth !== 2) return `<h${token.depth}>${inner}</h${token.depth}>\n`;
        const id = `sec-${headings.length + 1}`;
        headings.push({ id, text: htmlToText(inner) });
        return `<h2 id="${id}">${inner}</h2>\n`;
      },
      link(token: Tokens.Link) {
        const inner = this.parser.parseInline(token.tokens);
        const internal = WORDPRESS_ARTICLE_LINK.exec(token.href);
        if (internal?.[1]) return `<a href="${articleUrl(internal[1])}" data-article-link>${inner}</a>`;
        const external = /^https?:\/\//.test(token.href);
        const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<a href="${token.href}"${attrs}>${inner}</a>`;
      },
    },
  });
  // 横に長い表は表だけを横スクロールさせる
  const html = fixCjkStrong(marked.parse(markdown, { async: false }))
    .replaceAll('<table>', '<div class="table-scroll"><table>')
    .replaceAll('</table>', '</table></div>');
  return { html, headings };
};
