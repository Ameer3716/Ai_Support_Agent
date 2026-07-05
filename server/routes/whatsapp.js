const express = require('express');
const twilio = require('twilio');
const { db } = require('../db');
const { config } = require('../config');
const { handleIncomingMessage } = require('../services/chatEngine');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Verifies the `X-Twilio-Signature` header so this endpoint only accepts requests
 * that actually came from Twilio. Without this, anyone who finds a client's
 * webhook URL could POST fake WhatsApp messages — spoofing a "From" number,
 * burning the client's daily message quota, and polluting their conversation
 * history/leads with junk.
 *
 * Only enforced when TWILIO_AUTH_TOKEN is configured, so local development
 * without Twilio set up still works. Once a real Twilio account is connected,
 * this closes the gap automatically — nothing else to configure.
 */
function verifyTwilioSignature(req, res, next) {
  if (!config.twilio.authToken) return next(); // Twilio not configured — nothing to verify against.

  const signature = req.headers['x-twilio-signature'];
  const fullUrl = `${config.publicBaseUrl}${req.originalUrl}`;
  const valid = signature && twilio.validateRequest(config.twilio.authToken, signature, fullUrl, req.body);

  if (!valid) {
    logger.warn('Rejected WhatsApp webhook call with invalid/missing Twilio signature', { url: fullUrl });
    return res.status(403).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
  next();
}

/**
 * Twilio posts application/x-www-form-urlencoded to this URL when a WhatsApp
 * message arrives. Configure this as the "A message comes in" webhook for the
 * client's WhatsApp sender in the Twilio console:
 *   {PUBLIC_BASE_URL}/webhook/whatsapp/:clientKey
 *
 * Twilio expects a TwiML (XML) response containing the reply.
 */
router.post('/:clientKey', express.urlencoded({ extended: false }), verifyTwilioSignature, async (req, res) => {
  const { clientKey } = req.params;
  const from = req.body.From; // e.g. "whatsapp:+15551234567"
  const body = req.body.Body;

  const client = db.prepare('SELECT * FROM clients WHERE client_key = ? AND is_active = 1').get(clientKey);

  const twiml = (message) =>
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;

  if (!client) {
    logger.warn('WhatsApp webhook hit for unknown client', { clientKey });
    return res.status(404).type('text/xml').send(twiml('This number is not currently connected to an assistant.'));
  }

  if (!from || !body) {
    return res.status(400).type('text/xml').send(twiml('Sorry, I could not read that message.'));
  }

  try {
    const result = await handleIncomingMessage({
      client,
      channel: 'whatsapp',
      externalId: from,
      userMessage: body,
    });
    res.type('text/xml').send(twiml(result.reply));
  } catch (err) {
    logger.error('WhatsApp handling failed', { error: err.message });
    res.type('text/xml').send(twiml("Sorry, something went wrong on our end — please try again in a moment."));
  }
});

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = router;
