---
id: 38.5
key: 38-5-shared-heading-landmark-and-skip-link-contract
title: Shared heading, landmark, and skip-link contract
status: in-progress
epic: 38
created: 2026-09-30
baseline_commit: 1b5cc6b3071d76a075c1cfd416e3366dccec6def
readiness: ready
---

# Story 38.5: Shared heading, landmark, and skip-link contract

Status: in-progress

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

## Story

As a keyboard or screen-reader operator,
I want the authenticated shell to expose one skip link, one main landmark, and one page-level h1,
so that I can bypass chrome, understand the page, and move through a stable document outline.

## Slice decision

This is **structural accessibility** on the existing authenticated shell. Not overlay primitives (38.6). Not nav IA (39). Not Settings nested routes (43.1). Not page-header visual redesign (39.4).

| Defect | Story |
| --- | --- |
| No skip-to-main | **38.5** |
| Shell `h1` competing with route headings | **38.5** |
| Settings nested `<main>` + tenant-name h1 | **38.5** |
| Team/Billing duplicate h1 | **38.5** |
| Embedded Website/Form preview `main`/`h1` inside admin | **38.5** |
| Custom dialogs / command palette focus trap | 38.6 — do not start |
| Canonical rooms / rail IA | 39.1 |
| Page-header visual hierarchy primitive | 39.4 |
| Settings nested-route migration | 43.1 |
| Client `role=row` | 40.3 / 43.5 |
| Calendar FAB name | 43.5 |
| Form Studio listbox | 42.3 |

## Acceptance Criteria

1. Authenticated application shell owns **exactly one** `<main>` landmark with unique `id="main-content"`. Nested layouts, settings panels, builders, cards, drawers, and panels use `div` / `section` / `aside` / `header` / `nav` — never a second `<main>`.
2. Every rendered authenticated route owns **exactly one** page-level `<h1>` with a meaningful route/page name. Shell chrome must not create a competing route heading.
3. Tenant, workspace, plan, breadcrumb, tab, and selected-setting labels are not accidental h1s. `Default` tenant/workspace copy is not an h1. Selected Settings area is h2 (not a nested-route migration).
4. Page subsections use h2/h3 according to real hierarchy. Heading level is not chosen only for visual size.
5. One authenticated-shell skip link: copy `Skip to main content`; first meaningful focusable element; visually hidden until keyboard focus; never `display: none` or removed from the accessibility tree; clearly visible when focused; uses Story 38.4 semantic tokens; focus indicator ≥3:1; works at desktop/tablet/mobile; targets unique `main-content`; target can receive programmatic focus; activation moves focus to main and bypasses repeated shell navigation; main is not hidden behind sticky headers; no unexpected animation; reduced-motion respected; pointer users are not forced through a special interaction. Do not duplicate the skip link in nested layouts.
6. Landmark audit: banner/header, primary nav, secondary nav, main, complementary, contentinfo, search. Duplicate same-type landmarks get a meaningful accessible name when required. Native elements over ARIA landmark roles. Do not nest `<main>`.
7. Standalone public pages retain their own `<main>` and h1. Embedded Website/Form previews inside the admin document use the **same renderer** with a semantic-context flag (heading offset / root element). No second preview engine. No hiding invalid headings from AT while leaving incorrect structure.
8. Skip-link target remains stable across pathname route transitions. Route-transition wrappers do not remount the shell. Skip works after client-side navigation. Mobile nav open/close does not duplicate main/skip. No automatic route-change focus unless this story requires it. Browser back/forward unchanged.
9. Loading, empty, error, entitlement, and populated states retain one h1 where a page is shown.
10. Protected: Epic 35–37 (public renderer, preview parity, motion 100/160/280 pathname-only enter), 38.1–38.4, no nav destination changes, no Settings URL changes, no overlay/dialog work, no backend/API/schema/entitlement change, no table/listbox/FAB fixes.

Dashboard h1 is exactly `Dashboard`. Greetings are supporting text. Builder toolbars do not own the document h1. Public event/form title remains h1 on the standalone public page.

## Readiness

Story 38.4 ACCEPTED/CLOSED at `abc613cb` (tracker `1b5cc6b3`). DigitalOcean deploy remains classification **C** (empty SSH host) — deferred, not a 38.5 blocker. D9 in `docs/DESIGN.md` §4.1, PX2-A11Y-001/002/003, and the product-owner accepted contract in this story are aligned. **Ready to implement.** No open PO decision.

Evidence: `_bmad-output/planning-artifacts/evidence/px2-38-5/readiness.md`.

## Architecture (Grok-owned)

Accepted skip target is `id="main-content"` (PO contract). DESIGN.md `#main` is the same landmark; implement `main-content` and do not invent a second id.

| Surface | Before | After |
| --- | --- | --- |
| `DashboardLayout` `<main>` | unnamed, no skip, no id | unique `id="main-content"` `tabIndex={-1}` `scroll-mt-*`; skip link first child of shell |
| `AdminTopBar` `<h1>` | competing document h1 | `p` / `span` with existing visual class |
| `PageHeader` `<h2>` | visual title, not document h1 | route `<h1>` |
| `DashboardGreetingHeader` `<h2>` greeting | greeting as heading | h1 `Dashboard`; greeting is `p` |
| `SettingsPageContent` inner `<main>` | second landmark | `section` labelled by the active settings area |
| `SettingsPageHeader` tenant name `<h1>` | `Default` as h1 | h1 `Settings`; tenant name is supporting text |
| Team / Billing | page h1 + chrome h1 | chrome demoted; keep one route h1; loading/denied states keep that h1 |
| Reports / activity / client / campaign / communities / compose | `h2` display titles | those become the route h1 |
| Website toolbar `h2` | competing with PageHeader | toolbar title is not a heading; PageHeader is h1 |
| Basic Website lock | UpgradePanel `h2` only (chrome was h1) | PageHeader h1 `Website` + UpgradePanel stays h2 |
| `SitePageRenderer` | always `<main>` + `<h1>` | `embedded` uses `div` + `h2`; standalone unchanged |
| Public registration title | always `<h1>` | standalone h1; `variant=preview\|embed` uses h2 |
| Form Studio preview | mounts `PublicRegistrationOpen variant="preview"` | thread heading level; no second renderer |
| `AdminRouteTransition` | inside `<main>`, keyed by pathname | stay inside main; do not remount shell or skip target |

### Skip link

Component: `web/components/layouts/admin-skip-link.tsx`. First focusable in `DashboardShellBody` (before sidebar). `href="#main-content"`. On activate: `preventDefault` + `main.focus()`. Never `hidden` / `display:none`. Off-screen via `fixed` + `-translate-y` until `:focus` (not `sr-only`, which fights nowrap and can clip). Focused: `top-3 left-3`, `z` above sticky header, `--ring` ≥3:1, `--text-link` / `--paper`. Light and dark. No motion beyond existing 160ms color/shadow if any; respect `prefers-reduced-motion`.

### Embedded preview

- Website Studio: `<SitePageRenderer ... embedded />` from `website-builder-page.tsx`. Marketing cinema DemoClub mount is also embedded in a host document — pass `embedded`.
- Standalone public door and `?preview=` full-document preview stay non-embedded (`app/page.tsx`).
- Form Studio: existing `variant="preview"` on `PublicRegistrationOpen`. Thread `titleHeadingLevel={2}` into experience panels / `ActivityHero` / modern-centered shell. Standalone `(public)/register/[slug]` stays default h1.

### Landmarks to label (not invent roles)

- Sidebar `<nav aria-label="Admin navigation">` already named.
- Mobile tab bar `<nav aria-label="Primary">` already named; `md:hidden` removes it from the tree at desktop.
- Top bar is `<header>` (banner). Breadcrumb `nav aria-label="Breadcrumb"` is secondary.
- Do not add `role="main"` / `role="banner"` on native elements.

### Prohibited

- Story 38.6 overlay/dialog/command-palette focus trap
- Changing hrefs or adding Settings nested routes
- Redesigning page-header visuals (only heading **element**)
- Hiding illegal h1/`main` with `aria-hidden` instead of fixing structure
- Second public renderer
- Motion timing / `adminRouteTransitionKey` behavior change
- Backend / entitlement / token contract changes
- Claiming production deploy

## Tasks / Subtasks

- [x] Inventory current mains/h1s (AC 1–4, 7)
  - [x] Confirm files in Dev Notes before editing
- [x] Shell skip + one main (AC 1, 5, 8)
  - [x] `AdminSkipLink` + `main-content` focus target
  - [x] Do not remount main on route enter
- [x] Heading contract (AC 2–4, 9)
  - [x] Demote chrome h1; promote route titles; Dashboard `Dashboard`; Settings `Settings`; keep Team/Billing one h1 through loading/denied
- [x] Nested main removal (AC 1, 6)
- [x] Embedded vs standalone preview (AC 7)
- [x] Landmark labels if duplicates remain (AC 6)
- [x] Tests + evidence (AC 5, 8, 10)
  - [x] Playwright runtime DOM (not source-text-only)
  - [x] axe landmark/heading/bypass matrix
  - [x] keyboard 1440 and 390 after a client-side navigation
  - [x] viewports under `_bmad-output/planning-artifacts/evidence/px2-38-5/`
- [x] Preserve 38.4 token tests and 38.2 entitlement tests

## Dev Notes

### Files to update (known)

- `web/components/layouts/dashboard-layout.tsx` — skip + main id/focus
- `web/components/layouts/admin-skip-link.tsx` — **new**
- `web/components/layouts/admin-top-bar.tsx` — demote h1
- `web/components/shared/page-header.tsx` — h2 → h1
- `web/components/dashboard/dashboard-greeting-header.tsx` — h1 Dashboard; greeting not a heading
- `web/components/settings/settings-page-content.tsx` — inner main → section
- `web/components/settings/settings-page-header.tsx` — h1 Settings; tenant not h1
- `web/components/settings/settings-team-page-content.tsx` — keep one h1 on all states
- `web/components/settings/settings-billing-page-content.tsx` — keep one h1 on all states
- `web/components/reports/reports-page-client.tsx` — h2 → h1
- `web/components/activities/activity-detail-page-client.tsx` — h2 → h1
- `web/components/activities/create-activity-form.tsx` — h2 → h1
- `web/components/activities/communities-list-page.tsx` / `community-detail-page.tsx` / `categories-list-page.tsx` — h2 → h1
- `web/components/clients/client-profile-header.tsx` — h2 → h1
- `web/components/campaigns/campaign-detail-page.tsx` / `campaign-compose-page.tsx` — h2 → h1
- `web/components/website/website-builder-page.tsx` — lock-state h1; pass `embedded` to renderer
- `web/components/website/website-builder-toolbar.tsx` — demote toolbar heading
- `web/components/marketing/site-page-renderer.tsx` — `embedded` root + title level
- `web/components/marketing/demo-mounts/marketing-demo-website-mount.tsx` — `embedded`
- `web/components/registration/public-registration-open.tsx` + experience panels + `activity-hero.tsx` + modern-centered shell — heading level from variant
- Tests: `web/e2e/landmarks-38-5.spec.ts` (new), Vitest supplements allowed
- Evidence: `_bmad-output/planning-artifacts/evidence/px2-38-5/`

### Must preserve

- `AdminRouteTransition` inside main; pathname key; Epic 37 enter class
- Public `PublicFormLayout` `<main>` (standalone only)
- 38.4 tokens (`--ring`, `--text-link`, `--paper`)
- 38.2 Website entitlement UpgradePanel copy and API behavior
- Form Studio `variant="preview"` content/schema/theme
- `web/lib/registration-responsive.test.ts` public main contract (standalone)

### Testing

- Playwright with `PUBLIC_BASE_URL=http://localhost:3000` `E2E_LIVE_STACK=1` `E2E_API_BASE_URL=http://localhost:8080`
- Runtime: `getByRole('main')` count 1; `getByRole('heading', { level: 1 })` count 1; skip link first Tab; Enter focuses `#main-content`
- axe: landmark, heading-order, bypass, duplicate-id — report unrelated findings with existing owners
- `npx tsc --noEmit`; production `npm run build`; targeted eslint; keep 38.4 / 38.2 specs green

### Previous story intelligence (38.4)

- Opaque `--ring`; do not use `ring-ring/30` on skip/main focus
- Reports wait helper `waitForReportsContent` (h2 today — becomes h1)
- Basic lock tenant `px2-basic` / `px2-basic-admin@cohestra.local`
- Appearance `cohestra-theme-operator` for dark skip-link capture
- Do not SQL-flip `default.Plan`

### Project context

Next.js 16 app router. Authenticated routes live under `web/app/(admin)/layout.tsx` → `DashboardLayout`. No backend change.

## Dev Agent Record

### Agent Model Used

Grok 4.6 (semantics, architecture, implementation, tests, review). Composer 2.5 only if a bounded skip-link visual treatment is later declared — not for landmarks, headings, focus, or architecture.

### Debug Log References

- Independent review (first): MAJOR F1 heading-order leftovers (Reports/Website/Form Studio); MAJOR F2 skip-after-SPA used `goto` not a client-side Link. Both patched.
- Playwright Form Studio Build: axe `heading-order` on `aside > h4` “Block palette”. Promoted builder palette/structure/properties to h3 and labelled the palette aside.

### Completion Notes List

- Shell: one skip link, one `#main-content` `<main tabIndex={-1}>`, chrome not h1.
- Settings inner main → labelled section; Team/Billing one h1; Dashboard loading keeps greeting h1.
- Embedded `SitePageRenderer` uses div/h2 and non-landmark header/footer; Form Studio preview `titleHeadingLevel` 2; public standalone unchanged.
- Duplicate complementaries labelled: Workspace, Settings sections, Settings context, Block palette, Event details.

### File List

- `web/components/layouts/admin-skip-link.tsx`
- `web/components/layouts/dashboard-layout.tsx`
- `web/components/layouts/admin-sidebar.tsx`
- `web/components/layouts/admin-top-bar.tsx`
- `web/components/shared/page-header.tsx`
- `web/components/dashboard/dashboard-greeting-header.tsx`
- `web/components/dashboard/dashboard-page-client.tsx`
- `web/components/settings/settings-page-content.tsx`
- `web/components/settings/settings-page-header.tsx`
- `web/components/settings/settings-left-rail.tsx`
- `web/components/settings/settings-right-rail.tsx`
- `web/components/settings/settings-team-page-content.tsx`
- `web/components/settings/settings-billing-page-content.tsx`
- `web/components/marketing/site-page-renderer.tsx`
- `web/components/website/website-builder-page.tsx`
- `web/components/registration/public-registration-open.tsx`
- `web/components/registration/registration-split-experience-panel.tsx`
- `web/components/activities/form-composition-builder.tsx`
- `web/e2e/landmarks-38-5.spec.ts`
- `web/lib/landmarks-38-5.test.ts`
- `_bmad-output/planning-artifacts/evidence/px2-38-5/`

### Change Log

- 2026-09-30: Created Story 38.5 after 38.4 close `1b5cc6b3`. D9 contract accepted.
- 2026-09-30: Review loop — heading-order retune, SPA skip keyboard reset, Form Studio Block palette h3, labelled asides.
