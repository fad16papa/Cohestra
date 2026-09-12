---
name: Live Proof Cinema
description: Marketing landing #crm product stage — live Cohestra UI with MarketingDemoClub seed, feeling-led copy, Apple-clean Cohestra identity (no chapter pedagogy).
status: final
created: 2026-09-01
updated: 2026-09-03
theme:
  modes: [light]
  default: light
  note: Marketing cinema ships light-only; dark is out of scope for this surface.
sources:
  - {planning_artifacts}/ux-designs/ux-cohestra-2026-09-01/imports/brainstorm-intent-live-proof-cinema.md
  - {planning_artifacts}/ux-designs/ux-cohestra-2026-09-01/imports/brainstorm-intent-cinema-product-fidelity-2026-09-03.md
  - {planning_artifacts}/ux-designs/ux-cohestra-2026-09-01/imports/fidelity-screenshots-2026-09-03/
  - {planning_artifacts}/ux-designs/ux-cohestra-2026-07-18/DESIGN.md
  - {planning_artifacts}/ux-designs/ux-cohestra-2026-09-01/imports/craft-apple-iphone-17-pro-sg.md
  - {planning_artifacts}/ux-designs/ux-cohestra-2026-09-01/imports/craft-tally-so.md
  - {planning_artifacts}/ux-designs/ux-cohestra-2026-09-01/imports/website-chapter-hollow-mock.png
  - {planning_artifacts}/ux-designs/ux-cohestra-2026-08-31/EXPERIENCE.md
  - craft_reference: https://www.apple.com/sg/iphone-17-pro/ (pin/seek/feeling grammar only — not hardware theater)
  - craft_reference: https://tally.so/ (human thesis, job-shaped sections, product-as-proof — do not become Tally)
inherits: {planning_artifacts}/ux-designs/ux-cohestra-2026-07-18/DESIGN.md
scope: Marketing home /#crm Live Proof Cinema only. Parent UJ-1…UJ-5 remain on ux-cohestra-2026-07-18 EXPERIENCE. Prior cinema ux-cohestra-2026-08-31 is superseded for chapter/mock cinema; pin/a11y mechanics may be referenced, chapter chrome must not.
design: ./DESIGN.md
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
  public-hero:
    fontFamily: 'Fraunces'
    fontSize: 36px
    fontWeight: '500'
    lineHeight: '1.12'
    letterSpacing: -0.03em
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
  feeling-title:
    fontFamily: 'Fraunces'
    fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)'
    fontWeight: '500'
    lineHeight: '1.12'
    letterSpacing: -0.03em
    note: Feeling line (H3). Same Fraunces soul as marketing-section; slightly quieter so the live stage remains the object.
  feeling-scene:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 'clamp(1rem, 1.1vw + 0.75rem, 1.0625rem)'
    fontWeight: '400'
    lineHeight: '1.6'
  outcome-line:
    fontFamily: 'Plus Jakarta Sans'
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.55'
    note: Max three felt outcomes. Not a feature checklist. No lagoon check glyphs.
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
  cinema-copy-visual-gap: 32px
  cinema-stage-min-h-lg: 520px
  cinema-stage-span: 68%
  cinema-copy-span: 32%
  cinema-surface-scroll: 70vh
  header-offset: 6rem
components:
  button-primary:
    background: '{colors.lagoon}'
    foreground: '{colors.lagoon-fg}'
    radius: '{rounded.md}'
    height: 48px
  button-secondary:
    background: 'transparent'
    foreground: '{colors.ink}'
    border: '1px solid {colors.line-strong}'
    radius: '{rounded.md}'
  section-header:
    align: center
    canvas: '{colors.paper-warm}'
    eyebrow: omit
    title: '{colors.ink}'
    lead: '{colors.stone-cinema}'
  seek-pill-idle:
    background: '{colors.paper}'
    foreground: '{colors.stone-cinema}'
    border: '1px solid {colors.line-strong}'
    radius: '{rounded.full}'
    padding: '8px 16px'
  seek-pill-sticky:
    flex: 0 0 auto
    background: '{colors.paper-warm}'
    note: 'LOCKED (C1): NOT independently sticky. shrink-0 row INSIDE cinema-stage sticky chrome. Never position:sticky at top: 6rem. FORBID two stickies both at top: 6rem.'
  seek-pill-active:
    background: '{colors.ink}'
    foreground: '{colors.paper}'
    border: '1px solid {colors.ink}'
    radius: '{rounded.full}'
    shadow: '0 8px 20px rgba(7, 13, 18, 0.12)'
  seek-pill-hover:
    translate-y: -2px
    reduced-motion: none
    note: 'LOCKED (M + H4): Motion-safe idle hover lift only. PRM kills hover-lift. Hover never inks a pill — ink follows aria-selected / progress only; focus is ring only.'
  ink-progress:
    height: 2px
    color: '{colors.ink}'
    track: '{colors.line}'
    aria-hidden: true
    role: none
    note: 'LOCKED (A7 + M): SHIP thin 2px ink under SeekPills as an aria-hidden presentational div — not a progressbar / slider. Progress is selected pill first; bar is a whisper. Optional to omit only if QA reads it as chapter chrome.'
  cinema-stage:
    canvas: '{colors.paper-warm}'
    rule: '1px solid {colors.line}'
    max-width: 90rem
    stage-span: '{spacing.cinema-stage-span}'
    copy-span: '{spacing.cinema-copy-span}'
    hysteresis: 0.03
    sticky:
      position: sticky
      top: '{spacing.header-offset}'
      z-index: 20
      height: 'calc(100vh - {spacing.header-offset})'
    note: 'LOCKED (C1 + M): ONE sticky cinema chrome under header (top = header-offset, z-20 below header z-30). SeekPills shrink-0 INSIDE. FeelingCopy + ProductFrame fill the rest. FORBID two stickies both at top: 6rem. Hysteresis 3% of a surface range lives here, not in spacing.'
  product-frame:
    radius: '{rounded.xl}'
    border: '1px solid {colors.line}'
    shadow: '0 40px 80px rgba(7, 13, 18, 0.14)'
    background: '{colors.paper}'
    chrome: thin-cohestra-window
    pointer-events: none
    inner-scroll: none
    a11y: 'aria-hidden + inert on ProductFrame only'
    note: 'LOCKED (A1 + C2 + H1 + H2): Thin Cohestra window. Preview, not operable desk. aria-hidden + inert on this frame ONLY. No inner scroll — cinematic crop/mask; page scroll owns the wheel. FeelingCopy is the tabpanel.'
  cinematic-mask:
    overflow: hidden
    radius: 'inherit'
    inner-scroll: none
    note: 'LOCKED (H2): Crops dense live admin bodies to a stage crop. Still live DOM — not a screenshot, not a second mock system. No inner scroll. Do not share overflow:hidden with FeelingCopy.'
  feeling-copy:
    feeling: '{colors.gold-cinema}'
    title: '{colors.ink}'
    scene: '{colors.stone-cinema}'
    outcome: '{colors.ink}'
    role: tabpanel
    note: 'LOCKED (C2): FeelingCopy IS the stable tabpanel (id stable, aria-labelledby active tab). Never aria-hidden / inert. Never overflow:hidden shared with the mask. No opacity on feeling/scene.'
  feeling-crossfade:
    properties: 'opacity, transform'
    duration: 400ms
    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
    from-translate-y: 12px
    reduced-motion: none
    note: 'LOCKED (M): Motion-safe only. PRM kills this crossfade and pill hover-lift.'
  climax-micro-beat:
    properties: transform
    scale: 1.02
    translate-y: -4px
    duration: 500ms
    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
    settle: 1
    reduced-motion: none
    note: 'LOCKED (A2 + M): Follow-up connection micro-beat on scrub-entry Clients→Follow-up only; NOT on pill skip; skip under PRM. Signed translateY(-4px) lift. Website is pride epilogue — no scale beat.'
  seek-dot-idle:
    size: 6px
    hit-area: 24px
    color: '{colors.stone-cinema}'
    radius: '{rounded.full}'
    note: CarouselChrome path only (mobile / PRM). Visible glyph 6px; min hit 24×24.
  seek-dot-active:
    width: 24px
    height: 6px
    hit-area: 24px
    color: '{colors.lagoon}'
    radius: '{rounded.full}'
  carousel-icon-button:
    size: 40px
    radius: '{rounded.md}'
    border: '1px solid {colors.line}'
    background: '{colors.paper}'
    foreground: '{colors.ink}'
  live-region:
    vis: sr-only
    politeness: polite
    atomic: true
    string: '{navLabel}. {job sentence}.'
  hairline-rule:
    color: '{colors.line}'
    thickness: 1px
---

# Live Proof Cinema — Design Spine

> **Midnight Atelier, live.** This file does not invent a brand. Color, type, radius, and material inherit [ux-cohestra-2026-07-18/DESIGN.md](../ux-cohestra-2026-07-18/DESIGN.md). Cinema contrast tokens `{colors.stone-cinema}` / `{colors.gold-cinema}` are the only additions — they exist so leads, eyebrows, and idle seek labels meet AA on `{colors.paper-warm}`. Live Proof Cinema is how `/#crm` *proves* the product: real Cohestra UI, MarketingDemoClub seed, feeling copy. Spines win on conflict with mocks, the Apple craft reference, Tally craft notes, and the live implementation.

→ Behavioral contract: `./EXPERIENCE.md`  
→ Intent (primary): [`imports/brainstorm-intent-live-proof-cinema.md`](./imports/brainstorm-intent-live-proof-cinema.md)  
→ Craft: [`imports/craft-apple-iphone-17-pro-sg.md`](./imports/craft-apple-iphone-17-pro-sg.md) · [`imports/craft-tally-so.md`](./imports/craft-tally-so.md)  
→ Anti-pattern (**do not ship**): [`imports/website-chapter-hollow-mock.png`](./imports/website-chapter-hollow-mock.png) — sparse Website chapter with chapter chrome  
→ Key screens: [`mockups/desktop-cinema-clients.html`](./mockups/desktop-cinema-clients.html) · [`mockups/desktop-cinema-followup.html`](./mockups/desktop-cinema-followup.html) · [`mockups/mobile-carousel.html`](./mockups/mobile-carousel.html) — **spines win on conflict**  
 
→ Pin / a11y mechanics reference (chapter/mock cinema **superseded**): [../ux-cohestra-2026-08-31/EXPERIENCE.md](../ux-cohestra-2026-08-31/EXPERIENCE.md)  
→ File today (chapter chrome to kill): `web/components/marketing/marketing-product-cinema.tsx`

## Brand & Style

Cohestra is a **private atelier for operators** — considered, calm, costly in the best way. Live Proof Cinema is that same desk, with the real tool open on it.

**North star:** Mount the real Cohestra UI with MarketingDemoClub seed and feeling copy so a visitor hires certainty — this is the tool for their club — not a marketing carousel.

**Soul:** Gathered clarity. Ink, lagoon, warm paper, Fraunces. People with names. Sunday clinic still on the list on Monday. Not black/white hardware theater, not San Francisco coldness, not neon SaaS confetti.

**Override (LOCKED):** Intent said Fraunces/Sora. Spines win — **Plus Jakarta Sans is the instrument face.** No Sora. No San Francisco. No third family.

**What cinema borrows (grammar, not identity)**

- From [iPhone 17 Pro (SG)](https://www.apple.com/sg/iphone-17-pro/): sticky facet pills without chapter numbers; the hero object owns the viewport; short benefit copy; the same story on mobile; quiet awe. Not titanium, not product orbit, not a frame-sequence film. Notes: [`imports/craft-apple-iphone-17-pro-sg.md`](./imports/craft-apple-iphone-17-pro-sg.md).
- From [Tally.so](https://tally.so/): a human thesis before taxonomy; job-shaped rooms; the real product mechanic as proof; low visual noise; a frictionless try. Do not become Tally — Cohestra stays warm paper and editorial type, not a typing-canvas twin. Notes: [`imports/craft-tally-so.md`](./imports/craft-tally-so.md).

**What cinema must not become**

- A second design language wrapping a fake UI.
- Chapter pedagogy (`chapterNumber`, “Chapter N of 6”, watermarks, “Scroll to continue”) — still shipping in Admin’s 2026-09-03 screenshots is a **P0 defect**, not taste.
- Sparse orphaned mounts / postcard fragments without ProductFrame chrome — see [`imports/fidelity-screenshots-2026-09-03/`](./imports/fidelity-screenshots-2026-09-03/) (**do not ship**).
- `ShowcaseBrowserChrome` authenticity theater (fake Mac traffic-light dots as the trust signal). **Cohestra tenant URL chrome is allowed** (F2) — that is product-true, not Mac theater.
- A hollow Website mock / empty section rails / PRO chip theater / mint-gradient hero — see [`imports/website-chapter-hollow-mock.png`](./imports/website-chapter-hollow-mock.png) and [`imports/fidelity-screenshots-2026-09-03/06-website.png`](./imports/fidelity-screenshots-2026-09-03/06-website.png) (**do not ship**).
- Feature-checklist bullets / checkmark pill stacks or CRM-generic capability lists.
- Initials-only pastel avatar kits as the only people signal; anonymous “Acme”; “Your account.”
- Two stickies both at `top: 6rem`; `aria-hidden`/`inert` on the whole CinemaStage; inner scroll inside ProductFrame; CSS `transform: scale` of live roots.

**Craft principles**

1. **Editorial type** — Fraunces for thesis and feeling lines; **Plus Jakarta Sans** for instruments. **No Sora.** Do not swap in a third family (no San Francisco).
2. **Restraint** — large quiet `{colors.paper-warm}` field; one inhabited stage; copy answers a fear, then stops. Three felt outcome lines max.
3. **Material** — hairline `{colors.line}` rules; **one** deep shadow, on `{components.product-frame}` only.
4. **Gold as whisper** — `{colors.gold-cinema}` on the feeling word (section eyebrow omitted — A6). Not on pills, not as a climax wash. No opacity / `/60` on feeling or scene.
5. **Lagoon as will** — earned action is the **post-cinema CTA only (H1)**. WhatsApp / Publish pixels may appear in the ProductFrame **preview** (login-true crop) but they are not operable will — `pointer-events: none`, no hover/active affordance leak. Not decorative checks on marketing copy.
6. **Live product** — presentational bodies of Clients, Follow-up, Dashboard, Campaigns, Reports, Website, fed by one MarketingDemoClub JSON, themed for cinema contrast (**H3**). Recurring cast (Elena, Jordan, Sunday clinic, board games night) across rooms. No parallel mock design system.

Reject (in addition to the parent spine): Apple product-film chrome, chapter numbers, fake browser dots, hollow Website studio rails, per-bullet stagger, opacity-only tab swaps dressed as cinema, new gold/lagoon gradients, shrinking type to “make room for cinema,” dual-sticky anatomy, inert-on-whole-stage, inner-scroll in the frame, CSS-scale of live roots.

## Reviewer Gate locks

Admin: decide for me. C1 / C2 / H1–H6 / M / **F1–F7** are **LOCKED**. A1–A7 remain (A1 **refined by F2**). Extractors cite these ids; do not revive the exploded dual-sticky anatomy or sparse postcard mounts.

| ID | Lock |
|----|------|
| C1 | **One** sticky cinema chrome under header (`top` = `{spacing.header-offset}`, `z-20` below header `z-30`, height `calc(100vh − 6rem)`). SeekPills are `shrink-0` **inside** that sticky. FeelingCopy + ProductFrame fill the rest. **FORBID** two stickies both at `top: 6rem`. |
| C2 | `aria-hidden` + `inert` on **ProductFrame only**. FeelingCopy **is** the stable `tabpanel` (stable id, `aria-labelledby` active tab). Pills `aria-controls` that id. |
| H1 | Frame is **preview**, not an operable desk: `pointer-events: none`; no hover/active affordance leak from admin buttons; will = post-cinema CTA only. Optional walkthrough caption OK. **Paint** selected/hover/focus states statically so the crop looks inhabited (F5) — paint ≠ operable. |
| H2 | **No inner scroll** in ProductFrame — cinematic crop/mask only; page scroll owns the wheel. |
| H3 | DemoClub presentational theme: secondary text uses `{colors.stone-cinema}` / `{colors.ink}` (≥4.5:1); **never** raw `{colors.stone}` on paper-warm in cinema mounts. |
| H4 | Dual-state pills: `aria-selected` ⇔ progress ⇔ ink; focus ⇔ ring only; Tab-in/blur resyncs roving `tabIndex` to selected. |
| H5 | Hash `#crm`: intercept click + same-hash; always `resetToClients` + `scroll-mt`; do **not** move focus unless cinema chrome that held focus unmounted. |
| H6 | Mobile: **no** CSS `transform: scale` of live roots; reflow/crop; wrap pills below `sm` (or peek + chevrons); never swipe-only to Website. |
| M | Climax `translateY(-4px)` signed consistently; section-header `eyebrow: omit`; hysteresis under `{components.cinema-stage.hysteresis}` not spacing; InkProgress = `aria-hidden` presentational div; live region `{navLabel}. {job sentence}.`; PRM kills hover-lift/crossfade; iframe last resort with `inert` + `tabindex=-1` or omit pill; tablist `aria-label="Product surfaces"`. |
| F1 | **Visual fidelity is an AC.** If Admin reads `/#crm` as improvised mock / cheap postcard, the story fails even when DemoClub invariants pass. Source: [`imports/brainstorm-intent-cinema-product-fidelity-2026-09-03.md`](./imports/brainstorm-intent-cinema-product-fidelity-2026-09-03.md). |
| F2 | **ProductFrame = Cohestra product window with tenant URL chrome.** Shipping chrome includes a thin app/URL strip showing `riverside-rec.cohestra.app/{path}` for the active room. **Still forbid** Mac traffic-light dots and `ShowcaseBrowserChrome`. A1 “no fake URL bar” means **no fake Mac URL theater** — product-true Cohestra host chrome is required. |
| F3 | **Kill chapter pedagogy completely** — no large `01`/`06` watermarks, no “CHAPTER N OF 6”, no “SCROLL TO CONTINUE”, no taxonomy eyebrows (“01 CLIENT CRM”). Feeling titles only. |
| F4 | **Admin-parity density (cinema-dense tokens).** Do not reuse empty-state spacing. Per-room minimums live in EXPERIENCE.md Data & Mount. “Omit hollow UI” means omit fake chrome / inventing rails — **not** sparse atmosphere. |
| F5 | **Inhabited people + painted selection.** Seed local synthetic portraits for Elena/Sam/Jordan/Priya (or omit people surfaces until portraits exist). Paint selected Elena row (lagoon ring) and static hover/focus affordances inside the inert crop. |
| F6 | **Website imagery gate.** Local community hero at `/public/demo/riverside-hero.webp` (or equivalent committed asset). **Omit Website pill until hero photo exists.** Mint/soft AI gradient heroes are forbidden. |
| F7 | **Elevation hierarchy.** Stage / frame / panel / chip — frame stays the single deep shadow; panels use hairline + quiet lift; chips sit flat. Stage backdrop may read slightly deeper/warmer than the brighter product window. |

## Colors

No new brand palette. Tokens below are restated from Midnight Atelier so this workspace is self-contained; values must not drift. The only cinema-specific colors are the two contrast tokens already proven on the prior cinema surface.

| Token | Hex | Cinema use |
|-------|-----|------------|
| `{colors.ink}` | `#070D12` | Section thesis, feeling title, selected seek pill fill, outcome lines; DemoClub secondary when stone-cinema is not enough |
| `{colors.paper}` | `#FAFBFC` | Frame canvas, idle pill fill, chevron buttons |
| `{colors.paper-warm}` | `#F3F5F7` | Section canvas (`#crm`), sticky cinema-chrome band |
| `{colors.stone}` | `#8B939C` | Inherited alias — **do not use for cinema body / seek text / DemoClub mounts** (fails AA on paper-warm, **2.85:1**) |
| `{colors.stone-cinema}` | `#5A636E` | Scene copy + idle pill labels + DemoClub secondary text (**LOCKED** ≥4.5:1 on paper-warm) |
| `{colors.line}` | `#E6E9ED` | Section top rule, frame border, InkProgress track (presentational only) |
| `{colors.line-strong}` | `#D0D5DB` | Idle pill border |
| `{colors.lagoon}` | `#0B6B63` | Post-cinema primary CTA (**will**, H1). Presentational WhatsApp/Publish pixels in the preview crop may use lagoon **without** hover/active affordance. Active seek-dot on CarouselChrome. |
| `{colors.lagoon-fg}` | `#F3FFFC` | CTA label |
| `{colors.gold}` | `#A68B5B` | Inherited alias — prefer `{colors.gold-cinema}` on `#crm` |
| `{colors.gold-cinema}` | `#6E5A32` | Feeling word (**LOCKED** ≥4.5:1 on paper-warm). No section eyebrow (A6). No opacity. |
| `{colors.gold-soft}` | `#F4EEE3` | Inherited — **not** a cinema wash |

**Not used as cinema decoration:** `{colors.gold-soft}` fields, lagoon fills behind the stage, ink scrims over the live UI, or a dark “theater” backdrop. The section stays on `{colors.paper-warm}`.

**LOCKED (H3) DemoClub presentational theme.** Cinema mounts do not iframe a production admin stylesheet unmodified. Secondary text in the live crop (Elena’s meta line, timestamps, muted chips) uses `{colors.stone-cinema}` or `{colors.ink}` — **never** raw `{colors.stone}` on paper-warm. QA contrast on Elena’s meta line, not only the feeling scene. **1.4.3 applies to visible text**, including `aria-hidden` subtrees.

Contrast (**LOCKED**): ink on paper for titles; `{colors.stone-cinema}` on paper-warm for scene copy / idle pills / DemoClub secondary (≥4.5:1); `{colors.gold-cinema}` on paper-warm for feeling words (≥4.5:1); idle dots use stone-cinema (≥3:1 non-text). Focus-visible: solid ink or lagoon ≥3:1 vs paper-warm; scroll-margin clears sticky header. No opacity on feeling/scene; do not fall back to `{colors.gold}` (2.97:1).

## Typography

Same pairing as the marketing shell. Cinema does not introduce a third family or a condensed “caption cinema” size. **Override (LOCKED):** Plus Jakarta Sans is the instrument face — **no Sora.**

| Token | Role on `#crm` |
|-------|----------------|
| `{typography.section}` | Feeling word only — uppercase, tracked, `{colors.gold-cinema}`. No section eyebrow (A6). No opacity. Clip-test with 1.4.12 letter-spacing — do not hide wrap under `overflow: hidden`. |
| `{typography.marketing-section}` | Section H2 thesis — **LOCKED (A3):** “A week with your people” |
| `{typography.feeling-title}` | Surface H3 — the feeling line, not a feature title |
| `{typography.feeling-scene}` | One-breath scene in `{colors.stone-cinema}` |
| `{typography.outcome-line}` | ≤3 felt outcomes — optional; the live screen carries the rest |
| `{typography.marketing-lead}` | Section lead under the thesis |
| `{typography.body}` | Fallback reading text |
| `{typography.label}` | Seek pill labels (surface names: Clients, Follow-up, …) |

Feeling titles stay Fraunces. If a line wraps, it wraps — copy is not cut to look more “Apple.” Do not drop to `{typography.display-sm}` to make room for the stage. **H6:** do not CSS-scale live roots to “fit” type; reflow/crop.

Left copy **starts with the feeling word** (Relief, Connection, Control, Reach, Proof, Pride) before any feature noun. Taxonomy eyebrows (“Client CRM”, “Website builder · Pro”) are out.

## Layout & Spacing

The section keeps the marketing measure: gutters `{spacing.cinema-gutter-mobile}` / `{spacing.cinema-gutter-sm}` / `{spacing.cinema-gutter-lg}` (20 / 32 / 40px). Vertical padding `{spacing.cinema-section-y-mobile}` → `{spacing.cinema-section-y-lg}` (64 → 80px). Stage max width `{components.cinema-stage.max-width}` (90rem) so the live UI can read as a real desk object. Gap between FeelingCopy and ProductFrame = `{spacing.cinema-copy-visual-gap}` (32px).

**Form factor LOCKED:** Desktop pin cinema (`lg+`, 1024px) + mobile click-tabs (`< lg`). Admin confirmed mobile responsive parity; this matches the prior cinema model. Below `lg`, cinema does not pin; see EXPERIENCE.md Responsive. Mobile is first-class parity of the same six rooms — not a lesser mock. **LOCKED (H6):** no CSS `transform: scale` of live roots; reflow/crop; wrap pills below `sm` (or peek + chevrons); never swipe-only to Website.

**LOCKED (A4) Desktop split:** live stage owns ~65–70% (`{spacing.cinema-stage-span}` = 68% as the working midpoint); feeling copy sits left in the remaining ~30–32% (`{spacing.cinema-copy-span}`). Alternate (not shipped): full-bleed stage with copy as a caption under the hero — do not ship without an Admin override.

Pinned anatomy (desktop only) — **LOCKED (C1)** one sticky, not two:

```
┌──────────────────────────────────────────────────────────────┐
│  centered intro: H2 thesis · lead (no section eyebrow)       │
│  ┌─ ONE sticky cinema chrome ──────────────────────────────┐ │
│  │  top = header-offset (6rem) · z-20 (header z-30)        │ │
│  │  height calc(100vh − 6rem)                              │ │
│  │  ┌─ SeekPills shrink-0 (NOT independently sticky) ────┐ │ │
│  │  │  Clients  Follow-up  Dashboard  Campaigns  Reports │ │ │
│  │  │  Website   InkProgress (aria-hidden 2px)           │ │ │
│  │  └────────────────────────────────────────────────────┘ │ │
│  │  ┌─ FeelingCopy + ProductFrame fill the rest ─────────┐ │ │
│  │  │  FeelingCopy (~32%)     ProductFrame (~68%)        │ │ │
│  │  │  = stable tabpanel      preview · inert · mask     │ │ │
│  │  │  never aria-hidden      pointer-events none        │ │ │
│  │  └────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
│  scroll track — progress seeks surfaces 1→6 (not chapters)   │
└──────────────────────────────────────────────────────────────┘
```

- **One sticky chrome:** `{components.cinema-stage.sticky}` is the **only** `position: sticky` on `#crm`. `top` = `{spacing.header-offset}` (6rem); `z-index` 20 (header `z-30`); height `calc(100vh - 6rem)`. SeekPills are `shrink-0` **inside** that box (`{components.seek-pill-sticky}` is flex, **not** a second sticky). FeelingCopy + ProductFrame fill the remaining height. **FORBID** two stickies both at `top: 6rem`. 2.4.11 test: focused pill, header link, and feeling H3 never fully covered.
- **Stable stage:** while pinned, the frame’s viewport box does not translate, scale (except the Follow-up climax micro-beat `translateY(-4px)`), or recede. Scroll maps to surface index, not to the frame’s Y position. The stage never empties — live roots crossfade so the house stays inhabited. **H2:** no inner scroll in ProductFrame; page scroll owns the wheel.
- **Pin track:** `{spacing.cinema-surface-scroll}` = **70vh per surface** × 6 equal ranges. Hysteresis `{components.cinema-stage.hysteresis}` = **0.03** (3% of a surface range) — not a spacing token.
- **Copy column** is left, feeling-first, short. No four-bullet feature lists. No “Scroll to continue.” FeelingCopy is never under `overflow: hidden` shared with `{components.cinematic-mask}`.

**LOCKED form factor (`< lg` and `prefers-reduced-motion`):** stack **FeelingCopy then live surface**. Click-tabs (SeekPills); optional dots + chevrons as CarouselChrome. Same live bodies via **reflow/crop** — never CSS `transform: scale` of live roots, never a different fake mobile mock. No sticky stage, no pin spacer. Below `sm`, pills **wrap** (or peek + chevrons) — never swipe-only to reach Website.

## Elevation & Depth

Almost flat, as Midnight Atelier — with an explicit **hierarchy (F7)**: stage → frame → panel → chip.

The **primary** elevated object is `{components.product-frame}`:

- Border `1px solid {colors.line}`
- Radius `{rounded.xl}` (24px)
- Shadow `0 40px 80px rgba(7, 13, 18, 0.14)` — do not stack a second deep shadow on pin. Do not increase opacity to “feel more Apple.”
- Inner panels may use hairline + quiet lift (`0 8px 24px rgba(7, 13, 18, 0.06)` max). Chips stay flat.

**LOCKED (A1 + F2) Frame = Cohestra product window.** Identity, not Mac theater. Shipping default:

- Hairline + radius + one deep shadow.
- **Cohestra URL/app chrome strip required (F2):** thin top strip inside the frame showing `riverside-rec.cohestra.app/{path}` for the active room (e.g. `/clients`, `/clients/jordan`, `/`). Plus Jakarta `{typography.label}`, `{colors.stone-cinema}` on `{colors.paper}`.
- **No** traffic-light dots, **no** `ShowcaseBrowserChrome`, **no** fake Mac OS chrome.
- Optional whisper caption *under* the frame remains allowed (walkthrough, not a session — H1).
- Inner crop via `{components.cinematic-mask}` (live DOM, overflow hidden, **no inner scroll**).
- **H1 + F5:** `pointer-events: none` on the frame. Admin buttons inside the crop must not leak operable hover / active / cursor:pointer. **Do** paint selected row / static focus ring so the crop looks inhabited.
- Stage canvas may read slightly deeper/warmer than the brighter product window (F7) — still within paper-warm / ink family; no dark theater.

**Frameless alternate only (not shipping default):** live UI sits on `{colors.paper-warm}` with mask only — no border, no shadow. Documented so Admin can flip; do not mix both in one viewport. Frameless **fails F1** unless density is unmistakably admin-parity.

Seek pills: idle = border only (whisper); selected = ink fill + small shadow `0 8px 20px rgba(7, 13, 18, 0.12)` (does not compete with the frame). **H4:** ink follows `aria-selected` / progress, not focus. Chevrons (CarouselChrome only) may use a 10px lift on hover — **motion-safe only; PRM kills hover-lift.**

No glow, no lagoon ambient, no full-viewport dimmer while pinned.

## Shapes

- **Frame:** `{rounded.xl}` — the desk object. Inner mask inherits the radius.
- **Seek pills:** `{rounded.full}` — navigation for six rooms in one house, not a marketing pill cluster. **Override vs parent:** pill-full on seek nav is the six-room control — exception to parent avoid-pill-full. CTA stays `{rounded.md}`.
- **Chevrons / icon buttons:** `{rounded.md}` (10px).
- **Primary CTA:** `{rounded.md}` (48px height).
- Avoid new squircle “product tiles” around the live UI; the live UI *is* the object.
- Avoid pill-full on the CTA (Midnight Atelier: controls `{rounded.md}`).

## Components

Visual specs. Behavior lives in EXPERIENCE.md. Motion on this surface uses **`transform` and `opacity` only** (plus color on pills/dots). No `filter`, no layout (`top`/`height`) animation, no video scrub. **PRM (M):** kill hover-lift, feeling-crossfade, and climax — CarouselChrome is the chrome **and** the behavior.

PascalCase experience names → kebab tokens: `SeekPills` → `seek-pill-*`; `CinemaStage` → `cinema-stage`; `ProductFrame` → `product-frame`; `FeelingCopy` → `feeling-copy`; `InkProgress` → `ink-progress`; `ClimaxMicroBeat` → `climax-micro-beat`; `LiveRegion` → `live-region`; `PrimaryButton` → `button-primary`.

### SectionHeader

Centered intro on `{colors.paper-warm}`. **LOCKED (A6 + M):** `{components.section-header.eyebrow}` = **`omit`**. Do not extract `{colors.gold-cinema}` as an eyebrow. H2 `{typography.marketing-section}` + `{colors.ink}`: **LOCKED (A3)** “A week with your people” (alts in EXPERIENCE are not shipped). Lead `{typography.marketing-lead}` + `{colors.stone-cinema}`: a week inside a club like yours — never “Your account.”

### SeekPills

Six `{components.seek-pill-idle}` / `{components.seek-pill-active}` controls. Labels are **surface names** (Clients, Follow-up, Dashboard, Campaigns, Reports, Website). Never `chapterNumber`, never “01 / 06”, never “Chapter N of 6.”

Tablist: `role="tablist"` `aria-label="Product surfaces"` (**M**). Each pill `aria-controls` the stable FeelingCopy tabpanel id (**C2**).

**LOCKED (H4) Dual-state:** `aria-selected` ⇔ progress room ⇔ **ink**. Focus ⇔ **ring only**. Two pills may be emphasized at once (selected ink + focused ring). Hover on idle (motion-safe): `{components.seek-pill-hover}` `translateY(-2px)`, border toward ink — **never inks a pill**. **PRM kills hover-lift.** Do not restyle as underline-tabs or as Apple’s small facet dots-as-primary-nav; **pills stay the seek UI.**

**Desktop (C1):** pills are `shrink-0` **inside** the sticky cinema chrome — `{components.seek-pill-sticky}` is **not** `position: sticky`. Background `{colors.paper-warm}` so copy does not show through. Focus ring must clear the header. Tab-in / blur of the tablist resyncs roving `tabIndex={0}` to the **selected** tab.

### InkProgress

**LOCKED (A7 + M) SHIP** `{components.ink-progress}` — thin 2px ink on `{colors.line}` track under the pill row, **inside** the sticky chrome with the pills. Selected pill remains the teacher; the bar is a whisper, not chapter chrome.

Visual: height 2px; fill `{colors.ink}`; track `{colors.line}` on paper-warm (1.11:1 — acceptable **only** because the bar is decorative).

**Role:** `aria-hidden` **presentational `<div>`** — **not** `<progress>`, **not** `role="progressbar"`, **not** an unlabeled slider. Optional to omit only if QA reads it as chapter chrome.

### CinemaStage

The pinned pair **inside** the one sticky chrome: FeelingCopy + ProductFrame. Canvas `{colors.paper-warm}`. Minimum visual height `{spacing.cinema-stage-min-h-lg}` (520px) at `lg+`. The stage does not gain a card chrome of its own; the frame is the chrome. **LOCKED (A4)** Stage column ~68% (working midpoint of ~65–70%), copy ~32% at `lg+`. Gap `{spacing.cinema-copy-visual-gap}`.

**LOCKED (C1):** CinemaStage is **not** a second sticky. It fills the sticky chrome under the `shrink-0` pill row. **LOCKED (C2):** do **not** put `aria-hidden` / `inert` on CinemaStage as a whole — that would hide the tabpanel.

Hysteresis `{components.cinema-stage.hysteresis}` = 0.03 (3% of a surface range).

### FeelingCopy

Pattern **Feeling → Scene → Proof** (the proof is the live stage, not more copy).

**LOCKED (C2):** FeelingCopy **is** the stable `tabpanel`. Stable `id`. `aria-labelledby` = active tab. Pills `aria-controls` that id. Headings / scene / outcomes stay in the accessibility tree. Never `aria-hidden`. Never `inert`. Never `overflow: hidden` shared with the cinematic mask.

- Feeling word: `{typography.section}` + `{colors.gold-cinema}` (Relief, Connection, Control, Reach, Proof, Pride). No opacity.
- Feeling line: `{typography.feeling-title}` + `{colors.ink}` — from the locked table in EXPERIENCE.md.
- Scene: `{typography.feeling-scene}` + `{colors.stone-cinema}` — one breath, named DemoClub moment.
- Outcome lines: `{typography.outcome-line}` + `{colors.ink}`, **≤3**, optional, no lagoon check glyphs, no CRM capability list.

Surface change (motion-safe): `{components.feeling-crossfade}` — opacity 0→1 and `translateY(12px)→0`, 400ms. Copy and live root may share one crossfade; they must not stagger line-by-line. **PRM (M):** kill this crossfade — instant swap.

### ProductFrame

Hero object. `{components.product-frame}`: radius xl, line border, locked shadow. **LOCKED (A1 + F2)** Cohestra product window with tenant URL chrome (no Mac traffic-light dots). Frameless is the documented alternate only, not the shipping default — and fails F1 unless density is unmistakably admin-parity.

**LOCKED (F2) URL strip:** Inside the frame, a thin non-interactive chrome row shows `riverside-rec.cohestra.app/{path}` matching the active room. This is product-true host chrome, **not** `ShowcaseBrowserChrome`.

**LOCKED (C2):** `aria-hidden` **and** `inert` on **ProductFrame only**. Zero tab stops inside the frame. Tab from last pill lands on the next page landmark, never a WhatsApp button.

**LOCKED (H1 + F5):** Frame is **preview**, not an operable desk. `pointer-events: none`. No operable hover / cursor / active styles leaking from admin buttons. **Paint** selected Elena row (lagoon ring) and static focus/hover so the crop looks inhabited. Will is the post-cinema CTA only. Optional visible caption: this is a walkthrough, not a session.

**LOCKED (H2):** **No inner scroll.** `{components.cinematic-mask}` crops; page scroll owns the wheel. Do not ship `overflow: auto` on Clients (or any room) inside the frame.

**LOCKED (H3):** DemoClub presentational theme on the mounted bodies — stone-cinema / ink for secondary text; never raw stone on paper-warm.

**LOCKED (H6):** No CSS `transform: scale` of live roots. Reflow/crop. Browser zoom must still work (inner scale fights 1.4.4).

**LOCKED (F4):** Cinema-dense tokens — mounts must meet EXPERIENCE.md per-room density minimums. Sparse postcard crops fail F1.

**LOCKED (A5 + F6) Website:** live preview + seeded sections only — not full editor chrome, not hollow rails, **not mint gradient**. Requires local hero photo. If the mount is too heavy **or** hero photo is missing, omit the room — never ship [`imports/website-chapter-hollow-mock.png`](./imports/website-chapter-hollow-mock.png) or [`imports/fidelity-screenshots-2026-09-03/06-website.png`](./imports/fidelity-screenshots-2026-09-03/06-website.png).

**LOCKED (M) iframe:** `/demo/*` is **last resort**. Prefer omit-pill. If iframe ships: `inert` on host, `tabindex="-1"`, `pointer-events: none`, decorative `title`; sandbox without `allow-scripts` if possible. On failure: hide that tab, retarget `aria-controls`; do not leave a selected Website tab on a Clients panel.

Hosts the presentational body of the active surface, masked. Frame box stays put; inner live root crossfades with FeelingCopy (motion-safe). Demo layout may show a **ghost sidebar cue** for density (F4) — still preview pixels, still no operable nav.

### ClimaxMicroBeat

**LOCKED (A2 + M) SHIP — one shot, Follow-up, scrub-entry only.** Fire only when progress **scrubs** from Clients → Follow-up (connection / WhatsApp-on-timeline). Do **not** fire on pill skip. Frame eases to `scale(1.02)` + **`translateY(-4px)`** via `{components.climax-micro-beat}` (`translate-y: -4px` — signed lift, not `+4px`), then settles to scale 1. Opacity stays 1. No gold flash, no lagoon ring, no bounce. Website is the pride **epilogue** — inhabited preview, no scale beat. Reduced-motion: skip entirely.

This climax `scale` is a one-shot flourish on the **frame box**, not CSS-scale of live roots (H6).

### CarouselChrome (mobile + reduced-motion + rollback)

Tablist + optional dots + prev/next chevrons. Same `aria-label="Product surfaces"`. Dots `{components.seek-dot-idle}` / `{components.seek-dot-active}` (glyph 6px, hit ≥24×24); accessible name `Go to {navLabel}`. Chevrons `{components.carousel-icon-button}` (40px); accessible names `Previous` / `Next` (or `Go to {navLabel}`). This is not a lesser skin — it is the same six live rooms, click-to-seek. **LOCKED form factor:** this is the mobile (`< lg`) and PRM path. **Not shown on motion-safe `lg+`** (pills-only pin cinema). **H6:** wrap pills below `sm` (or peek + chevrons); never swipe-only to Website. Same live bodies via reflow/crop — **no CSS scale**.

### LiveRegion

`{components.live-region}` — visually hidden. **LOCKED (M)** string: `{navLabel}. {job sentence}.` — e.g. “Clients. I won’t lose a person after they scan the QR.” Never “Chapter N.” Never job-only. Cadence in EXPERIENCE (polite, atomic, debounce scrub, immediate explicit seek).

### PrimaryButton (post-cinema)

`{components.button-primary}` after the cinema, not inside the inert **ProductFrame**. Label: “Start with your first activity” — not “See pricing.” One lagoon action per region. This is the **will** (H1).

## Do's and Don'ts

**Do**

- Inherit Midnight Atelier. Restate tokens; do not drift hex or families. **Plus Jakarta Sans** for instruments — **no Sora.**
- Keep `{components.product-frame}` as the primary elevated object — with Cohestra URL chrome (F2) and elevation hierarchy (F7).
- Ship **one** sticky cinema chrome (C1). Pills `shrink-0` inside it.
- Put `aria-hidden` + `inert` on **ProductFrame only**; FeelingCopy **is** the `tabpanel` (C2).
- Show live Cohestra UI + MarketingDemoClub seed, themed stone-cinema / ink (H3), at **admin-parity density (F4)**. Elena in Clients is Elena in Reports.
- Treat the frame as preview: `pointer-events: none`; no inner scroll; page scroll owns the wheel (H1, H2). **Paint** selection (F5).
- Dual-state pills: ink ⇔ selected; ring ⇔ focus; Tab-in resyncs (H4).
- Write Feeling → Scene → Proof. Feeling word before feature noun. ≤3 outcome lines. **No checklist cards (F3 companion).**
- Animate with `transform` / `opacity` (and color on controls). PRM kills hover-lift / crossfade / climax.
- Treat Apple’s page as pin/seek/feeling grammar only; treat Tally as human clarity + product-as-proof only.
- Give mobile the same rooms via reflow/crop — wrap pills below `sm`; never CSS-scale live roots (H6).
- InkProgress as an `aria-hidden` presentational div. Tablist `aria-label="Product surfaces"`.
- Pass the **Admin fidelity test (F1)** — boringly like `/clients` = trustworthy.

**Don't**

- Invent brand colors beyond this file (Midnight Atelier + `{colors.stone-cinema}` / `{colors.gold-cinema}`).
- Ship `chapterNumber`, “Chapter N of 6”, chapter watermarks, “Scroll to continue,” or large `01`/`06` graffiti (F3).
- Use `ShowcaseBrowserChrome` / fake Mac traffic-light dots as the authenticity signal — **do** ship Cohestra URL chrome (F2).
- Ship sparse postcard mounts / orphaned widgets — [`imports/fidelity-screenshots-2026-09-03/`](./imports/fidelity-screenshots-2026-09-03/) is the anti-pattern (**do not ship**).
- Ship a hollow Website mock or mint-gradient hero — omit Website until local hero photo exists (F6).
- Copy iPhone hardware theater or become Tally’s typing canvas.
- Feature-checklist the copy; cut copy to look cinematic.
- Pin on mobile, or invent a long mobile sticky that traps scroll.
- Put lagoon on marketing decoration; save it for will (post-cinema CTA). Do not advertise in-frame Publish/WhatsApp as operable will.
- Dark-theater the canvas or wash the stage in gold.
- Two stickies both at `top: 6rem`.
- `aria-hidden` / `inert` on CinemaStage or FeelingCopy.
- Inner scroll in ProductFrame.
- CSS `transform: scale` of live roots.
- Raw `{colors.stone}` on paper-warm in cinema mounts.
- A `<progress>` / `progressbar` for InkProgress.
- An iframe fallback without `inert` + `tabindex="-1"` (prefer omit-pill).
- Sora (or any third family) as the instrument face.
- Treat “omit hollow UI” as permission for empty whitespace (F4).
- Pass DemoClub unit tests while failing the Admin eye test (F1).
