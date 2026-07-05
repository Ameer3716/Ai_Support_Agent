const express = require('express');
const { db } = require('../db');
const { config } = require('../config');
const { handleIncomingMessage } = require('../services/chatEngine');
const { sendInstagramMessage } = require('../services/notify');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Instagram DMs are delivered through Meta's Messenger Platform webhook (the
 * same underlying system used for Facebook Page messaging). One route serves
 * every client — Meta's payload identifies which client by `entry[].id`, the
 * Instagram-scoped Page ID, which is matched against each client's stored
 * instagram_page_id.
 *
 * Setup (per client, done once in Meta's developer dashboard on your one Meta
 * App): connect the client's Instagram professional account, generate a Page
 * Access Token, and paste both into this client's Settings in the admin
 * dashboard. Meta requires app review (the instagram_manage_messages
 * permission) before this works for anyone other than added test users —
 * budget time for that before promising a client a live Instagram bot.
 *
 * Webhook URL to register in Meta's dashboard: {PUBLIC_BASE_URL}/webhook/instagram
 */

// Meta calls this once, with a GET, to verify you control the endpoint.
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (!config.instagram.verifyToken) {
    logger.warn('Instagram webhook GET received but INSTAGRAM_VERIFY_TOKEN is not set.');
    return res.status(500).send('INSTAGRAM_VERIFY_TOKEN is not configured on the server.');
  }

  if (mode === 'subscribe' && token === config.instagram.verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send('Verification failed.');
});

// Meta calls this with every inbound DM event.
router.post('/', express.json(), async (req, res) => {
  // Always 200 quickly — Meta retries aggressively on non-200s, and errors are
  // logged and handled per-message below rather than surfaced as webhook failures.
  res.status(200).send('EVENT_RECEIVED');

  const entries = req.body?.entry || [];
  for (const entry of entries) {
    const pageId = entry.id;
    const messagingEvents = entry.messaging || [];

    for (const event of messagingEvents) {
      try {
        await handleOneMessage(pageId, event);
      } catch (err) {
        logger.error('Instagram message handling failed', { error: err.message, pageId });
      }
    }
  }
});

async function handleOneMessage(pageId, event) {
  // Ignore delivery receipts, read receipts, and echoes of our own sent messages.
  if (!event.message || event.message.is_echo) return;

  const senderId = event.sender?.id;
  const text = event.message.text;
  if (!senderId || !text) return;

  const client = db.prepare('SELECT * FROM clients WHERE instagram_page_id = ? AND is_active = 1').get(pageId);
  if (!client) {
    logger.warn('Instagram webhook event for unrecognized/unconnected page', { pageId });
    return;
  }
  if (!client.instagram_page_token) {
    logger.warn('Instagram page matched a client but no page token is stored — cannot reply', { clientId: client.id });
    return;
  }

  const result = await handleIncomingMessage({
    client,
    channel: 'instagram',
    externalId: senderId,
    userMessage: text,
  });

  await sendInstagramMessage({
    pageAccessToken: client.instagram_page_token,
    recipientId: senderId,
    text: result.reply,
  });
}

module.exports = router;
