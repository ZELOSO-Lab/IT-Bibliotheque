import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CategoryCard } from '../components/CategoryCard';
import { CategoryNav } from '../components/CategoryNav';
import { ExampleQueries } from '../components/ExampleQueries';
import { SearchBox } from '../components/SearchBox';
import { SectionHeader } from '../components/SectionHeader';
import { TechnologyGrid } from '../components/TechnologyGrid';
import { site } from '../config/site';
import { sections } from '../data/sections';
import { technologies } from '../data/technologies';
import { usePageMeta } from '../hooks/usePageMeta';
import { useTechnologySearch } from '../hooks/useTechnologySearch';
import { pageMeta } from '../seo/meta';
import { getFeaturedTechnologies, getRecentTechnologies, sortedCategories } from '../utils/technologies';
import page from './Page.module.css';
import styles from './Home.module.css';

const featured = getFeaturedTechnologies();
const recent = getRecentTechnologies(6);
const INSTANT_RESULTS = 8;
const linkCount = technologies.length * (sections.length + 1);

export function Home() {
  usePageMeta(pageMeta.home());
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { results, isEmptyQuery } = useTechnologySearch(query);

  const submit = (value: string) => {
    if (!value) return;
    // 1件に絞れたら技術ページへ直行
    const first = results[0];
    if (results.length === 1 && first) navigate(`/technology/${first.slug}`);
    else navigate(`/search?q=${encodeURIComponent(value)}`);
  };

  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={`container ${styles.heroInner}`}>
          <h1 id="hero-title" className={styles.title}>
            {site.tagline}
          </h1>
          <p className={styles.lead}>{site.lead}</p>
          <ul className={styles.stats} aria-label="掲載状況">
            <li>
              <strong>{technologies.length}</strong>技術
            </li>
            <li>
              <strong>{sortedCategories.length}</strong>カテゴリ
            </li>
            <li>
              <strong>{linkCount}</strong>項目リンク
            </li>
          </ul>
          <div className={styles.searchArea}>
            <SearchBox
              value={query}
              onChange={setQuery}
              onSubmit={submit}
              label="技術を検索"
              size="lg"
              controls="hero-results"
              shortcut
            />
            <div id="hero-results" aria-live="polite">
              {!isEmptyQuery && (
                <div className={styles.instant}>
                  <p className={styles.instantInfo}>
                    「{query.trim()}」に一致する技術: {results.length}件
                  </p>
                  {results.length > 0 ? (
                    <TechnologyGrid technologies={results.slice(0, INSTANT_RESULTS)} variant="compact" />
                  ) : (
                    <p className={styles.instantEmpty}>
                      見つかりませんでした。<Link to="/technologies">技術一覧</Link>から探すこともできます。
                    </p>
                  )}
                  {results.length > INSTANT_RESULTS && (
                    <Link to={`/search?q=${encodeURIComponent(query.trim())}`} className={styles.instantMore}>
                      すべての結果を見る（{results.length}件）→
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
          <ExampleQueries />
          <CategoryNav />
        </div>
      </section>

      <div className="container">
        <section className={page.section} aria-labelledby="featured">
          <SectionHeader id="featured" title="よく使う技術" description="現場でよく使う技術にすぐアクセスできます。" />
          <TechnologyGrid technologies={featured} />
        </section>

        <section className={page.section} aria-labelledby="categories">
          <SectionHeader id="categories" title="カテゴリから探す" more={{ to: '/categories', label: 'カテゴリ一覧' }} />
          <div className={page.grid2}>
            {sortedCategories.map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </div>
        </section>

        <section className={page.section} aria-labelledby="all-technologies">
          <SectionHeader
            id="all-technologies"
            title="技術一覧"
            description={`登録技術 ${technologies.length}件`}
            more={{ to: '/technologies', label: '絞り込んで見る' }}
          />
          <TechnologyGrid technologies={technologies} variant="compact" />
        </section>

        <section className={page.section} aria-labelledby="recent">
          <SectionHeader id="recent" title="最近追加された技術" />
          <TechnologyGrid technologies={recent} />
        </section>

        <section className={`${page.section}`} aria-labelledby="about">
          <div className={styles.about}>
            <h2 id="about" className={styles.aboutTitle}>
              このサイトについて
            </h2>
            <p>
              {site.name}
              は、技術者が困ったときにすぐ調べられるよう、技術情報への入口を一か所に集約した技術情報ポータルです。
              各技術の詳細は、技術ごとの「技術まとめページ」で管理しています。
            </p>
            <Link to="/about" className={styles.aboutLink}>
              詳しく見る →
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
