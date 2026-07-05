const { config } = require('../config');
const logger = require('../utils/logger');

let cachedTransporter = null;

function getMailTransporter() {
  if (!config.smtp.host) return null;
  if (cachedTransporter) return cachedTransporter;

  const nodemailer = require('nodemailer');
  cachedTransporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
  return cachedTransporter;
}

/**
 * Emails the business owner when a lead is captured or a conversation is escalated
 * to a human. Silently no-ops if SMTP isn't configured — email is a nice-to-have,
 * not a hard requirement to run the bot.
 */
async function notifyLead({ toEmail, clientName, reason, name, contact, message }) {
  const transporter = getMailTransporter();
  if (!transporter || !toEmail) {
    logger.info('Lead captured (email notification skipped — SMTP not configured)', { clientName, reason });
    return false;
  }

  const subject = `New chat lead for ${clientName}${reason === 'requested_human' ? ' (asked for a human)' : ''}`;
  const text = [
    `A visitor left their details in the ${clientName} chat widget.`,
    '',
    `Reason: ${reason}`,
    `Name: ${name || '(not given)'}`,
    `Contact: ${contact || '(not given)'}`,
    `Message: ${message || '(none)'}`,
  ].join('\n');

  try {
    await transporter.sendMail({ from: config.smtp.from, to: toEmail, subject, text });
    return true;
  } catch (err) {
    logger.error('Failed to send lead notification email', { error: err.message });
    return false;
  }
}

/**
 * Sends an outbound WhatsApp message via Twilio. Used to reply to inbound
 * WhatsApp messages with the bot's answer.
 */
async function sendWhatsAppMessage({ to, body }) {
  if (!config.twilio.accountSid || !config.twilio.authToken) {
    throw new Error('Twilio is not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN missing).');
  }
  const twilio = require('twilio')(config.twilio.accountSid, config.twilio.authToken);
  return twilio.messages.create({
    from: config.twilio.whatsappFrom,
    to,
    body,
  });
}

/**
 * Sends an outbound Instagram DM reply via the Meta Graph API, using the
 * connected client's own Page Access Token.
 */
async function sendInstagramMessage({ pageAccessToken, recipientId, text }) {
  const url = `https://graph.facebook.com/${config.instagram.graphApiVersion}/me/messages?access_token=${encodeURIComponent(
    pageAccessToken
  )}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Instagram send failed (${res.status}): ${errText}`);
  }
  return res.json();
}

module.exports = { notifyLead, sendWhatsAppMessage, sendInstagramMessage };
