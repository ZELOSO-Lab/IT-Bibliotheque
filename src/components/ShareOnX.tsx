import { site } from '../config/site';
import { pageUrl } from '../seo/meta';
import { XIcon } from './XIcon';
import styles from './ShareOnX.module.css';

type Props = {
  /** 投稿文に入れるタイトル（サイト名なし） */
  title: string;
  /** サイトルートからのパス（例: /articles/xxx） */
  path: string;
};

/** X の投稿画面（Web Intent）を開くシェアボタン。外部スクリプトは読み込まない */
export function ShareOnX({ title, path }: Props) {
  const params = new URLSearchParams({ text: title, url: pageUrl(path), via: site.x.username });
  return (
    <div className={styles.share}>
      <p className={styles.lead}>役に立ったら、Xでシェアしていただけるとうれしいです</p>
      <a
        href={`https://x.com/intent/post?${params.toString()}`}
        className={styles.button}
        target="_blank"
        rel="noopener noreferrer"
      >
        <XIcon size={16} />
        Xでポスト
        <span className="visually-hidden">（新しいタブで開きます）</span>
      </a>
    </div>
  );
}
