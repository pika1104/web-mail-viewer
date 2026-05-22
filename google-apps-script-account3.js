// ============================================
// Gmail → Supabase 自動取得スクリプト
// 1104a1104b@gmail.com 用
// このスクリプトは 1104a1104b@gmail.com の
// Googleアカウントで作成してください
// ============================================

// ─── 設定 ───
const SUPABASE_URL = 'https://dgfguaswqlsapgbfvtdv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnZmd1YXN3cWxzYXBnYmZ2dGR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTEwMjgsImV4cCI6MjA5NDkyNzAyOH0.qz7VNnEe53G3Fa7fE5VMkVbf-W6ws98muePAdSZqKQY';
const ACCOUNT_ID = 'b06d438d-3587-4445-ab30-7a3336242f4c';
const MAX_EMAILS = 20;

// ─── メイン関数（これを実行する） ───
function fetchGmailToSupabase() {
  const threads = GmailApp.getInboxThreads(0, MAX_EMAILS);
  let addedCount = 0;

  for (const thread of threads) {
    const messages = thread.getMessages();

    for (const message of messages) {
      const messageId = message.getId();

      // 既にSupabaseに保存済みか確認
      if (isAlreadySaved(messageId)) continue;

      // メールデータを作成
      const emailData = {
        account_id: ACCOUNT_ID,
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

  Logger.log(`完了: ${addedCount}件の新しいメールを保存しました`);
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
function isAlreadySaved(messageId) {
  const url = `${SUPABASE_URL}/rest/v1/emails?message_id=eq.${encodeURIComponent(messageId)}&account_id=eq.${ACCOUNT_ID}&select=id`;

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
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));

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
    message: 'Gmail取得完了'
  }));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function doPost(e) {
  fetchGmailToSupabase();
  const output = ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'Gmail取得完了'
  }));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
