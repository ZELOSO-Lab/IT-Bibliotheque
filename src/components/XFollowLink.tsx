import { site } from '../config/site';
import { XIcon } from './XIcon';
import styles from './XFollowLink.module.css';

type Props = {
  /** true のときアカウント名（@ZELOSOLab）も表示する */
  showName?: boolean;
  className?: string;
};

/** 公式Xアカウントへのフォローリンク */
export function XFollowLink({ showName = false, className }: Props) {
  return (
    <a
      href={site.x.url}
      className={`${styles.link} ${className ?? ''}`}
      target="_blank"
      rel="noopener noreferrer me"
      aria-label={showName ? undefined : `${site.name} の X（@${site.x.username}）を新しいタブで開く`}
    >
      <XIcon className={styles.icon} />
      {showName && (
        <>
          <span>@{site.x.username}</span>
          <span className="visually-hidden">（X・新しいタブで開きます）</span>
        </>
      )}
    </a>
  );
}
