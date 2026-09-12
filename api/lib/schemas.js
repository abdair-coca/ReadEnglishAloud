'use strict';

// Lightweight shape validators for structured AI output (§§4, 15).
function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function clampScore(n) {
  const x = Math.round(Number(n));
  if (!Number.isFinite(x)) return null;
  return Math.min(100, Math.max(0, x));
}

function validateStoryJson(j, expected) {
  if (!j || typeof j !== 'object') return { ok: false, error: 'not-object' };
  if (!isNonEmptyString(j.title) || !isNonEmptyString(j.story)) {
    return { ok: false, error: 'missing title/story' };
  }
  const words = j.story.trim().split(/\s+/).length;
  if (words < 40) return { ok: false, error: 'story too short' };
  const out = {
    title: j.title.trim().slice(0, 160),
    story: j.story.trim(),
    level: expected?.level || (typeof j.level === 'string' ? j.level : ''),
    genre: expected?.genre || (typeof j.genre === 'string' ? j.genre : ''),
    estimated_words: Number.isFinite(Number(j.estimated_words)) ? Math.round(Number(j.estimated_words)) : words,
    lesson_focus: typeof j.lesson_focus === 'string' ? j.lesson_focus.slice(0, 80) : (expected?.lesson_focus || ''),
    focus_examples: Array.isArray(j.focus_examples)
      ? j.focus_examples
          .filter((e) => e && isNonEmptyString(e.text))
          .slice(0, 6)
          .map((e) => ({ text: String(e.text).slice(0, 400), reason: String(e.reason || '').slice(0, 300) }))
      : [],
    suggested_questions: Array.isArray(j.suggested_questions)
      ? j.suggested_questions.filter(isNonEmptyString).map((q) => String(q).slice(0, 240)).slice(0, 6)
      : [],
    quiz_questions: Array.isArray(j.quiz_questions) && j.quiz_questions.length > 0
      ? j.quiz_questions
          .filter((q) => q && isNonEmptyString(q.question))
          .slice(0, 3)
          .map((q, idx) => ({
            id: String(q.id || `q${idx + 1}`).slice(0, 10),
            question: String(q.question).slice(0, 300),
            prompt_hint: String(q.prompt_hint || '').slice(0, 150),
          }))
      : (Array.isArray(j.suggested_questions)
          ? j.suggested_questions.filter(isNonEmptyString).slice(0, 3).map((q, idx) => ({
              id: `q${idx + 1}`,
              question: String(q).slice(0, 300),
              prompt_hint: (expected?.lesson_focus || j.lesson_focus)
                ? `Answer using: ${expected?.lesson_focus || j.lesson_focus}`
                : 'Answer in a full sentence',
            }))
          : []),
  };
  return { ok: true, value: out, words };
}

const MISTAKE_CATS = ['grammar', 'vocabulary', 'comprehension', 'communication', 'lesson_focus'];

function validateEvalJson(j, lessonFocus) {
  if (!j || typeof j !== 'object') return { ok: false, error: 'not-object' };
  const score = clampScore(j.score);
  if (score === null) return { ok: false, error: 'bad score' };
  const s = j.scores && typeof j.scores === 'object' ? j.scores : {};
  const scores = {
    comprehension: clampScore(s.comprehension),
    grammar: clampScore(s.grammar),
    vocabulary: clampScore(s.vocabulary),
    communication: clampScore(s.communication),
  };
  if (Object.values(scores).some((v) => v === null)) return { ok: false, error: 'bad subscores' };
  if (lessonFocus) {
    scores.lesson_focus = clampScore(s.lesson_focus != null ? s.lesson_focus : s.grammar);
    if (scores.lesson_focus === null) return { ok: false, error: 'bad focus score' };
  }
  const mistakes = Array.isArray(j.mistakes)
    ? j.mistakes
        .filter((m) => m && isNonEmptyString(m.original) && isNonEmptyString(m.correction))
        .slice(0, 12)
        .map((m) => ({
          original: String(m.original).slice(0, 300),
          correction: String(m.correction).slice(0, 300),
          category: MISTAKE_CATS.includes(m.category) ? m.category : 'grammar',
          explanation: String(m.explanation || '').slice(0, 500),
          severity: ['low', 'medium', 'high'].includes(m.severity) ? m.severity : 'medium',
        }))
    : [];
  return {
    ok: true,
    value: {
      score,
      scores,
      summary: String(j.summary || '').slice(0, 1200),
      strengths: Array.isArray(j.strengths) ? j.strengths.filter(isNonEmptyString).map((x) => String(x).slice(0, 300)).slice(0, 6) : [],
      mistakes,
      recommendations: Array.isArray(j.recommendations)
        ? j.recommendations.filter(isNonEmptyString).map((x) => String(x).slice(0, 300)).slice(0, 6)
        : [],
      answers_feedback: Array.isArray(j.answers_feedback)
        ? j.answers_feedback
            .filter((a) => a && typeof a === 'object')
            .slice(0, 6)
            .map((a, i) => ({
              question_index: Number.isFinite(a.question_index) ? a.question_index : i,
              target_used_correctly: Boolean(a.target_used_correctly),
              comprehension_accurate: Boolean(a.comprehension_accurate),
              original: String(a.original || '').slice(0, 300),
              correction: String(a.correction || '').slice(0, 300),
              feedback: String(a.feedback || '').slice(0, 500),
            }))
        : [],
      lesson_focus_feedback: lessonFocus
        ? {
            focus: lessonFocus,
            score: scores.lesson_focus,
            feedback: String(j.lesson_focus_feedback?.feedback || '').slice(0, 1200),
            examples: Array.isArray(j.lesson_focus_feedback?.examples)
              ? j.lesson_focus_feedback.examples.filter(isNonEmptyString).map((x) => String(x).slice(0, 300)).slice(0, 6)
              : [],
          }
        : null,
    },
  };
}

module.exports = { validateStoryJson, validateEvalJson, clampScore };
