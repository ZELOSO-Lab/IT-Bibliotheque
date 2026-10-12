import { Link, useParams } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { CategoryBadge } from '../components/CategoryBadge';
import { CheatSheetLink } from '../components/CheatSheetLink';
import { CodeBlock } from '../components/CodeBlock';
import { ExternalLink } from '../components/ExternalLink';
import { SectionHeader } from '../components/SectionHeader';
import { TechIcon } from '../components/TechIcon';
import { TechnologyGrid } from '../components/TechnologyGrid';
import { getCategory } from '../data/categories';
import { hasCheatSheet } from '../data/cheatsheets';
import { technologyDetails } from '../data/details';
import { sectionUrl, sections } from '../data/sections';
import { getTechnologyBySlug } from '../data/technologies';
import { usePageMeta } from '../hooks/usePageMeta';
import { pageMeta } from '../seo/meta';
import type { Technology } from '../types/technology';
import { getRelatedTechnologies } from '../utils/technologies';
import { NotFound } from './NotFound';
import page from './Page.module.css';
import styles from './TechnologyDetail.module.css';

export function TechnologyDetail() {
  const { slug } = useParams();
  const technology = getTechnologyBySlug(slug);
  if (!technology) return <NotFound />;
  // key で技術ごとに再マウントし、ページ状態を引き継がない
  return <TechnologyDetailContent key={technology.id} technology={technology} />;
}

function TechnologyDetailContent({ technology }: { technology: Technology }) {
  usePageMeta(pageMeta.technology(technology));
  const category = getCategory(technology.category);
  const related = getRelatedTechnologies(technology, 3);
  const detail = technologyDetails[technology.slug];
  const allCategories = [technology.category, ...(technology.subCategories ?? [])];

  return (
    <>
      <div className={styles.hero} data-category={technology.category}>
        <div className="container">
          <Breadcrumb
            items={[
              { label: 'ホーム', to: '/' },
              { label: category.name, to: `/technologies?category=${category.id}` },
              { label: technology.name },
            ]}
          />
          <div className={styles.titleRow}>
            <TechIcon technology={technology} size="lg" />
            <div>
              <h1 className={styles.title}>{technology.name}</h1>
              <CategoryBadge category={technology.category} />
            </div>
          </div>
          <p className={styles.description}>{technology.description}</p>
          <div className={styles.actions}>
            <ExternalLink href={technology.url} className={styles.cta}>
              {technology.name}技術まとめはこちら
            </ExternalLink>
            {hasCheatSheet(technology.slug) && (
              <CheatSheetLink slug={technology.slug} className={styles.ctaSecondary}>
                チートシートをPDFで作成
              </CheatSheetLink>
            )}
            {detail?.officialUrl && (
              <ExternalLink href={detail.officialUrl} className={styles.ctaSecondary}>
                公式ドキュメント
              </ExternalLink>
            )}
          </div>
        </div>
      </div>

      <div className={`container ${styles.layout}`} data-category={technology.category}>
        <div className={styles.main}>
          <section className={page.section} aria-labelledby="sections">
            <SectionHeader
              id="sections"
              title="項目から探す"
              description={`${technology.name}技術まとめページの各項目へ移動します。`}
            />
            <ul className={styles.sections}>
              {sections.map((section) => (
                <li key={section.key}>
                  <ExternalLink href={sectionUrl(technology, section)} className={styles.sectionLink}>
                    <span className={styles.sectionLabel}>{section.label}</span>
                    <span className={styles.sectionDesc}>{section.description}</span>
                  </ExternalLink>
                </li>
              ))}
            </ul>
          </section>

          {detail && (
            <section className={page.section} aria-labelledby="use-cases">
              <SectionHeader id="use-cases" title="主な用途" />
              <ul className={styles.useCases}>
                {detail.useCases.map((u) => (
                  <li key={u} className={styles.useCase}>
                    {u}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {detail && detail.quickRefs.length > 0 && (
            <section className={page.section} aria-labelledby="quick-ref">
              <SectionHeader
                id="quick-ref"
                title="クイックリファレンス"
                description="よく使うコマンド・構文です。詳しい解説は技術まとめページをご覧ください。"
              />
              <div className={styles.quickRefs}>
                {detail.quickRefs.map((q) => (
                  <CodeBlock key={q.title} title={q.title} code={q.code} />
                ))}
              </div>
            </section>
          )}

          <section className={page.section} aria-labelledby="keywords">
            <SectionHeader id="keywords" title="関連キーワード" />
            <ul className={styles.keywords}>
              {technology.keywords.map((k) => (
                <li key={k}>
                  <Link to={`/search?q=${encodeURIComponent(k)}`} className={styles.keyword}>
                    {k}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className={styles.aside} aria-label={`${technology.name}の基本情報`}>
          <dl className={styles.info}>
            <div>
              <dt>カテゴリ</dt>
              <dd className={styles.badges}>
                {allCategories.map((c) => (
                  <CategoryBadge key={c} category={c} />
                ))}
              </dd>
            </div>
            <div>
              <dt>技術まとめ</dt>
              <dd>
                <ExternalLink href={technology.url} className={styles.infoLink}>
                  {technology.name}技術まとめ
                </ExternalLink>
              </dd>
            </div>
            {detail?.officialUrl && (
              <div>
                <dt>公式</dt>
                <dd>
                  <ExternalLink href={detail.officialUrl} className={styles.infoLink}>
                    公式ドキュメント
                  </ExternalLink>
                </dd>
              </div>
            )}
            <div>
              <dt>登録日</dt>
              <dd>
                <time dateTime={technology.createdAt}>{technology.createdAt.replaceAll('-', '/')}</time>
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      <div className="container">
        {related.length > 0 && (
          <section className={page.section} aria-labelledby="related">
            <SectionHeader
              id="related"
              title={`${category.name}の他の技術`}
              more={{ to: `/technologies?category=${category.id}`, label: 'すべて見る' }}
            />
            <TechnologyGrid technologies={related} />
          </section>
        )}
      </div>
    </>
  );
}
