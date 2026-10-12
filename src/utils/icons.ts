import {
  siC,
  siCakephp,
  siClaris,
  siGit,
  siGithub,
  siGitlab,
  siHtml5,
  siJavascript,
  siMariadb,
  siMysql,
  siOpenjdk,
  siPhp,
  siPython,
  siRedmine,
  siRuby,
  siSpring,
  siSqlite,
  siSubversion,
  type SimpleIcon,
} from 'simple-icons';

/**
 * アイコン登録（Simple Icons / CC0）。
 * 商標上の理由で Simple Icons に収録されていない技術は登録せず、汎用アイコン（頭文字）で表示する。
 * 必要なアイコンだけ個別 import してバンドルサイズを抑えている。
 */
const registry: Record<string, SimpleIcon> = {
  c: siC,
  cakephp: siCakephp,
  filemaker: siClaris,
  git: siGit,
  github: siGithub,
  gitlab: siGitlab,
  html: siHtml5,
  java: siOpenjdk,
  javascript: siJavascript,
  mariadb: siMariadb,
  mysql: siMysql,
  php: siPhp,
  python: siPython,
  redmine: siRedmine,
  ruby: siRuby,
  spring: siSpring,
  sqlite: siSqlite,
  svn: siSubversion,
};

export const getIcon = (key: string | undefined): SimpleIcon | undefined => (key ? registry[key] : undefined);

/** 汎用アイコン用の頭文字（例: "Tera Term" → "TT", "WinSCP" → "WS", "AWS" → "AWS"） */
export const monogram = (name: string): string => {
  const words = name
    .replace(/^Microsoft\s+/, '')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length > 1)
    return words
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  const word = words[0] ?? '?';
  if (word.length <= 3) return word;
  const capitals = word.match(/[A-Z]/g) ?? [];
  return capitals.length >= 2 ? capitals.slice(0, 2).join('') : word.slice(0, 2);
};
