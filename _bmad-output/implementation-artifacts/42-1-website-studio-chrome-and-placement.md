---
id: 42.1
key: 42-1-website-studio-chrome-and-placement
title: Website Studio chrome and placement
status: done
epic: 42
created: 2026-10-04
baseline_commit: c3e57bbc32e2446b19eb050edbbc6be2b9dc5f4c
epic_41_close_ancestor: 73fd2855d8cba88e9b1339129c85783ddc660bc7
accepted_commit: d12e13e1fbef70e202af9b9c1adf45cc28467d07
implementation_merge: 776fd43c008202a99d9a413ea11ade5829fc228a
---

# Story 42.1: Website Studio chrome and placement

Status: done

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

Code review is repeating, not one-shot. Do not mark done from implementation alone. There is no `bmad-close-story` skill.

## Story

As a TenantAdmin or TenantMember,
I want the existing Website creation environment to feel like one coherent Website Studio,
so that navigation, locked states, editor, preview, publish, revert, and onboarding stay truthful without changing the Website domain, renderer, entitlements, or public site.

## User problem and evidence

Four names still appear (Website / Builder / Studio / `/site`). Chrome still says Builder in places. Unknown plans can fetch the site. Tour keys are not tenant-scoped and the overlay sits above the skip link. Publish/revert success is toast-only. Same-entitlement Pro-to-Pro site isolation is not proven. Evidence: backlog §42.1, PX2-IA-003/004, D1, D3, DESIGN.md §14.1, Stories 38.2 / 38.5 / 38.6 / 39.1–39.4 / Epic 37 AD-8.

## Current API and frontend inventory

See `_bmad-output/planning-artifacts/evidence/px2-42-1/inventory.md`.

Authoritative surfaces (reuse; do not invent):

- Route: `/dashboard/website` → `WebsiteBuilderPage`
- Title constant: `WEBSITE_STUDIO_TITLE`
- Nav label: **Website**; breadcrumb/`h1`: **Website Studio**
- API: `GET/PUT /api/v1/admin/site`, `POST .../publish`, `.../revert-published`, preview-token, templates
- Controller: `[Authorize(TenantOperator)]` + Core plan gate in `SitePageService`
- Preview: `SitePageRenderer` with `embedded`
- Split threshold: 1280px; Edit/Preview below 1024px
- Revert already uses Story 38.6 `AlertDialog`
- Tour is a custom portal dialog; keys `activity-lead:website-builder-*` are global

## Roles, plans, routes, and states

See `role-plan-state-matrix.md`. Website unlocks on Core or higher. Basic admins get the established Core UpgradePanel. Members never see checkout. Missing/unknown plan stays pending and never gets a SKU. Role 403 is permission denial, never UpgradePanel. API remains authoritative.

## Architecture decision

**Improve the existing Website Studio chrome.** Reuse the existing site API, `WebsiteBuilderPage`, `PageHeader`, UpgradePanel, entitlement resolver, 38.6 AlertDialog, Epic 37 `BuilderSurface`, and `SitePageRenderer`. Do not add a second route or builder.

Selected tour contract: **skippable non-modal tour** (not a new 38.6 modal). Skip/dismiss always available. Overlay must not cover a focused skip link. Tour state is tenant-scoped.

Rejected: new Website API; renaming public `/` or `/api/v1/public/site`; changing section entitlements; keeping hidden preview mounted; adding a sixth mobile dock tab; starting 42.2–42.4.

## Explicit non-goals

Stories 42.2–42.4, Epic 43, `SitePage` schema, section types, `SitePageRenderer`, public-site output, custom domain, plan/Paddle/checkout/role changes, navigation order, Epic 37 timings, production fixtures, DigitalOcean, production claim.

## Acceptance Criteria

1. `/dashboard/website` remains the canonical room. Authenticated `h1` is **Website Studio**. Desktop rail and mobile More stay labeled **Website** in the established order. No sixth dock tab. No second Website route.
2. Core/Pro/Enterprise TenantOperators reach the editor. Basic admins see the existing Core UpgradePanel and do not fetch a site that 500s. Basic members get ask-admin, never checkout. Missing/unknown plan is pending, not Basic, and has no SKU.
3. Role 403 is ProductErrorState denial, never UpgradePanel. `plan_locked` 403 may show UpgradePanel. Frontend hiding is not authorization.
4. States are distinct and truthful: shell loading, plan pending, plan locked, permission denied, API loading, empty/populated editor, dirty, saving, save failure, saved, preview, publishing, publish success/failure, reverting, revert failure, tour active. Publish and revert results have a perceivable persistent status, not toast-only.
5. ≥1280 uses the accepted split composition. 1024–1279 is Build or Preview, never a cramped three-column. `<1024` uses Edit/Preview. 390 keeps editing, preview, save, publish, and revert usable. No document overflow. Controls ≥44×44. No hover-only essentials.
6. Hidden preview trees unmount (`keepMounted={false}`). Entering Preview shows the latest unsaved draft. Leaving Preview does not lose the editor draft. `SitePageRenderer` and public output stay unchanged. Route motion stays pathname-only.
7. Revert uses Story 38.6 AlertDialog with destructive title/description, Cancel, confirm, idle Escape, inert ownership, focus restore, and failure that keeps the current draft plus recovery. Success names the restored live version.
8. Tour is a skippable non-modal. Skip/dismiss always available. It does not replace the page `h1`. Skip link still reaches `main#main-content`. It does not auto-reopen after dismiss. Reduced motion is respected. Basic locked users do not receive editor-tour steps. Tour keys are tenant-scoped.
9. One `main#main-content`, one document `h1` owned by `PageHeader`. Embedded preview has an accessible name and no extra `main`/`h1`. Opaque focus. Light/dark/forced-colors/reduced-motion/200% zoom remain usable.
10. Same-entitlement Core/Pro tenants cannot read or update each other’s site. QA never adds a production seeder. Protected 38.2–41.3 remain intact. Stories 42.2–42.4 are not started.

## Protected Story 38–41.3 contracts

38.2 Website entitlement, 38.4 tokens, 38.5 landmarks, 38.6 overlays, 39.1–39.5, 40.5 continuity, 41.3 Campaigns, Epic 37 builder motion. Do not reopen them.

## Automated and visual QA

Affected + full Vitest, `tsc`, targeted ESLint, Next production build, Website plan/isolation integration, Story 42.1 Playwright + protected 38.2–41.3. Evidence under `px2-42-1/`.

## Exact stop gate

Story 42.1 `review`. Epic 42 `in-progress`. 42.2–42.4 not started. Epic 43 not started. Draft PR open and unmerged. Production not claimed.

## Tasks / Subtasks

- [x] Inventory and contracts recorded (AC: all)
- [x] Entitlement/pending/denied/lock matrix (AC: #2, #3)
- [x] Naming + persistent publish/revert status (AC: #1, #4)
- [x] Responsive 1024/1279/1280 + 390 (AC: #5)
- [x] Preview unmount + draft continuity (AC: #6)
- [x] Revert AlertDialog + tour tenant/skip (AC: #7, #8)
- [x] Isolation integration + Playwright 42.1 + protected 38.2–41.3 (AC: #9, #10)

## Dev Notes

- Reuse `resolveNavEntitlement("website")`. Do not invent plan math.
- Skip site fetch unless room access is `open`.
- Preserve `WORKSPACE_SPLIT_MIN_WIDTH_PX = 1280`. Do not treat Tailwind `lg`/`xl` as interchangeable.
- Do not change `SitePageRenderer` or public `/`.

### Project Structure Notes

- Route stays `web/app/(admin)/dashboard/website/page.tsx`
- Chrome stays under `web/components/website/`
- Shared entitlement stays in `web/lib/admin-nav-entitlements.ts`

### References

- [Source: `_bmad-output/planning-artifacts/cohestra-product-experience-2-backlog.md` §42.1]
- [Source: `docs/DESIGN.md` §14.1]
- [Source: `_bmad/custom/mandatory-code-review-loop.md`]

## Dev Agent Record

### Agent Model Used

Grok 4.6 (primary) for catalog, story, readiness, architecture, implementation, tests, and all four review layers. Composer 2.5 unused.

### Debug Log References

See `_bmad-output/planning-artifacts/evidence/px2-42-1/`.

### Completion Notes List

- Story created from synchronized `main` `c3e57bbc` (descendant of Epic 41 close `73fd2855`).
- Epic 42 moved to in-progress. Stories 42.2–42.4 not created.
- Local gates and four-layer review recorded. Story left at `review` for product-owner pre-merge.
- PO pre-merge patched isolation + non-modal tour. Accepted implementation commit `d12e13e1`. Merged as `776fd43c`. Tracker close only.

### File List

- `_bmad-output/implementation-artifacts/42-1-website-studio-chrome-and-placement.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/evidence/px2-42-1/**`

### Change Log

- 2026-10-04: Created Story 42.1. Epic 42 in-progress. 41.1–41.3 remain done. 42.2–42.4 not started.
