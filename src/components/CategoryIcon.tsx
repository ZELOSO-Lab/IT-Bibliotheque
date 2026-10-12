import type { CategoryId } from '../types/technology';

/** カテゴリ用の汎用アイコン（自作SVG、線画） */
const paths: Record<CategoryId, string> = {
  programming: 'm8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
  web: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-9 9h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z',
  database:
    'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  cloud: 'M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 8.5a4.8 4.8 0 0 1-.5 9.5H7Z',
  devtools: 'M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.4-.4-2.4 2.6-2.6Z',
  terminal: 'M3 5h18v14H3zM7 10l3 2-3 2M12 15h5',
  pm: 'M4 4h16v16H4zM8 9h8M8 13h8M8 17h5',
};

type Props = { category: CategoryId; className?: string };

export function CategoryIcon({ category, className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[category]} />
    </svg>
  );
}
