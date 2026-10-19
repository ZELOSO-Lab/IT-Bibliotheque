---
title: WinSCP 技術まとめ
slug: winscp
excerpt: WinSCPの対応プロトコルと画面の基本、インストールと接続設定（ホスト鍵・秘密鍵）、GUI操作とスクリプト（winscp.com /script・/command）のコマンド、バッチ・PowerShell（.NETアセンブリ）による自動転送と同期のサンプル、よくあるエラーと対処、本番サーバーを扱う実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# WinSCP 技術まとめ

## 基礎

WinSCP は、Windows から Linux などのサーバーへファイルを転送するための無料（オープンソース）のクライアントです。エクスプローラーのような画面でドラッグ＆ドロップするだけでなく、**スクリプトやバッチでの自動転送**、**ローカルとサーバーのフォルダー同期**、**サーバー上のファイルの直接編集**ができます。

### 対応プロトコル

| プロトコル | ポート（既定） | 用途・注意点 |
| --- | --- | --- |
| SFTP | 22 | SSH 上のファイル転送。**迷ったらこれ**。Linux サーバーなら通常そのまま使える |
| SCP | 22 | 古いサーバー向け。機能が限られるため、SFTP が使えるなら SFTP を選ぶ |
| FTP | 21 | 通信が暗号化されない。社外との通信では使わない |
| FTPS（明示的 / 暗黙的 TLS） | 21 / 990 | FTP を TLS で暗号化したもの |
| WebDAV | 80 / 443 | HTTP ベースのファイル共有 |
| S3 | 443 | Amazon S3 や S3 互換ストレージ |

### 2つの実行ファイル

| ファイル | 役割 |
| --- | --- |
| `WinSCP.exe` | GUI 本体 |
| `WinSCP.com` | コンソール用。スクリプトやバッチから使う（標準出力にログが出て、終了コードを返す） |
| `WinSCPnet.dll` | .NET アセンブリ。PowerShell や C# から WinSCP を操作する |

### 画面（インターフェース）の種類

- **コマンダー**: 左にローカル、右にサーバーの2画面。転送作業が多い人向け
- **エクスプローラー**: サーバー側だけを表示し、Windows のエクスプローラーとの間でドラッグ＆ドロップする

設定（環境設定 → 環境 → インターフェース）からいつでも切り替えられます。

## 環境構築

### 1. インストール

- 公式サイトのダウンロードページからインストーラーを入手する（「インストール版」と、USB などに入れて使える「ポータブル版」がある）
- winget を使う場合は `winget install --id WinSCP.WinSCP -e`
- インストール時に「コマンダー」か「エクスプローラー」の画面を選び、日本語の表示言語も選べる

ポータブル版や「設定を INI ファイルに保存」を選ぶと、保存したセッションや設定は `WinSCP.ini` に保存されます（既定はレジストリ）。PC の入れ替え時は「ツール → 設定のエクスポート」でバックアップします。

### 2. セッション（接続先）を作る

1. ログイン画面で「新しいサイト」を選ぶ
2. 転送プロトコル（SFTP）、ホスト名、ポート番号、ユーザー名を入力する
3. 鍵認証の場合は「設定 → SSH → 認証」で秘密鍵ファイルを指定する
4. 「保存」でサイトとして保存し、「ログイン」で接続する

### 3. 秘密鍵の準備

WinSCP は PuTTY 形式（`.ppk`）の秘密鍵を使います。OpenSSH 形式（`id_ed25519` など）の鍵を指定すると、**PPK 形式への変換を提案するダイアログ**が出るので、それに従って変換・保存します。鍵の作成や変換は WinSCP に同梱の PuTTYgen でも行えます。

### 4. 初回接続時のホスト鍵の確認

初めて接続するサーバーでは「ホスト鍵がキャッシュにない」という警告が出ます。表示されたフィンガープリントが**サーバー管理者から伝えられた値と一致するか確認してから**「はい」を押します。サーバー側では次のコマンドで確認できます。

```sh
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

## コマンド

### 早見表：GUI 操作（コマンダー画面）

| 操作 | 方法・キー |
| --- | --- |
| 新しいセッション | `Ctrl+N` |
| コピー（転送） | `F5` またはドラッグ＆ドロップ |
| 移動 | `F6` |
| フォルダー作成 | `F7` |
| 削除 | `F8` |
| 名前の変更 | `F2` |
| 編集 | `F4`（またはファイルを右クリック → 編集） |
| 同期 | コマンド → 同期（`Ctrl+S`） |
| ディレクトリの比較 | コマンド → ディレクトリの比較 |
| リモートディレクトリを最新に保つ | コマンド → リモートディレクトリを最新に保つ（ローカルの変更を監視して自動アップロード） |
| 隠しファイルの表示切替 | `Ctrl+Alt+H` |

### スクリプトの基本

スクリプトはテキストファイルに WinSCP のコマンドを書き、`WinSCP.com` で実行します。

```text
# upload.txt
option batch abort
option confirm off
open sftp://deploy@app01.example.com/ -hostkey="ssh-ed25519 255 xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" -privatekey="C:\keys\deploy.ppk"
put C:\work\app.zip /home/deploy/
exit
```

```bat
"C:\Program Files (x86)\WinSCP\WinSCP.com" /script=upload.txt /log=winscp.log /ini=nul
```

### 早見表：スクリプトのコマンド

| 操作 | コマンド |
| --- | --- |
| 接続 | `open sftp://user@host/ -hostkey="ssh-ed25519 255 ..."` |
| 鍵認証で接続 | `open sftp://user@host/ -privatekey="C:\keys\id.ppk" -hostkey="..."` |
| アップロード | `put C:\work\app.zip /home/user/` |
| ダウンロード | `get /var/log/app.log C:\logs\` |
| 転送後に元ファイルを削除 | `put -delete C:\outbox\*.csv /data/inbox/` |
| 新しいファイルだけ | `put -neweronly C:\dist\* /var/www/html/` |
| ファイルを絞り込む | `get -filemask="*.log>=1D" /var/log/app/* C:\logs\`（1日以内に更新） |
| 一覧 / 移動 | `ls` / `cd /var/www` / `lcd C:\work` |
| 削除 / 名前変更 | `rm /tmp/old.zip` / `mv a.txt b.txt` |
| 権限変更 | `chmod 644 index.html` |
| サーバーでコマンド実行 | `call unzip -o /home/user/app.zip -d /home/user/app` |
| 終了 | `exit` |

### 早見表：実行オプション（WinSCP.com）

| 操作 | コマンド・構文 |
| --- | --- |
| スクリプト実行 | `winscp.com /script=upload.txt` |
| ログ出力 | `winscp.com /script=upload.txt /log=winscp.log` |
| 保存済み設定を使わない | `/ini=nul`（自動処理ではほぼ必須） |
| スクリプトに引数を渡す | `/parameter // C:\dist /var/www/html` → スクリプト内で `%1%` `%2%` |
| ワンライナー | `winscp.com /command "open sftp://user@host/" "put a.txt" "exit"` |
| 戻り値 | 成功 0 / 失敗 1（バッチで `%ERRORLEVEL%` を確認） |

### 早見表：同期（synchronize）

| 操作 | コマンド・構文 |
| --- | --- |
| リモートへ同期 | `synchronize remote C:\dist /var/www/html` |
| ローカルへ同期 | `synchronize local C:\backup /var/www/html` |
| 削除も反映（ミラー） | `synchronize remote -delete C:\dist /var/www/html` |
| 実行せず差分だけ表示 | `synchronize remote -preview C:\dist /var/www/html` |
| 比較基準 | `-criteria=time`（既定）/ `size` / `either` |
| 除外 | `-filemask="\|*.tmp; .git/; node_modules/"` |

`-filemask` は `含める条件|除外する条件` の形で書き、フォルダーは末尾に `/` を付けます。古い `option exclude` は非推奨なので、新しく書くスクリプトでは `-filemask` を使います。

## サンプル

### バッチファイルから転送し、失敗を検知する

```bat
@echo off
setlocal
set WINSCP="C:\Program Files (x86)\WinSCP\WinSCP.com"
set LOG=C:\jobs\logs\upload_%DATE:/=%.log

%WINSCP% /ini=nul /log=%LOG% /script=C:\jobs\upload.txt
if %ERRORLEVEL% neq 0 (
  echo 転送に失敗しました。ログを確認してください: %LOG%
  exit /b 1
)
echo 転送が完了しました
exit /b 0
```

タスクスケジューラーから実行する場合は、作業フォルダーと実行ユーザーを確認し、パスはすべて絶対パスで書きます。

### 引数付きの同期スクリプト（リリース前に差分確認）

```text
# sync.txt  使い方: winscp.com /ini=nul /script=sync.txt /parameter // C:\dist /var/www/html
option batch abort
option confirm off
open sftp://deploy@web01.example.com/ -hostkey="ssh-ed25519 255 xxxx..." -privatekey="C:\keys\deploy.ppk"
synchronize remote -preview -delete -filemask="|*.map; .git/" "%1%" "%2%"
exit
```

`-preview` で結果を確認し、問題なければ `-preview` を外して実行します。`-delete` は**サーバー側にしかないファイルを削除**するので、ログファイルやアップロード画像などが同じフォルダーにないか必ず確認します。

### PowerShell から .NET アセンブリで転送する

```powershell
Add-Type -Path "C:\Program Files (x86)\WinSCP\WinSCPnet.dll"

$sessionOptions = New-Object WinSCP.SessionOptions -Property @{
    Protocol              = [WinSCP.Protocol]::Sftp
    HostName              = "app01.example.com"
    UserName              = "deploy"
    SshPrivateKeyPath     = "C:\keys\deploy.ppk"
    SshHostKeyFingerprint = "ssh-ed25519 255 xxxxxxxxxxxxxxxxxxxx"
}

$session = New-Object WinSCP.Session
try {
    $session.SessionLogPath = "C:\jobs\logs\winscp_session.log"
    $session.Open($sessionOptions)

    $transferOptions = New-Object WinSCP.TransferOptions
    $transferOptions.TransferMode = [WinSCP.TransferMode]::Binary

    $result = $session.PutFiles("C:\outbox\*.csv", "/data/inbox/", $False, $transferOptions)
    $result.Check()   # 1件でも失敗していれば例外を投げる

    foreach ($t in $result.Transfers) {
        Write-Host "送信: $($t.FileName)"
    }
}
finally {
    $session.Dispose()
}
```

.NET アセンブリはインストーラーに同梱されているほか、NuGet パッケージ（`WinSCP`）としても入手できます。転送結果をファイル単位で扱えるため、エラー処理やリトライを細かく書きたい場合に向いています。

### GUI の設定からスクリプトを自動生成する

ログイン画面でサイトを選び「管理（Manage）→ セッションの URL/コードを生成（Generate Session URL/Code）」を開くと、`open` コマンド（ホスト鍵のフィンガープリント付き）や、PowerShell・C# のコードが生成されます。手で書くより確実なので、スクリプト作成の出発点にします。

## エラー対応

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `Host key wasn't verified!` | スクリプトでホスト鍵を確認できない（初回接続、`-hostkey` 未指定・誤り） | `open` に正しい `-hostkey="..."` を付ける。「Generate Session URL/Code」の出力からコピーする |
| ホスト鍵が以前と違うという警告 | サーバーの再構築・OS 再インストール、または中間者攻撃 | **すぐに「はい」を押さない**。サーバー管理者に鍵の変更があったか確認する |
| `Access denied.` / `Authentication failed.` | ユーザー名・パスワードの誤り、鍵の不一致 | 同じ情報で `ssh` 接続できるか確認。鍵は `authorized_keys` に登録されているか見る |
| `Server refused our key` | 公開鍵がサーバーに未登録、`~/.ssh` や `authorized_keys` の権限が緩すぎる | `chmod 700 ~/.ssh`、`chmod 600 ~/.ssh/authorized_keys` を確認する |
| `Network error: Connection timed out.` | ファイアウォール、ホスト名・ポートの誤り、VPN 未接続 | `Test-NetConnection host -Port 22` で疎通を確認する |
| `Network error: Connection refused.` | サーバーで SSH サービスが動いていない、ポート番号違い | sshd の起動状態とポート番号を確認する |
| `Permission denied.`（Error code: 3） | 転送先フォルダーに書き込み権限がない | 接続ユーザーの権限を確認。root 所有のフォルダーには一度ホームに置いてから移動する |
| `Upload of file '...' was successful, but error occurred while setting the permissions and/or timestamp.` | ファイルの所有者でないため権限・更新日時を変更できない | 転送設定で「権限を設定」「タイムスタンプを保持」を外す。スクリプトは `-nopermissions -nopreservetime` |
| `Received too large (...) SFTP packet.` | ログイン時にシェルの起動スクリプト（`.bashrc` など）が文字を出力している | 対話シェルのときだけ出力するよう起動スクリプトを修正する |
| `Connection has been unexpectedly closed.` | サーバー側の切断、SCP でシェルの出力が邪魔をしている、アイドル切断 | SFTP に切り替える。「設定 → 接続」でキープアライブを有効にする |
| 日本語ファイル名が文字化けする | サーバーとの文字コードの不一致（FTP、古いサーバー） | セッション設定の「環境」でファイル名の UTF-8 エンコーディングを切り替える |

**スクリプトがうまく動かないときの切り分け順**

1. `/log=...` を付けて実行し、ログの最後のエラーを読む
2. 同じ操作を GUI で行い、成功するか確かめる（GUI でも失敗すれば接続・権限の問題）
3. `/ini=nul` を付けて、GUI の保存済み設定の影響を除く
4. タスクスケジューラーで失敗する場合は、実行ユーザーと作業フォルダー、鍵ファイルへのアクセス権を確認する

## 実務Tips

### 本番サーバーへの転送

- 本番用のサイトにはセッションの色（サイトの詳細設定の「色」）を設定しておく。タブや画面の色が変わり、開発と本番の取り違えを防げる
- 上書き前にサーバー側のファイルをバックアップする。`call cp -p index.html index.html.bak` のように `call` で実行できる
- 同期の `-delete` は便利だが事故も起きやすい。必ず `-preview`（GUI なら同期の確認画面）で対象を確認する
- 転送前後に「ディレクトリの比較」やファイルサイズで差分がないか確かめる。差分の中身は WinMerge などで確認する

### 転送モードと一時ファイル

- 転送モードは**バイナリ**を基本にする。テキストモードは改行コードを変換するため、意図しない差分の原因になる
- 大きなファイルは `ファイル名.filepart` という一時ファイルに転送してから名前を変える。受信側のプログラムがフォルダーを監視している場合は `.filepart` を対象外にするか、`put -resumesupport=off` で無効にする
- 書き込みはできるが名前変更が許可されないサーバーでは、一時ファイル方式が失敗するので `-resumesupport=off` を使う

### パスワードと鍵の管理

- サイトにパスワードを保存するなら「環境設定 → 保存」でマスターパスワードを設定する
- スクリプトにパスワードを平文で書かない。鍵認証にし、鍵ファイルのアクセス権を実行ユーザーだけに絞る
- 鍵のパスフレーズを毎回入力したくない場合は Pageant（PuTTY の認証エージェント）を使う

### 運用・自動化

- 自動処理は必ず `/log` を付け、ログは日付ごとに残す。障害時に「いつ・何を転送したか」を説明できる
- スクリプトには `option batch abort` と `option confirm off` を明示しておくと、確認待ちで止まらず、エラー時に確実に中断する
- `/ini=nul` を付けて GUI 側の設定変更の影響を受けないようにする
- 編集機能（`F4`）でサーバーのファイルを直接書き換えると履歴が残らない。設定ファイルの変更は手順書に残すか、構成管理ツールで行う

## 関連リンク

- [WinSCP ドキュメント](https://winscp.net/eng/docs/start)
- [スクリプトとタスクの自動化](https://winscp.net/eng/docs/scripting)
- [コマンドラインオプション](https://winscp.net/eng/docs/commandline)
- [.NET アセンブリ](https://winscp.net/eng/docs/library)
- [WinSCP ダウンロード](https://winscp.net/eng/download.php)
