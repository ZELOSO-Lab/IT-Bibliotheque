---
title: PHP 技術まとめ
slug: php
excerpt: PHPの基本文法と特徴、Windows・Linux・Dockerでの環境構築とphp.iniの初期設定、CLIやComposerのよく使うコマンド、PDOによるDB操作やフォーム処理のサンプル、よくあるエラーと対処、セキュリティを中心とした実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# PHP 技術まとめ

## 基礎

PHP は Web アプリケーション開発で広く使われているサーバーサイドのスクリプト言語です。HTML の中に直接埋め込んで書けるため手軽に始められ、WordPress などの CMS や、Laravel・CakePHP などのフレームワークを使った業務システムで多く使われています。レンタルサーバーでもほぼ確実に動くのが強みです。

### 主な用途

| 用途 | 代表的なソフトウェア・フレームワーク | 一言でいうと |
| --- | --- | --- |
| Webアプリケーション | Laravel、Symfony、CakePHP | 会員管理・予約・EC などの Web システム |
| CMS | WordPress、Drupal | コーポレートサイト・ブログ・メディア |
| 業務システム | 各種フレームワーク＋MySQL / PostgreSQL | 社内の申請・管理画面 |
| API | Laravel、Slim | スマホアプリや SPA のバックエンド |
| バッチ処理 | PHP CLI ＋ cron / タスクスケジューラ | 定期的な集計・データ連携 |

### まず押さえる特徴

| 項目 | 内容 | 現場での注意点 |
| --- | --- | --- |
| 実行モデル | リクエストごとにスクリプトを実行し、終わったら状態を破棄する | リクエストをまたいで値を持つには、セッション・DB・キャッシュを使う |
| 実行方式 | Apache のモジュール（mod_php）、または **PHP-FPM** ＋ nginx | 新規構築は PHP-FPM が主流 |
| php.ini | PHP 全体の設定ファイル | CLI と Web サーバーで**別の php.ini** を読んでいることがある |
| バージョン | PHP 8 系で型やエラーの扱いが厳しくなった | PHP 7 以前のコードは PHP 8 で警告・エラーが増える。サポート期限切れのバージョンは使わない |
| Composer | PHP の標準的なパッケージ管理ツール | `composer.json` と `composer.lock` をGit管理する |
| 型 | 動的型付け。型宣言（`int` `string` `?array` など）も書ける | ファイル先頭に `declare(strict_types=1);` を書くと型の自動変換を抑えられる |

### 基本文法

```php
<?php
declare(strict_types=1);

$name = 'Taro';
$items = [1, 2, 3];
$user = ['id' => 1, 'name' => 'Taro'];        // 連想配列

echo "Hello {$name}\n";                       // ダブルクォートは変数展開あり
echo 'Hello {$name}' . "\n";                  // シングルクォートは展開なし

foreach ($user as $key => $value) {
    echo "{$key}: {$value}\n";
}

function add(int $a, int $b): int
{
    return $a + $b;
}

$q = $_GET['q'] ?? '';                        // null合体演算子
$label = match ($status) {                    // PHP 8 の match 式
    'active' => '有効',
    'stopped' => '停止',
    default => '不明',
};
```

## 環境構築

### 1. インストール方法を選ぶ

| 方法 | 向いている場面 |
| --- | --- |
| XAMPP（Apache＋PHP＋MariaDB 一式） | Windows でとにかく早く動かしたい、学習用 |
| 公式バイナリ（Windows）/ パッケージ（Linux） | CLI やバッチ、本番に近い構成で動かしたい |
| Docker（公式 `php` イメージ） | チームで環境を揃えたい、本番とバージョンを合わせたい |

### 2. Windows に公式バイナリを入れる

1. windows.php.net から **x64 の Thread Safe 版**（Apache で使わない場合は Non Thread Safe でも可）の zip をダウンロード
2. `C:\php` などに展開し、そのフォルダを環境変数 `PATH` に追加
3. `php.ini-development` をコピーして `php.ini` にリネーム
4. `php.ini` で必要な拡張を有効化（行頭の `;` を外す）

```ini
extension_dir = "ext"
extension=mbstring
extension=openssl
extension=pdo_mysql
extension=curl
date.timezone = Asia/Tokyo
```

### 3. Linux（Ubuntu など）

```sh
sudo apt install php-cli php-mbstring php-xml php-curl php-mysql
php -v
php -m          # 有効な拡張モジュール一覧
```

### 4. Docker の場合

```yaml
# compose.yaml
services:
  web:
    image: php:8.3-apache
    ports:
      - "8080:80"
    volumes:
      - ./src:/var/www/html
```

`docker compose up -d` で起動し、`http://localhost:8080` にアクセスします。拡張が必要な場合は Dockerfile で `docker-php-ext-install pdo_mysql` のように追加します。

### 5. Composer をインストールする

Windows は公式サイトの `Composer-Setup.exe`、Linux・macOS は公式サイトに記載のインストール手順を使います。

```sh
composer --version
composer init               # composer.json を対話的に作成
composer require monolog/monolog
```

### 6. 動作確認

```sh
php -v
php --ini                   # 読み込まれている php.ini の場所
php -S localhost:8000       # カレントフォルダを組み込みサーバーで公開
```

`index.php` に `<?php phpinfo();` と書いてブラウザで開くと、**Web サーバー側の**設定を確認できます。確認後は必ず削除します（設定情報が外部に見えてしまうため）。

## コマンド

### PHP CLI

| 操作 | コマンド |
| --- | --- |
| バージョン | `php -v` |
| スクリプト実行 | `php batch.php arg1 arg2` |
| 組込みサーバ | `php -S localhost:8000` （公開フォルダ指定は `-t public`） |
| 構文チェック | `php -l index.php` |
| 1行実行 | `php -r 'echo PHP_VERSION, PHP_EOL;'` |
| 拡張モジュール一覧 | `php -m` |
| php.ini の場所 | `php --ini` |
| 設定値の確認 | `php -i \| grep memory_limit` （Windows は `php -i \| findstr memory_limit`） |
| 対話モード | `php -a` |

### Composer

```sh
composer install                      # composer.lock 通りにインストール
composer install --no-dev -o          # 本番用（開発用パッケージ除外＋オートロード最適化）
composer require guzzlehttp/guzzle    # パッケージ追加
composer require --dev phpunit/phpunit
composer update vendor/package        # 指定パッケージだけ更新
composer remove vendor/package
composer outdated                     # 更新可能なパッケージ
composer dump-autoload                # オートロードの再生成
composer audit                        # 既知の脆弱性チェック
```

`composer update` を引数なしで実行すると**全パッケージが更新**されます。本番デプロイでは `update` ではなく `install` を使います。

### PDO で SELECT

```php
$stmt = $pdo->prepare('SELECT * FROM users WHERE id = :id');
$stmt->execute([':id' => $id]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
```

### 早見表：関数・クラス

| 操作 | コマンド・構文 |
| --- | --- |
| 関数 | `function add(int $a, int $b): int { return $a + $b; }` |
| クラス | `class User { public function __construct(public string $name) {} }` |
| アロー関数 | `$f = fn($x) => $x * 2;` |
| 名前空間 | `namespace App\Models; use App\Models\User;` |

### 早見表：配列関数

| 操作 | コマンド・構文 |
| --- | --- |
| 変換 | `array_map(fn($x) => $x * 2, $a)` |
| 絞り込み | `array_filter($a, fn($x) => $x > 0)` |
| キー存在 | `array_key_exists('key', $m)` / `isset($m['key'])` |
| 値の検索 | `in_array('a', $list, true)` （第3引数 `true` で厳密比較） |
| 列の取り出し | `array_column($users, 'name', 'id')` |
| JSON | `json_encode($m, JSON_UNESCAPED_UNICODE); json_decode($json, true);` |

### 早見表：文字列（日本語）

| 操作 | コマンド・構文 |
| --- | --- |
| 文字数 | `mb_strlen($s)` （`strlen` はバイト数） |
| 部分文字列 | `mb_substr($s, 0, 10)` |
| 文字コード変換 | `mb_convert_encoding($s, 'UTF-8', 'SJIS-win')` |
| HTML エスケープ | `htmlspecialchars($s, ENT_QUOTES, 'UTF-8')` |
| 日時 | `(new DateTimeImmutable('now', new DateTimeZone('Asia/Tokyo')))->format('Y-m-d H:i:s')` |

## サンプル

### PDO で安全に DB を操作する

```php
<?php
declare(strict_types=1);

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=127.0.0.1;dbname=app;charset=utf8mb4';
        $pdo = new PDO($dsn, getenv('DB_USER') ?: 'app', getenv('DB_PASS') ?: '', [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // エラーを例外で受け取る
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,                  // 本物のプリペアドステートメント
        ]);
    }
    return $pdo;
}

function findUser(int $id): ?array
{
    $stmt = db()->prepare('SELECT id, name, email FROM users WHERE id = :id');
    $stmt->execute([':id' => $id]);
    $user = $stmt->fetch();
    return $user === false ? null : $user;
}

function transfer(int $from, int $to, int $amount): void
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?')->execute([$amount, $from]);
        $pdo->prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?')->execute([$amount, $to]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}
```

DSN に `charset=utf8mb4` を指定しないと文字化けの原因になります。値は**必ずプレースホルダ（`?` や `:id`）で渡し**、SQL 文字列に変数を直接埋め込まないでください（SQL インジェクション対策）。

### JSON を返す簡単な API

```php
<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$users = [
    1 => ['id' => 1, 'name' => '山田太郎'],
    2 => ['id' => 2, 'name' => '佐藤花子'],
];

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

if ($id === null || $id === false) {
    http_response_code(400);
    echo json_encode(['error' => 'id は整数で指定してください'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!isset($users[$id])) {
    http_response_code(404);
    echo json_encode(['error' => 'ユーザーが見つかりません'], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode($users[$id], JSON_UNESCAPED_UNICODE);
```

```sh
php -S localhost:8000
curl "http://localhost:8000/api.php?id=1"
```

`json_encode` に `JSON_UNESCAPED_UNICODE` を付けると、日本語が `\u5c71` のようにエスケープされず読みやすくなります。

### CSRF 対策付きのフォーム処理

```php
<?php
declare(strict_types=1);
session_start();

function h(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

$errors = [];
$name = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'] ?? '')) {
        http_response_code(400);
        exit('不正なリクエストです');
    }
    $name = trim($_POST['name'] ?? '');
    if ($name === '') {
        $errors[] = '名前を入力してください';
    } elseif (mb_strlen($name) > 50) {
        $errors[] = '名前は50文字以内で入力してください';
    }
    if (!$errors) {
        // ここで DB に保存する
        header('Location: done.php', true, 303); // 二重送信防止（PRG パターン）
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="ja">
<meta charset="UTF-8">
<title>登録</title>
<?php foreach ($errors as $e): ?>
  <p style="color:red"><?= h($e) ?></p>
<?php endforeach; ?>
<form method="post">
  <input name="name" value="<?= h($name) ?>">
  <input type="hidden" name="csrf_token" value="<?= h($_SESSION['csrf_token']) ?>">
  <button>登録</button>
</form>
```

画面に出す値はすべて `h()`（`htmlspecialchars`）を通します。登録後は `Location` ヘッダーでリダイレクトし、ブラウザの再読み込みによる二重登録を防ぎます。

## エラー対応

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `Warning: Undefined variable $x` | 未定義の変数を使用（タイプミス、条件分岐で代入されない経路） | 変数を初期化する。PHP 8 で Notice から Warning に格上げされた |
| `Warning: Undefined array key "name"` | 配列に存在しないキーを参照（`$_POST['name']` など） | `$_POST['name'] ?? ''` や `isset()` で確認 |
| `Parse error: syntax error, unexpected ...` | セミコロン・括弧・クォートの閉じ忘れ | `php -l` でファイルを構文チェック。表示された行の**1つ前の行**も確認 |
| `Fatal error: Uncaught Error: Call to undefined function mb_strlen()` | 拡張モジュール（mbstring など）が無効 | `php.ini` で `extension=mbstring` を有効化し、Web サーバーを再起動 |
| `Fatal error: Uncaught Error: Call to a member function fetch() on null` | `null`（や `false`）に対してメソッドを呼んだ | 直前の処理の戻り値を確認。オブジェクトの生成・取得に失敗していないか |
| `Fatal error: Uncaught Error: Class "App\Models\User" not found` | `use` / 名前空間の誤り、オートロード未設定 | `require 'vendor/autoload.php'` を確認し、`composer dump-autoload` |
| `Fatal error: Uncaught TypeError: f(): Argument #1 ($a) must be of type int, string given` | 型宣言と違う型の値を渡した | 呼び出し側で型を変換するか、入力チェックを追加 |
| `Fatal error: Allowed memory size of 134217728 bytes exhausted (tried to allocate ... bytes)` | 大量データを一度に配列へ読み込んだ | 1件ずつ処理する（`fetch` をループ、ジェネレータ）。必要に応じて `memory_limit` を見直す |
| `Fatal error: Maximum execution time of 30 seconds exceeded` | 処理が `max_execution_time` を超えた | 重い処理はバッチ（CLI）に分離。CLI では既定で無制限 |
| `Warning: Cannot modify header information - headers already sent by (output started at /path/file.php:1)` | `header()` / `setcookie()` の前に何か出力された（BOM、`?>` の後の空白・改行を含む） | 表示された出力箇所を確認。ファイルは **BOM なし UTF-8**、PHP だけのファイルは閉じタグ `?>` を書かない |
| `session_start(): Session cannot be started after headers have already been sent` | 上と同じく、出力後にセッションを開始した | `session_start()` をファイルの先頭で呼ぶ |
| `Warning: require(config.php): Failed to open stream: No such file or directory` | 相対パスの基準がカレントディレクトリになっている | `require __DIR__ . '/config.php';` のように `__DIR__` を基準にする |
| `PDOException: could not find driver` | PDO のドライバ（`pdo_mysql` など）が無効 | `php -m` で確認し、`php.ini` で有効化 |
| `SQLSTATE[HY000] [2002] Connection refused` | DB サーバーが起動していない、ホスト・ポートの誤り | DB の起動状態と DSN を確認。Docker では `localhost` ではなくサービス名を指定 |
| `SQLSTATE[HY000] [1045] Access denied for user 'app'@'localhost' (using password: YES)` | ユーザー名・パスワード・接続元ホストの権限の誤り | 認証情報と、MySQL 側の `'user'@'host'` の権限を確認 |
| `SQLSTATE[23000]: Integrity constraint violation: 1062 Duplicate entry` | 一意制約（主キー・UNIQUE）に重複する値を登録 | 事前に存在チェック、または例外を捕まえて利用者に通知 |
| 画面が真っ白（HTTP 500） | Fatal error が発生したが、`display_errors = Off` で表示されていない | Web サーバーと PHP のエラーログを確認。開発環境では `display_errors = On` |

**エラーが表示されないとき**: 開発環境では `php.ini` で `error_reporting = E_ALL` と `display_errors = On` にします。本番では `display_errors = Off`、`log_errors = On` にして、エラーは画面ではなく**ログに出す**のが原則です。

## 実務Tips

### セキュリティ（最優先）

- **SQL はプリペアドステートメント**で。`"... WHERE id = $id"` のような文字列連結は禁止
- **出力は必ず `htmlspecialchars`**（XSS 対策）。フレームワークのテンプレートエンジンは自動でエスケープしてくれる
- フォームには **CSRF トークン**。ログイン成功時は `session_regenerate_id(true)` でセッション ID を変える
- パスワードは `password_hash()` で保存し、`password_verify()` で照合する。`md5` や `sha1` は使わない
- アップロードファイルは拡張子と MIME タイプを検証し、**公開ディレクトリの外**に保存する
- `phpinfo()` や `.env`、`vendor/` を Web から見える場所に置かない。ドキュメントルートは `public/` に限定する

### 文字コード・日本語

- ソースファイルは **BOM なし UTF-8** で保存する。BOM があると `headers already sent` の原因になる
- 日本語の文字数・切り出しは `mb_` 関数を使う。`strlen('あ')` は `3`（バイト数）
- Windows 由来の CSV（Shift_JIS）は `mb_convert_encoding($s, 'UTF-8', 'SJIS-win')` で変換する
- MySQL は `utf8mb4` を使う（`utf8` では絵文字や一部の漢字が保存できない）

### 比較・型の落とし穴

- 比較は **`===`** を基本にする。PHP 8 で `'abc' == 0` は `false` に変わったなど、`==` は版によって挙動が違う
- `in_array()` と `array_search()` は第3引数に `true` を指定して厳密比較する
- `empty('0')` は `true`。「未入力かどうか」は `$s === ''` で判定する
- 日付は `date()` より `DateTimeImmutable` を使う。`date.timezone` を `Asia/Tokyo` に設定しておく

### 運用

- CLI と Web サーバーで php.ini が違うことがある。`php --ini` と `phpinfo()` の両方で確認する
- php.ini や拡張モジュールを変更したら、**Apache / PHP-FPM を再起動**しないと反映されない
- `composer.lock` を Git 管理し、本番では `composer install --no-dev` を使う
- 本番では OPcache を有効にする（性能が大きく向上する）
- PHP のバージョンアップ時は、PHPStan などの静的解析と PHPUnit のテストで影響範囲を確認する

## 関連リンク

- [PHP マニュアル（日本語）](https://www.php.net/manual/ja/)
- [PHP 公式サイト](https://www.php.net/)
- [サポートされているバージョン](https://www.php.net/supported-versions.php)
- [PHP for Windows](https://windows.php.net/)
- [PDO（PHP マニュアル）](https://www.php.net/manual/ja/book.pdo.php)
- [Composer](https://getcomposer.org/)
- [Packagist（パッケージ検索）](https://packagist.org/)
