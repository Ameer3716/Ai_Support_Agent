const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { config } = require('./config');

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
fs.mkdirSync(config.uploadsDir, { recursive: true });

const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
  db.exec(schema);
  addColumnsIfMissing();
}

/**
 * `CREATE TABLE IF NOT EXISTS` (above) only creates tables that don't exist yet —
 * it does nothing for a table that already exists but is missing a column added
 * in a later version of schema.sql. This keeps an existing deployment's database
 * in sync with new columns (e.g. Instagram support) without anyone needing to
 * delete and recreate their data. Safe to run on every boot: each ALTER TABLE is
 * a no-op once the column exists.
 */
function addColumnsIfMissing() {
  const columnsToEnsure = [
    { table: 'clients', column: 'instagram_page_id', ddl: 'TEXT' },
    { table: 'clients', column: 'instagram_page_token', ddl: 'TEXT' },
  ];

  for (const { table, column, ddl } of columnsToEnsure) {
    const existing = db.prepare(`PRAGMA table_info(${table})`).all();
    const hasColumn = existing.some((c) => c.name === column);
    if (!hasColumn) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
    }
  }
}

migrate();

module.exports = { db, migrate };
