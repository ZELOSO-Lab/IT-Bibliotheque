/**
 * WordPress（技術まとめページ）用の固定ページ雛形を生成する。
 * 出力: wordpress/pages/{slug}.html（ブロックエディタの「コードエディター」に貼り付ける）
 *       wordpress/pages.csv（ページ作成チェックリスト）
 *
 * 見出しのアンカー（#basics など）は src/data/sections.ts と一致させているため、
 * ポータルの「項目から探す」リンクがそのまま各見出しへ飛ぶ。
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { site } from '../src/config/site';
import { getCategory } from '../src/data/categories';
import { technologyDetails } from '../src/data/details';
import { sections } from '../src/data/sections';
import { technologies } from '../src/data/technologies';
import { pageUrl } from '../src/seo/meta';
import type { SectionKey, Technology, TechnologyDetail } from '../src/types/technology';

const outDir = path.resolve('wordpress');

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const paragraph = (html: string) => `<!-- wp:paragraph -->\n<p>${html}</p>\n<!-- /wp:paragraph -->`;

const heading = (text: string, anchor: string, level = 2) =>
  `<!-- wp:heading {${level === 2 ? '' : `"level":${level},`}"anchor":"${anchor}"} -->\n` +
  `<h${level} class="wp-block-heading" id="${anchor}">${escapeHtml(text)}</h${level}>\n<!-- /wp:heading -->`;

const subheading = (text: string) =>
  `<!-- wp:heading {"level":3} -->\n<h3 class="wp-block-heading">${escapeHtml(text)}</h3>\n<!-- /wp:heading -->`;

const list = (items: string[]) =>
  `<!-- wp:list -->\n<ul class="wp-block-list">${items
    .map((i) => `<!-- wp:list-item -->\n<li>${i}</li>\n<!-- /wp:list-item -->`)
    .join('\n')}</ul>\n<!-- /wp:list -->`;

const code = (text: string) =>
  `<!-- wp:code -->\n<pre class="wp-block-code"><code>${escapeHtml(text)}</code></pre>\n<!-- /wp:code -->`;

const link = (href: string, text: string) => `<a href="${escapeHtml(href)}">${escapeHtml(text)}</a>`;

const todo = (text: string) => paragraph(`<em>（執筆予定）${escapeHtml(text)}</em>`);

const sectionBody = (key: SectionKey, t: Technology, d: TechnologyDetail | undefined): string[] => {
  switch (key) {
    case 'basics':
      return [
        paragraph(escapeHtml(t.summary)),
        ...(d ? [subheading('主な用途'), list(d.useCases.map(escapeHtml))] : []),
        todo(`${t.name}の概要・基本文法・用語を記載します。`),
      ];
    case 'setup':
      return [todo('インストール手順・初期設定・動作確認の方法を記載します。')];
    case 'commands':
      return [
        ...(d ? d.quickRefs.flatMap((q) => [subheading(q.title), code(q.code)]) : []),
        todo('よく使うコマンド・操作を追記します。'),
      ];
    case 'samples':
      return [todo('サンプルコード・設定例を記載します。')];
    case 'errors':
      return [todo('よくあるエラーメッセージと原因・対処法を記載します。')];
    case 'tips':
      return [todo('現場で役立つノウハウ・注意点を記載します。')];
    case 'links':
      return [
        list([
          ...(d?.officialUrl ? [link(d.officialUrl, `${t.name} 公式ドキュメント`)] : []),
          link(pageUrl(`/technology/${t.slug}`), `${site.name}：${t.name}`),
          link(pageUrl('/'), `${site.name} トップ（技術一覧）`),
        ]),
      ];
  }
};

const renderPage = (t: Technology): string => {
  const d = technologyDetails[t.slug];
  const toc = list(sections.map((s) => `<a href="#${s.anchor}">${escapeHtml(s.label)}</a>`));
  return [
    paragraph(
      `${escapeHtml(t.description)}<br>カテゴリ：${escapeHtml(getCategory(t.category).name)} / ` +
        link(pageUrl(`/technology/${t.slug}`), `${site.name}で${t.name}を見る`),
    ),
    heading('目次', 'toc'),
    toc,
    ...sections.flatMap((s) => [heading(s.label, s.anchor), ...sectionBody(s.key, t, d)]),
  ].join('\n\n');
};

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

await mkdir(path.join(outDir, 'pages'), { recursive: true });
for (const t of technologies) {
  await writeFile(path.join(outDir, 'pages', `${t.slug}.html`), `${renderPage(t)}\n`);
}
const rows = [
  ['ページタイトル', 'スラッグ（パーマリンク）', '公開URL', 'カテゴリ', '雛形ファイル'],
  ...technologies.map((t) => [
    `${t.name} 技術まとめ`,
    t.slug,
    t.url,
    getCategory(t.category).name,
    `pages/${t.slug}.html`,
  ]),
];
// Excel で文字化けしないよう BOM を付ける
await writeFile(path.join(outDir, 'pages.csv'), `\uFEFF${rows.map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`);
console.log(`Generated ${technologies.length} pages → ${path.relative(process.cwd(), outDir)}/`);
