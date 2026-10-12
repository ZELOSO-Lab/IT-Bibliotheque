import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { site } from './src/config/site';
import { renderHeadHtml } from './src/seo/head';
import { pageMeta, pageUrl } from './src/seo/meta';
import { staticRoutes } from './src/seo/routes';
import { getCategory } from './src/data/categories';
import { technologies } from './src/data/technologies';
import { CHEATSHEET_SCHEMA_VERSION, type CheatSheetData, type CheatSheetIndex } from './src/types/cheatsheetData';
import type { CheatSheet } from './src/types/technology';
import { CATEGORY_PRINT_COLORS } from './src/utils/cheatsheetLayout';

const HEAD_PLACEHOLDER = '<!--seo-head-->';

/** チートシートの有無はファイルの存在で判定（src/data/cheatsheets/{slug}.ts） */
const cheatSheetFile = (slug: string) => path.resolve('src/data/cheatsheets', `${slug}.json`);
const hasCheatSheetFile = (slug: string) => existsSync(cheatSheetFile(slug));
const routes = () => staticRoutes(hasCheatSheetFile);

/**
 * ビルド後に各ルートの index.html（ページ固有の title / description / OGP / canonical 入り）と
 * sitemap.xml・robots.txt・404.html を生成する。静的ホスティングでも直接アクセス・SEOに対応。
 */
const staticPages = (): Plugin => {
  let outDir = 'dist';
  return {
    name: 'itb-static-pages',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const template = await readFile(path.join(outDir, 'index.html'), 'utf8');
      const render = (meta: Parameters<typeof renderHeadHtml>[0]) =>
        template.replace(HEAD_PLACEHOLDER, renderHeadHtml(meta));

      for (const meta of routes()) {
        const dir = path.join(outDir, meta.path);
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, 'index.html'), render(meta));
      }
      // 未知のURL（SPAフォールバック）用
      await writeFile(path.join(outDir, '404.html'), render(pageMeta.notFound()));

      const today = new Date().toISOString().slice(0, 10);
      const urls = routes()
        .map((m) => `  <url><loc>${pageUrl(m.path)}</loc><lastmod>${today}</lastmod></url>`)
        .join('\n');
      await writeFile(
        path.join(outDir, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      );
      await writeCheatSheetData(outDir);
      await writeFile(path.join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);
    },
  };
};

/** 形式の誤りをビルド時に検出する（公開データの品質を保証） */
const parseCheatSheet = (json: string, slug: string): CheatSheet => {
  const sheet = JSON.parse(json) as CheatSheet;
  const ok =
    Array.isArray(sheet.groups) &&
    sheet.groups.every(
      (g) =>
        typeof g.title === 'string' &&
        Array.isArray(g.items) &&
        g.items.every((i) => typeof i.label === 'string' && typeof i.code === 'string'),
    );
  if (!ok) throw new Error(`Invalid cheat sheet: src/data/cheatsheets/${slug}.json`);
  return sheet;
};

/**
 * チートシート作成ツール向けの公開データ（同一オリジンの静的JSON）を出力する。
 * 仕様: docs/cheatsheet-tool-integration.md
 */
const writeCheatSheetData = async (outDir: string) => {
  const dir = path.join(outDir, 'data', 'cheatsheets');
  await mkdir(dir, { recursive: true });
  const index: CheatSheetIndex = { schemaVersion: CHEATSHEET_SCHEMA_VERSION, items: [] };

  for (const t of technologies) {
    if (!hasCheatSheetFile(t.slug)) continue;
    const sheet = parseCheatSheet(await readFile(cheatSheetFile(t.slug), 'utf8'), t.slug);
    const technology = {
      slug: t.slug,
      name: t.name,
      category: t.category,
      categoryName: getCategory(t.category).name,
      color: CATEGORY_PRINT_COLORS[t.category] ?? '#1d4ed8',
      pagePath: `technology/${t.slug}`,
    };
    const data: CheatSheetData = { schemaVersion: CHEATSHEET_SCHEMA_VERSION, technology, groups: sheet.groups };
    await writeFile(path.join(dir, `${t.slug}.json`), JSON.stringify(data));
    index.items.push({
      ...technology,
      dataPath: `data/cheatsheets/${t.slug}.json`,
      itemCount: sheet.groups.reduce((n, g) => n + g.items.length, 0),
    });
  }
  await writeFile(path.join(dir, 'index.json'), JSON.stringify(index));
};

export default defineConfig({
  // 配信パスは公開URL（site.url）から決める（例: https://zeloso-lab.github.io/IT-Bibliotheque → /IT-Bibliotheque/）。BASE_PATH で上書き可
  base: process.env.BASE_PATH ?? `${new URL(site.url).pathname.replace(/\/$/, '')}/`,
  plugins: [react(), staticPages()],
});
