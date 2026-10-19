---
title: PHP 技術まとめ
slug: php
excerpt: PHPの基本文法、環境構築、サンプルコード、エラー対応などの技術情報をまとめています。
updated: 2026-10-19
---

# PHP 技術まとめ

## 基礎

Webアプリケーション開発で広く使われるサーバサイド言語。

### 主な用途

- Webアプリケーション
- CMS（WordPress等）
- 業務システム
- API

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[PHP 公式ドキュメント](https://www.php.net/manual/ja/)を参照してください。

## コマンド

### バージョン・設定確認

```
php -v
php --ini
```

### 組込みサーバで起動

```
php -S localhost:8000
```

### PDOでSELECT

```
$stmt = $pdo->prepare('SELECT * FROM users WHERE id = :id');
$stmt->execute([':id' => $id]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
```

### 早見表：CLI

| 操作 | コマンド・構文 |
| --- | --- |
| バージョン | `php -v` |
| 組込みサーバ | `php -S localhost:8000` |
| 構文チェック | `php -l index.php` |
| 設定確認 | `php -i \| grep memory_limit` |

### 早見表：基本構文

| 操作 | コマンド・構文 |
| --- | --- |
| 変数・出力 | `$name = "Taro"; echo "Hello {$name}";` |
| 配列 | `$a = [1, 2, 3]; $m = ["key" => "value"];` |
| foreach | `foreach ($m as $k => $v) { ... }` |
| null合体 | `$v = $_GET["q"] ?? "";` |

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
| キー存在 | `array_key_exists("key", $m)` |
| JSON | `json_encode($m); json_decode($json, true);` |

### 早見表：DB・Composer

| 操作 | コマンド・構文 |
| --- | --- |
| PDO 接続 | `$pdo = new PDO($dsn, $user, $pass);` |
| プリペアド | `$st = $pdo->prepare("SELECT * FROM t WHERE id = ?"); $st->execute([$id]);` |
| Composer 追加 | `composer require monolog/monolog` |
| オートロード | `require __DIR__ . "/vendor/autoload.php";` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[PHP 公式ドキュメント](https://www.php.net/manual/ja/)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[PHP 公式ドキュメント](https://www.php.net/manual/ja/)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[PHP 公式ドキュメント](https://www.php.net/manual/ja/)を参照してください。

## 関連リンク

- [PHP 公式ドキュメント](https://www.php.net/manual/ja/)
