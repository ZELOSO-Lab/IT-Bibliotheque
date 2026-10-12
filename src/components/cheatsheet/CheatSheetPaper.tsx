import { forwardRef, type CSSProperties } from 'react';
import { site } from '../../config/site';
import { getCategory } from '../../data/categories';
import { pageUrl } from '../../seo/meta';
import type { Technology } from '../../types/technology';
import { pageSize, type CheatSheetCell, type Orientation } from '../../utils/cheatsheetLayout';
import styles from './CheatSheetPaper.module.css';

type Props = {
  technology: Technology;
  cells: CheatSheetCell[];
  columns: number;
  rows: number;
  color: string;
  orientation: Orientation;
  pageNumber: number;
  pageCount: number;
};

/** A4 1ページ分の紙面。画面表示・PDF・印刷で共通に使う */
export const CheatSheetPaper = forwardRef<HTMLDivElement, Props>(function CheatSheetPaper(
  { technology, cells, columns, rows, color, orientation, pageNumber, pageCount },
  ref,
) {
  const { width, height } = pageSize(orientation);
  const style = {
    width,
    height,
    '--cs-color': color,
    '--cs-columns': columns,
    '--cs-rows': rows,
  } as CSSProperties;

  return (
    <div ref={ref} className={styles.paper} style={style}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>{getCategory(technology.category).name} Cheat Sheet</p>
          <h2 className={styles.title}>{technology.name} チートシート</h2>
        </div>
        <p className={styles.brand}>{site.name}</p>
      </div>
      <div className={styles.grid}>
        {cells.map((cell, i) => (
          <section key={`${cell.group}-${cell.label}-${i}`} className={styles.cell} data-fit-cell>
            <p className={styles.group}>{cell.group}</p>
            <h3 className={styles.label}>{cell.label}</h3>
            <pre className={styles.code}>{cell.code}</pre>
          </section>
        ))}
      </div>
      <div className={styles.footer}>
        <span>{pageUrl(`/technology/${technology.slug}`)}</span>
        <span>
          {pageNumber} / {pageCount}
        </span>
      </div>
    </div>
  );
});
