'use strict';
// Critical logic tests (§30). No real provider calls — global fetch mocked per test.
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { validateGenerate, validateChat, validateEvaluate } = require('../api/lib/validate');
const { validateStoryJson, validateEvalJson } = require('../api/lib/schemas');
const { parseJsonSafe } = require('../api/lib/groq');

function mockRes() {
  const r = { statusCode: 200, body: null };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}
function withFetch(fn, impl) {
  const prev = global.fetch;
  global.fetch = impl;
  return Promise.resolve()
    .then(fn)
    .finally(() => { global.fetch = prev; });
}
const okFetch = (content) => async () => ({
  ok: true, status: 200,
  json: async () => ({ choices: [{ message: { content } }] }),
});

// ── Story generation validation ──
test('generate: valid request passes', () => {
  const v = validateGenerate({ genre: 'Mystery', level: 'b2', length: 'medium (about 500 words)', topic: 'ocean', lesson_focus: 'Past Perfect' });
  assert.equal(v.ok, true);
  assert.equal(v.value.genre, 'Mystery');
  assert.equal(v.value.level, 'B2');
  assert.equal(v.value.length, 'medium');
});

test('generate: invalid genre/level rejected', () => {
  assert.equal(validateGenerate({ genre: 'Nope', level: 'B2', length: 'medium' }).ok, false);
  assert.equal(validateGenerate({ genre: 'Mystery', level: 'Z9', length: 'medium' }).ok, false);
  assert.equal(validateGenerate({ genre: 'Mystery', level: 'B2', length: 'huge' }).ok, false);
});

test('generate: lesson_focus empty vs provided', () => {
  assert.equal(validateGenerate({ genre: 'Horror', level: 'A1', length: 'short' }).value.lesson_focus, '');
  assert.equal(validateGenerate({ genre: 'Horror', level: 'A1', length: 'short', lesson_focus: '  Phrasal verbs ' }).value.lesson_focus, 'Phrasal verbs');
});

test('generate: handler rejects invalid + handles malformed AI', async () => {
  const h = require('../api/generate');
  let r = mockRes();
  await h({ method: 'POST', headers: {}, body: { genre: 'X', level: 'B1', length: 'medium' } }, r);
  assert.equal(r.statusCode, 400);
  // malformed model output → 502, never crash
  r = mockRes();
  await withFetch(
    () => h({ method: 'POST', headers: {}, body: { genre: 'Mystery', level: 'B1', length: 'medium', groqApiKey: 'gsk_t' } }, r),
    okFetch('not json at all {{{')
  );
  assert.equal(r.statusCode, 502);
});

test('generate: handler returns structured story on valid AI JSON', async () => {
  const h = require('../api/generate');
  const story = 'word '.repeat(60);
  const r = mockRes();
  await withFetch(
    () => h({ method: 'POST', headers: {}, body: { genre: 'Mystery', level: 'B1', length: 'medium', lesson_focus: 'Past Perfect', groqApiKey: 'gsk_t' } }, r),
    okFetch(JSON.stringify({ title: 'T', story, suggested_questions: ['Q1'] }))
  );
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.title, 'T');
  assert.ok(r.body.suggested_questions.length >= 1);
});

// ── Chat ──
test('chat: nonexistent/empty story rejected, valid saved', async () => {
  assert.equal(validateChat({ message: 'hi', story: '  ' }, 12).ok, false);
  const v = validateChat({ message: 'What did Lily find?', story: 'Lily found a map. '.repeat(20), history: [{ role: 'user', text: 'hi there learner' }] }, 12);
  assert.equal(v.ok, true);
  assert.equal(v.value.history.length, 1);
});

test('chat: provider failure → 502 shape', async () => {
  const h = require('../api/chat');
  const r = mockRes();
  await withFetch(
    () => h({ method: 'POST', headers: {}, body: { message: 'hello there friend', story: 'Some story content here. '.repeat(10), groqApiKey: 'gsk_t' } }, r),
    async () => ({ ok: false, status: 429, json: async () => ({ error: { message: 'rate limit' } }) })
  );
  assert.equal(r.statusCode, 429);
  assert.ok(r.body.code);
});

// ── Evaluation ──
test('evaluate: insufficient conversation not scored', () => {
  const v = validateEvaluate({ story: 'Story here. '.repeat(20), userMessages: ['Hello', 'Thanks!'] }, 4, 40);
  assert.equal(v.ok, true);
  assert.equal(v.value.evaluable, false);
});

test('evaluate: valid conversation evaluable; focus on/off shapes', () => {
  const msgs = [
    'I think Lily found the map because she was bravely exploring the dark cave for many hours yesterday',
    'She decided to hide it since she distrusted the stranger who had been following her all day',
    'In my opinion the ending shows she learned to trust herself and her own careful judgment',
    'If I had been there I would have asked the villagers for help before entering the tunnel',
  ];
  const v = validateEvaluate({ story: 'Lily story. '.repeat(30), userMessages: msgs }, 4, 40);
  assert.equal(v.value.evaluable, true);
  const noFocus = validateEvalJson({ score: 80, scores: { comprehension: 85, grammar: 75, vocabulary: 80, communication: 80 }, summary: 's', mistakes: [], recommendations: [] }, '');
  assert.equal(noFocus.ok, true);
  assert.equal(noFocus.value.lesson_focus_feedback, null);
  const withFocus = validateEvalJson(
    { score: 80, scores: { comprehension: 85, grammar: 75, vocabulary: 80, communication: 80, lesson_focus: 70 }, summary: 's', mistakes: [], recommendations: [], lesson_focus_feedback: { feedback: 'f', examples: [] } },
    'Past Perfect'
  );
  assert.equal(withFocus.ok, true);
  assert.equal(withFocus.value.scores.lesson_focus, 70);
});

test('evaluate: malformed model response → 502', async () => {
  const h = require('../api/evaluate');
  const msgs = ['I really think Lily found the hidden map because she was bravely exploring the dark cave for many hours yesterday evening', 'She decided to hide it afterwards since she deeply distrusted the mysterious stranger who had been following her all day long', 'In my personal opinion the ending clearly shows she finally learned to trust herself and her own careful judgment under pressure', 'If I had been there with her I would have asked the villagers for help before entering the dangerous tunnel alone'];  
  const r = mockRes();
  await withFetch(
    () => h({ method: 'POST', headers: {}, body: { story: 'Story. '.repeat(30), userMessages: msgs, groqApiKey: 'gsk_t' } }, r),
    okFetch('garbage {{{ not json')
  );
  assert.equal(r.statusCode, 502);
});

test('evaluate: score range enforced 0-100', () => {
  const bad = validateEvalJson({ score: 9999, scores: { comprehension: 1, grammar: 1, vocabulary: 1, communication: 1 }, summary: '', mistakes: [], recommendations: [] }, '');
  // clamp keeps handler honest: 9999 → 100, strings → reject
  assert.equal(bad.value.score, 100);
  const bad2 = validateEvalJson({ score: 'high', scores: { comprehension: 1, grammar: 1, vocabulary: 1, communication: 1 }, summary: '', mistakes: [], recommendations: [] }, '');
  assert.equal(bad2.ok, false);
});

// ── Provider compat: gpt-oss rejects response_format (400) ──
test('payloads avoid response_format (gpt-oss compat)', async () => {
  const seen = [];
  const cap = (content) => async (url, opts) => {
    seen.push(JSON.parse(opts.body));
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) };
  };
  const story = 'word '.repeat(60);
  const h = require('../api/generate');
  await withFetch(
    () => h({ method: 'POST', headers: {}, body: { genre: 'Mystery', level: 'B1', length: 'medium', groqApiKey: 'gsk_t' } }, mockRes()),
    cap(JSON.stringify({ title: 'T', story }))
  );
  const he = require('../api/evaluate');
  const msgs = ['I really think Lily found the hidden map because she was bravely exploring the dark cave for many hours yesterday evening', 'She decided to hide it afterwards since she deeply distrusted the mysterious stranger who had been following her all day long', 'In my personal opinion the ending clearly shows she finally learned to trust herself and her own careful judgment under pressure', 'If I had been there with her I would have asked the villagers for help before entering the dangerous tunnel alone'];
  await withFetch(
    () => he({ method: 'POST', headers: {}, body: { story: 'Story. '.repeat(30), userMessages: msgs, groqApiKey: 'gsk_t' } }, mockRes()),
    cap(JSON.stringify({ score: 80, scores: { comprehension: 85, grammar: 75, vocabulary: 80, communication: 80 }, summary: 's', mistakes: [], recommendations: [] }))
  );
  assert.equal(seen.length, 2);
  assert.ok(seen.every((p) => !('response_format' in p)), 'no response_format in any payload');
  assert.ok(seen.every((p) => p.reasoning_effort === 'low'), 'gpt-oss gets reasoning_effort low');
});
test('parseJsonSafe: fences + surrounding text recovered', () => {
  const r = parseJsonSafe('```json\n{"title":"T","story":"' + 'w '.repeat(50) + '"}\n```');
  assert.equal(r.ok, true);
  const r2 = parseJsonSafe('here you go {"title":"T","story":"' + 'w '.repeat(50) + '"} bye');
  assert.equal(r2.ok, true);
  assert.equal(r2.recovered, true);
});
