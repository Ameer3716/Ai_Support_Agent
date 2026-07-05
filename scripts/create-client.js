/**
 * Creates a new client (business) from the command line — handy for your very
 * first client before you've even logged into the admin dashboard, or for
 * scripting bulk onboarding.
 *
 * Usage:
 *   npm run create-client -- "Business Name" "owner@email.com"
 *
 * Everything else (welcome message, brand color, quota, etc.) can be edited
 * afterwards from the admin dashboard.
 */
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../server/db');
const { config } = require('../server/config');

function newKey(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}

const [, , name, ownerEmail] = process.argv;

if (!name || !name.trim()) {
  console.error('Usage: npm run create-client -- "Business Name" "owner@email.com"');
  process.exit(1);
}

const id = uuidv4();
const clientKey = newKey(8);
const adminSecret = newKey(24);

db.prepare(
  `INSERT INTO clients (id, client_key, admin_secret, name, owner_email, daily_message_quota)
   VALUES (?, ?, ?, ?, ?, ?)`
).run(id, clientKey, adminSecret, name.trim(), ownerEmail || null, config.defaultDailyMessageQuota);

const embedSnippet = `<script src="${config.publicBaseUrl}/widget/embed.js" data-client="${clientKey}" async></script>`;
const whatsappWebhook = `${config.publicBaseUrl}/webhook/whatsapp/${clientKey}`;

console.log('\nClient created:\n');
console.log(`  Name:          ${name}`);
console.log(`  Client ID:     ${id}`);
console.log(`  Client key:    ${clientKey}   (public — safe to put in the embed snippet)`);
console.log(`  Admin secret:  ${adminSecret}   (private — used to push knowledge-base updates via API/n8n/Zapier)`);
console.log('\nWebsite embed snippet (paste before </body>):\n');
console.log(`  ${embedSnippet}`);
console.log('\nWhatsApp webhook (paste into Twilio console → WhatsApp sender → "when a message comes in"):\n');
console.log(`  ${whatsappWebhook}`);
console.log(
  '\nInstagram DMs: one shared webhook handles every client — set it up once in Meta\'s dashboard\n' +
    `  (${config.publicBaseUrl}/webhook/instagram), then connect this client's Instagram\n` +
    '  account and paste its Page ID + Page Access Token into Settings in the admin dashboard.\n'
);
console.log('\nAdd knowledge base content with, e.g.:\n');
console.log(
  `  curl -X POST ${config.publicBaseUrl}/api/ingest/${clientKey}/text \\\n` +
    `    -H "X-Admin-Secret: ${adminSecret}" -H "Content-Type: application/json" \\\n` +
    `    -d '{"title":"FAQ","text":"Q: What are your hours?\\nA: 9am-6pm Mon-Sat."}'`
);
console.log('\nOr just log into the admin dashboard and paste text / upload a file / add a URL from there.\n');

db.close();
