import { Link } from 'react-router-dom';
import { getTechnologiesByCategory, sortedCategories } from '../utils/technologies';
import { CategoryIcon } from './CategoryIcon';
import styles from './CategoryNav.module.css';

/** カテゴリへのショートカット（トップページのヒーロー直下） */
export function CategoryNav() {
  return (
    <nav aria-label="カテゴリから探す" className={styles.nav}>
      <ul className={styles.list}>
        {sortedCategories.map((c) => (
          <li key={c.id}>
            <Link to={`/technologies?category=${c.id}`} className={styles.item} data-category={c.id}>
              <span className={styles.icon}>
                <CategoryIcon category={c.id} />
              </span>
              <span className={styles.text}>
                <span className={styles.name}>{c.name}</span>
                <span className={styles.count}>{getTechnologiesByCategory(c.id).length}件</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
