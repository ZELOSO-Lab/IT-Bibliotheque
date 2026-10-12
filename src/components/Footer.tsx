import { Link } from 'react-router-dom';
import { site } from '../config/site';
import { footerNav } from '../data/navigation';
import { sortedCategories } from '../utils/technologies';
import styles from './Footer.module.css';

export function Footer() {
  const year = new Date().getFullYear();
  const years = year > site.startYear ? `${site.startYear}–${year}` : `${site.startYear}`;
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div>
          <p className={styles.name}>{site.name}</p>
          <p className={styles.lead}>{site.description}</p>
        </div>
        <nav aria-label="カテゴリ">
          <h2 className={styles.heading}>カテゴリ</h2>
          <ul className={styles.list}>
            {sortedCategories.map((c) => (
              <li key={c.id}>
                <Link to={`/technologies?category=${c.id}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="サイト情報">
          <h2 className={styles.heading}>サイト</h2>
          <ul className={styles.list}>
            {footerNav.map((item) => (
              <li key={item.to}>
                <Link to={item.to}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="container">
        <p className={styles.copyright}>
          <small>
            © {years} {site.copyrightHolder}
          </small>
        </p>
      </div>
    </footer>
  );
}
