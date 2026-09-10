---
name: EnglishAloud
description: A customs desk that stamps entry sheets — level-adapted AI stories on warm paper.
colors:
  stamp-red: "#c8102e"
  stamp-deep: "#a00d26"
  stamp-on-ink: "#ff8fa3"
  passport-ink: "#1a2340"
  ink-abyss: "#0e1430"
  ink-rise: "#24304f"
  entry-paper: "#fbf8f0"
  paper-calm: "#f6f2e7"
  desk-sand: "#eae3d0"
  sand-line: "#d9cdae"
  ink-text: "#222a45"
  soft-warm: "#5f6053"
  paper-mist: "#f4f1e6"
  mist-soft: "#c6cddd"
typography:
  display:
    fontFamily: "Literata, Georgia, serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Literata, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.95
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 700
    letterSpacing: "0.14em"
rounded:
  sm: "8px"
  md: "10px"
  lg: "14px"
  pill: "20px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.stamp-red}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "14px 18px"
  button-primary-hover:
    backgroundColor: "{colors.stamp-deep}"
  stamp-tile:
    backgroundColor: "{colors.passport-ink}"
    textColor: "{colors.mist-soft}"
    rounded: "{rounded.md}"
    padding: "12px 6px 10px"
  visa-chip-active:
    backgroundColor: "{colors.paper-calm}"
    textColor: "{colors.passport-ink}"
    rounded: "{rounded.sm}"
    padding: "9px 4px"
  field-dark:
    backgroundColor: "{colors.ink-abyss}"
    textColor: "{colors.paper-mist}"
    rounded: "9px"
    padding: "10px 14px"
---

# Design System: EnglishAloud

## Overview

**Creative North Star: "The Customs Desk"**

Every story is a short journey. A deep-ink customs desk issues entry sheets: the visitor declares a destination (genre), shows a visa (CEFR level), states a stay duration (length), and receives a stamped sheet of warm paper to read. The desk owns the chrome and carries the ink; the sheet owns the reading and stays quiet. One entry-stamp red seals state across both surfaces, and state is always a physical mark — a seal, a foil visa, a flag where you stopped — never a rainbow of hues.

The system serves long reading first: generous measure, calm paper, assistance tools inline and silent. Density lives at the desk (many small controls, one shared scale); air lives on the sheet. Motion is a single signature — the sheet stamps itself in on arrival — plus honest state motion (loading, progress). No glow, no glass, no decoration that does not come from the travel-document world.

**Key Characteristics:**
- Ink chrome, paper reading field, one stamp-red accent (Restrained).
- Literata for everything the learner reads; system sans for everything they operate.
- Drawn stroke icon system; emoji never stands in for icons.
- State as physical mark: seals, foil, flags, perforation.

## Colors

Passport ink owns the chrome, warm paper owns the reading, and a single entry-stamp red seals state.

### Primary
- **Entry-Stamp Red** (#c8102e): the only accent. Primary action, active seals, focus rings, progress flag, drop cap. On dark ink it tints up to Stamp-on-Ink (#ff8fa3) for text.
- **Passport Ink** (#1a2340): header rail, desk panel, filled states, route fill. Abyss (#0e1430) sinks fields; Rise (#24304f) is the only desk hover surface.

### Neutral
- **Entry Paper** (#fbf8f0): the reading sheet. Calm (#f6f2e7) fills secondary bands; Desk Sand (#eae3d0) is the page ground; Sand Line (#d9cdae) rules borders and perforation.
- **Ink Text** (#222a45): body ink on paper. Soft Warm (#5f6053) is the secondary voice on paper, mixed warm so it never reads gray.
- **Paper Mist** (#f4f1e6): primary text on ink. Mist Soft (#c6cddd) is secondary on ink, tinted from the ink hue.

### Named Rules
**The One Seal Rule.** Stamp red seals state and the primary action only. It never washes a background, never decorates idle chrome, never repeats at two saturations on one screen.
**The Mark-Not-Hue Rule.** Selected, done, and resume states are physical marks (seal ring, foil fill, flag). New meanings never arrive as new colors.

## Typography

**Display Font:** Literata (with Georgia fallback)
**Body Font:** Literata (with Georgia fallback)
**Label Font:** system sans (system-ui stack)

**Character:** An e-reader voice for reading, a workhorse voice for operating. One serif carries title and story so the sheet feels like one document; the sans carries every control so the desk scans like an instrument.

### Hierarchy
- **Display** (700, 2rem/1.2, Literata): story title only. Shrinks to 1.55rem under 600px.
- **Body** (400, 1.125rem/1.95, Literata): story text, measure capped at 68ch. User-resizable 14–26px; the cap holds at every size.
- **Idle Headline** (700, 2.2rem/1.15, Literata): empty-state heading only.
- **Label** (700, 0.7rem, +0.14em tracking, uppercase, sans): desk group legends and seal chips.
- **Seal** (700, 0.7rem, +0.07em tracking, uppercase): entry metadata chips with tabular numerals.

### Named Rules
**The Exact Visa Rule.** All six level visas share one size, weight, and scale; difficulty changes, the measure never decorates.
**The No-Eyebrow Rule.** Headings carry their own weight. No kicker or eyebrow label sits above any heading.

## Layout

A customs rail (62px, sticky) spans the top; below it a two-column counter: desk (324px, sticky, internally scrolling) beside a centered sheet column (max 780px). The desk is the instrument panel — stamps, visas, tickets, fields stacked with perforation dividers; the sheet is the document — seal header, title, body, route footer. At 960px the desk unpins and stacks above the sheet; at 600px paddings compress and the title steps down. Print collapses to the sheet alone: rail, desk, tools, and route are hidden, ink goes near-black on white.

## Elevation & Depth

Depth is quiet paper elevation over a sand ground, plus one ink-foil inversion for the active visa. Shadows are neutral, offset, and soft — never colored halos, never decoration.

### Shadow Vocabulary
- **Sheet lift** (`box-shadow: 0 24px 55px -24px rgba(16, 20, 48, 0.45)`): the entry sheet and its idle/loading states.
- **Action rest** (`box-shadow: 0 10px 24px -14px rgba(0, 0, 0, 0.65)`): the primary stamp button at rest; deepens slightly on hover.
- **Foil visa** (`box-shadow: 0 4px 14px -6px rgba(0, 0, 0, 0.55)`): the active level chip, the one Ornamental inversion allowed.

### Named Rules
**The Neutral Light Rule.** Shadows are neutral and carry offset plus blur. Zero-offset colored halos are decoration, not depth.

## Shapes

Softly stamped rectangles: 8px for chips and small controls, 10–11px for tiles, tickets, buttons, and tools, 14px for the sheet, 20px for seal chips. Seals are the only circles (brand seal, status dot, press ring). Dashed rules mean travel documents: the seal header sits under a 2px dashed rule, duration tickets use dashed borders until selected, the route track is a dashed line the fill seals over. Perforation dot strips divide desk groups.

## Components

### Buttons
- **Shape:** stamped rectangles (11px primary, 10px tools).
- **Primary:** stamp red fill, white text, 14px vertical padding; hover deepens to stamp-deep with a 1px lift; disabled dims for loading with a label change, never a spinner swap.
- **Desk ghost:** transparent with ink-line border; hover brightens the border only.
- **Sheet tools:** 40px paper squares with ink glyphs; active inverts to ink fill with paper glyph (no underline stripe).

### Stamps (genre)
- **Style:** ink tiles with drawn 1.7px-stroke glyphs, label beneath. Hover lifts 1px and brightens the border.
- **State:** active seals with a stamp-red ring (inset + outset) and a red-tinted wash; the glyph warms to stamp-on-ink.

### Chips
- **Visas:** six identical chips; active is a paper foil (paper fill, ink text).
- **Seals:** metadata pills — red-ringed for genre, ink-filled for level, outlined for the rest; tabular numerals throughout.

### Cards / Containers
- **Entry sheet:** 14px paper container, sand-line border, sheet-lift shadow, dashed seal header, route footer.
- **Internal Padding:** 24–32px header, 34px/32px/46px body, 10–12px control bands.

### Inputs / Fields
- **Style:** abyss-ink fill, ink-line stroke, 9px radius, paper text, serif for topic, sans for the key.
- **Focus:** stamp-red border with a soft red ring. Key-with-value shows a green confirm border.
- **Error:** stamp-tinted banner with alert role; copy names the problem and the recovery.

### Navigation
- **Rail:** ink bar with seal brand, wordmark (paper, stamp-on-ink emphasis), desk tag, and a live status cluster (static green dot, provider name, tabular model chip). Sticky, with a 2px stamp rule beneath. No blur, no transparency.

### Signature: Route Progress
A dashed track with an ink fill driven by transform (never layout width), a stamp-red pennant at the fill head, tabular percent, and an "Entry logged" mark at 100%.

## Do's and Don'ts

### Do:
- **Do** keep the sheet light and the desk dark; the use scene (long reading, day and night) forces it.
- **Do** draw icons as 1.7px stroke SVGs in currentColor; every control glyph ships in the file.
- **Do** theme browser surfaces from the palette: stamp selection, stamp focus rings, ink caret, tabular numerals.
- **Do** honor reduced motion: the stamp-in, press ring, and transitions all park.
- **Do** print ink-on-white with chrome hidden.

### Don't:
- **Don't** add a second accent or a hue-per-level scheme; state is a mark, not a color.
- **Don't** put blur, glow, or gradient text anywhere; the old neon world is the anti-reference.
- **Don't** use emoji as icons or Playfair/Lora/Inter faces; the system replaced both deliberately.
- **Don't** animate layout properties; progress and motion run on transform and opacity.
- **Don't** let UI text drop below 11px; micro-labels are functional text.
