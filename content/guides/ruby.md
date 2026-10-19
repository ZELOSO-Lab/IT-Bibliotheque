---
title: Ruby 技術まとめ
slug: ruby
excerpt: Rubyの基本文法、環境構築、gem、サンプルコードなどの技術情報をまとめています。
updated: 2026-10-19
---

# Ruby 技術まとめ

## 基礎

読みやすさを重視したスクリプト言語。Ruby on Railsで有名。

### 主な用途

- Webアプリ（Ruby on Rails）
- スクリプト・自動化
- API
- スタートアップのプロダクト開発

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[Ruby 公式ドキュメント](https://www.ruby-lang.org/ja/documentation/)を参照してください。

## コマンド

### gemのインストール

```
gem install rails
bundle install
```

### Railsアプリ作成と起動

```
rails new myapp
cd myapp
bin/rails server
```

### 配列の変換・絞り込み

```
names = users.select { |u| u.active }.map(&:name)
```

### 早見表：コマンド

| 操作 | コマンド・構文 |
| --- | --- |
| 実行 | `ruby app.rb` |
| 対話環境 | `irb` |
| gem 追加 | `bundle add rails` |
| 依存インストール | `bundle install` |

### 早見表：基本構文

| 操作 | コマンド・構文 |
| --- | --- |
| 文字列展開 | `"Hello #{name}"` |
| 配列・ハッシュ | `a = [1, 2, 3] h = { name: "Taro", age: 20 }` |
| 条件 | `puts "OK" if x > 0` |
| メソッド | `def add(a, b) = a + b` |

### 早見表：Enumerable

| 操作 | コマンド・構文 |
| --- | --- |
| 変換 | `a.map { \|x\| x * 2 }` |
| 絞り込み | `a.select(&:even?)` |
| 合計 | `a.sum` |
| グループ化 | `users.group_by(&:dept)` |

### 早見表：Rails

| 操作 | コマンド・構文 |
| --- | --- |
| 新規作成 | `rails new myapp` |
| サーバ起動 | `bin/rails server` |
| scaffold | `bin/rails g scaffold Post title:string body:text` |
| マイグレーション | `bin/rails db:migrate` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[Ruby 公式ドキュメント](https://www.ruby-lang.org/ja/documentation/)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[Ruby 公式ドキュメント](https://www.ruby-lang.org/ja/documentation/)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[Ruby 公式ドキュメント](https://www.ruby-lang.org/ja/documentation/)を参照してください。

## 関連リンク

- [Ruby 公式ドキュメント](https://www.ruby-lang.org/ja/documentation/)
