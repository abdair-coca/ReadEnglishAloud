const { CONFIG } = require('./lib/config');
const { validateGenerate, LENGTHS } = require('./lib/validate');
const { callGroq, extractContent, parseJsonSafe, log } = require('./lib/groq');
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

  // Validate shape first so malformed requests get 400 even without a key.
  const isStructured = req.body && (req.body.genre || req.body.level || req.body.length);
  if (isStructured) {
    const early = validateGenerate(req.body);
    if (!early.ok) {
      log('story', { ok: false, validation: early.errors });
      return res.status(400).json({ error: 'invalid request', details: early.errors });
    }
  }

  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res.status(500).json({ error: 'Groq API key missing. Add it in the UI or configure GROQ_API_KEY on the server.' });
  }

  if (checkIdempotency(req.headers['idempotency-key'] || req.body?.idempotencyKey)) {
    return res.status(409).json({ error: 'duplicate request in progress' });
  }

  try {
    // ── New structured path (§§2-4): {genre, level, length, topic?, lesson_focus?} ──
    if (req.body && (req.body.genre || req.body.level || req.body.length)) {
      const v = validateGenerate(req.body);
      if (!v.ok) {
        log('story', { ok: false, validation: v.errors });
        return res.status(400).json({ error: 'invalid request', details: v.errors });
      }
      const { genre, level, length, topic, lesson_focus } = v.value;
      const words = LENGTHS[length].words;
      const payload = {
        model: CONFIG.model,
        messages: [{ role: 'user', content: storyUserPrompt({ genre, level, length, words, topic, lesson_focus }) }],
        temperature: CONFIG.temperatures.story,
        max_completion_tokens: CONFIG.maxTokens.story,
        top_p: 0.95,
        response_format: { type: 'json_object' },
      };
      const data = await callGroq({ apiKey, payload, timeoutMs: CONFIG.timeoutsMs.story, op: 'story' });
      const raw = extractContent(data);
      if (!raw) {
        log('story', { ok: false, reason: 'empty-model-response' });
        return res.status(502).json({ error: 'empty model response' });
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
    return res.status(status).json({ error: code === 'provider_timeout' ? 'provider timeout' : 'story generation failed', code });
  }
};
