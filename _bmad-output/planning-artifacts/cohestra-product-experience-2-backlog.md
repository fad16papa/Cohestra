---
title: Cohestra Product Experience 2.0 — implementation backlog
phase: 1
status: draft-for-po-review
created: 2026-09-22
updated: 2026-09-22
canonical_design: docs/DESIGN.md
content_language: _bmad-output/planning-artifacts/cohestra-content-language.md
head_phase0_1: 63fc97fa
main_after_339: 809efb21
implementation: not-started
---

# Product Experience 2.0 — ranked epic and story roadmap

Planning only. **Do not implement from this file until a later story is explicitly opened.** Epic 38 is specified here and is **not begun**.

Authoritative visual/IA contract: `docs/DESIGN.md`.  
Voice/glossary: `cohestra-content-language.md`.  
Evidence: Phase 0 + 0.1 artifacts (accepted).  
Protected: Epics 35, 36, 37.

---

## 0. Decomposition validation

Recommended Epics 38–43 were checked against Phase 0.1 evidence. **No boundary change.**

| Epic | Why this cut is stronger than alternatives |
|------|--------------------------------------------|
| **38 Foundation and reliability** | Known product/test defects and shared tokens/landmarks/overlays must land before any restyle. Mixing them into Dashboard would hide API 500/503 behind a visual rewrite. |
| **39 Shell and navigation** | D1–D4, D9, D11 are chrome. Rooms in 40–42 assume the shell already speaks the glossary. |
| **40 Core relationship workflow** | Dashboard, Follow-up, Clients, Activities are the Monday job (PX2-IA-001/002). They share queue → profile → activity continuity. |
| **41 Intelligence and communication** | Analytics, Cohestra AI, Campaigns are secondary-frequency vs follow-up, but share overlay/evidence patterns. Campaign compose defects (PX2-A11Y-004) depend on 38.6. |
| **42 Creation studios** | Website + Form Studio share builder motion (Epic 37) and D7 composition. Must not reopen Epic 35/36 semantics. Touch handles (P1) belong here, not in 38. |
| **43 System areas and closure** | Settings, Team, Billing, Platform, plus leftover P1/P2 visual/a11y consistency (cookie banner, chips, FAB, register copy). |

Rejected alternatives:

- Folding Follow-up into Clients-only (contradicts D2 and cinema).
- Starting visual restyle before 38.1–38.3 (defects would contaminate QA).
- A separate “Opportunities” epic (contradicts D2).
- Merging Platform into 39 (D10 is inheritance, not tenant chrome).

---

## 1. Ranked epics

| Rank | Epic | Outcome | Depends on |
|------|------|---------|------------|
| 1 | **38** Experience Foundation and Reliability | Named billing/site errors, stable e2e isolation, semantic AA text, one heading/landmark/skip contract, one overlay contract | Accepted Phase 0.1 |
| 2 | **39** Application Shell and Navigation | Canonical desktop/mobile rooms, lock-vs-hide, page header, App Router error/404 | 38.4–38.6 |
| 3 | **40** Core Relationship Workflow | Dashboard command center, Follow-up room, Clients, Activities, continuity | 39 |
| 4 | **41** Intelligence and Communication | Analytics room, Cohestra AI room, Campaigns overlays | 38.6, 39 |
| 5 | **42** Creation Studios | Website Studio + Form Studio compositions, preview/publish | 38.2, 39, Epic 35–37 locks |
| 6 | **43** System Areas and Product-Wide Closure | Settings, Team, Billing, Platform, leftover consistency | 38–42 |

Stories below all use the same required fields.

---

## 2. Story template (every story)

Each story includes:

1. User problem + evidence  
2. Affected roles, plans, routes, states  
3. Scope + explicit non-goals  
4. UX behavior + state matrix  
5. Responsive acceptance  
6. Accessibility acceptance  
7. Protected Epic 35–37 behavior  
8. Automated + visual QA  
9. Rollout + regression risks  

---

# Epic 38 — Experience Foundation and Reliability

**User outcome:** Operators can trust the environment they are in. Tokens, landmarks, and overlays become shared law. Known defects stop lying (503/500/e2e isolation) before any room is restyled.

**Non-goals for the epic:** No nav IA change, no Follow-up room, no production seeder, no visual Midnight Atelier restyle beyond tokens required for AA.

---

### 38.1 — Billing-sync environment and error behavior

**User problem.** Every new TenantAdmin session `POST`s `/api/v1/admin/billing/sync`. When Paddle is unconfigured the API correctly returns 503, but the shell always calls it, so local/CI/UAT consoles show a recurring failure and billing status may stay stale. Operators cannot tell “Paddle is optional here” from “billing is down.”

**Evidence.** PX2-LIVE-004; `evidence/px2-phase01/503-diagnosis.md`; `tenant-shell-provider.tsx`; `BillingController.Sync`. **Defect 1 of 4.**

**Roles / plans / routes / states.** TenantAdmin (any plan) on every `(admin)` mount. States: billing configured; billing unconfigured; Paddle outage (true 503); success refresh.

**Scope.** Skip or short-circuit sync when `billingConfigured === false`; surface a **named** billing-unavailable state; do not rely on swallowing the catch. Document expected API 503 for unconfigured Paddle.

**Non-goals.** Do not configure Paddle in Development. Do not change checkout, webhooks, or plan gates. Do not hide all console errors.

**UX / states.**

| State | Behavior |
|-------|----------|
| Unconfigured | No unconditional 503 loop. Optional quiet note: sync unavailable; plan status may be stale. |
| Configured | Existing sync-once-per-tab remains. |
| True outage | Named error, retry, not silent. |

**Responsive.** Chrome-only; all viewports.

**Accessibility.** Named state must be readable text ≥4.5:1; not color-only.

**Protected 35–37.** No registration/studio/motion change.

**QA.** Unit: shell does not call sync when unconfigured. Integration: unconfigured host does not require 503 for first paint. Visual: no new banner on Pro Trialing with Paddle present. Re-run admin smoke login.

**Risks.** Over-suppressing a real Paddle outage; Members who never sync today.

---

### 38.2 — Basic Website entitlement API behavior

**User problem.** Basic operators open Website and see a priced `UpgradePanel`, but `GET /api/v1/admin/site` returns **500** “Site pages require a Core plan or higher.” A known lock looks like a crash.

**Evidence.** PX2-ENT-004; `basic-website_1440x900.png`. **Defect 2 of 4.**

**Roles / plans / routes / states.** TenantAdmin Basic; `/dashboard/website`; gated vs unlocked Core/Pro.

**Scope.** Plan lock → `403` / `plan_locked` (or equivalent documented 4xx) with human detail. UI continues to show priced UpgradePanel. Add/adjust API tests.

**Non-goals.** Do not restyle Website Studio. Do not unlock Basic writes. Do not add a production Basic seeder (D12 local fixtures only).

**UX / states.** Gated: UpgradePanel, no ProductErrorState flash from 500. Unlocked: existing editor.

**Responsive.** N/A beyond existing page.

**Accessibility.** Lock copy names the plan (content-language §5).

**Protected 35–37.** No public SitePage renderer change.

**QA.** API test Basic `GET /admin/site` is not 500. UI test or e2e: Basic website shows UpgradePanel; console has no 500. Pro website still 200.

**Risks.** Clients that treat any non-200 as a page-level error; must keep UpgradePanel path.

---

### 38.3 — E2E tenant and theme isolation

**User problem.** Live-stack Playwright is not trustworthy: `form-studio-columns-36-4` times out on a **disabled** Two-column control titled “Two-column rows require Core or Pro” on the seeded Pro tenant; `registration-success-copy` loses “Join” after Epic 35 tests mutate marina toward Conversational. Five responsive cases skip for the same leftover theme.

**Evidence.** `evidence/px2-phase01/checks.md`. **Defects 3 and 4 of 4.**

**Roles / plans / routes / states.** E2E tenants only. Public register shells; Form Studio columns gate.

**Scope.** Isolate tenant/theme per spec (or restore marina Centered after mutation). Make columns spec assert against a tenant that is actually Core/Pro **or** assert the lock honestly. Stop suite-order contamination.

**Non-goals.** Do not “fix” by enabling Two-column on Basic. Do not change Epic 35 layout semantics or success copy product behavior to match a dirty theme. Do not skip the specs.

**UX / states.** Product UX unchanged except where a true product bug (wrong plan on seed) is proven.

**Responsive.** Existing 320–1440 registration matrix must run, not skip, on a clean theme.

**Accessibility.** N/A except specs must not disable keyboard reorder tests.

**Protected 35–37.** Preserve shell/flow/entitlement assertions. Isolation exists **to protect** those suites.

**QA.** `E2E_LIVE_STACK=1` Playwright: previously failing specs pass deterministically; 35/36 suites remain green; no new skips.

**Risks.** Shared demo slug `demo-marina-social-meetup` used by humans and e2e; prefer dedicated e2e activity if restore is racy.

---

### 38.4 — Semantic tokens and accessible text

**User problem.** Admin helper text uses `--stone` on `--paper` at **3.00:1**. Gold-as-text is **3.13:1**. Cinema already patched AA with a different token. Toasts use raw red/emerald.

**Evidence.** PX2-A11Y-005, PX2-A11Y-006, D5; live meter 85 unique fails.

**Roles / plans / routes / states.** All authenticated + public metadata that uses `--muted-foreground`. Light and dark.

**Scope.** Introduce `--text-muted` ≥4.5:1 on `--paper` and `--paper-warm`. Remap `--muted-foreground` / helpers. Map toast variants to `--success` / `--danger`. Contrast table in DESIGN.md. Do not alias `--stone-cinema` globally.

**Non-goals.** No full visual restyle. No cinema token rename. No marketing photography change.

**UX / states.** Muted labels become readable; decorative stone/gold remain non-text.

**Responsive.** All viewports; dark mode re-measure.

**Accessibility.** WCAG 1.4.3 AA for normal muted text. Document pairings.

**Protected 35–37.** Public shells may consume `--text-muted` only if preview parity and e2e contrast-independent assertions still pass. Do not change experience enums.

**QA.** Token unit/contrast test; visual screenshots of dashboard/clients helper text; toast screenshot success/error.

**Risks.** Brand-accent overlays dropping contrast; platform `--plat-stone` leftover (handled in 43.4 if not this story).

---

### 38.5 — Shared heading, landmark, and skip-link contract

**User problem.** No skip link. Chrome `h1` plus page `h1`/`h2`. Settings injects a second `<main>` and dual titles (Settings + Default; Team/Team; Billing/Billing).

**Evidence.** PX2-A11Y-001, PX2-A11Y-002, PX2-A11Y-003; D9.

**Roles / plans / routes / states.** All `(admin)` routes; Settings / Team / Billing emphasized.

**Scope.** One skip link; shell title not `h1`; one `<main id="main">`; Settings content is a region. Each route exposes exactly one page-level `h1` (may temporarily keep existing text).

**Non-goals.** Do not redesign Settings IA. Do not add Follow-up. Do not write `error.tsx` (39.5).

**UX / states.** Loading must not lose the `h1`.

**Responsive.** Skip link and landmarks on 390 and 1440.

**Accessibility.** WCAG 2.4.1, 1.3.1, 2.4.6. Keyboard: first Tab reveals skip link.

**Protected 35–37.** Public registration landmarks unchanged unless a bug is proven. Admin route-enter still pathname-only on the single `<main>`.

**QA.** Playwright landmark counts: `main===1`, `h1===1` on Dashboard, Clients, Settings, Team, Billing, Website. Skip link test.

**Risks.** Screen-reader users who relied on chrome `h1`; document the change.

---

### 38.6 — Shared accessible overlay contract

**User problem.** Campaign email preview, insert QR, command palette, and other custom `role="dialog"` surfaces lack Esc/focus-trap/PRM `data-slot`. Cookie banner is a blocking overlay (full fix in 43.5; this story sets the primitive law).

**Evidence.** PX2-A11Y-004, PX2-MOT-001, D8.

**Roles / plans / routes / states.** Pro compose dialogs; all command palette; any new overlay.

**Scope.** Mandate `ui/dialog` | `alert-dialog` | `sheet`. Local motion 160ms. Press 100ms. Migrate campaign preview + QR + command palette. Document exception process (DESIGN.md §19).

**Non-goals.** Do not restyle compose. Do not send campaigns. Cookie marketing placement is 43.5. Do not change 100/160/280.

**UX / states.** Open / Esc close / restore focus to invoker / click-outside per primitive defaults.

**Responsive.** Dialog vs sheet: sheet acceptable `<768` if same primitive family.

**Accessibility.** Focus trap, `aria-modal`, labelled title, PRM CSS applies.

**Protected 35–37.** Do not JS-gate motion. Builder drafts must survive if an overlay opens.

**QA.** Keyboard tests on compose preview and ⌘K. Reduced-motion: overlay duration 0. Visual 1440 + 390.

**Risks.** Command palette double-dialog (cookie + palette) leftover until 43.5.

---

# Epic 39 — Application Shell and Navigation

**User outcome:** Cinema and console are the same product. Phone operators reach Website under More. Locks are honest. Errors look like Cohestra.

---

### 39.1 — Desktop shell and canonical rooms

**User problem.** Marketing teaches Follow-up / Analytics / Cohestra AI / Website Studio; the rail is Website / Reports / no Follow-up (PX2-IA-001).

**Evidence.** D1; `admin-nav.ts` vs `product-slides.tsx`.

**Roles / plans / routes / states.** All tenant operators; desktop ≥768.

**Scope.** Rail order and labels per DESIGN.md §3.1. Add routes or redirects: `/follow-up`, `/analytics` (alias `/reports`), `/ai`. Website breadcrumb title Website Studio. Footer unchanged.

**Non-goals.** Do not build Follow-up/AI/Analytics **features** (40–41). Do not change mobile yet (39.2). Do not restyle cinema.

**UX / states.** Empty rooms may use `ProductEmptyState` “Coming into this epic” only if the destination is wired; prefer stub rooms with honest empty states that 40/41 fill.

**Responsive.** Rail compact 768–1023; expanded ≥1024 (DESIGN.md §4.2).

**Accessibility.** One nav landmark; current page `aria-current`. One `h1` per new stub.

**Protected 35–37.** Epic 37 forbids changing IA **as a motion story**; this is the IA story. Do not change pathname-key rules.

**QA.** Nav snapshot tests; visual 1440/1024/768; cinema vs rail label table.

**Risks.** Deep links to `/reports` must redirect. Training docs drift until 43.

---

### 39.2 — Mobile navigation

**User problem.** Four tabs treat `/dashboard/*` as Home. Website highlights Home. Calendar FAB covers rows (PX2-IA-004, PX2-LIVE-002).

**Evidence.** D3; `admin-mobile-tab-bar.tsx`; 390 Website capture.

**Roles / plans / routes / states.** `<768` all tenant roles.

**Scope.** Tabs: Home, Clients, Activities, Follow-up, More. Website under More; Home inactive on Website. Dock or hide calendar FAB so it does not cover list rows or tabs.

**Non-goals.** Do not add a sixth tab. Do not put Website on the primary bar.

**UX / states.** More sheet lists Analytics, Cohestra AI, Website, Campaigns, Settings (+ Team/Billing by role) with D4 locks.

**Responsive.** `<768` only; `md` rail from 39.1.

**Accessibility.** 44px tabs; selected tab name; More sheet = accessible dialog/sheet (38.6).

**Protected 35–37.** No public change.

**QA.** 390/430: Website → More not Home; Follow-up tab exists; FAB overlap screenshot regression.

**Risks.** Muscle memory of Activities-second order; document in content-language.

---

### 39.3 — Entitlement visibility

**User problem.** Nav always lists Campaigns/Website/Reports. Locks are destination `UpgradePanel`. Members see admin-shaped IA (PX2-IA-005, PX2-ENT-001).

**Evidence.** D4; Basic live UpgradePanel already priced — keep that quality.

**Roles / plans / routes / states.** Basic/Core/Pro × Admin/Member; Website, Campaigns, Analytics advanced, Team.

**Scope.** Discoverable modules visible + lock + plan label. Structurally unavailable hidden (Basic tenant-URL, Member Team). UpgradePanel never a blank dead end. Deep links: lock or denied, never 500 (depends 38.2).

**Non-goals.** Do not change server plan math. Do not hide Website from Basic nav.

**UX / states.** Locked / unlocked / member-ask-admin / hidden.

**Responsive.** Lock glyph readable on 390 More sheet.

**Accessibility.** Lock announced (“Website, Core plan”).

**Protected 35–37.** Form/experience entitlements stay as coded; this is chrome.

**QA.** Basic/Member/Pro fixtures (D12 local). Nav screenshots. API 403 still holds.

**Risks.** Over-hiding Campaigns (contradicts D4).

---

### 39.4 — Page-header hierarchy

**User problem.** `PageHeader` is `h2`; Settings/Team/Billing invent `h1`s; Website toolbar is `h2` “Website Builder”; no shared header/table primitive (PX2-SYS-002).

**Evidence.** D9 continuation; 38.5 landmarks.

**Roles / plans / routes / states.** All admin rooms.

**Scope.** One shared page header: `h1` + description + primary action. Adopt on Dashboard, Clients, Activities, new rooms, Settings. Website `h1` = Website Studio.

**Non-goals.** Do not build every table. Do not restyle marketing headers.

**UX / states.** Header persists through loading.

**Responsive.** Action wraps under title `<768`; 44px actions.

**Accessibility.** Heading order `h1` → `h2` sections only.

**Protected 35–37.** Activity Design/Form toolbars may keep studio chrome; page still has one `h1`.

**QA.** Header visual on 6 rooms × 1440/390.

**Risks.** Greeting header on Dashboard vs `h1` “Dashboard” — pick one `h1` (prefer “Dashboard” or tenant greeting, not both).

---

### 39.5 — Route error and not-found states

**User problem.** No `error.tsx` / `not-found.tsx`. `/nope-px2-audit` is Next default (PX2-STATE-001).

**Evidence.** D11; `not-found_1440x900.png`.

**Roles / plans / routes / states.** All App Router trees that operators hit: admin, auth, marketing, public, platform.

**Scope.** Product-voiced `not-found` and `error` with next actions (Dashboard / Marketing home / Platform home). Optional `loading.tsx` only if it does not break studio draft survival.

**Non-goals.** Do not replace per-page `ProductErrorState`. Do not change public registration unavailable shells.

**UX / states.** 404 vs crash vs offline (offline copy per content-language).

**Responsive.** 390 and 1440; 48px public-style action if the surface is public.

**Accessibility.** Page `h1` “Page not found” / “This screen failed”; focus on `h1`.

**Protected 35–37.** Registration `not-found` / unavailable remain Epic 35 components.

**QA.** `/nope` screenshot; forced error boundary test; e2e not-found.

**Risks.** Generic error masking 38.1/38.2 named states.

---

# Epic 40 — Core Relationship Workflow

**User outcome:** Monday work happens in Dashboard → Follow-up → Client → Activity without vocabulary whiplash.

---

### 40.1 — Dashboard as relationship command center

**User problem.** Dashboard is a widget pile. Intelligence is titled like a room. Queue is the only follow-up. Vanity metrics compete with next actions.

**Evidence.** PX2-IA-001/002; D1 Needs attention = section.

**Roles / plans / routes / states.** All tenant operators; empty / populated / error / onboarding / Basic vs Pro.

**Scope.** Hierarchy: Needs attention (section) → Needs follow-up (links to `/follow-up`) → today/work → supporting metrics. Apply tokens/header/density. Graphs/Tables remain views, prefer shareable query over localStorage-only.

**Non-goals.** Do not move AI generation logic. Do not hide metrics entirely. Do not implement `/ai` content (41.2).

**UX / states.** Empty (`DashboardEmptyState`), loading skeletons, brief error ≠ “all caught up,” onboarding checklist verbs aligned to rooms.

**Responsive.** Phone: stacked cards, no `min-w-[40rem]` graph trap (PX2-RESP-003). 1440: two-column optional, not nested card theater.

**Accessibility.** Section labels; insight links named; 40/44 controls.

**Protected 35–37.** Route enter 280ms pathname-only.

**QA.** Visual 1440/390 empty+populated (populated via demo). Keyboard from skip link to queue.

**Risks.** Removing a widget operators rely on; keep performance table as a section, not a room.

---

### 40.2 — Follow-up primary room

**User problem.** Cinema’s control room is a dashboard widget + `followUpDue` chip. `ClientFollowUpPanel` is dead. Opportunity has no home (PX2-IA-002, D2).

**Evidence.** IA §4.6–4.7; unused `client-follow-up-panel.tsx`.

**Roles / plans / routes / states.** Admin + Member; all plans. States: overdue, due, new, opportunity, empty, loading, error.

**Scope.** Ship `/follow-up` as the room: filters for categories (content-language §4), list, links to profile. Dashboard “View all” → this room. Reuse panel/queue data; do not fork APIs without cause.

**Non-goals.** No `/opportunities`. No automated messaging. No schema rewrite of follow-up dates.

**UX / states.** Empty: “No one needs follow-up.” Filter empty vs global empty. Row → `/clients/{id}`.

**Responsive.** Cards `<768`; table ≥1024; 44px rows on phone.

**Accessibility.** `h1` Follow-up; filters named; status not color-only.

**Protected 35–37.** None beyond shell.

**QA.** E2E: dashboard widget → room → profile. Visual category chips (no 390 truncation — see also 43.5).

**Risks.** Dual-writing queue vs room; keep one query.

---

### 40.3 — Clients list and client profile

**User problem.** Phone chips truncate “Active.” Tables force horizontal scroll. Profile expand uses 200ms. Follow-up is a date field without the room.

**Evidence.** PX2-LIVE-003, PX2-RESP-003, PX2-MOT-001.

**Roles / plans / routes / states.** All operators; empty/no-match/export/bulk campaign Pro; merge-suspect; messenger confirm.

**Scope.** Apply header, tokens, 40/44 chips (full labels or scroll, no clip). Cards through `md`. Profile: 160ms local expand; primary actions include “Open in Follow-up” when due. Messenger confirm uses 38.6 dialog.

**Non-goals.** Do not change lead-status semantics or merge algorithm. Do not add Opportunity as a client tab that competes with Follow-up.

**UX / states.** Existing list/profile states + denied export on Basic (hint, not crash).

**Responsive.** 390 chips fully readable; 768 no min-width trap; 1440 table primitive.

**Accessibility.** Chip row keyboard; profile one `h1` (person name).

**Protected 35–37.** Motion 160ms local only.

**QA.** Visual chips 390; clients 768 overflow=0; profile 1440/390.

**Risks.** Export/campaign handoff regressions.

---

### 40.4 — Activities and opportunities-as-category

**User problem.** First list card can be archived, so Form Studio opens read-only (PX2-LIVE-005). Opportunity is cinema-only.

**Evidence.** Activities list order; D2.

**Roles / plans / routes / states.** All operators; published/draft/archived; cap banner.

**Scope.** Published/draft-first default (archived secondary). Activity `h1` = activity name. Opportunity does **not** become an activity tab; if an activity produces follow-up candidates, they appear in Follow-up with source links.

**Non-goals.** Do not change Design/Form entitlements, publish confirm, or composition. Do not hide archived entirely.

**UX / states.** List filters; archive dialog (shared primitive); cap warning.

**Responsive.** Cards on phone; no overflow.

**Accessibility.** Archive is destructive dialog (38.6). Status badges have text.

**Protected 35–37.** Design tab and Form tab behavior locked.

**QA.** List default excludes leading archived-or-sorts them last. Existing activity e2e green.

**Risks.** Operators who used “first card = last updated including archived.”

---

### 40.5 — Cross-module continuity

**User problem.** Jobs hop Dashboard → Clients filter → Profile → Activity without shared chrome or back-context. View modes and filters are easy to lose.

**Evidence.** IA journeys 4.1–4.5.

**Roles / plans / routes / states.** All operators.

**Scope.** Shared back/context crumbs: Follow-up → Client → Registration → Activity. Preserve query state. Align onboarding steps to room names. Command palette labels match D1.

**Non-goals.** No new modules. No tenant switcher.

**UX / states.** Deep links survive refresh.

**Responsive.** Crumbs collapse to Back on 390.

**Accessibility.** Breadcrumb nav landmark; palette uses 38.6.

**Protected 35–37.** Palette must not break pathname-only route enter.

**QA.** Manual journey: due person → profile → activity form → back to Follow-up. Palette search “Follow-up” / “Analytics.”

**Risks.** Over-long crumbs on mobile.

---

# Epic 41 — Intelligence and Communication

---

### 41.1 — Analytics room

**User problem.** Cinema says Analytics; product says Reports. Basic weekly works; advanced is UpgradePanel. Dashboard Graphs is a second unnamed analytics surface.

**Evidence.** D1; PX2-IA-001; `/reports` live.

**Roles / plans / routes / states.** Basic weekly; Core+ advanced; loading/stale/error/empty period/export disabled.

**Scope.** Room name Analytics (`/analytics`, `/reports` redirect). Presets remain capabilities. Cross-link Dashboard Graphs. Apply header/tokens/table. Keep Basic weekly without a dead end.

**Non-goals.** No unimplemented “saved views” unless already coded. No new metrics invention.

**UX / states.** Existing reports states + lock for advanced on Basic.

**Responsive.** Charts stack `<768`; no horizontal min-width trap.

**Accessibility.** Chart summaries; export button disabled reason.

**Protected 35–37.** None.

**QA.** Basic vs Pro reports screenshots; redirect `/reports` → `/analytics`.

**Risks.** Bookmarks to `/reports?preset=`.

---

### 41.2 — Cohestra AI room

**User problem.** Production AI is a dashboard panel named Needs attention. Cinema promises a room.

**Evidence.** D1; IA §4.9; `DashboardIntelligenceBrief`.

**Roles / plans / routes / states.** All operators; `deterministic` / `synthesized` / `insufficientData` / error.

**Scope.** `/ai` with `h1` Cohestra AI. Dashboard section remains Needs attention and links here. Evidence + uncertainty + one next action (DESIGN.md §16). Reuse brief API.

**Non-goals.** Do not enable synthesis by default. Do not add free-chat. Do not restyle DemoClub cinema.

**UX / states.** insufficientData ≠ empty success. Error uses ProductErrorState.

**Responsive.** Readable 390; no vanity hero.

**Accessibility.** Insights are links with names; lists not bare numbers.

**Protected 35–37.** None.

**QA.** Brief modes fixture if possible; visual 1440/390; link targets exist.

**Risks.** Duplicate fetch dashboard vs room.

---

### 41.3 — Campaigns

**User problem.** Compose overlays were inaccessible (38.6 migrates primitive). Campaigns is Pro-locked. Compose on 390 is cramped.

**Evidence.** PX2-A11Y-004; campaign-compose captures; D4.

**Roles / plans / routes / states.** Basic lock; Pro list/compose/detail; preview; send confirm; failed/skipped.

**Scope.** Apply shell, header, tokens, 38.6 overlays already landed. Preview/send confirm in product voice. List empty/error primitives. No send in QA unless fixture-safe.

**Non-goals.** Do not change provider sending. Do not unlock Basic writes.

**UX / states.** UpgradePanel Basic; compose dirty; preview; confirm; result.

**Responsive.** 390 compose usable; 44px actions; preview sheet.

**Accessibility.** Overlay contract; focus restore after preview.

**Protected 35–37.** 160ms local only.

**QA.** Keyboard preview; Basic lock; Pro list visual. **Do not send** to real recipients.

**Risks.** QR insert regression.

---

# Epic 42 — Creation Studios

---

### 42.1 — Website Studio chrome and placement

**User problem.** Four names (Website / Builder / Studio / `/site`). Mobile Home highlight. Basic 500 is 38.2; chrome still says Builder.

**Evidence.** PX2-IA-003/004; D1, D3.

**Roles / plans / routes / states.** Basic lock; Core/Pro editor; dirty/publish/revert/tour.

**Scope.** Title Website Studio. More-sheet placement (39.2). Tokens/header/density. Tour must not fight skip link. Revert = 38.6 alert dialog.

**Non-goals.** Do not change section entitlements or SitePage renderer. Do not keep hidden preview trees.

**UX / states.** Existing builder states.

**Responsive.** DESIGN.md §14.1: split ≥1280; Edit/Preview `<lg`; 1024–1279 no cramped three-column.

**Accessibility.** One `h1`; tour is dialog or skippable non-modal.

**Protected 35–37.** AD-8 preview unmount; builder motion tokens.

**QA.** Existing website tests; 390 More; Basic UpgradePanel without 500.

**Risks.** Tour first-run overlay covering `h1`.

---

### 42.2 — Form Studio responsive composition (D7)

**User problem.** Three-pane starts at `xl` (1280). 1024–1279 is a long stack. EXPERIENCE 36 asked for 1024 three-pane; PO chose two-pane + collapsible inspector instead.

**Evidence.** PX2-RESP-001; D7; form-studio-composition captures.

**Roles / plans / routes / states.** Form Build on published activity.

**Scope.** ≥1280 three panes; 1024–1279 two-pane + collapsible inspector; `<1024` stack + inspector sheet.

**Non-goals.** **No** composition schema, renderer, or `fields[]` change. No 35 shell change.

**UX / states.** Inspector collapsed vs open; palette available.

**Responsive.** Explicit 1024 and 1280 visual QA.

**Accessibility.** Inspector toggle named; focus not lost on collapse.

**Protected 35–37.** Draft survives route motion (pathname-only). Builder timings unchanged.

**QA.** Playwright widths 1024 vs 1280 pane counts. Preview 36.6 still green.

**Risks.** Treating `xl` as tablet again.

---

### 42.3 — Form Studio touch and builder controls

**User problem.** Handles are `touch-none` + ~24px. Up/down `icon-xs`. Keyboard exists but fingers cannot use the coded primary reorder (PX2-TOUCH-002, P1).

**Evidence.** `form-composition-builder.tsx`; Website `touch-none` similarly.

**Roles / plans / routes / states.** Build mode; Core columns; all plans for basic reorder.

**Scope.** 44px handles that participate in pointer/touch; keep keyboard reorder. Apply same floor to Website section handles if they share the defect.

**Non-goals.** Do not remove keyboard. Do not change DnD library unless required for touch.

**UX / states.** Drag, keyboard, disabled plan-gated inserts (named).

**Responsive.** 390 Form tab first-class.

**Accessibility.** Handle name “Reorder {row}”; 2.5.5-aligned 44px.

**Protected 35–37.** Operations set unchanged.

**QA.** Touch-target audit; existing columns spec (after 38.3) + keyboard reorder.

**Risks.** Scroll-vs-drag on mobile — handle must be explicit.

---

### 42.4 — Preview and publishing continuity

**User problem.** Preview/publish can feel like a different product from Build. First fold of Form Studio can be templates, not composition. Website preview unmount rules are easy to regress.

**Evidence.** form-studio-published first fold; Epic 37 AD-8.

**Roles / plans / routes / states.** Build/Preview; publish/revert; Design-tab live preview (unsaved) vs public.

**Scope.** Preview chrome consistent; published public remains Epic 35/36. After publish, operator returns to a calm success state. Templates must not hide composition on ≥1280 without a jump link.

**Non-goals.** Do not mutate demo public themes in tests (38.3). Do not add new shells.

**UX / states.** Dirty, preview simulated submit, publish success, revert.

**Responsive.** Preview D/T/M widths unchanged.

**Accessibility.** Preview iframe/title named; success not toast-only.

**Protected 35–37.** Preview parity; no hidden preview work while editing.

**QA.** 36.5/36.6/35 live suites; visual Build vs Preview 1440/1024/390.

**Risks.** Theme mutation across e2e — depends on 38.3.

---

# Epic 43 — System Areas and Product-Wide Closure

---

### 43.1 — Settings

**User problem.** Nested main and dual h1s (38.5/39.4 fix structure). Rails vanish lg–xl (PX2-RESP-004). Member vs Admin sections differ.

**Evidence.** Settings LIVE 2× main; IA §4.13.

**Roles / plans / routes / states.** Admin workspace sections; Member personal-only.

**Scope.** Apply shell contract. Tablet: two-pane or Context sheet (define one). Optional `?section=` deep link (unresolved PO — implement if approved).

**Non-goals.** Do not ship custom domain. Do not change brand-accent algorithm.

**UX / states.** Section switch; reconfirm dialogs use 38.6 (settings-reconfirm evidence).

**Responsive.** 1024 vs 1280 rails defined.

**Accessibility.** One `h1` Settings; sections `h2`.

**Protected 35–37.** Appearance theme must not break public forcedTheme.

**QA.** Member redirect Team; Admin all sections; 390 tabs.

**Risks.** In-page section state lost on refresh without query.

---

### 43.2 — Team and permissions

**User problem.** No shared denied primitive. Members redirect. Basic invites UpgradePanel. Seeders are Admin-only (PX2-ENT-002).

**Evidence.** D4; D12 fixtures not production.

**Roles / plans / routes / states.** Admin Team; Member denied; Basic lock; seat cap; remove/revoke.

**Scope.** Shared permission pattern. Basic lock priced. Destructive remove = alert dialog. Document local Member fixture for QA; **no production seeder** unless PO later asks.

**Non-goals.** No impersonation. No new roles.

**UX / states.** Loading, empty team, cap, lock, denied.

**Responsive.** 390 invite flow.

**Accessibility.** Denied page `h1`; dialogs trapped.

**Protected 35–37.** None.

**QA.** Member/Admin/Basic fixtures. Do not email real invites in prod.

**Risks.** Invite tokens ENVIRONMENT-BLOCKED in Phase 0.1 — test with local token if possible.

---

### 43.3 — Billing presentation

**User problem.** Billing dual h1; sync 503 (38.1); checkout ENVIRONMENT-BLOCKED. Banners exist for trial/past_due/on_hold.

**Evidence.** IA §4.14; PX2-LIVE-004.

**Roles / plans / routes / states.** Admin owner vs non-owner; Member ask-admin; Basic/Core/Pro; OnHold vs Suspended copy.

**Scope.** Apply tokens/header. Consume 38.1 named state. Align OnHold copy (content-language §6). Checkout remains Paddle; do not fake it.

**Non-goals.** No Paddle integration rewrite. No production billing data.

**UX / states.** Unconfigured / configured / past_due / on_hold / trialing / success toast.

**Responsive.** Billing panel 390.

**Accessibility.** Banners are status, not only color.

**Protected 35–37.** None.

**QA.** Local unconfigured named state; do not run real checkout in PE 2.0 stories.

**Risks.** Confusing Suspended public copy (43.5 / 43.4).

---

### 43.4 — Platform administration

**User problem.** Parallel `--plat-*` system, native buttons, no skip/h1 contract (PX2-SYS-001, D10).

**Evidence.** platform-home captures.

**Roles / plans / routes / states.** PlatformAdmin; directory/detail/support; suspend/archive/complimentary.

**Scope.** Inherit semantic tokens, muted text, focus, dialogs, one `h1`/`main`. Keep sparse density. Suspended language ≠ on hold.

**Non-goals.** No impersonation. No admin route-enter requirement. No cinema.

**UX / states.** Existing platform states + shared empty/error.

**Responsive.** Directory usable 390.

**Accessibility.** Same floor as admin.

**Protected 35–37.** Platform is outside 37 AD-1; do not force route motion.

**QA.** Visual platform home/detail; contrast on plat surfaces after token migrate.

**Risks.** Breaking support inbox CSS.

---

### 43.5 — Responsive, accessibility, visual, and consistency closure

**User problem.** Leftover P1/P2 items would otherwise orphan: cookie banner covers Start free (PX2-LIVE-001 P1); clients chips (if any remain); register “one operator” (PX2-IA-006); Suspended “on hold” (PX2-ENT-005); focus-visible gaps (PX2-A11Y-007); density leftovers (D6); empty-state drift (PX2-STATE-002); DESIGN vs shipped gutters (PX2-SYS-003).

**Evidence.** Audit P1/P2 not fully absorbed above.

**Roles / plans / routes / states.** Marketing first-run; public Suspended; `/register` bootstrap; all admin leftovers.

**Scope.** Non-modal cookie banner that never covers the primary CTA. Bootstrap copy for team model. Suspended ≠ on hold. Sweep remaining 32px-only mobile controls and missing focus rings. Empty/error primitive adoption audit. Visual QA matrix pass on CORE routes.

**Non-goals.** No new epic. No production fixture seeder. No Epic 35 shell restyle.

**UX / states.** Cookie accepted/rejected; first visit 390 marketing.

**Responsive.** Full visual QA matrix viewports.

**Accessibility.** Re-run Phase 0.1 a11y baseline; skip, contrast, zoom, PRM, touch.

**Protected 35–37.** Public Join stays 48px. Motion tokens untouched.

**QA.** Visual QA matrix updated to LIVE pass/fail. Playwright marketing 390 CTA visible with cookie shown. Regression: 35/36/37 tests green.

**Risks.** Cookie legal requirements — keep consent, change **presentation** only.

---

## 3. Traceability — every P0/P1 finding → story

Phase 0/0.1 recorded **no P0** findings (nothing that both blocked a primary job **and** violated a locked Epic 35–37 invariant). P1 map:

| ID | Severity | Story |
|----|----------|-------|
| PX2-IA-001 | P1 | 39.1, 40.1, 41.1, 41.2 |
| PX2-IA-002 | P1 | 40.2 |
| PX2-IA-004 | P1 | 39.2 |
| PX2-A11Y-004 | P1 | 38.6, 41.3 |
| PX2-A11Y-005 | P1 | 38.4 |
| PX2-TOUCH-002 | P1 | 42.3 |
| PX2-STATE-001 | P1 | 39.5 |
| PX2-LIVE-001 | P1 | 43.5 |

P2 findings are assigned (not required by the brief, listed to prevent orphans):

| ID | Story |
|----|-------|
| PX2-IA-003 | 42.1 |
| PX2-IA-005 / PX2-ENT-001 | 39.3 |
| PX2-IA-006 | 43.5 |
| PX2-A11Y-001/002/003 | 38.5 |
| PX2-A11Y-006 | 38.4 |
| PX2-A11Y-007 | 43.5 |
| PX2-TOUCH-001 | 38.4 + 39.4 + 43.5 |
| PX2-RESP-001 | 42.2 |
| PX2-RESP-002 | 39.1 |
| PX2-RESP-003 | 40.1, 40.3 |
| PX2-RESP-004 | 43.1 |
| PX2-ENT-002 | 43.2 |
| PX2-ENT-003/005 | 43.3, 43.4, 43.5 |
| PX2-ENT-004 | 38.2 |
| PX2-STATE-002 | 43.5 |
| PX2-MOT-001 | 38.6 |
| PX2-SYS-001 | 43.4 |
| PX2-SYS-002 | 39.4 |
| PX2-SYS-003 | 43.5 |
| PX2-LIVE-002 | 39.2 |
| PX2-LIVE-003 | 40.3 |
| PX2-LIVE-004 | 38.1 |
| PX2-LIVE-005 | 40.4 |

---

## 4. Four known product / test defects

| # | Defect | Class | Story | Allowed fix posture |
|---|--------|-------|-------|---------------------|
| 1 | Unconditional `POST /admin/billing/sync` → 503 when Paddle missing | PRODUCT-DEFECT on environment-expected 503 | **38.1** | Named state + don’t call when unconfigured. Do not “fix” by configuring Paddle or swallowing logs only. |
| 2 | Basic `GET /admin/site` → 500 plan lock | PRODUCT-DEFECT | **38.2** | 403/`plan_locked`. Do not unlock Basic. |
| 3 | `form-studio-columns-36-4` timeout; Two-column disabled as Core+ on seeded Pro | TEST / seed isolation (and possible seed plan drift) | **38.3** | Isolate tenant/plan; do not enable columns on Basic to green the test. |
| 4 | `registration-success-copy` + responsive skips after Epic 35 theme mutation | TEST isolation | **38.3** | Restore or isolate theme; do not change success copy to Conversational “Continue” globally. |

Manual audit already captured registration success `REG20260922000101` **before** the dirty suite. That remains the product-evidence of success copy, not the failing spec.

---

## 5. Unresolved product-owner decisions

D1–D13 are **resolved**. Remaining items are non-blocking unless marked:

| ID | Topic | Phase 1 proposal | Blocks implementation? |
|----|-------|------------------|------------------------|
| U1 | Cohestra AI path | `/ai` | No — 39.1/41.2 use this unless PO says otherwise |
| U2 | Analytics path | `/analytics` with `/reports` redirect | No |
| U3 | Follow-up category taxonomy | Overdue / Due / New / Opportunity / Scheduled (content-language §4) | **Soft** — 40.2 should confirm Opportunity definition |
| U4 | Settings deep links | Optional `?section=` | No — 43.1 |
| U5 | Dashboard view mode | Prefer URL query over localStorage-only | No — 40.1 |
| U6 | Dashboard `h1` text | “Dashboard” vs personalized greeting | No — 39.4 |
| U7 | Cookie consent legal vs UX | Keep consent; non-modal banner | No — 43.5 must remain legally valid |
| U8 | Production Member/Basic seeder | **Not proposed** (D12) | No |

No decision in this list reopens Epics 35–37.

---

## 6. Implementation gates (when a story is later opened)

Mandatory loop: `_bmad/custom/mandatory-code-review-loop.md`.

Do not mark any 38–43 story DONE from this Phase 1 PR.

---

## 7. Phase 1 deliverables checklist

| # | Deliverable | Location |
|---|-------------|----------|
| 1 | Living DESIGN.md | `docs/DESIGN.md` |
| 2 | Terminology / content guide | `cohestra-content-language.md` |
| 3 | Desktop + mobile IA | DESIGN.md §3 + IA artifact §9 |
| 4 | Semantic-token + component governance | DESIGN.md §5, §19 + component inventory §13 |
| 5 | Ranked epic/story roadmap | this file |
| 6 | P0/P1 → story traceability | §3 |
| 7 | Four defects | §4 |
| 8 | Unresolved PO decisions | §5 |
| 9 | Files changed | §8 |
| 10 | Checks performed | §9 |
| 11 | Model usage / unauthorized actions | §10 |

---

## 8. Files changed (this Phase 1 PR)

| File | Action |
|------|--------|
| `docs/DESIGN.md` | **Created** — canonical contract |
| `_bmad-output/planning-artifacts/cohestra-content-language.md` | **Created** |
| `_bmad-output/planning-artifacts/cohestra-product-experience-2-backlog.md` | **Created** (this file) |
| `_bmad-output/planning-artifacts/cohestra-information-architecture.md` | Updated — proposed IA + D1–D13 encoding |
| `_bmad-output/planning-artifacts/cohestra-component-inventory.md` | Updated — token + governance strategy |

**Not changed:** `web/**`, `src/**`, evidence binaries, Epic 35–37 sources.

---

## 9. Checks performed (Phase 1 planning)

| Check | Result |
|-------|--------|
| PR #339 file scope | 60 files, `_bmad-output/planning-artifacts/**` only, +4289 / −0 |
| PR #339 `web/` or `src/` | None |
| Evidence GitHub blob + raw @ `63fc97fa` | HTTP **200** for all sampled Phase 0.1 screenshots and md |
| PR #339 CI | All SUCCESS before merge |
| PR #339 merge | **MERGED** `809efb21` 2026-09-22 after draft→ready |
| Phase 1 branch base | `origin/main` @ `809efb21` |
| Phase 1 path guard | No edits under `web/` or `src/` |
| D1–D13 present in DESIGN.md | §20 table |
| P1 IDs all mapped | §3 (8 P1s; 0 P0s) |
| Four defects mapped | 38.1, 38.2, 38.3, 38.3 |

Application typecheck/build/e2e were **not re-run** in Phase 1 because no application source changed. Phase 0.1 check table remains the baseline (`evidence/px2-phase01/checks.md`).

---

## 10. Model usage and unauthorized actions

| Item | Record |
|------|--------|
| Primary model | Grok 4.6 |
| Secondary model | **Not used.** Composer 2.5 was not invoked. |
| Auto mode | Disabled (not used) |
| Unauthorized / out of policy | None. `web/` and `src/` not edited. No story implemented. Epic 38 not begun. No production data touched. |
| Merge capability note | `gh pr merge` succeeded after `ManagePullRequest` marked #339 ready (it was a draft). Cloud `gh` user-info remains restricted; merge of the accepted planning PR was explicitly requested. |
| Local fixtures | Not recreated in Phase 1. D12 still forbids production seeders. |
