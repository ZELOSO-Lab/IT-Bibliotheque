import type { Playground } from '../types/playground';
import { ExternalLink } from './ExternalLink';
import styles from './PlaygroundList.module.css';

type Props = {
  items: Playground[];
};

/** コードを試せるサイトのカード一覧（/playgrounds と技術ページで共用） */
export function PlaygroundList({ items }: Props) {
  return (
    <ul className={styles.list}>
      {items.map((p) => (
        <li key={p.id} className={styles.card}>
          <div className={styles.head}>
            <ExternalLink href={p.url} className={styles.name}>
              {p.name}
            </ExternalLink>
            <span className={styles.tags}>
              {p.group === 'local' && <span className={styles.tag}>インストール</span>}
              {p.japanese && <span className={styles.tag}>日本語</span>}
            </span>
          </div>
          <p className={styles.description}>{p.description}</p>
          <p className={styles.pricing}>{p.pricing}</p>
        </li>
      ))}
    </ul>
  );
}
