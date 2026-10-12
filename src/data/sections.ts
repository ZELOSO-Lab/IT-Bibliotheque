import type { SectionKey, Technology } from '../types/technology';

export type Section = {
  key: SectionKey;
  label: string;
  description: string;
  /** 技術まとめページ内のアンカー */
  anchor: string;
};

/** 技術詳細ページに並べる項目。順番・文言はここで変更する。 */
export const sections: Section[] = [
  { key: 'basics', label: '基礎', description: '概要・基本文法・用語', anchor: 'basics' },
  { key: 'setup', label: '環境構築', description: 'インストール・初期設定', anchor: 'setup' },
  { key: 'commands', label: 'コマンド', description: 'よく使うコマンド・操作', anchor: 'commands' },
  { key: 'samples', label: 'サンプル', description: 'サンプルコード・設定例', anchor: 'samples' },
  { key: 'errors', label: 'エラー対応', description: 'エラーメッセージと対処法', anchor: 'errors' },
  { key: 'tips', label: '実務Tips', description: '現場で役立つノウハウ', anchor: 'tips' },
  { key: 'links', label: '関連リンク', description: '公式ドキュメント・参考資料', anchor: 'links' },
];

export const sectionUrl = (technology: Technology, section: Section): string =>
  technology.sectionUrls?.[section.key] ?? `${technology.url}#${section.anchor}`;
