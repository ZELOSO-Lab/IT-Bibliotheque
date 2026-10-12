import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CategoryFilter } from '../components/CategoryFilter';
import { PageHeader } from '../components/PageHeader';
import { SearchBox } from '../components/SearchBox';
import { TechnologyGrid } from '../components/TechnologyGrid';
import { categories, getCategory, isCategoryId } from '../data/categories';
import { technologies } from '../data/technologies';
import { usePageMeta } from '../hooks/usePageMeta';
import { useTechnologySearch } from '../hooks/useTechnologySearch';
import { pageMeta } from '../seo/meta';
import type { CategoryId } from '../types/technology';
import { belongsTo } from '../utils/technologies';
import page from './Page.module.css';

const counts = Object.fromEntries(
  categories.map((c) => [c.id, technologies.filter((t) => belongsTo(t, c.id)).length]),
) as Record<CategoryId, number>;

export function Technologies() {
  usePageMeta(pageMeta.technologies());
  const [params, setParams] = useSearchParams();
  const categoryParam = params.get('category');
  const category = isCategoryId(categoryParam) ? categoryParam : null;
  const [query, setQuery] = useState('');
  const { results, isEmptyQuery } = useTechnologySearch(query);

  // カテゴリはURLに保持（共有・戻る操作に対応）
  const setCategory = (next: CategoryId | null) => {
    setParams(next ? { category: next } : {}, { replace: true });
  };

  const visible = useMemo(() => {
    const base = isEmptyQuery ? technologies : results;
    return category ? base.filter((t) => belongsTo(t, category)) : base;
  }, [category, isEmptyQuery, results]);

  return (
    <>
      <PageHeader
        title="技術一覧"
        lead="すべての技術をカテゴリで絞り込めます。キーワードでさらに絞り込むこともできます。"
      />
      <div className="container">
        <div className={page.toolbar}>
          <CategoryFilter value={category} onChange={setCategory} counts={counts} total={technologies.length} />
          <SearchBox
            value={query}
            onChange={setQuery}
            label="一覧を絞り込む"
            placeholder="一覧をキーワードで絞り込み"
          />
        </div>
        <p className={page.resultInfo} aria-live="polite">
          {category ? `${getCategory(category).name}：` : ''}
          {visible.length}件
        </p>
        {visible.length > 0 ? (
          <TechnologyGrid technologies={visible} />
        ) : (
          <div className={page.empty}>
            <p>条件に一致する技術がありません。</p>
            <p>カテゴリを「全て」に戻すか、キーワードを変えてお試しください。</p>
          </div>
        )}
      </div>
    </>
  );
}
