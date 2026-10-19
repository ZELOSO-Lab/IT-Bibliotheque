---
title: TortoiseSVN 技術まとめ
slug: tortoisesvn
excerpt: TortoiseSVNのチェックアウト、更新、コミット、差分の確認、ログ表示、競合の解決などの技術情報をまとめています。
updated: 2026-10-19
---

# TortoiseSVN 技術まとめ

## 基礎

エクスプローラーの右クリックからSVNを操作できるWindows用クライアント。

### 主な用途

- エクスプローラーからのSVN操作
- 差分・履歴の確認
- 競合の解決
- リリース前の変更確認

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[TortoiseSVN 公式ドキュメント](https://tortoisesvn.net/docs/release/TortoiseSVN_ja/index.html)を参照してください。

## コマンド

### 基本の流れ（右クリック）

```
SVN更新 → 修正 → SVNコミット
（コミット前に「変更をチェック」で差分を確認）
```

### アイコンの意味

```
緑のチェック   変更なし
赤の！        変更あり
黄色の！      競合
青の＋        追加予定
```

### 変更を取り消す

```
右クリック → TortoiseSVN → 元に戻す
```

### 履歴を見る

```
右クリック → TortoiseSVN → ログを表示
（2つのリビジョンを選んで差分を比較）
```

### 早見表：基本操作（右クリック）

| 操作 | コマンド・構文 |
| --- | --- |
| 取得 | `SVNチェックアウト` |
| 最新化 | `SVN更新` |
| 反映 | `SVNコミット` |
| コミット前の確認 | `TortoiseSVN → 変更をチェック` |

### 早見表：ファイル操作

| 操作 | コマンド・構文 |
| --- | --- |
| 追加 | `TortoiseSVN → 追加` |
| 削除（履歴を残す） | `TortoiseSVN → 削除` |
| 名前変更 | `TortoiseSVN → 名前の変更` |
| 変更を取り消す | `TortoiseSVN → 元に戻す` |

### 早見表：履歴・差分

| 操作 | コマンド・構文 |
| --- | --- |
| 履歴を見る | `TortoiseSVN → ログを表示` |
| 作業コピーとの差分 | `TortoiseSVN → 差分` |
| 誰がいつ変えたか | `TortoiseSVN → 注釈` |
| 過去の版に戻す | `ログ → 右クリック → このリビジョンに復元` |

### 早見表：トラブル対応

| 操作 | コマンド・構文 |
| --- | --- |
| 競合（黄色の！） | `競合の編集 → 解決済み` |
| ロック・中断後 | `TortoiseSVN → クリーンアップ` |
| ブランチ切替 | `TortoiseSVN → 切り替え` |
| ブランチを取り込む | `TortoiseSVN → マージ` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[TortoiseSVN 公式ドキュメント](https://tortoisesvn.net/docs/release/TortoiseSVN_ja/index.html)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[TortoiseSVN 公式ドキュメント](https://tortoisesvn.net/docs/release/TortoiseSVN_ja/index.html)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[TortoiseSVN 公式ドキュメント](https://tortoisesvn.net/docs/release/TortoiseSVN_ja/index.html)を参照してください。

## 関連リンク

- [TortoiseSVN 公式ドキュメント](https://tortoisesvn.net/docs/release/TortoiseSVN_ja/index.html)
