---
title: Python 技術まとめ
slug: python
excerpt: Pythonの基本文法、環境構築、ライブラリ、エラー対応などの技術情報をまとめています。
updated: 2026-10-19
---

# Python 技術まとめ

## 基礎

自動化、データ分析、Web、AIまで幅広く使われる言語。

### 主な用途

- 業務自動化・スクリプト
- データ分析
- Webアプリ・API
- AI・機械学習

## 環境構築

> この項目（インストール手順・初期設定・動作確認）は現在執筆中です。最新の情報は[Python 公式ドキュメント](https://docs.python.org/ja/3/)を参照してください。

## コマンド

### 仮想環境の作成

```
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
```

### パッケージ管理

```
pip install requests
pip freeze > requirements.txt
pip install -r requirements.txt
```

### ファイル読み込み

```
with open('data.txt', encoding='utf-8') as f:
    for line in f:
        print(line.rstrip())
```

### 早見表：環境

| 操作 | コマンド・構文 |
| --- | --- |
| 仮想環境 | `python -m venv .venv` |
| 有効化 | `source .venv/bin/activate # Windows: .venv\Scripts\activate` |
| パッケージ | `pip install requests` |
| 依存の書き出し | `pip freeze > requirements.txt` |

### 早見表：基本構文

| 操作 | コマンド・構文 |
| --- | --- |
| f文字列 | `f"Hello {name}"` |
| リスト・辞書 | `a = [1, 2, 3] d = {"key": "value"}` |
| 内包表記 | `[x * 2 for x in a if x > 0]` |
| 関数 | `def add(a: int, b: int) -> int:     return a + b` |

### 早見表：文字列・リスト

| 操作 | コマンド・構文 |
| --- | --- |
| 分割・結合 | `s.split(",") ",".join(items)` |
| スライス | `a[1:3]  a[-1]  a[::-1]` |
| ソート | `sorted(users, key=lambda u: u.age)` |
| enumerate | `for i, x in enumerate(a): ...` |

### 早見表：ファイル・例外

| 操作 | コマンド・構文 |
| --- | --- |
| 読み込み | `with open("a.txt", encoding="utf-8") as f:     text = f.read()` |
| CSV | `import csv rows = list(csv.reader(f))` |
| JSON | `import json data = json.load(f)` |
| 例外処理 | `try:     ... except ValueError as e:     print(e)` |

### 早見表：よく使う標準ライブラリ

| 操作 | コマンド・構文 |
| --- | --- |
| パス操作 | `from pathlib import Path Path("dir").glob("*.txt")` |
| 日時 | `from datetime import datetime datetime.now().strftime("%Y-%m-%d")` |
| コマンド実行 | `subprocess.run(["ls", "-l"], check=True)` |
| HTTP | `requests.get(url, timeout=10).json()` |

## サンプル

> この項目（サンプルコード・設定例）は現在執筆中です。最新の情報は[Python 公式ドキュメント](https://docs.python.org/ja/3/)を参照してください。

## エラー対応

> この項目（よくあるエラーと対処法）は現在執筆中です。最新の情報は[Python 公式ドキュメント](https://docs.python.org/ja/3/)を参照してください。

## 実務Tips

> この項目（現場で役立つノウハウ・注意点）は現在執筆中です。最新の情報は[Python 公式ドキュメント](https://docs.python.org/ja/3/)を参照してください。

## 関連リンク

- [Python 公式ドキュメント](https://docs.python.org/ja/3/)
