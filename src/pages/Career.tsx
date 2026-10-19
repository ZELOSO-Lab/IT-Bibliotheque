import { ArticleList } from '../components/ArticleList';
import { PageHeader } from '../components/PageHeader';
import { careerArticles } from '../data/articles';
import { usePageMeta } from '../hooks/usePageMeta';
import { pageMeta } from '../seo/meta';
import styles from './Career.module.css';

export function Career() {
  usePageMeta(pageMeta.career());
  return (
    <>
      <PageHeader
        title="キャリア・働き方"
        lead="エンジニアが現場で実際に困る、労働時間・休日・残業代の決まりと、資格の選び方・勉強法をまとめています。"
      />
      <div className="container">
        <aside className={styles.note} aria-label="労務の記事について">
          <p>
            労務の記事は、記事内に<strong>根拠となる条文</strong>と<strong>最終確認日</strong>
            を記載しています。法改正で内容が変わることがあるため、最終確認日より後の情報は厚生労働省の公表資料で確認してください。
          </p>
          <p>
            記事は一般的な決まりの解説です。自分のケースに当てはまるかは、会社の就業規則・36協定を確認したうえで、労働基準監督署などの相談窓口に相談してください。
          </p>
        </aside>
        <ArticleList articles={careerArticles} />
      </div>
    </>
  );
}
