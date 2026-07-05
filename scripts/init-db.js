/**
 * Initializes the SQLite database (creates data/app.db and runs schema.sql).
 * Safe to run multiple times — schema.sql uses CREATE TABLE IF NOT EXISTS.
 *
 * Usage: npm run init-db
 */
const { db } = require('../server/db');

const counts = db
  .prepare(
    `SELECT
      (SELECT COUNT(*) FROM clients) AS clients,
      (SELECT COUNT(*) FROM documents) AS documents,
      (SELECT COUNT(*) FROM conversations) AS conversations`
  )
  .get();

console.log('Database ready at data/app.db');
console.log(`Existing data — clients: ${counts.clients}, documents: ${counts.documents}, conversations: ${counts.conversations}`);
console.log('\nNext step: npm run create-client -- "Business Name" owner@email.com');

db.close();
