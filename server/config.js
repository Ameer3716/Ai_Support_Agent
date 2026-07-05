require('dotenv').config();
const path = require('path');

function bool(val, fallback) {
  if (val === undefined || val === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(val).toLowerCase());
}

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  // Where the Next.js marketing landing page (in /frontend) is running.
  // "/" on this server redirects here instead of serving static HTML.
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',

  admin: {
    password: process.env.ADMIN_PASSWORD || '',
    jwtSecret: process.env.ADMIN_JWT_SECRET || '',
  },

  llm: {
    // One of: anthropic | openai | groq | gemini | ollama
    provider: (process.env.LLM_PROVIDER || 'anthropic').toLowerCase(),

    // --- Paid providers (unchanged — still fully supported, just need billing) ---
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-5.4-mini',

    // --- Free alternatives ---
    // Groq: free API key (no card needed), very fast, generous free rate limits.
    // Get a key at https://console.groq.com/keys
    groqApiKey: process.env.GROQ_API_KEY || '',
    groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    // Gemini: free tier API key, no card needed.
    // Get a key at https://aistudio.google.com/apikey
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    // Ollama: fully local, zero cost, no API key at all. Install from
    // https://ollama.com, then `ollama pull llama3.2` (or your chosen model).
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2',

    maxResponseTokens: parseInt(process.env.MAX_RESPONSE_TOKENS || '500', 10),
  },

  embeddings: {
    // One of: openai | gemini | ollama
    provider: (process.env.EMBEDDINGS_PROVIDER || 'openai').toLowerCase(),

    // --- Paid provider (unchanged) ---
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',

    // --- Free alternatives ---
    // Gemini free-tier embeddings. Same key as GEMINI_API_KEY above works.
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
    // Ollama local embeddings — zero cost, no API key.
    // `ollama pull nomic-embed-text` (or your chosen model).
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || '',
  },

  instagram: {
    // One Meta App per deployment (yours) — each client's own Page Access Token
    // is stored per-client in the database, same idea as how one Twilio account
    // hosts many WhatsApp senders. Set by you when you create the Meta App;
    // pasted into the webhook config screen in Meta's dashboard.
    verifyToken: process.env.INSTAGRAM_VERIFY_TOKEN || '',
    graphApiVersion: process.env.INSTAGRAM_GRAPH_API_VERSION || 'v19.0',
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'AI Support Agent <notifications@example.com>',
  },

  defaultDailyMessageQuota: parseInt(process.env.DEFAULT_DAILY_MESSAGE_QUOTA || '500', 10),

  dbPath: path.join(__dirname, '..', 'data', 'app.db'),
  uploadsDir: path.join(__dirname, '..', 'data', 'uploads'),
};

function warnIfMissingCoreSecrets() {
  const warnings = [];
  if (!config.admin.password) warnings.push('ADMIN_PASSWORD is not set — the admin dashboard will refuse all logins.');
  if (!config.admin.jwtSecret) warnings.push('ADMIN_JWT_SECRET is not set — admin sessions cannot be signed.');
  if (config.llm.provider === 'anthropic' && !config.llm.anthropicApiKey) {
    warnings.push('LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set — chat replies will fail.');
  }
  if (config.llm.provider === 'openai' && !config.llm.openaiApiKey) {
    warnings.push('LLM_PROVIDER=openai but OPENAI_API_KEY is not set — chat replies will fail.');
  }
  if (config.llm.provider === 'groq' && !config.llm.groqApiKey) {
    warnings.push('LLM_PROVIDER=groq but GROQ_API_KEY is not set — get a free key at https://console.groq.com/keys');
  }
  if (config.llm.provider === 'gemini' && !config.llm.geminiApiKey) {
    warnings.push('LLM_PROVIDER=gemini but GEMINI_API_KEY is not set — get a free key at https://aistudio.google.com/apikey');
  }
  if (config.llm.provider === 'ollama') {
    warnings.push('LLM_PROVIDER=ollama — make sure "ollama serve" is running and you have pulled the model (ollama pull ' + config.llm.ollamaModel + ').');
  }

  if (config.embeddings.provider === 'openai' && !config.embeddings.openaiApiKey) {
    warnings.push('EMBEDDINGS_PROVIDER=openai but OPENAI_API_KEY is not set — document ingestion will fail. Consider EMBEDDINGS_PROVIDER=gemini or ollama for a free alternative.');
  }
  if (config.embeddings.provider === 'gemini' && !config.embeddings.geminiApiKey) {
    warnings.push('EMBEDDINGS_PROVIDER=gemini but GEMINI_API_KEY is not set — get a free key at https://aistudio.google.com/apikey');
  }
  if (config.embeddings.provider === 'ollama') {
    warnings.push('EMBEDDINGS_PROVIDER=ollama — make sure "ollama serve" is running and you have pulled the model (ollama pull ' + config.embeddings.ollamaModel + ').');
  }
  return warnings;
}

module.exports = { config, warnIfMissingCoreSecrets };
