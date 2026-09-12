'use strict';

// Whitelists — server never trusts frontend enums (§22).
const GENRES = [
  'Adventure',
  'Mystery',
  'Science Fiction',
  'Fantasy',
  'Slice of Life',
  'Horror',
  'Romance',
  'Historical',
];
// Accept short alias "Sci-Fi" from UI, normalize to canonical.
const GENRE_ALIASES = { 'sci-fi': 'Science Fiction' };

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const LENGTHS = {
  short: { label: 'short', words: 200 },
  medium: { label: 'medium', words: 500 },
  long: { label: 'long', words: 1000 },
};

const MAX_TOPIC = 140;
const MAX_FOCUS = 80;
const MAX_MESSAGE = 1000;
const MAX_SNAPSHOT_CHARS = 12000;

function normalizeGenre(v) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (GENRES.includes(t)) return t;
  const alias = GENRE_ALIASES[t.toLowerCase()];
  return alias || null;
}

function normalizeLevel(v) {
  if (typeof v !== 'string') return null;
  const t = v.trim().toUpperCase();
  return LEVELS.includes(t) ? t : null;
}

// Accepts "medium", "medium (about 500 words)", "~500 words" → "medium".
function normalizeLength(v) {
  if (typeof v !== 'string') return null;
  const t = v.trim().toLowerCase();
  if (LENGTHS[t]) return t;
  for (const key of Object.keys(LENGTHS)) {
    if (t.startsWith(key)) return key;
  }
  return null;
}

function sanitizeText(v, max) {
  if (v == null) return '';
  const t = String(v).trim().replace(/\s+/g, ' ');
  return t.slice(0, max);
}

function validateGenerate(body) {
  const errors = [];
  const genre = normalizeGenre(body?.genre);
  const level = normalizeLevel(body?.level);
  const length = normalizeLength(body?.length);
  if (!genre) errors.push('invalid genre');
  if (!level) errors.push('invalid level');
  if (!length) errors.push('invalid length');
  const topic = sanitizeText(body?.topic, MAX_TOPIC);
  const lesson_focus = sanitizeText(body?.lesson_focus, MAX_FOCUS);
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { genre, level, length, topic, lesson_focus } };
}

function validateChat(body, chatHistoryLimit) {
  const errors = [];
  const message = sanitizeText(body?.message, MAX_MESSAGE);
  if (!message) errors.push('empty message');
  const story = typeof body?.story === 'string' ? body.story.slice(0, MAX_SNAPSHOT_CHARS) : '';
  if (!story.trim()) errors.push('missing story');
  const level = body?.level ? normalizeLevel(body.level) : null;
  const lesson_focus = sanitizeText(body?.lesson_focus, MAX_FOCUS);
  let history = Array.isArray(body?.history) ? body.history.slice(-(chatHistoryLimit || 12)) : [];
  history = history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
    .map((m) => ({ role: m.role, text: sanitizeText(m.text, MAX_MESSAGE) }))
    .filter((m) => m.text);
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { message, story, level, lesson_focus, history } };
}

function validateEvaluate(body, minMessages, minWords) {
  const errors = [];
  const story = typeof body?.story === 'string' ? body.story.slice(0, MAX_SNAPSHOT_CHARS) : '';
  if (!story.trim()) errors.push('missing story');
  const lesson_focus = sanitizeText(body?.lesson_focus, MAX_FOCUS);

  // Check if this is the targeted production quiz challenge
  if (Array.isArray(body?.answers)) {
    const answers = body.answers
      .filter((a) => a && typeof a === 'object')
      .map((a) => ({
        question: sanitizeText(a.question, 300),
        answer: sanitizeText(a.answer, MAX_MESSAGE),
        prompt_hint: sanitizeText(a.prompt_hint, 150),
      }))
      .filter((a) => a.answer.length > 0);

    const words = answers.map((a) => a.answer).join(' ').split(/\s+/).filter(Boolean).length;
    if (errors.length) return { ok: false, errors };
    if (answers.length === 0 || words < 5) {
      return {
        ok: true,
        value: { evaluable: false, story, lesson_focus, answers: [], words, usefulCount: answers.length },
      };
    }
    return { ok: true, value: { evaluable: true, story, lesson_focus, answers, words, usefulCount: answers.length } };
  }

  let userMessages = Array.isArray(body?.userMessages)
    ? body.userMessages.map((m) => sanitizeText(typeof m === 'string' ? m : m?.text, MAX_MESSAGE)).filter(Boolean)
    : [];
  // Linguistic content gate: ignore trivial "hi / thanks" messages.
  const useful = userMessages.filter((t) => t.replace(/[^a-zA-Z']/g, '').length >= 8);
  const words = useful.join(' ').split(/\s+/).filter(Boolean).length;
  if (errors.length) return { ok: false, errors };
  if (useful.length < (minMessages || 4) || words < (minWords || 40)) {
    return {
      ok: true,
      value: { evaluable: false, story, lesson_focus, usefulCount: useful.length, words },
    };
  }
  return { ok: true, value: { evaluable: true, story, lesson_focus, userMessages: useful } };
}

module.exports = {
  GENRES,
  LEVELS,
  LENGTHS,
  MAX_TOPIC,
  MAX_FOCUS,
  MAX_MESSAGE,
  normalizeGenre,
  normalizeLevel,
  normalizeLength,
  sanitizeText,
  validateGenerate,
  validateChat,
  validateEvaluate,
};
