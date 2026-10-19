import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { guidePath } from '../data/guides';
import type { Section } from '../data/sections';
import type { Technology } from '../types/technology';

type Props = {
  technology: Technology;
  /** 指定すると、まとめページ内のその項目へ移動する */
  section?: Section;
  className?: string;
  children: ReactNode;
};

/** 技術まとめ（ポータル内の /technology/{slug}/guide）へのリンク */
export function SummaryLink({ technology, section, className, children }: Props) {
  return (
    <Link to={guidePath(technology.slug, section?.anchor)} className={className}>
      {children}
    </Link>
  );
}
