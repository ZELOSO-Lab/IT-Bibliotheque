import { useEffect } from 'react';
import { headTags } from '../seo/head';
import type { PageMeta } from '../seo/meta';

/** ブラウザ用: 画面遷移時に head を書き換える */
const applyHead = (meta: PageMeta): void => {
  document.title = meta.title;
  for (const tag of headTags(meta)) {
    if (tag.kind === 'meta') {
      const selector = `meta[${tag.attr}="${tag.key}"]`;
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(tag.attr, tag.key);
        document.head.append(el);
      }
      el.content = tag.content;
    } else {
      let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${tag.rel}"]`);
      if (!el) {
        el = document.createElement('link');
        el.rel = tag.rel;
        document.head.append(el);
      }
      el.href = tag.href;
    }
  }
};

/** ページ表示時に title / description / OGP / canonical を更新する */
export const usePageMeta = (meta: PageMeta) => {
  const { title, description, path, ogType, ogImage, noindex } = meta;
  useEffect(() => {
    applyHead({ title, description, path, ogType, ogImage, noindex });
  }, [title, description, path, ogType, ogImage, noindex]);
};
