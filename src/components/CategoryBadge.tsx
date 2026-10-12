import { getCategory } from '../data/categories';
import type { CategoryId } from '../types/technology';
import styles from './CategoryBadge.module.css';

export function CategoryBadge({ category }: { category: CategoryId }) {
  return (
    <span className={styles.badge} data-category={category}>
      {getCategory(category).name}
    </span>
  );
}
