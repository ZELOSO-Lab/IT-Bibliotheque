/**
 * 技術まとめ（content/guides/{slug}.md）がまだない技術に、既存データから初版を生成する。
 * 元データ: 技術データ（説明・主な用途・クイックリファレンス）とチートシート（src/data/cheatsheets/{slug}.json）
 *
 * 既にある .md は上書きしない（手書きの本文を守るため）。本文を書き下ろすときは生成された .md を直接編集する。
 * H2 は src/data/sections.ts の label と一致させているため、技術ページの「項目から探す」が各見出しへ飛ぶ。
 */
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { technologyDetails } from '../src/data/details';
import { sections } from '../src/data/sections';
import { technologies } from '../src/data/technologies';
import type { CheatSheet, SectionKey, Technology, TechnologyDetail } from '../src/types/technology';

const outDir = path.resolve('content/guides');
const cheatsheetDir = path.resolve('src/data/cheatsheets');
const today = new Date().toISOString().slice(0, 10);

const loadCheatSheet = (slug: string): CheatSheet | undefined => {
  const file = path.join(cheatsheetDir, `${slug}.json`);
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as CheatSheet) : undefined;
};

/** 表のセル用。| は区切りと解釈されるためエスケープし、バッククォートを含むコードは `` で囲む */
const cellCode = (code: string) => {
  const text = code.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  return text.includes('`') ? `\`\` ${text} \`\`` : `\`${text}\``;
};

const codeBlock = (code: string) => `\`\`\`\n${code}\n\`\`\``;

const pending = (t: Technology, d: TechnologyDetail | undefined, what: string) =>
  `> この項目（${what}）は現在執筆中です。` +
  (d?.officialUrl ? `最新の情報は[${t.name} 公式ドキュメント](${d.officialUrl})を参照してください。` : '');

const sectionBody = (
  key: SectionKey,
  t: Technology,
  d: TechnologyDetail | undefined,
  sheet: CheatSheet | undefined,
): string => {
  switch (key) {
    case 'basics':
      return [`${t.summary}`, ...(d ? ['### 主な用途', d.useCases.map((u) => `- ${u}`).join('\n')] : [])].join('\n\n');
    case 'setup':
      return pending(t, d, 'インストール手順・初期設定・動作確認');
    case 'commands':
      return (
        [
          ...(d ? d.quickRefs.flatMap((q) => [`### ${q.title}`, codeBlock(q.code)]) : []),
          ...(sheet
            ? sheet.groups.flatMap((g) => [
                `### 早見表：${g.title}`,
                [
                  '| 操作 | コマンド・構文 |',
                  '| --- | --- |',
                  ...g.items.map((i) => `| ${i.label} | ${cellCode(i.code)} |`),
                ].join('\n'),
              ])
            : []),
        ].join('\n\n') || pending(t, d, 'よく使うコマンド・操作')
      );
    case 'samples':
      return pending(t, d, 'サンプルコード・設定例');
    case 'errors':
      return pending(t, d, 'よくあるエラーと対処法');
    case 'tips':
      return pending(t, d, '現場で役立つノウハウ・注意点');
    case 'links':
      return d?.officialUrl ? `- [${t.name} 公式ドキュメント](${d.officialUrl})` : '> 関連リンクは現在準備中です。';
  }
};

const renderGuide = (t: Technology): string => {
  const d = technologyDetails[t.slug];
  const sheet = loadCheatSheet(t.slug);
  const frontMatter = [
    '---',
    `title: ${t.name} 技術まとめ`,
    `slug: ${t.slug}`,
    `excerpt: ${t.description}`,
    `updated: ${today}`,
    '---',
  ].join('\n');
  const body = sections.map((s) => `## ${s.label}\n\n${sectionBody(s.key, t, d, sheet)}`).join('\n\n');
  return `${frontMatter}\n\n# ${t.name} 技術まとめ\n\n${body}\n`;
};

await mkdir(outDir, { recursive: true });
const created: string[] = [];
for (const t of technologies) {
  const file = path.join(outDir, `${t.slug}.md`);
  if (existsSync(file)) continue;
  await writeFile(file, renderGuide(t));
  created.push(t.slug);
}
console.log(
  created.length > 0
    ? `Generated ${created.length} guides → content/guides/ (${created.join(', ')})`
    : 'All guides exist.',
);
