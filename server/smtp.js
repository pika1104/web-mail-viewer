const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const { getDB } = require('./db');

const smtpServer = new SMTPServer({
  // Allow connections without authentication (open relay for receiving)
  authOptional: true,
  disabledCommands: ['AUTH'],
  
  // Allow any sender
  onMailFrom(address, session, callback) {
    callback();
  },

  // Check if recipient is registered
  onRcptTo(address, session, callback) {
    const db = getDB();
    const account = db.prepare('SELECT id FROM accounts WHERE email = ?').get(address.address);
    if (!account) {
      return callback(new Error(`Mailbox ${address.address} not found`));
    }
    callback();
  },

  // Process incoming email
  onData(stream, session, callback) {
    let emailData = '';
    stream.on('data', (chunk) => { emailData += chunk.toString(); });
    stream.on('end', async () => {
      try {
        const parsed = await simpleParser(emailData);
        const db = getDB();

        // Get all recipients
        const recipients = session.envelope.rcptTo.map(r => r.address);

        for (const recipient of recipients) {
          const account = db.prepare('SELECT id FROM accounts WHERE email = ?').get(recipient);
          if (account) {
            db.prepare(`
              INSERT INTO emails (account_id, message_id, from_address, from_name, to_address, subject, body_text, body_html, source)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'smtp')
            `).run(
              account.id,
              parsed.messageId || null,
              parsed.from?.value?.[0]?.address || 'unknown',
              parsed.from?.value?.[0]?.name || '',
              recipient,
              parsed.subject || '(件名なし)',
              parsed.text || '',
              parsed.html || '',
            );
            console.log(`📨 Email received for ${recipient} from ${parsed.from?.value?.[0]?.address}`);
          }
        }
        callback();
      } catch (err) {
        console.error('Error processing email:', err);
        callback(err);
      }
    });
  },

  // Log errors
  onError(err) {
    console.error('SMTP Error:', err);
  }
});

module.exports = smtpServer;
