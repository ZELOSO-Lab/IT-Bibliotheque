import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

type Props = {
  title: string;
  lead?: ReactNode;
  children?: ReactNode;
};

/** 下層ページ共通の見出し領域 */
export function PageHeader({ title, lead, children }: Props) {
  return (
    <div className={styles.header}>
      <div className="container">
        {children}
        <h1 className={styles.title}>{title}</h1>
        {lead && <p className={styles.lead}>{lead}</p>}
      </div>
    </div>
  );
}
