const { google } = require('googleapis');
const { getDB } = require('./db');

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/gmail/callback';

function getOAuth2Client() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Gmail OAuth credentials not configured. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env');
  }
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

// Generate OAuth URL for Gmail access
function getGmailAuthUrl(accountId) {
  const oauth2Client = getOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
    ],
    state: String(accountId),
    prompt: 'consent',
  });
  return url;
}

// Handle OAuth callback
async function handleGmailCallback(code, state) {
  const accountId = parseInt(state);
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  const db = getDB();
  db.prepare(`
    UPDATE accounts 
    SET gmail_refresh_token = ?, gmail_access_token = ?, gmail_token_expiry = ?
    WHERE id = ?
  `).run(
    tokens.refresh_token || null,
    tokens.access_token,
    tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    accountId
  );

  console.log(`✅ Gmail connected for account ${accountId}`);
}

// Fetch messages from Gmail
async function fetchGmailMessages(accountId) {
  const db = getDB();
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId);

  if (!account || !account.gmail_refresh_token) {
    throw new Error('Gmail not connected for this account');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: account.gmail_refresh_token,
    access_token: account.gmail_access_token,
  });

  // Refresh token if needed
  const tokenInfo = await oauth2Client.getAccessToken();
  if (tokenInfo.token !== account.gmail_access_token) {
    db.prepare('UPDATE accounts SET gmail_access_token = ? WHERE id = ?')
      .run(tokenInfo.token, accountId);
  }

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Get recent messages
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 20,
    q: `to:${account.email}`,
  });

  const messages = response.data.messages || [];
  let newCount = 0;

  for (const msg of messages) {
    // Check if already stored
    const existing = db.prepare('SELECT id FROM emails WHERE message_id = ? AND account_id = ?')
      .get(msg.id, accountId);
    if (existing) continue;

    // Fetch full message
    const full = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full',
    });

    const headers = full.data.payload.headers;
    const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const from = getHeader('From');
    const subject = getHeader('Subject') || '(件名なし)';
    const date = getHeader('Date');

    // Extract body
    let bodyText = '', bodyHtml = '';
    function extractBody(payload) {
      if (payload.mimeType === 'text/plain' && payload.body?.data) {
        bodyText = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      }
      if (payload.mimeType === 'text/html' && payload.body?.data) {
        bodyHtml = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      }
      if (payload.parts) {
        payload.parts.forEach(extractBody);
      }
    }
    extractBody(full.data.payload);

    // Parse from address
    const fromMatch = from.match(/<(.+?)>/);
    const fromAddress = fromMatch ? fromMatch[1] : from;
    const fromName = from.replace(/<.+?>/, '').trim().replace(/"/g, '');

    db.prepare(`
      INSERT INTO emails (account_id, message_id, from_address, from_name, to_address, subject, body_text, body_html, received_at, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'gmail')
    `).run(
      accountId,
      msg.id,
      fromAddress,
      fromName,
      account.email,
      subject,
      bodyText,
      bodyHtml,
      date ? new Date(date).toISOString() : new Date().toISOString()
    );
    newCount++;
  }

  return newCount;
}

module.exports = { getGmailAuthUrl, handleGmailCallback, fetchGmailMessages };
