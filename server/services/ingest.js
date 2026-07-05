const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { chunkText } = require('../utils/chunker');
const { getEmbeddingsBatch } = require('./embeddings');
const { assertPublicHttpUrl } = require('../utils/urlSafety');
const logger = require('../utils/logger');

/**
 * Very small HTML-to-text stripper — good enough for FAQ/help-center pages.
 * Not a full HTML parser on purpose: keeps the dependency list short, and
 * client FAQ pages are simple enough that this covers the common case well.
 */
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|br|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n\n')
    .trim();
}

async function extractTextFromFile(file) {
  const ext = (file.originalname.split('.').pop() || '').toLowerCase();

  if (ext === 'pdf') {
    const pdfParse = require('pdf-parse');
    const result = await pdfParse(file.buffer);
    return result.text;
  }

  // txt, md, csv, or anything else plain-text — treat as UTF-8 text.
  return file.buffer.toString('utf8');
}

async function extractTextFromUrl(url) {
  const MAX_REDIRECTS = 5;
  let currentUrl = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHttpUrl(currentUrl); // re-checked on every hop, not just the first

    const res = await fetch(currentUrl, {
      headers: { 'User-Agent': 'AI-Support-Agent-Ingest/1.0' },
      redirect: 'manual',
    });

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get('location');
      if (!location) {
        const err = new Error(`Redirect from ${currentUrl} had no Location header.`);
        err.status = 400;
        throw err;
      }
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    if (!res.ok) {
      const err = new Error(`Failed to fetch ${currentUrl}: ${res.status}`);
      err.status = 400;
      throw err;
    }

    const contentType = res.headers.get('content-type') || '';
    const body = await res.text();
    return contentType.includes('text/html') ? stripHtml(body) : body;
  }

  const err = new Error(`Too many redirects fetching ${url}.`);
  err.status = 400;
  throw err;
}

/**
 * Ingest a piece of source content for a client: chunk it, embed each chunk,
 * and store everything under a new `documents` row.
 *
 * @param {object} params
 * @param {string} params.clientId
 * @param {string} params.title
 * @param {'text'|'file'|'url'} params.sourceType
 * @param {string} params.source        filename, URL, or "(pasted text)"
 * @param {string} params.rawText       the extracted plain text to index
 */
async function ingestDocument({ clientId, title, sourceType, source, rawText }) {
  const chunks = chunkText(rawText);
  if (chunks.length === 0) {
    const err = new Error('No usable text found to index (document may be empty, scanned, or image-only).');
    err.status = 400;
    throw err;
  }

  logger.info('Ingesting document', { clientId, title, sourceType, chunkCount: chunks.length });

  const embeddings = await getEmbeddingsBatch(chunks);

  const documentId = uuidv4();
  const insertDoc = db.prepare(
    `INSERT INTO documents (id, client_id, title, source_type, source, char_count)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insertChunk = db.prepare(
    `INSERT INTO chunks (id, document_id, client_id, content, embedding)
     VALUES (?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    insertDoc.run(documentId, clientId, title, sourceType, source, rawText.length);
    chunks.forEach((chunk, i) => {
      insertChunk.run(uuidv4(), documentId, clientId, chunk, JSON.stringify(embeddings[i]));
    });
  });
  tx();

  return { documentId, chunkCount: chunks.length };
}

module.exports = { ingestDocument, extractTextFromFile, extractTextFromUrl, stripHtml };
