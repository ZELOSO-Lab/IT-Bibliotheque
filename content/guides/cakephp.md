---
title: CakePHP 技術まとめ
slug: cakephp
excerpt: CakePHPの環境構築、MVC構成、Bake、エラー対応などの技術情報をまとめています。
updated: 2026-10-19
---

# CakePHP 技術まとめ

## 基礎

PHPのMVCフレームワーク。規約重視で素早く開発できる。

### 主な用途

- 業務Webシステム
- 管理画面
- CRUDアプリ
- API

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[CakePHP 公式ドキュメント](https://book.cakephp.org/5/ja/)を参照してください。

## コマンド

### プロジェクト作成

```
composer create-project --prefer-dist cakephp/app:~5.0 myapp
```

### 開発サーバ起動

```
bin/cake server
```

### Bakeでコード生成

```
bin/cake bake all Users
```

### 早見表：bin/cake

| 操作 | コマンド・構文 |
| --- | --- |
| サーバ起動 | `bin/cake server` |
| Bake 一式 | `bin/cake bake all Articles` |
| マイグレーション作成 | `bin/cake bake migration CreateArticles` |
| マイグレーション実行 | `bin/cake migrations migrate` |

### 早見表：ルーティング

| 操作 | コマンド・構文 |
| --- | --- |
| ルート定義 | `$builder->connect('/articles', ['controller' => 'Articles', 'action' => 'index']);` |
| リソース | `$builder->resources('Articles');` |
| URL 生成 | `$this->Url->build(['action' => 'view', $id])` |
| リダイレクト | `return $this->redirect(['action' => 'index']);` |

### 早見表：ORM

| 操作 | コマンド・構文 |
| --- | --- |
| 全件 | `$this->Articles->find()->all();` |
| 条件 | `->find()->where(['published' => true])` |
| 1件取得 | `$this->Articles->get($id);` |
| 保存 | `$entity = $this->Articles->newEntity($data); $this->Articles->save($entity);` |

### 早見表：ビュー

| 操作 | コマンド・構文 |
| --- | --- |
| 変数を渡す | `$this->set(compact('articles'));` |
| エスケープ出力 | `<?= h($article->title) ?>` |
| フォーム | `<?= $this->Form->create($article) ?>` |
| Flash | `$this->Flash->success('保存しました');` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[CakePHP 公式ドキュメント](https://book.cakephp.org/5/ja/)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[CakePHP 公式ドキュメント](https://book.cakephp.org/5/ja/)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[CakePHP 公式ドキュメント](https://book.cakephp.org/5/ja/)を参照してください。

## 関連リンク

- [CakePHP 公式ドキュメント](https://book.cakephp.org/5/ja/)
