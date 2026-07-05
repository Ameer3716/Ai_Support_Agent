const express = require('express');
const multer = require('multer');
const { resolveClientByKey, requireClientAdminSecret } = require('../middleware/auth');
const { ingestLimiter } = require('../middleware/rateLimiter');
const { ingestDocument, extractTextFromFile, extractTextFromUrl } = require('../services/ingest');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const router = express.Router();

/**
 * These endpoints are intentionally separate from /api/admin: they're scoped to a
 * single client via that client's own admin_secret, so they're safe to plug into an
 * n8n/Make/Zapier workflow (e.g. "whenever the client updates their FAQ page, push
 * the new text here") without exposing the platform-wide operator login.
 */

router.post('/:clientKey/text', ingestLimiter, resolveClientByKey, requireClientAdminSecret, async (req, res, next) => {
  try {
    const { title, text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'text is required.' });
    const result = await ingestDocument({
      clientId: req.client.id,
      title: title || 'Pasted text',
      sourceType: 'text',
      source: '(pasted text)',
      rawText: text,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:clientKey/file',
  ingestLimiter,
  resolveClientByKey,
  requireClientAdminSecret,
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'file is required (multipart field name "file").' });
      const rawText = await extractTextFromFile(req.file);
      const result = await ingestDocument({
        clientId: req.client.id,
        title: req.file.originalname,
        sourceType: 'file',
        source: req.file.originalname,
        rawText,
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/:clientKey/url', ingestLimiter, resolveClientByKey, requireClientAdminSecret, async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url || !/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'A valid http(s) url is required.' });
    const rawText = await extractTextFromUrl(url);
    const result = await ingestDocument({
      clientId: req.client.id,
      title: url,
      sourceType: 'url',
      source: url,
      rawText,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
