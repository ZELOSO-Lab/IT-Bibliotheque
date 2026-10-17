import { useSearchParams } from 'react-router-dom';
import { ArticleCard } from '../components/ArticleCard';
import { PageHeader } from '../components/PageHeader';
import { articleCategories, articles } from '../data/articles';
import { usePageMeta } from '../hooks/usePageMeta';
import { pageMeta } from '../seo/meta';
import page from './Page.module.css';
import styles from './Articles.module.css';

export function Articles() {
  usePageMeta(pageMeta.articles());
  const [params, setParams] = useSearchParams();
  const selected = params.get('category');
  const items = selected ? articles.filter((a) => a.category === selected) : articles;

  const select = (category: string | null) => setParams(category ? { category } : {}, { replace: true });

  return (
    <>
      <PageHeader
        title="記事"
        lead="シリーズ「現場の声」では、開発現場で実際に困った状況と、その解決手順をまとめています。"
      />
      <div className="container">
        <div className={styles.filter} role="group" aria-label="カテゴリで絞り込む">
          <button type="button" className={styles.chip} aria-pressed={!selected} onClick={() => select(null)}>
            すべて<span>{articles.length}</span>
          </button>
          {articleCategories.map((c) => (
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
      </div>
    </>
  );
}
