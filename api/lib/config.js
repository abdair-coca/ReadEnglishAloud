'use strict';

// Central AI provider config. Env overrides allowed, no secrets here.
const CONFIG = {
  model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
  temperatures: {
    story: 0.7,
    chat: 0.5,
    evaluation: 0.1,
  },
  maxTokens: {
    story: 2048,
    chat: 1024,
    evaluation: 2048,
  },
  timeoutsMs: {
    story: 30000,
    chat: 20000,
    evaluation: 40000,
  },
  chatHistoryLimit: 12,
  // Evaluation gate (§16)
  evalMinUserMessages: 4,
  evalMinUserWords: 40,
  // Rubric weights (§11). Sum = 1.
  rubric: {
    base: { comprehension: 0.35, grammar: 0.25, vocabulary: 0.2, communication: 0.2 },
    withFocus: { comprehension: 0.3, grammar: 0.2, vocabulary: 0.15, communication: 0.15, lesson_focus: 0.2 },
  },
};

module.exports = { CONFIG };
