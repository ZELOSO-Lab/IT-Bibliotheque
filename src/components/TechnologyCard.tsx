import { Link } from 'react-router-dom';
import type { Technology } from '../types/technology';
import { CategoryBadge } from './CategoryBadge';
import { TechIcon } from './TechIcon';
import styles from './TechnologyCard.module.css';

type Props = {
  technology: Technology;
  /** compact: アイコン＋名前のみのタイル表示 */
  variant?: 'default' | 'compact';
};

/**
 * 技術カード。カード全体をクリック可能にしつつ、リンクは見出しの1つだけにする
 * （スクリーンリーダーでリンクが重複しないように）。
 */
export function TechnologyCard({ technology, variant = 'default' }: Props) {
  const href = `/technology/${technology.slug}`;

  if (variant === 'compact') {
    return (
      <Link to={href} className={styles.compact} data-category={technology.category}>
        <TechIcon technology={technology} size="sm" />
        <span className={styles.compactName}>{technology.name}</span>
      </Link>
    );
  }

  return (
    <article className={styles.card} data-category={technology.category}>
      <div className={styles.head}>
        <TechIcon technology={technology} />
        <div className={styles.titles}>
          <h3 className={styles.name}>
            <Link to={href} className={styles.link}>
              {technology.name}
            </Link>
          </h3>
          <CategoryBadge category={technology.category} />
        </div>
      </div>
      <p className={styles.summary}>{technology.summary}</p>
      <span className={styles.more} aria-hidden="true">
        技術情報を見る →
      </span>
    </article>
  );
}
