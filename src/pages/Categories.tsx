import { CategoryCard } from '../components/CategoryCard';
import { PageHeader } from '../components/PageHeader';
import { usePageMeta } from '../hooks/usePageMeta';
import { pageMeta } from '../seo/meta';
import { sortedCategories } from '../utils/technologies';
import page from './Page.module.css';

export function Categories() {
  usePageMeta(pageMeta.categories());
  return (
    <>
      <PageHeader title="カテゴリ一覧" lead="カテゴリを選ぶか、技術名をクリックすると技術ページへ移動します。" />
      <div className="container">
        <div className={page.sectionTight}>
          <div className={page.grid2}>
            {sortedCategories.map((c) => (
              <CategoryCard key={c.id} category={c} headingLevel="h2" />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
