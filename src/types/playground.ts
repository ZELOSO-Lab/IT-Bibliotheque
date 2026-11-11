export type PlaygroundGroupId = 'general' | 'dotnet' | 'web' | 'sql' | 'tools' | 'local';

export type PlaygroundGroup = {
  id: PlaygroundGroupId;
  name: string;
  description: string;
};

/** コードを試せる外部サイト、またはローカル開発環境 */
export type Playground = {
  id: string;
  name: string;
  url: string;
  group: PlaygroundGroupId;
  /** 何ができるかを1〜2文で */
  description: string;
  /** 対応する技術の slug（data/technologies.ts）。その技術ページにも表示される */
  technologies: string[];
  /** 日本語UIあり */
  japanese?: boolean;
  /** 料金・登録の要否 */
  pricing: string;
};
