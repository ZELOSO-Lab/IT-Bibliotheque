import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cheatsheetTool } from '../config/site';

type Props = {
  slug: string;
  className?: string;
  children: ReactNode;
};

/** 同一サイト内のツールのURL。渡すのは技術の slug だけ（データはツール側が同一オリジンのJSONから取得） */
const cheatsheetToolUrl = (toolPath: string, slug: string) =>
  `${import.meta.env.BASE_URL.replace(/\/$/, '')}${toolPath}?tech=${encodeURIComponent(slug)}`;

/** チートシート作成への導線。単体ツールが設定されていればそちらを、なければ内蔵の作成画面を開く */
export function CheatSheetLink({ slug, className, children }: Props) {
  if (cheatsheetTool.path) {
    return (
      <a href={cheatsheetToolUrl(cheatsheetTool.path, slug)} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to={`/technology/${slug}/cheatsheet`} className={className}>
      {children}
    </Link>
  );
}
