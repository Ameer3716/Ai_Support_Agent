const { db } = require('../db');
const { getEmbedding, cosineSimilarity } = require('./embeddings');

/**
 * Finds the top-K most relevant chunks of a client's knowledge base for a query.
 * In-memory cosine similarity is plenty fast for the realistic size of an SMB
 * knowledge base (hundreds to a few thousand chunks) and keeps the whole stack
 * to a single SQLite file — no separate vector database to run or pay for.
 */
async function retrieveContext(clientId, query, { topK = 5, minScore = 0.72 } = {}) {
  const rows = db
    .prepare('SELECT id, document_id, content, embedding FROM chunks WHERE client_id = ?')
    .all(clientId);

  if (rows.length === 0) {
    return { chunks: [], topScore: 0 };
  }

  const queryEmbedding = await getEmbedding(query);

  const scored = rows.map((row) => ({
    id: row.id,
    documentId: row.document_id,
    content: row.content,
    score: cosineSimilarity(queryEmbedding, JSON.parse(row.embedding)),
  }));

  scored.sort((a, b) => b.score - a.score);

  const top = scored.slice(0, topK);
  const topScore = top.length ? top[0].score : 0;
  const relevant = top.filter((c) => c.score >= minScore);

  return { chunks: relevant, topScore };
}

module.exports = { retrieveContext };
