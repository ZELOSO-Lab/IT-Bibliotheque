import { Link } from 'react-router-dom';
import type { ArticleMeta } from '../types/article';
import styles from './ArticleCard.module.css';

const formatDate = (date: string) => date.replaceAll('-', '/');

/** 記事一覧・関連記事のカード */
export function ArticleCard({ article, compact = false }: { article: ArticleMeta; compact?: boolean }) {
  return (
    <Link to={`/articles/${article.slug}`} className={styles.card}>
      <span className={styles.meta}>
        <span className={styles.category}>{article.category}</span>
        <time dateTime={article.created}>{formatDate(article.created)}</time>
      </span>
      <span className={styles.title}>{article.title}</span>
      {!compact && <span className={styles.excerpt}>{article.excerpt}</span>}
    </Link>
  );
}
