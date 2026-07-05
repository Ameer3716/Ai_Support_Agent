const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('../db');
const { config } = require('../config');

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Protects the operator dashboard API. Expects `Authorization: Bearer <jwt>`. */
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing admin token.' });
  if (!config.admin.jwtSecret) return res.status(500).json({ error: 'Admin auth is not configured on the server.' });

  jwt.verify(token, config.admin.jwtSecret, (err, payload) => {
    if (err || !payload || payload.role !== 'admin') {
      return res.status(401).json({ error: 'Invalid or expired session — please log in again.' });
    }
    next();
  });
}

/** Loads the client referenced by :clientKey in the URL and attaches it as req.client. */
function resolveClientByKey(req, res, next) {
  const client = db.prepare('SELECT * FROM clients WHERE client_key = ?').get(req.params.clientKey);
  if (!client) return res.status(404).json({ error: 'Unknown client key.' });
  if (!client.is_active) return res.status(403).json({ error: 'This assistant is currently disabled.' });
  req.client = client;
  next();
}

/**
 * Authorizes automation calls (n8n/Make/Zapier/etc.) that push knowledge-base
 * content for one client. Expects the client's own admin_secret, sent as either
 * `Authorization: Bearer <secret>` or an `X-Admin-Secret` header.
 */
function requireClientAdminSecret(req, res, next) {
  if (!req.client) return res.status(500).json({ error: 'requireClientAdminSecret used without resolveClientByKey.' });

  const header = req.headers.authorization || '';
  const bearerSecret = header.startsWith('Bearer ') ? header.slice(7) : null;
  const provided = bearerSecret || req.headers['x-admin-secret'];

  if (!provided || !timingSafeEqual(provided, req.client.admin_secret)) {
    return res.status(401).json({ error: 'Missing or invalid admin secret for this client.' });
  }
  next();
}

/**
 * Optional website-origin allowlist for the chat widget. If a client hasn't set
 * allowed_origins yet, every origin is permitted (so the widget "just works" the
 * moment it's created, before the operator has locked it down). Once configured,
 * only the listed domains may call the widget's chat API.
 *
 * The widget runs inside an iframe served from THIS server, so the browser's own
 * Origin/Referer headers on its API calls point back at this server, not at the
 * page that embedded it. To make the check meaningful, embed.js passes the
 * embedding page's origin through as a query param, and widget.js forwards it as
 * the X-Embed-Origin header. Note this is a soft restriction (a motivated caller
 * can spoof the header) — it stops casual copy-pasting of someone else's embed
 * snippet, not a determined attacker with the public client key.
 */
function checkWidgetOrigin(req, res, next) {
  const allowList = (req.client.allowed_origins || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (allowList.length === 0) return next();

  const originHeader = req.headers['x-embed-origin'] || req.headers.origin || req.headers.referer || '';
  let originHost;
  try {
    originHost = new URL(originHeader).origin;
  } catch {
    return res.status(403).json({ error: 'Origin not permitted for this client.' });
  }

  const allowed = allowList.some((entry) => {
    try {
      return new URL(entry).origin === originHost;
    } catch {
      return entry === originHost;
    }
  });

  if (!allowed) return res.status(403).json({ error: 'Origin not permitted for this client.' });
  next();
}

module.exports = { requireAdmin, resolveClientByKey, requireClientAdminSecret, checkWidgetOrigin };
