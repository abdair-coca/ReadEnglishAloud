const { CONFIG } = require('./lib/config');
const { validateEvaluate } = require('./lib/validate');
const { callGroq, extractContent, parseJsonSafe, log } = require('./lib/groq');
const { validateEvalJson } = require('./lib/schemas');
const { evalUser } = require('./lib/prompts');

const seen = new Map();
function checkIdempotency(key) {
  if (!key) return false;
  const now = Date.now();
  for (const [k, t] of seen) if (now - t > 10 * 60 * 1000) seen.delete(k);
  if (seen.has(key)) return true;
  seen.set(key, now);
  return false;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const v0 = validateEvaluate(req.body, CONFIG.evalMinUserMessages, CONFIG.evalMinUserWords);
  if (!v0.ok) {
    log('evaluate', { ok: false, validation: v0.errors });
    return res.status(400).json({ error: 'invalid request', details: v0.errors });
  }
  const apiKey =
    req.headers['x-groq-api-key'] || req.headers['x-groq-key'] || req.body?.groqApiKey || process.env.GROQ_API_KEY || null;
  if (!apiKey) {
    return res.status(500).json({ error: 'Groq API key missing. Add it in the UI or configure GROQ_API_KEY on the server.' });
  }
  if (checkIdempotency(req.headers['idempotency-key'] || req.body?.idempotencyKey)) {
    return res.status(409).json({ error: 'duplicate request in progress' });
  }

  const v = validateEvaluate(req.body, CONFIG.evalMinUserMessages, CONFIG.evalMinUserWords);
  if (!v.ok) {
    log('evaluate', { ok: false, validation: v.errors });
    return res.status(400).json({ error: 'invalid request', details: v.errors });
  }
  // §16: no false scores on trivial conversation.
  if (!v.value.evaluable) {
    return res.status(200).json({
      evaluable: false,
      message: 'Keep talking a little more so I can give you a meaningful evaluation.',
      usefulCount: v.value.usefulCount,
      words: v.value.words,
    });
  }

  try {
    const { story, lesson_focus, userMessages } = v.value;
    const weights = lesson_focus ? CONFIG.rubric.withFocus : CONFIG.rubric.base;
    // NOTE: no response_format — gpt-oss via Groq rejects json_object with 400.
    const payload = {
      model: CONFIG.model,
      messages: [{ role: 'user', content: evalUser({ story, lesson_focus, userMessages, weights }) }],
      temperature: CONFIG.temperatures.evaluation,
      max_completion_tokens: CONFIG.maxTokens.evaluation,
      top_p: 1,
    };
    const data = await callGroq({ apiKey, payload, timeoutMs: CONFIG.timeoutsMs.evaluation, op: 'evaluate' });
    const raw = extractContent(data);
    if (!raw) {
      log('evaluate', { ok: false, reason: 'empty-model-response' });
      return res.status(502).json({ error: 'empty model response' });
    }
    const parsed = parseJsonSafe(raw);
    if (!parsed.ok) {
      log('evaluate', { ok: false, reason: 'malformed-ai-output', preview: parsed.preview });
      return res.status(502).json({ error: 'malformed AI response', preview: parsed.preview });
    }
    const checked = validateEvalJson(parsed.value, lesson_focus);
    if (!checked.ok) {
      log('evaluate', { ok: false, reason: checked.error });
      return res.status(502).json({ error: 'invalid evaluation shape', detail: checked.error });
    }
    // Enforce weighted total server-side (§11): score = round(Σ sub*weight).
    const w = weights;
    const s = checked.value.scores;
    const total = Math.round(
      s.comprehension * w.comprehension +
        s.grammar * w.grammar +
        s.vocabulary * w.vocabulary +
        s.communication * w.communication +
        (lesson_focus ? s.lesson_focus * w.lesson_focus : 0)
    );
    checked.value.score = Math.min(100, Math.max(0, total));
    checked.value.evaluable = true;
    if (parsed.recovered) log('evaluate', { ok: true, recoveredJson: true });
    return res.status(200).json(checked.value);
  } catch (err) {
    return res.status(err.status || 502).json({
      error: err.code === 'provider_timeout' ? 'provider timeout' : 'evaluation failed',
      code: err.code || 'evaluate_failed',
      detail: String(err.message || '').slice(0, 500),
    });
  }
};
