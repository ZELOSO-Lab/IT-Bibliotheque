import { site } from '../config/site';
import { assetUrl, pageUrl, type PageMeta } from './meta';

export type HeadTag =
  | { kind: 'meta'; attr: 'name' | 'property'; key: string; content: string }
  | { kind: 'link'; rel: string; href: string };

/** PageMeta から head に出力するタグ一覧を作る（ブラウザ・ビルド共通） */
export const headTags = (meta: PageMeta): HeadTag[] => {
  const url = pageUrl(meta.path);
  const image = assetUrl(meta.ogImage ?? site.ogImage);
  return [
    { kind: 'meta', attr: 'name', key: 'description', content: meta.description },
    { kind: 'meta', attr: 'name', key: 'robots', content: meta.noindex ? 'noindex' : 'index,follow' },
    { kind: 'meta', attr: 'property', key: 'og:title', content: meta.title },
    { kind: 'meta', attr: 'property', key: 'og:description', content: meta.description },
    { kind: 'meta', attr: 'property', key: 'og:type', content: meta.ogType ?? 'website' },
    { kind: 'meta', attr: 'property', key: 'og:url', content: url },
    { kind: 'meta', attr: 'property', key: 'og:image', content: image },
    { kind: 'meta', attr: 'property', key: 'og:site_name', content: site.name },
    { kind: 'meta', attr: 'property', key: 'og:locale', content: site.locale },
    { kind: 'meta', attr: 'name', key: 'twitter:card', content: 'summary_large_image' },
    { kind: 'link', rel: 'canonical', href: url },
  ];
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** ビルド時用: head 内に挿入するHTML文字列 */
export const renderHeadHtml = (meta: PageMeta): string =>
  [
    `<title>${escapeHtml(meta.title)}</title>`,
    ...headTags(meta).map((tag) =>
      tag.kind === 'meta'
        ? `<meta ${tag.attr}="${tag.key}" content="${escapeHtml(tag.content)}" data-seo>`
        : `<link rel="${tag.rel}" href="${escapeHtml(tag.href)}" data-seo>`,
    ),
  ].join('\n    ');
