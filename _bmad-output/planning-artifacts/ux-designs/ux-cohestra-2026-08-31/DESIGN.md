---
name: Landing Product Cinema
description: Scroll-cinema treatment for the Cohestra marketing "Inside the workspace" product section. Visual identity inherits Midnight Atelier — cinema is an interaction delta, not a rebrand.
status: final
created: 2026-08-31
updated: 2026-09-01
theme:
  modes: [light]
  default: light
  note: Marketing cinema ships light-only; dark is out of scope for this surface.
sources:
  - {planning_artifacts}/ux-designs/ux-cohestra-2026-07-18/DESIGN.md
  - craft_reference: https://www.apple.com/sg/iphone-17-pro/ (scroll grammar only — pin, scrub, chapter-seek; do not copy hardware frame-sequence / product orbit)
  - imports/current-product-carousel-website-slide.png
inherits: {planning_artifacts}/ux-designs/ux-cohestra-2026-07-18/DESIGN.md
scope: Marketing home /#crm product cinema only — parent EXPERIENCE UJ-1…UJ-5 remain on ux-cohestra-2026-07-18.
colors:
  ink: '#070D12'
  ink-soft: '#141C24'
  paper: '#FAFBFC'
  paper-warm: '#F3F5F7'
  stone: '#8B939C'
  stone-cinema: '#5A636E'
  line: '#E6E9ED'
  line-strong: '#D0D5DB'
  lagoon: '#0B6B63'
  lagoon-deep: '#08554F'
  lagoon-fg: '#F3FFFC'
  gold: '#A68B5B'
  gold-cinema: '#6E5A32'
  gold-soft: '#F4EEE3'
  success: '#1F7A5C'
  warn: '#9A6700'
  danger: '#9B1C1C'
  primary: '#070D12'
  primary-foreground: '#FAFBFC'
  accent: '#0B6B63'
  accent-foreground: '#F3FFFC'
  canvas: '#FAFBFC'
  canvas-muted: '#F3F5F7'
  ink-muted: '#8B939C'
typography:
  display:
    fontFamily: 'Fraunces'
    fontSize: 48px
    fontWeight: '500'
    lineHeight: '1.08'
    letterSpacing: -0.03em
  display-sm:
    fontFamily: 'Fraunces'
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.15'
    letterSpacing: -0.025em
  marketing-display:
    fontFamily: 'Fraunces'
    fontSize: 64px
    fontWeight: '500'
    lineHeight: '1.02'
    letterSpacing: -0.035em
  marketing-section:
    fontFamily: 'Fraunces'
    fontSize: 'clamp(2rem, 4vw, 2.75rem)'
    fontWeight: '500'
    lineHeight: '1.1'
    letterSpacing: -0.03em
  marketing-lead:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 'clamp(1rem, 1.2vw + 0.75rem, 1.0625rem)'
    fontWeight: '400'
    lineHeight: '1.65'
  section:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: 0.12em
  body:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.35'
    letterSpacing: 0.06em
  chapter-title:
    fontFamily: 'Fraunces'
    fontSize: 'clamp(2rem, 4vw, 2.75rem)'
    fontWeight: '500'
    lineHeight: '1.1'
    letterSpacing: -0.03em
    note: Same ramp as marketing-section; chapter H3, not a new display face.
  chapter-lead:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 'clamp(1rem, 1.2vw + 0.75rem, 1.0625rem)'
    fontWeight: '400'
    lineHeight: '1.65'
  chapter-point:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 15.2px
    fontWeight: '400'
    lineHeight: '1.55'
    note: 'Current carousel 0.95rem — keep; do not shrink for cinema density.'
rounded:
  sm: 4px
  md: 10px
  lg: 16px
  xl: 24px
  full: 9999px
spacing:
  page-gutter: 32px
  section-y: 96px
  cinema-gutter-mobile: 20px
  cinema-gutter-sm: 32px
  cinema-gutter-lg: 40px
  cinema-section-y-mobile: 64px
  cinema-section-y-lg: 80px
  cinema-copy-visual-gap: 48px
  cinema-stage-min-h-lg: 520px
  cinema-chapter-scroll: 70vh
  cinema-pin-hysteresis: 0.03
  header-offset: 6rem
components:
  button-primary:
    background: '{colors.lagoon}'
    foreground: '{colors.lagoon-fg}'
    radius: '{rounded.md}'
    height: 48px
  browser-frame:
    radius: '{rounded.xl}'
    border: '1px solid {colors.line}'
    shadow: '0 40px 80px rgba(7, 13, 18, 0.14)'
    background: '{colors.paper}'
  cinema-stage:
    canvas: '{colors.paper-warm}'
    rule: '1px solid {colors.line}'
    max-width: 80rem
  chapter-pill-idle:
    background: '{colors.paper}'
    foreground: '{colors.stone-cinema}'
    border: '1px solid {colors.line-strong}'
    radius: '{rounded.full}'
    padding: '8px 16px'
  chapter-pill-sticky:
    position: sticky
    top: '{spacing.header-offset}'
    z-index: 20
    background: '{colors.paper-warm}'
    note: 'z below marketing header (z-30); visible entire pin'
  chapter-pill-active:
    background: '{colors.ink}'
    foreground: '{colors.paper}'
    border: '1px solid {colors.ink}'
    radius: '{rounded.full}'
    shadow: '0 8px 20px rgba(7, 13, 18, 0.12)'
  chapter-dot-idle:
    size: 6px
    hit-area: 24px
    color: '{colors.stone-cinema}'
    radius: '{rounded.full}'
    note: 'Visible glyph 6px; min hit 24×24 (WCAG 2.5.8) on CarouselChrome path'
  chapter-dot-active:
    width: 24px
    height: 6px
    hit-area: 24px
    color: '{colors.lagoon}'
    radius: '{rounded.full}'
  bullet-check:
    size: 20px
    background: 'rgba(11, 107, 99, 0.12)'
    foreground: '{colors.lagoon}'
  carousel-icon-button:
    size: 40px
    radius: '{rounded.md}'
    border: '1px solid {colors.line}'
    background: '{colors.paper}'
    foreground: '{colors.ink}'
  chapter-crossfade:
    properties: 'opacity, transform'
    duration: 400ms
    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
    from-translate-y: 12px
  climax-micro-beat:
    properties: transform
    scale: 1.02
    translate-y: 4px
    duration: 500ms
    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
    settle: 1
    note: 'SHIP — scrub-entry Reports→Website only; NOT on pill skip; skip under PRM'
  hairline-rule:
    color: '{colors.line}'
    thickness: 1px
---

# Landing Product Cinema — Design Spine

> **Midnight Atelier, in motion.** This file does not invent a brand. Color, type, radius, and the product frame inherit [ux-cohestra-2026-07-18/DESIGN.md](../ux-cohestra-2026-07-18/DESIGN.md). Cinema is how the existing "Inside the workspace" section *moves* on desktop — a designed chapter pin with scroll-progress seeking six product views. Spines win on conflict with mocks, the Apple craft reference, and the live carousel.

→ Key screens: [`mockups/desktop-cinema-clients.html`](./mockups/desktop-cinema-clients.html) · [`mockups/desktop-cinema-website.html`](./mockups/desktop-cinema-website.html) · [`mockups/mobile-carousel.html`](./mockups/mobile-carousel.html)

→ Behavioral contract: `./EXPERIENCE.md`  
→ Current visual (backup + Website chapter reference): `imports/current-product-carousel-website-slide.png`  
→ Live implementation today: `web/components/marketing/marketing-product-carousel.tsx`

## Brand & Style

Cohestra marketing already has a soul: a **private atelier for operators** — considered, calm, costly in the best way. The product cinema is that same desk, held still while the operator turns pages.

**What cinema adds:** a stable stage. The `{components.browser-frame}` is the object on the desk. Scroll does not fly the frame around the viewport and does not orbit a 3D product. Scroll *seeks chapters* — Clients, Follow-up, Dashboard, Campaigns, Reports, Website — the same six surfaces the team uses every week, shown as the existing React mocks.

**What cinema must not become:** a rebrand, a second palette, or an Apple hardware film. The [iPhone 17 Pro](https://www.apple.com/sg/iphone-17-pro/) page is a *grammar* reference only (pin, scrub, chapter-seek). It is not a visual reference. No titanium finishes, no frame-sequence product orbit, no video timeline dressed as UI.

**Craft principles (inherited, then applied to the stage)**

1. **Editorial type** — Fraunces for section and chapter titles; Plus Jakarta Sans for eyebrows, leads, and bullets.
2. **Restraint** — large quiet `{colors.paper-warm}` field; one product object; all current bullets remain visible (no cinema copy cut).
3. **Material** — hairline `{colors.line}` rules; **one** deep shadow, on the browser frame only.
4. **Gold as whisper** — `{colors.gold-cinema}` on the section eyebrow and chapter eyebrow. Not on pills, not as a climax wash.
5. **Lagoon as will** — check glyphs and the active progress dot. Not a new cinema accent.
6. **Real product** — Clients CRM, Follow-up, Dashboard, Campaigns, Reports, Website builder mocks already in the marketing package. No stock illustration, no abstract "product art."

Reject (cinema-specific, in addition to the parent spine): Apple product-film chrome, full-bleed video scrub, per-bullet stagger timelines, opacity-only tab swaps dressed as cinema, new gold/lagoon gradients, shrinking type to fit six chapters.

## Colors

No new brand palette. Tokens below are restated from Midnight Atelier so this workspace is self-contained; values must not drift.

| Token | Hex | Cinema use |
|-------|-----|------------|
| `{colors.ink}` | `#070D12` | Section title, chapter title, active chapter pill fill, body of bullets |
| `{colors.paper}` | `#FAFBFC` | Frame canvas, idle pill fill, chevron buttons |
| `{colors.paper-warm}` | `#F3F5F7` | Section canvas (`#crm`), sticky pill band |
| `{colors.stone}` | `#8B939C` | Inherited alias — **do not use for cinema body/seek text** |
| `{colors.stone-cinema}` | `#5A636E` | Leads + idle pill labels (**LOCKED** ≥4.5:1 on paper-warm) |
| `{colors.line}` | `#E6E9ED` | Section top rule, frame border |
| `{colors.line-strong}` | `#D0D5DB` | Idle pill border |
| `{colors.lagoon}` | `#0B6B63` | Bullet check, active chapter-dot |
| `{colors.gold}` | `#A68B5B` | Inherited alias — prefer `{colors.gold-cinema}` on `#crm` |
| `{colors.gold-cinema}` | `#6E5A32` | Section + chapter eyebrows (**LOCKED** ≥4.5:1 on paper-warm) |

**Not used as cinema decoration:** `{colors.gold-soft}` washes, lagoon fills behind the stage, ink scrims over the mock, or a dark "theater" backdrop. The section stays on `{colors.paper-warm}` like today's carousel.

Contrast (**LOCKED**): ink on paper for titles; `{colors.stone-cinema}` on paper-warm for leads/idle pills (≥4.5:1); `{colors.gold-cinema}` on paper-warm for eyebrows (≥4.5:1); idle dots use stone-cinema (≥3:1 non-text). Focus-visible: solid ink or lagoon ≥3:1 vs paper-warm, scroll-margin clears sticky header.

## Typography

Same pairing as the marketing shell. Cinema does not introduce a third family or a condensed "caption cinema" size that would force a copy cut.

| Token | Role on `#crm` |
|-------|----------------|
| `{typography.section}` | Eyebrows — uppercase, tracked, `{colors.gold-cinema}` |
| `{typography.marketing-section}` | Section H2: "One product, one platform, covers all your need" |
| `{typography.chapter-title}` | Chapter H3 (same ramp as marketing-section) |
| `{typography.marketing-lead}` / `{typography.chapter-lead}` | Section lead + chapter lead in `{colors.stone-cinema}` |
| `{typography.chapter-point}` | All four bullets per chapter — current 0.95rem, fully visible |
| `{typography.body}` | Fallback reading text |

Chapter titles stay Fraunces at the marketing-section ramp even when the stage is pinned. Do not drop to `{typography.display-sm}` to "make room for cinema." If a title wraps, it wraps — copy is not cut.

## Layout & Spacing

The section keeps today's marketing measure: `max-w-7xl`, gutters `{spacing.cinema-gutter-mobile}` / `{spacing.cinema-gutter-sm}` / `{spacing.cinema-gutter-lg}` (20 / 32 / 40px — current `px-5 sm:px-8 lg:px-10`). Vertical padding `{spacing.cinema-section-y-mobile}` → `{spacing.cinema-section-y-lg}` (64 → 80px).

**Desktop cinema (`lg+`, 1024px) LOCKED** — same `lg` as today's copy+visual grid. Below `lg`, cinema does not run; see EXPERIENCE.md Responsive.

Pinned anatomy (desktop only):

```
┌─────────────────────────────────────────────────────────┐
│  centered intro: eyebrow · H2 · lead  (scrolls away)    │
│  ┌─ sticky ChapterPills (under header, whole pin) ────┐ │
│  └────────────────────────────────────────────────────┘ │
│  ┌─ pinned stage ─────────────────────────────────────┐ │
│  │  ChapterCopy (left)     ProductFrame (right)       │ │
│  │  eyebrow · title ·      stable browser-frame       │ │
│  │  lead · 4 bullets       mock crossfades in place   │ │
│  └────────────────────────────────────────────────────┘ │
│  scroll track continues — progress seeks chapters 1→6   │
└─────────────────────────────────────────────────────────┘
```

- **Stable stage:** while pinned, the frame's viewport box does not translate, scale (except the Website climax micro-beat), or recede. Scroll maps to chapter index, not to the frame's Y position.
- **Seek chrome (LOCKED):** ChapterPills stick under the marketing header for the **entire pin** so seek/escape (incl. Website) never leaves the viewport. Intro (eyebrow/H2/lead) may scroll away; pills do not.
- **Copy column** stays left-aligned at `lg+`, as today. All four bullets remain in normal flow — no fade-up-per-line, no "one bullet at a time."
- **Pin track length LOCKED:** `{spacing.cinema-chapter-scroll}` = **70vh per chapter** × 6 equal ranges (420vh track) — short enough to avoid marathon pin, long enough to read. Pin stage `top` = `{spacing.header-offset}` (6rem); pin `z-index` below header.
- **Asymmetry inherited:** copy ~2.8fr, frame ~3.2fr. Do not center the frame as a hero-orbit.

Mobile / reduced-motion layout is the current carousel: stacked copy above visual, tablist, dots + chevrons. No sticky stage, no extra viewport of empty pin.

## Elevation & Depth

Almost flat, as the parent spine. The **only** cinematic object is `{components.browser-frame}`:

- Border `1px solid {colors.line}`
- Radius `{rounded.xl}` (24px) — cinema target. Today's mocks mix `18px` / `20px` chrome; **align cinema desktop frame to `{rounded.xl}`** so the stage reads as one object **[ASSUMPTION: visual unify, not a brand change]**.
- Shadow `0 40px 80px rgba(7, 13, 18, 0.14)` — the locked token. Do not stack a second shadow on pin. Do not increase opacity to "feel more Apple."

Chapter pills: idle = border only; active = ink fill + the existing `0 8px 20px rgba(7, 13, 18, 0.12)` (small, not competing with the frame). Chevron buttons may use the current 10px lift shadow on hover; they do not appear on the desktop cinema footer if dots+chevrons stay mobile-only (EXPERIENCE.md).

No glow, no lagoon ambient, no full-viewport dimmer while pinned.

## Shapes

- **Frame:** `{rounded.xl}` — the desk object.
- **Pills:** `{rounded.full}` — already the chapter nav; keep. This is navigation, not a "pill cluster" marketing anti-pattern: there are exactly six, one per chapter, same as today.
- **Chevrons / icon buttons:** `{rounded.md}` (10px).
- **Bullet checks:** `{rounded.full}` at 20px, lagoon tint — unchanged.
- Avoid new squircle "product tiles" around the mock; the mock *is* the frame.

## Components

Visual specs. Behavior lives in EXPERIENCE.md. Motion on this surface uses **`transform` and `opacity` only** (plus color on pills/dots). No `filter`, no layout (`top`/`height`) animation, no video scrub.

### SectionHeader

Centered intro on `{colors.paper-warm}`. Eyebrow `{typography.section}` + `{colors.gold}`: **Inside the workspace**. H2 `{typography.marketing-section}` + `{colors.ink}`. Lead `{typography.marketing-lead}` + `{colors.stone}`. Copy is locked — see EXPERIENCE.md chapter table.

### ChapterPills

Six `{components.chapter-pill-idle}` / `{components.chapter-pill-active}` buttons. Active = ink fill, paper label, small shadow. Idle = paper fill, stone label, line border. Hover on idle: 1px lift (`translateY(-2px)`), border toward ink — current treatment. Do not restyle as underline-tabs or as Apple's small chapter dots-as-primary-nav; **pills stay the seek UI**.

**Desktop cinema (LOCKED):** pills are sticky under the marketing header for the whole pin (`z-index` below header — see EXPERIENCE Accessibility). Background `{colors.paper-warm}` (or translucent paper-warm) so copy does not show through. Focus ring must clear the header.

### CinemaStage

The pinned pair: ChapterCopy + ProductFrame. Canvas `{colors.paper-warm}`. Minimum visual height `{spacing.cinema-stage-min-h-lg}` (520px) at `lg+`, matching today's `lg:min-h-[520px]`. The stage does not gain a card chrome of its own; the frame is the chrome.

→ Composition: [`mockups/desktop-cinema-clients.html`](./mockups/desktop-cinema-clients.html) · [`mockups/desktop-cinema-website.html`](./mockups/desktop-cinema-website.html)

### ChapterCopy

Eyebrow gold, title Fraunces, lead stone, then a four-item list. Each **BulletRow** uses `{components.bullet-check}` + `{typography.chapter-point}` in `ink/85`. **Every current bullet stays visible on every chapter** — no collapse, no "later bullets appear on further scrub," no reduced cinema caption.

Chapter change (motion-safe): `{components.chapter-crossfade}` — opacity 0→1 and `translateY(12px)→0`, 400ms, same easing as today's `.marketing-product-carousel-enter`. Copy and visual may share one crossfade; they must not stagger bullet-by-bullet.

### ProductFrame (BrowserFrame)

Hero object. `{components.browser-frame}`: radius xl, line border, locked shadow. Traffic-light chrome + path remain as in the existing React mocks (Clients CRM, Follow-up, Dashboard, Campaigns, Reports, Website builder). Inner mock swaps with the same crossfade as ChapterCopy. The frame box itself stays put.

**[ASSUMPTION]** Desktop cinema uses one shared chrome (radius xl + locked shadow) wrapping whichever mock is active, so chapter changes do not jump between 18px and 20px radii.

### ClimaxMicroBeat

**SHIP — one shot, Website / Pro, scrub-entry only (LOCKED).** Fire only when progress **scrubs** from Reports → Website. Do **not** fire on pill skip to Website. Frame eases to `scale(1.02)` + `translateY(-4px)` via `{components.climax-micro-beat}`, then settles to scale 1. Opacity stays 1. No gold flash, no lagoon ring, no bullet stagger. Reduced-motion / PRM: skip entirely.

### CarouselChrome (mobile + reduced-motion + rollback)

Preserve today's visual: tablist, copy+visual stack/grid, lagoon dots (`{components.chapter-dot-idle}` / `{components.chapter-dot-active}`), `{components.carousel-icon-button}` chevrons. This is not a lesser skin — it **is** the current MarketingProductCarousel. Desktop cinema must be able to fall back to this chrome without a restyle.

## Do's and Don'ts

**Do**

- Inherit Midnight Atelier. Restate tokens; do not drift hex or families.
- Keep `{components.browser-frame}` as the single elevated object.
- Animate with `transform` / `opacity` (and color on controls).
- Show all four bullets on every chapter, at current type size.
- Use the existing React product mocks as the real product view.
- Treat Apple's page as pin/scrub/seek grammar only.

**Don't**

- Add a cinema palette, dark theater canvas, or gold/lagoon gradients.
- Copy iPhone hardware frame-sequence, product orbit, or video-timeline scrub.
- Build True Apple (pixel-frame video) or Beat×6 (six micro-timelines / bullet stagger).
- Cut, fade, or postpone copy to make the pin "cinematic."
- Pin on mobile, or invent a long mobile sticky that traps scroll.
- Rebrand type, radius, or shadow language for this one section.
- Decorate the climax with anything heavier than a 2% scale / 4px lift on the frame.
