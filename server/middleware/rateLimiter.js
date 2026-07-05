const rateLimit = require('express-rate-limit');

// Admin login: guards against password brute-forcing. Keyed by IP (the default).
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait a few minutes and try again.' },
});

// Knowledge-base ingestion: cheap to call but each call does embedding work (costs
// money), so keep it well above normal automation use but below abuse levels.
const ingestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.params.clientKey || req.ip,
  message: { error: 'Too many knowledge-base updates from this client in the last hour. Please try again shortly.' },
});

// Widget chat: a per-IP floor beneath the per-client daily quota already enforced
// in chatEngine, so one visitor can't hammer the endpoint even if the client's
// quota has plenty of room left.
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You're sending messages a little too fast — please slow down." },
});

module.exports = { adminLoginLimiter, ingestLimiter, chatLimiter };
