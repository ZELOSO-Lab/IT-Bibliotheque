---
series: 現場の声
no: 0002
title: 【C言語】「gccが見つかりません」から始まった環境構築で詰まった7つのことと、迷わない手順（Windows / Linux）
slug: c-dev-environment-setup
category: C言語
tags: [C言語, 環境構築, gcc, MSYS2, VS Code, Makefile, 文字化け]
excerpt: Windows（MSYS2 + gcc + VS Code）とLinuxでC言語の開発環境を作るときに、現場でよく詰まる7つのポイントと、最短で動くところまで持っていく手順をまとめました。
status: draft
created: 2026-10-12
---

# 【C言語】「gccが見つかりません」から始まった環境構築で詰まった7つのことと、迷わない手順（Windows / Linux）

## 現場の声

> 「来週から組込み系の案件に入ってもらうので、C言語の環境だけ作っておいてください」
>
> そう言われて、ネットの記事を見ながら MinGW を入れました。ところがコマンドプロンプトで `gcc` と打つと「'gcc' は、内部コマンドまたは外部コマンド…として認識されていません」。PATH を通したら今度は動いたものの、`printf("こんにちは")` が**文字化け**。VS Code で F5 を押すと「launch.json がありません」。
>
> 結局、Hello World が正しく表示されるまでに丸一日かかりました。

C言語の環境構築は「コンパイラを入れるだけ」に見えて、**PATH・文字コード・エディタ設定**の3か所で詰まりがちです。この記事では、現場でよく出る詰まりどころと、最短で動く手順を整理します。

## 前提の構成

この記事で作る環境は次のとおりです。

| 項目 | Windows | Linux（Ubuntu / Debian 系） |
| --- | --- | --- |
| コンパイラ | MSYS2 の UCRT64 環境の gcc | ディストリビューション標準の gcc |
| デバッガ | gdb（MSYS2 から導入） | gdb |
| ビルド | make（mingw32-make） | make |
| エディタ | VS Code + C/C++ 拡張機能 | VS Code + C/C++ 拡張機能 |

```text
C:\work\hello\            ← 作業フォルダ（日本語・スペースを含まないパス）
├─ src\
│   └─ main.c
├─ Makefile
└─ .vscode\
    ├─ tasks.json          … ビルド設定
    └─ launch.json         … デバッグ設定
```

- Visual Studio（MSVC）を使う方法もありますが、現場の Linux 機・組込みツールチェーンと挙動を揃えやすいので、ここでは gcc に統一します。
- 古い記事で紹介されている「MinGW（mingw.org 版）」は更新が止まっています。Windows では **MSYS2** を使うのが現在の定番です。

## ハマりどころ1：「gcc は認識されていません」— PATH が通っていない

**症状**

```text
C:\> gcc --version
'gcc' は、内部コマンドまたは外部コマンド、
操作可能なプログラムまたはバッチ ファイルとして認識されていません。
```

**原因**

MSYS2 で gcc をインストールしても、Windows の PATH には自動で追加されません。MSYS2 専用のターミナル（UCRT64）の中でしか gcc が見えない状態です。

**対処：使う環境の bin フォルダを PATH に追加する。**

1. スタートメニューで「環境変数」と検索 →「システム環境変数の編集」→「環境変数」
2. ユーザー環境変数の `Path` に `C:\msys64\ucrt64\bin` を追加
3. **開いているコマンドプロンプト・VS Code をすべて閉じて開き直す**（ここを忘れて「まだ認識されない」となるケースが非常に多いです）

```text
C:\> where gcc
C:\msys64\ucrt64\bin\gcc.exe
```

`where gcc` で**1行だけ**表示されれば OK です。2行以上出る場合は次のハマりどころへ。

## ハマりどころ2：gcc が複数入っていて、別のものが動いている

**症状**

- `gcc --version` のバージョンが、入れたはずのものと違う
- ビルドは通るのに、実行すると「libgcc_s_seh-1.dll が見つかりません」「エントリポイントが見つかりません」

**原因**

過去に入れた MinGW、Strawberry Perl、Git for Windows、他の IDE（Code::Blocks など）に同梱された gcc が PATH の前の方にあり、そちらが優先されています。コンパイラと実行時 DLL のバージョンが食い違うと、ビルドできても実行で落ちます。

**対処**

```text
C:\> where gcc
C:\Strawberry\c\bin\gcc.exe        ← こちらが優先されている
C:\msys64\ucrt64\bin\gcc.exe
```

- 使わない方を PATH から外すか、`C:\msys64\ucrt64\bin` を一番上に移動する
- MSYS2 の中でも `mingw64` / `ucrt64` / `clang64` / `msys` と複数の環境があります。**1つ（UCRT64）に決めて混ぜない**のが安全です

## ハマりどころ3：日本語が文字化けする

**症状**

```c
printf("こんにちは\n");
```

を実行すると `縺薙ｓ縺ｫ縺｡縺ｯ` のように表示される。

**原因**

ソースファイルの文字コード（VS Code の既定は UTF-8）と、Windows のコンソールの文字コード（日本語環境の既定は Shift_JIS 系の CP932）が一致していません。gcc は文字列をソースのバイト列のまま実行ファイルに埋め込むため、UTF-8 のバイト列を CP932 として表示して化けます。

**対処：どちらかに揃える。** 現場では次の2択です。

| 方法 | コマンド・設定 | 向いている場面 |
| --- | --- | --- |
| 実行ファイル側を CP932 にする | `gcc -finput-charset=UTF-8 -fexec-charset=CP932 ...` | 既存の Windows 向け資産、客先の環境を変えられない |
| コンソール側を UTF-8 にする | 実行前に `chcp 65001` | 新規開発、Linux と同じソースを使う |

```text
C:\work\hello> chcp 65001
Active code page: 65001
C:\work\hello> hello.exe
こんにちは
```

- 既存ソースが Shift_JIS で書かれている案件では、VS Code 右下の文字コード表示をクリックして「エンコード付きで再度開く → Japanese (Shift JIS)」で開きます。**UTF-8 で保存し直すと既存ソースが壊れる**ので、保存前に必ず確認してください。
- Linux では端末もソースも UTF-8 が標準なので、通常この問題は起きません。

## ハマりどころ4：警告を出さない設定で、バグを見逃す

**症状**

ビルドは通るのに、実行すると変な値が出る・落ちる。

```c
#include <stdio.h>

int main(void) {
    int count = 5;
    if (count = 0) {          /* == のつもりが = */
        printf("zero\n");
    }
    printf("%d\n", count);
}
```

**原因**

gcc は既定ではほとんど警告を出しません。上のコードは `-Wall` なしだと何も言わずにコンパイルされます。

**対処：最初から警告オプションを付ける。**

```text
gcc -std=c11 -Wall -Wextra -g -O0 -o hello src/main.c
```

| オプション | 意味 |
| --- | --- |
| `-std=c11` | 準拠する規格を明示（案件に合わせて `c99` / `gnu11` など） |
| `-Wall -Wextra` | よくあるミスの警告を有効化 |
| `-g` | デバッグ情報を埋め込む（gdb で使う） |
| `-O0` | 最適化なし（デバッグ時に変数が消えない） |

```text
src/main.c:5:9: warning: suggest parentheses around assignment used as truth value [-Wparentheses]
```

警告は「エラーではないから無視」ではなく、**ゼロにする**のを基本ルールにします。チームで徹底したい場合は `-Werror`（警告をエラー扱い）を付けます。

## ハマりどころ5：VS Code で F5 を押しても動かない

**症状**

- 「launch.json がありません」「preLaunchTask 'build' が見つかりません」
- `#include <stdio.h>` に赤い波線（インクルードパスが見つからない）

**原因**

VS Code は**エディタ**であり、コンパイラの場所やビルド方法を自分では知りません。C/C++ 拡張機能に「どの gcc を使い、どうビルドし、どう起動するか」を設定ファイルで教える必要があります。

**対処：`.vscode` に3つの設定を置く。**

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "build",
      "type": "shell",
      "command": "make",
      "group": { "kind": "build", "isDefault": true },
      "problemMatcher": ["$gcc"]
    }
  ]
}
```

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "gdb で起動",
      "type": "cppdbg",
      "request": "launch",
      "program": "${workspaceFolder}/hello.exe",
      "cwd": "${workspaceFolder}",
      "MIMode": "gdb",
      "miDebuggerPath": "C:/msys64/ucrt64/bin/gdb.exe",
      "preLaunchTask": "build",
      "externalConsole": false
    }
  ]
}
```

```json
// .vscode/c_cpp_properties.json（赤い波線対策）
{
  "configurations": [
    {
      "name": "Win32",
      "compilerPath": "C:/msys64/ucrt64/bin/gcc.exe",
      "cStandard": "c11",
      "intelliSenseMode": "windows-gcc-x64"
    }
  ],
  "version": 4
}
```

- Linux では `program` を `${workspaceFolder}/hello`、`miDebuggerPath` を `/usr/bin/gdb`、`compilerPath` を `/usr/bin/gcc`、`intelliSenseMode` を `linux-gcc-x64` にします。
- `compilerPath` を指定すると、拡張機能が gcc 自身に標準ヘッダの場所を問い合わせるので、インクルードパスを手で書く必要がなくなります。

## ハマりどころ6：日本語・スペースを含むパスで謎のエラー

**症状**

```text
gcc: error: C:\Users\山田 太郎\Documents\C言語\main.c: No such file or directory
make: *** No rule to make target 'C:/Users/山田', needed by 'all'.  Stop.
```

**原因**

make はスペースを区切り文字として扱います。また古いツールや一部のデバッガは、日本語パスの扱いが不安定です。Windows のユーザー名が日本語だと、`ドキュメント` 配下が丸ごと危険地帯になります。

**対処：作業フォルダは `C:\work\` のような英数字だけのパスに置く。** MSYS2 自体のインストール先も既定の `C:\msys64` のままにします。

## ハマりどころ7：ファイルが増えたら、毎回長いコマンドを打っている

**症状**

ファイルが3つ、4つと増えると、毎回 `gcc -Wall -Wextra -g -o app main.c util.c list.c ...` を手で打つことになり、1つ書き忘れて「undefined reference to `list_add'」。

**原因**

C言語は**ソースファイルごとにコンパイルし、最後にリンクする**仕組みです。`undefined reference` はリンク時のエラーで、関数の本体を持つ .c ファイルがコマンドに含まれていないことを意味します（ヘッダの `#include` だけでは解決しません）。

**対処：最初から Makefile を用意する。**

```makefile
# Makefile
CC      := gcc
CFLAGS  := -std=c11 -Wall -Wextra -g -O0
TARGET  := hello
SRCS    := $(wildcard src/*.c)
OBJS    := $(SRCS:.c=.o)

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^

src/%.o: src/%.c
	$(CC) $(CFLAGS) -c -o $@ $<

clean:
	rm -f $(TARGET) $(TARGET).exe $(OBJS)

.PHONY: all clean
```

- `src/` に .c を追加するだけで自動的にビルド対象になります。
- **レシピ行（`$(CC) ...` の行）の先頭はタブ文字**です。スペースだと `missing separator. Stop.` になります。VS Code が自動でスペースに変換していないか確認してください。
- Windows の MSYS2 では `make` パッケージを入れるか、`mingw32-make` を使います（下の手順参照）。

## 迷わない手順（まとめ）

### Windows

1. **MSYS2 をインストール**：公式サイト（msys2.org）からインストーラーを取得し、既定の `C:\msys64` に入れる
2. **UCRT64 ターミナルで gcc 一式を入れる**（スタートメニューの「MSYS2 UCRT64」を起動）

   ```bash
   pacman -Syu        # 途中でターミナルが閉じたら、もう一度起動して再実行
   pacman -S --needed mingw-w64-ucrt-x86_64-gcc mingw-w64-ucrt-x86_64-gdb mingw-w64-ucrt-x86_64-make
   ```

3. **PATH に `C:\msys64\ucrt64\bin` を追加**し、ターミナルと VS Code を開き直す
4. **確認**：コマンドプロンプトで `where gcc` が1行、`gcc --version` と `gdb --version` が表示される
5. **make を使えるようにする**：`mingw32-make` をそのまま使うか、`C:\msys64\ucrt64\bin\mingw32-make.exe` をコピーして `make.exe` にする
6. **VS Code に拡張機能「C/C++」（Microsoft）を入れる**
7. **作業フォルダ `C:\work\hello` を作り**、`src\main.c` / `Makefile` / `.vscode\*.json` を置く
8. **Ctrl+Shift+B でビルド、F5 でデバッグ起動**。日本語表示は `chcp 65001` か `-fexec-charset=CP932` で揃える

### Linux（Ubuntu / Debian 系）

```bash
sudo apt update
sudo apt install -y build-essential gdb    # gcc / make / 標準ヘッダ一式
gcc --version && gdb --version && make --version
```

RHEL / Rocky Linux 系では `sudo dnf groupinstall "Development Tools"` と `sudo dnf install gdb` です。

### 動作確認用のソース

```c
/* src/main.c */
#include <stdio.h>

int main(void)
{
    printf("Hello, C! こんにちは\n");
    return 0;
}
```

```text
$ make
gcc -std=c11 -Wall -Wextra -g -O0 -c -o src/main.o src/main.c
gcc -std=c11 -Wall -Wextra -g -O0 -o hello src/main.o
$ ./hello
Hello, C! こんにちは
```

## チェックリスト

- [ ] `where gcc`（Linux は `which gcc`）が1行だけ表示される
- [ ] `gcc --version` / `gdb --version` / `make --version` がすべて動く
- [ ] MSYS2 の環境は UCRT64 に統一し、他の gcc と混ぜていない
- [ ] 作業フォルダのパスに日本語・スペースが含まれていない
- [ ] コンパイルオプションに `-Wall -Wextra -g` を付けている
- [ ] 日本語の表示方法（`chcp 65001` か `-fexec-charset=CP932`）をチームで決めた
- [ ] 既存ソースの文字コードを確認してから開いている
- [ ] `.vscode` に tasks.json / launch.json / c_cpp_properties.json がある
- [ ] Makefile のレシピ行がタブで始まっている
- [ ] Ctrl+Shift+B でビルド、F5 でブレークポイントに止まる

## まとめ

- Windows では **MSYS2（UCRT64）** を入れ、`C:\msys64\ucrt64\bin` を PATH に追加するのが最短です。PATH 変更後はターミナルを開き直します。
- 文字化けは「ソースの文字コード」と「コンソールの文字コード」のずれです。どちらに揃えるかを最初に決めます。
- `-Wall -Wextra -g` と Makefile は、環境構築の時点で用意しておくと後のデバッグが格段に楽になります。

次の記事では、この環境を使って C言語で最も事故が多い「メモリ管理」を扱います。
