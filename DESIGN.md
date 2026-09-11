---
name: EnglishAloud
description: A calm editorial reading room with an AI companion — warm ivory, navy ink, one red accent.
colors:
  ivory-ground: "#f4efe6"
  surface: "#fffdf8"
  surface-calm: "#faf6ec"
  rule-line: "#e4dac6"
  rule-soft: "#ede5d3"
  navy-ink: "#1c2a4a"
  ink-rise: "#33415e"
  muted: "#5c6478"
  faint: "#8a8fa0"
  aloud-red: "#c8102e"
  aloud-deep: "#a00d26"
  aloud-soft: "#fbe9e6"
  cover-coral: "#e0653a"
  good-green: "#2e7d4f"
typography:
  display:
    fontFamily: "Literata, Georgia, serif"
    fontSize: "clamp(2rem, 4.5vw, 2.9rem)"
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: "Literata, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.8
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 700
    letterSpacing: "0.08em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.navy-ink}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "16px 20px"
  button-primary-hover:
    backgroundColor: "{colors.aloud-deep}"
  genre-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-rise}"
    rounded: "{rounded.md}"
    padding: "14px 6px 12px"
  level-chip-active:
    backgroundColor: "{colors.navy-ink}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "9px 18px"
  field-light:
    backgroundColor: "#ffffff"
    textColor: "{colors.navy-ink}"
    rounded: "{rounded.md}"
    padding: "12px 15px"
---

# Design System: EnglishAloud

## Overview

**Creative North Star: "The Reading Room"**

EnglishAloud is a calm editorial reading room with an AI companion. Warm ivory grounds the app; white surfaces do the work; deep navy carries structure and text; one EnglishAloud red marks action and state. Serif (Literata) speaks everything the learner reads; quiet system sans operates everything they touch. Replaces the 2026 customs-desk world (dark ink chrome, stamp seals, route progress) per the brief-pinned Image-1 direction: top-nav minimal, Create / Reader + Ask AI / Evaluation / Library as one coherent product.

**Key Characteristics:**
- Ivory ground, white working surfaces, one red accent (Restrained).
- Literata for reading and headlines; system sans for UI.
- Drawn 1.7px-stroke SVG icon system; emoji never stands in for icons.
- Genre covers share one flat duotone SVG language (same aspect, radius, palette).
- State is accent + tabular numerals, never hue-per-meaning.

## Colors

Ivory owns the ground, white owns the work, navy owns structure, red owns action.

### Primary
- **Aloud Red** (#c8102e): primary state, selected genres, focus bars, score ring, focus rings. Deep (#a00d26) on hover. Soft wash (#fbe9e6) behind red-inked tags only.
- **Navy Ink** (#1c2a4a): top-nav active pill, primary Generate button, user chat bubbles, title ink. Rise (#33415e) for secondary text mass.

### Neutral
- **Ivory Ground** (#f4efe6): app background. Soft (#ece5d6) for secondary fills.
- **Surface** (#fffdf8): cards, sheets, panels. Calm (#faf6ec) for chat assistant messages and muted bands.
- **Rules** (#e4dac6 / #ede5d3): borders only; never text.
- **Muted** (#5c6478, body-secondary ≥4.5:1) and **Faint** (#8a8fa0, large/meta use) are navy-tinted, never gray.

### Named Rules
**The One Red Rule.** Red marks action and evaluated state. Scores render in ink; only the ring and the lesson-focus bar carry red.
**The Cover Language Rule.** All genre artwork uses the same flat duotone grammar (ivory sky, navy land, coral sun, ivory/coral motif). No mixed styles in one library.

## Typography

**Display:** Literata 700, clamp(2rem, 4.5vw, 2.9rem)/1.1, −0.02em, balanced.
**Reading body:** Literata 400, 1.125rem/1.8, measure capped at 68ch, user-resizable 14–26px.
**UI:** system sans; labels 700, 0.78rem, +0.08em uppercase; numerals tabular where counted.

### Named Rules
**The Exact Visa Rule (kept).** All six level chips share one size and scale; difficulty changes, the measure never decorates.
**The No-Eyebrow Rule (kept).** Headings carry their own weight; no kicker above any heading.

## Layout

Minimal sticky top nav (62px, blurred ivory): mark + wordmark, Create / Library pills, model chip, key pill. Content max 1200px. Three views, one active: Create (form card + sticky cover preview), Reader (story column ≤68ch + Ask AI panel 30–35% on desktop, bottom sheet on mobile), Library (search + genre filters + horizontal rows). Evaluation lives under the story: ring + scores + feedback, then mistakes vs recommendations columns. Print collapses to the story alone.

## Elevation & Depth

Depth is quiet: soft neutral shadows with offset and blur over the ivory ground; hairline rules define edges on white. No glow, no glass decoration, no colored halos.

### Shadow Vocabulary
- **Card lift** (`0 1px 2px rgba(28,42,74,.05), 0 12px 32px -16px rgba(28,42,74,.18)`): story sheet, eval card.
- **Card rest** (`0 1px 2px rgba(28,42,74,.06), 0 6px 18px -10px rgba(28,42,74,.16)`): form card, chat, library rows.

## Shapes

Cards 16px, controls 10–12px, chips pill, covers 16px frame / 10px thumbs with fixed aspects (4/5 preview, 16/7 reader hero, 4/3 thumbs).

## Components

### Buttons
- **Primary:** navy fill, white text; hover deepens to aloud-deep with 1px lift; disabled dims with label change.
- **Ask AI toggle:** navy pill; pressed state red. On mobile it opens the bottom sheet.
- **Tool buttons:** 38px white squares, ink glyphs; active inverts to navy.

### Create controls
- **Genre cards:** white, 1.5px rule, icon over label; active seals with red ring (inset + outset). Quiet hover lift.
- **Level chips:** pills; active is navy fill.
- **Length cards:** three tickets with word counts; active red ring.
- **Lesson Focus:** light field + quick-suggestion chips; hint line states the generation/evaluation contract.

### Reader
- **Badges:** small subtle pills (accent-ringed genre, navy-filled level, outlined rest).
- **Progress:** 3px red hairline with tabular percent; orientation only, never reward.
- **Selection toolbar:** navy floating bar (Explain / Translate / Say) following the selection; word click opens the vocabulary popover (definition via story context, Listen, Close).

### Evaluation
- **Score ring:** real-score SVG arc, serif numeral, verdict line. No confetti, no celebration.
- **Mistakes:** Original (struck, red) → Better (green, bold) + explanation + uppercase category tag; cards stack on mobile.
- **Gate:** Evaluate shows readiness (`n/4 messages`); insufficient conversation is never scored.

### Library
- Rows: fixed-ratio cover thumb, serif title, badge row, two-line excerpt, tabular score + verdict, date, Continue/Read-again CTA. Search + genre filter chips. Empty state names the next action.

## Do's and Don'ts

### Do:
- **Do** keep the reader chrome-free; assistance lives in tools and the Ask panel.
- **Do** draw icons as stroke SVGs in currentColor; every glyph ships in the file.
- **Do** theme browser surfaces from the palette: red selection, red focus rings, red caret, custom scrollbars, tabular numerals.
- **Do** honor reduced motion: view entrances, sheet, spinner all park.
- **Do** connect every number, badge, and suggestion to real story/chat/eval data.

### Don't:
- **Don't** add hue-per-level or hue-per-category schemes; state is accent + numerals.
- **Don't** nest cards inside cards; spacing and type separate.
- **Don't** put decoration around the reading body; illustration lives on covers, create, empty states.
- **Don't** use emoji as icons or gradient/glass text treatments.
- **Don't** animate layout properties; motion runs on transform and opacity (250–350ms drawers, 120–180ms hovers).
