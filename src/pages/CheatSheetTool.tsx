import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { CheatSheetControls, type CheatSheetSettings } from '../components/cheatsheet/CheatSheetControls';
import { CheatSheetPaper } from '../components/cheatsheet/CheatSheetPaper';
import { TechIcon } from '../components/TechIcon';
import { getCategory } from '../data/categories';
import { loadCheatSheet } from '../data/cheatsheets';
import { getTechnologyBySlug } from '../data/technologies';
import { FONT_READABLE_PX, useFitFontSize } from '../hooks/useFitFontSize';
import { usePageMeta } from '../hooks/usePageMeta';
import { pageMeta } from '../seo/meta';
import type { CheatSheet, Technology } from '../types/technology';
import {
  CATEGORY_PRINT_COLORS,
  COLOR_PRESETS,
  flattenCells,
  pageSize,
  paginate,
  resolveRows,
} from '../utils/cheatsheetLayout';
import { downloadPagesAsPdf } from '../utils/pdf';
import { NotFound } from './NotFound';
import styles from './CheatSheetTool.module.css';

export function CheatSheetTool() {
  const { slug } = useParams();
  const technology = getTechnologyBySlug(slug);
  if (!technology) return <NotFound />;
  return <CheatSheetLoader key={technology.id} technology={technology} />;
}

function CheatSheetLoader({ technology }: { technology: Technology }) {
  usePageMeta(pageMeta.cheatsheet(technology));
  const [sheet, setSheet] = useState<CheatSheet | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    loadCheatSheet(technology.slug).then((s) => active && setSheet(s ?? null));
    return () => {
      active = false;
    };
  }, [technology.slug]);

  return (
    <>
      <div className={styles.head}>
        <div className="container">
          <Breadcrumb
            items={[
              { label: 'ホーム', to: '/' },
              { label: 'チートシート', to: '/cheatsheets' },
              { label: technology.name, to: `/technology/${technology.slug}` },
              { label: 'チートシート作成' },
            ]}
          />
          <div className={styles.titleRow}>
            <TechIcon technology={technology} size="lg" />
            <div>
              <h1 className={styles.title}>{technology.name} チートシート</h1>
              <p className={styles.lead}>
                カラー・列数・行数を選ぶと、A4に収まるよう文字サイズとレイアウトを自動で計算します。PDFでダウンロードするか、そのまま印刷できます。
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="container">
        {sheet === undefined && <p className={styles.status}>読み込み中…</p>}
        {sheet === null && (
          <p className={styles.status}>
            この技術のチートシートは準備中です。<Link to={`/technology/${technology.slug}`}>技術ページへ戻る</Link>
          </p>
        )}
        {sheet && <CheatSheetBuilder technology={technology} sheet={sheet} />}
      </div>
    </>
  );
}

function CheatSheetBuilder({ technology, sheet }: { technology: Technology; sheet: CheatSheet }) {
  const [settings, setSettings] = useState<CheatSheetSettings>(() => ({
    color: { preset: 'category' },
    columns: 2,
    rows: null,
    orientation: 'portrait',
    groups: new Set(sheet.groups.map((g) => g.title)),
  }));
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const color =
    settings.color.preset === 'custom'
      ? settings.color.value
      : (COLOR_PRESETS.find((p) => p.id === settings.color.preset)?.value ??
        CATEGORY_PRINT_COLORS[technology.category] ??
        '#1d4ed8');

  const cells = useMemo(() => flattenCells(sheet, settings.groups), [sheet, settings.groups]);
  const layout = { columns: settings.columns, rows: settings.rows };
  const rows = resolveRows(cells.length, layout);
  const pages = paginate(cells, layout);
  const { width, height } = pageSize(settings.orientation);

  // 文字サイズの自動計算
  const sheetsRef = useRef<HTMLDivElement>(null);
  const layoutKey = `${settings.columns}-${rows}-${settings.orientation}-${cells.length}-${[...settings.groups].join()}`;
  const { fontSize, fits } = useFitFontSize(sheetsRef, layoutKey);

  // プレビューを画面幅に合わせて縮小表示
  const previewRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useLayoutEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / width));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);

  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const download = async () => {
    setDownloading(true);
    setError('');
    try {
      const nodes = pageRefs.current.slice(0, pages.length).filter((n): n is HTMLDivElement => n !== null);
      await downloadPagesAsPdf(nodes, settings.orientation, `${technology.slug}-cheatsheet.pdf`);
    } catch {
      setError('PDFの作成に失敗しました。「印刷」から「PDFに保存」をお試しください。');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={styles.layout}>
      <style>{`@page { size: A4 ${settings.orientation}; margin: 0; }`}</style>
      <aside className={styles.panel} aria-label="チートシートの設定">
        <CheatSheetControls sheet={sheet} settings={settings} resolvedColor={color} onChange={setSettings} />
        <dl className={styles.summary} aria-live="polite">
          <div>
            <dt>項目数</dt>
            <dd>{cells.length}</dd>
          </div>
          <div>
            <dt>ページ</dt>
            <dd>{pages.length}枚</dd>
          </div>
          <div>
            <dt>文字サイズ</dt>
            <dd>{(fontSize * 0.75).toFixed(1)}pt</dd>
          </div>
        </dl>
        {fits && fontSize < FONT_READABLE_PX && (
          <p className={styles.warning} role="status">
            文字が小さめです。列数を増やすか、行数を指定してページを分けると読みやすくなります。
          </p>
        )}
        {!fits && (
          <p className={styles.warning} role="status">
            文字が小さくなりすぎるため一部が切れています。列数を減らすか、行数を指定してページを分けてください。
          </p>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primary}
            onClick={download}
            disabled={downloading || cells.length === 0}
          >
            {downloading ? 'PDFを作成中…' : 'PDFをダウンロード'}
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => window.print()}
            disabled={cells.length === 0}
          >
            印刷する
          </button>
        </div>
        {error && (
          <p className={styles.warning} role="alert">
            {error}
          </p>
        )}
      </aside>

      <section className={styles.preview} ref={previewRef} aria-label="プレビュー">
        <div ref={sheetsRef} className={styles.sheets}>
          {pages.map((pageCells, i) => (
            <div key={i} className={styles.frame} style={{ width: width * scale, height: height * scale }}>
              <div className={styles.scaler} style={{ transform: `scale(${scale})` }}>
                <CheatSheetPaper
                  ref={(el) => {
                    pageRefs.current[i] = el;
                  }}
                  technology={technology}
                  cells={pageCells}
                  columns={settings.columns}
                  rows={rows}
                  color={color}
                  orientation={settings.orientation}
                  pageNumber={i + 1}
                  pageCount={pages.length}
                />
              </div>
            </div>
          ))}
        </div>
        <p className={styles.note}>
          収録内容は{getCategory(technology.category).name}の実務でよく使うものを厳選しています。詳しい解説は
          <Link to={`/technology/${technology.slug}`}>{technology.name}の技術ページ</Link>からどうぞ。
        </p>
      </section>
    </div>
  );
}
