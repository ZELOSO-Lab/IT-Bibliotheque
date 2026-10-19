---
title: Tera Term 技術まとめ
slug: tera-term
excerpt: Tera Termの基本とインストール、SSH・シリアル接続のコマンドラインオプション、ログ取得の設定、TTLマクロの主要コマンドと自動ログイン・一括実行のサンプル、接続できない・文字化けするときの対処、本番作業で役立つ実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# Tera Term 技術まとめ

## 基礎

Tera Term は、Windows 用の無料（オープンソース）のターミナルエミュレータです。**SSH でサーバーにログインする、シリアルケーブルでネットワーク機器のコンソールにつなぐ、作業ログを残す、マクロ（TTL）で操作を自動化する**、といった用途で、日本のインフラ運用・ネットワーク構築の現場で広く使われています。

SSH 機能は同梱の TTSSH（プラグイン）が提供しています。Windows 10 以降は OpenSSH クライアントも標準で使えますが、**作業ログの自動取得とマクロ**が手軽な点で、今も Tera Term が手順書の前提になっている現場は多いです。

### 主な用途

- サーバへの SSH 接続
- シリアル接続（ルーター・スイッチ・サーバーのコンソール）
- 作業ログの取得（エビデンス）
- マクロによる自動化（定型コマンドの実行・複数台への一括操作）

### まず押さえる用語

| 用語 | 意味 | 現場での注意点 |
| --- | --- | --- |
| `ttermpro.exe` | Tera Term 本体の実行ファイル | コマンドライン引数で接続先・認証方法を指定できる |
| `TERATERM.INI` | 設定ファイル | 「設定 → 設定の保存」で書き出す。保存しないと次回に引き継がれない |
| TTSSH | SSH 接続を担当するプラグイン | SSH の設定は「設定 → SSH」系のメニューにある |
| `ssh_known_hosts` | 接続したサーバーのホスト鍵の記録 | サーバー再構築でホスト鍵が変わると警告が出る |
| TTL（Tera Term Language） | Tera Term のマクロ言語（拡張子 `.ttl`） | `ttpmacro.exe` が実行する |
| ログ | 画面に表示された内容のファイル保存 | 作業証跡として提出を求められることが多い |
| ボーレート | シリアル通信の速度 | 機器側と合わないと文字化け・無反応になる（9600 が多い） |

## 環境構築

### 1. インストール

公式サイト（https://teratermproject.github.io/）から入手します。インストーラー版と zip 版があります。

| 種類 | 特徴 | 向いている場面 |
| --- | --- | --- |
| インストーラー版 | `.ttl` の関連付け、スタートメニュー登録 | 自分の PC で日常的に使う |
| zip 版 | 展開するだけで使える | インストールが禁止されている環境、複数バージョンの併用 |

インストーラーでは言語に日本語を選びます。古いバージョンは新しい SSH サーバーと暗号方式が合わず接続できないことがあるため、**長年更新していない Tera Term は更新**を検討します。

### 2. 設定ファイルの場所

設定（`TERATERM.INI`）の保存場所はバージョンや導入方法によって異なります。迷ったら「設定 → 設定の保存」のダイアログに表示されるフォルダを確認します。Tera Term 5 では、ユーザーごとの設定は `%APPDATA%\teraterm5` 配下に置かれます。

### 3. 初回の SSH 接続

1. 起動すると「新しい接続」ダイアログが出る（後からは ファイル → 新しい接続 / `Alt+N`）
2. 「TCP/IP」でホスト名（IP アドレス）を入力し、サービスに「SSH」、TCP ポートに `22` を指定
3. 初回は**セキュリティ警告（ホスト鍵の確認）**が出る。フィンガープリントがサーバー管理者から伝えられた値と一致するか確認し、known hosts リストへ追加するチェックを入れたまま続行
4. ユーザー名を入力し、パスワード認証または鍵（RSA / ECDSA / ED25519 など）を選択してログイン

### 4. 最初にやっておく設定

| 設定 | 場所 |
| --- | --- |
| 文字コード（UTF-8 など） | 設定 → 端末 → 漢字-受信 / 漢字-送信（バージョンにより「文字コード」） |
| フォント | 設定 → フォント |
| 画面サイズ・スクロールバッファ | 設定 → ウィンドウ |
| 自動ログ取得 | 設定 → その他の設定 → 「ログ」タブ |
| 無通信切断の防止 | 設定 → SSH → ハートビート（keep-alive）の間隔 |
| 設定の保存 | 設定 → 設定の保存（`TERATERM.INI` を上書き） |

## コマンド

### 起動オプション（コマンドラインで接続）

```bat
:: パスワード認証（パスワードは起動時に入力）
ttermpro.exe host.example.com:22 /ssh2 /auth=password /user=admin /ask4passwd

:: 公開鍵認証
ttermpro.exe host.example.com:22 /ssh2 /auth=publickey /user=admin /keyfile=C:\keys\id_ed25519

:: シリアル接続（COM3・9600bps）
ttermpro.exe /C=3 /BAUD=9600

:: 起動と同時にログを取る・設定ファイルを指定する・マクロを実行する
ttermpro.exe host.example.com:22 /ssh2 /ask4passwd /user=admin /L=C:\log\host.log
ttermpro.exe /F=C:\tools\teraterm\prod.ini
ttermpro.exe /M=C:\macro\login.ttl
```

| オプション | 意味 |
| --- | --- |
| `host:port` | 接続先とポート |
| `/ssh2` | SSH2 で接続 |
| `/auth=password` / `/auth=publickey` / `/auth=keyboard-interactive` | 認証方式 |
| `/user=` | ユーザー名 |
| `/passwd=` | パスワード（**コマンド履歴やショートカットに残るため非推奨**） |
| `/ask4passwd` | パスワードを起動時に入力させる |
| `/keyfile=` | 秘密鍵ファイル |
| `/C=` / `/BAUD=` | シリアルの COM ポート番号 / 速度 |
| `/L=` | ログファイル名（起動時からログ取得） |
| `/F=` | 使う設定ファイル（`TERATERM.INI` の代わり） |
| `/M=` | 起動時に実行するマクロ |
| `/W=` | ウィンドウタイトル |

接続先ごとにショートカット（`.lnk`）を作り、`/W=` で「【本番】web01」のようなタイトルを付けておくと、どの窓がどのサーバーか取り違えにくくなります。

### キー・メニュー操作

| 操作 | キー・メニュー |
| --- | --- |
| 新しい接続 | `Alt+N`（ファイル → 新しい接続） |
| セッションの複製（同じ接続先を新しい窓で） | `Alt+D`（ファイル → セッションの複製） |
| コピー | 範囲選択すると自動でコピー（`Alt+C` も可） |
| 貼り付け | 右クリック / `Alt+V` |
| ログ開始 | ファイル → ログ |
| ファイル送信（SCP） | ファイル → SSH SCP、またはウィンドウへファイルをドラッグ＆ドロップ |
| マクロ実行 | コントロール → マクロ |
| ブレーク信号の送信（シリアル） | コントロール → ブレーク送信 |
| 画面のクリア | 編集 → 画面クリア / バッファクリア |
| 切断 | ファイル → 接続断 |

### ログ取得

| 設定 | 方法 |
| --- | --- |
| 手動でログ開始 | ファイル → ログ → 保存先を指定して「保存」 |
| 自動ログ取得 | 設定 → その他の設定 → 「ログ」タブ →「標準のログファイル名」と保存先を指定し、自動でログ採取を開始する設定を有効化 → 設定の保存 |
| タイムスタンプ | ログ ダイアログで「タイムスタンプ」をオン（各行の先頭に時刻が付く） |
| ファイル名の日時・ホスト名 | `teraterm_&h_%Y%m%d_%H%M%S.log`（`&h` はホスト名、`%Y` などは日時） |
| 追記 | ログ ダイアログで「追記」をオン |

### TTL マクロの主要コマンド

| コマンド | 用途 | 例 |
| --- | --- | --- |
| `connect` | 接続 | `connect 'host:22 /ssh2 /auth=password /user=admin /ask4passwd'` |
| `wait` | 指定文字列が来るまで待つ | `wait '$' '#'` |
| `waitregex` | 正規表現で待つ | `waitregex '[$#] $'` |
| `sendln` | 文字列＋改行を送信 | `sendln 'ls -l'` |
| `send` | 文字列を送信（改行なし） | `send 'y'` |
| `timeout` | `wait` のタイムアウト秒（システム変数） | `timeout = 10` |
| `logopen` / `logclose` | ログの開始 / 終了 | `logopen 'C:\log\a.log' 0 0` |
| `pause` / `mpause` | 秒 / ミリ秒待つ | `pause 2` |
| `getdate` / `gettime` | 日付・時刻を取得 | `getdate today '%Y%m%d'` |
| `strconcat` | 文字列を連結 | `strconcat logfile '.log'` |
| `messagebox` | メッセージを表示 | `messagebox '完了しました' '通知'` |
| `inputbox` / `passwordbox` | 入力を求める | `passwordbox 'パスワード' 'ログイン'` |
| `fileopen` / `filereadln` / `fileclose` | ファイルを1行ずつ読む | `filereadln fh line` |
| `if` / `while` / `for` / `goto` | 制御構文（1行の if は `then` なし） | `if result = 0 then ... endif` / `if result <> 0 break` |
| `closett` | Tera Term を閉じる | `closett` |
| `end` | マクロ終了 | `end` |

`logopen` の2つ目の引数は「バイナリモード（0=テキスト）」、3つ目は「追記（0=上書き / 1=追記）」です。`wait` の結果はシステム変数 `result` に入り、**タイムアウトなら 0**、一致すれば何番目の文字列に一致したか（1, 2, …）が入ります。行の `;` 以降はコメントです。

## サンプル

### 自動ログイン＋ログ取得＋コマンド実行

```text
; login_and_check.ttl
host = 'web01.example.co.jp'
user = 'admin'

; ログファイル名: C:\log\web01_20261019_103000.log
getdate d '%Y%m%d_%H%M%S'
logfile = 'C:\log\'
strconcat logfile host
strconcat logfile '_'
strconcat logfile d
strconcat logfile '.log'

; 接続（パスワードは実行時に入力）
cmd = host
strconcat cmd ':22 /ssh2 /auth=password /user='
strconcat cmd user
strconcat cmd ' /ask4passwd'
connect cmd
if result <> 2 then
  messagebox '接続に失敗しました' 'エラー'
  end
endif

logopen logfile 0 0
timeout = 30

wait '$ '
if result = 0 then
  messagebox 'プロンプトが返りません' 'エラー'
  end
endif

sendln 'hostname; date'
wait '$ '
sendln 'df -h'
wait '$ '
sendln 'free -m'
wait '$ '

logclose
messagebox 'ログを取得しました' '完了'
```

`connect` の後のシステム変数 `result` は、**2 なら接続成功**です。`wait` は必ずタイムアウト（`timeout`）を設定し、`result = 0` のときに止まるようにしておくと、想定外の応答で暴走しません。

### 複数台に同じコマンドを流す（ホスト一覧ファイルを読む）

`hosts.txt` に1行1ホストを書いておき、順番に処理します。

```text
; multi_host.ttl
passwordbox 'adminのパスワードを入力' 'ログイン'
pw = inputstr

fileopen fh 'C:\macro\hosts.txt' 0
while 1
  filereadln fh host
  if result <> 0 break
  if host <> '' then
    getdate d '%Y%m%d'
    logfile = 'C:\log\'
    strconcat logfile host
    strconcat logfile '_'
    strconcat logfile d
    strconcat logfile '.log'

    cmd = host
    strconcat cmd ':22 /ssh2 /auth=password /user=admin /passwd='
    strconcat cmd pw
    connect cmd
    if result = 2 then
      logopen logfile 0 1
      timeout = 30
      wait '$ '
      sendln 'uptime'
      wait '$ '
      sendln 'exit'
      pause 2
      logclose
    endif
    closett
  endif
endwhile
fileclose fh
messagebox '全ホストの処理が終わりました' '完了'
```

`filereadln` はファイルの終わりに達すると `result` に 1 が入ります。パスワードはマクロ内に書かず、実行時に `passwordbox` で入力させています（入力値はシステム変数 `inputstr` に入ります）。パスワードに空白などが含まれると接続文字列が崩れるため、その場合は鍵認証を使います。本番機に流す前に、**検証機1台だけを書いた `hosts.txt` で必ず試します**。

### シリアル接続（ネットワーク機器のコンソール）

```text
; serial_console.ttl
connect '/C=3 /BAUD=9600'
logopen 'C:\log\console.log' 0 1
sendln ''
wait '>' '#'
sendln 'show version'
```

COM ポート番号はデバイスマネージャーの「ポート（COM と LPT）」で確認します。USB シリアル変換ケーブルは、差し替えると番号が変わることがあります。

## エラー対応

| 症状・メッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| 接続がタイムアウトする／接続できない | ホスト名・IP・ポートの誤り、FW やセキュリティグループで遮断、社内プロキシ | `ping` / `Test-NetConnection host -Port 22`（PowerShell）で疎通を確認。踏み台経由が必要か確認 |
| セキュリティ警告（known hosts にエントリがない） | 初めて接続するサーバー | フィンガープリントを管理者に確認してから追加する |
| セキュリティ警告（known hosts のホスト鍵と一致しない） | サーバーの再構築・OS 再インストール、**または中間者攻撃** | 理由がわかっている場合のみ、`ssh_known_hosts` の該当行を削除して再登録。心当たりがなければ接続せず管理者に連絡 |
| 認証に失敗する | パスワード誤り、鍵の形式・権限、サーバーでパスワード認証が無効 | 認証方式を確認。鍵の場合はサーバー側 `~/.ssh/authorized_keys` と権限（`700` / `600`）を確認 |
| 新しいサーバーにだけ接続できない（暗号方式のネゴシエーション失敗） | 古い Tera Term が新しい OpenSSH の鍵交換・ホスト鍵アルゴリズムに対応していない | Tera Term を最新版に更新する |
| 日本語が文字化けする | 端末の文字コードとサーバーのロケールの不一致 | 設定 → 端末で UTF-8（または EUC-JP / SJIS）を合わせる。サーバー側の `echo $LANG` も確認 |
| しばらく放置すると切断される | 無通信タイムアウト（FW・サーバーの設定） | 設定 → SSH でハートビート（keep-alive）間隔を設定（例: 60秒） |
| Backspace で `^H` や `^?` が表示される | キー設定と端末設定の不一致 | 設定 → キーボード で Backspace / Delete キーの送信コードを入れ替える |
| シリアルで何も表示されない・記号だらけになる | ボーレート・COM 番号の誤り、ケーブル（ストレート / クロス） | 設定 → シリアルポートで速度・データ長・パリティ・ストップビットを機器のマニュアルに合わせる |
| マクロで `Link macro first. Use 'connect' macro command.` | 接続していない状態で `sendln` などを実行した | `connect` の後に `result` を確認する。手動で接続済みの窓から「コントロール → マクロ」で実行する |
| マクロが途中で止まったまま進まない | `wait` の文字列がプロンプトと一致しない、タイムアウト未設定 | プロンプトの末尾（`$ ` `# ` など）を確認。`timeout` を設定し、`result = 0` を判定する |
| 長いコマンドを貼り付けたら崩れた | 貼り付け速度が速すぎる、エディタ・機器側の取りこぼし | 1行ずつ貼り付ける。ネットワーク機器では貼り付け時の送信遅延を設定する |

## 実務Tips

### 本番作業の事故を防ぐ

- **自動ログ取得を必ず有効**にし、ファイル名に日時とホスト名（`&h`）を入れる。ログは作業証跡として求められることが多い
- 本番と検証で**背景色・文字色を変えた設定ファイル**（`/F=prod.ini`）を用意し、色で取り違えに気づけるようにする
- ウィンドウタイトル（`/W=`）に環境名とホスト名を入れる。窓を多く開く作業ほど効く
- 複数行のコマンドを貼り付ける前に、メモ帳などで内容を確認する。**改行を含む貼り付けは即実行される**ことを意識する
- 重要な操作の前後で `hostname` と `whoami` を実行し、ログ上でも「どのサーバーで誰が実行したか」が分かるようにする

### マクロ運用のコツ

- パスワードを `.ttl` や `/passwd=` に**平文で書かない**。実行時入力（`passwordbox` / `/ask4passwd`）か鍵認証を使う
- `wait` には必ず `timeout` を組み合わせ、想定外の応答では止まるようにする
- 複数台への一括実行は、まず検証機1台で試し、次に本番1台、最後に残り全台の順で広げる
- 変更系コマンドを流すマクロは、実行前の確認（`yesnobox` など）を入れると誤実行を防げる
- マクロとホスト一覧はバージョン管理し、作業手順書に「どのマクロのどの版を使ったか」を書く

### 設定・ログの管理

- 設定を変えたら「設定 → 設定の保存」を忘れない。用途別に `TERATERM.INI` を分けて保存しておくと切り替えが楽
- ログフォルダは容量が増え続けるため、保管期間を決めて定期的に整理する。顧客情報やパスワードが写り込むことがあるため、**ログの保管場所と共有範囲**にも注意する
- 鍵ファイル（秘密鍵）はパスフレーズを付け、共有フォルダに置かない
- ファイル転送が多い作業は、Tera Term の SCP よりも WinSCP などの専用ツールのほうが確認しやすい

## 関連リンク

- [Tera Term 公式サイト](https://teratermproject.github.io/)
- [Tera Term GitHub リポジトリ](https://github.com/TeraTermProject/teraterm)
- [Tera Term リリース一覧（ダウンロード）](https://github.com/TeraTermProject/teraterm/releases)
