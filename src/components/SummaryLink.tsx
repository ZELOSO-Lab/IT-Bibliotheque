import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { guidePath, hasGuide } from '../data/guides';
import { sectionUrl, type Section } from '../data/sections';
import type { Technology } from '../types/technology';
import { ExternalLink } from './ExternalLink';

type Props = {
  technology: Technology;
  /** 指定すると、まとめページ内のその項目へ移動する */
  section?: Section;
  className?: string;
  children: ReactNode;
};

/** 技術まとめへのリンク。ポータル内にまとめ（content/guides）があればそちら、なければ外部の技術まとめページを開く */
export function SummaryLink({ technology, section, className, children }: Props) {
  if (hasGuide(technology.slug)) {
    return (
      <Link to={guidePath(technology.slug, section?.anchor)} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <ExternalLink href={section ? sectionUrl(technology, section) : technology.url} className={className}>
      {children}
    </ExternalLink>
  );
}
