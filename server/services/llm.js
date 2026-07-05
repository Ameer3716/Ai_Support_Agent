const { config } = require('../config');

/**
 * Get a chat completion from the configured provider.
 * @param {object} params
 * @param {string} params.systemPrompt
 * @param {{role: 'user'|'assistant', content: string}[]} params.messages
 * @param {number} [params.maxTokens]
 * @returns {Promise<string>}
 */
async function chatCompletion({ systemPrompt, messages, maxTokens }) {
  const cappedTokens = Math.min(maxTokens || config.llm.maxResponseTokens, config.llm.maxResponseTokens);

  if (config.llm.provider === 'anthropic') {
    return anthropicChat({ systemPrompt, messages, maxTokens: cappedTokens });
  }
  if (config.llm.provider === 'openai') {
    return openaiChat({ systemPrompt, messages, maxTokens: cappedTokens });
  }
  if (config.llm.provider === 'groq') {
    return groqChat({ systemPrompt, messages, maxTokens: cappedTokens });
  }
  if (config.llm.provider === 'gemini') {
    return geminiChat({ systemPrompt, messages, maxTokens: cappedTokens });
  }
  if (config.llm.provider === 'ollama') {
    return ollamaChat({ systemPrompt, messages, maxTokens: cappedTokens });
  }
  throw new Error(
    `Unsupported LLM_PROVIDER "${config.llm.provider}" — use "anthropic", "openai", "groq", "gemini", or "ollama".`
  );
}

async function anthropicChat({ systemPrompt, messages, maxTokens }) {
  if (!config.llm.anthropicApiKey) throw new Error('ANTHROPIC_API_KEY is not set.');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.llm.anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.llm.anthropicModel,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Anthropic API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const textBlock = (data.content || []).find((b) => b.type === 'text');
  return textBlock ? textBlock.text.trim() : '';
}

async function openaiChat({ systemPrompt, messages, maxTokens }) {
  if (!config.llm.openaiApiKey) throw new Error('OPENAI_API_KEY is not set.');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.llm.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: config.llm.openaiModel,
      max_completion_tokens: maxTokens,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenAI API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return (data.choices?.[0]?.message?.content || '').trim();
}

// --- Free alternatives ---

/**
 * Groq — free API key (no card needed), OpenAI-compatible endpoint, and very
 * fast inference on open models like Llama 3.3. Good drop-in swap for demos.
 * Get a key at https://console.groq.com/keys
 */
async function groqChat({ systemPrompt, messages, maxTokens }) {
  if (!config.llm.groqApiKey) throw new Error('GROQ_API_KEY is not set. Get a free key at https://console.groq.com/keys');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.llm.groqApiKey}`,
    },
    body: JSON.stringify({
      model: config.llm.groqModel,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return (data.choices?.[0]?.message?.content || '').trim();
}

/**
 * Google Gemini — free tier API key, no card needed.
 * Get a key at https://aistudio.google.com/apikey
 */
async function geminiChat({ systemPrompt, messages, maxTokens }) {
  if (!config.llm.geminiApiKey) throw new Error('GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey');

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.llm.geminiModel}:generateContent?key=${config.llm.geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  return text.trim();
}

/**
 * Ollama — fully local, zero cost, no API key at all. Install from
 * https://ollama.com, then `ollama pull llama3.2` (or your chosen model)
 * and make sure `ollama serve` is running before starting this app.
 */
async function ollamaChat({ systemPrompt, messages, maxTokens }) {
  const res = await fetch(`${config.llm.ollamaBaseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.llm.ollamaModel,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: false,
      options: { num_predict: maxTokens },
    }),
  }).catch((err) => {
    throw new Error(`Could not reach Ollama at ${config.llm.ollamaBaseUrl} — is "ollama serve" running? (${err.message})`);
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(
      `Ollama API error (${res.status}): ${errText}. Have you run "ollama pull ${config.llm.ollamaModel}"?`
    );
  }

  const data = await res.json();
  return (data.message?.content || '').trim();
}

module.exports = { chatCompletion };
