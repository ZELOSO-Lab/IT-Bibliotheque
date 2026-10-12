import type { Orientation } from './cheatsheetLayout';

/**
 * 画面上の A4 ページ要素を画像化して PDF にする。
 * ライブラリはダウンロード時にだけ読み込み、通常のページ表示を重くしない。
 */
export const downloadPagesAsPdf = async (pages: HTMLElement[], orientation: Orientation, fileName: string) => {
  const [{ jsPDF }, { toCanvas }] = await Promise.all([import('jspdf'), import('html-to-image')]);
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4', compress: true });
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();

  for (const [index, page] of pages.entries()) {
    const canvas = await toCanvas(page, { pixelRatio: 3, backgroundColor: '#ffffff', cacheBust: true });
    if (index > 0) pdf.addPage('a4', orientation);
    pdf.addImage(canvas, 'PNG', 0, 0, width, height, undefined, 'FAST');
  }
  pdf.save(fileName);
};
