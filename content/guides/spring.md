---
title: Spring Framework 技術まとめ
slug: spring
excerpt: Spring FrameworkとSpring BootのDI・自動設定の考え方、Spring Initializrでのプロジェクト作成、Maven/Gradleの起動・ビルドコマンド、REST APIとJPAのサンプル、起動失敗や400/415エラーへの対処、設定管理と運用の実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# Spring Framework 技術まとめ

## 基礎

Spring Framework は Java のアプリケーションフレームワークで、中心にあるのは **DI（依存性の注入）コンテナ**です。クラス同士の依存関係を Spring が組み立てるため、テストしやすく差し替えやすい構成になります。**Spring Boot** は Spring を「すぐ動く状態」で使うための仕組みで、自動設定（Auto-configuration）・組み込み Tomcat・starter 依存によって、XML 設定や WAR デプロイなしで Web アプリを起動できます。新規開発では Spring Boot を使うのが標準です。

### まず押さえる用語

| 用語 | 意味 | 現場での注意点 |
| --- | --- | --- |
| Bean | Spring コンテナが管理するオブジェクト | `@Component` `@Service` などを付けたクラス、`@Bean` メソッドの戻り値 |
| DI | 必要なオブジェクトを外から渡してもらうこと | **コンストラクタ注入**が推奨。フィールドへの `@Autowired` は避ける |
| コンポーネントスキャン | アノテーション付きクラスを自動で Bean 登録する仕組み | `@SpringBootApplication` のクラスの**パッケージ配下だけ**が対象 |
| 自動設定 | クラスパスにあるライブラリから設定を自動で行う | JPA を入れると DataSource の設定が必須になる、など |
| starter | 用途ごとの依存ライブラリのセット | `spring-boot-starter-web` `spring-boot-starter-data-jpa` など |
| プロファイル | 環境ごとの設定切り替え（`dev` / `prod`） | `application-prod.yml` が `prod` 有効時に読まれる |
| AOP | 横断的な処理（トランザクション・ログ）を差し込む仕組み | `@Transactional` は AOP で動くため、**同じクラス内からの呼び出しでは効かない** |

### ステレオタイプ・アノテーション

| アノテーション | 層 | 役割 |
| --- | --- | --- |
| `@RestController` | プレゼンテーション | JSON を返す API。`@Controller` ＋ `@ResponseBody` |
| `@Controller` | プレゼンテーション | 画面（Thymeleaf など）を返す |
| `@Service` | ビジネスロジック | トランザクション境界を置く場所 |
| `@Repository` | データアクセス | DB 例外を Spring の例外に変換 |
| `@Component` | 汎用 | 上記に当てはまらない Bean |
| `@Configuration` ＋ `@Bean` | 設定 | 外部ライブラリのオブジェクトを Bean 登録する |

### バージョンの目安

| Spring Boot | Spring Framework | Java | 注意点 |
| --- | --- | --- | --- |
| 2.x | 5.x | 8 以上 | `javax.*` パッケージ。OSS サポートは終了済み |
| 3.x | 6.x | **17 以上** | `javax.*` → `jakarta.*` に変更（移行時の最大の作業） |
| 4.x | 7.x | 17 以上 | starter の細分化など。移行時はリリースノートを確認 |

既存システムの改修では、まず `pom.xml` / `build.gradle` で Spring Boot のバージョンを確認してから情報を探します。

## 環境構築

### 1. JDK を用意する

Spring Boot 3 以降は **Java 17 以上**が必要です。Eclipse Temurin などの OpenJDK ディストリビューションを入れ、`JAVA_HOME` を設定します。

```sh
java -version
echo $JAVA_HOME          # Windows（コマンドプロンプト）は echo %JAVA_HOME%
```

Windows は「システム環境変数」で `JAVA_HOME` を JDK のフォルダ（例: `C:\Program Files\Eclipse Adoptium\jdk-21...`）に設定し、`Path` に `%JAVA_HOME%\bin` を追加します。

### 2. プロジェクトを作る（Spring Initializr）

https://start.spring.io/ で以下を選んで「GENERATE」し、zip を展開します。

| 項目 | 選択例 |
| --- | --- |
| Project | Maven（または Gradle - Groovy / Kotlin） |
| Language | Java |
| Spring Boot | 安定版（SNAPSHOT / M / RC が付かないもの） |
| Packaging / Java | Jar / 17 または 21 |
| Dependencies | Spring Web、Validation、Spring Data JPA、使う DB のドライバー、Spring Boot Actuator |

IntelliJ IDEA（Ultimate）や VS Code の Spring Boot 拡張機能、Spring Tools からも同じ画面で作成できます。Maven / Gradle 本体のインストールは不要で、同梱の **Wrapper（`mvnw` / `gradlew`）** を使います。

### 3. 起動して確認する

```sh
./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run
# 別ターミナルで
curl http://localhost:8080/actuator/health
```

`Started DemoApplication in 2.345 seconds` のようなログが出れば起動成功です。

### 4. 社内プロキシ環境の場合

Maven は `~/.m2/settings.xml`（Windows は `%USERPROFILE%\.m2\settings.xml`）にプロキシを設定します。

```xml
<settings>
  <proxies>
    <proxy>
      <id>corp</id>
      <active>true</active>
      <protocol>http</protocol>
      <host>proxy.example.co.jp</host>
      <port>8080</port>
      <nonProxyHosts>localhost|*.example.co.jp</nonProxyHosts>
    </proxy>
  </proxies>
</settings>
```

Gradle は `~/.gradle/gradle.properties` に `systemProp.https.proxyHost` / `systemProp.https.proxyPort` を設定します。

## コマンド

### 早見表：起動・ビルド

| 操作 | Maven | Gradle |
| --- | --- | --- |
| 起動 | `./mvnw spring-boot:run` | `./gradlew bootRun` |
| プロファイル指定で起動 | `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` | `SPRING_PROFILES_ACTIVE=dev ./gradlew bootRun` |
| テスト | `./mvnw test` | `./gradlew test` |
| jar 作成 | `./mvnw clean package` | `./gradlew bootJar` |
| テストを飛ばして jar 作成 | `./mvnw clean package -DskipTests` | `./gradlew bootJar -x test` |
| 依存関係ツリー | `./mvnw dependency:tree` | `./gradlew dependencies` |

jar は Maven なら `target/`、Gradle なら `build/libs/` に出力されます。

### 早見表：jar の実行

| 操作 | コマンド |
| --- | --- |
| 実行 | `java -jar app.jar` |
| プロファイル指定 | `java -jar app.jar --spring.profiles.active=prod` |
| ポート変更 | `java -jar app.jar --server.port=9090` |
| 環境変数で指定 | `SPRING_PROFILES_ACTIVE=prod java -jar app.jar` |
| メモリ指定 | `java -Xms512m -Xmx1g -jar app.jar` |
| 外部設定ファイル | `java -jar app.jar --spring.config.additional-location=file:/etc/app/` |

### 早見表：Web（MVC）

| 操作 | 構文 |
| --- | --- |
| REST コントローラ | `@RestController @RequestMapping("/api/users")` |
| GET | `@GetMapping("/{id}") User get(@PathVariable Long id)` |
| POST | `@PostMapping User create(@RequestBody @Valid UserForm form)` |
| クエリパラメータ | `@RequestParam(defaultValue = "1") int page` |
| ステータス指定 | `ResponseEntity.created(uri).body(dto)` / `@ResponseStatus(HttpStatus.NO_CONTENT)` |

### 早見表：DI・設定

| 操作 | 構文 |
| --- | --- |
| サービス | `@Service public class UserService { ... }` |
| コンストラクタ注入 | `public UserController(UserService service) { ... }` |
| 設定値 | `@Value("${app.name}") String appName` |
| 設定をまとめて受け取る | `@ConfigurationProperties(prefix = "app")` |
| Bean 定義 | `@Bean RestClient restClient() { ... }` |

### 早見表：データアクセス

| 操作 | 構文 |
| --- | --- |
| Repository | `interface UserRepository extends JpaRepository<User, Long> {}` |
| メソッド名クエリ | `List<User> findByNameContaining(String name);` |
| JPQL | `@Query("select u from User u where u.email = :email")` |
| トランザクション | `@Transactional` |
| エンティティ | `@Entity public class User { @Id @GeneratedValue Long id; }` |

### 早見表：application.yml

| 操作 | 設定 |
| --- | --- |
| ポート | `server.port: 8080` |
| DB 接続 | `spring.datasource.url: jdbc:mysql://localhost:3306/db` |
| SQL ログ | `spring.jpa.show-sql: true` |
| ログレベル | `logging.level.root: INFO` / `logging.level.com.example: DEBUG` |
| 起動時のテーブル自動生成 | `spring.jpa.hibernate.ddl-auto: validate`（本番は `validate` か `none`） |

## サンプル

### application.yml（プロファイル分け）

```yaml
# src/main/resources/application.yml（共通）
spring:
  application:
    name: demo
  datasource:
    url: jdbc:postgresql://localhost:5432/demo
    username: demo
    password: ${DB_PASSWORD}       # 環境変数から読む
  jpa:
    open-in-view: false
    hibernate:
      ddl-auto: validate
management:
  endpoints:
    web:
      exposure:
        include: health,info
---
spring:
  config:
    activate:
      on-profile: dev
  jpa:
    show-sql: true
logging:
  level:
    com.example: DEBUG
```

### エンティティと Repository

```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    protected User() {}              // JPA 用

    public User(String name, String email) {
        this.name = name;
        this.email = email;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
}

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
}
```

`@Entity` などは Spring Boot 3 以降 `jakarta.persistence.*` から import します。

### 入力チェック付きの REST API

```java
public record UserForm(
        @NotBlank @Size(max = 50) String name,
        @NotBlank @Email String email) {
}

@Service
@Transactional(readOnly = true)
public class UserService {
    private final UserRepository repository;

    public UserService(UserRepository repository) {
        this.repository = repository;
    }

    public User findById(Long id) {
        return repository.findById(id).orElseThrow(() -> new UserNotFoundException(id));
    }

    @Transactional
    public User create(UserForm form) {
        return repository.save(new User(form.name(), form.email()));
    }
}

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    public User get(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<User> create(@RequestBody @Valid UserForm form) {
        User created = service.create(form);
        return ResponseEntity.created(URI.create("/api/users/" + created.getId())).body(created);
    }
}
```

`@Valid` を使うには `spring-boot-starter-validation` が必要です。入力エラー時は自動で 400 が返ります。

### 例外を JSON（ProblemDetail）で返す

```java
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(UserNotFoundException.class)
    public ProblemDetail handleNotFound(UserNotFoundException e) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
        pd.setTitle("Not Found");
        return pd;
    }
}
```

```sh
curl -s http://localhost:8080/api/users/99
# {"detail":"user not found: id=99","instance":"/api/users/99","status":404,"title":"Not Found"}
```

`ProblemDetail` は Spring Framework 6（Spring Boot 3）以降で使える、RFC 9457 形式のエラーレスポンスです。

## エラー対応

起動に失敗したときは、ログの `APPLICATION FAILED TO START` の下にある **Description と Action** をまず読みます。原因と対処がそのまま書かれていることが多いです。

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `Web server failed to start. Port 8080 was already in use.` | 前回起動したアプリが残っている、他のソフトが使用中 | Windows: `netstat -ano \| findstr :8080` で PID を調べ `taskkill /PID <PID> /F`。または `server.port` を変更 |
| `Failed to configure a DataSource: 'url' attribute is not specified and no embedded datasource could be configured.` | JPA / JDBC の starter を入れたのに DB 接続設定がない、プロファイルが有効になっていない | `spring.datasource.url` を設定する。DB 不要なら JPA の依存を外す |
| `Parameter 0 of constructor in com.example.UserController required a bean of type 'com.example.UserService' that could not be found.` | `@Service` の付け忘れ、メインクラスより上位・別パッケージにあってスキャン対象外 | アノテーションを付ける。クラスを `@SpringBootApplication` のパッケージ配下に置く |
| `No qualifying bean of type '…' available: expected single matching bean but found 2` | 同じ型の Bean が複数 | `@Primary` か `@Qualifier("名前")` で指定する |
| `The dependencies of some of the beans in the application context form a cycle:` | Bean 同士の循環参照（Spring Boot 2.6 以降は既定で禁止） | 責務を分けて循環をなくす。設定で許可するのは最終手段 |
| `Whitelabel Error Page` / `This application has no explicit mapping for /error, so you are seeing this as a fallback.` | URL に対応するコントローラーがない、例外発生時の既定のエラー画面 | ログで実際のステータスと例外を確認。URL・`@RequestMapping`・パッケージ配置を見直す |
| `Content-Type 'text/plain;charset=UTF-8' is not supported`（415） | `@RequestBody` の API に JSON 以外で送信 | リクエストに `Content-Type: application/json` を付ける |
| `Required request body is missing`（400） | `@RequestBody` なのにボディが空 | クライアントの送信内容を確認 |
| `MethodArgumentNotValidException`（400） | `@Valid` の入力チェックでエラー | ログの `Field error in object …` で項目を確認。`@RestControllerAdvice` で項目別エラーを返す |
| `LazyInitializationException: … could not initialize proxy - no Session` | トランザクション外で遅延ロードの関連にアクセス | Service 内で必要なデータを取得し DTO に詰める。`JOIN FETCH` や `@EntityGraph` を使う |
| `package javax.persistence does not exist` | Spring Boot 3 以降で旧 `javax.*` を import | `jakarta.persistence.*` に置き換える |
| `UnsupportedClassVersionError: … class file version 61.0 … only recognizes class file versions up to 55.0` | ビルドした Java（61 = Java 17）より実行環境の Java が古い（55 = Java 11） | 実行環境の Java を上げる。IDE とサーバーの JDK を揃える |
| POST だけ 403 になる（Spring Security 導入時） | CSRF 保護が有効 | 画面はフォームにトークンを含める。トークン認証の API は CSRF の扱いを設計して設定する |

**起動しないときの切り分け順**

1. `APPLICATION FAILED TO START` の Description / Action を読む
2. その上の最初の `Caused by:` を探す（スタックトレースの一番下の `Caused by` が根本原因であることが多い）
3. `--debug` を付けて起動し、自動設定のレポート（CONDITIONS EVALUATION REPORT）で何が有効になったかを確認する
4. 依存の競合が疑わしければ `./mvnw dependency:tree` で同じライブラリの複数バージョンを探す

## 実務Tips

### 設計・実装

- **コンストラクタ注入**に統一する。コンストラクタが1つなら `@Autowired` は省略できる。フィールドを `final` にできテストも書きやすい
- `@Transactional` は **Service 層の public メソッド**に付ける。private メソッドや同じクラス内からの呼び出しでは効かない
- 参照系は `@Transactional(readOnly = true)` にする
- Entity をそのまま API で返さず、**DTO（record が便利）**に詰め替える。関連の遅延ロードや循環参照による JSON 化エラーを防げる
- `spring.jpa.open-in-view` は既定で `true`（起動時に警告が出る）。View 層での遅延ロードによる想定外の SQL を防ぐため `false` にし、必要なデータは Service で取得する
- N+1 問題に注意する。`show-sql: true` で SQL の本数を確認し、`JOIN FETCH` や `@EntityGraph` で対処する

### 設定・セキュリティ

- パスワードや API キーは `application.yml` に直接書かず、`${DB_PASSWORD}` のように**環境変数**から渡す
- 本番では `spring.jpa.hibernate.ddl-auto` を `validate` か `none` にする。`update` や `create` は本番データを壊す危険がある。スキーマ管理は Flyway や Liquibase で行う
- Actuator は公開するエンドポイントを `health` `info` などに絞る。`env` や `heapdump` を外部に出さない
- Spring Security を入れると**全 URL に認証がかかる**。開発中はログの `Using generated security password:` のパスワードでログインできる

### 運用・テスト

- 1つの jar を全環境で使い、違いはプロファイルと環境変数で吸収する（環境ごとにビルドしない）
- ヘルスチェックはロードバランサーや監視から `/actuator/health` を使う
- テストは範囲に応じて使い分ける: 全体は `@SpringBootTest`、コントローラーだけは `@WebMvcTest`、Repository だけは `@DataJpaTest`。Bean の差し替えは Spring Framework 6.2 以降 `@MockitoBean`（旧 `@MockBean` は非推奨）
- バージョンアップはパッチ → マイナー → メジャーの順に小さく進め、公式の Release Notes / Migration Guide を必ず読む。メジャー移行は OpenRewrite などの自動移行ツールも検討する

## 関連リンク

- [Spring Framework（公式プロジェクトページ）](https://spring.io/projects/spring-framework)
- [Spring Boot（公式プロジェクトページ）](https://spring.io/projects/spring-boot)
- [Spring Boot リファレンスドキュメント](https://docs.spring.io/spring-boot/index.html)
- [Spring Framework リファレンスドキュメント](https://docs.spring.io/spring-framework/reference/)
- [Spring Initializr](https://start.spring.io/)
- [Spring Guides（チュートリアル集）](https://spring.io/guides)
- [Spring Data JPA](https://spring.io/projects/spring-data-jpa)
