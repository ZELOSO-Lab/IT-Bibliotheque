import type { ReactNode } from 'react';

type Props = {
  href: string;
  className?: string;
  children: ReactNode;
};

/** 外部サイト（技術まとめページ）へのリンク。新しいタブで開くことを支援技術にも伝える */
export function ExternalLink({ href, className, children }: Props) {
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="visually-hidden">（新しいタブで開きます）</span>
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        style={{ display: 'inline', flex: 'none' }}
      >
        <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
      </svg>
    </a>
  );
}
