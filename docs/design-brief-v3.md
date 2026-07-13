# Design Brief — Redesign v3 "Signal Field"

Date: 2026-07-13 · Branch: `redesign/v3-signal-field` · Status: draft, built autonomously per owner's request; owner review pending.

## Thesis

The site opens *inside the problem* — a dark field of unranked documents drifting
in noise — and a query brings order: particles rank themselves into a column.
That one moment demonstrates the profession (search relevance) instead of
describing it. Everything after it is quiet, warm, and evidence-first.

## Tokens

### Color (OKLCH; light body, dark hero — structural, not a theme toggle)

| Token | Value | Role |
|---|---|---|
| `--void` | `oklch(0.17 0.025 275)` | Hero field (deep indigo-ink, not pure black) |
| `--void-soft` | `oklch(0.24 0.03 275)` | Hero surface variations |
| `--signal` | `oklch(0.80 0.14 78)` | Amber accent on dark (ranked docs, query caret) |
| `--signal-deep` | `oklch(0.52 0.11 70)` | Amber accent on light (links, marks) |
| `--paper` | `oklch(0.965 0.008 80)` | Body background (amber-tinted warm neutral) |
| `--ink` | `oklch(0.26 0.018 275)` | Body text (indigo-tinted, no pure black) |
| `--muted` | `oklch(0.47 0.02 275)` | Secondary text |
| `--hairline` | `oklch(0.88 0.012 80)` | Borders (used sparingly, ≤1px) |

60-30-10: paper/void 60, ink/muted 30, amber 10 (rare on the light body).

### Type

| Role | Face | Why |
|---|---|---|
| Display | **Bricolage Grotesque** (self-hosted variable woff2) | Characterful grotesque with a hand-made quirk — "curious, rigorous, hands-on"; not a reflex default |
| Body | **Literata** (self-hosted variable woff2) | Bookish reading serif built for long-form evidence; warm against amber-tinted paper |
| Data/labels | **Spline Sans Mono** (self-hosted) | Instrument markings: eyebrows, relevance scores, stack chips, the query bar |

Scale: 1.333 ratio, 5 steps; display sizes fluid via clamp(); body fixed 17px/1.65.

### Layout

Asymmetric, left-anchored, max content width 1120px, 4pt spacing scale.

```
┌─────────────────────────────────────────────┐
│  ███ WEBGL RANKING FIELD (100vh, --void) ███ │  ← noise → ranked column
│  Jiaying Li                    ····•···      │
│  display headline, left        ···•·•··      │
│  [ query bar — interactive ]   ··•••··       │
└──────────────── fade to paper ──────────────┘
│  What I own          (2-col asymmetric list) │
│  Selected work       (SMA as an investigation:│
│                       Question → Approach →   │
│                       Evidence, real shots)   │
│  The lab             (side projects as ranked │
│                       lab notes: rank № +     │
│                       "rel" score + stack)    │
│  Colophon            (how this site is built: │
│                       directed AI agents)     │
└─────────────────────────────────────────────┘
```

### Signature

**The Ranking Field.** ~600 instanced particles (three.js, vendored, lazy-loaded)
drift in curl noise. On load a domain-true query auto-types ("what moved ndcg
last tuesday?"); particles converge into a ranked column, top-k glowing amber
with visible rank order. The visitor can type their own query — a deterministic
hash-based scorer re-ranks the field, so every query produces a different
arrangement. Boldness lives here; the rest of the page stays disciplined.

Fallbacks: `prefers-reduced-motion` → field renders pre-ranked, no drift, no
typing animation. No WebGL → designed CSS/SVG static composition of ranked dots.
JS still loads content; canvas is progressive enhancement only.

### Structural device — justified numbering

Projects in "The lab" carry rank numbers and mock relevance scores
(`01 · rel 0.97`). Numbered markers are usually template noise; here ranking is
literally the subject and the order is a real editorial judgment ("my work,
ranked"). This is the one place structure gets to wink.

## Anti-default check (frontend-design pass 2)

- Current live site = broadsheet default #3 (hairlines + cobalt) → replaced.
- v2 was cream+terracotta default #1 → paper body risks adjacency; differentiated
  by grotesque display (not serif display), amber (not terracotta), mono
  instrument layer, and the investigation ledger structure.
- Dark hero + single accent risks default #2 adjacency; differentiated because
  the dark region is an earned visualization field (WebGL scene), majority of the
  page is light, and amber-on-indigo is a warm/cool complement, not neon-on-black.
- Fonts: reflex list rejected (previous site used IBM Plex Sans + Source Serif —
  both on the ban list; replaced).
- Bans respected: no side-stripe borders, no gradient text, no glassmorphism,
  no hero-metric template, no identical card grids.

## Content plan

Keep the July-9 copy voice (it is recent and strong). New: "The lab" section for
vibe-coded side projects (inventory from agent-memory, curated for public safety),
and an honest colophon about AI-directed development. All claims keep links to
demos/source (design principle 3).

## Quality floor

Responsive to 360px; keyboard focus visible; WCAG AA contrast on all text
(amber-on-void used only for ≥3:1 large/graphic elements, checked); reduced
motion composed, not disabled; Lighthouse-style perf: three.js dynamically
imported after first paint, fonts `font-display: swap`, canvas capped at DPR 2.
