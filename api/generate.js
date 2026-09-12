const { CONFIG } = require('./lib/config');
const { validateGenerate, LENGTHS } = require('./lib/validate');
const { callGroq, describeContent, parseJsonSafe, log } = require('./lib/groq');
const { validateStoryJson } = require('./lib/schemas');
const { storyUserPrompt } = require('./lib/prompts');

// Best-effort in-memory idempotency (serverless-ephemeral, see docs).
const seen = new Map();
function checkIdempotency(key) {
  if (!key) return false;
  const now = Date.now();
  for (const [k, t] of seen) if (now - t > 5 * 60 * 1000) seen.delete(k);
  if (seen.has(key)) return true;
  seen.set(key, now);
  return false;
}

function getApiKey(req) {
  return (
    req.headers['x-groq-api-key'] ||
    req.headers['x-groq-key'] ||
    req.body?.groqApiKey ||
    process.env.GROQ_API_KEY ||
    null
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (typeof req.body === 'string') {
    try { req.body = JSON.parse(req.body); } catch { req.body = {}; }
  }

  // Validate shape first so malformed requests get 400 even without a key.
  const isStructured = req.body && (req.body.genre || req.body.level || req.body.length);
  let validated = null;
  if (isStructured) {
    validated = validateGenerate(req.body);
    if (!validated.ok) {
      log('story', { ok: false, validation: validated.errors });
      return res.status(400).json({ error: 'invalid request', details: validated.errors });
    }
  }

  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res.status(500).json({ error: 'Groq API key missing. Add it in the UI or configure GROQ_API_KEY on the server.' });
  }

  const idemKey = req.headers['idempotency-key'] || req.headers['Idempotency-Key'] || req.body?.idempotencyKey;
  if (checkIdempotency(idemKey)) {
    return res.status(409).json({ error: 'duplicate request in progress' });
  }

  try {
    // ── New structured path (§§2-4): {genre, level, length, topic?, lesson_focus?} ──
    if (isStructured && validated && validated.ok) {
      const { genre, level, length, topic, lesson_focus } = validated.value;
      const words = LENGTHS[length].words;
      // NOTE: no response_format — gpt-oss via Groq rejects json_object with 400.
      // The prompt demands JSON-only; parseJsonSafe recovers fences/prose.
      const payload = {
        model: CONFIG.model,
        messages: [{ role: 'user', content: storyUserPrompt({ genre, level, length, words, topic, lesson_focus }) }],
        temperature: CONFIG.temperatures.story,
        max_completion_tokens: CONFIG.maxTokens.story,
        top_p: 0.95,
        reasoning_effort: CONFIG.reasoningEffort.story,
      };
      const data = await callGroq({ apiKey, payload, timeoutMs: CONFIG.timeoutsMs.story, op: 'story' });
      const desc = describeContent(data);
      const raw = desc.text;
      if (!raw) {
        log('story', { ok: false, reason: 'empty-model-response', finishReason: desc.finishReason, messageKeys: desc.messageKeys, contentLen: desc.contentLen, reasoningLen: desc.reasoningLen });
        return res.status(502).json({ error: 'empty model response', detail: `finish=${desc.finishReason} content_len=${desc.contentLen} reasoning_len=${desc.reasoningLen}` });
      }
      const parsed = parseJsonSafe(raw);
      if (!parsed.ok) {
        log('story', { ok: false, reason: 'malformed-ai-output', preview: parsed.preview });
        return res.status(502).json({ error: 'malformed AI response', preview: parsed.preview });
      }
      const checked = validateStoryJson(parsed.value, { genre, level, lesson_focus });
      if (!checked.ok) {
        log('story', { ok: false, reason: checked.error });
        return res.status(502).json({ error: 'invalid AI story shape', detail: checked.error });
      }
      if (parsed.recovered) log('story', { ok: true, recoveredJson: true });
      return res.status(200).json(checked.value);
    }

    // ── Legacy passthrough (current index.html sends raw Groq body). Kept for compat. ──
    const { groqApiKey: _omit, idempotencyKey: _idem, ...forwardBody } = req.body || {};
    if (!forwardBody.model) forwardBody.model = CONFIG.model;
    const data = await callGroq({
      apiKey,
      payload: forwardBody,
      timeoutMs: CONFIG.timeoutsMs.story,
      op: 'story-legacy',
    });
    return res.status(200).json(data);
  } catch (err) {
    const status = err.status || 502;
    const code = err.code || 'story_failed';
    return res.status(status).json({ error: code === 'provider_timeout' ? 'provider timeout' : 'story generation failed', code, detail: String(err.message || '').slice(0, 500) });
  }
};
