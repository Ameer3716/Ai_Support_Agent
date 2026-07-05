const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const { config, warnIfMissingCoreSecrets } = require('./config');
require('./db'); // ensures schema migration runs on boot
const logger = require('./utils/logger');

const widgetRoutes = require('./routes/widget');
const whatsappRoutes = require('./routes/whatsapp');
const instagramRoutes = require('./routes/instagram');
const adminRoutes = require('./routes/admin');
const ingestApiRoutes = require('./routes/ingestApi');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: false, // the widget is embedded on arbitrary third-party sites; CSP is left to each site
    // The widget's script (/widget/embed.js) is loaded via <script src> and its
    // chat UI (/widget/chat.html) is loaded in an <iframe> — both from origins
    // that are NOT this server's own origin (any client's website, or this
    // project's separate Next.js frontend in dev). Helmet's defaults for these
    // two headers assume same-origin usage and would silently block both:
    frameguard: false, // don't send X-Frame-Options: SAMEORIGIN — the chat iframe must load cross-origin
    crossOriginResourcePolicy: false, // don't send Cross-Origin-Resource-Policy: same-origin — embed.js must load cross-origin
  })
);

// The chat widget is called cross-origin from every client's website, so CORS is open here.
// Actual authorization happens per-request via each client's allowed_origins list (see middleware/auth.js).
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

// --- Public API: website widget ---
app.use('/api/chat', widgetRoutes);

// --- Public webhook: WhatsApp (Twilio) ---
app.use('/webhook/whatsapp', whatsappRoutes);

// --- Public webhook: Instagram DMs (Meta Messenger Platform) ---
app.use('/webhook/instagram', instagramRoutes);

// --- Scoped per-client API: knowledge base automation (n8n/Make/Zapier friendly) ---
app.use('/api/ingest', ingestApiRoutes);

// --- Operator dashboard API ---
app.use('/api/admin', adminRoutes);

// --- Static assets ---
app.use('/widget', express.static(path.join(__dirname, '..', 'public', 'widget')));
app.use('/admin', express.static(path.join(__dirname, '..', 'public', 'admin')));
// The marketing landing page now lives in /frontend (Next.js + Tailwind CSS,
// run separately with `npm run dev` / `npm start` inside that folder).
// "/" here just redirects to it instead of serving the old static HTML.
app.get('/', (req, res) => {
  res.redirect(config.frontendUrl);
});

app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use(notFoundHandler);
app.use(errorHandler);

const warnings = warnIfMissingCoreSecrets();
warnings.forEach((w) => logger.warn(w));

app.listen(config.port, () => {
  logger.info(`AI Support Agent API listening on port ${config.port}`);
  logger.info(`Landing page (Next.js, run separately): ${config.frontendUrl}`);
  logger.info(`Admin dashboard: ${config.publicBaseUrl}/admin`);
  logger.info(`Widget embed script: ${config.publicBaseUrl}/widget/embed.js`);
});
