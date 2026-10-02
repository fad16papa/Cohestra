---
id: 39.2
key: 39-2-mobile-navigation
title: Mobile navigation
status: in-progress
epic: 39
created: 2026-10-02
baseline_commit: 96e3e87a3d1a6f96652fe653ddd1bf0f01b6e355
readiness: ready
---

# Story 39.2: Mobile navigation

Status: in-progress

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

## Story

As a tenant operator on a phone,
I want five primary tabs (Home, Clients, Activities, Follow-up, More) that match the product cinema,
so that Website no longer looks like Home and the Calendar FAB cannot cover rows or the dock.

## Scope delta vs the execution prompt

Canonical backlog §39.2 and DESIGN.md **D3 / §3.2 / §3.3** are authoritative.

| Prompt / backlog note | Contract in this story |
| --- | --- |
| More-sheet D4 locks | **39.3.** Keep current visibility. No new lock glyphs or plan labels. |
| Calendar FAB accessible name | **43.5.** This story only docks, relocates, or hides the FAB so it cannot overlap. |
| Desktop rail | **Unchanged.** 39.1 owns ≥768. |

**In scope:**

1. `<768` tab order: Home, Clients, Activities, Follow-up, More. No sixth tab. Website not on the bar.
2. Home current only on `/dashboard`. `/dashboard/website` marks **More**, not Home.
3. Follow-up is a primary tab → `/follow-up`.
4. More sheet destinations: Analytics, Cohestra AI, Website, Campaigns, Settings; Team/Billing follow existing footer role rules.
5. Reuse Story 38.6 More `Sheet` contract (focus trap, Escape, restore, inert ownership, accessible name).
6. Tabs and actionable dock controls ≥44px with an announced selected state.
7. Calendar FAB cannot cover list rows, tabs, or other actions on mobile.

**Out of scope:** 39.1 desktop IA, 39.3 entitlements, 39.4 page header, 39.5 error/404, public registration, Epic 40+ features, production deploy.

## Acceptance Criteria

1. Below 768px the primary dock is exactly Home, Clients, Activities, Follow-up, More. No sixth tab. Website is not a primary tab.
2. At 768px and above the Story 39.1 desktop rail is unchanged (order, labels, compact/expanded widths).
3. Home `aria-current` only on `/dashboard`. Visiting `/dashboard/website` must not mark Home current; More is current (or the More sheet is the selected destination).
4. Follow-up tab href is `/follow-up` and is selected on that room.
5. More sheet lists Analytics, Cohestra AI, Website, Campaigns, then the existing footer Settings / Team / Billing (role rules unchanged). Primary-tab rooms are not duplicated as More destinations.
6. More sheet remains the 38.6 `Sheet`: focus trap, Escape, focus return to More, inert ownership, accessible name, no background interaction.
7. Every dock tab and More trigger is at least 44×44 CSS px and announces selected (`aria-current` on links; More announces selected when a More destination is current or the sheet is open).
8. On viewports `<768`, the Calendar FAB does not overlap list rows, the tab dock, or other actions. Desktop FAB placement is unchanged.
9. Existing entitlement visibility is unchanged (no new locks, plan labels, or hiding). 39.3 owns that policy.
10. Protected: no desktop IA change, no public registration change, no 39.3/39.4/39.5 work.

## Architecture (Grok-owned)

See `_bmad-output/planning-artifacts/evidence/px2-39-2/architecture.md`.

## Tasks / Subtasks

- [x] Mobile tab order + Home/Website/Follow-up active rules (AC 1, 3, 4)
- [x] More destinations subset + 38.6 sheet reuse (AC 5, 6)
- [x] 44px targets + announced selected (AC 7)
- [x] Calendar FAB mobile hide/dock (AC 8)
- [x] Tests + evidence at 390/430/767/768 (AC 2, 9, 10)

### Review Findings

Independent review of HEAD `ea4d52c2` (Blind Hunter + Edge Case Hunter + Acceptance Auditor). No BLOCKER. Patches applied on this follow-up revision.

- [x] [Review][Patch] Full-width dock tab hit targets [`admin-mobile-tab-bar.tsx`]
- [x] [Review][Patch] Calendar-from-More skips sheet finalFocus, focuses popout, restores More [`admin-nav-sheet.tsx`, `activity-calendar-popout.tsx`]
- [x] [Review][Patch] Calendar control announces dialog (`aria-haspopup`) [`admin-nav-sheet.tsx`]
- [x] [Review][Patch] `setCalendarOpen` refuses to open over a blocking page modal [`admin-shell-context.tsx`]
- [x] [Review][Patch] Close More sheet when the viewport crosses 768px [`admin-mobile-tab-bar.tsx`]
- [x] [Review][Patch] E2E asserts Activities omitted from More, FAB absent on list rooms, calendar focus handoff [`mobile-nav-39-2.spec.ts`]
- [x] [Review][Patch] Mobile Activities selected on all `/activities` descendants via `isPathOrDescendant`; desktop `isAdminNavItemActive` unchanged [`admin-mobile-nav.ts`]
- [x] [Review][Defer] Calendar popout is a named 38.6 custom-dialog exception (43.5 owns rename/trap). 39.2 only hides the FAB and relocates the opener.

Repeat review of HEAD `763d19f1`: no AC BLOCKER/MAJOR. Residual patch applied below.

- [x] [Review][Patch] Do not disable More `finalFocus` when `setCalendarOpen` is blocked by a page modal [`admin-nav-sheet.tsx`]
- [x] [Review][Defer] Calendar popout Tab containment remains the 38.6 named exception / 43.5.

## Dev Notes

### Must preserve

- 39.1 `adminNavItems` desktop order and `admin-canonical-routes.ts`
- 38.6 More `Sheet` + palette XOR + inert ownership
- 38.5 skip / one main / one h1
- Footer billing visibility (Basic or billing owner)
- Calendar popout behavior on desktop; accessible name remains 43.5

### Testing

- Vitest: tab order, Home not current on Website, Follow-up selected, More destinations, More active includes Website, Activities selected on all `/activities` descendants (desktop `isAdminNavItemActive` still false for communities/categories)
- Playwright 390×844, 430×932, 767→768 resize with More open, Communities/Categories selected
- FAB overlap screenshots on populated Clients/Activities (rows asserted first)
- Regression: `desktop-shell-39-1`, `landmarks-38-5`, `overlays-38-6`

### Previous story intelligence (39.1)

- More `isActive` currently includes Follow-up — must stop once Follow-up is a primary tab
- Home today treats all `/dashboard/*` as current — that is the PX2-IA-004 bug
- More sheet currently renders the full desktop rail via `AdminNavLinks`

## Dev Agent Record

### Agent Model Used

Grok 4.6 (architecture, implementation, tests, review). Composer 2.5 unused unless a later bounded visual is declared.

### Debug Log References

### Completion Notes List

- Grok-owned mobile IA: `admin-mobile-nav.ts` is the single dock source. Desktop `adminNavItems` untouched.
- More sheet reuses 38.6 `Sheet`; destinations are Analytics, Cohestra AI, Website, Campaigns plus existing footer Settings/Team/Billing. No 39.3 locks.
- Calendar FAB hidden `<md`; desktop `md:right-5 md:bottom-5` unchanged. More sheet opens the existing popout.

### File List

- `_bmad-output/implementation-artifacts/39-2-mobile-navigation.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/evidence/px2-39-2/architecture.md`
- `_bmad-output/planning-artifacts/evidence/px2-39-2/readiness.md`
- `web/lib/admin-mobile-nav.ts`
- `web/lib/admin-mobile-nav.test.ts`
- `web/lib/motion-polish.test.ts`
- `web/components/layouts/admin-mobile-tab-bar.tsx`
- `web/components/layouts/admin-nav-links.tsx`
- `web/components/layouts/admin-nav-sheet.tsx`
- `web/components/layouts/admin-nav-footer.tsx`
- `web/components/layouts/admin-shell-context.tsx`
- `web/components/dashboard/activity-calendar-popout.tsx`
- `web/e2e/mobile-nav-39-2.spec.ts`

### Change Log

- 2026-10-02: Created Story 39.2 after 39.1 close `96e3e87a`. Canonical D3 / §3.2 + backlog §39.2.
- 2026-10-02: Implemented mobile dock, More destinations, FAB hide, and e2e/unit coverage. Status remains in-progress pending QA, review, and PO.
- 2026-10-02: Patched review MAJORs (full-width tabs, Calendar↔More focus handoff, 768 sheet close, e2e gaps). Story stays in-progress for PO.
- 2026-10-02: PO MAJOR — mobile Activities selected on all `/activities` descendants. Removed from deferred work. Desktop child-nav rule unchanged.
