/**
 * Splits text into overlapping chunks for embedding.
 * Chunking by paragraph first (keeps FAQ Q&A pairs and sections intact where possible),
 * then hard-wraps any paragraph that's still too long.
 *
 * @param {string} text
 * @param {object} opts
 * @param {number} opts.maxChars   target max characters per chunk (~500 chars ≈ 120-150 tokens)
 * @param {number} opts.overlapChars  characters of overlap carried into the next chunk
 * @returns {string[]}
 */
/**
 * Hard character-level wrap, used as a last resort when even a single sentence
 * (or a punctuation-free blob — a long URL, base64, a code dump, etc.) is still
 * longer than maxChars on its own. Guarantees every emitted piece is <= maxChars.
 */
function hardWrap(text, maxChars, overlapChars) {
  const pieces = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    pieces.push(text.slice(start, end));
    if (end >= text.length) break;
    start = end - overlapChars;
    if (start < 0) start = 0;
  }
  return pieces;
}

function chunkText(text, opts = {}) {
  const maxChars = opts.maxChars || 1200;
  const overlapChars = opts.overlapChars || 150;

  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!cleaned) return [];

  const paragraphs = cleaned.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    // Flush what we have before dealing with this paragraph.
    if (current) {
      chunks.push(current);
      // Start the next chunk with a small tail of the previous one for continuity.
      current = current.slice(-overlapChars);
    }

    if (para.length <= maxChars) {
      current = current ? `${current}\n\n${para}` : para;
      continue;
    }

    // Paragraph itself is too long — hard-wrap it on sentence boundaries where possible.
    const sentences = para.split(/(?<=[.!?])\s+/);
    let sub = current;
    for (const sentence of sentences) {
      // A single "sentence" can itself exceed maxChars (no punctuation at all —
      // a long URL, base64 blob, minified code, etc.). Hard-wrap it on its own
      // so no chunk ever exceeds maxChars, regardless of input shape.
      if (sentence.length > maxChars) {
        if (sub) {
          chunks.push(sub);
          sub = '';
        }
        const pieces = hardWrap(sentence, maxChars, overlapChars);
        pieces.slice(0, -1).forEach((p) => chunks.push(p));
        sub = pieces[pieces.length - 1] || '';
        continue;
      }

      const withSentence = sub ? `${sub} ${sentence}` : sentence;
      if (withSentence.length > maxChars && sub) {
        chunks.push(sub);
        sub = sub.slice(-overlapChars) + ' ' + sentence;
      } else {
        sub = withSentence;
      }
    }
    current = sub;
  }

  if (current && current.trim()) chunks.push(current.trim());

  return chunks.filter((c) => c.length > 10);
}

module.exports = { chunkText };
