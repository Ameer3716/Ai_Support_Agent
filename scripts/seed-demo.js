/**
 * Creates a demo client ("Demo Dental Clinic") pre-loaded with sample FAQ
 * content, so you can open the widget and try a real conversation in under a
 * minute — great for showing prospects on a call before you touch their data.
 *
 * Usage: npm run seed-demo
 * Requires a working embeddings provider — set EMBEDDINGS_PROVIDER in .env
 * (openai, gemini, or ollama) with the matching key/service in place.
 */
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../server/db');
const { config } = require('../server/config');
const { ingestDocument } = require('../server/services/ingest');

function newKey(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}

const DEMO_FAQ = `
Q: What are your opening hours?
A: We're open Monday to Saturday, 9am to 6pm. We're closed on Sundays and public holidays.

Q: Do you accept walk-ins?
A: Yes, we accept walk-ins, but booking ahead online or by phone guarantees you a slot and shorter wait time.

Q: How much does a routine cleaning cost?
A: A standard cleaning and check-up is $60. Deep cleaning starts at $120 depending on what's needed.

Q: Do you accept insurance?
A: We accept most major dental insurance plans. Bring your insurance card to your first visit and our front desk will verify coverage.

Q: Where are you located?
A: We're at 221 Main Street, Suite 4, right above the pharmacy. Free parking is available in the lot behind the building.

Q: How do I cancel or reschedule an appointment?
A: You can reschedule up to 24 hours before your appointment by replying to your confirmation text, calling us, or using the booking link. Cancellations inside 24 hours may incur a small fee.

Q: Do you treat children?
A: Yes, we see patients of all ages, including a dedicated pediatric-friendly slot on Saturday mornings.
`.trim();

async function main() {
  const existing = db.prepare('SELECT id FROM clients WHERE name = ?').get('Demo Dental Clinic');
  if (existing) {
    console.log('Demo client already exists (id: ' + existing.id + '). Delete it from the admin dashboard first if you want a fresh one.');
    db.close();
    return;
  }

  const id = uuidv4();
  const clientKey = newKey(8);
  const adminSecret = newKey(24);

  db.prepare(
    `INSERT INTO clients (id, client_key, admin_secret, name, owner_email, welcome_message, brand_color, daily_message_quota)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, clientKey, adminSecret, 'Demo Dental Clinic', 'demo@example.com', "Hi! I'm the front-desk assistant — ask me about hours, pricing, or booking.", '#4F46E5', config.defaultDailyMessageQuota);

  console.log(`Demo client created. Ingesting sample FAQ (using EMBEDDINGS_PROVIDER=${config.embeddings.provider})...`);

  try {
    await ingestDocument({
      clientId: id,
      title: 'Demo FAQ',
      sourceType: 'text',
      source: '(seed script)',
      rawText: DEMO_FAQ,
    });
    console.log('FAQ ingested successfully.\n');
  } catch (err) {
    console.error('Could not ingest the demo FAQ: ' + err.message);
    console.error('The demo client was still created — fix your EMBEDDINGS_PROVIDER setup in .env (see .env.example) and re-run "npm run seed-demo", or add content manually from the admin dashboard.\n');
  }

  console.log('Try it now:');
  console.log(`  1. Start the server:  npm start`);
  console.log(`  2. Open the admin dashboard: ${config.publicBaseUrl}/admin`);
  console.log(`  3. Or open the widget directly: ${config.publicBaseUrl}/widget/chat.html?client=${clientKey}&origin=${encodeURIComponent(config.publicBaseUrl)}`);
  console.log(`\nClient key: ${clientKey}\nAdmin secret: ${adminSecret}\n`);

  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
