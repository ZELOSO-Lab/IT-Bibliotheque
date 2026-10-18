import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { CheatSheetLink } from '../components/CheatSheetLink';
import { ExternalLink } from '../components/ExternalLink';
import { TechIcon } from '../components/TechIcon';
import { getCategory } from '../data/categories';
import { hasCheatSheet } from '../data/cheatsheets';
import { technologyDetails } from '../data/details';
import { getGuide, loadGuideBody } from '../data/guides';
import { getTechnologyBySlug } from '../data/technologies';
import { usePageMeta } from '../hooks/usePageMeta';
import { pageMeta } from '../seo/meta';
import type { ArticleBody, GuideMeta } from '../types/article';
import type { Technology } from '../types/technology';
import { NotFound } from './NotFound';
import styles from './ArticleDetail.module.css';

export function GuideDetail() {
  const { slug } = useParams();
  const technology = getTechnologyBySlug(slug);
  const guide = getGuide(slug);
  if (!technology || !guide) return <NotFound />;
  return <GuideDetailContent key={technology.id} technology={technology} guide={guide} />;
}

function GuideDetailContent({ technology, guide }: { technology: Technology; guide: GuideMeta }) {
  usePageMeta(pageMeta.guide(technology));
  const { hash } = useLocation();
  const [body, setBody] = useState<ArticleBody | null>(null);
  const category = getCategory(technology.category);
  const officialUrl = technologyDetails[technology.slug]?.officialUrl;

  useEffect(() => {
    let active = true;
    void loadGuideBody(technology.slug).then((b) => {
      if (active && b) setBody(b);
    });
    return () => {
      active = false;
    };
  }, [technology.slug]);

  // 技術ページの「項目から探す」から来たときは、本文の読み込み後に該当項目へ移動する
  useEffect(() => {
    if (body && hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, [body, hash]);

  return (
    <>
      <div className={styles.hero}>
        <div className="container">
          <Breadcrumb
            items={[
              { label: 'ホーム', to: '/' },
              { label: category.name, to: `/technologies?category=${category.id}` },
              { label: technology.name, to: `/technology/${technology.slug}` },
              { label: '技術まとめ' },
            ]}
          />
          <p className={styles.series}>
            <Link to={`/technology/${technology.slug}`} className={styles.category}>
              {technology.name}
            </Link>
            <span>
              更新日 <time dateTime={guide.updated}>{guide.updated.replaceAll('-', '/')}</time>
            </span>
          </p>
          <h1 className={styles.title}>{guide.title}</h1>
          <p className={styles.excerpt}>{guide.excerpt}</p>
        </div>
      </div>

      <div className={`container ${styles.layout}`}>
        <article className={styles.main} aria-busy={!body}>
          {body ? (
            <div className={styles.body} dangerouslySetInnerHTML={{ __html: body.html }} />
          ) : (
            <p className={styles.loading}>読み込み中…</p>
          )}
        </article>

        <aside className={styles.aside} aria-label="技術まとめの補足情報">
          {body && body.headings.length > 0 && (
            <nav className={styles.box} aria-labelledby="toc-title">
              <h2 id="toc-title" className={styles.boxTitle}>
                目次
              </h2>
              <ol className={styles.toc}>
                {body.headings.map((h) => (
                  <li key={h.id}>
                    <a href={`#${h.id}`}>{h.text}</a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <div className={styles.box}>
            <h2 className={styles.boxTitle}>{technology.name}</h2>
            <ul className={styles.techs}>
              <li data-category={technology.category}>
                <Link to={`/technology/${technology.slug}`} className={styles.tech}>
                  <TechIcon technology={technology} size="sm" />
                  技術ページ
                </Link>
              </li>
              {hasCheatSheet(technology.slug) && (
                <li>
                  <CheatSheetLink slug={technology.slug} className={styles.tech}>
                    チートシート（PDF）
                  </CheatSheetLink>
                </li>
              )}
              {officialUrl && (
                <li>
                  <ExternalLink href={officialUrl} className={styles.tech}>
                    公式ドキュメント
                  </ExternalLink>
                </li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
