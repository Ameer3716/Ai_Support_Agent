-- AI Support Agent — database schema
-- One deployment, many clients (businesses). Each client's data is scoped by client_id.

CREATE TABLE IF NOT EXISTS clients (
  id                    TEXT PRIMARY KEY,
  client_key            TEXT UNIQUE NOT NULL,   -- public id used in the embed snippet / widget URL
  admin_secret          TEXT NOT NULL,          -- private id used to authorize ingestion/admin calls for this client
  name                  TEXT NOT NULL,
  owner_email           TEXT,
  allowed_origins        TEXT,                  -- comma-separated list of domains allowed to embed the widget
  system_prompt         TEXT,                   -- extra instructions layered on top of the base prompt
  welcome_message       TEXT DEFAULT 'Hi! How can I help you today?',
  brand_color           TEXT DEFAULT '#4F46E5',
  logo_url              TEXT,
  widget_position       TEXT DEFAULT 'bottom-right',
  daily_message_quota   INTEGER DEFAULT 500,
  handoff_email         TEXT,                   -- where lead / handoff notifications get sent (defaults to owner_email)
  whatsapp_number       TEXT,                   -- the client's Twilio WhatsApp-enabled number, if connected
  instagram_page_id     TEXT,                   -- the client's Instagram-scoped Page ID (from Meta), if connected
  instagram_page_token  TEXT,                   -- Page Access Token used to send replies via the Graph API
  is_active             INTEGER DEFAULT 1,
  created_at            TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
  id            TEXT PRIMARY KEY,
  client_id     TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title         TEXT,
  source_type   TEXT,   -- 'text' | 'file' | 'url'
  source        TEXT,   -- original filename, URL, or "(pasted text)"
  char_count    INTEGER DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chunks (
  id            TEXT PRIMARY KEY,
  document_id   TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  client_id     TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  embedding     TEXT NOT NULL,  -- JSON-encoded float array
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversations (
  id                TEXT PRIMARY KEY,
  client_id         TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  channel           TEXT DEFAULT 'web',  -- 'web' | 'whatsapp' | 'instagram'
  external_id       TEXT,                -- e.g. WhatsApp phone number, for routing replies back
  visitor_name      TEXT,
  visitor_contact   TEXT,
  escalated         INTEGER DEFAULT 0,
  started_at        TEXT DEFAULT (datetime('now')),
  last_message_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id                    TEXT PRIMARY KEY,
  conversation_id       TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role                  TEXT NOT NULL,   -- 'user' | 'assistant'
  content               TEXT NOT NULL,
  retrieval_confidence  REAL,            -- top similarity score used to generate this reply (assistant messages only)
  created_at            TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leads (
  id                TEXT PRIMARY KEY,
  client_id         TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  conversation_id   TEXT,
  name              TEXT,
  contact           TEXT,
  message           TEXT,
  reason            TEXT DEFAULT 'handoff', -- 'handoff' | 'low_confidence' | 'requested_human'
  status            TEXT DEFAULT 'new',      -- 'new' | 'contacted' | 'closed'
  created_at        TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS usage_daily (
  client_id       TEXT NOT NULL,
  day             TEXT NOT NULL,  -- 'YYYY-MM-DD'
  message_count   INTEGER DEFAULT 0,
  PRIMARY KEY (client_id, day)
);

CREATE INDEX IF NOT EXISTS idx_chunks_client ON chunks(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_leads_client ON leads(client_id);
