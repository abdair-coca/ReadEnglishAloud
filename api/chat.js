const { CONFIG } = require('./lib/config');
const { validateChat } = require('./lib/validate');
const { callGroq, describeContent, log } = require('./lib/groq');
const { chatSystem, chatUser } = require('./lib/prompts');

const seen = new Map();
function checkIdempotency(key) {
  if (!key) return false;
  const now = Date.now();
  for (const [k, t] of seen) if (now - t > 5 * 60 * 1000) seen.delete(k);
  if (seen.has(key)) return true;
  seen.set(key, now);
  return false;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const early = validateChat(req.body, CONFIG.chatHistoryLimit);
  if (!early.ok) {
    log('chat', { ok: false, validation: early.errors });
    return res.status(400).json({ error: 'invalid request', details: early.errors });
  }
  const apiKey =
    req.headers['x-groq-api-key'] || req.headers['x-groq-key'] || req.body?.groqApiKey || process.env.GROQ_API_KEY || null;
  if (!apiKey) {
    return res.status(500).json({ error: 'Groq API key missing. Add it in the UI or configure GROQ_API_KEY on the server.' });
  }
  if (checkIdempotency(req.headers['idempotency-key'] || req.body?.idempotencyKey)) {
    return res.status(409).json({ error: 'duplicate request in progress' });
  }

  const v = validateChat(req.body, CONFIG.chatHistoryLimit);
  if (!v.ok) {
    log('chat', { ok: false, validation: v.errors });
    return res.status(400).json({ error: 'invalid request', details: v.errors });
  }

  try {
    const { story, history, message, level, lesson_focus } = v.value;
    const payload = {
      model: CONFIG.model,
      messages: [
        { role: 'system', content: chatSystem({ level, lesson_focus }) },
        { role: 'user', content: chatUser({ story, history, message }) },
      ],
      temperature: CONFIG.temperatures.chat,
      max_completion_tokens: CONFIG.maxTokens.chat,
      top_p: 0.95,
      reasoning_effort: CONFIG.reasoningEffort.chat,
    };
    const data = await callGroq({ apiKey, payload, timeoutMs: CONFIG.timeoutsMs.chat, op: 'chat' });
    const reply = describeContent(data).text.trim();
    if (!reply) {
      log('chat', { ok: false, reason: 'empty-model-response' });
      return res.status(502).json({ error: 'empty model response' });
    }
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(err.status || 502).json({
      error: err.code === 'provider_timeout' ? 'provider timeout' : 'chat failed',
      code: err.code || 'chat_failed',
      detail: String(err.message || '').slice(0, 500),
    });
  }
};
