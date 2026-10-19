---
title: AWS 技術まとめ
slug: aws
excerpt: AWSの基本用語と主要サービス、アカウント作成からCLIの初期設定、よく使うコマンド、IAMポリシーやLambdaのサンプル、よくあるエラーと対処、料金事故を防ぐ実務Tipsまで、現場で最初に必要になる情報を1ページにまとめました。
updated: 2026-10-18
---

# AWS 技術まとめ

## 基礎

AWS（Amazon Web Services）は、サーバー・ストレージ・データベース・ネットワークなどを、必要なときに必要な分だけ借りられるクラウドサービスです。画面（マネジメントコンソール）からも、コマンド（AWS CLI）やプログラム（SDK）からも同じ操作ができます。

### まず押さえる用語

| 用語 | 意味 | 現場での注意点 |
| --- | --- | --- |
| リージョン | データセンターがある地域（例: 東京 `ap-northeast-1`、大阪 `ap-northeast-3`） | リソースはリージョンごとに別。「作ったはずのEC2がない」はリージョン違いが多い |
| アベイラビリティーゾーン（AZ） | リージョン内の独立したデータセンター群（例: `ap-northeast-1a`） | 本番は2つ以上のAZに分けて置くのが基本 |
| IAM | ユーザー・ロール・権限（ポリシー）を管理するサービス | 「誰が・何に・何をできるか」はすべてIAMで決まる |
| ARN | AWS上のリソースを一意に表す名前（`arn:aws:s3:::my-bucket`） | IAMポリシーの `Resource` に書く |
| VPC | AWS上に作る自分専用のネットワーク | サブネット・ルートテーブル・セキュリティグループで通信を制御する |
| セキュリティグループ | インスタンス単位のファイアウォール（許可ルールのみ） | 「つながらない」の原因の第1位 |
| タグ | リソースに付けるキーと値（`Env=prod` など） | 費用の集計・権限の制御・棚卸しに使う |

### 主要サービス

| 分類 | サービス | 一言でいうと |
| --- | --- | --- |
| コンピューティング | EC2 | 仮想サーバー。OSから自分で管理する |
| | Lambda | サーバーなしで関数を実行。実行時間分だけ課金 |
| | ECS / Fargate | コンテナを実行する |
| ストレージ | S3 | ファイル（オブジェクト）置き場。容量無制限、静的サイトも配信できる |
| | EBS | EC2にくっつけるディスク |
| データベース | RDS / Aurora | MySQL・PostgreSQL・Oracle・SQL Serverなどのマネージド版 |
| | DynamoDB | キーバリュー型のNoSQL |
| ネットワーク | VPC | 専用ネットワーク |
| | Route 53 | DNS |
| | CloudFront | CDN（キャッシュ配信） |
| | ELB（ALB / NLB） | ロードバランサー |
| 監視・運用 | CloudWatch | メトリクス・ログ・アラーム |
| | CloudTrail | 「誰がいつ何をしたか」の操作履歴 |
| セキュリティ | IAM / IAM Identity Center | ユーザー・権限・シングルサインオン |
| | KMS / Secrets Manager | 暗号鍵・パスワードなどの秘密情報 |

### 責任共有モデル

AWSが責任を持つのは「クラウドそのもの」（建物・物理サーバー・仮想化基盤）までです。**OSのパッチ、セキュリティグループの設定、IAMの権限、データの暗号化などは利用者の責任**です。EC2より Lambda や RDS のようなマネージドサービスのほうが、利用者が管理する範囲は小さくなります。

### 料金の考え方

- 基本は**従量課金**（起動している時間、保存している容量、転送したデータ量）
- **停止し忘れ**と**データ転送（特にインターネット向け・NAT Gateway経由）**が想定外の請求の二大原因
- 新規アカウントには無料利用枠がありますが、対象と上限はサービスごとに異なります。必ず料金ページで確認します

## 環境構築

### 1. アカウントを作り、ルートユーザーを守る

1. AWSアカウントを作成する（メールアドレス・クレジットカード・電話番号が必要）
2. **ルートユーザーにMFA（多要素認証）を設定する**
3. ルートユーザーのアクセスキーは**作らない**。日常の作業ではルートユーザーを使わない
4. 「Billing and Cost Management」で**予算アラート（AWS Budgets）**を作る（例: 月10ドルを超えたらメール）

### 2. 作業用のユーザーを用意する

推奨は **IAM Identity Center（旧 AWS SSO）** でユーザーを作り、一時的な認証情報でログインする方法です。小規模で IAM ユーザーを使う場合も、MFAを必須にし、必要な権限だけを付けます。

| 方法 | 認証情報 | 向いている場面 |
| --- | --- | --- |
| IAM Identity Center | 一時的（数時間で失効） | 個人・チームの日常作業（推奨） |
| IAMユーザー＋アクセスキー | 長期間有効 | どうしても必要な外部ツール連携のみ |
| IAMロール | 一時的（自動で更新） | EC2・Lambdaなど、AWS上のプログラム |

### 3. AWS CLI v2 をインストールする

```sh
# Linux（x86_64）
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
unzip awscliv2.zip
sudo ./aws/install
aws --version
```

Windows は公式サイトの MSI インストーラー、macOS は pkg インストーラーを使います。インストール後、新しいターミナルで `aws --version` が表示されればOKです。

### 4. 認証情報を設定する

IAM Identity Center を使う場合:

```sh
aws configure sso          # 初回だけ。SSOの開始URLとリージョンを入力
aws sso login --profile dev
aws sts get-caller-identity --profile dev
```

アクセスキーを使う場合:

```sh
aws configure --profile dev
# AWS Access Key ID: AKIA...
# AWS Secret Access Key: ...
# Default region name: ap-northeast-1
# Default output format: json
aws sts get-caller-identity --profile dev
```

設定は `~/.aws/config`（リージョン・出力形式）と `~/.aws/credentials`（アクセスキー）に保存されます。Windows では `%USERPROFILE%\.aws\` です。

```ini
# ~/.aws/config
[profile dev]
region = ap-northeast-1
output = json

[profile prod]
region = ap-northeast-1
output = json
```

`aws sts get-caller-identity` で**自分が今どのアカウント・どのユーザーで操作しているか**が表示されます。作業前に必ず実行する癖をつけると、本番と開発の取り違えを防げます。

## コマンド

### 共通オプション

| オプション | 用途 | 例 |
| --- | --- | --- |
| `--profile` | 使う認証情報を切り替える | `--profile prod` |
| `--region` | リージョンを指定する | `--region ap-northeast-1` |
| `--output` | 出力形式（json / table / text / yaml） | `--output table` |
| `--query` | 出力を絞り込む（JMESPath） | `--query "Buckets[].Name"` |
| `--dry-run` | 権限があるかだけ確認する（EC2など） | `aws ec2 stop-instances --dry-run ...` |

毎回 `--profile` を付けるのが面倒なら、`export AWS_PROFILE=dev`（Windows は `set AWS_PROFILE=dev`）で切り替えます。

### 認証・アカウント

```sh
aws sts get-caller-identity                 # 今の操作ユーザーとアカウントID
aws configure list                           # どの認証情報・リージョンが効いているか
aws configure list-profiles                  # 設定済みプロファイル一覧
```

### S3

```sh
aws s3 ls                                    # バケット一覧
aws s3 ls s3://my-bucket/logs/ --recursive --human-readable --summarize
aws s3 cp ./report.csv s3://my-bucket/reports/
aws s3 cp s3://my-bucket/reports/report.csv ./
aws s3 sync ./dist s3://my-bucket/ --delete --dryrun   # 差分の確認だけ
aws s3 sync ./dist s3://my-bucket/ --delete             # 実際に同期
aws s3 rm s3://my-bucket/tmp/ --recursive
aws s3 presign s3://my-bucket/reports/report.csv --expires-in 3600   # 1時間有効なURL
```

`sync --delete` は**転送元にないファイルを転送先から削除**します。必ず `--dryrun` で確認してから実行します。

### EC2

```sh
# 一覧（ID・状態・Nameタグ・プライベートIP）
aws ec2 describe-instances \
  --query "Reservations[].Instances[].[InstanceId,State.Name,Tags[?Key=='Name']|[0].Value,PrivateIpAddress]" \
  --output table

# 起動中だけ
aws ec2 describe-instances --filters "Name=instance-state-name,Values=running" \
  --query "Reservations[].Instances[].InstanceId" --output text

aws ec2 start-instances --instance-ids i-0123456789abcdef0
aws ec2 stop-instances --instance-ids i-0123456789abcdef0
aws ec2 describe-security-groups --group-ids sg-0123456789abcdef0
```

### CloudWatch Logs

```sh
aws logs describe-log-groups --query "logGroups[].logGroupName" --output text
aws logs tail /aws/lambda/my-function --since 1h --follow     # CLI v2
aws logs filter-log-events --log-group-name /aws/lambda/my-function \
  --filter-pattern "ERROR" --start-time 1760745600000
```

### IAM

```sh
aws iam list-users --query "Users[].UserName" --output text
aws iam list-attached-user-policies --user-name taro
aws iam list-roles --query "Roles[].RoleName" --output text
```

### RDS・Lambda

```sh
aws rds describe-db-instances \
  --query "DBInstances[].[DBInstanceIdentifier,DBInstanceStatus,Endpoint.Address]" --output table

aws lambda list-functions --query "Functions[].[FunctionName,Runtime]" --output table
aws lambda invoke --function-name my-function --payload '{"name":"test"}' \
  --cli-binary-format raw-in-base64-out out.json
cat out.json
```

## サンプル

### 最小権限の IAM ポリシー（特定バケットの特定フォルダだけ読み書き）

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListOnlyReportsPrefix",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::my-bucket",
      "Condition": { "StringLike": { "s3:prefix": ["reports/*"] } }
    },
    {
      "Sid": "ReadWriteReports",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::my-bucket/reports/*"
    }
  ]
}
```

ポイントは、`ListBucket` は**バケット自体**（`arn:aws:s3:::my-bucket`）、`GetObject` / `PutObject` は**オブジェクト**（`.../reports/*`）に付けることです。ここを混同すると `AccessDenied` になります。

### Lambda 関数（Python）

```python
import json
import os


def lambda_handler(event, context):
    name = event.get("name", "world")
    stage = os.environ.get("STAGE", "dev")
    print(f"stage={stage} name={name}")  # CloudWatch Logs に出る
    return {
        "statusCode": 200,
        "body": json.dumps({"message": f"Hello, {name}!"}, ensure_ascii=False),
    }
```

`print` の出力は CloudWatch Logs の `/aws/lambda/関数名` に記録されます。`aws logs tail /aws/lambda/関数名 --follow` で、実行しながらログを確認できます。

### EC2 起動時に自動で Web サーバーを入れる（ユーザーデータ）

```sh
#!/bin/bash
dnf -y install nginx
systemctl enable --now nginx
echo "hello from $(hostname)" > /usr/share/nginx/html/index.html
```

Amazon Linux 2023 の場合の例です。ユーザーデータは**初回起動時に root で1回だけ**実行され、ログは `/var/log/cloud-init-output.log` に残ります。

### 静的サイトを S3 に公開する流れ

1. バケットを作る（`aws s3 mb s3://my-site-bucket --region ap-northeast-1`）
2. ビルド結果をアップロード（`aws s3 sync ./dist s3://my-site-bucket/ --delete`）
3. 公開は **CloudFront ＋ OAC（Origin Access Control）** で行い、バケット自体は非公開のままにする
4. 更新後にキャッシュを消す（`aws cloudfront create-invalidation --distribution-id E1234567890 --paths "/*"`）

## エラー対応

| エラーメッセージ | 主な原因 | 対処 |
| --- | --- | --- |
| `Unable to locate credentials` | 認証情報が設定されていない／プロファイル名の違い | `aws configure list` で確認。`--profile` や `AWS_PROFILE` を見直す |
| `An error occurred (ExpiredToken)` / `The SSO session ... has expired` | 一時認証情報の期限切れ | `aws sso login --profile xxx` で再ログイン |
| `InvalidClientTokenId` / `SignatureDoesNotMatch` | アクセスキーの誤り・無効化、PCの時刻ずれ | キーを再確認。時刻を NTP で合わせる |
| `AccessDenied` / `UnauthorizedOperation` | IAMポリシーに権限がない、Resource の書き方の誤り | エラーに出る Action と ARN を確認し、ポリシーと照合。`--dry-run` で事前確認 |
| `Could not connect to the endpoint URL` | リージョン名の誤り、プロキシ、ネットワーク | `--region` を確認。社内プロキシなら `HTTPS_PROXY` を設定 |
| リソースが見つからない（`does not exist`） | **リージョン違い**、アカウント違い | `aws sts get-caller-identity` と `--region` を確認 |
| SSH・RDS 接続がタイムアウト | セキュリティグループ、ルートテーブル、パブリックIPなし | 送信元IPの許可、サブネットのルート（IGW / NAT）、ネットワークACLを順に確認 |
| S3 で `403 Forbidden` | バケットポリシー、ブロックパブリックアクセス、KMS 暗号化の権限 | IAMとバケットポリシーの両方を確認。KMS なら `kms:Decrypt` も必要 |
| `ThrottlingException` / `Rate exceeded` | API 呼び出しが多すぎる | 間隔を空けて再試行。`AWS_RETRY_MODE=adaptive` を設定 |
| Lambda の `Task timed out` | タイムアウト設定が短い、VPC 内から外部に出られない | タイムアウトを延ばす。VPC 内なら NAT Gateway か VPC エンドポイントが必要 |

**`AccessDenied` の切り分け順**

1. `aws sts get-caller-identity` で、想定したユーザー・ロールか確認する
2. エラーメッセージの `is not authorized to perform: <Action> on resource: <ARN>` をそのまま読む
3. その Action と ARN が、付いているポリシーに含まれているか確認する（ARN の末尾の `/*` の有無に注意）
4. 明示的な `Deny`（SCP、権限境界、バケットポリシー）がないか確認する

## 実務Tips

### 料金事故を防ぐ

- **AWS Budgets のアラートを最初に設定**する。請求額は翌月まで気づきにくい
- 検証で作ったものは**その日のうちに削除**する。EC2 は停止しても **EBS と Elastic IP は課金**が続く
- **NAT Gateway は置いておくだけで課金**される（時間料金＋処理データ量）。検証環境では作りっぱなしにしない
- すべてのリソースに `Project` `Env` `Owner` タグを付け、Cost Explorer でタグ別に集計する

### セキュリティ

- アクセスキーを**ソースコード・Git・Excel に書かない**。漏れると数時間で不正利用されることがある
- EC2・Lambda からは**アクセスキーではなく IAM ロール**で権限を渡す
- ポリシーは `"Action": "*"` から始めず、必要な操作だけを足していく
- **CloudTrail** を有効にし、「誰が消したか」を後から追えるようにしておく
- セキュリティグループで `0.0.0.0/0` に SSH（22）や RDP（3389）を開けない。踏み台か Session Manager を使う

### 運用・作業ミスの防止

- 作業前に `aws sts get-caller-identity` と `--region` を確認する（本番と開発の取り違え防止）
- プロファイル名は `dev` / `stg` / `prod` のように環境がわかる名前にする
- 削除・同期系のコマンドは `--dryrun`（S3）や `--dry-run`（EC2）で先に確認する
- 手作業で作った環境は再現できない。慣れてきたら CloudFormation や Terraform で**コード化**する
- 本番に関わる操作は、実行するコマンドを事前に手順書へ書き、レビューを受けてから実行する

## 関連リンク

- [AWS ドキュメント（日本語）](https://docs.aws.amazon.com/ja_jp/)
- [AWS CLI ユーザーガイド](https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/cli-chap-welcome.html)
- [AWS CLI コマンドリファレンス](https://awscli.amazonaws.com/v2/documentation/api/latest/index.html)
- [IAM のセキュリティのベストプラクティス](https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/best-practices.html)
- [AWS 料金計算ツール](https://calculator.aws/)
- [AWS 無料利用枠](https://aws.amazon.com/jp/free/)
- [AWS Well-Architected フレームワーク](https://aws.amazon.com/jp/architecture/well-architected/)
