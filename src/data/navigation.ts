/** ヘッダー・フッターのナビゲーション。項目の追加・並べ替えはここで行う */
export const mainNav = [
  { to: '/search', label: '技術検索' },
  { to: '/categories', label: 'カテゴリ' },
  { to: '/technologies', label: '技術一覧' },
  { to: '/cheatsheets', label: 'チートシート' },
  { to: '/about', label: 'About' },
] as const;

export const footerNav = [
  { to: '/about', label: 'About' },
  { to: '/technologies', label: '技術一覧' },
  { to: '/categories', label: 'カテゴリ' },
  { to: '/cheatsheets', label: 'チートシート' },
  { to: '/links', label: '関連リンク' },
  { to: '/privacy', label: 'プライバシーポリシー' },
  { to: '/terms', label: '利用規約' },
] as const;

/** 検索例（ヒーロー・検索ページに表示） */
export const exampleQueries = ['Java', 'Oracle', 'SQL', 'Git', 'AWS', 'Tera Term', 'エラー', 'コマンド'];
