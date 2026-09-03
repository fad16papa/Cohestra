# Spine Pair Review — cohestra

## Overall verdict
The pair is an extractable **behavioral and token contract** for Live Proof Cinema: A1–A7 are locked, contrast tokens are hexed with AA targets, pin math is numeric, and Maya’s four journeys cover the intent’s conversion paths. It is not yet a complete **visual contract** — `mockups/` and `wireframes/` are empty, and the memlog’s anti-pattern screenshot is missing from `imports/` — so a consumer can implement rules without inventing decisions, but must still invent the pinned composition. Downstream architecture / story-dev can source-extract cleanly for copy, seek/pin/PRM, and a11y; they cannot source-extract the stage layout from a picture.

## 1. Flow coverage — strong
Checked `sources` (intent as primary, parent 2026-07-18 DESIGN, 2026-08-31 EXPERIENCE for pin/a11y only, Apple/Tally craft notes) for UJ / requirement names. Intent has no `UJ-*` ids; six room jobs + kill/keep + open decisions 1–5 are the requirements. Spine `scope` explicitly parks parent **UJ-1…UJ-5** on `ux-cohestra-2026-07-18`. Walked Key Flows A–D against those journeys (desktop walk, mobile click-tabs, skip/escape, reduced-motion). Verified named protagonist, numbered steps, climax beat, failure/escape where present.

### Findings
- **low** Flow D has numbered steps and a content-only climax but never names Maya (EXPERIENCE.md §Key Flows · Flow D). *Fix:* Open with Maya (or “Maya, OS reduced-motion”) so the template matches A–C.
- **low** Flows B and D have resolution beats but no failure path; mount-fail / JS fallback live only in State Patterns (EXPERIENCE.md §Key Flows vs §State Patterns). *Fix:* One line each (Website pill absent; JS fail → CarouselChrome).
- **low** Foundation tags Maya as the same job as parent **UJ-1** Priya, but no flow title mirrors `UJ-1` (EXPERIENCE.md §Foundation, §Key Flows). *Fix:* Subtitle Flow A as “UJ-1 marketing-home slice” or drop the UJ-1 citation now that `scope` already parks UJ-1…UJ-5.

## 2. Token completeness — adequate
Extracted every YAML token in DESIGN.md frontmatter and every `{path.to.token}` in both spines. All color values are hex; `theme.modes: [light]` commits light-only. Cinema contrast pairs are stated and compute above floor: `{colors.stone-cinema}` on `{colors.paper-warm}` ≈ 5.58:1; `{colors.gold-cinema}` on `{colors.paper-warm}` ≈ 6.06:1; ink on paper ≈ 18.85:1; lagoon on lagoon-fg ≈ 6.22:1. EXPERIENCE `{components.*}` / `{colors.*}` / `{spacing.*}` refs resolve. Copy interpolations `{job sentence}` / `{navLabel}` / `{title}` are not DESIGN tokens (ok).

### Findings
- **medium** `{components.climax-micro-beat.translate-y}` is `4px` while DESIGN prose locks `translateY(-4px)` (DESIGN.md frontmatter `climax-micro-beat` vs §ClimaxMicroBeat). *Fix:* One signed value in both places (the beat is a lift: `-4px`).
- **medium** A6 omits the section eyebrow, but `{components.section-header.eyebrow}` still ships `{colors.gold-cinema}` (DESIGN.md frontmatter `section-header` vs §SectionHeader / EXPERIENCE.md §Section). *Fix:* Delete the `eyebrow` key or set `eyebrow: omit` so extractors do not render it.
- **medium** `{spacing.cinema-pin-hysteresis}: 0.03` is a unitless ratio in `spacing`, which the spec requires to be dimensions (DESIGN.md frontmatter `spacing`; EXPERIENCE.md §Interaction Primitives). *Fix:* Move to `{components.cinema-stage.hysteresis}` (or `3%`) so a token consumer is not told to emit `0.03` as CSS spacing.
- **low** `{spacing.cinema-copy-visual-gap}` (32px) is defined and never cited in Layout prose (DESIGN.md frontmatter vs §Layout & Spacing). *Fix:* Wire it between FeelingCopy and ProductFrame, or delete it.
- **low** Restated unused parent tokens (`success` / `warn` / `danger`, `ink-soft`, `lagoon-deep`, `display` / `marketing-display` / `public-hero`, `page-gutter` / `section-y`) (DESIGN.md frontmatter). *Fix:* Keep only cinema-touching tokens plus a one-line “inherit unused — do not invent cinema uses.”
- **low** `feeling-title` / `outcome-line` carry extra `note` keys beyond the spec’s typography subset; several `fontSize` values are `clamp(...)` strings (DESIGN.md `typography`). *Fix:* Legal CSS, but move `note` to prose if a strict resolver is expected.

## 3. Component coverage — adequate
Extracted names from DESIGN.md §Components headings, frontmatter `components`, EXPERIENCE.md §Component Patterns, and room `visual` fields. Core cinema set has real visual + behavioral rules (not one-word): `SectionHeader`, `SeekPills`, `CinemaStage`, `FeelingCopy`, `ProductFrame`, `ClimaxMicroBeat`, `CarouselChrome`, `LiveRegion`, `PrimaryButton`. Seek dots / chevrons fold into CarouselChrome. LiveRegion now has a DESIGN anatomy line (prior gap closed).

### Findings
- **medium** `InkProgress` has an EXPERIENCE Component Patterns row and a frontmatter token, but no DESIGN.md §Components heading — visual spec is nested under SeekPills (EXPERIENCE.md §Component Patterns; DESIGN.md §SeekPills / `components.ink-progress`). *Fix:* Add a `### InkProgress` visual row (2px, track `{colors.line}`, selected pill remains teacher) or fold the EXPERIENCE row into SeekPills.
- **low** `{components.cinematic-mask}` is specified visually and cited under ProductFrame, with no EXPERIENCE behavioral row (DESIGN.md frontmatter + §ProductFrame). *Fix:* One line under ProductFrame (“mask crops; still live DOM; no second mock”) is enough — or add a Component Patterns row.
- **low** `{components.button-secondary}` and `{components.hairline-rule}` exist in frontmatter with no Components body row and no EXPERIENCE pattern (DESIGN.md frontmatter). *Fix:* Remove, or mark inherited unused.
- **low** Dual naming: PascalCase experience components vs kebab tokens (`ProductFrame` / `{components.product-frame}`, `PrimaryButton` / `{components.button-primary}`, `SeekPills` / `seek-pill-idle|sticky|active`) (both spines). *Fix:* One mapping line at the top of each Components section.

## 4. State coverage — strong
Walked the single IA surface `/#crm` (six rooms as seek targets, not routes) for applicable states: empty (N/A except Website-omit), cold-load, hash land, in-pin *n*, seek, skip, climax armed/spent, Website epilogue, unpin/re-enter, focus (desktop pinned), reduced-motion, resize/`lg` remount, hash-while-in-section reset, mount/iframe failure, JS/cinema failure. Offline and permission-denied do not apply to static apex seed. Prior gaps (Focus, tablist vs `aria-current`, PRM remount, mock/mount failure) are now committed.

### Findings
- **low** Hover on idle pills / chevrons is specified in DESIGN and absent from State Patterns (DESIGN.md §SeekPills; EXPERIENCE.md §State Patterns). *Fix:* One Hover row pointing at DESIGN, or declare hover visual-only.

## 5. Visual reference coverage — thin
Listed workspace files: `imports/brainstorm-intent-live-proof-cinema.md`, `imports/craft-apple-iphone-17-pro-sg.md`, `imports/craft-tally-so.md` (all three linked from both intros). `mockups/` absent. `wireframes/` absent. `.working/` empty. Memlog claims `website-chapter-hollow-mock.png`; the file is not on disk and neither spine links it. Spines-win-on-conflict is stated once in each intro.

### Findings
- **high** No promoted mock or wireframe of the **desktop pin cinema** (stable stage + sticky SeekPills + 32/68 split) — the novel interaction. Only ASCII anatomy plus tokens (DESIGN.md §Layout & Spacing; EXPERIENCE.md §CinemaStage / Flow A). *Fix:* At least one `mockups/` HTML (Clients pinned + Follow-up climax) linked at CinemaStage / Flow A; name what it illustrates; keep spines-win.
- **medium** Memlog import `website-chapter-hollow-mock.png` (hollow Website + chapter chrome, the anti-pattern) does not exist under `imports/` and is unreferenced in the spines (`.memlog.md`; `imports/` listing). *Fix:* Restore the PNG into `imports/` and link it at Inspiration / Website room as “do not ship this,” or delete the memlog claim.
- **low** Craft notes are linked only from the intro, not at Inspiration where the Apple/Tally grammar is consumed (both spines intros vs EXPERIENCE.md §Inspiration). *Fix:* Repeat the relative `imports/craft-*.md` links at Inspiration with one-line captions.
- **low** Spines-win is present; there is no mock to conflict with yet. *Fix:* After mocks land, link them at IA + Components with the same spines-win line.

## 6. Bloat & overspecification — adequate
Checked for pixel specs duplicating tokens, source restatement, prose-where-table, unread sections, decorative narrative untied to a decision. DESIGN editorial voice is allowed; EXPERIENCE is mostly operational (Feeling → Scene → Proof tables are load-bearing copy, not decoration).

### Findings
- **medium** Locked A1–A7 and the six-room copy catalog are restated across Foundation, IA, Components, Layout, Key Flows, and Backup — extractors must hunt which table wins (EXPERIENCE.md §Foundation · Model, §Rooms, §Component Patterns; DESIGN.md §Components). *Fix:* One “Locked decisions (A1–A7)” table plus one copy table; elsewhere cite by id.
- **low** Full Midnight Atelier palette/type ramp restated “so this workspace is self-contained,” including tokens never used on `#crm` (DESIGN.md frontmatter + §Colors). *Fix:* Self-contain cinema-touching tokens; inherit the rest by `inherits`.

## 7. Inheritance discipline — adequate
Checked `sources` paths exist, UJ/requirement names vs intent (verbatim room jobs, feeling lines, CTA, kill list), glossary (Live Proof Cinema, Midnight Atelier, MarketingDemoClub, Maya, CarouselChrome, ClimaxMicroBeat), component-name identity, and EXPERIENCE `{token}` → DESIGN resolution. Parent DESIGN hex values match restated cinema colors. `inherits` points at `ux-cohestra-2026-07-18/DESIGN.md`. Zero `[ASSUMPTION]` markers remain; A1–A7 are memlog-locked.

### Findings
- **medium** Primary source still says “Fraunces/Sora”; DESIGN forbids a third family (“no Sora, no San Francisco”). Spines win, but the override is not in `.memlog.md` (imports/brainstorm-intent-live-proof-cinema.md Non-negotiables; DESIGN.md §Brand & Style). *Fix:* Memlog `override`: Sora is out; Plus Jakarta Sans is the instrument face.
- **low** Parent Shapes say avoid pill-full; cinema commits `{rounded.full}` on SeekPills with CTA staying `{rounded.md}` (parent DESIGN.md §Shapes; cinema DESIGN.md §Shapes). *Fix:* One explicit override sentence: “pill nav is the six-room seek control — exception to parent avoid-pill-full.” (Rationale is already there; name it as override.)
- **low** `marketing-section` / `marketing-lead` / `feeling-*` are marketing-shell / cinema deltas, not parent-frontmatter restatements (DESIGN.md §Typography vs parent DESIGN.md). *Fix:* Keep the “marketing shell” label; do not say they inherit from Midnight Atelier YAML.
- **low** Both spines `status: draft` during Reviewer Gate — expected, not handoff-ready (both frontmatter). *Fix:* `final` only after visual coverage and the signed-token / eyebrow traps close.

## 8. Shape fit — strong
DESIGN.md body order matches canonical Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts; none omitted that the surface needs; no out-of-order extras. EXPERIENCE required defaults present (Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows). Triggered sections present (Inspiration — Apple/Tally in sources + memlog; Responsive — desktop pin + mobile click-tabs). Invented **Backup & Rollback** earns its place (live bodies on every fallback; never revive chapter chrome). Invented Foundation Model / Kill-keep / Data & Mount are load-bearing, not furniture.

### Findings
- **low** Key Flows sit before Inspiration & Responsive; example spines put Key Flows last (EXPERIENCE.md heading order vs `experience-example-shadcn.md`). *Fix:* Optional move Key Flows after Responsive so extractors find journeys where the template puts them.
- **low** DESIGN frontmatter carries BMad extras (`status`, `theme`, `sources`, `inherits`, `scope`, `design`) beyond Google Labs token keys — matches org / prior Cohestra cinema spines. *Fix:* None.

## Mechanical notes
- **Broken / missing paths:** Relative parent links `../ux-cohestra-2026-07-18/DESIGN.md` and `../ux-cohestra-2026-08-31/EXPERIENCE.md` resolve. Implementation paths `web/components/marketing/marketing-product-cinema.tsx`, `use-marketing-product-cinema.ts`, `web/lib/marketing/product-slides.tsx` resolve. `imports/craft-*.md` and `imports/brainstorm-intent-live-proof-cinema.md` resolve. `imports/website-chapter-hollow-mock.png` does **not** exist (memlog-only). `mockups/` and `wireframes/` directories do not exist.
- **Name inconsistencies:** `Follow-up` navLabel vs room id `outreach` / `ProductSlideId` (committed, but extractors need the id table). `InkProgress` vs `{components.ink-progress}`. `PrimaryButton` vs `{components.button-primary}`. `SeekPills` vs `seek-pill-idle|sticky|active`. Maya (this spine) vs Priya (parent UJ-1).
- **Frontmatter completeness:** Both spines share `name`, `description`, `status: draft`, `created`/`updated`, `sources`, `scope`, `design: ./DESIGN.md`. DESIGN has `theme`, `inherits`, full token blocks. EXPERIENCE has `implementation`. YAML list items use unquoted `{planning_artifacts}/…`, which **fails strict YAML parse** (`expected <block end>, but found '<scalar>'`) — same BMad convention as skill examples; quote those strings if a machine resolver is in the chain. `craft_reference: https://…` mappings inside `sources` are likewise non-string list items.
- **Cross-refs:** EXPERIENCE `{components.seek-pill-sticky}`, `{components.feeling-crossfade}`, `{components.climax-micro-beat}`, `{components.button-primary}`, `{components.seek-dot-idle}`, `{colors.stone-cinema}`, `{colors.gold-cinema}`, `{colors.paper-warm}`, `{spacing.header-offset}`, `{spacing.cinema-surface-scroll}`, `{spacing.cinema-pin-hysteresis}`, `{spacing.cinema-stage-span}`, `{spacing.cinema-copy-span}` all resolve. `{job sentence}` / `{navLabel}` / `{title}` / `{n}` are copy interpolations, not tokens. Self-conflict: climax `translate-y` sign (see §2).
- **Mermaid:** None. ASCII stage diagram in DESIGN.md §Layout & Spacing — valid, no syntax issues.
- **Copy fidelity:** EXPERIENCE room tables match intent feeling/job/feeling-line verbatim (Clients…Website). CTA, thesis (A3), omitted eyebrow (A6), Website omit-if-heavy (A5) match locked memlog decisions.
- **Open `[ASSUMPTION]` count:** **Zero** in either spine. Remaining extract traps are conflicts (signed translate, dead eyebrow token, Sora in intent), not unmarked assumptions.
- **Contrast (computed, for the record):** stone on paper-warm 2.85:1 (correctly banned); gold on paper-warm 2.97:1 (correctly prefer gold-cinema); cinema tokens clear AA as claimed.
