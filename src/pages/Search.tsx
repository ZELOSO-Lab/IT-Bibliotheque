import { useSearchParams } from 'react-router-dom';
import { ExampleQueries } from '../components/ExampleQueries';
import { PageHeader } from '../components/PageHeader';
import { SearchBox } from '../components/SearchBox';
import { TechnologyGrid } from '../components/TechnologyGrid';
import { usePageMeta } from '../hooks/usePageMeta';
import { useTechnologySearch } from '../hooks/useTechnologySearch';
import { pageMeta } from '../seo/meta';
import page from './Page.module.css';

export function Search() {
  usePageMeta(pageMeta.search());
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const { results, isEmptyQuery } = useTechnologySearch(query);

  // 入力をURLに同期（リロード・共有に対応）
  const setQuery = (value: string) => setParams(value ? { q: value } : {}, { replace: true });

  return (
    <>
      <PageHeader
        title="技術検索"
        lead="技術名・別名・キーワード・カテゴリ・説明から検索できます。入力に合わせて結果が絞り込まれます。"
      />
      <div className="container">
        <div className={page.toolbar}>
          <SearchBox
            value={query}
            onChange={setQuery}
            label="技術を検索"
            size="lg"
            autoFocus
            shortcut
            controls="search-results"
          />
          <ExampleQueries />
        </div>
        <div id="search-results" aria-live="polite">
          {isEmptyQuery ? (
            <p className={page.resultInfo}>キーワードを入力してください。</p>
          ) : (
            <>
              <p className={page.resultInfo}>
                「{query.trim()}」の検索結果: {results.length}件
              </p>
              {results.length > 0 ? (
                <TechnologyGrid technologies={results} />
              ) : (
                <div className={page.empty}>
                  <p>一致する技術が見つかりませんでした。</p>
                  <p>別の表記（例: 英語名・略称）や、カテゴリ名（例: db、ツール）でもお試しください。</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
