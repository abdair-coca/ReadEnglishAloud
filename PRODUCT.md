# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: self-directed English learners, CEFR A1–C2, practicing reading on their own (desktop and mobile browsers). They pick a genre, level, and length, optionally add a topic, and read the generated story immediately.

## Product Purpose

EnglishAloud generates original English short stories tailored to the learner's level and interests, on demand. It exists so learners always have fresh, level-appropriate reading material without accounts, installs, or cost. Success means a learner can go from intent to reading a suitable story in seconds, and stay reading with assistance tools.

## Positioning

Infinitely fresh AI-generated stories adapted to CEFR level + genre + interests, versus static graded readers with a fixed catalog. Every generation is original; vocabulary and complexity adapt to the selected level.

## Operating Context

Self-study reading sessions in the browser: choose options in sidebar → Generate Story → read in reading area with toolbar (read aloud, highlight, copy, print, font size) → track progress via scroll bar. No login; Groq API key entered in UI (localStorage) or server env; works deployed on Vercel (`/api/generate` proxy) and standalone via direct Groq fallback when opened without backend.

## Capabilities and Constraints

Confirmed functionality: 8 genres (Adventure, Mystery, Sci-Fi, Fantasy, Slice of Life, Horror, Romance, Historical); 6 CEFR levels A1–C2; 3 lengths (~200 / ~500 / ~1000 words); optional custom topic; browser-native TTS; click-to-highlight words; copy, print-friendly view, font-size slider, reading progress bar; fully responsive.

Durable constraints (user-confirmed): keep it free, no accounts, no install; API key must never be hardcoded in the browser — frontend calls `/api/generate`, serverless function (`api/generate.js`) forwards to Groq with key from header or `GROQ_API_KEY` env. Current model: `openai/gpt-oss-20b` via Groq OpenAI-compatible chat completions.

Undecided: whether teacher/classroom use becomes a supported audience; any auth, history, or saved-story features (none today — do not assume them).

## Brand Commitments

Name: EnglishAloud. Voice: encouraging, simple, learner-friendly (EN UI with some ES strings in key field). Existing assets: single-file frontend `index.html`, dark violet/gold reading theme, Playfair Display + Lora + Inter via Google Fonts. Live URL: englishaloud.vercel.app.

## Evidence on Hand

Real implementation: `index.html` (entire frontend), `api/generate.js` (Vercel proxy to Groq), `docs/screenshots/` (home, story-view, mobile), `docs/assets/banner.svg`. No testimonials, customers, benchmarks, pricing, or press — do not fabricate any.

## Product Principles

1. Instant gratification: minimum steps from intent to reading.
2. Level-appropriateness over spectacle: the story must match the learner's CEFR level.
3. Zero friction: free, no account, no build, works in any modern browser.
4. Reading-first: assistance tools (TTS, highlight, print) serve comprehension, never distract from the text.
5. Key safety: user keys stay in their browser or server env, never in source.
