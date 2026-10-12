import { Link } from 'react-router-dom';
import type { Category } from '../types/technology';
import { getTechnologiesByCategory } from '../utils/technologies';
import { CategoryIcon } from './CategoryIcon';
import styles from './CategoryCard.module.css';

type Props = {
  category: Category;
  headingLevel?: 'h2' | 'h3';
};

/** カテゴリカード。所属技術へのリンクを直接並べ、2クリックで技術ページに到達できるようにする */
export function CategoryCard({ category, headingLevel: Heading = 'h3' }: Props) {
  const items = getTechnologiesByCategory(category.id);
  return (
    <section className={styles.card} data-category={category.id} aria-labelledby={`cat-${category.id}`}>
      <div className={styles.head}>
        <span className={styles.icon}>
          <CategoryIcon category={category.id} />
        </span>
        <div>
          <Heading id={`cat-${category.id}`} className={styles.name}>
            <Link to={`/technologies?category=${category.id}`} className={styles.nameLink}>
              {category.name}
            </Link>
          </Heading>
          <p className={styles.label}>
            {category.label}・{items.length}件
          </p>
        </div>
      </div>
      <ul className={styles.list}>
        {items.map((t) => (
          <li key={t.id}>
            <Link to={`/technology/${t.slug}`} className={styles.chip}>
              {t.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
