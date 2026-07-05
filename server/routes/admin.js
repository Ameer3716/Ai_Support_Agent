const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { config } = require('../config');
const { requireAdmin } = require('../middleware/auth');
const { adminLoginLimiter } = require('../middleware/rateLimiter');
const { ingestDocument, extractTextFromFile, extractTextFromUrl } = require('../services/ingest');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const router = express.Router();

function newKey(bytes = 16) {
  return crypto.randomBytes(bytes).toString('hex');
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// ---------- Auth ----------

router.post('/login', adminLoginLimiter, (req, res) => {
  const { password } = req.body;
  if (!config.admin.password || !config.admin.jwtSecret) {
    return res.status(500).json({ error: 'Admin auth is not configured on the server (ADMIN_PASSWORD / ADMIN_JWT_SECRET).' });
  }
  if (!password || !timingSafeEqual(password, config.admin.password)) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }
  const token = jwt.sign({ role: 'admin' }, config.admin.jwtSecret, { expiresIn: '12h' });
  res.json({ token });
});

router.use(requireAdmin);

// ---------- Clients ----------

function clientStats(clientId) {
  const conversations = db.prepare('SELECT COUNT(*) n FROM conversations WHERE client_id = ?').get(clientId).n;
  const messages = db
    .prepare(
      `SELECT COUNT(*) n FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE client_id = ?)`
    )
    .get(clientId).n;
  const leads = db.prepare('SELECT COUNT(*) n FROM leads WHERE client_id = ?').get(clientId).n;
  const documents = db.prepare('SELECT COUNT(*) n FROM documents WHERE client_id = ?').get(clientId).n;
  const chunks = db.prepare('SELECT COUNT(*) n FROM chunks WHERE client_id = ?').get(clientId).n;
  const escalated = db.prepare('SELECT COUNT(*) n FROM conversations WHERE client_id = ? AND escalated = 1').get(clientId).n;
  const today = new Date().toISOString().slice(0, 10);
  const usageToday = db.prepare('SELECT message_count FROM usage_daily WHERE client_id = ? AND day = ?').get(clientId, today);

  return {
    conversations,
    messages,
    leads,
    documents,
    chunks,
    escalatedConversations: escalated,
    resolvedWithoutHandoffPct: conversations ? Math.round(((conversations - escalated) / conversations) * 100) : null,
    messagesToday: usageToday ? usageToday.message_count : 0,
  };
}

router.get('/clients', (req, res) => {
  const clients = db.prepare('SELECT * FROM clients ORDER BY created_at DESC').all();
  res.json(clients.map((c) => ({ ...c, stats: clientStats(c.id) })));
});

router.get('/clients/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found.' });
  res.json({ ...client, stats: clientStats(client.id) });
});

router.post('/clients', (req, res) => {
  const {
    name,
    ownerEmail,
    allowedOrigins,
    systemPrompt,
    welcomeMessage,
    brandColor,
    logoUrl,
    widgetPosition,
    dailyMessageQuota,
    handoffEmail,
    whatsappNumber,
  } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required.' });

  const id = uuidv4();
  const clientKey = newKey(8);
  const adminSecret = newKey(24);

  db.prepare(
    `INSERT INTO clients
      (id, client_key, admin_secret, name, owner_email, allowed_origins, system_prompt, welcome_message,
       brand_color, logo_url, widget_position, daily_message_quota, handoff_email, whatsapp_number)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    clientKey,
    adminSecret,
    name.trim(),
    ownerEmail || null,
    allowedOrigins || null,
    systemPrompt || null,
    welcomeMessage || 'Hi! How can I help you today?',
    brandColor || '#4F46E5',
    logoUrl || null,
    widgetPosition || 'bottom-right',
    dailyMessageQuota === undefined || dailyMessageQuota === null || dailyMessageQuota === ''
      ? config.defaultDailyMessageQuota
      : dailyMessageQuota,
    handoffEmail || null,
    whatsappNumber || null
  );

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  res.status(201).json(client);
});

router.patch('/clients/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found.' });

  const fields = {
    name: 'name',
    ownerEmail: 'owner_email',
    allowedOrigins: 'allowed_origins',
    systemPrompt: 'system_prompt',
    welcomeMessage: 'welcome_message',
    brandColor: 'brand_color',
    logoUrl: 'logo_url',
    widgetPosition: 'widget_position',
    dailyMessageQuota: 'daily_message_quota',
    handoffEmail: 'handoff_email',
    whatsappNumber: 'whatsapp_number',
    instagramPageId: 'instagram_page_id',
    instagramPageToken: 'instagram_page_token',
    isActive: 'is_active',
  };

  const updates = [];
  const values = [];
  for (const [bodyKey, column] of Object.entries(fields)) {
    if (req.body[bodyKey] !== undefined) {
      updates.push(`${column} = ?`);
      values.push(req.body[bodyKey]);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No updatable fields provided.' });

  values.push(req.params.id);
  db.prepare(`UPDATE clients SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id));
});

router.post('/clients/:id/rotate-secret', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found.' });
  const adminSecret = newKey(24);
  db.prepare('UPDATE clients SET admin_secret = ? WHERE id = ?').run(adminSecret, req.params.id);
  res.json({ adminSecret });
});

router.delete('/clients/:id', (req, res) => {
  const info = db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Client not found.' });
  res.json({ ok: true });
});

router.get('/clients/:id/embed-snippet', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found.' });

  const snippet = `<script src="${config.publicBaseUrl}/widget/embed.js" data-client="${client.client_key}" async></script>`;
  const whatsappWebhook = `${config.publicBaseUrl}/webhook/whatsapp/${client.client_key}`;
  const instagramWebhook = `${config.publicBaseUrl}/webhook/instagram`; // one shared URL for every client
  res.json({ snippet, whatsappWebhook, instagramWebhook, clientKey: client.client_key, adminSecret: client.admin_secret });
});

// ---------- Documents / knowledge base ----------

router.get('/clients/:id/documents', (req, res) => {
  const docs = db
    .prepare('SELECT * FROM documents WHERE client_id = ? ORDER BY created_at DESC')
    .all(req.params.id);
  res.json(docs);
});

router.post('/clients/:id/documents/text', async (req, res, next) => {
  try {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found.' });
    const { title, text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'text is required.' });

    const result = await ingestDocument({
      clientId: client.id,
      title: title || 'Pasted text',
      sourceType: 'text',
      source: '(pasted text)',
      rawText: text,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.post('/clients/:id/documents/file', upload.single('file'), async (req, res, next) => {
  try {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found.' });
    if (!req.file) return res.status(400).json({ error: 'file is required (multipart field name "file").' });

    const rawText = await extractTextFromFile(req.file);
    const result = await ingestDocument({
      clientId: client.id,
      title: req.file.originalname,
      sourceType: 'file',
      source: req.file.originalname,
      rawText,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.post('/clients/:id/documents/url', async (req, res, next) => {
  try {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found.' });
    const { url } = req.body;
    if (!url || !/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'A valid http(s) url is required.' });

    const rawText = await extractTextFromUrl(url);
    const result = await ingestDocument({
      clientId: client.id,
      title: url,
      sourceType: 'url',
      source: url,
      rawText,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.delete('/documents/:docId', (req, res) => {
  const info = db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.docId);
  if (info.changes === 0) return res.status(404).json({ error: 'Document not found.' });
  res.json({ ok: true });
});

// ---------- Conversations ----------

router.get('/clients/:id/conversations', (req, res) => {
  const conversations = db
    .prepare(
      `SELECT c.*,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) AS message_count
       FROM conversations c WHERE c.client_id = ? ORDER BY c.last_message_at DESC LIMIT 200`
    )
    .all(req.params.id);
  res.json(conversations);
});

router.get('/conversations/:convId/messages', (req, res) => {
  const messages = db
    .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
    .all(req.params.convId);
  res.json(messages);
});

// ---------- Leads ----------

router.get('/clients/:id/leads', (req, res) => {
  const leads = db.prepare('SELECT * FROM leads WHERE client_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json(leads);
});

function csvEscape(value) {
  const s = value === null || value === undefined ? '' : String(value);
  // Quote any field containing a comma, quote, or newline; double up embedded quotes.
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Lets an operator (or the business owner themselves) pull captured leads into
 * their own CRM/spreadsheet — a small feature, but a concrete, demoable one:
 * "here's a CSV of everyone the bot talked to who wanted a human" is an easy
 * thing to show a prospective client during a sales call.
 */
router.get('/clients/:id/leads.csv', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found.' });

  const leads = db.prepare('SELECT * FROM leads WHERE client_id = ? ORDER BY created_at DESC').all(req.params.id);
  const header = ['Created At', 'Name', 'Contact', 'Reason', 'Status', 'Message', 'Conversation ID'];
  const rows = leads.map((l) =>
    [l.created_at, l.name, l.contact, l.reason, l.status, l.message, l.conversation_id].map(csvEscape).join(',')
  );
  const csv = [header.join(','), ...rows].join('\r\n');

  const filename = `${client.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-leads.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

router.patch('/leads/:id', (req, res) => {
  const { status } = req.body;
  if (!['new', 'contacted', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'status must be one of: new, contacted, closed.' });
  }
  const info = db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Lead not found.' });
  res.json({ ok: true });
});

module.exports = router;
