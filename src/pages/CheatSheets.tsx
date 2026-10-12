import { CheatSheetLink } from '../components/CheatSheetLink';
import { PageHeader } from '../components/PageHeader';
import { TechIcon } from '../components/TechIcon';
import { hasCheatSheet } from '../data/cheatsheets';
import { usePageMeta } from '../hooks/usePageMeta';
import { pageMeta } from '../seo/meta';
import { getTechnologiesByCategory, sortedCategories } from '../utils/technologies';
import page from './Page.module.css';
import styles from './CheatSheets.module.css';

export function CheatSheets() {
  usePageMeta(pageMeta.cheatsheets());
  return (
    <>
      <PageHeader
        title="チートシート"
        lead="技術を選ぶと、よく使うコマンド・構文をA4 1枚にまとめたチートシートを作成できます。カラー・列数・行数を選んで、PDFでダウンロードまたは印刷できます。"
      />
      <div className="container">
        <ol className={styles.steps} aria-label="使い方">
          <li>
            <strong>1. 技術を選ぶ</strong>
            <span>下の一覧から選択</span>
          </li>
          <li>
            <strong>2. レイアウトを選ぶ</strong>
            <span>カラー・列数・行数・向き</span>
          </li>
          <li>
            <strong>3. PDFで保存</strong>
            <span>A4に自動で収まります</span>
          </li>
        </ol>
        {sortedCategories.map((c) => {
          const items = getTechnologiesByCategory(c.id).filter((t) => t.category === c.id && hasCheatSheet(t.slug));
          if (items.length === 0) return null;
          return (
            <section key={c.id} className={page.sectionTight} aria-labelledby={`cs-${c.id}`}>
              <h2 id={`cs-${c.id}`} className={styles.heading}>
                {c.name}
              </h2>
              <ul className={styles.grid}>
                {items.map((t) => (
                  <li key={t.id} data-category={t.category}>
                    <CheatSheetLink slug={t.slug} className={styles.item}>
                      <TechIcon technology={t} size="sm" />
                      <span className={styles.name}>{t.name}</span>
                      <span className={styles.badge}>PDF</span>
                    </CheatSheetLink>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
