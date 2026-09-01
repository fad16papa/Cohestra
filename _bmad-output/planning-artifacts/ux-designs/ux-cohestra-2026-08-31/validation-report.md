# Validation Report — cohestra Landing Product Cinema

- **DESIGN.md:** `_bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-08-31/DESIGN.md`
- **EXPERIENCE.md:** `_bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-08-31/EXPERIENCE.md`
- **Run at:** 2026-08-31T16:45:00Z

## Overall verdict

The pair is a strong **intent contract** for Designed Chapter cinema (constraints, anti-patterns, verbatim copy, dual-mode desktop/mobile), but not yet a clean **source-extract contract** for architecture or story-dev. Load-bearing pin physics, climax optionality, and desktop a11y semantics remain `[ASSUMPTION]`; the only visual is the current-carousel backup, with no cinema-pin mock. Consumers can implement the *rules* but must invent scrub geometry and resolve open decisions before coding.

The accessibility lens shifts that from “lock assumptions before extract” to **do not build**. The spines want the right floor — reduced-motion is the real carousel, not a dimmed film; pills are named; there is no autoplay; mobile does not pin — then leave the dangerous parts as `[ASSUMPTION]`. Desktop cinema as drawn is a sticky-on-sticky scroll machine whose only skip control **leaves the viewport**, whose live region will **narrate the scrub**, and whose inherited stone/gold pairings **fail 1.4.3** on the copy and seek labels the section now depends on. Polish can wait; trapping Priya in ~540vh of unlabeled progress cannot.

## Category verdicts

- Flow coverage — adequate
- Token completeness — adequate
- Component coverage — adequate
- State coverage — adequate
- Visual reference coverage — thin
- Bloat & overspecification — adequate
- Inheritance discipline — adequate
- Shape fit — strong

## Findings by severity

Deduped across `review-rubric.md` and `review-accessibility.md`. Overlaps keep the source severity (higher when both lenses hit the same defect). Sources noted in brackets.

### Critical (3)

- **[Accessibility]** Seek chrome leaves the viewport once the pin starts. Desktop `ChapterPills` sit *above* the pin track and are not sticky, so the only skip/seek UI is gone after scrub begins. Keyboard and screen-reader cursor users who entered via scroll must discover Website by scrolling — the opposite of the locked “seek / escape” decision. Tabbing back to a pill `scrollIntoView`s the intro and fights pin `progress`. (EXPERIENCE Component Patterns `ChapterPills`; DESIGN Layout anatomy; Interaction Primitives “Pills”; Flow C.) *Fix:* Keep seek chrome visible and operable for the entire pin (sticky pills under the header, or a persistent “Website” control). Focusing a pill must not rewrite progress except on explicit Activate; use `preventScroll` on programmatic focus where needed.

- **[Accessibility]** Sticky marketing header plus unspecified cinema pin collides with WCAG 2.4.11 Focus Not Obscured. Floor says the pin must not cover the focused pill or the header, and that `#crm` uses `scroll-mt-24` — that offset only fixes hash landing of the *section*, not `position: sticky` `top` on the stage. `top: 0` puts ChapterCopy / H3 under the bar; a higher z-index covers header nav. (EXPERIENCE Accessibility Floor; State `#crm`; Responsive “Hash `#crm` + sticky marketing header”; DESIGN pinned anatomy.) *Fix:* Lock pin `top` to header height (not `0`), pin `z-index` below the header, `scroll-margin` on pills ≥ header height, and a written 2.4.11 check: focused pill, focused header link, and chapter H3 are never fully covered while pinned.

- **[Accessibility + Rubric: Flow coverage]** Scroll-trap is named (“no scroll-jack”) but not contractually banned; six × `{spacing.cinema-chapter-scroll}` (90vh) ≈ **5.4 extra viewports** with no in-track escape — tension with DESIGN’s “without a marathon pin.” “Wheel / trackpad / keyboard page scroll all drive the same progress” is how implementers justify `preventDefault` on `wheel`/`touchmove`/`keydown`. That is a trap: it breaks assistive cursor scrolling, find-in-page, and Space/PageDown when focus is not on a button. (EXPERIENCE Interaction Primitives Pin/Escape/Banned; Accessibility Floor “pin must not trap focus”; DESIGN §Layout & Spacing.) *Fix:* Native scroll only. Map `scrollY` → chapter index. Forbid preventing default on wheel/touch/keyboard. “Escape” = continue scrolling *and* a visible seek control. Reconcile track length with the anti-marathon claim (shorter per-chapter or shared track).

### High (12)

- **[Rubric: Flow coverage]** Parent EXPERIENCE is a listed source and defines UJ-1…UJ-5 (plus Billing / Plan upgrade surface-closure needs); this spine has no Key Flows under those names and does not declare them out of scope. (EXPERIENCE.md `sources`; parent EXPERIENCE.md §Surface closure / §Key Flows.) *Fix:* Drop parent EXPERIENCE from `sources` (keep DESIGN inherit), or add a one-line scope table: “UJ-1…UJ-5 → parent spine; this workspace = `/#crm` cinema only.”

- **[Rubric: Flow coverage]** Pin scrub math that drives the whole desktop model is still `[ASSUMPTION]` — equal sixths, `~90vh` per chapter, `~2–4%` hysteresis. (EXPERIENCE.md §Interaction Primitives; DESIGN.md §Layout & Spacing.) *Fix:* Commit concrete progress ranges, track length, and boundary hysteresis (or mark them open blockers, not silent assumptions).

- **[Rubric: Flow coverage]** ClimaxMicroBeat is “optional” with assumed magnitude / settle-back-to-1. (EXPERIENCE.md Foundation + §Component Patterns; DESIGN.md §ClimaxMicroBeat.) *Fix:* Decide ship / no-ship and lock scale, lift, and rest state for story acceptance.

- **[Rubric: Token completeness + Accessibility]** Load-bearing `{colors.stone}` on `{colors.paper-warm}` (leads, ≈2.85:1) and `{colors.gold}` on `{colors.paper-warm}` (eyebrows, ≈2.97:1) fail WCAG 1.4.3; idle pill `{colors.stone}` on `{colors.paper}` is **3.00:1** for `text-sm` seek names. `{typography.chapter-lead}` is ~16px regular (needs 4.5:1, not large-text 3:1); gold eyebrows at 13px `{typography.section}` are plan information, not decoration. DESIGN “Do not lighten stone for cinema density” cements the failure. No numeric contrast targets in the spine. Ink/paper titles and active pill paper-on-ink pass; lagoon on paper-warm ~5.8:1 passes. (DESIGN.md §Colors, ChapterPills, ChapterCopy.) *Fix:* Cinema-specific text tokens: darken stone for leads/idle labels to ≥4.5:1 on paper-warm (ink-soft `#141C24` works). Gold eyebrows: darker gold or ink + a non-color-only “Pro” treatment. State target ratios; do not ship idle chapter names at 3:1.

- **[Rubric: State coverage]** No Focus state for keyboard on desktop pills while the stage is pinned — load-bearing for sticky pin + consumer a11y. (EXPERIENCE.md §State Patterns vs §Accessibility Floor.) *Fix:* Add Focus row: ring visibility against `{colors.paper-warm}`, tab order while pinned, no focus trap, arrow-key behavior once committed.

- **[Rubric: Visual reference coverage]** No promoted mock/wireframe of the **desktop cinema pin** (stable stage + scrub track) — the novel interaction. Only ASCII anatomy in DESIGN.md §Layout & Spacing. `mockups/` and `wireframes/` absent. *Fix:* Add at least one `mockups/` HTML (or wireframe) of pinned Clients + pinned Website climax; link inline at CinemaStage / Flow A.

- **[Rubric: Inheritance discipline]** Memlog lists secondary context (`landing-pricing-ux`, website-builder PRD) and earlier “sources pending,” but frontmatter `sources` omits them and instead lists full parent EXPERIENCE. (`.memlog.md`; both spines `sources`.) *Fix:* Align frontmatter with actual inheritance: parent DESIGN (+ `inherits`), craft URL, import PNG; add PRDs only if extractors must read them.

- **[Accessibility + Rubric: State coverage]** `prefers-reduced-motion` fallback is the right idea and the wrong spec completeness. Flow D / state table swap to CarouselChrome (no pin, no scrub, no climax, instant swap), but: (1) DESIGN still specifies idle-pill hover `translateY(-2px)` and 400ms `{components.chapter-crossfade}` with no PRM exception; live CSS kills enter animation but **not** pill hover lift. (2) No rule for PRM toggling mid-pin — spacer must collapse without leaving the visitor stranded ~400vh down the page. (3) Reduced-motion desktop **gains** dots/chevrons while motion-safe desktop **drops** them — skip-parity is untested. Rubric also flagged missing mid-session PRM state. (EXPERIENCE State `prefers-reduced-motion`; Backup & Rollback; DESIGN ChapterPills hover + chapter-crossfade + ClimaxMicroBeat.) *Fix:* PRM = current carousel **behavior and chrome**, including hover/animation kill. Listen to `matchMedia('change')`. On PRM flip: remount CarouselChrome, restore chapter **id**, **do not** keep pin spacer height.

- **[Accessibility]** Live region policy treats scrub like a click. “Announce chapter changes… `Showing {navLabel}: {title}`” on every chapter change will fire **six polite announcements** on a single flick through the pin (more if hysteresis flickers). Polite queues drop, interrupt bullet reading, and desync from the visual chapter. Today the region only updates on `goTo` (explicit); cinema makes chapter a scroll side effect and keeps the same string. (EXPERIENCE Voice and Tone; LiveRegion; State “In-pin, chapter n”; Interaction hysteresis assumption.) *Fix:* Announce on **explicit seek** immediately. For scrub: update visual + `aria-current`/`aria-selected` continuously; **debounce** the live region until progress settles (scrollend or ~200–400ms idle); suppress duplicate strings. Keep `polite` + `atomic`. Never `assertive` on scrub.

- **[Accessibility + Rubric: State coverage]** Name, role, value is an unresolved fork: “prefer tablist if it maps 1:1” *or* scroll-seek buttons with `aria-current`. Rubric flagged this as medium (uncommitted state/role); accessibility raises it to **high** — it is not a floor, it is a coin toss. Tablist without APG plus a single tabpanel whose `id` changes fails 4.1.2 in spirit. Arrow-keys-on-pill collide with page-scroll. (EXPERIENCE Accessibility Floor “Name, role, value”; Interaction Pills keyboard; State Patterns.) *Fix:* Lock one model. Recommended: both breakpoints use tablist/tab/tabpanel with roving tabindex, Left/Right (Home/End), `aria-selected`, one selected tab in tab order, and a **stable panel id** (or six panels with `hidden`). Do not mix `aria-current` and `aria-selected` on the same node. Chevrons remain buttons. Write what Up/Down/Space/PageDown do in one sentence.

- **[Accessibility]** WCAG 2.5.8 Target Size (Minimum) is already failed by the chrome cinema **preserves as the mobile + PRM path**. `{components.chapter-dot-idle}` is **6×6px** with `gap-1.5` (6px) — neither 24×24 nor 24px spacing. Active dot is 24×**6**. Live buttons: `h-1.5 w-1.5`. Desktop cinema **removes** chevrons, so motion-safe `lg+` has no 40px pager at all. (DESIGN chapter-dot-*; CarouselChrome; EXPERIENCE “dots/chevrons not required” on desktop.) *Fix:* Hit area ≥24×24 (padding / `min-h/min-w` with visible 6px glyph). Keep names (`Go to {navLabel}`). If desktop has no dots, **pills must stay reachable** (critical seek-chrome finding) — do not delete the only oversized control.

- **[Accessibility]** Resize across `lg` and orientation change are an assumption, not a failure mode. “Remount the appropriate model without losing chapter id” ignores pin spacer height (collapsing ~540vh jumps the page; injecting it lands mid-scrub unless `scrollTop` is rewritten); focus loss when chevrons unmount at `lg+`; iPad landscape/split-view oscillating across 1024; two `scrollTop` owners (smooth-seek vs wheel); header Clients → `/#crm` while already pinned on Website often does nothing. (EXPERIENCE State Resize; Hash; Seek via pill; Responsive `lg`.) *Fix:* On breakpoint/PRM change: map `id`, synchronously set scroll so the section is in view at the matching model, move focus to the active pill if focus was inside unmounted chrome. Hash/nav to `#crm` **always** resets to Clients even when already in section. Seek smooth-scroll **cancels** on user wheel/touch/Escape.

### Medium (16)

- **[Rubric: Flow coverage]** Flow D (Reduced motion) has no named protagonist and a content-only climax; Flows B/D lack explicit failure paths. (EXPERIENCE.md §Key Flows.) *Fix:* Narrate Priya under reduced-motion; add one failure/escape beat each (e.g. JS fallback → CarouselChrome).

- **[Rubric: Flow coverage]** Cinema journeys never mirror parent name **UJ-1** even though Priya is tagged as that prospect. (EXPERIENCE.md Foundation + Flow A.) *Fix:* Title Flow A as a UJ-1 marketing-home slice, or stop citing UJ-1.

- **[Rubric: Token completeness]** Bullet body uses bare `ink/85` (Tailwind opacity), not a defined token. (DESIGN.md §ChapterCopy.) *Fix:* Add `{colors.ink-85}` (or equivalent) with hex/alpha, or cite `{colors.ink}` + opacity rule in frontmatter.

- **[Rubric: Token completeness]** `{spacing.cinema-copy-visual-gap}` (48px) is defined but never cited in Layout prose; live carousel uses `gap-8` / `lg:gap-12`. (DESIGN.md frontmatter vs §Layout & Spacing.) *Fix:* Wire the token into the pinned anatomy and name mobile vs `lg` gaps.

- **[Rubric: Component coverage]** `LiveRegion` has a behavioral row but no DESIGN.md Components visual/anatomy entry. (EXPERIENCE.md §Component Patterns.) *Fix:* Add a one-line DESIGN note (`sr-only`, polite, atomic) or fold LiveRegion into CarouselChrome/ChapterPills as a required child.

- **[Rubric: Component coverage]** `BulletRow` is named in DESIGN.md §ChapterCopy but has no EXPERIENCE behavioral row (behavior folded into ChapterCopy). *Fix:* Either add a Component Patterns row or stop naming BulletRow as a separate component.

- **[Rubric: State coverage]** No state for mock/visual render failure (mid-session PRM change merged into the high PRM finding). (EXPERIENCE.md §State Patterns.) *Fix:* Specify fallback (keep last good chapter + CarouselChrome).

- **[Rubric: Visual reference coverage]** Sole import is the **current carousel** Website slide (dots + chevrons visible) — correctly named as backup / Website reference, but cannot illustrate pin, scrub, or climax. (DESIGN.md / EXPERIENCE.md intros; EXPERIENCE.md §Inspiration, §Backup & Rollback.) *Fix:* Keep import for rollback; add cinema-specific visuals so implementers are not inventing pin geometry.

- **[Rubric: Bloat & overspecification]** Verbatim six-chapter copy catalogs dominate IA — load-bearing for “no copy cut,” but they restate live `PRODUCT_SLIDES` and inflate IA vs example spines. (EXPERIENCE.md §Chapters.) *Fix:* Keep one locked copy table (or “source of truth = `PRODUCT_SLIDES`”) and shrink IA to surface + chapter ids + seek order.

- **[Rubric: Inheritance discipline]** Parent DESIGN Shapes say avoid pill-full; cinema commits `{rounded.full}` for chapter pills. (parent DESIGN.md §Shapes; cinema DESIGN.md §Shapes.) *Fix:* Explicit override note: “pill nav is the existing six-chapter control — exception to parent avoid-pill-full.”

- **[Rubric: Inheritance discipline]** `marketing-section` / `marketing-lead` / chapter type tokens exist in live CSS and this DESIGN, but not in parent DESIGN.md — inheritance claim “restate from Midnight Atelier” overstates parent frontmatter. (DESIGN.md §Typography vs parent DESIGN.md.) *Fix:* Label these as marketing-shell / live-token deltas, not parent-frontmatter restatements.

- **[Accessibility]** Non-text contrast 1.4.11 on idle chrome: `{colors.line}` `#E6E9ED` on paper-warm is **~1.11:1** (idle dots); idle pill border line-on-paper **~1.18:1**; idle pill fill paper on paper-warm is nearly invisible. If the border/dot is how you see “this is a control / this many chapters,” it fails 3:1. Active lagoon dot passes. (DESIGN chapter-pill-idle, chapter-dot-idle.) *Fix:* Idle indicators ≥3:1 against canvas. Idle pill: stronger border or ink-muted text (with 1.4.3 fix above).

- **[Accessibility]** Focus appearance is hand-waved (“existing marketing focus”). Carousel pills/dots have **no** `focus-visible` ring in ground truth — global `outline-ring/50` plus `ring/50` on paper-warm is a weak tell. Sticky pin makes a clipped or header-overlapped ring a 2.4.7 / 2.4.13-adjacent failure. Complementary to the rubric Focus *state* gap (high). (EXPERIENCE Accessibility Floor; DESIGN has no cinema focus token.) *Fix:* Explicit `focus-visible` ring: solid ink or lagoon **≥3:1** vs adjacent paper-warm, offset so sticky header cannot clip it (`scroll-margin`).

- **[Accessibility]** Mobile tablist is “keep today’s” including today’s holes: all six tabs in tab order (no roving tabindex), **no** arrow-key behavior in live code, `<sm` horizontal `overflow-x-auto` nowrap row, one swapping tabpanel. Cinema adds `aria-live` on the same click path — activating a tab then **double-speaks**. Horizontal overflow without a visible “more” affordance hides Follow-up…Website off-screen. (EXPERIENCE Mobile / CarouselChrome; DESIGN Responsive `<sm`; live tablist.) *Fix:* APG tablist on mobile too. Delay or skip live region when `aria-selected` already changed from a user activate. Below `sm`, wrap or show peek/scroll hint; do not require a horizontal gesture (2.5.1) to reach Website.

- **[Accessibility]** Mocks stay `aria-hidden` (correct) but the spine never requires **no tab stops**. `aria-hidden` does not remove descendants from tab order; a future “real product” mock with a button would create 2.4.3 / 4.1.2 hidden focus. (EXPERIENCE ProductFrame; Accessibility Floor.) *Fix:* `aria-hidden` **and** `inert` (or no controls in mocks). Written test: tab from last pill to next **page** landmark with zero stops inside the frame.

- **[Accessibility]** ClimaxMicroBeat is motion-safe and optional, but it is still motion tied to **entering** Website — including skip-to-Website (Flow C). Reduced-motion skips it; a vestibular user **without** PRM set still gets scale/lift after a seek they thought was a static jump. Complementary to the rubric climax ship/no-ship high. (DESIGN ClimaxMicroBeat; EXPERIENCE Skip to Website + Climax armed.) *Fix:* Fire only on **scrub-entry** from Reports, not on pill skip; or drop the beat (it is already optional). Never combine with copy crossfade in a way that moves the H3.

### Low (12)

Summarized (actionable only; informational “no change required” notes omitted: glossary consistent, Backup & Rollback earns its place, BMad frontmatter extras, Inspiration editorial beat).

- **[Rubric: Token completeness]** `climax-scale` / `climax-lift` live under `spacing` though they are transform magnitudes — move to `components.climax-micro-beat` only.
- **[Rubric: Token completeness]** Restated unused parent tokens (`success`/`warn`/`danger`, `display`/`marketing-display`, `button-primary`, `page-gutter`/`section-y`) — trim or mark “inherited unused.”
- **[Rubric: Component coverage]** Frontmatter `button-primary` and `hairline-rule` have no Components body rows and no EXPERIENCE patterns — remove or document as inherited unused.
- **[Rubric: Component coverage]** Dual naming: PascalCase experience components vs kebab token keys (`ProductFrame` / `BrowserFrame` / `{components.browser-frame}`) — one mapping table.
- **[Rubric: Component coverage]** Six showcase mocks named as chapter visuals but not in either component table — add file paths next to `visual:`.
- **[Rubric: State coverage]** Hover on idle pills / chevrons specified in DESIGN but absent from State Patterns — one Hover row or declare hover visual-only.
- **[Rubric: Visual reference coverage]** Apple craft URL is grammar-only; no local capture of the pin/scrub pattern for offline extract.
- **[Rubric: Visual reference coverage]** Spines-win-on-conflict is stated (good); neither spine links a cinema mock because none exist — link after mocks land.
- **[Rubric: Bloat & overspecification]** Full Midnight Atelier palette/type ramp restated “so this workspace is self-contained,” including tokens never used on `#crm` — self-contain only cinema-touching tokens.
- **[Accessibility]** “Escape” in the spine means “keep scrolling.” Keyboard users will try **Esc**. Either wire Esc to unpin or stop calling scroll “escape.”
- **[Accessibility]** Light-only cinema (`theme.modes: light`) means `prefers-color-scheme: dark` visitors still get paper-warm. Out of scope for this story; revisit at shell level.
- **[Accessibility]** No bypass besides heading navigation to skip the **whole** cinema (2.4.1). Optional “Skip product tour” link to the next section — kindness, not AA-blocking, **if** persistent seek is fixed.

## Accessibility lens

The spines want the right floor — reduced-motion is the real carousel, not a dimmed film; pills are named; there is no autoplay; mobile does not pin — then leave the dangerous parts as `[ASSUMPTION]`. Desktop cinema as drawn is a **sticky-on-sticky scroll machine** whose only skip control **leaves the viewport**, whose live region will **narrate the scrub**, and whose inherited stone/gold pairings **fail 1.4.3** on the copy and seek labels the section now depends on. Do not build until pin geometry, seek persistence, announcement policy, and control contrast/size are locked. Polish can wait; **trapping Priya in 540vh of unlabeled progress cannot**.

Already strong (do not lose): reduced-motion is a real product (no pin/scrub/climax); no autoplay / no Beat×6 stagger; no long pin on mobile; pills use text `navLabel`s; skip-to-Website is a first-class path; hash `#crm` must land Clients at rest; live region string is human (`polite` + `atomic`); mocks are decorative; motion is transform/opacity only; copy floor (all four bullets) protects cognitive access; chevrons already meet target size; “pin must not trap focus” is the right intent — it needs to become a testable constraint.

**Must land in the spines before implement (build-blocking):**

1. Persistent seek while pinned (pills or equivalent) + no `scrollIntoView` progress fight.
2. Pin `top` / `z-index` / `scroll-margin` vs sticky header; 2.4.11 written.
3. Native scroll only (no `preventDefault` jack); unpin without a modal.
4. One NRV model (tablist APG **or** buttons + `aria-current`) for **both** breakpoints; stable panel; arrow vs page-scroll table.
5. Live region: seek vs scrub debounce.
6. Contrast: stone/gold/idle pill text on paper-warm ≥4.5:1 for actual text; idle glyphs ≥3:1 if they carry state.
7. Dot (and any 6px) hit areas ≥24×24 on the CarouselChrome path cinema calls the a11y fallback.
8. Breakpoint / PRM / orientation: chapter id + scrollTop + focus; `#crm` reset; seek vs wheel cancel.
9. PRM: kill hover/crossfade/climax; `matchMedia` change; spacer teardown.

**Can follow** (do not block first build if the above is in the spine): ClimaxMicroBeat skip-vs-scrub nuance; Esc-to-unpin naming; skip-past-section link; dark scheme (shell-level); AAA 44px targets on pills; 2.4.13 extras beyond a 3:1 ring; softening double-announce on explicit tab activate; `inert` on mocks as defense-in-depth.

**Do not implement cinema while findings marked critical/high above are still `[ASSUMPTION]`.** Rollback to today’s carousel remains the accessible conversion surface; cinema is not an upgrade until skip, pin geometry, announcement, and contrast are specified as tests, not vibes.

## Next

Spines must resolve build-blocking items before status:final / implement.
