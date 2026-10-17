import { useEffect, useState, type MouseEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArticleCard } from '../components/ArticleCard';
import { Breadcrumb } from '../components/Breadcrumb';
import { SectionHeader } from '../components/SectionHeader';
import { TechIcon } from '../components/TechIcon';
import { articles, getArticleBySlug, getArticleTechnologies, loadArticleBody } from '../data/articles';
import { usePageMeta } from '../hooks/usePageMeta';
import { pageMeta } from '../seo/meta';
import type { ArticleBody, ArticleMeta } from '../types/article';
import { NotFound } from './NotFound';
import page from './Page.module.css';
import styles from './ArticleDetail.module.css';

export function ArticleDetail() {
  const { slug } = useParams();
  const article = getArticleBySlug(slug);
  if (!article) return <NotFound />;
  // key で記事ごとに再マウントし、前の記事の本文を引き継がない
  return <ArticleDetailContent key={article.slug} article={article} />;
}

/** シリーズ内の前後の記事（連番順） */
const getSiblings = (article: ArticleMeta) => {
  const series = articles.filter((a) => a.seriesSlug === article.seriesSlug).sort((a, b) => a.no.localeCompare(b.no));
  const i = series.findIndex((a) => a.slug === article.slug);
  return { prev: series[i - 1], next: series[i + 1] };
};

function ArticleDetailContent({ article }: { article: ArticleMeta }) {
  usePageMeta(pageMeta.article(article));
  const navigate = useNavigate();
  const [body, setBody] = useState<ArticleBody | null>(null);
  const technologies = getArticleTechnologies(article);
  const related = articles.filter((a) => a.category === article.category && a.slug !== article.slug).slice(0, 3);
  const { prev, next } = getSiblings(article);

  useEffect(() => {
    let active = true;
    void loadArticleBody(article.slug).then((b) => {
      if (active && b) setBody(b);
    });
    return () => {
      active = false;
    };
  }, [article.slug]);

  // 本文中の記事間リンクはページを再読み込みせずに遷移する
  const handleBodyClick = (e: MouseEvent<HTMLDivElement>) => {
    const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-article-link]');
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const slug = link.pathname.replace(/\/$/, '').split('/').pop();
    if (!slug) return;
    e.preventDefault();
    navigate(`/articles/${slug}`);
    window.scrollTo(0, 0);
  };

  return (
    <>
      <div className={styles.hero}>
        <div className="container">
          <Breadcrumb
            items={[{ label: 'ホーム', to: '/' }, { label: '記事', to: '/articles' }, { label: article.title }]}
          />
          <p className={styles.series}>
            <Link to={`/articles?category=${encodeURIComponent(article.category)}`} className={styles.category}>
              {article.category}
            </Link>
            <span>
              {article.series} #{Number(article.no)}
            </span>
            <time dateTime={article.created}>{article.created.replaceAll('-', '/')}</time>
          </p>
          <h1 className={styles.title}>{article.title}</h1>
          <p className={styles.excerpt}>{article.excerpt}</p>
          {article.tags.length > 0 && (
            <ul className={styles.tags} aria-label="タグ">
              {article.tags.map((tag) => (
                <li key={tag}>#{tag}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={`container ${styles.layout}`}>
        <article className={styles.main} aria-busy={!body}>
          {body ? (
            <div className={styles.body} onClick={handleBodyClick} dangerouslySetInnerHTML={{ __html: body.html }} />
          ) : (
            <p className={styles.loading}>読み込み中…</p>
          )}

          {(prev || next) && (
            <nav className={styles.pager} aria-label={`${article.series}の前後の記事`}>
              {prev ? (
                <Link to={`/articles/${prev.slug}`} className={styles.pagerLink}>
                  <span>← 前の記事</span>
                  {prev.title}
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link to={`/articles/${next.slug}`} className={`${styles.pagerLink} ${styles.pagerNext}`}>
                  <span>次の記事 →</span>
                  {next.title}
                </Link>
              )}
            </nav>
          )}
        </article>

        <aside className={styles.aside} aria-label="記事の補足情報">
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
          {technologies.length > 0 && (
            <div className={styles.box}>
              <h2 className={styles.boxTitle}>関連する技術</h2>
              <ul className={styles.techs}>
                {technologies.map((t) => (
                  <li key={t.id} data-category={t.category}>
                    <Link to={`/technology/${t.slug}`} className={styles.tech}>
                      <TechIcon technology={t} size="sm" />
                      {t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <div className="container">
          <section className={page.section} aria-labelledby="related-articles">
            <SectionHeader
              id="related-articles"
              title={`${article.category}の他の記事`}
              more={{ to: `/articles?category=${encodeURIComponent(article.category)}`, label: 'すべて見る' }}
            />
            <ul className={styles.related}>
              {related.map((a) => (
                <li key={a.slug}>
                  <ArticleCard article={a} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
