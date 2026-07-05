const { config } = require('../config');

// Stay comfortably under OpenAI's per-request input-array limits.
const EMBEDDING_BATCH_SIZE = 96;

/**
 * Embeds a single string. Used at query time (one short question per chat
 * message), so batching isn't worth the extra complexity here.
 */
async function getEmbedding(text) {
  const [embedding] = await requestEmbeddings([text]);
  return embedding;
}

/**
 * Embeds many chunks at once (used during document ingestion). Batches requests
 * so a large document doesn't send hundreds of chunks in a single HTTP call.
 */
async function getEmbeddingsBatch(texts) {
  const results = [];
  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
    const embeddings = await requestEmbeddings(batch);
    results.push(...embeddings);
  }
  return results;
}

async function requestEmbeddings(inputs) {
  const provider = config.embeddings.provider;
  if (provider === 'gemini') return requestGeminiEmbeddings(inputs);
  if (provider === 'ollama') return requestOllamaEmbeddings(inputs);
  return requestOpenAIEmbeddings(inputs); // default: 'openai'
}

async function requestOpenAIEmbeddings(inputs) {
  if (!config.embeddings.openaiApiKey) {
    throw new Error(
      'OPENAI_API_KEY is not set. Either set it, or switch to a free alternative: ' +
        'EMBEDDINGS_PROVIDER=gemini (needs a free GEMINI_API_KEY) or EMBEDDINGS_PROVIDER=ollama (fully local, no key).'
    );
  }

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.embeddings.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: config.embeddings.model,
      input: inputs,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenAI embeddings API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  // The API returns results in the same order as the input array.
  return data.data.map((d) => d.embedding);
}

// --- Free alternatives ---

/**
 * Google Gemini embeddings — free tier, no card needed. Same key as
 * GEMINI_API_KEY (used for chat) works here too.
 * Get a key at https://aistudio.google.com/apikey
 * Note: the Gemini API embeds one piece of content per request, so we loop
 * over the batch. Fine for the batch sizes a demo/SMB knowledge base needs.
 */
async function requestGeminiEmbeddings(inputs) {
  if (!config.embeddings.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey');
  }

  const results = [];
  for (const text of inputs) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.embeddings.geminiModel}:embedContent?key=${config.embeddings.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { parts: [{ text }] } }),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Gemini embeddings API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    results.push(data.embedding.values);
  }
  return results;
}

/**
 * Ollama local embeddings — fully free, no API key at all. Install from
 * https://ollama.com, then `ollama pull nomic-embed-text` (or your chosen
 * model) and make sure `ollama serve` is running.
 */
async function requestOllamaEmbeddings(inputs) {
  const results = [];
  for (const text of inputs) {
    const res = await fetch(`${config.embeddings.ollamaBaseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.embeddings.ollamaModel, prompt: text }),
    }).catch((err) => {
      throw new Error(
        `Could not reach Ollama at ${config.embeddings.ollamaBaseUrl} — is "ollama serve" running? (${err.message})`
      );
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(
        `Ollama embeddings API error (${res.status}): ${errText}. Have you run "ollama pull ${config.embeddings.ollamaModel}"?`
      );
    }

    const data = await res.json();
    results.push(data.embedding);
  }
  return results;
}

/**
 * Standard cosine similarity between two equal-length float vectors.
 * Returns a value in roughly [-1, 1]; higher means more similar.
 */
function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = { getEmbedding, getEmbeddingsBatch, cosineSimilarity };
