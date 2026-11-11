import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { PlaygroundList } from '../components/PlaygroundList';
import { getPlaygroundsByGroup, playgroundGroups, playgroundsCheckedAt } from '../data/playgrounds';
import { usePageMeta } from '../hooks/usePageMeta';
import { pageMeta } from '../seo/meta';
import page from './Page.module.css';
import styles from './Playgrounds.module.css';

export function Playgrounds() {
  usePageMeta(pageMeta.playgrounds());
  return (
    <>
      <PageHeader
        title="コードを試せるサイト"
        lead="手元に環境がなくても、ブラウザだけでコードやSQLを実行できる外部サイトをまとめました。各技術のページにも、その技術を試せるサイトを表示しています。"
      />
      <div className="container">
        {playgroundGroups.map((g) => {
          const items = getPlaygroundsByGroup(g.id);
          if (items.length === 0) return null;
          return (
            <section key={g.id} className={page.sectionTight} aria-labelledby={`pg-${g.id}`}>
              <h2 id={`pg-${g.id}`} className={styles.heading}>
                {g.name}
              </h2>
              <p className={styles.lead}>{g.description}</p>
              <PlaygroundList items={items} />
            </section>
          );
        })}
        <aside className={styles.notes}>
          <h2 className={styles.notesHeading}>ご利用にあたって</h2>
          <ul>
            <li>
              いずれも外部の運営サイトです。料金・登録の要否は
              <time dateTime={playgroundsCheckedAt}>{playgroundsCheckedAt.replaceAll('-', '/')}</time>
              時点の情報で、変更されることがあります。
            </li>
            <li>入力したコードは外部サーバーに送信されます。業務のソースコードや個人情報は貼り付けないでください。</li>
            <li>
              Pro*C・Access・FileMaker など、オンラインで試せない技術もあります。その場合は
              <Link to="/technologies">各技術のページ</Link>の技術まとめを参考に、ローカル環境を用意してください。
            </li>
          </ul>
        </aside>
      </div>
    </>
  );
}
