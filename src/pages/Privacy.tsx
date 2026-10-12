import { PageHeader } from '../components/PageHeader';
import { site } from '../config/site';
import { usePageMeta } from '../hooks/usePageMeta';
import { pageMeta } from '../seo/meta';
import page from './Page.module.css';

/** 雛形。公開前に運用実態（アクセス解析・広告の有無等）に合わせて確定すること */
export function Privacy() {
  usePageMeta(pageMeta.privacy());
  return (
    <>
      <PageHeader title="プライバシーポリシー" />
      <div className="container">
        <div className={page.prose}>
          <p>{site.name}（以下「当サイト」）における個人情報の取り扱いについて定めます。</p>
          <h2>取得する情報</h2>
          <p>
            当サイトは会員登録やお問い合わせフォームを設けておらず、氏名・メールアドレス等の個人情報を取得しません。
            表示設定（ライト / ダーク）はお使いのブラウザ内にのみ保存されます。
          </p>
          <h2>アクセス解析</h2>
          <p>アクセス解析ツールを導入する場合は、その名称と取得する情報を本ページに記載します。</p>
          <h2>外部サイト</h2>
          <p>当サイトからリンクする外部サイトでの情報の取り扱いは、各サイトのポリシーに従います。</p>
          <h2>改定</h2>
          <p>本ポリシーは必要に応じて改定することがあります。</p>
        </div>
      </div>
    </>
  );
}
