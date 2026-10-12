import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { site } from '../config/site';
import { technologies } from '../data/technologies';
import { usePageMeta } from '../hooks/usePageMeta';
import { pageMeta } from '../seo/meta';
import { sortedCategories } from '../utils/technologies';
import page from './Page.module.css';

export function About() {
  usePageMeta(pageMeta.about());
  return (
    <>
      <PageHeader title="このサイトについて" />
      <div className="container">
        <div className={page.prose}>
          <p>
            {site.name}
            は、技術者が困ったときにすぐ調べられるよう、技術情報への入口を一か所に集約した技術情報ポータルです。
          </p>
          <h2>サイトの構成</h2>
          <p>
            このサイト自体にはすべての技術情報を掲載せず、技術ごとに独立した「技術まとめページ」へ案内します。
            各技術ページの「技術まとめはこちら」から、基礎・環境構築・コマンド・サンプル・エラー対応・実務Tipsなどの詳細へ移動できます。
          </p>
          <h2>探し方</h2>
          <ul>
            <li>
              <Link to="/search">技術検索</Link>：技術名・別名・キーワード（例: oracle、teraterm、db）で検索
            </li>
            <li>
              <Link to="/categories">カテゴリ</Link>：{sortedCategories.map((c) => c.name).join('、')}から選択
            </li>
            <li>
              <Link to="/technologies">技術一覧</Link>：登録済みの全{technologies.length}技術をカテゴリで絞り込み
            </li>
          </ul>
          <h2>掲載方針</h2>
          <p>実務で使う技術を重視し、初心者にも分かりやすい情報を目指しています。掲載技術は今後も順次追加します。</p>
          <p>
            記載の会社名・製品名は各社の商標または登録商標です。技術アイコンの一部には Simple
            Icons（CC0）を使用しています。
          </p>
        </div>
      </div>
    </>
  );
}
