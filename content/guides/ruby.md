---
title: Ruby 技術まとめ
slug: ruby
excerpt: Rubyの基本文法と特徴、Windows・macOS・LinuxでのRubyとBundlerの環境構築、gemやRailsのよく使うコマンド、CSV集計やクラス定義のサンプル、よくあるエラーと対処、バージョン管理や文字コードの実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# Ruby 技術まとめ

## 基礎

Ruby は、まつもとゆきひろ氏が開発した日本発のプログラミング言語です。「読みやすく、書いていて楽しい」ことを重視しており、少ないコードで意図をそのまま表現できます。Web フレームワーク **Ruby on Rails** とともに広まり、スタートアップや自社サービスの開発で多く使われています。

### 主な用途

| 用途 | 代表的なライブラリ・ツール | 一言でいうと |
| --- | --- | --- |
| Webアプリ | Ruby on Rails、Sinatra | DB を使う Web サービスを素早く作る |
| API | Rails（API モード）、Grape | スマホアプリや SPA のバックエンド |
| スクリプト・自動化 | 標準ライブラリ（`csv` `json` `fileutils`）、Rake | ファイル処理・定型作業のバッチ化 |
| インフラ・開発ツール | Fluentd、RuboCop | ログ収集、静的解析など |
| プロダクト開発 | Rails＋各種 gem | 少人数で機能を素早く作り、改善を回す |

### まず押さえる用語

| 用語 | 意味 | 現場での注意点 |
| --- | --- | --- |
| gem | Ruby のライブラリ（パッケージ） | `gem install` で入れるが、プロジェクトでは Bundler 経由で管理する |
| Bundler | プロジェクトごとの gem のバージョンを管理するツール | `Gemfile` と `Gemfile.lock` をGit管理する |
| `bundle exec` | Gemfile.lock に固定されたバージョンでコマンドを実行する | 付け忘れると別バージョンの gem で動いてエラーになる |
| irb | 対話的に Ruby を実行する環境（REPL） | 小さなコードの動作確認に便利 |
| ブロック | `{ \|x\| ... }` や `do ... end` で渡す処理のかたまり | `each` `map` などで多用する |
| シンボル | `:name` のような識別子。ハッシュのキーによく使う | `h[:name]` と `h["name"]` は**別のキー** |
| バージョン管理ツール | rbenv など。複数の Ruby を切り替える | プロジェクトの `.ruby-version` にバージョンを書く |

### 基本文法

```ruby
name = "Taro"
items = [1, 2, 3]                      # 配列
user = { id: 1, name: "Taro" }         # ハッシュ（キーはシンボル）

puts "Hello #{name}"                   # 式展開はダブルクォートのみ
puts "OK" if items.size > 0            # 後置 if

doubled = items.map { |x| x * 2 }      # => [2, 4, 6]
evens = items.select(&:even?)          # => [2]

def add(a, b)
  a + b                                # 最後に評価した値が戻り値（return 不要）
end

def greet(name:, polite: false)        # キーワード引数
  polite ? "こんにちは、#{name}さん" : "やあ、#{name}"
end

value = user[:email] || "未設定"        # nil なら既定値
city = user.dig(:address, :city)       # 深い階層も nil 安全に取り出す
```

Ruby では **`nil` と `false` だけが偽**です。`0` や空文字 `""` も真として扱われる点は、他の言語と違うので注意します。

## 環境構築

### 1. Ruby をインストールする

| OS | 方法 | 補足 |
| --- | --- | --- |
| Windows | **RubyInstaller**（Devkit 付きを選ぶ） | インストール最後の `ridk install` で MSYS2 開発ツールを入れる。C 拡張を含む gem のビルドに必要 |
| macOS | rbenv（Homebrew で導入） | OS 付属の Ruby は使わない |
| Linux | rbenv ＋ ruby-build、またはディストリビューションのパッケージ | 案件ごとにバージョンが違うなら rbenv |

Rails 開発を Windows で本格的に行う場合は、**WSL2（Ubuntu）上に環境を作る**ほうがトラブルが少なく、本番（Linux）との差も小さくなります。

### 2. rbenv で Ruby を入れる（macOS / Linux / WSL2）

```sh
rbenv install --list          # インストールできるバージョン一覧
rbenv install 3.3.6           # 例: バージョンを指定してインストール
rbenv global 3.3.6            # 既定のバージョン
cd myproject && rbenv local 3.3.6   # このフォルダだけ（.ruby-version が作られる）
ruby -v
```

### 3. Bundler でプロジェクトの gem を管理する

```sh
mkdir myproject && cd myproject
bundle init                   # Gemfile を作成
bundle add nokogiri           # Gemfile に追記してインストール
bundle install                # Gemfile.lock どおりにインストール
bundle exec ruby app.rb       # 固定したバージョンで実行
```

```ruby
# Gemfile
source "https://rubygems.org"

gem "nokogiri"
gem "rails", "~> 7.2"         # 7.2 以上 8.0 未満

group :development, :test do
  gem "rspec"
  gem "rubocop", require: false
end
```

`~>` は「悲観的バージョン指定」で、`"~> 7.2"` は `>= 7.2` かつ `< 8.0` を意味します。

### 4. 社内プロキシ環境の場合

```sh
# 環境変数で指定（gem / bundle とも参照する）
export HTTP_PROXY=http://proxy.example.co.jp:8080
export HTTPS_PROXY=http://proxy.example.co.jp:8080
# Windows（コマンドプロンプト）は set HTTP_PROXY=... 
gem install rake --http-proxy http://proxy.example.co.jp:8080
```

### 5. 動作確認

```sh
ruby -v
gem -v
bundle -v
irb                           # 終了は exit
```

## コマンド

### Ruby・gem・Bundler

| 操作 | コマンド |
| --- | --- |
| 実行 | `ruby app.rb` |
| 1行実行 | `ruby -e 'puts RUBY_VERSION'` |
| 構文チェック | `ruby -c app.rb` |
| 対話環境 | `irb` |
| gem のインストール（全体） | `gem install rails` |
| インストール済み gem 一覧 | `gem list` |
| gem 追加（プロジェクト） | `bundle add rails` |
| 依存インストール | `bundle install` |
| 指定 gem だけ更新 | `bundle update nokogiri` |
| 更新可能な gem | `bundle outdated` |
| gem の場所 | `bundle info nokogiri` |
| Gemfile.lock のバージョンで実行 | `bundle exec rspec` |

`bundle update` を引数なしで実行すると**すべての gem が更新**されます。意図しない更新を避けるため、gem 名を指定します。

### Rails

| 操作 | コマンド |
| --- | --- |
| 新規作成 | `rails new myapp` （DB 指定は `-d postgresql` など） |
| サーバ起動 | `bin/rails server` （`-b 0.0.0.0 -p 3000` で外部公開・ポート指定） |
| コンソール | `bin/rails console` |
| scaffold | `bin/rails g scaffold Post title:string body:text` |
| モデル作成 | `bin/rails g model User name:string email:string` |
| マイグレーション | `bin/rails db:migrate` |
| 1つ戻す | `bin/rails db:rollback` |
| ルーティング確認 | `bin/rails routes` |
| タスク一覧 | `bin/rails -T` |

Rails アプリの中では `rails` ではなく **`bin/rails`** を使います（そのアプリの Gemfile.lock のバージョンで動くため）。

### 早見表：Enumerable（配列・ハッシュ）

| 操作 | コマンド・構文 |
| --- | --- |
| 変換 | `a.map { \|x\| x * 2 }` |
| 絞り込み | `a.select(&:even?)` / 除外は `a.reject(&:nil?)` |
| 検索 | `users.find { \|u\| u.id == id }` |
| 合計 | `a.sum` / `items.sum(&:price)` |
| グループ化 | `users.group_by(&:dept)` |
| 件数 | `a.count(&:even?)` / `a.tally` （出現回数のハッシュ） |
| 並べ替え | `users.sort_by(&:age)` / 降順は `.sort_by { \|u\| -u.age }` |
| インデックス付き | `a.each_with_index { \|x, i\| ... }` |
| ハッシュのループ | `h.each { \|key, value\| ... }` |

### 早見表：文字列・ファイル

| 操作 | コマンド・構文 |
| --- | --- |
| 分割・結合 | `s.split(",")` / `a.join(",")` |
| 前後の空白除去 | `s.strip` |
| ファイル読み込み | `File.read("a.txt", encoding: "utf-8")` |
| 1行ずつ | `File.foreach("a.txt") { \|line\| ... }` |
| 書き込み | `File.write("out.txt", text)` |
| JSON | `JSON.parse(str, symbolize_names: true)` / `JSON.pretty_generate(obj)` |

## サンプル

### CSV を部署別に集計する（Excel 対応）

```ruby
# 売上 CSV を部署ごとに集計し、Excel で開ける CSV に出力する
require "csv"

src = ARGV[0] || "sales.csv"
out = ARGV[1] || "summary.csv"

totals = Hash.new(0)
# BOM 付き UTF-8 にも対応（"bom|utf-8"）。Shift_JIS なら "cp932:utf-8"
CSV.foreach(src, headers: true, encoding: "bom|utf-8") do |row|
  amount = Integer(row["金額"], exception: false)
  if amount.nil?
    warn "不正な行をスキップ: #{row.to_h}"
    next
  end
  totals[row["部署"]] += amount
end

# Excel で文字化けしないよう BOM を付けて書き出す
File.open(out, "w:utf-8") do |f|
  f.write("﻿")
  f.write(CSV.generate_line(%w[部署 合計]))
  totals.sort.each { |dept, total| f.write(CSV.generate_line([dept, total])) }
end
puts "#{totals.size} 部署を #{out} に出力しました"
```

```sh
ruby sales.rb 売上.csv 集計.csv
```

`Hash.new(0)` は存在しないキーの既定値を `0` にするため、そのまま `+=` で集計できます。`Integer(..., exception: false)` は変換できない値で例外を出さず `nil` を返します。

### クラスと Enumerable

```ruby
class User
  attr_reader :name, :dept

  def initialize(name:, dept:, active: true)
    @name = name
    @dept = dept
    @active = active
  end

  def active? = @active

  def to_s
    "#{name}（#{dept}）"
  end
end

users = [
  User.new(name: "山田", dept: "営業"),
  User.new(name: "佐藤", dept: "開発"),
  User.new(name: "鈴木", dept: "営業", active: false),
]

active_names = users.select(&:active?).map(&:name)
p active_names                                   # => ["山田", "佐藤"]

users.group_by(&:dept).each do |dept, members|
  puts "#{dept}: #{members.map(&:name).join(', ')}"
end
# 営業: 山田, 鈴木
# 開発: 佐藤
```

`select(&:active?)` は `select { |u| u.active? }` の省略形です。`?` で終わるメソッドは真偽値を返す、という命名の慣習があります。

### 標準ライブラリだけで JSON API を呼ぶ

```ruby
require "net/http"
require "json"
require "uri"

def get_json(url, timeout: 10)
  uri = URI(url)
  Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https",
                  open_timeout: timeout, read_timeout: timeout) do |http|
    res = http.get(uri.request_uri, "Accept" => "application/json")
    raise "HTTP #{res.code}: #{url}" unless res.is_a?(Net::HTTPSuccess)

    JSON.parse(res.body)
  end
rescue Errno::ECONNREFUSED, Net::OpenTimeout, Net::ReadTimeout => e
  raise "接続できません: #{e.class}: #{e.message}"
end
```

タイムアウトを必ず指定します。Rails などでは Faraday などの HTTP クライアント gem を使うことも多いですが、考え方は同じです。

## エラー対応

Ruby 3.4 以降はエラーメッセージ中のメソッド名が `'upcase'` のようにシングルクォートで囲まれます（3.3 以前はバッククォート）。また 3.2 以前は `for nil:NilClass` のように表示されます。

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `undefined method 'upcase' for nil (NoMethodError)` | `nil` に対してメソッドを呼んだ（ハッシュのキー違い、検索結果なし） | 直前の値を `p` で確認。`user&.name` で nil 安全に呼ぶか、nil の場合の分岐を追加 |
| `undefined method 'frist' for an instance of Array (NoMethodError)` | メソッド名のタイプミス | 表示される `Did you mean?` の候補を確認 |
| `undefined local variable or method 'foo' for main (NameError)` | 変数・メソッド名の誤り、スコープ外 | スペルと定義場所を確認 |
| `uninitialized constant Foo (NameError)` | クラス名の誤り、`require` 忘れ、Rails ではファイル名とクラス名の不一致 | `require` を確認。Rails は `user_profile.rb` に `UserProfile` のように命名規約を守る |
| `cannot load such file -- nokogiri (LoadError)` | gem 未インストール、`bundle exec` なしで実行 | `bundle install` を実行し、`bundle exec ruby app.rb` で実行 |
| `wrong number of arguments (given 0, expected 1) (ArgumentError)` | メソッドの引数の数が違う | メソッド定義と呼び出し側を照合 |
| `no implicit conversion of Integer into String (TypeError)` | 文字列と数値を `+` で連結 | `"#{num}"` で式展開するか、`to_s` で変換 |
| `String can't be coerced into Integer (TypeError)` | 数値と文字列を足した（`1 + "2"`） | `to_i` / `Integer()` で数値に変換 |
| `invalid value for Integer(): "abc" (ArgumentError)` | 数値に変換できない文字列 | 入力を検証する。`Integer(s, exception: false)` で nil を返させる |
| `key not found: :b (KeyError)` | `fetch` で存在しないキーを指定 | キー（シンボルか文字列か）を確認。既定値は `fetch(:b, nil)` |
| `syntax error, unexpected end-of-input` | `end` の不足 | `if` / `def` / `do` と `end` の対応を確認。`ruby -c` で構文チェック |
| `invalid byte sequence in UTF-8 (ArgumentError)` | Shift_JIS などのデータを UTF-8 として処理 | 読み込み時に `encoding: "cp932:utf-8"` を指定して変換 |
| `U+2460 from UTF-8 to Shift_JIS (Encoding::UndefinedConversionError)` | Shift_JIS に存在しない文字（①など）を変換 | `Windows-31J`（CP932）を指定する。`undef: :replace` で置換も可 |
| `No such file or directory @ rb_sysopen - data.csv (Errno::ENOENT)` | 相対パスの基準がカレントディレクトリ | `File.join(__dir__, "data.csv")` でスクリプト基準のパスにする |
| `You have already activated rake X, but your Gemfile requires rake Y.` | 全体にインストールされた別バージョンの gem が先に読み込まれた | `bundle exec` を付けて実行 |
| `Migrations are pending. To resolve this issue, run: bin/rails db:migrate` | 未実行のマイグレーションがある（Rails） | `bin/rails db:migrate` |
| `ActionController::InvalidAuthenticityToken` | CSRF トークンがない・不一致（Rails） | フォームは `form_with` で作る。JS からの送信は CSRF トークンをヘッダーに付ける |
| `A server is already running` | 前回の Rails サーバーが残っている、または `tmp/pids/server.pid` が残っている | プロセスを停止する。プロセスがなければ `tmp/pids/server.pid` を削除 |
| gem インストール時に `Failed to build gem native extension.` | C 拡張のビルドに必要な開発ツール・ライブラリがない | Windows は `ridk install`、Linux は `build-essential` や各ライブラリの `-dev` パッケージを入れる。詳細は表示される `mkmf.log` を確認 |

## 実務Tips

### バージョン・依存管理

- プロジェクトのルートに **`.ruby-version`** を置き、Ruby のバージョンをチームで揃える
- **`Gemfile.lock` は必ずコミット**する。本番・CI・各開発者が同じバージョンの gem を使える
- コマンドは原則 **`bundle exec`** を付けて実行する（Rails は `bin/rails`）
- Ruby と Rails はサポート期限がある。期限切れのバージョンはセキュリティ修正が出ないため、計画的にアップデートする
- `bundle update` は gem 名を指定して少しずつ。まとめて更新すると原因の切り分けが難しくなる

### 書き方の作法

- インデントはスペース2つが Ruby の慣習。RuboCop で書き方をチームで統一する
- 文字列を変更しないことを明示するため、ファイル先頭に `# frozen_string_literal: true` を書く慣習がある
- `?` で終わるメソッドは真偽値、`!` で終わるメソッドは「破壊的・危険」なバージョン（`sort!` は元の配列を変える）
- 例外は `rescue => e` で握りつぶさず、ログに出してから再送出するか、適切に処理する
- テストは RSpec か標準の Minitest。Rails は標準で Minitest が組み込まれている

### 文字コード・Windows 対策

- ソースファイルは UTF-8 で保存する（Ruby 2.0 以降、ソースの既定は UTF-8）
- Windows 由来の CSV は `CSV.foreach(path, encoding: "cp932:utf-8")` のように**読み込み時に変換**する
- 書き出しで Excel 向けにするなら、BOM（`"﻿"`）を先頭に付けた UTF-8 にする
- C 拡張を含む gem は Windows でビルドに失敗しやすい。Rails 開発は WSL2 や Docker を検討する

### Rails の現場で

- N+1 問題（ループ内で1件ずつ SQL が発行される）に注意。関連データは `includes` でまとめて読む
- 秘密情報は `bin/rails credentials:edit` で暗号化して管理し、`config/master.key` は Git にコミットしない
- マイグレーションは一度共有したら書き換えず、新しいマイグレーションを追加して修正する
- `bin/rails console` で本番データを直接変更する作業は、手順とコマンドを事前にレビューしてから行う

## 関連リンク

- [Ruby 公式サイト（日本語）](https://www.ruby-lang.org/ja/)
- [Ruby ドキュメント](https://www.ruby-lang.org/ja/documentation/)
- [Ruby リファレンスマニュアル](https://docs.ruby-lang.org/ja/)
- [RubyInstaller for Windows](https://rubyinstaller.org/)
- [RubyGems.org](https://rubygems.org/)
- [Bundler](https://bundler.io/)
- [Ruby on Rails Guides](https://guides.rubyonrails.org/)
- [Ruby on Rails 公式サイト](https://rubyonrails.org/)
