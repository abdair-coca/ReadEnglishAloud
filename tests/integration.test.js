'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const generateHandler = require('../api/generate');
const chatHandler = require('../api/chat');
const evaluateHandler = require('../api/evaluate');

let server = null;
let baseUrl = '';

const nativeFetch = global.fetch;

// Helper to mock upstream Groq calls while letting localhost HTTP calls pass through to the real server
function withFetch(fn, impl) {
  global.fetch = async (url, opts) => {
    const urlStr = typeof url === 'string' ? url : (url?.url || String(url));
    if (urlStr.includes('api.groq.com')) {
      return impl(url, opts);
    }
    return nativeFetch(url, opts);
  };
  return Promise.resolve()
    .then(fn)
    .finally(() => { global.fetch = nativeFetch; });
}

const mockGroqResponse = (content, status = 200) => async () => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => (status >= 200 && status < 300
    ? { choices: [{ message: { content } }] }
    : { error: { message: content } }),
});

before(async () => {
  const indexPath = path.join(__dirname, '..', 'index.html');
  const indexHtml = fs.readFileSync(indexPath, 'utf8');

  server = http.createServer(async (req, res) => {
    // Read body chunks
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString('utf8');
    let parsedBody = {};
    if (rawBody) {
      try { parsedBody = JSON.parse(rawBody); } catch { parsedBody = rawBody; }
    }
    req.body = parsedBody;

    // Attach express/vercel response helpers
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(data));
      return res;
    };

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(indexHtml);
      return;
    }

    if (url.pathname === '/api/generate') {
      return generateHandler(req, res);
    }

    if (url.pathname === '/api/chat') {
      return chatHandler(req, res);
    }

    if (url.pathname === '/api/evaluate') {
      return evaluateHandler(req, res);
    }

    res.statusCode = 404;
    res.json({ error: 'not found' });
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

// ── Static Web UI ──
test('integration: GET / serves index.html with interactive SLA elements', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('content-type').includes('text/html'));
  const html = await res.text();
  assert.ok(html.includes('EnglishAloud'));
  assert.ok(html.includes('id="grammar-primer"'));
  assert.ok(html.includes('id="practice-card"'));
  assert.ok(html.includes('id="practice-questions-list"'));
  assert.ok(html.includes('id="reading-area"'));
});

test('integration: GET /nonexistent returns 404', async () => {
  const res = await fetch(`${baseUrl}/nonexistent`);
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.error, 'not found');
});

// ── HTTP Method Validation ──
test('integration: non-POST requests to API endpoints return 405 Method Not Allowed', async () => {
  const endpoints = ['/api/generate', '/api/chat', '/api/evaluate'];
  for (const ep of endpoints) {
    const resGet = await fetch(`${baseUrl}${ep}`);
    assert.equal(resGet.status, 405, `GET ${ep} should be 405`);
    const dataGet = await resGet.json();
    assert.equal(dataGet.error, 'Method not allowed');

    const resPut = await fetch(`${baseUrl}${ep}`, { method: 'PUT' });
    assert.equal(resPut.status, 405, `PUT ${ep} should be 405`);
  }
});

// ── API Key & Input Validation ──
test('integration: API calls without Groq API key return 500', async () => {
  const prevKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;

  try {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genre: 'Mystery', level: 'B1', length: 'short' }),
    });
    assert.equal(res.status, 500);
    const data = await res.json();
    assert.ok(data.error.includes('Groq API key missing'));
  } finally {
    if (prevKey) process.env.GROQ_API_KEY = prevKey;
  }
});

test('integration: malformed request payload returns 400 with validation details', async () => {
  const res = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ genre: 'UnknownGenre', level: 'Z9', length: 'infinite' }),
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, 'invalid request');
  assert.ok(Array.isArray(data.details));
  assert.ok(data.details.includes('invalid genre'));
});

// ── End-to-End Story Generation ──
test('integration: POST /api/generate produces structured CEFR story with targeted quiz questions', async () => {
  const mockStoryJson = JSON.stringify({
    title: 'The Silent Clocktower',
    story: 'The old town of Eldridge was quiet. Arthur walked past the town hall and noticed that the bell had stopped ringing hours before. He had never seen the mechanism stall in forty years of service. When he reached the summit, he realized that someone had removed the main bronze gear.',
    genre: 'Mystery',
    level: 'B1',
    estimated_words: 65,
    lesson_focus: 'Past Perfect',
    focus_examples: [
      { text: 'the bell had stopped ringing', reason: 'Action completed before he noticed' },
      { text: 'He had never seen the mechanism stall', reason: 'Experience up to that point in the past' }
    ],
    quiz_questions: [
      { id: 'q1', question: 'What had happened to the bell before Arthur arrived?', prompt_hint: 'Answer using: had + past participle' },
      { id: 'q2', question: 'What had Arthur never seen before in his career?', prompt_hint: 'Answer using: had never + past participle' },
      { id: 'q3', question: 'What had someone done to the clockwork mechanism?', prompt_hint: 'Answer using: had + past participle' }
    ],
    suggested_questions: ['Why would someone take the gear?', 'Who had access to the tower?']
  });

  await withFetch(async () => {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-groq-api-key': 'gsk_integration_test_key',
      },
      body: JSON.stringify({
        genre: 'Mystery',
        level: 'B1',
        length: 'short',
        lesson_focus: 'Past Perfect',
        topic: 'a stopped clocktower'
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.title, 'The Silent Clocktower');
    assert.equal(data.genre, 'Mystery');
    assert.equal(data.level, 'B1');
    assert.equal(data.lesson_focus, 'Past Perfect');
    assert.ok(Array.isArray(data.quiz_questions));
    assert.equal(data.quiz_questions.length, 3);
    assert.equal(data.quiz_questions[0].id, 'q1');
    assert.ok(data.quiz_questions[0].prompt_hint.includes('had + past participle'));
    assert.ok(Array.isArray(data.focus_examples));
    assert.equal(data.focus_examples.length, 2);
  }, mockGroqResponse(mockStoryJson));
});

// ── Idempotency Protection ──
test('integration: duplicate request with same Idempotency-Key returns 409 Conflict', async () => {
  const mockStoryJson = JSON.stringify({
    title: 'Short Adventure',
    story: 'A quick journey started in the green hills of Scotland. The travelers packed their bags with food, warm coats, and water flasks before dawn. They walked onward into the morning light and discovered an ancient bridge crossing the rushing mountain river.',
    genre: 'Adventure',
    level: 'A2',
    estimated_words: 45,
    quiz_questions: [{ id: 'q1', question: 'Where did they start?', prompt_hint: 'In the hills' }]
  });

  const idemKey = `idem-test-${Date.now()}`;

  await withFetch(async () => {
    const res1 = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-groq-api-key': 'gsk_test',
        'Idempotency-Key': idemKey,
      },
      body: JSON.stringify({ genre: 'Adventure', level: 'A2', length: 'short' }),
    });
    assert.equal(res1.status, 200);

    const res2 = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-groq-api-key': 'gsk_test',
        'Idempotency-Key': idemKey,
      },
      body: JSON.stringify({ genre: 'Adventure', level: 'A2', length: 'short' }),
    });
    assert.equal(res2.status, 409);
    const data2 = await res2.json();
    assert.equal(data2.error, 'duplicate request in progress');
  }, mockGroqResponse(mockStoryJson));
});

// ── End-to-End Targeted Practice Evaluation ──
test('integration: POST /api/evaluate rejects trivial answers with informative guidance', async () => {
  const res = await fetch(`${baseUrl}/api/evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-groq-api-key': 'gsk_test',
    },
    body: JSON.stringify({
      story: 'Long enough story text here. '.repeat(10),
      lesson_focus: 'Past Perfect',
      answers: [
        { question: 'What happened?', answer: 'Yes' },
        { question: 'Who came?', answer: '' }
      ]
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.evaluable, false);
  assert.ok(data.message.includes('complete sentence'));
});

test('integration: POST /api/evaluate evaluates targeted practice challenge with feedback breakdown', async () => {
  const mockEvalJson = JSON.stringify({
    score: 88,
    scores: {
      comprehension: 90,
      grammar: 85,
      vocabulary: 85,
      communication: 90,
      lesson_focus: 92
    },
    summary: 'Excellent demonstration of the Past Perfect tense to order past events.',
    strengths: ['Correct use of had + past participle in all 3 answers', 'Accurate story comprehension'],
    mistakes: [],
    recommendations: ['Continue practicing negative forms such as had not + V3.'],
    answers_feedback: [
      {
        question_index: 0,
        target_used_correctly: true,
        comprehension_accurate: true,
        original: 'The bell had stopped ringing hours before Arthur arrived.',
        correction: 'The bell had stopped ringing hours before Arthur arrived.',
        feedback: 'Flawless construction of had + stopped.'
      },
      {
        question_index: 1,
        target_used_correctly: true,
        comprehension_accurate: true,
        original: 'He had never witnessed a failure like this in forty years.',
        correction: 'He had never witnessed a failure like this in forty years.',
        feedback: 'Great placement of the adverb never.'
      },
      {
        question_index: 2,
        target_used_correctly: true,
        comprehension_accurate: true,
        original: 'A thief had removed the bronze gear.',
        correction: 'A thief had removed the bronze gear.',
        feedback: 'Accurate and concise.'
      }
    ],
    lesson_focus_feedback: {
      focus: 'Past Perfect',
      feedback: 'You consistently mastered had + past participle across all responses.',
      examples: ['had stopped', 'had never witnessed', 'had removed']
    }
  });

  await withFetch(async () => {
    const res = await fetch(`${baseUrl}/api/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-groq-api-key': 'gsk_test',
      },
      body: JSON.stringify({
        story: 'Arthur walked into the clocktower and saw the gears stopped. '.repeat(5),
        lesson_focus: 'Past Perfect',
        answers: [
          { question: 'What happened?', answer: 'The bell had stopped ringing hours before Arthur arrived.', prompt_hint: 'had + V3' },
          { question: 'What had he never seen?', answer: 'He had never witnessed a failure like this in forty years.', prompt_hint: 'had + V3' },
          { question: 'Who took the gear?', answer: 'A thief had removed the bronze gear.', prompt_hint: 'had + V3' }
        ]
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.evaluable, true);
    assert.equal(typeof data.score, 'number');
    assert.ok(data.score >= 80 && data.score <= 100);
    assert.equal(data.scores.lesson_focus, 92);
    assert.ok(Array.isArray(data.answers_feedback));
    assert.equal(data.answers_feedback.length, 3);
    assert.equal(data.answers_feedback[0].target_used_correctly, true);
    assert.equal(data.lesson_focus_feedback.focus, 'Past Perfect');
  }, mockGroqResponse(mockEvalJson));
});

// ── Chat & Vocabulary Explanations ──
test('integration: POST /api/chat provides contextual word definition', async () => {
  await withFetch(async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-groq-api-key': 'gsk_test',
      },
      body: JSON.stringify({
        story: 'The beacon emitted a luminous flare across the stormy coastline.',
        message: 'What does "luminous" mean here?',
        level: 'B1'
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.reply, '**Luminous** means giving off or reflecting bright light.');
  }, mockGroqResponse('**Luminous** means giving off or reflecting bright light.'));
});

// ── Upstream Resilience & Failure Modes ──
test('integration: upstream Groq 429 returns clean 429 to client', async () => {
  await withFetch(async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-groq-api-key': 'gsk_test',
      },
      body: JSON.stringify({
        story: 'A brief story here. '.repeat(5),
        message: 'Hello assistant'
      }),
    });
    assert.equal(res.status, 429);
    const data = await res.json();
    assert.equal(data.code, 'provider_error');
  }, mockGroqResponse('Rate limit exceeded', 429));
});

test('integration: upstream malformed JSON returns 502 with preview', async () => {
  await withFetch(async () => {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-groq-api-key': 'gsk_test',
      },
      body: JSON.stringify({
        genre: 'Fantasy',
        level: 'B2',
        length: 'short'
      }),
    });
    assert.equal(res.status, 502);
    const data = await res.json();
    assert.equal(data.error, 'malformed AI response');
    assert.ok(data.preview);
  }, mockGroqResponse('Not a JSON string at all {{{'));
});
