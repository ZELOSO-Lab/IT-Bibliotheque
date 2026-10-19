import { ArticleList } from '../components/ArticleList';
import { PageHeader } from '../components/PageHeader';
import { techArticles } from '../data/articles';
import { usePageMeta } from '../hooks/usePageMeta';
import { pageMeta } from '../seo/meta';

export function Articles() {
  usePageMeta(pageMeta.articles());
  return (
    <>
      <PageHeader
        title="記事"
        lead="シリーズ「現場の声」では、開発現場で実際に困った状況と、その解決手順をまとめています。"
      />
      <div className="container">
        <ArticleList articles={techArticles} />
      </div>
    </>
  );
}
