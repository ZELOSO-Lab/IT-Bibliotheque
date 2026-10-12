import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './SectionHeader.module.css';

type Props = {
  id: string;
  title: string;
  description?: ReactNode;
  more?: { to: string; label: string };
};

export function SectionHeader({ id, title, description, more }: Props) {
  return (
    <div className={styles.header}>
      <div>
        <h2 id={id} className={styles.title}>
          {title}
        </h2>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {more && (
        <Link to={more.to} className={styles.more}>
          {more.label} →
        </Link>
      )}
    </div>
  );
}
