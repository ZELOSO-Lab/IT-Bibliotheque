import { Link } from 'react-router-dom';
import { site } from '../config/site';
import styles from './Logo.module.css';

export function Logo() {
  return (
    <Link to="/" className={styles.logo} aria-label={`${site.name} ホーム`}>
      <svg viewBox="0 0 32 32" className={styles.mark} aria-hidden="true">
        <rect width="32" height="32" rx="7" className={styles.bg} />
        <path d="M8 8h4v16H8zM14 8h4v16h-4z" fill="#fff" />
        <path d="m20.2 9.1 3.8-1 4 15.5-3.9 1z" fill="#93c5fd" />
      </svg>
      <span className={styles.name}>{site.name}</span>
    </Link>
  );
}
