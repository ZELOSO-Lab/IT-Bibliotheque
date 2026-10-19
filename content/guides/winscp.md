---
title: WinSCP 技術まとめ
slug: winscp
excerpt: WinSCPの接続設定、ファイル転送、同期、スクリプト実行などの技術情報をまとめています。
updated: 2026-10-19
---

# WinSCP 技術まとめ

## 基礎

Windows用のSFTP / SCP / FTPクライアント。

### 主な用途

- サーバへのファイル転送
- ディレクトリ同期
- 転送の自動化
- 設定ファイルの編集

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[WinSCP 公式ドキュメント](https://winscp.net/eng/docs/start)を参照してください。

## コマンド

### スクリプトで転送

```
open sftp://user@host.example.com/
put C:\work\app.zip /home/user/
exit
```

### スクリプトの実行

```
winscp.com /script=upload.txt /log=winscp.log
```

### ディレクトリ同期

```
synchronize remote C:\work\dist /var/www/html
```

### 早見表：GUI 操作

| 操作 | コマンド・構文 |
| --- | --- |
| 新しいセッション | `Ctrl+N` |
| 同期 | `コマンド → 同期（Ctrl+S）` |
| ディレクトリ比較 | `コマンド → ディレクトリの比較` |
| リモートで編集 | `ファイルを右クリック → 編集` |

### 早見表：スクリプト

| 操作 | コマンド・構文 |
| --- | --- |
| 接続 | `open sftp://user@host/ -hostkey="ssh-ed25519 ..."` |
| アップロード | `put C:\work\app.zip /home/user/` |
| ダウンロード | `get /var/log/app.log C:\logs\` |
| 終了 | `exit` |

### 早見表：実行

| 操作 | コマンド・構文 |
| --- | --- |
| スクリプト実行 | `winscp.com /script=upload.txt` |
| ログ出力 | `winscp.com /script=upload.txt /log=winscp.log` |
| ワンライナー | `winscp.com /command "open sftp://user@host/" "put a.txt" "exit"` |
| 戻り値 | `成功 0 / 失敗 1（バッチで %ERRORLEVEL% を確認）` |

### 早見表：同期・オプション

| 操作 | コマンド・構文 |
| --- | --- |
| リモートへ同期 | `synchronize remote C:\dist /var/www/html` |
| ミラー（削除含む） | `synchronize remote -delete C:\dist /var/www/html` |
| 除外 | `option exclude "*.tmp; .git/"` |
| 確認を無効化 | `option confirm off` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[WinSCP 公式ドキュメント](https://winscp.net/eng/docs/start)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[WinSCP 公式ドキュメント](https://winscp.net/eng/docs/start)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[WinSCP 公式ドキュメント](https://winscp.net/eng/docs/start)を参照してください。

## 関連リンク

- [WinSCP 公式ドキュメント](https://winscp.net/eng/docs/start)
