---
title: Java 技術まとめ
slug: java
excerpt: Javaの基本、開発環境、サンプルコード、エラー対応などの技術情報をまとめています。
updated: 2026-10-19
---

# Java 技術まとめ

## 基礎

オブジェクト指向プログラミング言語。業務システムやWebアプリケーションなどで利用。

### 主な用途

- 業務システム
- Webアプリケーション
- バッチ処理
- Androidアプリ

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[Java 公式ドキュメント](https://docs.oracle.com/javase/jp/)を参照してください。

## コマンド

### コンパイルと実行

```
javac Main.java
java Main
```

### バージョン確認

```
java -version
javac -version
```

### Stream APIで絞り込み

```
List<String> names = users.stream()
    .filter(u -> u.getAge() >= 20)
    .map(User::getName)
    .toList();
```

### jarの実行

```
java -jar app.jar
```

### 早見表：JDK コマンド

| 操作 | コマンド・構文 |
| --- | --- |
| コンパイル | `javac Main.java` |
| 実行 | `java Main` |
| jar 実行 | `java -jar app.jar` |
| バージョン確認 | `java -version` |

### 早見表：基本構文

| 操作 | コマンド・構文 |
| --- | --- |
| 変数（型推論） | `var list = new ArrayList<String>();` |
| 拡張for | `for (String s : list) { ... }` |
| switch式 | `var r = switch (n) { case 1 -> "A"; default -> "B"; };` |
| 文字列比較 | `s1.equals(s2)` |

### 早見表：コレクション

| 操作 | コマンド・構文 |
| --- | --- |
| List | `List<String> list = List.of("a", "b");` |
| Map | `Map<String, Integer> m = new HashMap<>(); m.put("a", 1);` |
| Map 走査 | `m.forEach((k, v) -> System.out.println(k + v));` |
| ソート | `list.sort(Comparator.comparing(User::getName));` |

### 早見表：Stream API

| 操作 | コマンド・構文 |
| --- | --- |
| 絞り込み | `list.stream().filter(x -> x > 0).toList()` |
| 変換 | `list.stream().map(String::trim).toList()` |
| 集計 | `list.stream().mapToInt(Integer::intValue).sum()` |
| グループ化 | `Collectors.groupingBy(User::getDept)` |

### 早見表：例外・I/O

| 操作 | コマンド・構文 |
| --- | --- |
| try-with-resources | `try (var br = Files.newBufferedReader(path)) { ... }` |
| ファイル全行 | `List<String> lines = Files.readAllLines(path);` |
| 例外を投げる | `throw new IllegalArgumentException("invalid");` |
| Optional | `opt.orElse(defaultValue)` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[Java 公式ドキュメント](https://docs.oracle.com/javase/jp/)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[Java 公式ドキュメント](https://docs.oracle.com/javase/jp/)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[Java 公式ドキュメント](https://docs.oracle.com/javase/jp/)を参照してください。

## 関連リンク

- [Java 公式ドキュメント](https://docs.oracle.com/javase/jp/)
