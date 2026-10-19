---
title: VS Code 技術まとめ
slug: vscode
excerpt: Visual Studio Code（VS Code）の基本概念とインストール、よく使うショートカットとCLI、settings.json・launch.json・tasks.jsonの設定例、よくあるトラブルと対処、チーム開発で効く実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# VS Code 技術まとめ

## 基礎

Visual Studio Code（VS Code）は、Microsoft が提供する無料・軽量のコードエディタです。Windows・macOS・Linux で動き、**拡張機能を入れることで多くの言語・ツールに対応**します。Git 操作、デバッグ、ターミナル、リモート開発（SSH・コンテナ・WSL）までエディタ内で完結できるのが特徴です。

名前は似ていますが、統合開発環境（IDE）の **Visual Studio とは別の製品**です。C# の大規模な業務アプリや C++ の Windows ネイティブ開発は Visual Studio、それ以外の言語や軽い編集・スクリプト・インフラ定義は VS Code、と使い分ける現場が多いです。

### 主な用途

- コード編集（JavaScript / TypeScript / Python / Go / Java / SQL / Markdown など）
- デバッグ（ブレークポイント・ステップ実行・変数確認）
- リモート開発（SSH 先のサーバー・コンテナ・WSL のファイルを直接編集）
- Git 操作（差分確認・ステージング・コミット・ブランチ切り替え）

### まず押さえる用語

| 用語 | 意味 | 現場での注意点 |
| --- | --- | --- |
| ワークスペース | 開いているフォルダ（複数フォルダをまとめた `.code-workspace` もある） | 設定・デバッグ構成はワークスペース単位で効く。**ファイル単体ではなくフォルダを開く**のが基本 |
| コマンドパレット | すべての機能を名前で呼び出せる入力欄（`Ctrl+Shift+P`） | メニューの場所がわからなければ、まずここで検索する |
| 拡張機能 | 言語対応・リンター・フォーマッターなどを追加するプラグイン | 発行元を確認して入れる。入れすぎると起動が重くなる |
| ユーザー設定 / ワークスペース設定 | 個人全体の設定 / プロジェクト固有の設定（`.vscode/settings.json`） | ワークスペース設定のほうが優先される |
| `.vscode` フォルダ | `settings.json` `launch.json` `tasks.json` `extensions.json` を置く場所 | チームで共有するものだけをGitに含める |
| 言語モード | ファイルをどの言語として扱うか（右下のステータスバーに表示） | 拡張子が特殊なファイルは手動で切り替える（`Ctrl+K M`） |
| プロファイル | 拡張機能と設定のセットを切り替える機能 | 「業務用」「個人用」など用途ごとに分けられる |

### 設定の優先順位

設定は **既定値 → ユーザー設定 → ワークスペース設定 → フォルダ設定（マルチルート時）** の順に上書きされます。さらに `"[python]": { ... }` のような**言語別設定**が、同じ階層の通常の設定より優先されます。「設定したのに効かない」ときは、ワークスペース側で上書きされていないかを確認します。

## 環境構築

### 1. インストール

公式サイト（https://code.visualstudio.com/）からダウンロードします。Windows 版は3種類あります。

| 種類 | インストール先 | 向いている場面 |
| --- | --- | --- |
| User Installer | ユーザーのプロファイル配下（管理者権限不要） | 個人PC・一般的な開発者（推奨） |
| System Installer | `Program Files` 配下（管理者権限が必要） | 1台を複数ユーザーで使う、管理部門が配布する |
| zip（ポータブル） | 任意のフォルダ | インストールが禁止されている環境、USB 持ち運び |

インストーラーでは次の2つにチェックを入れておくと便利です。

- **PATH への追加**（ターミナルから `code` コマンドが使える）
- **エクスプローラーのファイル / ディレクトリ コンテキスト メニューに「Code で開く」アクションを追加する**

zip 版でも、展開したフォルダに `data` フォルダを作ると**ポータブルモード**になり、設定と拡張機能がそのフォルダ内に保存されます。

### 2. 日本語化

1. 拡張機能ビュー（`Ctrl+Shift+X`）で「Japanese Language Pack」（ID: `MS-CEINTL.vscode-language-pack-ja`）をインストール
2. 右下の通知、またはコマンドパレットの「Configure Display Language」で `ja` を選び再起動

### 3. 最初に入れることが多い拡張機能

| 拡張機能 | ID | 用途 |
| --- | --- | --- |
| Japanese Language Pack | `MS-CEINTL.vscode-language-pack-ja` | 日本語表示 |
| Prettier | `esbenp.prettier-vscode` | JS / TS / CSS / JSON などの整形 |
| ESLint | `dbaeumer.vscode-eslint` | JavaScript / TypeScript の静的解析 |
| Python | `ms-python.python` | Python の実行・デバッグ・仮想環境の選択 |
| EditorConfig | `EditorConfig.EditorConfig` | `.editorconfig` に従ってインデント・改行を統一 |
| Remote - SSH | `ms-vscode-remote.remote-ssh` | SSH 先のサーバーで直接開発 |
| WSL | `ms-vscode-remote.remote-wsl` | WSL 上の Linux 環境で開発 |
| Dev Containers | `ms-vscode-remote.remote-containers` | コンテナ内で開発 |

### 4. 動作確認

```bat
code --version
code .
```

`code --version` でバージョンが表示され、`code .` で現在のフォルダが開けば準備完了です。表示されない場合は、PATH 追加後に**ターミナルを開き直して**いるか確認します。

### 社内プロキシ環境の場合

拡張機能のインストールや更新が失敗するときは、`settings.json` にプロキシを設定します。

```json
{
  "http.proxy": "http://proxy.example.co.jp:8080",
  "http.proxyStrictSSL": true
}
```

SSL を検査するプロキシで証明書エラーになる場合、`http.proxyStrictSSL` を `false` にすると通ることがありますが、検証を無効にするため**情報システム部門に確認したうえで**判断します。

## コマンド

### 基本操作（Windows / Mac）

| 操作 | Windows | Mac |
| --- | --- | --- |
| ファイルを名前で開く | `Ctrl+P` | `Cmd+P` |
| コマンドパレット | `Ctrl+Shift+P` / `F1` | `Cmd+Shift+P` |
| 設定を開く | `Ctrl+,` | `Cmd+,` |
| キーボードショートカット一覧 | `Ctrl+K Ctrl+S` | `Cmd+K Cmd+S` |
| サイドバー表示切替 | `Ctrl+B` | `Cmd+B` |
| ターミナル表示切替 | `` Ctrl+@ ``（日本語キーボード）/ `` Ctrl+` `` | `` Ctrl+` `` |
| エクスプローラー | `Ctrl+Shift+E` | `Cmd+Shift+E` |
| 検索ビュー（全体検索） | `Ctrl+Shift+F` | `Cmd+Shift+F` |
| ソース管理（Git） | `Ctrl+Shift+G` | `Ctrl+Shift+G` |
| 実行とデバッグ | `Ctrl+Shift+D` | `Cmd+Shift+D` |
| 拡張機能 | `Ctrl+Shift+X` | `Cmd+Shift+X` |
| 閉じたエディタを開き直す | `Ctrl+Shift+T` | `Cmd+Shift+T` |

### 編集

| 操作 | Windows | Mac |
| --- | --- | --- |
| 行の複製 | `Shift+Alt+↓` | `Shift+Option+↓` |
| 行の移動 | `Alt+↑` / `Alt+↓` | `Option+↑` / `Option+↓` |
| 行の削除 | `Ctrl+Shift+K` | `Cmd+Shift+K` |
| 行コメント切替 | `Ctrl+/` | `Cmd+/` |
| ブロックコメント切替 | `Shift+Alt+A` | `Shift+Option+A` |
| マルチカーソル（クリック） | `Alt+クリック` | `Option+クリック` |
| 上下にカーソル追加 | `Ctrl+Alt+↑` / `Ctrl+Alt+↓` | `Cmd+Option+↑` / `Cmd+Option+↓` |
| 同じ語を次々に選択追加 | `Ctrl+D` | `Cmd+D` |
| 同じ語をすべて選択 | `Ctrl+Shift+L` | `Cmd+Shift+L` |
| 矩形（ボックス）選択 | `Shift+Alt+ドラッグ` | `Shift+Option+ドラッグ` |
| ドキュメントの整形 | `Shift+Alt+F` | `Shift+Option+F` |
| クイックフィックス | `Ctrl+.` | `Cmd+.` |
| 候補の表示 | `Ctrl+Space` | `Ctrl+Space` |
| 折り返し表示の切替 | `Alt+Z` | `Option+Z` |
| 言語モードの変更 | `Ctrl+K M` | `Cmd+K M` |

### 検索・移動

| 操作 | Windows | Mac |
| --- | --- | --- |
| ファイル内検索 / 置換 | `Ctrl+F` / `Ctrl+H` | `Cmd+F` / `Cmd+Option+F` |
| 全ファイル置換 | `Ctrl+Shift+H` | `Cmd+Shift+H` |
| 指定行へ移動 | `Ctrl+G` | `Ctrl+G` |
| 定義へ移動 / ピーク表示 | `F12` / `Alt+F12` | `F12` / `Option+F12` |
| 参照をすべて表示 | `Shift+F12` | `Shift+F12` |
| シンボル名の変更 | `F2` | `F2` |
| ファイル内のシンボルへ移動 | `Ctrl+Shift+O` | `Cmd+Shift+O` |
| ワークスペースのシンボルへ移動 | `Ctrl+T` | `Cmd+T` |
| 戻る / 進む | `Alt+←` / `Alt+→` | `Ctrl+-` / `Ctrl+Shift+-` |
| 次の問題（エラー）へ | `F8` | `F8` |
| 問題パネル | `Ctrl+Shift+M` | `Cmd+Shift+M` |

### デバッグ

| 操作 | キー |
| --- | --- |
| デバッグ開始 / 続行 | `F5` |
| ブレークポイント切替 | `F9` |
| ステップオーバー / ステップイン / ステップアウト | `F10` / `F11` / `Shift+F11` |
| デバッグ停止 | `Shift+F5` |
| 再起動 | `Ctrl+Shift+F5` |

ブレークポイントを右クリックすると、**条件付きブレークポイント**（`count > 100` のときだけ止める）や**ログポイント**（止めずにメッセージを出す）に変更できます。

### 正規表現での検索・置換

検索ボックスの `.*` ボタン（`Alt+R`）で正規表現を有効にします。JavaScript の正規表現で、置換文字列ではグループを `$1` で参照します。

| やりたいこと | 検索 | 置換 |
| --- | --- | --- |
| 行頭に `-- ` を付ける | `^` | `-- ` |
| 各行を `'...',` で囲む | `^(.+)$` | `'$1',` |
| 末尾の空白を削除 | `[ \t]+$` | （空） |
| 空行を削除 | `^\s*\n` | （空） |
| `A` または `B` を検索 | `A\|B` | — |
| 大文字に変換 | `(\w+)` | `\U$1` |

### CLI（`code` コマンド）

```bat
code .                                   :: 現在のフォルダを開く
code -n .                                :: 新しいウィンドウで開く
code -r app.js                           :: 既存のウィンドウで開く
code -g src\app.js:120:5                 :: 120行目5桁目を開く
code --diff old.txt new.txt              :: 2ファイルの差分を表示
code --list-extensions --show-versions   :: 入っている拡張機能の一覧
code --install-extension esbenp.prettier-vscode
code --uninstall-extension esbenp.prettier-vscode
code --disable-extensions                :: 拡張機能を無効にして起動（切り分け用）
code --status                            :: プロセスや負荷の診断情報
```

`--diff` は Git や WinMerge を使えない環境でも差分確認に使えます。`--list-extensions` の結果をファイルに保存しておけば、PC 移行時に同じ拡張機能を入れ直せます。

## サンプル

### ユーザー設定（settings.json）の例

コマンドパレットで「基本設定: ユーザー設定を開く (JSON)」を選ぶと、JSON で直接編集できます。

```json
{
  "editor.fontSize": 14,
  "editor.tabSize": 2,
  "editor.renderWhitespace": "boundary",
  "editor.rulers": [80, 120],
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "files.autoSave": "onFocusChange",
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true,
  "files.autoGuessEncoding": true,
  "files.eol": "\n",
  "terminal.integrated.defaultProfile.windows": "PowerShell",
  "[python]": {
    "editor.tabSize": 4,
    "editor.defaultFormatter": "ms-python.black-formatter"
  },
  "[markdown]": {
    "files.trimTrailingWhitespace": false
  }
}
```

- `files.autoGuessEncoding`: Shift_JIS のファイルを開いたときの文字化けを減らす
- Markdown は行末の空白2つが改行の意味を持つため、言語別設定で削除を無効にしている
- `files.eol` はプロジェクトの方針に合わせる（Windows 専用のバッチなどは `\r\n`）

### ワークスペース設定とおすすめ拡張機能（チーム共有用）

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true
  },
  "search.exclude": {
    "**/coverage": true
  }
}
```

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "EditorConfig.EditorConfig"
  ]
}
```

`extensions.json` を置いておくと、フォルダを開いたメンバーに「推奨拡張機能をインストールしますか？」と表示されます。

### デバッグ構成（launch.json）

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Node: 現在のファイル",
      "program": "${file}",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "debugpy",
      "request": "launch",
      "name": "Python: 現在のファイル",
      "program": "${file}",
      "console": "integratedTerminal",
      "env": { "APP_ENV": "dev" }
    }
  ]
}
```

実行とデバッグビューの「launch.json ファイルを作成します」から雛形を作れます。`${file}`（開いているファイル）、`${workspaceFolder}`（ワークスペースのルート）などの変数が使えます。

### タスク（tasks.json）

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "build",
      "type": "shell",
      "command": "npm run build",
      "group": { "kind": "build", "isDefault": true },
      "problemMatcher": ["$tsc"]
    }
  ]
}
```

`isDefault: true` のビルドタスクは `Ctrl+Shift+B` で実行できます。

### ユーザースニペット

コマンドパレット「スニペット: スニペットの構成」から言語を選んで作成します。

```json
{
  "SQL SELECT": {
    "prefix": "sel",
    "body": ["SELECT ${1:*}", "  FROM ${2:table_name}", " WHERE ${3:1 = 1};"],
    "description": "SELECT 文の雛形"
  }
}
```

## エラー対応

| 症状・メッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `'code' は、内部コマンドまたは外部コマンド、…として認識されていません。` | PATH に追加されていない、ターミナルを開き直していない | インストーラーで PATH 追加を選ぶ（再インストールで追加可）。環境変数 PATH に VS Code の `bin` フォルダがあるか確認し、ターミナルを開き直す。Mac はコマンドパレット「シェル コマンド: PATH 内に 'code' コマンドをインストールします」 |
| 拡張機能のインストールで `XHR failed` | 社内プロキシ・ファイアウォールで Marketplace に接続できない | `http.proxy` を設定。不可なら `.vsix` を入手し「VSIX からのインストール」 |
| ターミナルで `このシステムではスクリプトの実行が無効になっているため、ファイル … を読み込むことができません。` | PowerShell の実行ポリシー | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`（社内ルールを確認）。またはターミナルを Command Prompt に変更 |
| 日本語が文字化けする | Shift_JIS のファイルを UTF-8 として開いている | 右下の文字コード表示 →「エンコード付きで再度開く」→ `Japanese (Shift JIS)`。`files.autoGuessEncoding` を有効化 |
| 保存したら他の人の環境で文字化けした | 保存時の文字コード・改行コードが変わった | 右下で「エンコード付きで保存」。`.editorconfig` で `charset` と `end_of_line` を固定する |
| `Visual Studio Code is unable to watch for file changes in this large workspace` | Linux（Remote-SSH・WSL 含む）の inotify 監視数の上限 | `fs.inotify.max_user_watches` を増やす。`files.watcherExclude` で `node_modules` などを除外 |
| Pylance で `Import "xxx" could not be resolved` | 選択中の Python インタープリターにパッケージが入っていない | コマンドパレット「Python: インタープリターを選択」で仮想環境（`.venv`）を選ぶ |
| 保存時に整形されない／意図しない整形になる | 既定のフォーマッターが未設定・複数ある | `editor.defaultFormatter` を言語別に指定。右クリック「ドキュメントのフォーマット方法...」で確認 |
| Remote-SSH で `Could not establish connection to "host"` | SSH 設定・鍵・ポート、サーバー側の容量不足や古い OS | まずターミナルで `ssh host` が通るか確認。出力パネル「Remote - SSH」のログを見る |
| 動作が重い・CPU が張り付く | 拡張機能、巨大フォルダの監視・検索 | `code --disable-extensions` で切り分け。「開発者: 拡張機能の二分探索を開始」で原因の拡張機能を特定 |
| `command 'xxx' not found` | 拡張機能が無効・未インストール・起動に失敗 | 拡張機能ビューで有効か確認し、ウィンドウを再読み込み（コマンドパレット「開発者: ウィンドウの再読み込み」） |

**「急におかしくなった」ときの切り分け順**

1. 「開発者: ウィンドウの再読み込み」を実行する
2. `code --disable-extensions` で起動し、拡張機能が原因かを切り分ける
3. ワークスペースの `.vscode/settings.json` が個人設定を上書きしていないか確認する
4. 出力パネル（`Ctrl+Shift+U`）で、該当する拡張機能のログを選んで読む
5. 「ヘルプ → 開発者ツールの切り替え」のコンソールにエラーが出ていないか確認する

## 実務Tips

### チームで設定を揃える

- インデント・改行コード・文字コードは個人の `settings.json` ではなく、**`.editorconfig` とワークスペース設定**で揃える（エディタが違うメンバーにも効く）
- `.vscode/settings.json` と `extensions.json` はGitで共有し、`launch.json` は環境依存の値を入れないようにして共有する
- フォーマッターとリンターのルールはプロジェクトの設定ファイル（`.prettierrc` `eslint.config.js` など）に書き、エディタ依存にしない

### 業務PCでの注意点

- 拡張機能は**発行元（認証済みかどうか）とインストール数**を確認してから入れる。悪意ある拡張機能の事例もある
- 会社によっては利用可能な拡張機能が制限されている。入れる前に社内ルールを確認する
- Settings Sync（設定の同期）は個人の Microsoft / GitHub アカウントに設定を送るため、**業務PCで使ってよいか確認**する
- `settings.json` にパスワードやトークンを書かない。ワークスペース設定はGitに入る可能性がある

### 作業効率を上げる

- メニューを探すより `Ctrl+Shift+P` で機能名を検索するほうが早い。よく使う操作は `Ctrl+K Ctrl+S` で自分用のショートカットを割り当てる
- 大量の定型編集は、**マルチカーソル（`Ctrl+D` / `Ctrl+Shift+L`）と正規表現置換**の組み合わせでほぼ片付く
- Excel から貼り付けたタブ区切りデータは、正規表現で `\t` を `,` や `', '` に置換すれば CSV や SQL の IN 句にすぐ変換できる
- サーバー上のファイル編集は、WinSCP 経由で編集→アップロードするより **Remote - SSH** で直接開くほうが事故が少ない（上書き忘れ・別ファイル編集を防げる）
- 用途ごとに**プロファイル**を分けると、拡張機能を入れすぎて重くなるのを防げる

### Git 操作のコツ

- ソース管理ビューで**変更行単位のステージング**（差分を選択して右クリック「選択範囲をステージする」）ができる
- コミット前に、差分エディタで想定外の改行コード・文字コードの変化がないか確認する（全行が変更扱いになっていたら要注意）
- エディタ左端の色付きバーをクリックすると、その箇所の変更前の内容を確認・元に戻せる

## 関連リンク

- [VS Code 公式ドキュメント](https://code.visualstudio.com/docs)
- [VS Code ダウンロード](https://code.visualstudio.com/download)
- [設定（User and Workspace Settings）](https://code.visualstudio.com/docs/getstarted/settings)
- [キーボードショートカット](https://code.visualstudio.com/docs/getstarted/keybindings)
- [デバッグ](https://code.visualstudio.com/docs/editor/debugging)
- [リモート開発（Remote - SSH）](https://code.visualstudio.com/docs/remote/ssh)
- [Visual Studio Marketplace（拡張機能）](https://marketplace.visualstudio.com/vscode)
