import { Link } from 'react-router-dom';
import { exampleQueries } from '../data/navigation';
import styles from './ExampleQueries.module.css';

export function ExampleQueries() {
  return (
    <div className={styles.examples}>
      <span className={styles.label}>検索例:</span>
      <ul className={styles.list}>
        {exampleQueries.map((q) => (
          <li key={q}>
            <Link to={`/search?q=${encodeURIComponent(q)}`} className={styles.chip}>
              {q}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
