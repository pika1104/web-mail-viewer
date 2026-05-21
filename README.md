# 📧 Web Mail Viewer

自分のメールアドレスを登録すると、そのアドレスに届いたメールをWebブラウザから確認できるサービスです。

## 🚀 Supabase バックエンド版 (New!)

Supabaseを利用して、サーバーのインストールなしで動作するバージョンを追加しました。
データベース、認証、リアルタイム通知、Edge Functionsを利用しています。

### 特徴
- **Supabase Auth**: メール/パスワードによるユーザー認証
- **Supabase DB**: アカウント情報とメールデータの永続化
- **Supabase Realtime**: 新着メールの自動更新
- **Edge Functions**: Gmail API連携（シミュレーション）
- **No Build Step**: HTMLファイルをブラウザで開くだけで動作（SDKはCDN経由）

### セットアップ手順

1. **Supabase プロジェクトの作成**: [Supabase Dashboard](https://app.supabase.com/) でプロジェクトを作成。
2. **データベースのセットアップ**: `supabase/migrations/20240521000000_create_tables.sql` を SQL Editor で実行。
3. **Edge Functions のデプロイ**: `supabase functions deploy fetch-gmail` を実行。
4. **アプリの起動**: `index.html` をブラウザで開き、Supabase URL と Anon Key を入力。

---

## 🚀 インストール不要版（ローカルストレージ版）

**`index.html` をダウンロードしてブラウザで開くだけ！**

1. `index.html` をダウンロード
2. ブラウザで開く
3. メールアドレスを登録
4. Gmail連携を設定してメールを取得

---

## セットアップ（サーバー版 - Node.js）

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

### 3. 起動

```bash
npm start
```

## ディレクトリ構成
- `index.html`: フロントエンド（Supabase JS SDK使用）
- `supabase/`
  - `migrations/`: テーブル定義SQL
  - `functions/`: Gmail連携用 Edge Functions (Deno)
- `server/`: Node.js サーバー版のソースコード
- `client/`: 以前のクライアント用ソース

## ライセンス
MIT
