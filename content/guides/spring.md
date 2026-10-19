---
title: Spring Framework 技術まとめ
slug: spring
excerpt: Spring / Spring Framework / Spring Bootの設定、DI、Web開発、エラー対応などの技術情報をまとめています。
updated: 2026-10-19
---

# Spring Framework 技術まとめ

## 基礎

JavaのアプリケーションフレームワークSpring / Spring Boot。

### 主な用途

- 業務Webシステム
- REST API
- マイクロサービス
- バッチ（Spring Batch）

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[Spring Framework 公式ドキュメント](https://spring.io/projects/spring-framework)を参照してください。

## コマンド

### Spring Boot起動（Maven）

```
./mvnw spring-boot:run
```

### Spring Boot起動（Gradle）

```
./gradlew bootRun
```

### RESTコントローラ

```
@RestController
@RequestMapping("/api/users")
public class UserController {
    @GetMapping("/{id}")
    public User get(@PathVariable Long id) { ... }
}
```

### 早見表：起動・ビルド

| 操作 | コマンド・構文 |
| --- | --- |
| Maven 起動 | `./mvnw spring-boot:run` |
| Gradle 起動 | `./gradlew bootRun` |
| jar 作成 | `./mvnw clean package` |
| プロファイル指定 | `java -jar app.jar --spring.profiles.active=prod` |

### 早見表：Web（MVC）

| 操作 | コマンド・構文 |
| --- | --- |
| REST コントローラ | `@RestController @RequestMapping("/api/users")` |
| GET | `@GetMapping("/{id}") User get(@PathVariable Long id)` |
| POST | `@PostMapping User create(@RequestBody @Valid UserForm form)` |
| クエリパラメータ | `@RequestParam(defaultValue = "1") int page` |

### 早見表：DI

| 操作 | コマンド・構文 |
| --- | --- |
| サービス | `@Service public class UserService { ... }` |
| コンストラクタ注入 | `public UserController(UserService service) { ... }` |
| 設定値 | `@Value("${app.name}") String appName` |
| Bean 定義 | `@Bean RestClient restClient() { ... }` |

### 早見表：データアクセス

| 操作 | コマンド・構文 |
| --- | --- |
| Repository | `interface UserRepository extends JpaRepository<User, Long> {}` |
| メソッド名クエリ | `List<User> findByNameContaining(String name);` |
| トランザクション | `@Transactional` |
| エンティティ | `@Entity public class User { @Id @GeneratedValue Long id; }` |

### 早見表：application.yml

| 操作 | コマンド・構文 |
| --- | --- |
| ポート | `server:   port: 8080` |
| DB 接続 | `spring:   datasource:     url: jdbc:mysql://localhost/db` |
| SQL ログ | `spring.jpa.show-sql: true` |
| ログレベル | `logging.level.root: INFO` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[Spring Framework 公式ドキュメント](https://spring.io/projects/spring-framework)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[Spring Framework 公式ドキュメント](https://spring.io/projects/spring-framework)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[Spring Framework 公式ドキュメント](https://spring.io/projects/spring-framework)を参照してください。

## 関連リンク

- [Spring Framework 公式ドキュメント](https://spring.io/projects/spring-framework)
