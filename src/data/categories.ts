import type { Category, CategoryId } from '../types/technology';

export const categories: Category[] = [
  {
    id: 'programming',
    name: 'Programming',
    label: 'プログラミング言語',
    description: '業務システムからWebまで、主要なプログラミング言語。',
    keywords: ['programming', 'language', 'プログラミング', '言語', 'プログラム'],
    order: 1,
  },
  {
    id: 'web',
    name: 'Web',
    label: 'Web・フレームワーク',
    description: 'HTML、Webフレームワーク、API設計などWeb開発の技術。',
    keywords: ['web', 'framework', 'フレームワーク', 'ウェブ', 'フロントエンド', 'バックエンド'],
    order: 2,
  },
  {
    id: 'database',
    name: 'Database',
    label: 'データベース',
    description: 'RDBMS、デスクトップDB、SQLなどデータベース関連の技術。',
    keywords: ['database', 'db', 'rdb', 'rdbms', 'データベース'],
    order: 3,
  },
  {
    id: 'cloud',
    name: 'Cloud',
    label: 'クラウド',
    description: 'クラウドプラットフォームとインフラ関連の技術。',
    keywords: ['cloud', 'クラウド', 'インフラ', 'infra'],
    order: 4,
  },
  {
    id: 'devtools',
    name: 'Development Tools',
    label: '開発ツール・バージョン管理',
    description: 'エディタ、IDE、バージョン管理システムなど開発ツール。',
    keywords: ['tool', 'tools', 'ide', 'editor', 'vcs', 'ツール', '開発ツール', 'エディタ', 'バージョン管理'],
    order: 5,
  },
  {
    id: 'terminal',
    name: 'Terminal / File Tools',
    label: 'ターミナル・ファイルツール',
    description: 'サーバ接続、ファイル転送、差分比較などの運用ツール。',
    keywords: ['terminal', 'file', 'ssh', 'ターミナル', 'ファイル', '運用', 'コマンド'],
    order: 6,
  },
  {
    id: 'pm',
    name: 'Project Management',
    label: 'プロジェクト管理',
    description: 'タスク・課題管理などプロジェクト管理ツール。',
    keywords: ['project', 'management', 'pm', 'プロジェクト管理', 'タスク管理', 'チケット', '課題管理'],
    order: 7,
  },
];

const categoryMap = new Map(categories.map((c) => [c.id, c]));

export const getCategory = (id: CategoryId): Category => {
  const category = categoryMap.get(id);
  if (!category) throw new Error(`Unknown category: ${id}`);
  return category;
};

export const isCategoryId = (value: string | null | undefined): value is CategoryId =>
  value != null && categoryMap.has(value as CategoryId);
