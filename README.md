# 📧 Web Mail Viewer

自分のメールアドレスを登録すると、そのアドレスに届いたメールをWebブラウザから確認できるサービスです。

## 機能

- **メールアドレス登録**: 任意のメールアドレスを登録
- **SMTP受信サーバー**: 登録したアドレス宛のメールを直接受信
- **Gmail連携**: Gmail OAuth2を使ってGmailのメールも取得可能
- **Webインターフェース**: ブラウザからメールを閲覧・管理
- **リアルタイム更新**: 30秒ごとに自動更新

## セットアップ

### 1. インストール

```bash
git clone https://github.com/pika1104/web-mail-viewer.git
cd web-mail-viewer
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` ファイルを編集して設定を入力してください。

### 3. 起動

```bash
npm start
```

- Web UI: http://localhost:3000
- SMTP Server: port 2525

## 使い方

### 基本的な使い方

1. ブラウザで http://localhost:3000 を開く
2. サイドバーからメールアドレスを登録
3. そのアドレス宛にメールを送信（SMTPポート2525宛）
4. Webページ上でメールを確認

### SMTPでメールを送信するテスト

```bash
# swaks コマンドを使用
swaks --to registered@example.com --from sender@example.com \
  --server localhost --port 2525 \
  --header "Subject: テスト" --body "Hello!"
```

### Gmail連携

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) でOAuth2クライアントを作成
2. `.env` に `GMAIL_CLIENT_ID` と `GMAIL_CLIENT_SECRET` を設定
3. リダイレクトURIに `http://localhost:3000/api/gmail/callback` を追加
4. Web UIの「Gmail連携」ボタンからOAuth認証
5. 「Gmail取得」ボタンでメールを取得

## 本番環境へのデプロイ

### ドメインでメールを受信する場合

1. ドメインのMXレコードをサーバーのIPに設定
2. SMTPポートを25に変更（root権限が必要）
3. Let's Encryptなどで証明書を取得してTLSを有効化

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000 2525
CMD ["npm", "start"]
```

## API

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | /api/accounts | アカウント登録 |
| GET | /api/accounts | アカウント一覧 |
| DELETE | /api/accounts/:id | アカウント削除 |
| GET | /api/accounts/:id/emails | メール一覧 |
| GET | /api/emails/:id | メール詳細 |
| DELETE | /api/emails/:id | メール削除 |
| PATCH | /api/emails/:id/read | 既読/未読切替 |
| GET | /api/gmail/auth-url | Gmail認証URL取得 |
| POST | /api/accounts/:id/fetch-gmail | Gmailメール取得 |
| GET | /api/stats | 統計情報 |

## 技術スタック

- **Backend**: Node.js, Express
- **SMTP**: smtp-server (Node.js)
- **Database**: SQLite (better-sqlite3)
- **Gmail**: Google APIs (OAuth2 + Gmail API)
- **Frontend**: Vanilla HTML/CSS/JavaScript

## ライセンス

MIT
