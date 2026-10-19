---
title: Tera Term 技術まとめ
slug: tera-term
excerpt: Tera TermのSSH接続、ログ取得、マクロ（TTL）などの技術情報をまとめています。
updated: 2026-10-19
---

# Tera Term 技術まとめ

## 基礎

Windows用のターミナルエミュレータ。SSH / シリアル接続で利用。

### 主な用途

- サーバへのSSH接続
- シリアル接続
- 作業ログの取得
- マクロによる自動化

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[Tera Term 公式ドキュメント](https://teratermproject.github.io/)を参照してください。

## コマンド

### コマンドラインで接続

```
ttermpro.exe host.example.com:22 /ssh2 /auth=password /user=admin
```

### マクロ（TTL）で接続

```
connect 'host.example.com:22 /ssh2 /auth=password /user=admin /ask4passwd'
wait '$'
sendln 'ls -l'
```

### ログ取得

```
ファイル → ログ → 保存先を指定して開始
（設定で自動ログ取得も可能）
```

### 早見表：接続

| 操作 | コマンド・構文 |
| --- | --- |
| SSH 接続（CLI） | `ttermpro.exe host:22 /ssh2 /auth=password /user=admin` |
| 鍵認証 | `/auth=publickey /keyfile=C:\keys\id_rsa` |
| シリアル接続 | `ttermpro.exe /C=3 /BAUD=9600` |
| 複製 | `ファイル → セッションの複製（Alt+D）` |

### 早見表：ログ

| 操作 | コマンド・構文 |
| --- | --- |
| ログ開始 | `ファイル → ログ` |
| 自動ログ | `設定 → その他の設定 → ログ → 標準のログファイル名` |
| タイムスタンプ | `ログ ダイアログで「タイムスタンプ」をオン` |
| ファイル名の日時 | `teraterm_&h_%Y%m%d_%H%M%S.log` |

### 早見表：マクロ（TTL）

| 操作 | コマンド・構文 |
| --- | --- |
| 接続 | `connect 'host:22 /ssh2 /auth=password /user=admin /ask4passwd'` |
| 待機 | `wait '$'` |
| 送信 | `sendln 'ls -l'` |
| ログ開始 | `logopen 'C:\log\a.log' 0 0` |

### 早見表：便利操作

| 操作 | コマンド・構文 |
| --- | --- |
| コピー | `範囲選択で自動コピー` |
| 貼り付け | `右クリック / Alt+V` |
| ファイル送信（SCP） | `ファイル → SSH SCP` |
| 設定保存 | `設定 → 設定の保存（TERATERM.INI）` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[Tera Term 公式ドキュメント](https://teratermproject.github.io/)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[Tera Term 公式ドキュメント](https://teratermproject.github.io/)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[Tera Term 公式ドキュメント](https://teratermproject.github.io/)を参照してください。

## 関連リンク

- [Tera Term 公式ドキュメント](https://teratermproject.github.io/)
