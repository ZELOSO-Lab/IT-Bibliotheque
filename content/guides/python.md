---
title: Python 技術まとめ
slug: python
excerpt: Pythonの基本文法と用途、Windows・Linuxでのインストールと仮想環境の作り方、pipなどよく使うコマンド、CSV集計スクリプトなどのサンプル、よくあるエラーと対処、文字コードや依存管理の実務Tipsまで、現場で最初に必要になる情報を1ページにまとめました。
updated: 2026-10-19
---

# Python 技術まとめ

## 基礎

Python は、読みやすい文法と豊富なライブラリを持つ汎用プログラミング言語です。業務の自動化スクリプトから、データ分析、Web アプリ・API、AI・機械学習まで幅広く使われます。コンパイル不要で、書いたファイルをそのまま `python` コマンドで実行できます。

### 主な用途

| 用途 | 代表的なライブラリ・ツール | 一言でいうと |
| --- | --- | --- |
| 業務自動化・スクリプト | 標準ライブラリ（`pathlib` `csv` `subprocess`）、openpyxl | ファイル整理・CSV加工・Excel操作をバッチ化 |
| データ分析 | pandas、NumPy、matplotlib、Jupyter | 表データの集計・可視化 |
| Webアプリ・API | Django、Flask、FastAPI | 管理画面付きの業務システムから軽量APIまで |
| AI・機械学習 | scikit-learn、PyTorch | モデルの学習・推論 |
| インフラ・運用 | boto3（AWS）、Ansible | クラウド操作や構成管理 |

### まず押さえる特徴

| 項目 | 内容 | 現場での注意点 |
| --- | --- | --- |
| インデント | ブロックは `{}` ではなく字下げで表す | スペース4つに統一。タブとの混在はエラーになる |
| 動的型付け | 変数に型宣言は不要 | 型ヒント（`def f(a: int) -> str:`）を書くとエディタ補完と静的チェックが効く |
| バージョン | Python 3 系が対象。Python 2 はサポート終了済み | 古い資料の `print "x"`（2系の書き方）はそのまま動かない |
| パッケージ | PyPI からpipでインストール | プロジェクトごとに**仮想環境（venv）**を分けるのが基本 |
| 実行 | インタプリタで逐次実行 | 起動は速いが、重い数値計算はNumPyなどC実装のライブラリに任せる |

### 基本文法

```python
name = "Taro"
items = [1, 2, 3]                      # リスト
user = {"id": 1, "name": "Taro"}       # 辞書

print(f"Hello {name}")                 # f文字列
doubled = [x * 2 for x in items if x > 1]   # 内包表記 → [4, 6]

for i, x in enumerate(items):          # インデックス付きループ
    print(i, x)

def add(a: int, b: int) -> int:        # 型ヒント付き関数
    return a + b

value = user.get("email", "")          # キーがなくてもエラーにしない
```

## 環境構築

### 1. インストール

| OS | 方法 | 補足 |
| --- | --- | --- |
| Windows | python.org の公式インストーラー | インストール時に **「Add python.exe to PATH」にチェック**。`py` ランチャーも一緒に入る |
| macOS | python.org のインストーラー、または Homebrew（`brew install python`） | OS付属の Python は使わない |
| Linux（Ubuntu など） | `sudo apt install python3 python3-venv python3-pip` | システムの Python は OS が使っているため、pip で直接パッケージを入れない |

Windows で `python` と打つと Microsoft Store が開く場合は、「設定 > アプリ > アプリ実行エイリアス」で `python.exe` / `python3.exe` のエイリアスをオフにします。

### 2. インストールの確認

```sh
python --version        # Linux / macOS では python3 --version
python -m pip --version
```

Windows では `py` ランチャーで複数バージョンを使い分けられます。

```bat
py --list               :: インストール済みのバージョン一覧（py -0 でも可）
py -3.12 --version      :: バージョンを指定して実行
```

### 3. プロジェクトごとに仮想環境を作る

```sh
mkdir myproject && cd myproject
python -m venv .venv

# 有効化
source .venv/bin/activate          # Linux / macOS
.venv\Scripts\activate.bat         # Windows（コマンドプロンプト）
.venv\Scripts\Activate.ps1         # Windows（PowerShell）

python -m pip install --upgrade pip
python -m pip install requests
deactivate                         # 無効化
```

有効化するとプロンプトの先頭に `(.venv)` が付き、`python` と `pip` がその環境のものになります。`.venv` フォルダは Git にコミットせず、`.gitignore` に追加します。

### 4. 社内プロキシ環境の場合

```sh
# その場だけ指定
python -m pip install --proxy http://proxy.example.co.jp:8080 requests

# 設定ファイルに保存（Windows: %APPDATA%\pip\pip.ini / Linux: ~/.config/pip/pip.conf）
python -m pip config set global.proxy http://proxy.example.co.jp:8080
```

SSL インスペクション（社内CAで通信を中継する仕組み）がある環境では、社内CAの証明書ファイルを `--cert` または `pip config set global.cert <パス>` で指定します。

### 5. エディタ

VS Code ＋ 公式の Python 拡張機能が定番です。コマンドパレットの「Python: Select Interpreter」で `.venv` の Python を選ぶと、補完・デバッグ・テスト実行がその仮想環境で動きます。

## コマンド

### 実行

| 操作 | コマンド |
| --- | --- |
| スクリプト実行 | `python app.py` |
| 対話モード（REPL） | `python` （終了は `exit()`） |
| モジュールとして実行 | `python -m http.server 8000` |
| 1行だけ実行 | `python -c "import sys; print(sys.version)"` |
| 構文チェック | `python -m py_compile app.py` |
| デバッガ付きで実行 | `python -m pdb app.py` |

`python -m http.server 8000` はカレントフォルダを簡易Webサーバーで公開します。動作確認用で、本番用途には使いません。

### パッケージ管理（pip）

```sh
python -m pip install requests                 # インストール
python -m pip install "requests>=2.31,<3"      # バージョン範囲を指定
python -m pip install -U requests              # アップグレード
python -m pip uninstall requests
python -m pip list                             # 一覧
python -m pip list --outdated                  # 更新があるもの
python -m pip show requests                    # 詳細（バージョン・依存）
python -m pip freeze > requirements.txt        # 依存を書き出す
python -m pip install -r requirements.txt      # 依存を一括インストール
```

`pip` を直接呼ぶより `python -m pip` のほうが、**今使っている Python に確実にインストール**されます。複数バージョンが入った Windows では特に有効です。

### 早見表：文字列・リスト・辞書

| 操作 | コマンド・構文 |
| --- | --- |
| 分割・結合 | `s.split(",")` / `",".join(items)` |
| 前後の空白除去 | `s.strip()` |
| スライス | `a[1:3]` / `a[-1]` / `a[::-1]` |
| ソート | `sorted(users, key=lambda u: u["age"], reverse=True)` |
| 辞書のループ | `for k, v in d.items(): ...` |
| 存在確認 | `if "key" in d:` / `if x in items:` |

### 早見表：ファイル・例外

| 操作 | コマンド・構文 |
| --- | --- |
| 読み込み | `with open("a.txt", encoding="utf-8") as f: text = f.read()` |
| 書き込み | `Path("out.txt").write_text(text, encoding="utf-8")` |
| CSV | `csv.DictReader(f)` / `csv.writer(f)` （`open` は `newline=""` 付き） |
| JSON | `json.load(f)` / `json.dumps(obj, ensure_ascii=False, indent=2)` |
| 例外処理 | `try: ... except ValueError as e: print(e)` |

### 早見表：よく使う標準ライブラリ

| 操作 | コマンド・構文 |
| --- | --- |
| パス操作 | `Path("logs").glob("*.log")` / `Path(__file__).parent` |
| 日時 | `datetime.now().strftime("%Y-%m-%d %H:%M:%S")` |
| コマンド実行 | `subprocess.run(["git", "status"], check=True, capture_output=True, text=True)` |
| 環境変数 | `os.environ.get("DB_HOST", "localhost")` |
| 引数解析 | `argparse.ArgumentParser()` |
| HTTP（外部ライブラリ） | `requests.get(url, timeout=10).json()` |

## サンプル

### CSV を部署別に集計する（Excel 対応）

```python
"""売上CSVを部署ごとに集計し、Excelで開けるCSVに出力する"""
import argparse
import csv
import logging
from collections import defaultdict
from pathlib import Path

logger = logging.getLogger(__name__)


def summarize(src: Path) -> dict[str, int]:
    totals: dict[str, int] = defaultdict(int)
    # Excel で保存した UTF-8 CSV は BOM 付きのことが多いので utf-8-sig で読む
    with src.open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            try:
                dept, amount = row["部署"], int(row["金額"])
            except (KeyError, ValueError):
                logger.warning("不正な行をスキップ: %s", row)
                continue
            totals[dept] += amount
    return dict(totals)


def main() -> None:
    parser = argparse.ArgumentParser(description="売上CSVを部署別に集計")
    parser.add_argument("src", type=Path, help="入力CSV")
    parser.add_argument("-o", "--out", type=Path, default=Path("summary.csv"))
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    totals = summarize(args.src)
    # Windows の Excel でそのまま開けるよう BOM 付き UTF-8 で書く
    with args.out.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["部署", "合計"])
        for dept, total in sorted(totals.items()):
            writer.writerow([dept, total])
    logger.info("%d 部署を %s に出力しました", len(totals), args.out)


if __name__ == "__main__":
    main()
```

```sh
python sales.py 売上.csv -o 集計.csv
```

ポイントは3つです。Excel が出力した CSV は BOM 付きのことがあるので **`utf-8-sig` で読む**、CSV を開くときは **`newline=""` を付ける**（付けないと Windows で空行が混ざる）、出力も `utf-8-sig` にすると **Excel で開いても文字化けしない**、です。

### 標準ライブラリだけで JSON API を呼ぶ

```python
import json
import urllib.error
import urllib.request


def get_json(url: str, timeout: float = 10.0) -> dict:
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return json.load(res)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {url}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"接続できません: {e.reason}") from e
```

外部ライブラリを入れられない環境向けです。使えるなら `requests` のほうが簡潔に書けます。どちらの場合も**`timeout` は必ず指定**します（指定しないと応答がないときに永久に待ち続けることがあります）。

### 定期実行用バッチの雛形

```python
import logging
import sys
from pathlib import Path

LOG_DIR = Path(__file__).resolve().parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
logging.basicConfig(
    filename=LOG_DIR / "batch.log",
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    encoding="utf-8",
)


def run() -> None:
    logging.info("処理開始")
    # ... 本処理 ...
    logging.info("処理終了")


if __name__ == "__main__":
    try:
        run()
    except Exception:
        logging.exception("異常終了")   # スタックトレースごと記録
        sys.exit(1)                     # タスクスケジューラ / cron に失敗を伝える
```

タスクスケジューラや cron から実行するときは、カレントディレクトリが想定と違うことが多いため、パスは `Path(__file__)` を基準に組み立てます。Python も `.venv\Scripts\python.exe` のように**仮想環境の Python をフルパスで指定**します。

## エラー対応

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `ModuleNotFoundError: No module named 'requests'` | パッケージ未インストール、または別の Python・仮想環境で実行している | 仮想環境を有効化してから `python -m pip install requests`。`python -c "import sys; print(sys.executable)"` で実行中の Python を確認 |
| `IndentationError: expected an indented block after 'if' statement on line 1` | `if` などの後の字下げがない | ブロックの中身をスペース4つで字下げする |
| `TabError: inconsistent use of tabs and spaces in indentation` | タブとスペースが混在 | エディタでタブをスペースに変換し、スペース4つに統一 |
| `NameError: name 'x' is not defined` | 変数名のタイプミス、定義前に使用、import 忘れ | スペル・定義順・import を確認 |
| `TypeError: can only concatenate str (not "int") to str` | 文字列と数値を `+` で連結 | `f"{name}{num}"` か `str(num)` を使う |
| `AttributeError: 'NoneType' object has no attribute 'split'` | 関数の戻り値や `dict.get()` が `None` だった | 値が `None` になる経路を確認し、`if value is None:` で分岐 |
| `KeyError: 'k'` | 辞書に存在しないキーを `d["k"]` で参照 | `d.get("k")` を使うか、`"k" in d` で確認 |
| `IndexError: list index out of range` | リストの範囲外を参照（空リストの `[0]` など） | `len()` を確認、空の場合の分岐を入れる |
| `ValueError: invalid literal for int() with base 10: 'abc'` | 数値に変換できない文字列 | 入力値を検証し、`try` / `except ValueError` で処理 |
| `UnicodeDecodeError: 'utf-8' codec can't decode byte 0x82 in position 0: invalid start byte` | Shift_JIS（cp932）のファイルを UTF-8 で読んだ | `open(..., encoding="cp932")` で読む |
| `FileNotFoundError: [Errno 2] No such file or directory: 'data.csv'` | 相対パスの基準（カレントディレクトリ）が違う | `Path(__file__).parent / "data.csv"` で絶対パスを組み立てる |
| `UnboundLocalError: cannot access local variable 'x' where it is not associated with a value` | 関数内でグローバル変数に代入しようとした | 引数と戻り値で受け渡す（`global` は最終手段） |
| `json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)` | 空文字や HTML（エラーページ）を JSON として解析 | HTTP ステータスと応答本文を先に確認する |
| `error: externally-managed-environment` | Linux のシステム Python に直接 pip でインストールしようとした | 仮想環境を作ってその中でインストールする |
| PowerShell で `Activate.ps1` 実行時に「このシステムではスクリプトの実行が無効になっているため…」 | PowerShell の実行ポリシー | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`（社内ポリシーで禁止ならコマンドプロンプトで `activate.bat` を使う） |

**トレースバック（Traceback）の読み方**

1. **一番下の行**がエラーの種類とメッセージ。まずここを読む
2. その上に、呼び出し元から順に「どのファイルの何行目か」が並ぶ
3. 自分のコードの行のうち、**最も下にあるもの**が直接の原因であることが多い（ライブラリ内部の行は後回し）

## 実務Tips

### 環境・依存管理

- **プロジェクトごとに venv を作る**。グローバルに pip install すると、別プロジェクトとバージョンが衝突する
- `requirements.txt` は `pip freeze` で**バージョンを固定**して Git 管理する。本番と開発で同じバージョンを使える
- Python 本体のバージョンも README などに明記する。サポートが終了したバージョンはセキュリティ修正が出ないため、公式のサポート期限を定期的に確認する
- 新しいプロジェクトでは、高速なパッケージ管理ツール uv（`uv venv` / `uv pip install`）を使う現場も増えている。チームで道具を揃えることが大事

### 文字コード・Windows 対策

- `open()` には**必ず `encoding=` を指定**する。省略すると OS 依存（日本語 Windows では cp932 になることがある）で、他環境で文字化けやエラーになる
- 社内システムが出力する CSV は Shift_JIS（`cp932`）のことが多い。`shift_jis` より `cp932` のほうが Windows 固有の文字（①、髙など）も扱える
- Windows のパスは `r"C:\work\data"` のように raw 文字列にするか、`Path` と `/` 演算子を使う。`"C:\new"` は `\n` が改行と解釈される
- 標準出力の文字化けやエラーには、環境変数 `PYTHONUTF8=1`（UTF-8 モード）が有効なことがある

### コードの品質

- 例外は `except Exception: pass` で握りつぶさない。最低でも `logging.exception()` でスタックトレースを残す
- `print` デバッグの代わりに `logging` を使うと、本番でもレベルを変えるだけで出力を制御できる
- フォーマッタ・リンター（Ruff、Black など）と型チェッカー（mypy など）を導入し、レビューでの細かい指摘を減らす
- テストは標準の `unittest` か、記述が簡潔な `pytest` で書く
- パスワードや API キーはコードに書かず、環境変数や `.env` ファイル（Git 管理外）から読む

### よくある落とし穴

- **デフォルト引数にリストや辞書を使わない**（`def f(items=[])` は呼び出し間で同じリストが共有される）。`items=None` にして関数内で作る
- `is` と `==` は別物。値の比較は `==`、`None` との比較だけ `is None` を使う
- 浮動小数点の誤差（`0.1 + 0.2 != 0.3`）に注意。金額計算は `decimal.Decimal` か整数（円単位）で行う
- `subprocess.run(..., shell=True)` に外部入力を渡すとコマンドインジェクションになる。引数はリストで渡す

## 関連リンク

- [Python 公式ドキュメント（日本語）](https://docs.python.org/ja/3/)
- [Python チュートリアル](https://docs.python.org/ja/3/tutorial/index.html)
- [Python 標準ライブラリ](https://docs.python.org/ja/3/library/index.html)
- [venv — 仮想環境の作成](https://docs.python.org/ja/3/library/venv.html)
- [Python ダウンロード（python.org）](https://www.python.org/downloads/)
- [PyPI（パッケージ検索）](https://pypi.org/)
- [pip ドキュメント](https://pip.pypa.io/en/stable/)
