const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { retrieveContext } = require('./retrieval');
const { chatCompletion } = require('./llm');
const logger = require('../utils/logger');

const HANDOFF_KEYWORDS = /\b(human|real person|representative|talk to (someone|somebody)|speak to (someone|somebody)|customer service rep|agent)\b/i;
const LOW_CONFIDENCE_THRESHOLD = 0.72;
const HISTORY_TURNS = 6; // last N messages (user+assistant combined) kept as context

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getOrCreateConversation({ clientId, conversationId, channel, externalId }) {
  if (conversationId) {
    const existing = db.prepare('SELECT * FROM conversations WHERE id = ? AND client_id = ?').get(conversationId, clientId);
    if (existing) return existing;
  }

  // For WhatsApp, reuse the most recent open-ish conversation for this phone number
  // so a returning customer keeps their history instead of starting fresh every text.
  if (channel === 'whatsapp' && externalId) {
    const recent = db
      .prepare(
        `SELECT * FROM conversations WHERE client_id = ? AND channel = 'whatsapp' AND external_id = ?
         ORDER BY last_message_at DESC LIMIT 1`
      )
      .get(clientId, externalId);
    if (recent) return recent;
  }

  const id = uuidv4();
  db.prepare(
    `INSERT INTO conversations (id, client_id, channel, external_id) VALUES (?, ?, ?, ?)`
  ).run(id, clientId, channel || 'web', externalId || null);
  return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
}

function checkAndIncrementQuota(client) {
  const day = todayKey();
  const quota = client.daily_message_quota || 500;
  const row = db.prepare('SELECT message_count FROM usage_daily WHERE client_id = ? AND day = ?').get(client.id, day);
  const count = row ? row.message_count : 0;

  if (count >= quota) return { allowed: false, count, quota };

  db.prepare(
    `INSERT INTO usage_daily (client_id, day, message_count) VALUES (?, ?, 1)
     ON CONFLICT(client_id, day) DO UPDATE SET message_count = message_count + 1`
  ).run(client.id, day);

  return { allowed: true, count: count + 1, quota };
}

function loadRecentHistory(conversationId) {
  const rows = db
    .prepare(
      `SELECT role, content FROM messages WHERE conversation_id = ?
       ORDER BY created_at DESC LIMIT ?`
    )
    .all(conversationId, HISTORY_TURNS);
  return rows.reverse().map((r) => ({ role: r.role, content: r.content }));
}

function buildSystemPrompt(client, contextChunks) {
  const knowledgeBase = contextChunks.length
    ? contextChunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')
    : '(No matching information was found in the knowledge base for this question.)';

  return [
    `You are the AI support assistant for ${client.name}.`,
    `Answer using ONLY the information in the "Knowledge base" section below plus the conversation so far. Do not invent policies, prices, availability, or facts that aren't in the knowledge base.`,
    `If the knowledge base doesn't cover the question, say so honestly and offer to connect the visitor with the team — don't guess.`,
    `Keep replies short and conversational: 2-4 sentences for most answers, and a short list only when the question genuinely calls for steps.`,
    client.system_prompt ? `Additional instructions from ${client.name}: ${client.system_prompt}` : '',
    ``,
    `Knowledge base:`,
    `"""`,
    knowledgeBase,
    `"""`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Handles one inbound user message end-to-end: retrieval, generation, logging,
 * quota tracking, and handoff detection. Used by both the web widget and WhatsApp.
 *
 * @returns {{ conversationId: string, reply: string, offerHandoff: boolean, quotaExceeded: boolean }}
 */
async function handleIncomingMessage({ client, conversationId, channel, externalId, userMessage }) {
  const conversation = getOrCreateConversation({ clientId: client.id, conversationId, channel, externalId });

  const quota = checkAndIncrementQuota(client);
  if (!quota.allowed) {
    logger.warn('Daily message quota exceeded', { clientId: client.id, quota: quota.quota });
    return {
      conversationId: conversation.id,
      reply:
        "We're experiencing high volume right now and I've hit today's limit. Please leave your details and the team will follow up shortly, or try again tomorrow.",
      offerHandoff: true,
      quotaExceeded: true,
    };
  }

  const history = loadRecentHistory(conversation.id);

  let contextChunks = [];
  let topScore = 0;
  try {
    const result = await retrieveContext(client.id, userMessage, { topK: 5, minScore: LOW_CONFIDENCE_THRESHOLD });
    contextChunks = result.chunks;
    topScore = result.topScore;
  } catch (err) {
    logger.error('Retrieval failed, answering without context', { error: err.message });
  }

  const systemPrompt = buildSystemPrompt(client, contextChunks);
  const messages = [...history, { role: 'user', content: userMessage }];

  const reply = await chatCompletion({ systemPrompt, messages });

  const keywordHandoff = HANDOFF_KEYWORDS.test(userMessage);
  const lowConfidence = contextChunks.length === 0 && topScore < LOW_CONFIDENCE_THRESHOLD;
  const offerHandoff = keywordHandoff || lowConfidence;

  const now = new Date().toISOString();
  const insertMsg = db.prepare(
    `INSERT INTO messages (id, conversation_id, role, content, retrieval_confidence) VALUES (?, ?, ?, ?, ?)`
  );
  const tx = db.transaction(() => {
    insertMsg.run(uuidv4(), conversation.id, 'user', userMessage, null);
    insertMsg.run(uuidv4(), conversation.id, 'assistant', reply, topScore);
    db.prepare('UPDATE conversations SET last_message_at = ?, escalated = escalated OR ? WHERE id = ?').run(
      now,
      offerHandoff ? 1 : 0,
      conversation.id
    );
  });
  tx();

  return { conversationId: conversation.id, reply, offerHandoff, quotaExceeded: false };
}

module.exports = { handleIncomingMessage, getOrCreateConversation };
