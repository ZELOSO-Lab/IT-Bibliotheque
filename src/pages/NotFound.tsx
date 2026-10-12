import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { usePageMeta } from '../hooks/usePageMeta';
import { pageMeta } from '../seo/meta';
import page from './Page.module.css';

export function NotFound() {
  usePageMeta(pageMeta.notFound());
  return (
    <>
      <PageHeader title="ページが見つかりません" />
      <div className="container">
        <div className={page.prose}>
          <p>お探しのページは移動または削除された可能性があります。</p>
          <p>
            <Link to="/search">技術検索</Link>、または<Link to="/technologies">技術一覧</Link>からお探しください。
          </p>
        </div>
      </div>
    </>
  );
}
