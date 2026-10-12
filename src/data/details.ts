import type { TechnologyDetail } from '../types/technology';

/**
 * 技術ページの補足情報（slug をキーに管理）。
 * 未登録の技術は該当セクションを表示しないため、段階的に追加できる。
 */
export const technologyDetails: Record<string, TechnologyDetail> = {
  c: {
    officialUrl: 'https://en.cppreference.com/w/c',
    useCases: ['組込み開発', 'OS・ドライバ', 'ミドルウェア', '性能重視の処理'],
    quickRefs: [
      { title: 'コンパイルと実行', code: 'gcc -Wall -O2 -o app main.c\n./app' },
      {
        title: 'Hello, World',
        code: '#include <stdio.h>\n\nint main(void) {\n    printf("Hello, World\\n");\n    return 0;\n}',
      },
      {
        title: 'メモリ確保と解放',
        code: 'int *p = malloc(sizeof(int) * n);\nif (p == NULL) { /* エラー処理 */ }\nfree(p);',
      },
    ],
  },
  csharp: {
    officialUrl: 'https://learn.microsoft.com/ja-jp/dotnet/csharp/',
    useCases: ['業務アプリ', 'Windowsアプリ', 'Web API（ASP.NET Core）', 'Unity'],
    quickRefs: [
      { title: 'プロジェクト作成と実行', code: 'dotnet new console -n MyApp\ncd MyApp\ndotnet run' },
      {
        title: 'LINQで絞り込み',
        code: 'var adults = users\n    .Where(u => u.Age >= 20)\n    .OrderBy(u => u.Name)\n    .ToList();',
      },
      { title: '非同期処理', code: 'var json = await httpClient.GetStringAsync(url);' },
    ],
  },
  java: {
    officialUrl: 'https://docs.oracle.com/javase/jp/',
    useCases: ['業務システム', 'Webアプリケーション', 'バッチ処理', 'Androidアプリ'],
    quickRefs: [
      { title: 'コンパイルと実行', code: 'javac Main.java\njava Main' },
      { title: 'バージョン確認', code: 'java -version\njavac -version' },
      {
        title: 'Stream APIで絞り込み',
        code: 'List<String> names = users.stream()\n    .filter(u -> u.getAge() >= 20)\n    .map(User::getName)\n    .toList();',
      },
      { title: 'jarの実行', code: 'java -jar app.jar' },
    ],
  },
  javascript: {
    officialUrl: 'https://developer.mozilla.org/ja/docs/Web/JavaScript',
    useCases: ['Webフロントエンド', 'Node.jsサーバ', 'ブラウザ操作の自動化', 'SPA開発'],
    quickRefs: [
      {
        title: 'DOM要素の取得とイベント',
        code: "const button = document.querySelector('#submit');\nbutton.addEventListener('click', () => { /* 処理 */ });",
      },
      {
        title: 'fetchでAPI呼び出し',
        code: "const res = await fetch('/api/users');\nif (!res.ok) throw new Error(res.statusText);\nconst users = await res.json();",
      },
      {
        title: '配列の変換・絞り込み',
        code: 'const names = users\n  .filter((u) => u.active)\n  .map((u) => u.name);',
      },
    ],
  },
  php: {
    officialUrl: 'https://www.php.net/manual/ja/',
    useCases: ['Webアプリケーション', 'CMS（WordPress等）', '業務システム', 'API'],
    quickRefs: [
      { title: 'バージョン・設定確認', code: 'php -v\nphp --ini' },
      { title: '組込みサーバで起動', code: 'php -S localhost:8000' },
      {
        title: 'PDOでSELECT',
        code: "$stmt = $pdo->prepare('SELECT * FROM users WHERE id = :id');\n$stmt->execute([':id' => $id]);\n$user = $stmt->fetch(PDO::FETCH_ASSOC);",
      },
    ],
  },
  vb: {
    officialUrl: 'https://learn.microsoft.com/ja-jp/dotnet/visual-basic/',
    useCases: ['業務アプリ', 'Excel / Access のVBAマクロ', 'Windowsフォーム', '既存システム保守'],
    quickRefs: [
      { title: 'VBA: セルへの書き込み', code: 'Worksheets("Sheet1").Range("A1").Value = "Hello"' },
      { title: 'VBA: 最終行の取得', code: 'Dim lastRow As Long\nlastRow = Cells(Rows.Count, 1).End(xlUp).Row' },
      { title: 'VB.NET: ループ', code: 'For i As Integer = 1 To 10\n    Console.WriteLine(i)\nNext' },
    ],
  },
  ruby: {
    officialUrl: 'https://www.ruby-lang.org/ja/documentation/',
    useCases: ['Webアプリ（Ruby on Rails）', 'スクリプト・自動化', 'API', 'スタートアップのプロダクト開発'],
    quickRefs: [
      { title: 'gemのインストール', code: 'gem install rails\nbundle install' },
      { title: 'Railsアプリ作成と起動', code: 'rails new myapp\ncd myapp\nbin/rails server' },
      { title: '配列の変換・絞り込み', code: 'names = users.select { |u| u.active }.map(&:name)' },
    ],
  },
  python: {
    officialUrl: 'https://docs.python.org/ja/3/',
    useCases: ['業務自動化・スクリプト', 'データ分析', 'Webアプリ・API', 'AI・機械学習'],
    quickRefs: [
      {
        title: '仮想環境の作成',
        code: 'python -m venv .venv\nsource .venv/bin/activate   # Windows: .venv\\Scripts\\activate',
      },
      {
        title: 'パッケージ管理',
        code: 'pip install requests\npip freeze > requirements.txt\npip install -r requirements.txt',
      },
      {
        title: 'ファイル読み込み',
        code: "with open('data.txt', encoding='utf-8') as f:\n    for line in f:\n        print(line.rstrip())",
      },
    ],
  },
  html: {
    officialUrl: 'https://developer.mozilla.org/ja/docs/Web/HTML',
    useCases: ['Webページ制作', 'メールテンプレート', 'Webアプリの画面', 'SEO・アクセシビリティ対応'],
    quickRefs: [
      {
        title: '基本テンプレート',
        code: '<!doctype html>\n<html lang="ja">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>ページタイトル</title>\n</head>\n<body>\n</body>\n</html>',
      },
      {
        title: 'フォーム',
        code: '<label for="email">メール</label>\n<input id="email" type="email" name="email" required>',
      },
      { title: 'セマンティックな構造', code: '<header>…</header>\n<nav>…</nav>\n<main>…</main>\n<footer>…</footer>' },
    ],
  },
  cakephp: {
    officialUrl: 'https://book.cakephp.org/5/ja/',
    useCases: ['業務Webシステム', '管理画面', 'CRUDアプリ', 'API'],
    quickRefs: [
      { title: 'プロジェクト作成', code: 'composer create-project --prefer-dist cakephp/app:~5.0 myapp' },
      { title: '開発サーバ起動', code: 'bin/cake server' },
      { title: 'Bakeでコード生成', code: 'bin/cake bake all Users' },
    ],
  },
  spring: {
    officialUrl: 'https://spring.io/projects/spring-framework',
    useCases: ['業務Webシステム', 'REST API', 'マイクロサービス', 'バッチ（Spring Batch）'],
    quickRefs: [
      { title: 'Spring Boot起動（Maven）', code: './mvnw spring-boot:run' },
      { title: 'Spring Boot起動（Gradle）', code: './gradlew bootRun' },
      {
        title: 'RESTコントローラ',
        code: '@RestController\n@RequestMapping("/api/users")\npublic class UserController {\n    @GetMapping("/{id}")\n    public User get(@PathVariable Long id) { ... }\n}',
      },
    ],
  },
  api: {
    officialUrl: 'https://developer.mozilla.org/ja/docs/Web/HTTP',
    useCases: ['システム間連携', 'Web / スマホアプリのバックエンド', '外部サービス連携', '自動化'],
    quickRefs: [
      { title: 'curlでGET', code: 'curl -s https://api.example.com/users/1' },
      {
        title: 'curlでJSONをPOST',
        code: 'curl -X POST https://api.example.com/users \\\n  -H "Content-Type: application/json" \\\n  -d \'{"name":"Taro"}\'',
      },
      {
        title: '主なHTTPステータス',
        code: '200 OK / 201 Created / 204 No Content\n400 Bad Request / 401 Unauthorized / 403 Forbidden / 404 Not Found\n500 Internal Server Error / 503 Service Unavailable',
      },
    ],
  },
  'oracle-database': {
    officialUrl: 'https://docs.oracle.com/en/database/',
    useCases: ['基幹システム', '大規模業務データ', 'PL/SQLによるバッチ', '高可用性構成'],
    quickRefs: [
      { title: 'SQL*Plusで接続', code: 'sqlplus user/password@//host:1521/service_name' },
      { title: 'テーブル一覧', code: 'SELECT table_name FROM user_tables ORDER BY table_name;' },
      { title: '先頭N件の取得', code: 'SELECT * FROM orders ORDER BY created_at DESC\nFETCH FIRST 10 ROWS ONLY;' },
      { title: 'エラー番号の意味を調べる', code: 'oerr ora 00942' },
    ],
  },
  mysql: {
    officialUrl: 'https://dev.mysql.com/doc/',
    useCases: ['Webサービス', 'CMS', '業務システム', '分析用データベース'],
    quickRefs: [
      { title: '接続', code: 'mysql -u root -p -h localhost mydb' },
      { title: 'DB・テーブル一覧', code: 'SHOW DATABASES;\nSHOW TABLES;\nDESCRIBE users;' },
      {
        title: 'バックアップとリストア',
        code: 'mysqldump -u root -p mydb > backup.sql\nmysql -u root -p mydb < backup.sql',
      },
    ],
  },
  mariadb: {
    officialUrl: 'https://mariadb.com/kb/en/',
    useCases: ['MySQLの代替', 'Webサービス', 'Linuxディストリ標準のDB', '業務システム'],
    quickRefs: [
      { title: '接続', code: 'mariadb -u root -p mydb' },
      {
        title: 'ユーザー作成と権限付与',
        code: "CREATE USER 'app'@'%' IDENTIFIED BY 'password';\nGRANT ALL ON mydb.* TO 'app'@'%';",
      },
      { title: 'バックアップ', code: 'mariadb-dump -u root -p mydb > backup.sql' },
    ],
  },
  sqlite: {
    officialUrl: 'https://www.sqlite.org/docs.html',
    useCases: ['スマホ・デスクトップアプリ', 'テスト用DB', '小規模Webアプリ', 'ローカルデータ保存'],
    quickRefs: [
      { title: 'DBを開く', code: 'sqlite3 app.db' },
      { title: 'テーブル一覧・定義', code: '.tables\n.schema users' },
      { title: 'CSVを取り込む', code: '.mode csv\n.import data.csv users' },
    ],
  },
  'microsoft-access': {
    officialUrl: 'https://support.microsoft.com/ja-jp/access',
    useCases: ['部署内の業務ツール', '小規模データ管理', '帳票作成', 'Excelからの移行'],
    quickRefs: [
      { title: '選択クエリ', code: 'SELECT 顧客名, 売上 FROM 売上表 WHERE 売上 >= 10000;' },
      { title: 'VBA: クエリ実行', code: 'CurrentDb.Execute "DELETE FROM 一時表", dbFailOnError' },
      { title: 'VBA: フォームを開く', code: 'DoCmd.OpenForm "F_顧客一覧"' },
    ],
  },
  filemaker: {
    officialUrl: 'https://help.claris.com/',
    useCases: ['業務アプリの内製', '顧客・案件管理', 'iPad業務アプリ', '小規模チームのデータベース'],
    quickRefs: [
      { title: '計算式: 条件分岐', code: 'If ( 売上 >= 10000 ; "A" ; "B" )' },
      { title: '計算式: 文字列結合', code: '姓 & " " & 名' },
      { title: 'スクリプト: 検索', code: 'レコードを検索 [ 検索条件を指定 ; 状態: "有効" ]' },
    ],
  },
  'sql-server': {
    officialUrl: 'https://learn.microsoft.com/ja-jp/sql/sql-server/',
    useCases: ['業務システム', '.NETアプリのDB', 'BI・レポート', 'Azure SQLへの移行'],
    quickRefs: [
      { title: 'sqlcmdで接続', code: 'sqlcmd -S localhost -U sa -d mydb' },
      { title: '先頭N件の取得', code: 'SELECT TOP 10 * FROM orders ORDER BY created_at DESC;' },
      { title: 'バックアップ', code: "BACKUP DATABASE mydb TO DISK = 'C:\\backup\\mydb.bak';" },
    ],
  },
  sql: {
    useCases: ['データ抽出', '集計・レポート', 'データ移行', 'パフォーマンス調査'],
    quickRefs: [
      { title: 'JOIN', code: 'SELECT o.id, c.name\nFROM orders o\nINNER JOIN customers c ON c.id = o.customer_id;' },
      {
        title: 'グループ集計',
        code: 'SELECT category, COUNT(*), SUM(amount)\nFROM sales\nGROUP BY category\nHAVING SUM(amount) > 10000;',
      },
      {
        title: '更新前に件数確認',
        code: "SELECT COUNT(*) FROM users WHERE status = 'old';\nUPDATE users SET status = 'archived' WHERE status = 'old';",
      },
    ],
  },
  aws: {
    officialUrl: 'https://docs.aws.amazon.com/ja_jp/',
    useCases: ['Webサービス基盤', 'ファイル保存（S3）', 'データベース（RDS）', 'サーバレス（Lambda）'],
    quickRefs: [
      { title: 'CLIの初期設定・確認', code: 'aws configure\naws sts get-caller-identity' },
      {
        title: 'S3へのアップロード',
        code: 'aws s3 cp ./file.txt s3://my-bucket/path/\naws s3 sync ./dist s3://my-bucket/',
      },
      {
        title: 'EC2インスタンス一覧',
        code: 'aws ec2 describe-instances \\\n  --query "Reservations[].Instances[].[InstanceId,State.Name]" --output table',
      },
    ],
  },
  vscode: {
    officialUrl: 'https://code.visualstudio.com/docs',
    useCases: ['コード編集', 'デバッグ', 'リモート開発（SSH / コンテナ）', 'Git操作'],
    quickRefs: [
      { title: 'フォルダを開く', code: 'code .' },
      {
        title: 'よく使うショートカット（Windows）',
        code: 'Ctrl+P        ファイルを開く\nCtrl+Shift+P  コマンドパレット\nCtrl+Shift+F  全体検索\nAlt+Shift+F   フォーマット',
      },
      { title: '拡張機能のインストール', code: 'code --install-extension esbenp.prettier-vscode' },
    ],
  },
  'visual-studio': {
    officialUrl: 'https://learn.microsoft.com/ja-jp/visualstudio/',
    useCases: ['C# / .NET開発', 'Windowsアプリ', 'C++開発', 'デバッグ・プロファイリング'],
    quickRefs: [
      {
        title: 'よく使うショートカット',
        code: 'F5            デバッグ開始\nCtrl+F5       デバッグなしで実行\nF9            ブレークポイント\nCtrl+Shift+B  ビルド',
      },
      { title: 'NuGetパッケージ追加（PMC）', code: 'Install-Package Newtonsoft.Json' },
      { title: 'コマンドラインでビルド', code: 'msbuild MySolution.sln /p:Configuration=Release' },
    ],
  },
  svn: {
    officialUrl: 'https://subversion.apache.org/docs/',
    useCases: ['ソース管理', '既存プロジェクトの保守', 'ドキュメント管理', 'Gitへの移行前提の運用'],
    quickRefs: [
      { title: 'チェックアウトと更新', code: 'svn checkout https://svn.example.com/repo/trunk work\nsvn update' },
      { title: '状態確認とコミット', code: 'svn status\nsvn diff\nsvn commit -m "メッセージ"' },
      { title: '変更の取り消し', code: 'svn revert file.txt' },
    ],
  },
  git: {
    officialUrl: 'https://git-scm.com/book/ja/v2',
    useCases: ['ソース管理', 'チーム開発', 'ブランチ運用', '変更履歴の調査'],
    quickRefs: [
      { title: '基本の流れ', code: 'git status\ngit add .\ngit commit -m "メッセージ"\ngit push origin main' },
      { title: 'ブランチ作成と切り替え', code: 'git switch -c feature/login\ngit switch main' },
      { title: '直前のコミットを修正', code: 'git commit --amend' },
      { title: '作業中の変更を退避', code: 'git stash\ngit stash pop' },
    ],
  },
  gitlab: {
    officialUrl: 'https://docs.gitlab.com/',
    useCases: ['リポジトリ管理', 'マージリクエスト', 'CI/CD', 'セルフホスト運用'],
    quickRefs: [
      {
        title: '.gitlab-ci.yml の最小例',
        code: 'stages: [test]\n\ntest:\n  stage: test\n  image: node:22\n  script:\n    - npm ci\n    - npm test',
      },
      { title: 'リモート追加', code: 'git remote add origin git@gitlab.com:group/project.git' },
      { title: 'MRを作りながらpush', code: 'git push -o merge_request.create origin feature/login' },
    ],
  },
  github: {
    officialUrl: 'https://docs.github.com/ja',
    useCases: ['リポジトリ管理', 'Pull Requestレビュー', 'GitHub Actions（CI/CD）', 'OSS公開'],
    quickRefs: [
      { title: 'リポジトリのクローン', code: 'git clone https://github.com/owner/repo.git' },
      { title: 'GitHub CLIでPR作成', code: 'gh pr create --title "タイトル" --body "説明"' },
      {
        title: 'Actionsの最小例',
        code: 'on: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm ci && npm test',
      },
    ],
  },
  'tera-term': {
    officialUrl: 'https://teratermproject.github.io/',
    useCases: ['サーバへのSSH接続', 'シリアル接続', '作業ログの取得', 'マクロによる自動化'],
    quickRefs: [
      { title: 'コマンドラインで接続', code: 'ttermpro.exe host.example.com:22 /ssh2 /auth=password /user=admin' },
      {
        title: 'マクロ（TTL）で接続',
        code: "connect 'host.example.com:22 /ssh2 /auth=password /user=admin /ask4passwd'\nwait '$'\nsendln 'ls -l'",
      },
      { title: 'ログ取得', code: 'ファイル → ログ → 保存先を指定して開始\n（設定で自動ログ取得も可能）' },
    ],
  },
  winscp: {
    officialUrl: 'https://winscp.net/eng/docs/start',
    useCases: ['サーバへのファイル転送', 'ディレクトリ同期', '転送の自動化', '設定ファイルの編集'],
    quickRefs: [
      {
        title: 'スクリプトで転送',
        code: 'open sftp://user@host.example.com/\nput C:\\work\\app.zip /home/user/\nexit',
      },
      { title: 'スクリプトの実行', code: 'winscp.com /script=upload.txt /log=winscp.log' },
      { title: 'ディレクトリ同期', code: 'synchronize remote C:\\work\\dist /var/www/html' },
    ],
  },
  winmerge: {
    officialUrl: 'https://winmerge.org/',
    useCases: ['ソースの差分確認', 'フォルダ比較', '設定ファイルの比較', 'リリース前チェック'],
    quickRefs: [
      { title: 'コマンドラインで比較', code: 'WinMergeU.exe C:\\old\\file.txt C:\\new\\file.txt' },
      { title: 'フォルダを再帰比較', code: 'WinMergeU.exe /r C:\\old C:\\new' },
      {
        title: 'よく使うショートカット',
        code: 'Alt+↓ / Alt+↑  次 / 前の差分\nAlt+→         右へコピー\nAlt+←         左へコピー',
      },
    ],
  },
  tree: {
    officialUrl: 'https://learn.microsoft.com/ja-jp/windows-server/administration/windows-commands/tree',
    useCases: ['ディレクトリ構成の確認', '資料用の構成図作成', '納品物の確認', 'README作成'],
    quickRefs: [
      { title: 'Windows: ファイルも表示', code: 'tree /F' },
      { title: 'Windows: テキストに出力', code: 'tree /F /A > tree.txt' },
      { title: 'Linux: 深さ指定・除外', code: "tree -L 2 -I 'node_modules|dist'" },
    ],
  },
  redmine: {
    officialUrl: 'https://www.redmine.org/projects/redmine/wiki/Guide',
    useCases: ['課題・バグ管理', '進捗管理（ガントチャート）', 'Wiki', 'SVN / Git連携'],
    quickRefs: [
      {
        title: 'コミットからチケット参照',
        code: 'git commit -m "ログイン画面を修正 refs #123"\ngit commit -m "不具合を修正 fixes #123"',
      },
      {
        title: 'REST APIでチケット取得',
        code: 'curl -H "X-Redmine-API-Key: <APIキー>" \\\n  https://redmine.example.com/issues.json?project_id=1',
      },
      { title: 'Wiki記法（Textile）', code: 'h2. 見出し\n* 箇条書き\n<pre>コード</pre>' },
    ],
  },
  backlog: {
    officialUrl: 'https://support-ja.backlog.com/hc/ja',
    useCases: ['タスク・課題管理', 'ガントチャート', 'Wiki・ファイル共有', 'Git / SVN連携'],
    quickRefs: [
      { title: 'コミットから課題参照', code: 'git commit -m "PROJ-123 ログイン画面を修正"' },
      {
        title: 'APIで課題一覧取得',
        code: 'curl "https://example.backlog.jp/api/v2/issues?apiKey=<APIキー>&projectId[]=1"',
      },
      { title: 'Wiki記法（Markdown）', code: '## 見出し\n- 箇条書き\n```\nコード\n```' },
    ],
  },
};
