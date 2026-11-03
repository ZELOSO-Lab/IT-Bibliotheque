import type { Playground, PlaygroundGroup } from '../types/playground';

/**
 * コードを試せる外部サイト・ローカル環境。
 * - サイトを追加するときはこの配列に1件追加する。/playgrounds と各技術ページに自動で反映される
 * - technologies には data/technologies.ts の slug を書く（その技術ページに表示される）
 * - 稼働状況・無料可否は checkedAt の日付時点で確認したもの
 */
export const playgroundGroups: PlaygroundGroup[] = [
  {
    id: 'general',
    name: 'オンラインコンパイラ（多言語）',
    description: 'ブラウザだけで C・Java・Python などを実行できます。インストール不要。',
  },
  {
    id: 'dotnet',
    name: 'C# / VB.NET',
    description: '.NET 系の言語を実行・コンパイル結果を確認できます。',
  },
  {
    id: 'web',
    name: 'HTML / CSS / JavaScript',
    description: '画面の表示結果を見ながらフロントエンドのコードを試せます。',
  },
  {
    id: 'sql',
    name: 'SQL・データベース',
    description: 'テーブル作成からSELECTまで、DBをインストールせずに試せます。',
  },
  {
    id: 'tools',
    name: 'シェル・Git・正規表現',
    description: 'コマンドや正規表現の動きを、手元を汚さずに確認できます。',
  },
  {
    id: 'local',
    name: 'ローカル環境（インストールして使う）',
    description: '本格的に開発するなら、自分のPCに入れて使う無料の開発環境です。',
  },
];

export const playgrounds: Playground[] = [
  // ── オンラインコンパイラ（多言語） ────────────────
  {
    id: 'paiza-io',
    name: 'paiza.io',
    url: 'https://paiza.io/ja',
    group: 'general',
    description: '日本語のオンライン実行環境。VB や MySQL、Bash まで1つの画面で試せます。',
    technologies: ['c', 'csharp', 'vb', 'java', 'javascript', 'php', 'ruby', 'python', 'sh', 'mysql', 'sql'],
    japanese: true,
    pricing: '無料（コードの保存は無料登録）',
  },
  {
    id: 'mycompiler',
    name: 'myCompiler',
    url: 'https://www.mycompiler.io/ja',
    group: 'general',
    description: '日本語UIのオンラインコンパイラ。C・Java・Python・PHP・Bash・MySQL などに対応。',
    technologies: ['c', 'csharp', 'java', 'javascript', 'php', 'ruby', 'python', 'sh', 'mysql', 'sql'],
    japanese: true,
    pricing: '無料（コードの保存は無料登録）',
  },
  {
    id: 'wandbox',
    name: 'Wandbox',
    url: 'https://wandbox.org/',
    group: 'general',
    description: 'コンパイラのバージョンやオプションを細かく選べます。実行結果を固定URLで共有できます。',
    technologies: ['c', 'csharp', 'java', 'javascript', 'php', 'ruby', 'python', 'sh'],
    pricing: '無料・登録不要',
  },
  {
    id: 'onecompiler',
    name: 'OneCompiler',
    url: 'https://onecompiler.com/',
    group: 'general',
    description: '110以上の言語に対応。Oracle（PL/SQL）や MySQL も実行できます。',
    technologies: ['c', 'java', 'javascript', 'php', 'ruby', 'python', 'mysql', 'oracle-database', 'sql'],
    pricing: '無料（有料プランあり）',
  },
  {
    id: 'compiler-explorer',
    name: 'Compiler Explorer',
    url: 'https://godbolt.org/',
    group: 'general',
    description: 'C のコードがどんなアセンブリになるかを並べて表示します。最適化オプションの違いの確認に。',
    technologies: ['c'],
    pricing: '無料・登録不要',
  },
  {
    id: 'python-tutor',
    name: 'Python Tutor',
    url: 'https://pythontutor.com/',
    group: 'general',
    description: '1行ずつ実行し、変数・ポインタ・スタックの様子を図で表示します。C のポインタ理解に最適。',
    technologies: ['c', 'java', 'javascript', 'python'],
    pricing: '無料・登録不要',
  },

  // ── C# / VB.NET ─────────────────────────────
  {
    id: 'dotnet-fiddle',
    name: '.NET Fiddle',
    url: 'https://dotnetfiddle.net/',
    group: 'dotnet',
    description: 'C#・VB.NET をブラウザで実行できます。VB.NET を手軽に試せる数少ないサイトです。',
    technologies: ['csharp', 'vb'],
    pricing: '無料・登録不要',
  },
  {
    id: 'sharplab',
    name: 'SharpLab',
    url: 'https://sharplab.io/',
    group: 'dotnet',
    description: 'C#・VB のコードがどんな IL や C# に変換されるかを確認できます。',
    technologies: ['csharp', 'vb'],
    pricing: '無料・登録不要',
  },

  // ── HTML / CSS / JavaScript ────────────────────
  {
    id: 'jsfiddle',
    name: 'JSFiddle',
    url: 'https://jsfiddle.net/',
    group: 'web',
    description: 'HTML・CSS・JavaScript を書いて、すぐ下で表示結果を確認できます。',
    technologies: ['html', 'javascript'],
    pricing: '無料（広告あり・有料プランあり）',
  },
  {
    id: 'codepen',
    name: 'CodePen',
    url: 'https://codepen.io/',
    group: 'web',
    description: 'HTML・CSS・JavaScript の定番プレイグラウンド。他の人の作品も参考にできます。',
    technologies: ['html', 'javascript'],
    pricing: '無料（有料プランあり）',
  },

  // ── SQL・データベース ───────────────────────────
  {
    id: 'db-fiddle-uk',
    name: 'db<>fiddle',
    url: 'https://dbfiddle.uk/',
    group: 'sql',
    description: 'Oracle・SQL Server・MySQL・MariaDB・SQLite・PostgreSQL をバージョン指定で実行できます。',
    technologies: ['oracle-database', 'sql-server', 'mysql', 'mariadb', 'sqlite', 'sql'],
    pricing: '無料・登録不要',
  },
  {
    id: 'oracle-freesql',
    name: 'Oracle FreeSQL',
    url: 'https://freesql.com/',
    group: 'sql',
    description: 'Oracle 公式のブラウザ版SQL実行環境（旧 Live SQL の後継）。最新の Oracle Database で試せます。',
    technologies: ['oracle-database', 'sql'],
    pricing: '無料（テーブル作成などは Oracle アカウントで無料登録）',
  },
  {
    id: 'db-fiddle',
    name: 'DB Fiddle',
    url: 'https://www.db-fiddle.com/',
    group: 'sql',
    description: 'スキーマとクエリを分けて書ける SQL プレイグラウンド。MySQL の確認に。',
    technologies: ['mysql', 'sql'],
    pricing: '無料・登録不要',
  },
  {
    id: '3v4l',
    name: '3v4l.org',
    url: 'https://3v4l.org/',
    group: 'general',
    description: '同じ PHP コードを多数のバージョンで一斉に実行し、結果の違いを比較できます。',
    technologies: ['php', 'cakephp'],
    pricing: '無料・登録不要',
  },
  {
    id: 'tryruby',
    name: 'TryRuby',
    url: 'https://try.ruby-lang.org/',
    group: 'general',
    description: 'Ruby 公式の入門サイト。説明を読みながらブラウザで Ruby を実行できます。',
    technologies: ['ruby'],
    japanese: true,
    pricing: '無料・登録不要',
  },

  // ── シェル・Git・正規表現 ───────────────────────
  {
    id: 'shellcheck',
    name: 'ShellCheck',
    url: 'https://www.shellcheck.net/',
    group: 'tools',
    description: 'シェルスクリプトを貼り付けると、クォート漏れなどのバグを指摘してくれます。',
    technologies: ['sh'],
    pricing: '無料・登録不要（オープンソース）',
  },
  {
    id: 'learn-git-branching',
    name: 'Learn Git Branching',
    url: 'https://learngitbranching.js.org/?locale=ja',
    group: 'tools',
    description: 'Git のコミット・ブランチ・マージの動きを図で見ながらコマンドを練習できます。',
    technologies: ['git', 'github', 'gitlab'],
    japanese: true,
    pricing: '無料・登録不要（オープンソース）',
  },
  {
    id: 'regex101',
    name: 'regex101',
    url: 'https://regex101.com/',
    group: 'tools',
    description: '正規表現のマッチ結果をリアルタイムで確認できます。サクラエディタの置換前の確認に。',
    technologies: ['sakura-editor', 'javascript', 'python', 'php'],
    pricing: '無料（有料プランあり）',
  },

  // ── ローカル環境 ─────────────────────────────
  {
    id: 'visual-studio-community',
    name: 'Visual Studio Community',
    url: 'https://visualstudio.microsoft.com/ja/vs/community/',
    group: 'local',
    description: 'Windows 向けの統合開発環境。C#・VB.NET・C/C++ の開発とデバッグが一通りできます。',
    technologies: ['visual-studio', 'csharp', 'vb', 'c'],
    japanese: true,
    pricing: '無料（個人・学習・小規模組織向け。一定規模以上の企業の業務利用は有償版が必要）',
  },
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    url: 'https://code.visualstudio.com/',
    group: 'local',
    description: '軽量なコードエディタ。拡張機能を入れれば多くの言語の実行・デバッグができます。',
    technologies: ['vscode'],
    japanese: true,
    pricing: '無料',
  },
];

/** 掲載情報を確認した日付 */
export const playgroundsCheckedAt = '2026-11-03';

/** 技術ページに表示するサイト（オンライン → ローカルの順） */
export const getPlaygroundsByTechnology = (slug: string): Playground[] =>
  playgrounds
    .filter((p) => p.technologies.includes(slug))
    .sort((a, b) => Number(a.group === 'local') - Number(b.group === 'local'));

export const getPlaygroundsByGroup = (group: PlaygroundGroup['id']): Playground[] =>
  playgrounds.filter((p) => p.group === group);
