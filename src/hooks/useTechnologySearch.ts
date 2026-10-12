import { useDeferredValue, useMemo } from 'react';
import { technologies } from '../data/technologies';
import { createSearcher } from '../utils/search';

const search = createSearcher(technologies);

/** 入力に追従してリアルタイムに絞り込む */
export const useTechnologySearch = (query: string) => {
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(() => search(deferredQuery), [deferredQuery]);
  return { results, isEmptyQuery: deferredQuery.trim() === '' };
};
