---
id: 39.4
key: 39-4-page-header-hierarchy
title: Page-header hierarchy
status: in-progress
epic: 39
created: 2026-10-03
baseline_commit: 2b7cf2faa574b998ad972cb56aae84b2fcd55079
---

# Story 39.4: Page-header hierarchy

Status: in-progress

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

Code review is repeating, not one-shot. Do not mark done from implementation alone.

## Story

As a tenant operator,
I want every authenticated room to share one visual page header with exactly one h1,
so that I always know which room I am in, greetings never steal the page title, and header actions stay usable on a phone.

## Scope delta vs the execution prompt

Canonical backlog §39.4 and DESIGN.md **D19 / §4.1 / §14** are authoritative. Story 38.5 already owns one-main / one-h1 structure. This story owns the **shared visual header primitive** and route adoption.

| Prompt / backlog note | Contract in this story |
| --- | --- |
| Build every table primitive | **No.** Header only. |
| Restyle marketing / public / platform headers | **Forbidden.** |
| Drop the Dashboard greeting | **No.** Demote it to supporting copy. |
| Nested Settings URLs (D17) | **43.1.** Keep current Settings/Team/Billing routes. |
| Dashboard `?view=` command center | **40.1.** Keep current Dashboard widgets. |
| Route `error.tsx` / `not-found.tsx` | **39.5.** Do not start. |
| Change nav, entitlements, APIs | **Forbidden.** |

**In scope:**

1. One shared authenticated `PageHeader` primitive: h1 + optional supporting copy + optional action slot + optional eyebrow.
2. Adopt it on the authenticated inventory: Dashboard, Clients list/profile, Activities list/detail, Follow-up, Analytics, Cohestra AI, Website Studio, Campaigns, Settings, Team, Billing.
3. Dashboard h1 is exactly `Dashboard`. Greeting stays visible as supporting text, never h1/h2.
4. Website h1 is exactly `Website Studio`. Toolbar may keep local control labels; it must not be a heading or a second page title.
5. Loading, empty, error, denied, and entitlement-locked states keep the same route h1 and header structure.
6. Below 768px, actions wrap under the title. Interactive header actions are ≥44px.
7. Heading order is h1 then section h2s. Header has no independent motion.

**Out of scope:** tables, marketing/public/auth/platform headers, nav IA, entitlements, server APIs, Form Studio redesign, Epic 37 pathname motion, Story 39.5, Epic 40.

## Acceptance Criteria

1. Authenticated rooms in the inventory render through the shared `PageHeader`. The primitive owns exactly one `h1`, optional supporting copy, and optional primary actions. It does not render `<main>`.
2. Dashboard document h1 is exactly `Dashboard`. Personalized greeting and date remain visible as supporting `<p>` text, never `h1` or `h2`.
3. Website document h1 is exactly `Website Studio` in loading, locked, error, and populated studio states. Toolbar/preview do not add a competing heading or duplicate the page title as a second display title.
4. Settings, Team, and Billing each keep one route h1 (`Settings` / `Team` / `Billing`). Section labels stay h2. No competing h1 is reintroduced.
5. Clients, Activities, Analytics, Campaigns, Follow-up, and Cohestra AI keep their existing route titles as the single h1. Detail routes use the entity name as the route h1, with an optional non-heading eyebrow.
6. Loading, empty, error, denied, and plan-locked states retain the route h1 and header structure. Empty-state cards may use h2 for their local title.
7. Below 768px, header actions wrap below the title. Interactive header actions are at least 44×44 CSS px and remain keyboard-accessible.
8. Form Studio and Website Studio keep studio chrome. Studio toolbars may retain local labels as non-headings. Embedded previews still have no `main` or `h1` (38.5).
9. Epic 37 pathname-only route motion is unchanged. The header has no independent enter/exit animation.
10. Protected: no nav/route/entitlement/API/Paddle changes; no marketing header restyle; no table redesign; no Story 39.5 error pages.

## Architecture (Grok-owned)

See `_bmad-output/planning-artifacts/evidence/px2-39-4/architecture.md`.

## ATDD

See `_bmad-output/planning-artifacts/evidence/px2-39-4/atdd.md`.

## Tasks / Subtasks

- [x] Shared `PageHeader` API: title, supporting/description, actions, optional eyebrow; wrap at `md`; 44px action slot (AC 1, 7, 9)
- [x] Adopt on Dashboard, Clients, Activities, Analytics, Follow-up, AI, Website, Campaigns, Settings/Team/Billing, and listed detail routes (AC 2–6, 8)
- [x] Semantic runtime tests + Playwright heading maps + 1440/390 evidence (AC 2, 3, 7)
- [x] Regressions 38.5 / 38.6 / 39.1 / 39.2 / 39.3 (AC 8–10)

## Dev Notes

### Current state (do not regress)

| Surface | Current h1 | Visible title | Notes |
| --- | --- | --- | --- |
| Dashboard | `Dashboard` | Greeting is already `<p>` | Card chrome stays; route through PageHeader |
| Clients list | `Clients` via PageHeader | Export CSV `size="sm"` (~28px) | Need 44px action slot |
| Activities list | `Activities` via PageHeader | New activity default button 32px | Need 44px + wrap at 768 not 640 |
| Analytics | raw `h1` | Export CSV | Adopt PageHeader |
| Follow-up / AI | CanonicalRoomStub raw `h1` | No actions | Route through PageHeader |
| Website loading/lock/error | PageHeader `Website Builder` / `Website` | Wrong title | Must be `Website Studio` |
| Website populated | sr-only `Website Builder` | Toolbar `<p>Website Builder` | One h1 `Website Studio`; no duplicate display title |
| Settings | SettingsPageHeader raw `h1` | Tenant name is `<p>` | Compose PageHeader |
| Team / Billing | local raw `h1`s | Denied/loading keep h1 | Adopt PageHeader |
| Client / activity / campaign detail | entity name `h1` | Breadcrumb is link, not heading | PageHeader + eyebrow |
| Form Studio | activity-name h1 from detail | Toolbar `h2` Form builder | Keep toolbar as h2; do not add a second h1 |

### Must preserve

- 38.5: one `main#main-content`, one h1, skip link, embedded preview has no main/h1
- 38.6 overlay contract
- 39.1 rail order; 39.2 mobile dock; 39.3 locks
- Existing action hrefs, permissions, and UpgradePanel destinations
- Epic 37 pathname-only enter motion
- Public/marketing/auth/platform headers

### Testing

- Vitest: PageHeader heading/action contract; Dashboard greeting not a heading; Website title constant
- Playwright heading-map: exactly one h1 on inventory routes; Dashboard / Website Studio exact strings; section headings start at h2
- 44px header actions; no 390 overflow; axe no new serious/critical
- Evidence: Dashboard, Clients, Activities, Analytics, Website Studio, Settings at 1440 and 390; plus one detail route and Form Studio toolbar boundary
- Regressions listed in AC 10

### Previous story intelligence (39.3 / 38.5)

- 38.5 already flipped PageHeader from h2→h1 and Dashboard greeting from heading→`p`. 39.4 is the visual/API unification, not a second landmark pass.
- Website 38.5 e2e asserts h1 `/Website/` — `Website Studio` still matches. Do not loosen it.
- Do not reopen entitlement resolver or nav order.

## Dev Agent Record

### Agent Model Used

Grok 4.6 (architecture, implementation, tests, review). Composer 2.5 unused unless a later bounded visual is declared.

### Debug Log References

### Completion Notes List

- Shared `PageHeader` owns h1, optional eyebrow/description, 44px action slot, wrap at `md`.
- Dashboard greeting is supporting `<p>` text. Website title is `WEBSITE_STUDIO_TITLE` = `Website Studio`.
- Studio toolbar is no longer a display title. Form Studio `h2` Form builder unchanged.
- Independent review: no unresolved BLOCKER/MAJOR.
- Story remains in-progress pending PO pre-merge review. Story 39.5 not started.

### File List

- `web/components/shared/page-header.tsx`
- `web/components/dashboard/dashboard-greeting-header.tsx`
- `web/components/layouts/canonical-room-stub.tsx`
- `web/components/settings/settings-page-header.tsx`
- `web/components/settings/settings-team-page-content.tsx`
- `web/components/settings/settings-billing-page-content.tsx`
- `web/components/website/website-builder-page.tsx`
- `web/components/website/website-builder-toolbar.tsx`
- `web/components/reports/reports-page-client.tsx`
- `web/components/clients/client-profile-header.tsx`
- `web/components/clients/client-profile-page.tsx`
- `web/components/activities/activity-detail-page-client.tsx`
- `web/components/campaigns/campaign-detail-page.tsx`
- `web/components/campaigns/campaign-compose-page.tsx`
- `web/app/(admin)/clients/page.tsx`
- `web/app/(admin)/activities/page.tsx`
- `web/app/(admin)/analytics/page.tsx`
- `web/lib/admin-canonical-routes.ts`
- `web/lib/page-header.test.ts`
- `web/e2e/page-header-39-4.spec.ts`
- `web/e2e/landmarks-38-5.spec.ts`

### Change Log

- 2026-10-03: Created Story 39.4 from main `2b7cf2fa` (39.3 tracker-close). Canonical D19 + 38.5 one-h1. Story 39.5 not started.
- 2026-10-03: Implemented shared PageHeader and adopted inventory. Draft PR for PO review.
