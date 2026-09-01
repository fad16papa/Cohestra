# Spine Pair Review — cohestra

## Overall verdict
The pair is a strong **intent contract** for Designed Chapter cinema (constraints, anti-patterns, verbatim copy, dual-mode desktop/mobile), but not yet a clean **source-extract contract** for architecture or story-dev. Load-bearing pin physics, climax optionality, and desktop a11y semantics remain `[ASSUMPTION]`; the only visual is the current-carousel backup, with no cinema-pin mock. Consumers can implement the *rules* but must invent scrub geometry and resolve open decisions before coding.

## 1. Flow coverage — adequate
Checked `sources` frontmatter (parent `ux-cohestra-2026-07-18` EXPERIENCE + DESIGN, Apple craft URL, import PNG) for UJ / requirement names; walked EXPERIENCE Key Flows A–D against memlog-locked journeys (desktop cinema, mobile model a, seek/skip Website, reduced-motion = current carousel). Verified named protagonist, numbered steps, climax beat, and failure/escape where present.

### Findings
- **high** Parent EXPERIENCE is a listed source and defines UJ-1…UJ-5 (plus Billing / Plan upgrade surface-closure needs); this spine has no Key Flows under those names and does not declare them out of scope (EXPERIENCE.md `sources`, parent EXPERIENCE.md §Surface closure / §Key Flows). *Fix:* Drop parent EXPERIENCE from `sources` (keep DESIGN inherit), or add a one-line scope table: “UJ-1…UJ-5 → parent spine; this workspace = `/#crm` cinema only.”
- **high** Pin scrub math that drives the whole desktop model is still `[ASSUMPTION]` — equal sixths, `~90vh` per chapter, `~2–4%` hysteresis (EXPERIENCE.md §Interaction Primitives; DESIGN.md §Layout & Spacing). *Fix:* Commit concrete progress ranges, track length, and boundary hysteresis (or mark them open blockers, not silent assumptions).
- **high** ClimaxMicroBeat is “optional” with assumed magnitude / settle-back-to-1 (EXPERIENCE.md Foundation + §Component Patterns; DESIGN.md §ClimaxMicroBeat). *Fix:* Decide ship / no-ship and lock scale, lift, and rest state for story acceptance.
- **medium** Flow D (Reduced motion) has no named protagonist and a content-only climax; Flows B/D lack explicit failure paths (EXPERIENCE.md §Key Flows). *Fix:* Narrate Priya under reduced-motion; add one failure/escape beat each (e.g. JS fallback → CarouselChrome).
- **medium** Cinema journeys never mirror parent name **UJ-1** even though Priya is tagged as that prospect (EXPERIENCE.md Foundation + Flow A). *Fix:* Title Flow A as a UJ-1 marketing-home slice, or stop citing UJ-1.
- **low** `90vh × 6` chapters ≈ 5.4 viewports of pin, tension with “without a marathon pin” (DESIGN.md §Layout & Spacing). *Fix:* Reconcile track length with the anti-marathon claim (shorter per-chapter or shared track).

## 2. Token completeness — adequate
Extracted all YAML frontmatter tokens and every `{path.to.token}` in both spines. Verified hex on colors; light-only mode is committed (`theme.modes: [light]`). Checked load-bearing contrast pairings stated in DESIGN.md §Colors.

### Findings
- **high** Load-bearing `{colors.stone}` on `{colors.paper-warm}` (leads) and `{colors.gold}` on `{colors.paper-warm}` (eyebrows) have no numeric contrast targets; computed ≈ **2.85:1** and **2.97:1** — below WCAG AA body (4.5:1) / large-text (3:1) floors for a consumer conversion surface (DESIGN.md §Colors). *Fix:* State target ratios; either commit the inherited pairing with an explicit AA exception + remediation path, or darken stone/gold for cinema leads/eyebrows.
- **medium** Bullet body uses bare `ink/85` (Tailwind opacity), not a defined token (DESIGN.md §ChapterCopy). *Fix:* Add `{colors.ink-85}` (or equivalent) with hex/alpha, or cite `{colors.ink}` + opacity rule in frontmatter.
- **medium** `{spacing.cinema-copy-visual-gap}` (48px) is defined but never cited in Layout prose; live carousel uses `gap-8` / `lg:gap-12` (DESIGN.md frontmatter vs §Layout & Spacing). *Fix:* Wire the token into the pinned anatomy and name mobile vs `lg` gaps.
- **low** `climax-scale` / `climax-lift` live under `spacing` though they are transform magnitudes, not spacing dimensions (DESIGN.md frontmatter). *Fix:* Move to `components.climax-micro-beat` only (already referenced there).
- **low** Several restated parent tokens are unused on this surface (`success`/`warn`/`danger`, `display`/`marketing-display`, `button-primary`, `page-gutter`/`section-y`) (DESIGN.md frontmatter). *Fix:* Trim to cinema-used + explicitly inherited aliases, or mark “inherited unused — do not invent cinema uses.”

## 3. Component coverage — adequate
Extracted component names from DESIGN.md Components, EXPERIENCE.md Component Patterns, frontmatter `components`, and chapter `visual` fields. Core cinema set (`SectionHeader`, `ChapterPills`, `CinemaStage`, `ChapterCopy`, `ProductFrame`, `ClimaxMicroBeat`, `CarouselChrome`) has visual + behavioral rows with real rules.

### Findings
- **medium** `LiveRegion` has a behavioral row but no DESIGN.md Components visual/anatomy entry (EXPERIENCE.md §Component Patterns). *Fix:* Add a one-line DESIGN note (`sr-only`, polite, atomic) or fold LiveRegion into CarouselChrome/ChapterPills as a required child.
- **medium** `BulletRow` is named in DESIGN.md §ChapterCopy but has no EXPERIENCE behavioral row (behavior folded into ChapterCopy). *Fix:* Either add a Component Patterns row or stop naming BulletRow as a separate component.
- **low** Frontmatter defines `button-primary` and `hairline-rule` with no Components body rows and no EXPERIENCE patterns (DESIGN.md frontmatter). *Fix:* Remove or document as inherited unused.
- **low** Dual naming: PascalCase experience components vs kebab token keys (`ProductFrame` / `BrowserFrame` / `{components.browser-frame}`) (both spines). *Fix:* One mapping table (display name → token key) at the top of Components / Component Patterns.
- **low** Six showcase mocks are named as chapter visuals but are not in either component table (EXPERIENCE.md §Chapters). *Fix:* Acceptable as implementation refs if each links to `web/components/marketing/…`; add file paths next to `visual:` for extractors.

## 4. State coverage — adequate
Walked the single IA surface (`/#crm`) for applicable states: cold-load, hash land, in-pin chapter *n*, seek, skip, climax armed/spent, unpin, reduced-motion, resize across `lg`, JS/cinema failure. Empty / permission-denied largely N/A for static marketing.

### Findings
- **high** No Focus state for keyboard on desktop pills while the stage is pinned — load-bearing for sticky pin + consumer a11y (EXPERIENCE.md §State Patterns vs §Accessibility Floor). *Fix:* Add Focus row: ring visibility against `{colors.paper-warm}`, tab order while pinned, no focus trap, arrow-key behavior once committed.
- **medium** Desktop tablist vs `aria-current` seek-button semantics still `[ASSUMPTION]` (EXPERIENCE.md §Accessibility Floor) — state/role of chapter controls is not committed. *Fix:* Lock one pattern and reflect it in State Patterns + Component Patterns.
- **medium** No state for mock/visual render failure or mid-session `prefers-reduced-motion` change (EXPERIENCE.md §State Patterns). *Fix:* Specify fallback (keep last good chapter + CarouselChrome) and remount rule on media-query change.
- **low** Hover on idle pills / chevrons is specified in DESIGN but absent from State Patterns (DESIGN.md §ChapterPills; EXPERIENCE.md §State Patterns). *Fix:* One Hover row pointing at DESIGN treatment, or declare hover visual-only.

## 5. Visual reference coverage — thin
Listed workspace artifacts: `imports/current-product-carousel-website-slide.png` (present, ~209KB); `mockups/` absent; `wireframes/` absent; `.working/` empty. Checked inline spine links and spines-win-on-conflict statements.

### Findings
- **high** No promoted mock/wireframe of the **desktop cinema pin** (stable stage + scrub track) — the novel interaction. Only ASCII anatomy in DESIGN.md §Layout & Spacing. *Fix:* Add at least one `mockups/` HTML (or wireframe) of pinned Clients + pinned Website climax; link inline at CinemaStage / Flow A.
- **medium** Sole import is the **current carousel** Website slide (dots + chevrons visible) — correctly named as backup / Website reference, but cannot illustrate pin, scrub, or climax (DESIGN.md / EXPERIENCE.md intros; EXPERIENCE.md §Inspiration, §Backup & Rollback). *Fix:* Keep import for rollback; add cinema-specific visuals so implementers are not inventing pin geometry.
- **low** Apple craft URL is cited as grammar-only; no local capture of the pin/scrub pattern for offline extract (both spines `sources` / Inspiration). *Fix:* Optional: save a redacted scroll-grammar note or annotated stills under `imports/` with “grammar only” caption.
- **low** Spines-win-on-conflict is stated in both intros (good); neither spine links a cinema mock because none exist. *Fix:* After mocks land, link at IA + Components with the same spines-win line (already present).

## 6. Bloat & overspecification — adequate
Checked for pixel specs duplicating tokens, source restatement, prose-where-table, unread sections, decorative narrative untied to decisions. DESIGN editorial voice allowed; EXPERIENCE should stay operational.

### Findings
- **medium** Verbatim six-chapter copy catalogs dominate IA (EXPERIENCE.md §Chapters) — load-bearing for “no copy cut,” but they restate live `PRODUCT_SLIDES` and inflate IA vs example spines. *Fix:* Keep one locked copy table (or “source of truth = `PRODUCT_SLIDES`”) and shrink IA to surface + chapter ids + seek order.
- **low** Full Midnight Atelier palette/type ramp restated “so this workspace is self-contained,” including tokens never used on `#crm` (DESIGN.md frontmatter + §Colors). *Fix:* Self-contain only cinema-touching tokens; inherit the rest by reference.
- **low** EXPERIENCE Inspiration borrows a light editorial beat (“the object holds still”) — fine for that section; elsewhere EXPERIENCE stays operational. *Fix:* No change required unless tightening for extractors.

## 7. Inheritance discipline — adequate
Checked `sources` resolution, UJ/requirement name fidelity, glossary consistency (Midnight Atelier, Designed Chapter cinema, True Apple, Beat×6, Priya), component-name identity across sections, and EXPERIENCE `{token}` → DESIGN resolution.

### Findings
- **high** Memlog lists secondary context (`landing-pricing-ux`, website-builder PRD) and earlier “sources pending,” but frontmatter `sources` omits them and instead lists full parent EXPERIENCE (`.memlog.md`; both spines `sources`). *Fix:* Align frontmatter with actual inheritance: parent DESIGN (+ `inherits`), craft URL, import PNG; add PRDs only if extractors must read them.
- **medium** Parent DESIGN Shapes say avoid pill-full; cinema commits `{rounded.full}` for chapter pills (parent DESIGN.md §Shapes; cinema DESIGN.md §Shapes). *Fix:* Explicit override note: “pill nav is the existing six-chapter control — exception to parent avoid-pill-full.”
- **medium** `marketing-section` / `marketing-lead` / chapter type tokens exist in live CSS and this DESIGN, but not in parent DESIGN.md — inheritance claim “restate from Midnight Atelier” overstates parent frontmatter (DESIGN.md §Typography vs parent DESIGN.md). *Fix:* Label these as marketing-shell / live-token deltas, not parent-frontmatter restatements.
- **low** Glossary and anti-pattern names are consistent across both spines and memlog. Token cross-refs from EXPERIENCE resolve. *Fix:* None.
- **low** Both spines `status: draft` while Reviewer Gate is running — expected; not final for handoff. *Fix:* Set `final` only after assumptions closed.

## 8. Shape fit — strong
Checked DESIGN.md section order against canonical Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts. Checked EXPERIENCE required defaults (Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows) and triggered sections (Inspiration, Responsive). Invented Backup & Rollback evaluated for earning its place.

### Findings
- **low** Invented **Backup & Rollback** earns its place (memlog-locked constraint); keep it (EXPERIENCE.md §Backup & Rollback). *Fix:* None.
- **low** DESIGN frontmatter carries BMad extras (`status`, `theme`, `sources`, `inherits`) beyond Google Labs token keys — matches org pattern / EXPERIENCE examples. *Fix:* None.
- **low** IA carries heavy copy catalogs (shape stretch vs example IA tables) but remains defensible as the locked conversion copy contract. *Fix:* Optional relocate to a “Locked copy” subsection under Voice and Tone.

## Mechanical notes
- **Broken / missing paths:** None for listed import — `imports/current-product-carousel-website-slide.png` resolves. `mockups/` and `wireframes/` directories do not exist (not broken links; coverage gap). Relative parent links `../ux-cohestra-2026-07-18/DESIGN.md` resolve. Implementation path `web/components/marketing/marketing-product-carousel.tsx` resolves; showcase components exist under `web/components/marketing/`.
- **Name inconsistencies:** `ProductFrame` / `BrowserFrame` / `browser-frame`; `ChapterPills` vs `chapter-pill-idle|active`; `ClimaxMicroBeat` vs `climax-micro-beat`; `CinemaStage` vs `cinema-stage`. EXPERIENCE lists `LiveRegion`; DESIGN does not. `BulletRow` only in DESIGN prose.
- **Frontmatter completeness:** Both spines share `name`, `status: draft`, `created`/`updated`, `sources`. DESIGN has `description`, `theme`, `inherits`, full token blocks. EXPERIENCE has `design: ./DESIGN.md`, `implementation: …`. YAML list items use unquoted `{planning_artifacts}/…` (BMad convention; strict YAML flow-mapping risk — same as skill examples).
- **Cross-refs:** EXPERIENCE `{components.chapter-crossfade}`, `{components.climax-micro-beat}`, `{components.browser-frame}`, `{colors.paper-warm}`, `{colors.paper}`, `{spacing.cinema-chapter-scroll}` all resolve. Copy interpolations `{navLabel}` / `{title}` are not DESIGN tokens (OK).
- **Mermaid:** None. Layout uses ASCII stage diagram (DESIGN.md §Layout & Spacing) — valid; no syntax issues.
- **Copy fidelity:** EXPERIENCE chapter tables match live `PRODUCT_SLIDES` verbatim (ids, navLabels, eyebrows, titles, leads, four points each) — strong inheritance from implementation.
- **Open `[ASSUMPTION]` count (load-bearing):** desktop `lg` cinema gate; pin track `90vh`/chapter; equal progress ranges; hysteresis; climax magnitude + settle; desktop pills-only (no dots/chevrons); arrow keys on pills; tablist vs `aria-current`; re-enter pin from above/below; resize remount preserves chapter id; shared frame chrome radius; no mobile swipe; Priya = parent UJ-1 prospect.
