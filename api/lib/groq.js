'use strict';

// Groq OpenAI-compatible caller: timeout + structured logging, no secrets logged.
function log(op, fields) {
  const safe = { op, t: new Date().toISOString(), ...fields };
  if (safe.apiKey) delete safe.apiKey;
  if (safe.Authorization) delete safe.Authorization;
  console.log(JSON.stringify(safe));
}

async function callGroq({ apiKey, payload, timeoutMs, op, fetchImpl }) {
  const fetchFn = fetchImpl || fetch;
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs || 30000);
  try {
    const res = await fetchFn('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    log(op || 'groq', {
      ok: res.ok,
      status: res.status,
      ms: Date.now() - started,
      model: payload?.model,
    });
    if (!res.ok) {
      const detail = JSON.stringify(data?.error || data).slice(0, 500);
      const err = new Error(`provider ${res.status}: ${detail}`);
      err.status = res.status;
      err.code = 'provider_error';
      throw err;
    }
    return data;
  } catch (err) {
    if (err?.name === 'AbortError') {
      log(op || 'groq', { ok: false, timeout: true, ms: Date.now() - started, model: payload?.model });
      const e = new Error('provider timeout');
      e.code = 'provider_timeout';
      e.status = 504;
      throw e;
    }
    if (!err.code) {
      log(op || 'groq', { ok: false, network: true, ms: Date.now() - started, model: payload?.model });
      err.code = err.code || 'provider_unreachable';
      err.status = err.status || 502;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function extractContent(data) {
  return (
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.text ??
    data?.choices?.[0]?.delta?.content ??
    null
  );
}

// Safe JSON recovery: strip code fences, grab first {...} block.
function parseJsonSafe(raw) {
  if (!raw || typeof raw !== 'string') return { ok: false, error: 'empty' };
  let t = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  try {
    return { ok: true, value: JSON.parse(t) };
  } catch {
    const s = t.indexOf('{');
    const e = t.lastIndexOf('}');
    if (s !== -1 && e > s) {
      try {
        return { ok: true, value: JSON.parse(t.slice(s, e + 1)), recovered: true };
      } catch (err) {
        return { ok: false, error: 'malformed', preview: t.slice(0, 300) };
      }
    }
    return { ok: false, error: 'malformed', preview: t.slice(0, 300) };
  }
}

module.exports = { callGroq, extractContent, parseJsonSafe, log };
