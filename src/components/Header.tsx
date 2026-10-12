import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { mainNav } from '../data/navigation';
import { Logo } from './Logo';
import { SearchBox } from './SearchBox';
import { ThemeToggle } from './ThemeToggle';
import styles from './Header.module.css';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  // 画面遷移でメニューを閉じる
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const submit = (value: string) => {
    navigate(value ? `/search?q=${encodeURIComponent(value)}` : '/search');
    setQuery('');
  };

  // トップ・検索ページは本文に大きな検索欄があるため、ヘッダー検索は出さない
  const showHeaderSearch = location.pathname !== '/' && location.pathname !== '/search';

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Logo />

        {showHeaderSearch && (
          <div className={styles.search}>
            <SearchBox value={query} onChange={setQuery} onSubmit={submit} label="技術を検索" size="sm" shortcut />
          </div>
        )}

        <button
          type="button"
          className={styles.menuButton}
          aria-expanded={menuOpen}
          aria-controls="global-nav"
          aria-label={menuOpen ? 'メニューを閉じる' : 'メニューを開く'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={styles.bars} data-open={menuOpen} aria-hidden="true" />
        </button>

        <nav id="global-nav" className={styles.nav} data-open={menuOpen} aria-label="メインメニュー">
          <ul className={styles.navList}>
            {mainNav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
