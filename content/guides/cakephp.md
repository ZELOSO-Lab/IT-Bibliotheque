---
title: CakePHP 技術まとめ
slug: cakephp
excerpt: CakePHPの規約とMVC構成、Composerでのプロジェクト作成とDB設定、bin/cakeコマンドとBake、ORM・コントローラー・JSON APIのサンプル、よくあるエラーと対処、バージョンアップや運用の実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# CakePHP 技術まとめ

## 基礎

CakePHP は PHP の MVC フレームワークです。**「設定より規約（Convention over Configuration）」**が特徴で、テーブル名・クラス名・ファイル配置を規約どおりにすれば、設定をほとんど書かずに CRUD 画面が動きます。コード生成ツール **Bake** で、テーブルから Model・Controller・Template を一気に作れるのが強みです。

日本の業務システムでは CakePHP 2 / 3 時代に作られたシステムも多く残っています。**メジャーバージョン間で書き方が大きく違う**ため、検索した情報がどのバージョンのものかを必ず確認します。本ページは CakePHP 5 系を前提にしています。

### バージョンの目安

| バージョン | PHP | 特徴 |
| --- | --- | --- |
| 2.x | 5.x～ | 旧構成（`app/Controller` など）。配列ベースの ORM。保守案件で遭遇する |
| 3.x | 5.6～ | 現在の構成の原型。ORM が Table / Entity に刷新 |
| 4.x | 7.4～ | 型宣言の強化、Authentication / Authorization プラグイン |
| 5.x | 8.1～（マイナーにより 8.2～） | PHP 8 前提。厳密な型、名前付き引数の活用 |

必要な PHP のバージョンはマイナーリリースで上がることがあります。正確な要件は公式ドキュメントと `composer.json` の `require` で確認します。

### 命名規約（ここを外すと動かない）

| 対象 | 規約 | 例 |
| --- | --- | --- |
| テーブル | 複数形・スネークケース | `articles` `user_profiles` |
| Table クラス | 複数形・キャメルケース＋`Table` | `src/Model/Table/ArticlesTable.php` |
| Entity クラス | 単数形 | `src/Model/Entity/Article.php` |
| Controller | 複数形＋`Controller` | `src/Controller/ArticlesController.php` |
| テンプレート | `templates/コントローラー名/アクション名.php` | `templates/Articles/index.php` |
| 外部キー | 単数形＋`_id` | `user_id` |
| 自動日時 | `created` / `modified` カラム | Timestamp ビヘイビアで自動設定 |
| URL | `/コントローラー/アクション/引数` | `/articles/view/5` |

### ディレクトリ構成

| パス | 内容 |
| --- | --- |
| `config/` | 設定（`app.php` `app_local.php` `routes.php`）、マイグレーション |
| `src/Controller/` | コントローラー |
| `src/Model/Table/` `src/Model/Entity/` | ORM（テーブル操作・1行のデータ） |
| `templates/` | ビュー（テンプレート・レイアウト） |
| `webroot/` | 公開ディレクトリ（`index.php`、CSS、JS、画像） |
| `logs/` `tmp/` | ログとキャッシュ（Webサーバーから書き込み可能にする） |
| `vendor/` | Composer で入るライブラリ（Git 管理しない） |

## 環境構築

### 1. PHP と Composer を用意する

必要な PHP 拡張は **mbstring・intl・SimpleXML・PDO（使う DB のドライバー）** です。

```sh
php -v
php -m | grep -iE "intl|mbstring|simplexml|pdo"
composer --version
```

Windows（XAMPP など）では `php.ini` の `;extension=intl` の先頭の `;` を外して有効化します。`php --ini` で、実際に読み込まれている `php.ini` の場所を確認できます（CLI と Web サーバーで別の `php.ini` を使っていることがあります）。

### 2. プロジェクトを作成する

```sh
composer create-project --prefer-dist cakephp/app:~5.0 myapp
cd myapp
bin/cake server          # → http://localhost:8765/
```

Windows のコマンドプロンプトでは `bin\cake server` と実行します（`bin/cake.bat` が用意されています）。トップページの各チェック項目（PHP バージョン・拡張・`tmp` の書き込み・DB 接続）がすべて緑になれば準備完了です。

### 3. データベースを設定する

接続情報は `config/app_local.php`（Git 管理しないファイル）に書きます。作成時に `app_local.example.php` からコピーされています。

```php
// config/app_local.php
'Datasources' => [
    'default' => [
        'host' => 'localhost',
        'username' => 'my_app',
        'password' => 'secret',
        'database' => 'my_app',
        // 'port' => '3306',
    ],
],
```

ドライバー（MySQL / PostgreSQL / SQL Server / SQLite）は `config/app.php` 側の `driver` で指定します。デバッグモードは `app_local.php` の `'debug'` で、既定では環境変数 `DEBUG` で切り替えられるようになっています。

### 4. 権限を確認する（Linux サーバー）

```sh
# Webサーバーの実行ユーザー（例: www-data / apache）が書き込めるようにする
sudo chown -R www-data:www-data tmp logs
```

Apache で公開する場合は `mod_rewrite` を有効にし、ドキュメントルートを `webroot/` に向けます。

## コマンド

### 早見表：bin/cake

| 操作 | コマンド |
| --- | --- |
| サーバ起動 | `bin/cake server`（ポート変更は `-p 8080`、外部公開は `-H 0.0.0.0`） |
| コマンド一覧 | `bin/cake` |
| バージョン確認 | `bin/cake version` |
| ルート一覧 | `bin/cake routes` |
| URL がどのルートに一致するか | `bin/cake routes check /articles/view/1` |
| キャッシュ全削除 | `bin/cake cache clear_all` |
| テーブル定義キャッシュ削除 | `bin/cake schema_cache clear` |
| プラグイン有効化 | `bin/cake plugin load DebugKit` |

### 早見表：Bake

| 操作 | コマンド |
| --- | --- |
| Bake 一式（Model・Controller・Template） | `bin/cake bake all Articles` |
| Model だけ | `bin/cake bake model Articles` |
| Controller だけ | `bin/cake bake controller Articles` |
| Template だけ | `bin/cake bake template Articles` |
| 全テーブル分 | `bin/cake bake all --everything` |
| コマンドクラス | `bin/cake bake command Import` |
| 既存を上書き | `--force` を付ける |

### 早見表：マイグレーション

| 操作 | コマンド |
| --- | --- |
| マイグレーション作成 | `bin/cake bake migration CreateArticles` |
| カラム指定付きで作成 | `bin/cake bake migration CreateArticles title:string body:text published:boolean created modified` |
| マイグレーション実行 | `bin/cake migrations migrate` |
| 状態確認 | `bin/cake migrations status` |
| 1つ戻す | `bin/cake migrations rollback` |
| シード作成・実行 | `bin/cake bake seed Articles` → `bin/cake migrations seed`（新しい Migrations プラグインでは `bin/cake seeds run`） |

### 早見表：ルーティング

| 操作 | 構文 |
| --- | --- |
| ルート定義 | `$builder->connect('/articles', ['controller' => 'Articles', 'action' => 'index']);` |
| リソース | `$builder->resources('Articles');` |
| URL 生成 | `$this->Url->build(['action' => 'view', $id])` |
| リダイレクト | `return $this->redirect(['action' => 'index']);` |

### 早見表：ORM

| 操作 | 構文 |
| --- | --- |
| 全件 | `$this->Articles->find()->all();` |
| 条件 | `->find()->where(['published' => true])` |
| 比較演算子 | `->where(['created >=' => $from, 'title LIKE' => '%cake%'])` |
| 1件取得 | `$this->Articles->get($id);`（なければ例外） |
| 先頭1件 | `->find()->where([...])->first();`（なければ `null`） |
| 関連を取得 | `->find()->contain(['Users', 'Comments'])` |
| 保存 | `$entity = $this->Articles->newEntity($data); $this->Articles->save($entity);` |
| 削除 | `$this->Articles->delete($entity);` |
| 別テーブルを使う | `$users = $this->fetchTable('Users');` |

### 早見表：ビュー

| 操作 | 構文 |
| --- | --- |
| 変数を渡す | `$this->set(compact('articles'));` |
| エスケープ出力 | `<?= h($article->title) ?>` |
| フォーム | `<?= $this->Form->create($article) ?>` |
| Flash | `$this->Flash->success('保存しました');` |
| リンク | `<?= $this->Html->link('詳細', ['action' => 'view', $article->id]) ?>` |

## サンプル

### マイグレーション

`bin/cake bake migration CreateArticles title:string body:text published:boolean created modified` で生成される内容（抜粋）です。

```php
public function change(): void
{
    $table = $this->table('articles');
    $table->addColumn('title', 'string', ['limit' => 255, 'null' => false]);
    $table->addColumn('body', 'text', ['null' => false]);
    $table->addColumn('published', 'boolean', ['default' => false, 'null' => false]);
    $table->addColumn('created', 'datetime', ['null' => false]);
    $table->addColumn('modified', 'datetime', ['null' => false]);
    $table->create();
}
```

主キー `id` は自動で追加されます。

### Table クラス（バリデーションとカスタムファインダー）

```php
// src/Model/Table/ArticlesTable.php
namespace App\Model\Table;

use Cake\ORM\Query\SelectQuery;
use Cake\ORM\Table;
use Cake\Validation\Validator;

class ArticlesTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);
        $this->setTable('articles');
        $this->setPrimaryKey('id');
        $this->addBehavior('Timestamp');          // created / modified を自動設定
        $this->belongsTo('Users');
    }

    public function validationDefault(Validator $validator): Validator
    {
        $validator
            ->scalar('title')
            ->maxLength('title', 255, '255文字以内で入力してください')
            ->requirePresence('title', 'create')
            ->notEmptyString('title', 'タイトルは必須です');

        return $validator;
    }

    // $this->Articles->find('published') で呼べる
    public function findPublished(SelectQuery $query): SelectQuery
    {
        return $query->where(['Articles.published' => true])
            ->orderBy(['Articles.created' => 'DESC']);
    }
}
```

### Controller（一覧・登録）

```php
// src/Controller/ArticlesController.php
namespace App\Controller;

class ArticlesController extends AppController
{
    public function index()
    {
        $query = $this->Articles->find('published')->contain(['Users']);
        $articles = $this->paginate($query, ['limit' => 20]);
        $this->set(compact('articles'));
    }

    public function add()
    {
        $article = $this->Articles->newEmptyEntity();
        if ($this->request->is('post')) {
            $article = $this->Articles->patchEntity($article, $this->request->getData());
            if ($this->Articles->save($article)) {
                $this->Flash->success('保存しました');

                return $this->redirect(['action' => 'index']);
            }
            $this->Flash->error('保存できませんでした。入力内容を確認してください');
        }
        $this->set(compact('article'));
    }
}
```

### Template（フォーム）

```php
<!-- templates/Articles/add.php -->
<h1>記事の登録</h1>
<?= $this->Form->create($article) ?>
<?= $this->Form->control('title', ['label' => 'タイトル']) ?>
<?= $this->Form->control('body', ['label' => '本文', 'type' => 'textarea']) ?>
<?= $this->Form->control('published', ['label' => '公開する']) ?>
<?= $this->Form->button('保存') ?>
<?= $this->Form->end() ?>
```

`Form->create($article)` にエンティティを渡すと、バリデーションエラーが各項目の下に自動で表示されます。CSRF トークンも自動で埋め込まれます。

### JSON を返す API

```php
// config/routes.php の scope 内
$builder->setExtensions(['json']);
$builder->resources('Articles');

// src/Controller/Api/ArticlesController.php などで
use Cake\View\JsonView;

public function viewClasses(): array
{
    return [JsonView::class];
}

public function index()
{
    $articles = $this->Articles->find('published')->all();
    $this->set(compact('articles'));
    $this->viewBuilder()->setOption('serialize', ['articles']);
}
```

`/articles.json` や `Accept: application/json` ヘッダー付きのリクエストで JSON が返ります。

## エラー対応

`debug` が `true` のときは画面に詳しいエラーが出ます。本番（`debug` が `false`）では画面には汎用メッセージだけが出るため、**`logs/error.log` を確認**します。

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `Missing Controller` / ``Controller class `Foos` could not be found.`` | URL の綴り違い、クラス名・ファイル名・namespace が規約と不一致 | ファイル名とクラス名（`FoosController`）、namespace `App\Controller` を確認。`bin/cake routes` でルートを確認 |
| ``Template file `Articles/index.php` could not be found.`` | テンプレートがない、ディレクトリ名の大文字小文字違い | `templates/Articles/index.php` を作る。Linux では大文字小文字が区別される |
| ``Record not found in table `articles` `` | `get()` で該当 ID がない | 想定内なら `find()->where()->first()` で `null` を判定。`get()` の例外は 404 として扱われる |
| `CSRF token from either the request body or request headers did not match or is missing.` | フォームを `Form->create()` で作っていない、Ajax でトークンを送っていない | `Form->create()` を使う。Ajax は `X-CSRF-Token` ヘッダーに `$this->request->getAttribute('csrfToken')` の値を付ける |
| `Missing or incorrect CSRF cookie type.` | CSRF Cookie がない状態で POST（curl・外部システムからの直接 POST など） | 画面からの操作で再現確認。外部 API 用ルートは CSRF ミドルウェアの対象外にする設計を検討 |
| `Connection to Mysql could not be established: SQLSTATE[HY000] [2002] …` | DB サーバー未起動、ホスト名・ポート違い | DB の起動とホスト・ポートを確認。`localhost` と `127.0.0.1` で挙動が変わる環境もある |
| `SQLSTATE[HY000] [1045] Access denied for user …` | DB ユーザー・パスワード誤り | `config/app_local.php` を確認。DB 側でクライアントから接続できるか確認 |
| `` Database driver `…` cannot be used due to a missing PHP extension or unmet dependency.`` | `pdo_mysql` などの拡張が無効 | `php -m` で確認し、`php.ini` で有効化 |
| `ext-intl * -> it is missing from your system`（composer） | PHP の intl 拡張が無効 | `php.ini` で `extension=intl` を有効化。`php --ini` で読み込まれている ini を確認 |
| `Failed to open stream: Permission denied`（`tmp/` `logs/`） | Web サーバーの実行ユーザーに書き込み権限がない | `tmp` `logs` の所有者・権限を修正 |
| 保存されないがエラーも出ない | バリデーションエラー、または Entity の `$_accessible` にない項目 | `debug($entity->getErrors());` で確認。`$_accessible` を見直す |
| カラムを追加したのに反映されない | テーブル定義のキャッシュ | `bin/cake schema_cache clear` または `bin/cake cache clear_all` |

**「保存できない」の切り分け順**

1. `$this->Articles->save($article)` の戻り値が `false` か確認する
2. `debug($article->getErrors());` でバリデーションエラーを表示する
3. エラーがないのに値が入らない場合は、Entity の `$_accessible` に項目があるか確認する
4. SQL を確認する（DebugKit の SQL ログパネル、または `logs/` の queries ログ）

## 実務Tips

### 開発の進め方

- **DebugKit**（開発時のツールバー）で SQL・変数・処理時間を確認する。本番では無効にする
- まず Bake で生成し、規約に乗ったまま必要な部分だけを書き換える。規約から外れるほど設定とトラブルが増える
- ビジネスロジックは Controller に詰め込まず、Table クラスのメソッドやカスタムファインダーに寄せる
- `debug()` や `dd()` はコミット前に必ず消す。ログに残したいものは `Log::write('info', ...)` を使う

### セキュリティ

- テンプレートでの出力は**必ず `h()` でエスケープ**する（`Form` / `Html` ヘルパーは自動でエスケープ）
- SQL は ORM の配列条件を使う。`where()` に文字列連結した値を渡さない
- `patchEntity()` の `fields` オプションや `$_accessible` で、**更新可能な項目を限定**する（`role` や `is_admin` を勝手に書き換えられないように）
- 認証・認可は公式プラグイン（`cakephp/authentication` `cakephp/authorization`）を使う
- 本番は `debug` を必ず `false` にする。`true` のままだとスタックトレースや設定値が画面に出る

### 運用・バージョンアップ

- `config/app_local.php` と `.env` は Git に含めない。サーバーごとの差分はここに集める
- デプロイ後は `bin/cake cache clear_all` を実行する（古いテーブル定義・ルートのキャッシュが残ると不具合の原因になる）
- `composer install --no-dev --optimize-autoloader` で本番用に依存を入れる。`composer.lock` は必ずコミットする
- メジャーバージョンアップは公式の移行ガイドに沿って段階的に（例: 3 → 4 → 5）進める。公式の `cakephp/upgrade` ツールで機械的な書き換えの多くを自動化できる
- 2.x 系の保守案件は PHP のサポート切れとセットで問題になりやすい。延命か移行かを早めに判断する

## 関連リンク

- [CakePHP 5 公式ドキュメント（日本語）](https://book.cakephp.org/5/ja/)
- [CakePHP 公式サイト](https://cakephp.org/)
- [CakePHP API リファレンス](https://api.cakephp.org/)
- [CakePHP GitHub リポジトリ](https://github.com/cakephp/cakephp)
- [Composer](https://getcomposer.org/)
