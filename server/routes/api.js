const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const { fetchGmailMessages, getGmailAuthUrl, handleGmailCallback } = require('../gmail');

// ─── Account Registration ───

// Register a new email address
router.post('/accounts', (req, res) => {
  const { email, display_name } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const db = getDB();
  try {
    const existing = db.prepare('SELECT id FROM accounts WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered', account_id: existing.id });
    }
    const result = db.prepare('INSERT INTO accounts (email, display_name) VALUES (?, ?)').run(email, display_name || '');
    res.status(201).json({ id: result.lastInsertRowid, email, message: 'Account registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all registered accounts
router.get('/accounts', (req, res) => {
  const db = getDB();
  const accounts = db.prepare('SELECT id, email, display_name, created_at FROM accounts').all();
  res.json(accounts);
});

// Delete an account
router.delete('/accounts/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM emails WHERE account_id = ?').run(req.params.id);
  db.prepare('DELETE FROM accounts WHERE id = ?').run(req.params.id);
  res.json({ message: 'Account deleted' });
});

// ─── Email Operations ───

// Get emails for an account
router.get('/accounts/:id/emails', (req, res) => {
  const db = getDB();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  const emails = db.prepare(`
    SELECT id, from_address, from_name, subject, received_at, is_read, source
    FROM emails
    WHERE account_id = ?
    ORDER BY received_at DESC
    LIMIT ? OFFSET ?
  `).all(req.params.id, limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM emails WHERE account_id = ?').get(req.params.id);

  res.json({ emails, total: total.count, page, limit });
});

// Get a single email
router.get('/emails/:id', (req, res) => {
  const db = getDB();
  const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(req.params.id);
  if (!email) return res.status(404).json({ error: 'Email not found' });

  // Mark as read
  db.prepare('UPDATE emails SET is_read = 1 WHERE id = ?').run(req.params.id);
  email.is_read = 1;

  res.json(email);
});

// Delete an email
router.delete('/emails/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM emails WHERE id = ?').run(req.params.id);
  res.json({ message: 'Email deleted' });
});

// Mark email as read/unread
router.patch('/emails/:id/read', (req, res) => {
  const db = getDB();
  const { is_read } = req.body;
  db.prepare('UPDATE emails SET is_read = ? WHERE id = ?').run(is_read ? 1 : 0, req.params.id);
  res.json({ message: 'Updated' });
});

// ─── Gmail Integration ───

// Get Gmail OAuth URL
router.get('/gmail/auth-url', (req, res) => {
  const { account_id } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id required' });
  try {
    const url = getGmailAuthUrl(account_id);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gmail OAuth callback
router.get('/gmail/callback', async (req, res) => {
  const { code, state } = req.query;
  try {
    await handleGmailCallback(code, state);
    res.redirect('/?gmail=connected');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch Gmail messages for an account
router.post('/accounts/:id/fetch-gmail', async (req, res) => {
  try {
    const count = await fetchGmailMessages(parseInt(req.params.id));
    res.json({ message: `Fetched ${count} new emails from Gmail` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Stats ───

router.get('/stats', (req, res) => {
  const db = getDB();
  const accounts = db.prepare('SELECT COUNT(*) as count FROM accounts').get();
  const emails = db.prepare('SELECT COUNT(*) as count FROM emails').get();
  const unread = db.prepare('SELECT COUNT(*) as count FROM emails WHERE is_read = 0').get();
  res.json({
    total_accounts: accounts.count,
    total_emails: emails.count,
    unread_emails: unread.count,
  });
});

module.exports = router;
