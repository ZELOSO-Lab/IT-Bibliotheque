import { useSearchParams } from 'react-router-dom';
import { countCategories } from '../data/articles';
import page from '../pages/Page.module.css';
import type { ArticleMeta } from '../types/article';
import { ArticleCard } from './ArticleCard';
import styles from './ArticleList.module.css';

/** カテゴリで絞り込める記事一覧（?category= で絞り込み状態をURLに残す） */
export function ArticleList({ articles }: { articles: ArticleMeta[] }) {
  const [params, setParams] = useSearchParams();
  const selected = params.get('category');
  const items = selected ? articles.filter((a) => a.category === selected) : articles;

  const select = (category: string | null) => setParams(category ? { category } : {}, { replace: true });

  return (
    <>
      <div className={styles.filter} role="group" aria-label="カテゴリで絞り込む">
        <button type="button" className={styles.chip} aria-pressed={!selected} onClick={() => select(null)}>
          すべて<span>{articles.length}</span>
        </button>
        {countCategories(articles).map((c) => (
          <button
            key={c.name}
            type="button"
            className={styles.chip}
            aria-pressed={selected === c.name}
            onClick={() => select(c.name)}
          >
            {c.name}
            <span>{c.count}</span>
          </button>
        ))}
      </div>
      <p className={page.resultInfo} aria-live="polite">
        {items.length}件の記事
      </p>
      {items.length > 0 ? (
        <ul className={styles.list}>
          {items.map((a) => (
            <li key={a.slug}>
              <ArticleCard article={a} />
            </li>
          ))}
        </ul>
      ) : (
        <div className={page.empty}>
          <p>該当する記事がありません。</p>
        </div>
      )}
    </>
  );
}
