import { useCallback, useState } from 'react';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'itb-theme';

const currentTheme = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

/** 初期値は index.html のインラインスクリプトで（保存値 → OS設定の順に）決定済み */
export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(currentTheme);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ストレージが使えない環境では保存しない
    }
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => setTheme(currentTheme() === 'dark' ? 'light' : 'dark'), [setTheme]);

  return { theme, toggle };
};
