---
name: Live Proof Cinema
description: Behavior, IA, journeys, and interaction for the marketing Live Proof Cinema stage — live Cohestra UI, MarketingDemoClub seed, feeling copy, no chapter chrome.
status: final
created: 2026-09-01
updated: 2026-09-03
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
scope: Marketing home /#crm Live Proof Cinema only. Parent UJ-1…UJ-5 remain on ux-cohestra-2026-07-18 EXPERIENCE. Prior cinema ux-cohestra-2026-08-31 is superseded for chapter/mock cinema; pin/a11y mechanics may be referenced, chapter chrome must not.
design: ./DESIGN.md
implementation: web/components/marketing/marketing-product-cinema.tsx
---

# Live Proof Cinema — Experience Spine

> Behavioral contract for the marketing `#crm` section. Visual identity → `DESIGN.md` (**Midnight Atelier** inherited — cinema is live proof + interaction, not a rebrand). Spines win on conflict with mocks, the Apple craft reference, Tally craft notes, and the live implementation.

→ Visual tokens: `./DESIGN.md`  
→ Intent (primary): [`imports/brainstorm-intent-live-proof-cinema.md`](./imports/brainstorm-intent-live-proof-cinema.md)  
→ Craft: [`imports/craft-apple-iphone-17-pro-sg.md`](./imports/craft-apple-iphone-17-pro-sg.md) · [`imports/craft-tally-so.md`](./imports/craft-tally-so.md)  
→ Anti-pattern (**do not ship**): [`imports/website-chapter-hollow-mock.png`](./imports/website-chapter-hollow-mock.png) — sparse Website chapter with chapter chrome  
→ Anti-pattern (**do not ship**): [`imports/fidelity-screenshots-2026-09-03/`](./imports/fidelity-screenshots-2026-09-03/) — Admin 2026-09-03 disappointment set (chapter graffiti + sparse postcard mounts)  
→ Fidelity intent: [`imports/brainstorm-intent-cinema-product-fidelity-2026-09-03.md`](./imports/brainstorm-intent-cinema-product-fidelity-2026-09-03.md) 
→ Key screens: [`mockups/desktop-cinema-clients.html`](./mockups/desktop-cinema-clients.html) · [`mockups/desktop-cinema-followup.html`](./mockups/desktop-cinema-followup.html) · [`mockups/mobile-carousel.html`](./mockups/mobile-carousel.html) — **spines win on conflict**  
→ Pin / a11y mechanics (chapter/mock cinema **superseded**): [../ux-cohestra-2026-08-31/EXPERIENCE.md](../ux-cohestra-2026-08-31/EXPERIENCE.md)  
→ File today: `web/components/marketing/marketing-product-cinema.tsx` — kill chapter chrome in this file; do not extend 2026-08-31 chapter/mock cinema.

## Foundation

**Form factor:** Responsive marketing web on apex `cohestra.app` (and equivalent marketing host). This spine covers **one section** of the marketing home — not tenant admin, not public stub. **LOCKED:** Desktop pin cinema + mobile click-tabs. Admin confirmed mobile responsive parity; this matches the prior cinema model. **LOCKED (H6):** no CSS `transform: scale` of live roots; reflow/crop; wrap pills below `sm`.

**UI system:** shadcn/ui + Tailwind + existing marketing shell. Brand/craft = Midnight Atelier in `DESIGN.md` / parent [ux-cohestra-2026-07-18](../ux-cohestra-2026-07-18/DESIGN.md). Cinema adds no component library and no new palette beyond `{colors.stone-cinema}` / `{colors.gold-cinema}`. **Override (LOCKED):** Plus Jakarta Sans is the instrument face — **no Sora.**

**North star:** Mount the real Cohestra UI with MarketingDemoClub seed and feeling copy so visitors hire certainty — this is the tool for their club — not a marketing carousel.

**Stakes:** Consumer conversion — high polish + accessibility floor.

**Feeling reference:** [apple.com/sg/iphone-17-pro](https://www.apple.com/sg/iphone-17-pro/) — borrow pin / seek / short-copy / mobile-parity **grammar** only. Cohestra identity stays warm paper, ink, lagoon, Fraunces. Do not copy hardware theater. Notes: [`imports/craft-apple-iphone-17-pro-sg.md`](./imports/craft-apple-iphone-17-pro-sg.md).

**Clarity reference:** [tally.so](https://tally.so/) — human thesis, job-shaped rooms, product-as-proof, low noise, frictionless CTA. Steal craft; do not become Tally. Notes: [`imports/craft-tally-so.md`](./imports/craft-tally-so.md).

**Protagonist:** **Maya**, club ops (Sunday clinic + board games night on her mind), evaluating Cohestra on a laptop, then the same URL on her phone. Same job as Priya, the parent UJ-1 marketing prospect.

### Model (locked)

| Lane | Decision |
|------|----------|
| Data | Static `MarketingDemoClub` JSON. Curated fixtures only — never production tenant / real PII / session cookies on apex. Not a live demo API or cloned seed DB. |
| Mount | Presentational bodies extracted from admin pages + `MarketingDemoProvider`, **H3 themed** (stone-cinema / ink — never raw stone on paper-warm). iframe `/demo/*` is **last resort (M)** with `inert` + `tabindex="-1"` — or omit the pill. Crop dense screens with a cinematic mask (still live DOM). **H2:** no inner scroll. Demo layout shell **without sidebar**. |
| Desktop | Pin cinema; native scroll seeks six **surfaces**; stage ~65–70% (**LOCKED A4**; working midpoint 68%). **C1:** one sticky cinema chrome — pills `shrink-0` inside; FeelingCopy + ProductFrame fill the rest. |
| Mobile | **LOCKED** Click-tabs (`< lg`); **no long pin**; same live surfaces via **reflow/crop (H6)** — never CSS `transform: scale`, never a different fake mobile mock. Wrap pills below `sm` (or peek + chevrons); never swipe-only to Website. |
| PRM | Click-tabs at every viewport; kill pin / crossfade / climax / hover-lift (**M**). CarouselChrome is the chrome **and** the behavior. |
| Copy | Feeling → Scene → Proof (live screen). ≤3 outcome lines. Feeling word before feature noun. |
| Progress | Selected pill first; **LOCKED (A7) SHIP** thin 2px ink under pills as `aria-hidden` presentational div (**M**). Omit only if QA reads it as chapter chrome. **Chapters forbidden.** |
| Frame | **LOCKED (A1 + F2)** Cohestra product window with tenant URL chrome (`riverside-rec.cohestra.app/{path}`). No Mac traffic-light dots / `ShowcaseBrowserChrome`. Frameless = alternate only (fails F1 unless density is admin-parity). **H1 + F5:** preview — `pointer-events: none`; paint selection; will = post-cinema CTA. |
| Climax | **LOCKED (A2)** Follow-up connection micro-beat on scrub-entry Clients→Follow-up (WhatsApp-on-timeline). Signed `translateY(-4px)` (**M**). Website is pride epilogue. |
| Seek / escape | Surface pills jump to a room; visitor can skip. Focus ≠ seek. Activate seeks. **H4:** ink ⇔ selected; ring ⇔ focus. |
| Frame a11y | **LOCKED (C2):** `aria-hidden` **and** `inert` on **ProductFrame only**. FeelingCopy **is** the stable `tabpanel` (stable id, `aria-labelledby` active tab). Pills `aria-controls` that id. Clicks blocked via `pointer-events: none`. **No inner scroll (H2).** |
| CTA after cinema | “Start with your first activity” — not “See pricing.” This is the **will (H1)**. |

### Reviewer Gate locks

Admin: decide for me. C1 / C2 / H1–H6 / M / **F1–F7** are **LOCKED**. A1–A7 remain (A1 refined by F2). Cite these ids elsewhere; do not revive dual-sticky / inert-on-whole-stage / inner-scroll / CSS-scale / sparse postcard mounts.

| ID | Lock |
|----|------|
| C1 | **One** sticky cinema chrome under header (`top` = `{spacing.header-offset}`, z below header). SeekPills are `shrink-0` **inside** that sticky. FeelingCopy + ProductFrame fill the rest. **FORBID** two stickies both at `top: 6rem`. |
| C2 | `aria-hidden` + `inert` on **ProductFrame only**. FeelingCopy **is** the stable `tabpanel` (stable id, `aria-labelledby` active tab). Pills `aria-controls` that id. |
| H1 | Frame is **preview**, not an operable desk: `pointer-events: none`; no operable hover/active leak; will = post-cinema CTA. **Paint** selected/hover/focus statically (F5). |
| H2 | **No inner scroll** in ProductFrame — cinematic crop/mask only; page scroll owns the wheel. |
| H3 | DemoClub presentational theme: secondary text uses `stone-cinema` / `ink` (≥4.5:1); never raw `stone` on paper-warm in cinema mounts. |
| H4 | Dual-state pills: `aria-selected` ⇔ progress ⇔ ink; focus ⇔ ring only; Tab-in/blur resyncs roving `tabIndex` to selected. |
| H5 | Hash `#crm`: intercept click + same-hash; always `resetToClients` + `scroll-mt`; do **not** move focus unless cinema chrome that held focus unmounted. |
| H6 | Mobile: no CSS `transform: scale` of live roots; reflow/crop; wrap pills below `sm` (or peek + chevrons); never swipe-only to Website. |
| M | Climax `translateY(-4px)` signed consistently; section-header eyebrow `omit`; hysteresis under `{components.cinema-stage.hysteresis}` not spacing; InkProgress = `aria-hidden` presentational div; live region `{navLabel}. {job sentence}.`; PRM kills hover-lift/crossfade; iframe last resort with `inert` + `tabindex=-1` or omit pill; tablist `aria-label="Product surfaces"`. |
| F1 | Visual fidelity is an **AC** — Admin reading cheap / improvised fails the story even if DemoClub invariants pass. |
| F2 | ProductFrame ships Cohestra tenant URL chrome (`riverside-rec.cohestra.app/{path}`); forbid Mac traffic-light / `ShowcaseBrowserChrome`. |
| F3 | Kill all chapter pedagogy (watermarks, CHAPTER N OF 6, SCROLL TO CONTINUE, taxonomy eyebrows). Feeling titles only. |
| F4 | Admin-parity density (cinema-dense). “Omit hollow UI” ≠ sparse atmosphere. Per-room minimums below. |
| F5 | Local synthetic portraits + painted Elena selection (lagoon ring). |
| F6 | Website omitted until local hero photo exists; mint gradient forbidden. |
| F7 | Elevation hierarchy: stage / frame / panel / chip. |

### Kill / keep

**Kill:** `chapterNumber`; “Chapter N of 6”; chapter watermarks / footer; “Scroll to continue”; large `01`/`06` graffiti; taxonomy eyebrows (“01 CLIENT CRM”); `ShowcaseBrowserChrome` / Mac traffic-light dots; hollow Website section rails / PRO chip theater / mint-gradient heroes ([`imports/website-chapter-hollow-mock.png`](./imports/website-chapter-hollow-mock.png), [`imports/fidelity-screenshots-2026-09-03/`](./imports/fidelity-screenshots-2026-09-03/) — **do not ship**); feature-checklist / checkmark pill stacks; parallel fake UI / second design language; initials-only pastel avatar kits as the only people signal; anonymous “Acme”; “Your account”; real-PII iframe; sparse postcard mounts; **two stickies both at `top: 6rem`**; **`aria-hidden`/`inert` on CinemaStage or FeelingCopy**; **inner scroll in ProductFrame**; **CSS `transform: scale` of live roots**; **Sora** as instrument face.

**Keep:** Pin cinema on desktop **as one sticky chrome (C1)**; seek pills with product-true labels; PRM → click-tabs (kills hover-lift / crossfade / climax); Midnight Atelier + Plus Jakarta Sans instruments; **ProductFrame** with Cohestra URL chrome (F2) + `aria-hidden` + `inert` (FeelingCopy is the tabpanel); selected pill ink-filled / idle whisper (**H4** dual-state); lagoon only on the post-cinema CTA as will (in-frame WhatsApp/Publish are preview pixels); optional subtler climax ease/settle (not bounce) with signed `translateY(-4px)`; Feeling → Scene → Proof copy (no checklists).

### Data & Mount

| Axis | Rule |
|------|------|
| Snapshot | One `MarketingDemoClub` JSON drives all rooms. Cast never desyncs. Data alone does **not** buy F1. |
| Cast (locked from intent) | Elena, Jordan, Sunday clinic, board games night. Elena appears in Clients **and** Reports. |
| Club voice | “A week inside a club like yours.” Fixture org name comes from the JSON — never “Your account,” never “Acme,” never generic `yourclub`. |
| Presentational mount | Extract bodies from admin pages; wrap in `MarketingDemoProvider` with the static snapshot. **LOCKED (H3):** DemoClub presentational theme — secondary text `{colors.stone-cinema}` / `{colors.ink}` (≥4.5:1). Never raw `{colors.stone}` on paper-warm. Do not iframe a production admin stylesheet unmodified. QA contrast on Elena’s meta line. |
| Fidelity (F1–F7) | Mounts must look like real Cohestra product windows. Anti-pattern set: [`imports/fidelity-screenshots-2026-09-03/`](./imports/fidelity-screenshots-2026-09-03/). |
| Density (F4) | Cinema-dense tokens. Minimums: **Clients** ≥8 list rows clipped + selected Elena + TimelineEvent cards (not log dump); **Follow-up** outreach action bar + WhatsApp bubble chrome + denser queue; **Dashboard** ≥5 queue rows + ops-board density (ghost sidebar cue OK); **Campaigns** ≥4 rows + compose preview + segment chip; **Reports** filter chips + CSV affordance + narrative hero (not 3 bars then void); **Website** hero photo + published URL + upcoming activities — or **omit**. |
| Imagery (F5/F6) | Local synthetic portraits for cast; local `/public/demo/riverside-hero.webp` (or equivalent) before Website ships. |
| Frame (F2) | Every room inside ProductFrame with `riverside-rec.cohestra.app/{path}` chrome. |
| Fallback | iframe `/demo/*` is **last resort (M)**. Prefer omit-pill (A5/F6). If iframe ships: `tabindex="-1"`, `inert` on host, `pointer-events: none`, decorative `title`; sandbox without `allow-scripts` if possible. Still seed-driven; still no production PII. |
| Website | **LOCKED (A5 + F6)** Live preview + sections with seed + **local hero photo**. Not full editor chrome. Not Appearance-toggle orphan. If mount is too heavy **or** hero missing, **omit the surface**. |
| Safety | Apex never receives production tenant data, real PII, or session cookies. |
| Crop | `{components.cinematic-mask}` crops; **H2** no inner scroll; page scroll owns the wheel. **H1** `pointer-events: none` + **F5** painted selection. **H6** reflow/crop — never CSS-scale live roots. |
| Story order | Prefer **33.2 (kill chapter) → 33.3 (ProductFrame)** before further mount polish — frame + kill-chapter lead; data fills the frame. |

## Information Architecture

Cinema does not add routes. It re-presents six existing product surfaces inside marketing home as **rooms in one house**.

### Surface

| Surface | Route | Purpose |
|---------|-------|---------|
| Marketing home — Live Proof Cinema | `/#crm` | Convert by showing the real workspace, inhabited by MarketingDemoClub, feeling-first |

Header nav **Clients** already points at `/#crm` (`marketing-shell.tsx`). That contract stays. **LOCKED (H5):** intercept that click **and** same-hash activation; always `resetToClients` + `scroll-mt`; do **not** move focus unless cinema chrome that held focus unmounted.

### Section

| Field | Copy |
|-------|------|
| `id` | `crm` |
| Eyebrow | **LOCKED (A6 + M)** Omit. `{components.section-header.eyebrow}: omit`. Do not use “Inside the workspace.” The H2 is the thesis. |
| Title (thesis) | **LOCKED (A3)** A week with your people. Alts (not shipped): “The stack ends here” / “Software that remembers your club.” |
| Lead | A week inside a club like yours — the same rooms your team will open on Monday. |
| Job of the section | Answer: “Is this real software for my kind of club, or pretty vapor?” |
| Emotional hire | “Make me feel the chaos ends here.” |
| Trust hire | Pixel-true to login — as **preview**, not an operable desk (H1). |
| Identity hire | Calm club craft, not generic AI SaaS. |

Post-cinema CTA (same page, after unpin): **Start with your first activity.** This is the **will (H1)**.

### Rooms (seek order)

Pills = rooms. `id` values match today’s `ProductSlideId`. Copy pattern: **Feeling → Scene → Proof**. Proof is the live stage. Outcome lines ≤3; omit freely when the screen carries it.

#### 1. Clients — `clients` — Relief

| Field | Copy |
|-------|------|
| navLabel | Clients |
| feeling | Relief |
| job (visitor hires this to…) | I won’t lose a person after they scan the QR |
| feeling line | Every person who signs up still has a name on Monday |
| scene | Elena scanned Sunday clinic. She is still on the list — not a row in a spreadsheet you meant to file. |
| visual | Live Clients body + MarketingDemoClub in ProductFrame URL `/clients` (F2). ≥8 rows clipped; Elena selected with lagoon ring (F5); TimelineEvent cards not log dump (F4). **H3** themed. **H2** cropped, not inner-scrolled. |

Outcome lines (≤3; cut if noisy):

1. One profile from every registration
2. Status the team can act on
3. History that travels with the person

#### 2. Follow-up — `outreach` — Connection *(climax room)*

| Field | Copy |
|-------|------|
| navLabel | Follow-up |
| feeling | Connection |
| job | Messaging lives where the lead lives |
| feeling line | Message them where they already are — and keep the record |
| scene | WhatsApp to Jordan about Sunday clinic, sitting on the timeline — not in someone’s personal chat. |
| visual | Live Follow-up / client timeline in ProductFrame (F2). Outreach action bar + WhatsApp bubble chrome (green accent) + denser queue (F4). Preview pixels only (H1) — WhatsApp is not operable will. |

Outcome lines (≤3):

1. Open WhatsApp or Viber from the person
2. The send is logged for the whole team
3. Nobody gets the same ping twice

#### 3. Dashboard — `dashboard` — Control

| Field | Copy |
|-------|------|
| navLabel | Dashboard |
| feeling | Control |
| job | Monday morning in 10 seconds |
| feeling line | Know what needs you before the session starts |
| scene | Follow-ups still open, this week’s registrations, Sunday clinic on the board — one calm glance. |
| visual | Live Dashboard body + seed in ProductFrame (F2). ≥5 queue rows; ops-board density; ghost sidebar cue OK (F4). |

Outcome lines (≤3):

1. Who still needs a message
2. This week against last week
3. Jump to the room that needs you

#### 4. Campaigns — `campaigns` — Reach

| Field | Copy |
|-------|------|
| navLabel | Campaigns |
| feeling | Reach |
| job | Email the right segment without exporting |
| feeling line | Reach the right people without exporting your community |
| scene | Sunday clinic regulars, not a CSV on someone’s laptop. |
| visual | Live Campaigns body + seed in ProductFrame (F2). ≥4 rows + compose preview pane + segment chip (F4). |

Outcome lines (≤3):

1. Segment from the people you already have
2. Preview before you send
3. Delivery stays in Cohestra

#### 5. Reports — `reports` — Proof

| Field | Copy |
|-------|------|
| navLabel | Reports |
| feeling | Proof |
| job | Prove the week to my board |
| feeling line | Show the week — not a spreadsheet archaeology dig |
| scene | Elena counted once. The week is a view, not a scavenger hunt. |
| visual | Live Reports body + seed (Elena recurring) in ProductFrame (F2). Filter chips + CSV affordance + narrative hero; ranking not empty void (F4). |

Outcome lines (≤3):

1. Filter the week you actually ran
2. People and registrations, together
3. Export when a spreadsheet is the meeting

#### 6. Website — `website` — Pride *(epilogue, not climax)*

| Field | Copy |
|-------|------|
| navLabel | Website |
| feeling | Pride |
| job | Public face and activities stay one organism |
| feeling line | Your public face stays tied to the activities you already run |
| scene | Sunday clinic and board games night on the public page — the same activities as the list, not a second brochure. |
| visual | **LOCKED (A5 + F6)** Live website preview + seeded sections + **local hero photo** in ProductFrame with published URL (F2). Not editor chrome. Not Appearance orphan. Not mint gradient. Omit the room if mount too heavy **or** hero missing. **Do not ship** [`imports/website-chapter-hollow-mock.png`](./imports/website-chapter-hollow-mock.png) or [`imports/fidelity-screenshots-2026-09-03/06-website.png`](./imports/fidelity-screenshots-2026-09-03/06-website.png). |

Outcome lines (≤3):

1. Activities update from the workspace
2. Preview, then publish
3. Share what you already run

**Surface closure:** The prospect’s need (“is this real software for my kind of club?”) is delivered by these six rooms on `/#crm`. Maya’s journey (Key Flows) lands here, climaxes at Follow-up, and may skip. No seventh room. No chapter index.

## Voice and Tone

Microcopy only. Aesthetic in `DESIGN.md`. Brand voice is gathered clarity — a host, not a feature matrix.

| Do | Don't |
|----|-------|
| Feeling word, then feeling line, then one scene | Taxonomy eyebrows (“Client CRM”, “Website builder · Pro”) |
| ≤3 felt outcome lines; let the live screen prove | Four-bullet capability lists / CRM-generic checklists |
| Announce `{navLabel}. {job sentence}.` to AT | “Showing Chapter 2 of 6” / silent visual-only swaps / job-only with no room name |
| Pill labels = `navLabel` (Clients, Follow-up, …) | Icon-only seek; `chapterNumber`; “01” |
| “A week inside a club like yours” | “Your account”, “Acme”, “Scroll to continue” |
| CTA: “Start with your first activity” | “See pricing” as the cinema closer; in-frame Publish/WhatsApp as will |
| Operator-plain, no emoji | “Scroll to explore the magic” |
| Tally-like human thesis; Cohestra soul | Become Tally’s typing-canvas voice |
| Plus Jakarta Sans instruments | Sora |

**Live region string (LOCKED M):** `{navLabel}. {job sentence}.` — e.g. “Clients. I won’t lose a person after they scan the QR.” Not “Showing {navLabel}: {title}.” Not job-only. Never a chapter index. On explicit Activate, suppress the region if the tab’s accessible name already includes `navLabel` **and** the job is in the panel H3 — or delay ~150ms so the tab utterance wins.

Optional walkthrough caption (H1, under the frame, not chrome inside it): this is a walkthrough, not a session.

## Component Patterns

Behavioral. Visuals in `DESIGN.md` Components (`SectionHeader`, `SeekPills`, `InkProgress`, `CinemaStage`, `FeelingCopy`, `ProductFrame`, `ClimaxMicroBeat`, `CarouselChrome`, `LiveRegion`, `PrimaryButton`).

| Component | Use | Behavioral rules |
|-----------|-----|------------------|
| **SectionHeader** | Top of `#crm` | Static. Not scrubbed. Hash `#crm` targets the section, not a mid-pin room. **LOCKED (A6 + M)** `{components.section-header.eyebrow}: omit`. Thesis **LOCKED (A3)** “A week with your people.” |
| **SeekPills** | Seek + current room | Six controls, `navLabel` text. Tablist `aria-label="Product surfaces"` (**M**). Each pill `aria-controls` the stable FeelingCopy tabpanel id (**C2**). **Desktop (C1):** `shrink-0` **inside** `{components.cinema-stage.sticky}` — **not** independently sticky at `top: 6rem`. **H4 dual-state:** `aria-selected` ⇔ progress ⇔ ink; focus ⇔ ring only; Left/Right/Home/End move focus with `preventScroll`; Enter/Space Activate; Tab-in / tablist blur resyncs roving `tabIndex={0}` to the **selected** tab. Focus does **not** rewrite pin progress. Activate scrolls the pin track to that surface’s progress range (smooth unless reduced-motion). Any pill is skip — do not gate on watching 1–5. **Mobile (H6):** wrap below `sm` or peek + chevrons; never swipe-only to Website. **Never** render `chapterNumber`. **PRM:** kill hover-lift. |
| **InkProgress** | Under pills, inside sticky chrome | **LOCKED (A7 + M) SHIP** thin 2px ink. **`aria-hidden` presentational `<div>`** — not `<progress>` / `progressbar`. Selected pill remains the teacher. Optional to omit only if QA reads it as chapter chrome. |
| **CinemaStage** | Desktop `lg+` only | **C1:** fills the one sticky chrome under the pill row — **not** a second sticky. While pinned, the stage’s viewport box stays geometrically stable. Scroll Y maps to surface index. Leaving the track (scroll past last room, or reverse past first) **unpins** and returns normal page scroll. Stage never empties: crossfade live roots (motion-safe). **Do not** put `aria-hidden` / `inert` on CinemaStage as a whole. Hysteresis `{components.cinema-stage.hysteresis}` = 0.03. |
| **FeelingCopy** | Left column (`lg+`); above visual on mobile | **LOCKED (C2):** this **is** the stable `tabpanel` (id stable, `aria-labelledby` active tab). Never `aria-hidden` / `inert`. Never `overflow: hidden` shared with the mask. On room change, swap feeling / feeling line / scene / outcome lines together. No per-line reveal. Crossfade via `{components.feeling-crossfade}` when motion is allowed; **PRM kills crossfade**. Starts with the feeling word. |
| **ProductFrame** | Right ~65–70% (`lg+`); below copy on mobile | Hosts the live presentational body. **LOCKED (A1)** Thin Cohestra window. **C2:** `aria-hidden` **and** `inert` on **this frame only** — zero tab stops. **H1:** preview, not operable desk — `pointer-events: none`; no hover/active leak; will is post-cinema CTA; optional walkthrough caption. **H2:** no inner scroll; mask crops; page scroll owns the wheel. **H3:** DemoClub theme. **H6:** no CSS-scale of live roots. Frame box does not move with scrub. Inner live root crossfades with copy (motion-safe). **M iframe:** last resort with `inert` + `tabindex=-1`, or omit pill. |
| **ClimaxMicroBeat** | Follow-up, motion-safe desktop | **LOCKED (A2 + M)** One-shot `{components.climax-micro-beat}` only on **scrub-entry** Clients→Follow-up. `scale(1.02)` + **`translateY(-4px)`** (signed lift). **Not** on pill skip. **Not** on Website. Settle to scale 1. Skip under PRM. Frame-box flourish, not CSS-scale of live roots. |
| **CarouselChrome** | `< lg`, reduced-motion, rollback | Tablist `aria-label="Product surfaces"` + dots + prev/next chevrons. Dots/chevrons call same Activate as pills. Dots: `Go to {navLabel}`, hit ≥24×24. Chevrons: named `Previous` / `Next` (40px). **H6:** wrap pills below `sm` or peek + chevrons; never swipe-only to Website. **Not shown on motion-safe `lg+`**. Same live surfaces via reflow/crop. |
| **LiveRegion** | All modes | `sr-only` polite atomic: `{navLabel}. {job sentence}.` Announce immediately on **explicit seek** (or suppress/delay ~150ms if tab name already spoken); scrub → debounce ~300ms/scrollend; suppress duplicate strings; never assertive. |
| **PrimaryButton** | After cinema | “Start with your first activity.” `{components.button-primary}`. One. Not inside the inert **ProductFrame**. This is the **will (H1)**. |

## State Patterns

| State | Surface | Treatment |
|-------|---------|-----------|
| Cold load / first paint | `#crm` | Room **Clients** (index 0). No autoplay. Elena visible in the live list. FeelingCopy tabpanel labelled by Clients tab. |
| Hash `#crm` | Desktop cinema | **LOCKED (H5):** intercept header/in-page `#crm` activation (**click + same-hash** — same-document clicks on an already-current hash do **not** fire `hashchange`). Always `resetToClients` @ progress 0. Scroll section into view (`scroll-mt-24` / `{spacing.header-offset}`). Do not land mid-scrub. **Do not** move focus unless cinema chrome that held focus unmounted. Do not re-announce unless the room actually changed. |
| Hash `#crm` | Mobile / reduced-motion | Same intercept. Scroll section into view. Carousel index 0 (Clients). No pin. Same focus rule (H5). |
| In-pin, room *n* | Desktop | Pills show *n* selected (`aria-selected` ⇔ ink, **H4**); copy + live root for *n*; live region only after scrub settle / explicit seek. Focus may sit on a different pill (ring only) until Tab-in/blur resyncs. |
| Seek via pill | Desktop | Smooth-scroll track to room *n* progress; then same as in-pin. Reduced-motion: jump without smooth scroll / without pin (carousel index). |
| Seek via pill | Mobile | Set index; no page scroll besides keeping the section in view if already there. |
| Skip to Follow-up / Website | Both | Pill Activate is sufficient. No interstitial. **Climax does not fire** on skip. |
| Climax armed | Desktop Follow-up via scrub | Micro-beat plays once on scrub-entry from Clients: `scale(1.02)` + `translateY(-4px)` → settle 1. WhatsApp-on-timeline is on stage as **preview**. |
| Climax spent | Still on Follow-up | Frame at rest scale **1** after beat. |
| Website epilogue | Both | **LOCKED (A5)** Pride: inhabited preview + seeded sections. No scale beat. If Website mount is too heavy, hide the pill, rebuild the tablist (5 tabs, retarget `aria-controls`) — never show hollow rails. |
| Unpin (leave track) | Desktop | Keep scrolling out of track **or** Activate any pill. Re-enter from below → Website; from above → Clients. (Scroll-out is not a keyboard `Esc` binding.) |
| Focus (desktop pinned) | `#crm` | **H4:** focus ring visible vs `{colors.paper-warm}`; ink stays on selected. Tab order = sticky-chrome pills (roving; Tab-in lands on **selected**) then onward landmarks — **not** into ProductFrame. **No focus trap**; Up/Down/PageDown/Space scroll the page unless a seek control is focused and Space/Enter means Activate. |
| Hover (motion-safe) | Pills / chevrons | Visual-only lift (`{components.seek-pill-hover}`). Never inks a pill. **PRM kills hover-lift.** |
| `prefers-reduced-motion: reduce` | All viewports | **CarouselChrome** — no pin, no scrub, no climax, no hover-lift, no crossfade; instant swap. On `matchMedia` change mid-pin: tear spacer, remount chrome, restore surface **id**, sync scroll so section is in view. **H5:** do not steal focus from the header. |
| Resize across `lg` / orientation | Home | Remount model; preserve surface **id**; sync `scrollTop`; **if focus was in unmounted chrome**, move to active pill — otherwise do not move focus (H5). Seek smooth-scroll cancels on wheel/touch. |
| Hash `/#crm` while already in section | Both | **LOCKED (H5):** intercept same-hash; **always** `resetToClients` @ progress 0 / index 0. Do not yank focus from the header link. |
| Mount failure / iframe fallback | Stage | Prefer **omit-pill (A5 / M)**. If iframe ships for that room: `tabindex="-1"`, `inert` on host, `pointer-events: none`. If iframe also fails: hide that tab, retarget `aria-controls`; do not leave a selected Website tab on a Clients panel. Stage never empties. Announce nothing theatrical. |
| JS / cinema failure | Home | Render `CarouselChrome` with live bodies if possible. See Backup & Rollback. |

## Interaction Primitives

**Desktop pin cinema (`lg+`, motion-safe)**

- **Pin (C1):** **One** sticky cinema chrome: `{components.cinema-stage.sticky}` with `top` = `{spacing.header-offset}`, `z-20` (header `z-30`), height `calc(100vh - 6rem)`. SeekPills are `shrink-0` **inside** that box. FeelingCopy + ProductFrame fill the rest. **FORBID** a second sticky at the same `top`. Native page scroll drives `progress ∈ [0, 1]` across **six equal** ranges: surface *i* = `[i/6, (i+1)/6)` with track height `{spacing.cinema-surface-scroll}` × 6 (70vh × 6). Hysteresis **3%** of a surface range (`{components.cinema-stage.hysteresis}` = 0.03).
- **Native scroll only:** map `scrollY` → progress. **Forbid** `preventDefault` on wheel / touchmove / PageDown / Space / Home / End except when a seek control is focused and Space/Enter means Activate. **H2:** ProductFrame does not take the wheel — no inner scroll.
- **Scrub = surface seek, not frame-sequence.** Discrete room + live root. No video frames / 3D orbit.
- **Stable stage:** frame box does not translate with scrub. Transform limited to ClimaxMicroBeat (scrub-entry Follow-up only: `translateY(-4px)`).
- **Pills (H4):** inside sticky chrome; Activate seeks; Focus alone does not. Tablist APG: `aria-label="Product surfaces"`; Left/Right/Home/End move **focus** (ring) with `preventScroll`; Activate (Enter/Space) seeks scrollTop. `aria-selected` ⇔ progress ⇔ ink. On Tab-in / blur, roving `tabIndex` returns to selected. Smooth-seek cancels on user wheel/touch. Do not `preventDefault` Up/Down/PageDown.
- **Leave the track:** keep scrolling (unpin) **or** Activate any pill. No modal. No scroll-jack. No `Esc` binding required.
- **Layout:** **LOCKED (A4)** stage `{spacing.cinema-stage-span}` (~68% working midpoint of ~65–70%) + left FeelingCopy `{spacing.cinema-copy-span}`.

**Banned on desktop cinema**

- True Apple: video/sprite scrub inside a hardware bezel.
- Chapter pedagogy of any kind.
- Beat×6: six inner timelines, line stagger, per-outcome progress bars.
- Naive opacity-tabs-on-scroll that swaps tabs without a stable pinned stage.
- Scroll-jack / `preventDefault` on the document while pinned.
- Fake browser-dot chrome as the trust signal.
- Two stickies both at `top: 6rem`.
- `aria-hidden` / `inert` on CinemaStage or FeelingCopy.
- Inner scroll in ProductFrame.
- Operable-looking admin buttons (hover/active leak) inside the preview.

**Mobile (`< lg`) and reduced-motion**

- Click/tap SeekPills, dots, or chevrons to change index (APG tablist, `aria-label="Product surfaces"`).
- **H6:** wrap pills below `sm` (or peek + chevrons). **Never** swipe-only to reach Website. No new swipe-on-frame as the only path.
- No `position: sticky` stage, no spacer pin track.
- Same live surfaces via **reflow/crop**. **No CSS `transform: scale` of live roots.** Never a decorative mobile-only mock.
- **PRM (M):** kill hover-lift / crossfade / climax; CarouselChrome is chrome **and** behavior.

**Hash (H5)**

- `/#crm` always means: this section, Clients at rest. It does not encode a room (no `#crm-website` in v1).
- Intercept header/in-page `#crm` **click and same-hash** (Next.js same-document hash does not fire `hashchange`).
- Always `resetToClients` + scroll with `scroll-mt-24`.
- **Do not** move focus unless cinema chrome that held focus unmounted.
- After restore, do not re-announce unless the room actually changed.

## Accessibility Floor

Stakes are consumer conversion — polish cannot outrun this floor. Visual contrast lives in `DESIGN.md`.

- WCAG 2.2 AA on the marketing section + cinema contrast tokens `{colors.stone-cinema}` / `{colors.gold-cinema}` on `{colors.paper-warm}` (≥4.5:1 for scene/idle/feeling; idle glyphs ≥3:1). **H3:** same floor on DemoClub mounts — never raw `{colors.stone}` on paper-warm; QA Elena’s meta line. **1.4.3 applies to visible text**, including `aria-hidden` subtrees.
- Seek controls operable by pointer and keyboard. Sticky pills remain operable entire pin (**inside** the one sticky chrome); pin must **not** trap focus.
- **Name, role, value:** both breakpoints use **tablist / tab / tabpanel** with APG (roving tabindex, Left/Right, Home/End). Tablist `aria-label="Product surfaces"`. **LOCKED (C2):** FeelingCopy **is** the stable panel (`id` stable, `aria-labelledby` active tab); pills `aria-controls` that id. Chevrons are named buttons, not tabs. Dots: `Go to {navLabel}`. Do not mix `aria-current` on the same node as `aria-selected`.
- **LOCKED (H4):** `aria-selected` ⇔ progress ⇔ ink. Focus ⇔ ring only. Tab-in / blur resyncs roving `tabIndex` to selected. Written test: two pills may be emphasized at once; Tab back into the list lands on the selected room, not a stale Clients tab.
- **Live region:** polite + atomic; immediate on explicit seek (or suppress/delay ~150ms if tab name already spoken); scrub debounced ~300ms/scrollend; no assertive; suppress duplicates; string = **`{navLabel}. {job sentence}.`**, never chapter index, never job-only.
- **LOCKED (C2 + H1 + H2):** `aria-hidden` **and** `inert` on **ProductFrame only** — zero tab stops inside the frame; `pointer-events: none`; **no inner scroll**. Written test: headings/scene are in the accessibility tree; Tab from last pill lands on the next page landmark, never a WhatsApp button.
- `prefers-reduced-motion: reduce` **is** CarouselChrome — not a dimmed cinema. Kill hover-lift / crossfade / climax; tear pin spacer on media change.
- Focus-visible: solid ink or lagoon ≥3:1 vs `{colors.paper-warm}`; scroll-margin clears header.
- No autoplay. ClimaxMicroBeat only on scrub-entry to Follow-up (not pill skip, not Website); signed `translateY(-4px)`.
- **LOCKED (C1) 2.4.11:** **One** sticky cinema chrome: `top` = `{spacing.header-offset}` (6rem); `z-20`; height `calc(100vh - 6rem)`; header `z-30`. Pills are `shrink-0` inside — **not** a second `top: 6rem`. Focused pill, header link, and feeling H3 never fully covered. `scroll-mt-24` offsets hash landing of `#crm`, not pill stacking. Test against that math.
- **LOCKED (H5):** intercept `#crm` click + same-hash; always `resetToClients` + `scroll-mt`; do **not** move focus unless cinema chrome that held focus unmounted.
- **LOCKED (H6):** no CSS-scale of live roots; wrap pills below `sm` (or peek + chevrons); never swipe-only to Website.
- **LOCKED (M):** InkProgress `aria-hidden` presentational div. iframe last resort: `inert` + `tabindex=-1` or omit pill. On omit: rebuild tablist, retarget `aria-controls`.
- Hit targets: CarouselChrome dots visible 6px, hit ≥24×24; chevrons 40px.
- Feeling/scene: no opacity. Do not put FeelingCopy under `overflow: hidden` shared with the mask. Clip-test 1.4.12 letter-spacing on the feeling word.

## Key Flows

### Flow A — Maya walks the house (desktop, motion-safe) — climax at Follow-up

**Maya**, club ops, laptop, marketing home. Sunday clinic and board games night are the week she is trying to hold together.

1. Maya opens `cohestra.app` and scrolls (or uses header **Clients** → `/#crm`). **H5:** that activation always `resetToClients` + `scroll-mt`; focus stays on the header link.
2. `#crm` lands: SectionHeader thesis **LOCKED (A3)** “A week with your people” (no section eyebrow); **one** sticky cinema chrome with SeekPills `shrink-0` inside; FeelingCopy + ProductFrame fill the rest, pinned on **Clients**. Feeling word **Relief**. Elena is on the list. The live UI is a **preview** of the craft she will see after login — not an operable desk.
3. She scrolls. Page scroll owns the wheel (no inner scroll in the frame). Progress seeks **Follow-up**.
4. **Climax:** WhatsApp-on-timeline for Jordan (Sunday clinic) is on the live Follow-up body as preview pixels. Connection — messaging lives where the lead lives. If she arrived by scrub from Clients, ClimaxMicroBeat (`scale(1.02)` + `translateY(-4px)` → settle 1) plays once. If she clicked the Follow-up pill, no beat — the timeline is enough.
5. She continues: **Dashboard** (control) → **Campaigns** (reach) → **Reports** (proof — Elena again). The frame stays put; copy and live root crossfade; the house stays inhabited. Dual-state: selected pill inks; a focused pill (if she Tabbed) shows ring only.
6. **Epilogue:** **Website** — pride. Live preview + seeded sections (Sunday clinic, board games night). No scale beat. No Pro chip theater. Not [`imports/website-chapter-hollow-mock.png`](./imports/website-chapter-hollow-mock.png).
7. Resolution: she unpins by scrolling on, reaches **Start with your first activity** (the will). She was not forced through chapters, a video, or a six-beat timeline.

**Failure / escape:** At any pill she can jump; scrolling past Website restores normal page scroll. Reduced-motion or a phone uses Flow B. If Website cannot mount, the pill is absent — she never sees hollow rails.

### Flow B — Maya on her phone (mobile click-tabs)

1. Maya opens the same URL on a phone (`< lg`).
2. `#crm` is click-tabs — no long pin, no scrub spacer. FeelingCopy stacks above the live surface (FeelingCopy remains the `tabpanel`). Live bodies **reflow/crop** — no CSS `transform: scale`.
3. She taps **Follow-up**. Index changes; the WhatsApp-on-timeline body is the climax content (no scale beat).
4. Below `sm`, pills **wrap** (or peek + chevrons). She can reach **Website** without a horizontal swipe-only path.
5. She taps **Website** (or not). Same live preview, cropped — not a fake mobile mock, not the hollow anti-pattern.
6. Resolution: she can still reach **Start with your first activity** below. Nothing traps vertical scroll.

**Failure:** Website pill absent if mount is too heavy; JS fail → CarouselChrome with live bodies if possible.

### Flow C — Skip to Follow-up (seek, either surface)

1. Maya already knows messaging is the hole in her stack. She clicks **Follow-up** first.
2. Desktop: pin track seeks `outreach`; **no** ClimaxMicroBeat (skip path). Mobile: index = Follow-up.
3. Connection copy + live timeline immediately (preview). Rooms 1 and 3–6 were not required.
4. Edge: keyboard user Tabs to pills (lands on selected after Tab-in resync), activates Follow-up with Enter — same seek. Live region speaks `{navLabel}. {job sentence}.` (or suppresses if the tab name already covered it).

### Flow D — Reduced motion

1. **Maya**, OS/browser `prefers-reduced-motion: reduce`.
2. Cinema code path **does not pin**. `CarouselChrome` is the UI (tabs, dots, chevrons) **and** the chrome. Hover-lift and crossfade are off.
3. Room changes are instant; live region still announces `{navLabel}. {job sentence}.`.
4. **Climax:** content only — WhatsApp-on-timeline, no transform.

**Failure:** Website pill absent; JS fail → CarouselChrome.

## Inspiration & Anti-patterns

**Borrow grammar from:** [iPhone 17 Pro (SG)](https://www.apple.com/sg/iphone-17-pro/) — a pinned product stage, scroll that *seeks facets*, sticky labels without chapter numbers, short benefit copy, the same story on mobile, quiet awe. That is the feeling: the object holds still; the house reveals another room.

Notes: [`imports/craft-apple-iphone-17-pro-sg.md`](./imports/craft-apple-iphone-17-pro-sg.md) — sticky facet labels, hero object owns the viewport, short benefit copy, mobile-first parity, quiet awe. Grammar only — not hardware theater.

**Borrow craft from:** [Tally.so](https://tally.so/) — one human thesis before taxonomy; job-shaped sections; prove the real product mechanic; low noise; frictionless try. Filter through Cohestra identity (warm paper, ink, lagoon, Fraunces + **Plus Jakarta Sans** instruments). Do not become Tally.

Notes: [`imports/craft-tally-so.md`](./imports/craft-tally-so.md) — human thesis, job-shaped sections, product-as-proof, low noise, frictionless CTA.

**Borrow product truth from:** the real admin presentational bodies + MarketingDemoClub seed, **H3 themed**. Cinema mounts those; it does not replace them with illustration or a second design system.

**Anti-patterns (dead — do not revive)**

| Reject | Why |
|--------|-----|
| `chapterNumber` / “Chapter N of 6” / “Scroll to continue” | Brochure smell; Apple’s own facet nav does not pedagogically number chapters |
| `ShowcaseBrowserChrome` fake dots | Authenticity theater; trust is the live UI, not a pretend browser |
| Hollow Website mock / empty rails / PRO chip | A promise with a question mark; omit the room rather than fake it. **Do not ship** [`imports/website-chapter-hollow-mock.png`](./imports/website-chapter-hollow-mock.png) |
| Decorative second design system | Pixel-true to login is the trust hire — as **preview** (H1) |
| True Apple frame/video scrub | Hardware theater is the reference’s trick; we are a club desk, not titanium |
| Full Beat×6 micro-timelines | Inner scrub tracks and line stagger over-choreograph feeling copy |
| Feature-checklist bullets | Copy answers a fear; the screen carries the rest |
| Long pin on mobile | Parity of story via click-tabs, not a trapped sticky |
| Rebrand / new palette / Sora | Cinema is an interaction + proof delta on Midnight Atelier; Plus Jakarta Sans is the instrument face |
| Autoplay through rooms | Conversion surface; visitor holds the seek |
| “Your account” / “Acme” seed | Named club week or nothing |
| Become Tally | Transferable craft only |
| Two stickies both at `top: 6rem` | Occludes focused pill / feeling H3 (2.4.11). One sticky chrome; pills `shrink-0` inside |
| `aria-hidden` / `inert` on whole CinemaStage | Hides the tabpanel. Frame only |
| Inner scroll in ProductFrame | Steals the pin’s wheel |
| CSS `transform: scale` of live roots | Fights zoom (1.4.4); reflow/crop instead |
| Swipe-only path to Website | 2.5.1; wrap pills or peek + chevrons |

## Responsive & Platform

Marketing already uses Tailwind `sm` / `lg` gutters. Cinema follows that split. **LOCKED form factor:** desktop pin cinema + mobile click-tabs. **Mobile responsive parity is mandatory** — same six rooms, same live bodies, same feeling copy. **H6** is access-parity, not story-parity-only.

| Breakpoint | Behavior |
|------------|----------|
| **`≥ lg` (1024px+)** | **LOCKED** Pin cinema: native-scroll seek + **one** sticky cinema chrome (C1). Pills `shrink-0` inside; not independently sticky. Dots/chevrons off (motion-safe). **LOCKED (A4)** Stage ~65–70% (working midpoint 68%) + left FeelingCopy. ClimaxMicroBeat `translateY(-4px)` on scrub-entry to Follow-up only if motion-safe. |
| **`< lg`** | **LOCKED** Click-tabs. FeelingCopy (tabpanel) stacked above live surface. No long pin. No climax scale. Same live roots via **reflow/crop** — **no CSS `transform: scale`**. |
| **`< sm`** | Still tabs (not pin). **H6:** pills **wrap** (`flex-wrap`) **or** peek + chevrons. Never a horizontal-scroll tablist as the only path to Website. |
| **`sm`–`lg`** | Still tabs (not pin). Pills wrap (`sm:flex-wrap sm:justify-center`). |
| **`prefers-reduced-motion: reduce`** | Any viewport: click-tabs; ignore pin/scrub/climax/crossfade/**hover-lift**. CarouselChrome is chrome **and** behavior. |
| **Platform** | Responsive web only. No native app shell. |

Hash `#crm` + sticky marketing header: keep `scroll-mt-24` so the section title is not hidden under the bar when pinning starts. **H5** intercept + `resetToClients` still applies.

## Backup & Rollback

Live Proof Cinema replaces chapter/mock cinema. Click-tabs remain the backup interaction, **with live bodies** — not a rollback to hollow mocks.

| Path | What ships |
|------|------------|
| **Mobile (`< lg`)** | Click-tabs: wrapping pills (H6), FeelingCopy as tabpanel, live surface via reflow/crop, optional dots/chevrons, live region. |
| **Reduced-motion** | Click-tabs; no pin, no enter animation, no hover-lift/crossfade/climax; instant index. |
| **Explicit rollback** | Desktop `lg+` also renders CarouselChrome (feature flag, env, or revert). Still live seed — never revive chapter chrome or `ShowcaseBrowserChrome` as the primary frame. |
| **Website too heavy** | **LOCKED (A5)** Omit the Website room rather than ship hollow rails / [`imports/website-chapter-hollow-mock.png`](./imports/website-chapter-hollow-mock.png). Hide the pill, rebuild tablist, retarget `aria-controls`. Five-room house is legal; a fake sixth is not. |
| **iframe last resort (M)** | Only if a body cannot be extracted. Host `inert` + iframe `tabindex="-1"` + `pointer-events: none`. Prefer omit-pill. |

**Implementation note**

- File today: `web/components/marketing/marketing-product-cinema.tsx` (and `use-marketing-product-cinema.ts`, `web/lib/marketing/product-slides.tsx`).
- Kill `chapterNumber`, “Chapter {n} of {n}”, and chapter-seek copy in that tree.
- Prefer today’s live sticky-wrapper topology: **one** sticky under `top-24`, pills inside, `aria-hidden`+`inert`+`pointer-events-none` on the **visual only**, copy as the accessible column, `aria-label="Product surfaces"`. Do not invent a second `top-24`.
- Do not delete `CarouselChrome` when live pin lands; pin is an additive desktop branch.
- Single content source for the six rooms (ids, navLabels, feeling/scene/job) so pin, tabs, and live region cannot drift.
- Prior workspace `ux-cohestra-2026-08-31` is **superseded** for this direction. Reuse pin math, APG tablist, live-region timing, PRM teardown, contrast tokens. Do not reuse chapter chrome, mock cinema, Website-as-climax, four-bullet lock, dual-sticky anatomy, or inert-on-whole-stage.
