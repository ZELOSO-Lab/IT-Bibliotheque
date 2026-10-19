---
title: tree 技術まとめ
slug: tree
excerpt: ディレクトリ構成をツリー形式で表示するtreeコマンドについて、Windows版とLinux / macOS版の違い、インストール、よく使うオプション、README・設計書・納品物確認での使い方、文字化けや除外が効かないときの対処、資料に貼るときのTipsまでを1ページにまとめました。
updated: 2026-10-19
---

# tree 技術まとめ

## 基礎

tree は、ディレクトリ（フォルダ）の構成を罫線付きのツリー形式で表示するコマンドです。README や設計書に構成図を貼る、納品物のフォルダ構成を確認する、初めて触るリポジトリの全体像をつかむ、といった場面で使います。

**結論：Windows の `tree` と Linux / macOS の `tree` は別物です。** Windows 版は OS に標準で入っていますがオプションは `/F` と `/A` の2つだけ、Linux / macOS 版は追加インストールが必要な代わりに、階層の制限・除外・サイズ表示などができます。

### Windows 版と Linux 版の違い

| 項目 | Windows（`tree.com`） | Linux / macOS（`tree` パッケージ） |
| --- | --- | --- |
| インストール | 不要（標準で入っている） | 多くの環境で追加インストールが必要 |
| オプションの書き方 | `/F` `/A`（スラッシュ） | `-L 2` `-I 'pattern'`（ハイフン） |
| ファイルの表示 | `/F` を付けたときだけ | 標準で表示（`-d` でフォルダのみ） |
| 階層の制限・除外 | できない | `-L` で階層制限、`-I` で除外 |
| 隠しファイル | 表示される | 標準では表示しない（`-a` で表示） |
| 末尾の集計行 | なし | `5 directories, 7 files` のように出る |

### 出力の読み方（Linux）

```text
.
├── public
│   └── index.html
├── src
│   ├── components
│   │   └── Button.tsx
│   ├── utils
│   │   └── date.ts
│   └── index.ts
├── .env
├── README.md
└── package.json

5 directories, 7 files
```

`├──` は「続きがある項目」、`└──` は「そのフォルダの最後の項目」、`│` は上の階層がまだ続いていることを表します。

### 出力の読み方（Windows `tree /F /A`）

```text
C:.
|   package.json
|   README.md
|
+---public
|       index.html
|
\---src
    |   index.ts
    |
    +---components
    |       Button.tsx
    |
    \---utils
            date.ts
```

Windows 版は、各フォルダの**ファイルを先に、サブフォルダを後に**表示します。実際の出力では、この前にボリューム名とシリアル番号の2行が付きます。`/A` を付けない場合は `+---` `\---` の代わりに `├───` `└───` の罫線で表示されます。

## 環境構築

### Windows

インストールは不要です。コマンドプロンプトでも PowerShell でもそのまま使えます（PowerShell から実行しても中身は同じ `tree.com` です）。

```bat
tree /?
```

Linux 版と同じ機能（階層制限・除外）が必要な場合は、WSL（Ubuntu など）に Linux 版の tree を入れて使うのが簡単です。

### Linux / macOS

| 環境 | コマンド |
| --- | --- |
| Ubuntu / Debian（WSL 含む） | `sudo apt install tree` |
| RHEL / Rocky Linux / AlmaLinux | `sudo dnf install tree` |
| Alpine | `apk add tree` |
| macOS（Homebrew） | `brew install tree` |

```sh
tree --version
# tree v2.1.1 (c) 1996 - 2023 by Steve Baker, ...
```

`--gitignore` などの新しいオプションは tree 2.x で追加されたものです。古いサーバーで「オプションがない」と言われたら、まずバージョンを確認します。

## コマンド

### Windows

| 操作 | コマンド・構文 |
| --- | --- |
| フォルダのみ | `tree` |
| 場所を指定 | `tree C:\work\myapp` |
| ファイルも表示 | `tree /F` |
| ASCII 罫線 | `tree /F /A` |
| ファイルへ出力 | `tree /F /A > tree.txt` |
| UTF-8 で保存（PowerShell） | `tree /F /A \| Out-File -Encoding utf8 tree.txt` |

Windows 版には除外オプションがありません。`node_modules` などを除いた一覧がほしいときは、PowerShell で次のように代用できます（罫線は付きません）。

```powershell
Get-ChildItem -Recurse -Name | Where-Object { $_ -notmatch 'node_modules' }
```

### Linux / macOS：基本

| 操作 | コマンド・構文 |
| --- | --- |
| 基本（カレントディレクトリ） | `tree` |
| 場所を指定 | `tree src` |
| 階層を制限 | `tree -L 2` |
| ディレクトリのみ | `tree -d` |
| 隠しファイルも表示 | `tree -a` |
| 除外（複数は `\|` 区切り） | `tree -I 'node_modules\|dist'` |
| パターン一致のみ | `tree -P '*.ts'` |
| 一致しない空フォルダを省く | `tree -P '*.ts' --prune` |
| .gitignore の対象を除外 | `tree --gitignore` |

### Linux / macOS：表示の調整

| 操作 | コマンド・構文 |
| --- | --- |
| ASCII 罫線 | `tree --charset=ascii` |
| フォルダを先に表示 | `tree --dirsfirst` |
| フォルダ名の末尾に `/` | `tree -F` |
| フルパス表示 | `tree -f` |
| 罫線なしのパス一覧 | `tree -i -f` |
| 集計行を出さない | `tree --noreport` |
| 色を付けない / 付ける | `tree -n` / `tree -C` |
| 日本語ファイル名をそのまま表示 | `tree -N` |
| ファイルへ出力 | `tree -o tree.txt` |

### Linux / macOS：サイズ・日時・権限

| 操作 | コマンド・構文 |
| --- | --- |
| サイズ（K / M 表記） | `tree -h` |
| サイズ（バイト） | `tree -s` |
| フォルダ内の合計サイズ | `tree --du -h` |
| 更新日時 | `tree -D --timefmt '%Y-%m-%d'` |
| 権限・所有者 | `tree -p -u` |
| 中身が多いフォルダは開かない | `tree --filelimit 100` |
| JSON / XML / HTML で出力 | `tree -J` / `tree -X` / `tree -H .` |

```sh
tree -h --du -L 1
# [ 20K]  .
# ├── [   6]  README.md
# ├── [4.0K]  dist
# ...
```

## サンプル

### README に貼る構成図を作る

```sh
tree -L 2 --dirsfirst --noreport -I 'node_modules|dist|.git|coverage'
```

Markdown に貼るときは、コードブロック（` ```text `）で囲みます。罫線がずれる環境向けには `--charset=ascii` を付けます。

```text
.
|-- public
|   `-- index.html
|-- src
|   |-- components
|   |-- utils
|   `-- index.ts
|-- README.md
`-- package.json
```

### 特定の拡張子だけを一覧にする

```sh
tree -P '*.sql' --prune db/
tree -P 'Button*' --matchdirs --prune src   # --matchdirs はフォルダ名にもパターンを適用
```

`-P` だけだと、一致するファイルがないフォルダも空のまま表示されます。`--prune` で空フォルダを省きます。

### 納品物の構成チェック（前回との差分）

```sh
tree -a --noreport -N release_20261019 > tree_new.txt
tree -a --noreport -N release_20261001 > tree_old.txt
diff tree_old.txt tree_new.txt
```

ルートの行（フォルダ名）は毎回変わるので、差分を見るときは `cd` してから `tree` を実行するか、1行目を無視して読みます。サイズの増減も見たい場合は `-s` を付けます。

### Windows で構成図をファイルに保存する

```bat
cd /d C:\work\myapp
tree /F /A > C:\temp\tree.txt
```

```powershell
# PowerShell（UTF-8 で保存）
tree C:\work\myapp /F /A | Out-File -Encoding utf8 C:\temp\tree.txt
```

出力先を対象フォルダの中にすると、作成途中の `tree.txt` 自体が一覧に入ります。**出力先は対象フォルダの外**にします。

### スクリプトから扱う（JSON）

```sh
tree -J -L 2 src > tree.json
```

```text
[
  {"type":"directory","name":"src","contents":[
    {"type":"directory","name":"components"},
    {"type":"file","name":"index.ts"},
    {"type":"directory","name":"utils"}
  ]}
,
  {"type":"report","directories":3,"files":1}
]
```

ドキュメント生成ツールや構成チェックのスクリプトに渡すときは、罫線をパースするより JSON のほうが確実です。

## エラー対応

| エラーメッセージ・症状 | 主な原因 | 対処 |
| --- | --- | --- |
| `tree: command not found`（bash）/ `tree: not found`（dash） | Linux / macOS に tree がインストールされていない | `sudo apt install tree` など。入れられない環境では `find . -maxdepth 2` で代用 |
| `[error opening dir]` | フォルダが存在しない、または読み取り権限がない | パスを確認する。権限不足なら読めるユーザーで実行する |
| `tree: Invalid level, must be greater than 0.` | `-L 0` を指定した、または `-L1` のように数値を続けて書いた | `-L 1` のように**空白を入れて**1以上を指定する |
| `tree: Missing argument to -L option.` | `-L` の後に数値がない | `tree -L 2` |
| `dist: command not found` | `-I node_modules\|dist` をクォートせず、`\|` がパイプとして解釈された | `-I 'node_modules\|dist'` とシングルクォートで囲む |
| `[N entries exceeds filelimit, not opening dir]` | `--filelimit` の件数を超えたフォルダ | 想定どおりならそのまま。中身も見たいなら値を増やす |
| 日本語名が `\350\250\255...` と表示される | ロケールが `C` / `POSIX` で、マルチバイト文字が非表示扱いされた | `tree -N` を付けるか、`LANG=ja_JP.UTF-8`（または `C.UTF-8`）で実行する |
| 罫線が `\|--` や `` `-- `` になる | ロケールが UTF-8 でない（Linux 版は環境に応じて罫線を切り替える） | 意図どおりなら問題なし。統一したいなら `--charset=ascii` を明示する |
| `-I 'src/utils'` で除外されない | `-I` はファイル名・フォルダ名に対して一致を判定する | `-I utils` のように名前で指定する（同名のフォルダはすべて除外される点に注意） |
| Windows でファイルが表示されない | `/F` を付けていない | `tree /F` |
| Windows で保存した `tree.txt` が文字化けする | コンソールのコードページ（日本語環境では Shift_JIS 系）で保存され、UTF-8 前提のエディタで開いた | `/A` で罫線を ASCII にし、PowerShell の `Out-File -Encoding utf8` で保存する |
| Windows で `Invalid path` と出る | 指定したパスが存在しない、ネットワークドライブに接続していない | パスを確認する。空白を含むパスは `"C:\My Folder"` のように囲む |
| Windows で `No subfolders exist` と出る | サブフォルダがないフォルダに `/F` なしで実行した | ファイルも見たいなら `tree /F` |

※ Windows のメッセージは英語版の表示です。日本語版 Windows では日本語のメッセージが表示されます。

## 実務Tips

### 資料・README に貼るとき

- **`-L 2` 程度に絞る**。全階層を貼ると読まれない。詳細が必要なフォルダだけ別に `tree src/components` で載せる
- `node_modules` `dist` `.git` `vendor` `__pycache__` などは必ず除外する。`--gitignore` を使うとプロジェクトの除外設定と揃えられる
- Excel・Word・メールに貼ると、日本語フォントでは罫線の幅がずれて崩れることがある。**`--charset=ascii`（Windows は `/A`）で ASCII 罫線にする**と崩れにくい
- 構成図の横にコメントを書くなら、出力後に手で `# 画面コンポーネント` のように追記する。tree 自体にコメント機能はない

### 確認・調査で使うとき

- 初めて触るリポジトリは `tree -d -L 3 -I node_modules` でフォルダ構成だけを先に見る
- 容量調査は `tree --du -h -L 2` で大きいフォルダの当たりをつけ、詳細は `du -sh *` で確認する
- 巨大なフォルダ（ログ置き場・`node_modules`）にそのまま実行すると、出力が数万行になり端末が固まる。最初は必ず `-L` を付ける
- 納品前のチェックでは `-a` を付けて、`.env`・`.DS_Store`・`Thumbs.db` などの**入れてはいけない隠しファイル**が混ざっていないか確認する

### 環境差の注意

- tree が入っていない本番サーバーに、確認のためだけにパッケージを入れない。`find . -maxdepth 2 -type d` や `ls -R` で足りることが多い
- Linux 版の出力はロケールで罫線や日本語の表示が変わる。手順書に載せるコマンドは `--charset=ascii` や `-N` を明示しておくと、誰が実行しても同じ結果になる
- `-L1` のように数値を詰めて書くと tree 2.x ではエラーになる。**オプションと値の間には空白**を入れる

## 関連リンク

- [tree コマンド（Microsoft Learn・Windows コマンド）](https://learn.microsoft.com/ja-jp/windows-server/administration/windows-commands/tree)
- [Windows コマンド一覧（Microsoft Learn）](https://learn.microsoft.com/ja-jp/windows-server/administration/windows-commands/windows-commands)
- [tree（Linux 版）公式サイト](https://oldmanprogrammer.net/source.php?dir=projects/tree)
