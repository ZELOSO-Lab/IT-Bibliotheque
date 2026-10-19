import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SummaryLink } from '../components/SummaryLink';
import { usePageMeta } from '../hooks/usePageMeta';
import { pageMeta } from '../seo/meta';
import { getTechnologiesByCategory, sortedCategories } from '../utils/technologies';
import page from './Page.module.css';
import styles from './Links.module.css';

export function Links() {
  usePageMeta(pageMeta.links());
  return (
    <>
      <PageHeader title="関連リンク" lead="各技術の技術まとめページへの一覧です。" />
      <div className="container">
        <div className={`${page.sectionTight} ${styles.columns}`}>
          {sortedCategories.map((c) => (
            <section key={c.id} aria-labelledby={`links-${c.id}`} className={styles.group}>
              <h2 id={`links-${c.id}`} className={styles.heading}>
                {c.name}
              </h2>
              <ul className={styles.list}>
                {getTechnologiesByCategory(c.id).map((t) => (
                  <li key={t.id}>
                    <Link to={`/technology/${t.slug}`}>{t.name}</Link>
                    <SummaryLink technology={t} className={styles.external}>
                      まとめ
                    </SummaryLink>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
