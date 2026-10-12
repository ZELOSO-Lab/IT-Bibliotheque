import { PageHeader } from '../components/PageHeader';
import { site } from '../config/site';
import { usePageMeta } from '../hooks/usePageMeta';
import { pageMeta } from '../seo/meta';
import page from './Page.module.css';

/** 雛形。公開前に内容を確定すること */
export function Terms() {
  usePageMeta(pageMeta.terms());
  return (
    <>
      <PageHeader title="利用規約" />
      <div className="container">
        <div className={page.prose}>
          <p>{site.name}（以下「当サイト」）をご利用いただく際の条件を定めます。</p>
          <h2>掲載情報について</h2>
          <p>
            当サイトの情報は正確さに努めていますが、その完全性・最新性を保証するものではありません。
            掲載情報の利用によって生じた損害について、当サイトは責任を負いません。
          </p>
          <h2>著作権・商標</h2>
          <p>当サイトのコンテンツの著作権は運営者に帰属します。記載の会社名・製品名は各社の商標または登録商標です。</p>
          <h2>変更</h2>
          <p>本規約は予告なく変更することがあります。</p>
        </div>
      </div>
    </>
  );
}
