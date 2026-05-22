// ============================================
// Gmail → Supabase 自動取得スクリプト（複数アカウント対応）
// Google Apps Script に貼り付けて使う
// ============================================

// ─── 設定（ここを変更してください） ───
const SUPABASE_URL = 'https://dgfguaswqlsapgbfvtdv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnZmd1YXN3cWxzYXBnYmZ2dGR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTEwMjgsImV4cCI6MjA5NDkyNzAyOH0.qz7VNnEe53G3Fa7fE5VMkVbf-W6ws98muePAdSZqKQY';

// ─── 複数アカウント設定 ───
// アカウントを追加する場合は、ここに追加してください
// account_id: SupabaseのaccountsテーブルのID
// gmail: そのアカウントのGmailアドレス（このスクリプトを実行するGoogleアカウントのメール）
const ACCOUNTS = [
  {
    account_id: 'bbdb433e-b849-45d4-9e7a-f734f200d132',
    gmail: 'rukario.619322@gmail.com'
  },
  // ↓ 2つ目以降のアカウントを追加する場合はここに追加
  // {
  //   account_id: 'ここにSupabaseのaccount_idを入れる',
  //   gmail: 'example@gmail.com'
  // },
];

// 取得するメールの件数（最新N件）
const MAX_EMAILS = 20;

// ─── メイン関数（これを実行する） ───
function fetchGmailToSupabase() {
  let totalAdded = 0;

  for (const account of ACCOUNTS) {
    Logger.log(`--- ${account.gmail} のメール取得開始 ---`);
    const added = fetchForAccount(account);
    totalAdded += added;
    Logger.log(`${account.gmail}: ${added}件追加`);
  }

  Logger.log(`完了: 合計${totalAdded}件の新しいメールを保存しました`);
}

// ─── アカウントごとのメール取得 ───
function fetchForAccount(account) {
  // このGoogleアカウントの受信トレイから、対象アドレス宛のメールを取得
  const query = `to:${account.gmail} OR from:${account.gmail}`;
  const threads = GmailApp.search(query, 0, MAX_EMAILS);
  let addedCount = 0;

  for (const thread of threads) {
    const messages = thread.getMessages();

    for (const message of messages) {
      const messageId = message.getId();

      // 既にSupabaseに保存済みか確認
      if (isAlreadySaved(messageId, account.account_id)) continue;

      // メールデータを作成
      const emailData = {
        account_id: account.account_id,
        message_id: messageId,
        from_address: extractEmail(message.getFrom()),
        from_name: extractName(message.getFrom()),
        to_address: message.getTo(),
        subject: message.getSubject() || '(件名なし)',
        body_text: message.getPlainBody() || '',
        body_html: message.getBody() || '',
        received_at: message.getDate().toISOString(),
        is_read: !message.isUnread(),
        source: 'gmail'
      };

      // Supabaseに保存
      const success = saveToSupabase(emailData);
      if (success) addedCount++;
    }
  }

  return addedCount;
}

// ─── Supabaseにメールを保存 ───
function saveToSupabase(emailData) {
  const url = `${SUPABASE_URL}/rest/v1/emails`;

  const options = {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    payload: JSON.stringify(emailData),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();

  if (code === 201 || code === 200) {
    return true;
  } else {
    Logger.log(`エラー (${code}): ${response.getContentText()}`);
    return false;
  }
}

// ─── 既に保存済みか確認 ───
function isAlreadySaved(messageId, accountId) {
  const url = `${SUPABASE_URL}/rest/v1/emails?message_id=eq.${encodeURIComponent(messageId)}&account_id=eq.${accountId}&select=id`;

  const options = {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());
  return data.length > 0;
}

// ─── ヘルパー関数 ───
function extractEmail(fromStr) {
  const match = fromStr.match(/<(.+?)>/);
  return match ? match[1] : fromStr.trim();
}

function extractName(fromStr) {
  const match = fromStr.match(/^(.+?)\s*</);
  return match ? match[1].replace(/"/g, '').trim() : '';
}

// ─── 自動実行の設定（初回のみ実行） ───
function setupTrigger() {
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  // 5分ごとに実行するトリガーを作成
  ScriptApp.newTrigger('fetchGmailToSupabase')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('✅ 5分ごとの自動実行トリガーを設定しました');
}

// ─── Webアプリとして公開（ブラウザから呼び出し可能） ───
function doGet(e) {
  fetchGmailToSupabase();
  const output = ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'Gmail取得完了（全アカウント）'
  }));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function doPost(e) {
  fetchGmailToSupabase();
  const output = ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'Gmail取得完了（全アカウント）'
  }));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ─── 手動テスト用 ───
function testConnection() {
  for (const account of ACCOUNTS) {
    const url = `${SUPABASE_URL}/rest/v1/accounts?id=eq.${account.account_id}&select=*`;

    const options = {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    Logger.log(`${account.gmail} 接続テスト: ${response.getContentText()}`);
  }
}
