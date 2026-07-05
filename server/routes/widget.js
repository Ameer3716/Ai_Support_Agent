const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { resolveClientByKey, checkWidgetOrigin } = require('../middleware/auth');
const { chatLimiter } = require('../middleware/rateLimiter');
const { handleIncomingMessage } = require('../services/chatEngine');
const { notifyLead } = require('../services/notify');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Everything here is scoped to one client via :clientKey (the public client_key
 * from the embed snippet), and is what public/widget/widget.js talks to.
 */

/**
 * Public, unauthenticated lookup used only by the marketing landing page so it
 * can embed a real, live widget without hardcoding a client key. Returns the
 * seeded demo client's key if one exists (see scripts/seed-demo.js), or null.
 * client_key is already meant to be public — it's the same value that goes in
 * every client's embed snippet — so exposing it here reveals nothing private.
 */
router.get('/demo-key', (req, res) => {
  const demo = db
    .prepare('SELECT client_key FROM clients WHERE name = ? AND is_active = 1')
    .get('Demo Dental Clinic');
  res.json({ clientKey: demo ? demo.client_key : null });
});

router.get('/:clientKey/config', resolveClientByKey, checkWidgetOrigin, (req, res) => {
  const c = req.client;
  res.json({
    name: c.name,
    welcomeMessage: c.welcome_message,
    brandColor: c.brand_color,
    logoUrl: c.logo_url,
    widgetPosition: c.widget_position,
  });
});

router.post('/:clientKey/message', chatLimiter, resolveClientByKey, checkWidgetOrigin, async (req, res, next) => {
  try {
    const { conversationId, message } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'message is required.' });
    }
    if (String(message).length > 4000) {
      return res.status(400).json({ error: 'Message is too long (max 4000 characters).' });
    }

    const result = await handleIncomingMessage({
      client: req.client,
      conversationId: conversationId || null,
      channel: 'web',
      userMessage: message,
    });

    res.json(result);
  } catch (err) {
    logger.error('Widget message handling failed', { error: err.message });
    next(err);
  }
});

router.post('/:clientKey/lead', chatLimiter, resolveClientByKey, checkWidgetOrigin, async (req, res, next) => {
  try {
    const { conversationId, name, contact, message, reason } = req.body;
    if (!contact || !String(contact).trim()) {
      return res.status(400).json({ error: 'contact is required.' });
    }

    const allowedReasons = ['handoff', 'low_confidence', 'requested_human'];
    const leadReason = allowedReasons.includes(reason) ? reason : 'handoff';

    const id = uuidv4();
    db.prepare(
      `INSERT INTO leads (id, client_id, conversation_id, name, contact, message, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, req.client.id, conversationId || null, name || null, contact, message || null, leadReason);

    if (conversationId) {
      db.prepare('UPDATE conversations SET escalated = 1 WHERE id = ? AND client_id = ?').run(
        conversationId,
        req.client.id
      );
    }

    notifyLead({
      toEmail: req.client.handoff_email || req.client.owner_email,
      clientName: req.client.name,
      reason: leadReason,
      name,
      contact,
      message,
    }).catch((err) => logger.error('Lead notification failed', { error: err.message }));

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
