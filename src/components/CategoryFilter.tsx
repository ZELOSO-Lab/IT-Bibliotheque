import type { CategoryId } from '../types/technology';
import { sortedCategories } from '../utils/technologies';
import styles from './CategoryFilter.module.css';

type Props = {
  value: CategoryId | null;
  onChange: (value: CategoryId | null) => void;
  counts: Record<CategoryId, number>;
  total: number;
};

export function CategoryFilter({ value, onChange, counts, total }: Props) {
  const options: { id: CategoryId | null; name: string; count: number }[] = [
    { id: null, name: '全て', count: total },
    ...sortedCategories.map((c) => ({ id: c.id, name: c.name, count: counts[c.id] })),
  ];
  return (
    <div className={styles.filter} role="group" aria-label="カテゴリで絞り込み">
      {options.map((o) => (
        <button
          key={o.id ?? 'all'}
          type="button"
          className={styles.button}
          data-category={o.id ?? undefined}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.name}
          <span className={styles.count}>{o.count}</span>
        </button>
      ))}
    </div>
  );
}
