import { useLayoutEffect, useState, type RefObject } from 'react';

export const FONT_MIN_PX = 6;
export const FONT_MAX_PX = 16;
/** これより小さいと印刷時に読みにくい */
export const FONT_READABLE_PX = 8;

const overflows = (el: Element) => el.scrollHeight > el.clientHeight + 0.5 || el.scrollWidth > el.clientWidth + 0.5;

/**
 * コンテナ内のすべてのセル（[data-fit-cell]）が枠に収まる最大の文字サイズを二分探索で求め、
 * CSS 変数 --cs-font に設定する。全ページで同じ文字サイズになる。
 */
export const useFitFontSize = (containerRef: RefObject<HTMLElement | null>, layoutKey: string) => {
  const [result, setResult] = useState({ fontSize: FONT_MAX_PX, fits: true });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const cells = Array.from(container.querySelectorAll('[data-fit-cell]'));
    const apply = (px: number) => container.style.setProperty('--cs-font', `${px}px`);
    const fitsAt = (px: number) => {
      apply(px);
      return !cells.some(overflows);
    };

    let fontSize = FONT_MIN_PX;
    const fits = fitsAt(FONT_MIN_PX);
    if (fits) {
      // 0.25px 刻みで二分探索
      let low = FONT_MIN_PX * 4;
      let high = FONT_MAX_PX * 4;
      while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        if (fitsAt(mid / 4)) low = mid;
        else high = mid - 1;
      }
      fontSize = low / 4;
    }
    apply(fontSize);
    setResult((prev) => (prev.fontSize === fontSize && prev.fits === fits ? prev : { fontSize, fits }));
  }, [containerRef, layoutKey]);

  return result;
};
