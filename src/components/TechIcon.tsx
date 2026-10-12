import type { Technology } from '../types/technology';
import { getIcon, monogram } from '../utils/icons';
import styles from './TechIcon.module.css';

type Props = {
  technology: Technology;
  size?: 'sm' | 'md' | 'lg';
};

/** 技術アイコン。Simple Icons に無い場合はカテゴリ色の頭文字アイコンを表示 */
export function TechIcon({ technology, size = 'md' }: Props) {
  const icon = getIcon(technology.icon);
  return (
    <span className={`${styles.icon} ${styles[size]}`} data-category={technology.category} aria-hidden="true">
      {icon ? (
        <svg viewBox="0 0 24 24" className={styles.svg}>
          <path d={icon.path} />
        </svg>
      ) : (
        <span className={styles.text}>{monogram(technology.name)}</span>
      )}
    </span>
  );
}
