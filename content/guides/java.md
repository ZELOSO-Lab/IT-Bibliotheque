---
title: Java 技術まとめ
slug: java
excerpt: JavaのJDK・JVM・LTSの基本、Windows / Linux でのJDK導入とJAVA_HOME設定、javac・Maven・Gradle・診断ツールのコマンド、CSV集計やJDBCのサンプル、よくあるコンパイルエラー・例外の対処、業務システム運用の実務Tipsまでを1ページにまとめました。
updated: 2026-10-19
---

# Java 技術まとめ

## 基礎

Java は、JVM（Java仮想マシン）上で動くオブジェクト指向言語です。ソースコード（.java）を javac でバイトコード（.class）に変換し、JVM が実行します。**同じ .class / .jar が Windows でも Linux でも動く**ため、業務システム・Web アプリ・バッチ処理で長く使われています。

### 主な用途

- 業務システム（基幹系、金融、公共）
- Web アプリケーション・Web API（Spring Boot、Jakarta EE）
- バッチ処理
- Android アプリ（現在は Kotlin が主流）

### まず押さえる用語

| 用語 | 意味 | 現場での注意点 |
| --- | --- | --- |
| JDK | 開発キット（javac・java・jar などのツール一式） | 開発には JDK が必要。最近は JRE 単体の配布は少ない |
| JVM | バイトコードを実行する仮想マシン | メモリ（ヒープ）の上限は起動オプションで決まる |
| LTS | 長期サポート版（8 / 11 / 17 / 21 / 25） | 業務では LTS を選ぶ。非 LTS は半年でサポートが終わる |
| クラスパス | クラスや jar を探す場所（`-cp`） | `ClassNotFoundException` の多くはクラスパスの問題 |
| パッケージ | クラスの名前空間（`com.example.app`） | ディレクトリ構成とパッケージ名を一致させる |
| Maven / Gradle | ビルド・依存ライブラリ管理ツール | 現場のビルドはほぼどちらか。手で jar を集めない |
| チェック例外 | `IOException` など、捕捉か宣言が必須の例外 | 握りつぶさず、意味のある例外に包んで投げ直す |

### JDK ディストリビューション

OpenJDK をもとにしたディストリビューションが複数あり、中身の互換性は基本的に同じです。

| ディストリビューション | 提供元 | 備考 |
| --- | --- | --- |
| Eclipse Temurin | Eclipse Adoptium | 無償。広く使われている |
| Amazon Corretto | Amazon | 無償。AWS 環境で定番 |
| Microsoft Build of OpenJDK | Microsoft | 無償。Azure 環境で定番 |
| Oracle JDK | Oracle | バージョンにより利用条件が異なる。商用利用は社内ルールとライセンスを要確認 |

### クラスファイルのバージョン

古い JVM で新しい JDK のクラスを動かすと `UnsupportedClassVersionError` になります。エラーに出る番号と Java のバージョンの対応は次のとおりです。

| Java | 8 | 11 | 17 | 21 | 25 |
| --- | --- | --- | --- | --- | --- |
| class file version | 52 | 55 | 61 | 65 | 69 |

## 環境構築

### Windows

1. JDK のインストーラー（MSI）を入手してインストールする。winget を使う場合は次のとおり

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
# または
winget install Microsoft.OpenJDK.21
```

2. 環境変数 `JAVA_HOME` を JDK のフォルダに設定し、`PATH` に `%JAVA_HOME%\bin` を追加する（「システムのプロパティ」→「環境変数」）。Temurin の MSI はインストール時に `JAVA_HOME` を設定するオプションがあります
3. **新しく開いた**コマンドプロンプトで確認する

```powershell
java -version
javac -version
echo %JAVA_HOME%          # PowerShell では $env:JAVA_HOME
where java                # どの java が使われているか
```

`where java` で `C:\Program Files\Common Files\Oracle\Java\javapath` など想定外の場所が先に出る場合は、PATH の順番を見直します。

### Linux

```bash
# Debian / Ubuntu
sudo apt install openjdk-21-jdk

# RHEL / Rocky / AlmaLinux / Amazon Linux
sudo dnf install java-21-openjdk-devel

java -version
sudo update-alternatives --config java    # 複数の JDK を切り替える
```

### 動作確認

```java
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World");
    }
}
```

```bash
javac Main.java
java Main
java Main.java       # Java 11 以降は1ファイルならコンパイルせずに直接実行できる
```

IDE は IntelliJ IDEA、Eclipse（日本語化した Pleiades All in One が国内では定番）、VS Code ＋ Extension Pack for Java がよく使われます。

## コマンド

### JDK コマンド

| 操作 | コマンド |
| --- | --- |
| コンパイル | `javac -d out src/com/example/Main.java` |
| 文字コード指定でコンパイル | `javac -encoding UTF-8 Main.java` |
| 古いバージョン向けにコンパイル | `javac --release 17 Main.java` |
| 実行（クラスパス指定） | `java -cp out;lib/* com.example.Main`（Linux は `:` 区切り） |
| jar 実行 | `java -jar app.jar` |
| ヒープ上限を指定して実行 | `java -Xms512m -Xmx2g -jar app.jar` |
| jar 作成 | `jar --create --file app.jar --main-class com.example.Main -C out .` |
| jar の中身一覧 | `jar tf app.jar` |

### Maven

| 操作 | コマンド |
| --- | --- |
| バージョン確認 | `mvn -v` |
| ビルド（テスト込み） | `mvn package` |
| クリーンビルド | `mvn clean package` |
| テストを飛ばす | `mvn package -DskipTests` |
| ローカルリポジトリへインストール | `mvn clean install` |
| 依存関係ツリー | `mvn dependency:tree` |
| 特定のテストだけ | `mvn test -Dtest=UserServiceTest` |

### Gradle

```bash
./gradlew build            # Windows は gradlew.bat build
./gradlew test
./gradlew clean build -x test
./gradlew dependencies
```

Gradle はプロジェクトに同梱された **Gradle Wrapper（gradlew）** を使い、各自のPCに入っている gradle コマンドは使わないのが原則です。

### 稼働中の JVM を調べる

| 操作 | コマンド |
| --- | --- |
| Java プロセス一覧 | `jps -l` |
| スレッドダンプ | `jcmd <pid> Thread.print`（または `jstack <pid>`） |
| ヒープの使用状況 | `jcmd <pid> GC.heap_info` |
| ヒープダンプ | `jcmd <pid> GC.heap_dump /tmp/heap.hprof` |
| 起動オプションの確認 | `jcmd <pid> VM.flags` |
| GC ログを出す（起動時） | `java -Xlog:gc*:file=gc.log -jar app.jar` |

### 早見表：構文

| 操作 | 構文 |
| --- | --- |
| 変数（型推論） | `var list = new ArrayList<String>();` |
| 文字列比較 | `s1.equals(s2)`（`==` は参照の比較） |
| switch 式 | `var r = switch (n) { case 1 -> "A"; default -> "B"; };` |
| record | `record User(int id, String name) {}` |
| List / Map | `List.of("a", "b")` / `Map<String, Integer> m = new HashMap<>();` |
| ソート | `list.sort(Comparator.comparing(User::name));` |
| Stream | `list.stream().filter(x -> x > 0).map(String::valueOf).toList()` |
| グループ化 | `Collectors.groupingBy(User::dept, Collectors.counting())` |
| try-with-resources | `try (var br = Files.newBufferedReader(path)) { ... }` |
| ファイル全行 | `List<String> lines = Files.readAllLines(path);` |
| Optional | `opt.orElse(defaultValue)` / `opt.orElseThrow()` |

## サンプル

### CSV を部署別に集計する（record ＋ Stream）

```java
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class SalesReport {

    record Sale(String dept, String item, int amount) {
        static Sale parse(String line) {
            String[] c = line.split(",", -1);
            if (c.length != 3) {
                throw new IllegalArgumentException("列数が不正です: " + line);
            }
            return new Sale(c[0].trim(), c[1].trim(), Integer.parseInt(c[2].trim()));
        }
    }

    public static void main(String[] args) throws IOException {
        Path path = Path.of(args.length > 0 ? args[0] : "sales.csv");

        List<Sale> sales;
        try (var lines = Files.lines(path, StandardCharsets.UTF_8)) {
            sales = lines.skip(1)                      // 見出し行を飛ばす
                         .filter(l -> !l.isBlank())
                         .map(Sale::parse)
                         .toList();
        }

        Map<String, Integer> byDept = sales.stream()
                .collect(Collectors.groupingBy(Sale::dept,
                         Collectors.summingInt(Sale::amount)));

        byDept.entrySet().stream()
              .sorted(Map.Entry.<String, Integer>comparingByValue(Comparator.reverseOrder()))
              .forEach(e -> System.out.printf("%-6s %,10d円%n", e.getKey(), e.getValue()));
    }
}
```

`Files.lines` はファイルを開いたままにするので、**try-with-resources で必ず閉じます**。Excel から出力した CSV は Shift_JIS（MS932）のことが多いので、その場合は `Charset.forName("MS932")` を指定します。

### JDBC（PreparedStatement とトランザクション）

```java
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class UserDao {
    record User(long id, String name) {}

    static List<User> findByDept(Connection conn, String dept) throws SQLException {
        String sql = "SELECT id, name FROM users WHERE dept = ? ORDER BY id";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, dept);                  // ? に値をバインド（SQLインジェクション対策）
            try (ResultSet rs = ps.executeQuery()) {
                List<User> list = new ArrayList<>();
                while (rs.next()) {
                    list.add(new User(rs.getLong("id"), rs.getString("name")));
                }
                return list;
            }
        }
    }

    static void transfer(Connection conn, long from, long to, int amount) throws SQLException {
        conn.setAutoCommit(false);
        try (PreparedStatement minus = conn.prepareStatement(
                 "UPDATE account SET balance = balance - ? WHERE id = ?");
             PreparedStatement plus = conn.prepareStatement(
                 "UPDATE account SET balance = balance + ? WHERE id = ?")) {
            minus.setInt(1, amount); minus.setLong(2, from); minus.executeUpdate();
            plus.setInt(1, amount);  plus.setLong(2, to);    plus.executeUpdate();
            conn.commit();
        } catch (SQLException e) {
            conn.rollback();                        // 途中で失敗したら全部取り消す
            throw e;
        }
    }
}
```

SQL を文字列連結で組み立てず、**必ず `?` プレースホルダ**を使います。Connection は実務ではコネクションプール（HikariCP など）から取得します。

### HTTP クライアント（Java 11 以降の標準 API）

```java
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public class HttpSample {
    private static final HttpClient CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public static void main(String[] args) throws IOException, InterruptedException {
        HttpRequest req = HttpRequest.newBuilder(URI.create("https://example.com/"))
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();

        HttpResponse<String> res = CLIENT.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() != 200) {
            throw new IOException("HTTP " + res.statusCode());
        }
        System.out.println(res.body().length() + " chars");
    }
}
```

`HttpClient` はスレッドセーフなので**使い回し**ます。タイムアウトは必ず設定します（未設定だと応答がないまま待ち続けることがあります）。

## エラー対応

### コンパイルエラー（javac）

日本語環境では括弧内のメッセージで表示されます。

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `error: cannot find symbol`（シンボルを見つけられません） | 変数名・クラス名のタイプミス、import 漏れ、依存 jar がない | 綴りと大文字小文字、import、クラスパスを確認 |
| `error: incompatible types: String cannot be converted to int` | 型の不一致 | `Integer.parseInt(s)` などで変換する |
| `error: class Xxx is public, should be declared in a file named Xxx.java`（クラス Xxxはpublicであり、ファイルXxx.javaで宣言する必要があります） | public クラス名とファイル名の不一致 | ファイル名をクラス名と同じにする（大文字小文字も） |
| `error: unreported exception IOException; must be caught or declared to be thrown`（例外IOExceptionは報告されません…） | チェック例外の処理漏れ | try-catch で処理するか、メソッドに `throws IOException` を付ける |
| `error: unmappable character (0x..) for encoding ...`（この文字(0x..)は、エンコーディングMS932にマップできません） | ソースの文字コードと javac の想定が違う | `javac -encoding UTF-8`。Maven は `project.build.sourceEncoding` を UTF-8 に |

### 実行時の例外・エラー

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `Error: Could not find or load main class Xxx`（メイン・クラスXxxを検出およびロードできませんでした） | クラスパス違い、パッケージ名付きのクラスを単純名で指定、`.class` を付けて実行 | `java -cp out com.example.Main` のように完全修飾名で指定 |
| `java.lang.UnsupportedClassVersionError: ... (class file version 65.0), this version of the Java Runtime only recognizes class file versions up to 61.0` | 新しい JDK でコンパイルし、古い JVM で実行 | 実行環境の Java を上げるか、`--release` で実行環境に合わせてコンパイル |
| `java.lang.NullPointerException: Cannot invoke "String.length()" because "s" is null` | null の変数のメソッドを呼んだ | 詳細メッセージ（Java 15 以降は既定で表示。ローカル変数名は `-g` 付きコンパイル時のみ）で null の箇所を特定し、null チェックか Optional で対応 |
| `java.lang.ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 3` | 配列の範囲外アクセス | ループ条件を `i < length` にする |
| `java.lang.NumberFormatException: For input string: "abc"` | 数値でない文字列を変換した | 入力チェックを追加。全角数字・空白・空文字に注意 |
| `java.util.ConcurrentModificationException` | 拡張 for で回しながら List を変更した | `list.removeIf(...)` か Iterator の `remove()` を使う |
| `java.lang.UnsupportedOperationException` | `List.of()` や `Arrays.asList()` の結果を変更した | `new ArrayList<>(List.of(...))` で可変のリストにコピーする |
| `java.lang.OutOfMemoryError: Java heap space` | ヒープ不足、メモリリーク、全件読み込み | `-Xmx` を見直す。`-XX:+HeapDumpOnOutOfMemoryError` でダンプを取り、原因を解析 |
| `PKIX path building failed: ... unable to find valid certification path to requested target` | 社内プロキシの証明書など、JDK が信頼していない CA | `keytool -importcert -cacerts -alias corp-ca -file corp-ca.crt` で CA を追加（JDK 更新時に再作業が必要） |
| `java.net.BindException: Address already in use` | ポートが使用中（二重起動など） | Windows は `netstat -ano \| findstr :8080`、Linux は `ss -ltnp` でプロセスを特定 |

**スタックトレースの読み方**: 一番上の行が例外の種類とメッセージ、その下の `at ...` が呼び出し履歴です。**自分のパッケージ（`com.example...`）が最初に出てくる行**から見ます。`Caused by:` がある場合は、**一番下の `Caused by:` が根本原因**です。

## 実務Tips

### バージョン・環境

- JDK は **LTS** を選び、開発・CI・本番で同じメジャーバージョンに揃える
- Maven の `maven.compiler.release`、Gradle の toolchain でビルドに使う Java バージョンをプロジェクトに明記する
- 社内プロキシ環境では、Maven は `~/.m2/settings.xml` の `<proxies>`、Gradle は `gradle.properties` の `systemProp.https.proxyHost` などで設定する
- 文字コードは UTF-8 に統一する。Java 18 以降は既定の文字コードが UTF-8 になったため、古い JDK からの移行時は Shift_JIS 前提のコードに注意

### コーディング

- 文字列の比較は `equals`。定数を左に置く `"A".equals(s)` か `Objects.equals(a, b)` で NPE を避ける
- `catch (Exception e) {}` で**例外を握りつぶさない**。最低でもログに出し、スタックトレースを残す（`log.error("...", e)`）
- 金額計算に `double` を使わない。`BigDecimal`（`new BigDecimal("0.1")` のように文字列から生成）を使う
- 日時は `java.util.Date` / `Calendar` ではなく `java.time`（`LocalDate`、`ZonedDateTime`）を使う
- ファイル・DB 接続・ストリームは try-with-resources で必ず閉じる

### 運用・障害対応

- 本番の起動オプションに `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=<ディレクトリ>` と GC ログを入れておく
- 応答が止まったら、まず **スレッドダンプを数秒おきに3回**取得する（`jcmd <pid> Thread.print`）。同じ箇所で止まっていればデッドロックや外部待ち
- `-Xmx` はサーバーやコンテナのメモリ上限より十分小さくする（JVM はヒープ以外にもメモリを使う）。コンテナでは `-XX:MaxRAMPercentage` で割合指定もできる
- ログは標準出力の `System.out.println` ではなく、SLF4J ＋ Logback などのロギングライブラリを使う

## 関連リンク

- [Java SE ドキュメント（日本語）](https://docs.oracle.com/javase/jp/)
- [Java SE API ドキュメント（英語・最新）](https://docs.oracle.com/en/java/javase/)
- [OpenJDK](https://openjdk.org/)
- [Eclipse Temurin（Adoptium）](https://adoptium.net/)
- [Apache Maven](https://maven.apache.org/)
- [Gradle ドキュメント](https://docs.gradle.org/)
- [Spring Boot](https://spring.io/projects/spring-boot)
