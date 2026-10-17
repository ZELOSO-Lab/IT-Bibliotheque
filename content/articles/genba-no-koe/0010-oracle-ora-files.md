---
series: 現場の声
no: 0010
title: 【SQL】「tnsnames.ora 見て」と言われて固まった話と、tnsnames.ora / sqlnet.ora / listener.ora の中身と読み方（Oracle）
slug: oracle-ora-files
category: SQL
tags: [SQL, Oracle, tnsnames.ora, sqlnet.ora, listener.ora, TNS_ADMIN, ORA-12154]
technologies: [sql, oracle-database]
excerpt: Oracleの接続設定ファイル（tnsnames.ora・sqlnet.ora・listener.ora）が何をしていて、どこに置かれ、どう書くのか。ORA-12154をはじめ、.oraファイルで現場がハマる7つのポイントと書き方をまとめました。
status: draft
created: 2026-10-12
---

# 【SQL】「tnsnames.ora 見て」と言われて固まった話と、tnsnames.ora / sqlnet.ora / listener.ora の中身と読み方（Oracle）

## 現場の声

> 「接続先は tnsnames.ora に書いてあるから、それ見て SQL Developer でつないで」と言われました。でも、**tnsnames.ora がどこにあるのか**も、**中のカッコだらけの記述のどこが接続先なのか**も分かりません。
>
> 先輩の PC からファイルをコピーして、接続名を入れたら `ORA-12154: TNS:could not resolve the connect identifier specified`。ファイルを編集しても何も変わらず、後で分かったのは、**PC に Oracle Client が2つ入っていて、別のフォルダの tnsnames.ora が読まれていた**ことでした。

`.ora` ファイルは、Oracle に「**どこの、どのデータベースに、どうやって接続するか**」を教える設定ファイルです。中身は単純ですが、**置き場所が複数あり、どれが読まれているか分かりにくい**ことと、**カッコとインデントの書き方に癖がある**ことで、現場では頻繁にトラブルになります。この記事では、主要な `.ora` ファイルの役割・中身・置き場所と、ハマりどころを整理します。

## 前提の構成

| 項目 | 内容 |
| --- | --- |
| クライアント | Windows 10 / 11 + SQL Developer 24.x（必要に応じて Oracle Client / Instant Client） |
| サーバー | Oracle Database 19c / 21c / 23ai（Linux） |
| 接続方式 | TNS（tnsnames.ora の接続名で接続） |

まず、3つのファイルの役割と、どちら側に置くものかを押さえます。

| ファイル | 置く場所 | 役割 | 開発者が触る頻度 |
| --- | --- | --- | --- |
| **tnsnames.ora** | クライアント（自分の PC） | 接続名 → 接続先（ホスト・ポート・サービス名）の対応表 | **高い** |
| **sqlnet.ora** | クライアント・サーバー両方 | 名前解決の方法、タイムアウト、認証など通信の共通設定 | ときどき |
| **listener.ora** | サーバー | リスナー（接続の受付窓口）の待ち受けポートなどの設定 | ほぼない（DBA が管理） |

```text
[自分の PC]                                     [DB サーバー]
SQL Developer                                   リスナー（listener.ora）
  │ 接続名 "DEV_PDB" を指定                        │ 1521番ポートで待ち受け
  │                                               │
  ├─ sqlnet.ora    … 名前の解決方法を決める        ├─ サービス "orclpdb" を受け付け
  └─ tnsnames.ora  … DEV_PDB = dbsv01:1521/orclpdb │
        └──────────── TCP:1521 ──────────────────→ └─→ PDB "ORCLPDB"
```

## tnsnames.ora の中身と読み方

まずは一番よく触る tnsnames.ora です。1つの接続先の定義は次のようになっています。

```text
DEV_PDB =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = dbsv01)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = orclpdb)
    )
  )
```

| 部分 | 意味 |
| --- | --- |
| `DEV_PDB` | **接続名**（ネットサービス名）。SQL Developer やアプリから指定する名前。自由に付けられる |
| `ADDRESS` | 接続先のサーバー。`PROTOCOL`（通常 TCP）、`HOST`（ホスト名か IP）、`PORT`（既定 1521） |
| `CONNECT_DATA` | 接続先のデータベースの指定 |
| `SERVICE_NAME` | サービス名。マルチテナント構成では PDB のサービス名を書く |
| `SID` | `SERVICE_NAME` の代わりに書く古い指定方法（非マルチテナントの古い環境） |
| `SERVER = DEDICATED` | 専用サーバー接続。通常はこれ（省略時はサーバー側の設定に従う） |

複数の接続先は、同じ形のブロックを並べて書きます。

```text
DEV_PDB =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = dbsv01)(PORT = 1521))
    (CONNECT_DATA = (SERVICE_NAME = orclpdb))
  )

STG_PDB =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = dbsv-stg01)(PORT = 1521))
    (CONNECT_DATA = (SERVICE_NAME = stgpdb))
  )
```

RAC やスタンバイ構成では、`ADDRESS_LIST` に複数のアドレスを並べ、`FAILOVER` や `LOAD_BALANCE` を指定した定義になっていることもあります。読み方は同じで、「**どのホストの、どのポートの、どのサービス名に接続するか**」を探せば十分です。

## sqlnet.ora の中身と読み方

sqlnet.ora は、接続全体に効く共通設定です。クライアント側でよく見る設定は次のとおりです。

```text
# 接続名の解決方法と順番（左から順に試す）
NAMES.DIRECTORY_PATH = (TNSNAMES, EZCONNECT)

# Windows 認証（OS 認証）を使う設定。Oracle Client のインストール時に自動で入る
SQLNET.AUTHENTICATION_SERVICES = (NTS)

# 接続確立のタイムアウト（秒）
SQLNET.OUTBOUND_CONNECT_TIMEOUT = 10
```

| 設定 | 意味 | 注意点 |
| --- | --- | --- |
| `NAMES.DIRECTORY_PATH` | 接続名をどこから探すか。`TNSNAMES` = tnsnames.ora、`EZCONNECT` = `ホスト:ポート/サービス名` の直接指定 | `TNSNAMES` が入っていないと tnsnames.ora が使われない |
| `NAMES.DEFAULT_DOMAIN` | 接続名に自動でドメインを付ける | **ORA-12154 の隠れた原因**になりやすい（ハマりどころ4） |
| `SQLNET.AUTHENTICATION_SERVICES` | OS 認証の方式 | `(NTS)` は Windows 認証。通常の ID/パスワード接続には影響しない |
| `SQLNET.OUTBOUND_CONNECT_TIMEOUT` | クライアントから接続するときのタイムアウト | つながらないときに長時間固まるのを防ぐ |
| `SQLNET.EXPIRE_TIME`（サーバー側） | 一定間隔で接続の生存確認をする（分） | ファイアウォールに無通信の接続を切られる環境で設定される |

## listener.ora の中身（参考）

listener.ora はサーバー側のファイルで、開発者が編集することはほとんどありません。ただ、「**ポート番号が何番か**」「**どのホスト名で待ち受けているか**」を確認するときに読めると役立ちます。

```text
LISTENER =
  (DESCRIPTION_LIST =
    (DESCRIPTION =
      (ADDRESS = (PROTOCOL = TCP)(HOST = dbsv01)(PORT = 1521))
    )
  )
```

最近の構成では、サービス名は listener.ora に書かず、データベースが起動時にリスナーへ**自動登録**します。登録状況は、サーバー上で次のコマンドで確認します。

```text
$ lsnrctl status      # 待ち受けアドレス・ポート、読み込んだ listener.ora の場所
$ lsnrctl services    # 登録済みのサービス名の一覧（tnsnames.ora の SERVICE_NAME はここにある名前）
```

## ハマりどころ1：tnsnames.ora がどこにあるか分からない・別のファイルが読まれている

**症状**

tnsnames.ora を編集しても反映されない。または、ファイルが見つからない。

**原因**

`.ora` ファイルの読み込み場所は、次の優先順位で決まります（よく使うものだけ抜粋）。

| 優先順位 | 場所 |
| --- | --- |
| 1 | 環境変数 **`TNS_ADMIN`** が指すフォルダ |
| 2 | （Windows のみ）レジストリの Oracle ホームのキーに設定された `TNS_ADMIN` の値 |
| 3 | Oracle Client の `<ORACLE_HOME>\network\admin\`（読み取り専用 Oracle ホームでは `<ORACLE_BASE_HOME>\network\admin\`） |

PC に Oracle Client が複数入っていたり、昔のバージョンが残っていたりすると、**自分が編集したのとは別のフォルダ**が読まれることがあります。

**対処：環境変数 `TNS_ADMIN` で、読み込むフォルダを1か所に固定する。**

1. `C:\oracle\network\admin\` のようなフォルダを作り、tnsnames.ora と sqlnet.ora をそこに置く
2. Windows の「システムの詳細設定 → 環境変数」で、ユーザー環境変数 `TNS_ADMIN` = `C:\oracle\network\admin` を追加
3. SQL Developer やコマンドプロンプトを**開き直す**（開いたままだと環境変数が反映されない）

```text
PS> echo $env:TNS_ADMIN
C:\oracle\network\admin
```

Oracle Client が入っていて `tnsping` が使える環境なら、どの sqlnet.ora を使っているかも表示されます。

```text
PS> tnsping DEV_PDB

Used parameter files:
C:\oracle\network\admin\sqlnet.ora          ← 読み込まれた設定ファイル

Used TNSNAMES adapter to resolve the alias
Attempting to contact (DESCRIPTION = (ADDRESS = (PROTOCOL = TCP)(HOST = dbsv01)(PORT = 1521)) ...)
OK (20 msec)
```

`tnsping` は Instant Client には含まれていません。その場合は SQL Developer の接続テストで確認します。

## ハマりどころ2：インデントやカッコの書き方で、接続名が認識されない

**症状**

tnsnames.ora に定義を追加したのに、`ORA-12154` が出る。前後の接続名まで使えなくなった。

**原因**

tnsnames.ora には次のような書き方のルールがあります。

- **行頭（1文字目）から書き始めた行は、新しい接続名の始まり**とみなされる
- 定義の続きの行は、**必ずスペースでインデントする**
- カッコの開きと閉じの数が合っていないと、**そこから後ろの定義がすべて読めなくなる**

```text
DEV_PDB =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = dbsv01)(PORT = 1521))
(CONNECT_DATA = (SERVICE_NAME = orclpdb))      ← NG：行頭から書いている
  )
```

**対処**

- 続きの行はスペース2つ以上でインデントし、**タブは使わない**
- 追加するときは、既存の正しい定義を**丸ごとコピーして、接続名・HOST・SERVICE_NAME だけ書き換える**
- カッコの数は、VS Code などカッコの対応が色で分かるエディタで確認する
- 編集前に `tnsnames.ora.bak` としてバックアップを取ってから触る

## ハマりどころ3：先輩の tnsnames.ora をコピーしたら文字化け・読めない

**症状**

メールやチャットで受け取った内容を貼り付けたら、つながらなくなった。

**原因**

- 全角スペースや全角カッコが混ざっている
- コピー時に余計な文字コード（BOM 付き UTF-8 など）やスマートクォートが入った
- 改行が崩れて、1行に連結された

**対処**

- ファイルは**半角英数字だけ**で書き、保存は ANSI（または BOM なし UTF-8）にする
- 日本語のコメントは避ける（コメントは行頭に `#` を付けた英数字で書く）
- できればファイルそのものを共有フォルダやリポジトリで配布してもらう

## ハマりどころ4：`NAMES.DEFAULT_DOMAIN` で接続名が勝手に変わり、ORA-12154

**症状**

tnsnames.ora に `DEV_PDB` と正しく書いてあるのに、`ORA-12154: TNS:could not resolve the connect identifier specified`。

**原因**

sqlnet.ora に次の設定があると、接続名に**自動でドメインが付加**されます。

```text
NAMES.DEFAULT_DOMAIN = example.co.jp
```

この場合、`DEV_PDB` で接続すると、内部では `DEV_PDB.example.co.jp` を探しに行くため、tnsnames.ora の `DEV_PDB` が見つかりません。

**対処**

- tnsnames.ora 側の接続名を `DEV_PDB.example.co.jp` にそろえる（社内の他の定義がそうなっていればこちら）
- 個人 PC でドメインが不要なら、sqlnet.ora の `NAMES.DEFAULT_DOMAIN` の行を削除するか、先頭に `#` を付けて無効にする

ORA-12154 が出たら、**tnsnames.ora の書き方 → 読まれているフォルダ → sqlnet.ora のドメイン**の順に確認すると、ほとんどの原因が見つかります。

## ハマりどころ5：SQL Developer で TNS を選んでも接続名が一覧に出ない

**症状**

SQL Developer の接続ダイアログで「接続タイプ：TNS」を選んだのに、「ネットワーク別名」のドロップダウンが空。

**原因**

SQL Developer は、Oracle Client がなくても内蔵の JDBC Thin ドライバーで動くため、**tnsnames.ora の場所を自分では知らない**ことがあります。

**対処：SQL Developer に tnsnames.ora のフォルダを教える。**

1. 「ツール → プリファレンス → データベース → 拡張」を開く
2. 「**Tnsnames ディレクトリ**」に `C:\oracle\network\admin` を指定
3. SQL Developer を再起動し、接続ダイアログの「ネットワーク別名」に接続名が出ることを確認

環境変数 `TNS_ADMIN` を設定していれば、通常はこの指定がなくても読み込まれます。両方設定する場合は、**同じフォルダを指す**ようにしておくと迷いません。

## ハマりどころ6：「TNS の設定がないとつながらない」と思い込む

**症状**

ちょっと検証用 DB につなぎたいだけなのに、tnsnames.ora を作るところから始めて時間がかかった。

**対処：EZCONNECT（簡易接続）なら tnsnames.ora は不要。**

```text
ホスト:ポート/サービス名
dbsv01:1521/orclpdb
```

- SQL Developer の「接続タイプ：基本」でホスト・ポート・サービス名を入れるのは、実質この形式です。
- SQL*Plus や SQLcl でも、`sqlplus devuser@//dbsv01:1521/orclpdb` のように直接指定できます。
- ただし、**チームで接続先を共有・管理する**なら tnsnames.ora にまとめておくほうが、接続先の変更（サーバー移行など）に強くなります。

| 方式 | 向いている場面 |
| --- | --- |
| 基本（EZCONNECT） | 個人の検証、一時的な接続 |
| TNS（tnsnames.ora） | チームで同じ接続先を使う、RAC / フェイルオーバー構成、アプリと同じ定義を使いたい |

## ハマりどころ7：サーバー移行後、古い tnsnames.ora のまま接続している

**症状**

DB サーバーを移行した後も、一部の人だけ古いサーバーにつながっていた（または、つながらなくなった）。

**原因**

tnsnames.ora は**各 PC に個別に置かれる**ため、配布・更新の漏れが起きやすいファイルです。

**対処**

- チームの tnsnames.ora は**1か所（共有フォルダやリポジトリ）で管理**し、更新日と変更内容を記録する
- 個人 PC の tnsnames.ora は、共有の正本からコピーする運用にする
- 大きな組織では、tnsnames.ora 自体に `IFILE` で共有ファイルを読み込ませる方法もある

```text
# 個人の tnsnames.ora から、共有の定義を読み込む
IFILE = \\fileserver\oracle\network\admin\tnsnames_common.ora
```

- 接続後は `SELECT SYS_CONTEXT('USERENV', 'SERVER_HOST') FROM dual;` で**実際につながっているサーバー**を確認する習慣をつけると安全です。

## tnsnames.ora を新しく用意する手順（まとめ）

1. `C:\oracle\network\admin\` フォルダを作る
2. 環境変数 `TNS_ADMIN` = `C:\oracle\network\admin` を設定する
3. 次の内容で `sqlnet.ora` を作る

```text
NAMES.DIRECTORY_PATH = (TNSNAMES, EZCONNECT)
```

4. 次の内容で `tnsnames.ora` を作る（HOST・PORT・SERVICE_NAME を自分の環境に合わせる）

```text
DEV_PDB =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = dbsv01)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = orclpdb)
    )
  )
```

5. SQL Developer の「ツール → プリファレンス → データベース → 拡張 → Tnsnames ディレクトリ」に同じフォルダを指定し、再起動する
6. 新規接続で「接続タイプ：TNS」→「ネットワーク別名：DEV_PDB」を選び、「テスト」で「成功」を確認する

## チェックリスト

- [ ] tnsnames.ora・sqlnet.ora・listener.ora の役割と置き場所を区別できる
- [ ] 環境変数 `TNS_ADMIN` で読み込むフォルダを1か所に固定した
- [ ] SQL Developer の Tnsnames ディレクトリも同じフォルダを指している
- [ ] tnsnames.ora の続きの行はスペースでインデントし、タブを使っていない
- [ ] カッコの開きと閉じの数が合っている
- [ ] 全角文字・日本語コメントが混ざっていない
- [ ] sqlnet.ora の `NAMES.DEFAULT_DOMAIN` の有無を確認した
- [ ] `NAMES.DIRECTORY_PATH` に `TNSNAMES` が含まれている
- [ ] 編集前にバックアップを取った
- [ ] チームの tnsnames.ora の正本がどこにあるか把握している

## まとめ

- **tnsnames.ora は「接続名 → ホスト・ポート・サービス名」の対応表**、sqlnet.ora は通信の共通設定、listener.ora はサーバー側の受付設定です。開発者がまず読めるべきなのは tnsnames.ora です。
- トラブルの大半は「**別のフォルダの tnsnames.ora が読まれている**」ことです。`TNS_ADMIN` で置き場所を1か所に固定しましょう。
- ORA-12154 は「**書き方 → 読まれているフォルダ → DEFAULT_DOMAIN**」の順に確認すれば、ほぼ解決できます。

次の記事では、接続できた SQL Developer を現場で安全に使うために、**初日にやっておく設定**を扱います。
