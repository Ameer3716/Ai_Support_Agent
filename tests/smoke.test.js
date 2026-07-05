const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

// Point the app at a throwaway test database so this never touches real data.
process.env.PORT = '0';
process.env.ADMIN_PASSWORD = 'test-password';
process.env.ADMIN_JWT_SECRET = 'test-secret';

const { chunkText } = require('../server/utils/chunker');
const { cosineSimilarity } = require('../server/services/embeddings');

test('chunkText splits long text and respects size roughly', () => {
  const text = 'Paragraph one.\n\n' + 'Sentence. '.repeat(300) + '\n\nParagraph three.';
  const chunks = chunkText(text, { maxChars: 500, overlapChars: 50 });
  assert.ok(chunks.length > 1, 'expected more than one chunk for long input');
  chunks.forEach((c) => assert.ok(c.length > 0));
});

test('chunkText returns empty array for empty input', () => {
  assert.deepStrictEqual(chunkText(''), []);
  assert.deepStrictEqual(chunkText('   \n\n  '), []);
});

test('cosineSimilarity is 1 for identical vectors and 0 for orthogonal vectors', () => {
  assert.strictEqual(cosineSimilarity([1, 0, 0], [1, 0, 0]), 1);
  assert.strictEqual(cosineSimilarity([1, 0], [0, 1]), 0);
});

test('cosineSimilarity handles zero vectors without throwing', () => {
  assert.strictEqual(cosineSimilarity([0, 0], [0, 0]), 0);
});

test('chunkText hard-wraps punctuation-free text so no chunk exceeds maxChars', () => {
  // Regression test: a long run of text with no sentence punctuation at all
  // (a long URL, base64 blob, minified code, etc.) used to produce a single
  // oversized chunk instead of being wrapped like everything else.
  const noPunctuation = 'a'.repeat(3000);
  const chunks = chunkText(noPunctuation, { maxChars: 1200, overlapChars: 150 });
  assert.ok(chunks.length > 1, 'expected the blob to be split into multiple chunks');
  chunks.forEach((c) => assert.ok(c.length <= 1200, `chunk of length ${c.length} exceeds maxChars`));
});

test('chunkText hard-wraps an oversized sentence embedded in normal prose', () => {
  const text = 'Here is the reference: ' + 'x'.repeat(5000) + ' — that was the reference.';
  const chunks = chunkText(text, { maxChars: 500, overlapChars: 50 });
  chunks.forEach((c) => assert.ok(c.length <= 500, `chunk of length ${c.length} exceeds maxChars`));
});

const { assertPublicHttpUrl } = require('../server/utils/urlSafety');

test('assertPublicHttpUrl rejects localhost, private IPs, and cloud metadata', async () => {
  await assert.rejects(() => assertPublicHttpUrl('http://localhost/'), /localhost/i);
  await assert.rejects(() => assertPublicHttpUrl('http://127.0.0.1/'), /private or internal/i);
  await assert.rejects(() => assertPublicHttpUrl('http://169.254.169.254/latest/meta-data/'), /private or internal/i);
  await assert.rejects(() => assertPublicHttpUrl('http://10.0.0.5/'), /private or internal/i);
  await assert.rejects(() => assertPublicHttpUrl('http://192.168.1.1/'), /private or internal/i);
});

test('assertPublicHttpUrl rejects non-http(s) protocols and garbage input', async () => {
  await assert.rejects(() => assertPublicHttpUrl('ftp://example.com/file'), /http\/https/i);
  await assert.rejects(() => assertPublicHttpUrl('not a url'), /invalid url/i);
});
