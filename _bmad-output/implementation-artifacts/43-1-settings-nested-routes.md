---
id: 43.1
key: 43-1-settings-nested-routes
title: Settings nested routes
status: done
epic: 43
created: 2026-10-06
baseline_commit: 10c686791b5587a7eda8b9a21c96465f0366c065
accepted_commit: e87896fc142af0747c3a654110834d39777e10c5
implementation_merge: 648405a366e9b201f3d36db625cbb952676cbe83
---

# Story 43.1: Settings nested routes

Status: done

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

## Story

As a TenantAdmin or TenantMember,
I want each Settings area to have a real URL I can open, bookmark, reload, and step through with Back,
so that Settings feels like a collection of application pages rather than one giant panel switcher — without changing what I am allowed to do.

## User problem and evidence

Original 43.1 predates 38.5/39.1/39.4. Current HEAD already has one admin main, Team/Billing routes, and `/settings` → `/settings/profile`. Remaining: plan/brand/organization/notifications/embed/domain/account/support/appearance still use `activeId`; nav uses buttons; `?section=` is unused; profile h1 is always “Settings”.

See investigation companion.

## Already satisfied (OUT OF SCOPE)

Do not reimplement:

- 38.5 single `main#main-content` and skip link
- 39.4 PageHeader as the page h1 primitive
- 39.5 unmatched `/settings/{unknown}`
- Dedicated `/settings/team` and `/settings/billing` business logic
- Member Team replace + “admins only”; Member Billing stay-and-deny
- Basic Team UpgradePanel; billing owner-managed copy
- Custom domain waitlist + Enterprise visibility
- Appearance persistence / public forcedTheme
- Epic 37 pathname-only 280ms enter
- Epic 42 studios; #388 registration

## Remaining scope

1. Nested App Router paths for every current Settings area.
2. `/settings` replace to first permitted nested route (Admin plan, Member profile).
3. Legacy `?section=` / `?activeId=` compatibility replace + strip.
4. Pathname-canonical Link navigation in rails and 390 chips; Team/Billing first-class in that nav.
5. One h1 per nested route = section name; drop duplicate Settings/section heading pair.
6. Member admin-only workspace routes: Team convention (copy + replace). Domain not visible: 39.5 not-found.
7. Tests for route/legacy/role/plan/history/reload/a11y/responsive; update 38.5/39.1/39.4 Settings assertions that assumed mega-page h1 “Settings”.

## Roles, plans, routes, and states

See SPEC route / permission / plan matrices. No new roles. No Paddle changes.

## Architecture decision

**Pathname-canonical App Router composition.** `settings/(workspace)/layout.tsx` owns chrome. Index and unmatched stay outside the group. No `activeId` as IA.

## Explicit non-goals

43.2 Team redesign. 43.3 Billing presentation. Custom domain product. Global dirty guard. Title template. ProductErrorState unification. Weakening auth to make routes pretty.

## Acceptance Criteria

1. `/settings` replace-navigates to `/settings/plan` for Tenant Admin and `/settings/profile` for Tenant Member. Canonical clicks never flash the old mega-page as the destination.
2. Direct load and refresh of each existing nested Settings path render that area. `/settings/teem` is 39.5 not-found, not Profile.
3. `/settings?section=team` (and listed aliases, plus `activeId`) replace to the nested path without leaving `section`/`activeId` in the canonical URL. Other query keys are preserved.
4. Settings nav items are links. Current route is `aria-current="page"`. Pathname is the only primary section identity. Browser Back from Profile → Team → Billing returns Team then Profile.
5. Tenant Admin sees current entitled Settings. Tenant Member sees personal Settings only; direct `/settings/team` still shows admins-only copy and does not expose UpgradePanel/Start trial; direct `/settings/billing` still stay-and-denies; direct `/settings/plan` (and other admin-only workspace areas) redirect to `/settings/profile`.
6. Basic Admin Team still UpgradePanel. Domain remains waitlist and Enterprise-only; ineligible `/settings/domain` is 39.5 not-found. Appearance theme does not reset or flash. Brand/org/notifications/embed/account save behavior unchanged.
7. One `h1` per nested route (section name). One `main#main-content`. No nested `main`. Skip link works. Reduced-motion respected. No Settings-specific motion beyond Epic 37 pathname enter.
8. Viewports: 1440 left+content+right; 1024 left+content (Context not a dead zone); 768 and 390 chips + Context; Settings areas remain reachable; no horizontal overflow; chips/controls ≥44px where the existing Settings nav applies.
9. Footer Settings href is `/settings`. Account menu Settings href remains `/settings/profile`. Production callers do not keep `?section=` as canonical.
10. Stories 43.2–43.5 are not started.

## Protected contracts

38.5; 39.1 rooms/footer (href update for Settings door only); 39.4 header primitive; 39.5; Epic 37; Epic 42; #388; Paddle; Appearance; Team/Website entitlements.

## Automated and visual QA

Vitest for route map, legacy aliases, default path, `isSettingsProfilePath`. Playwright `settings-nested-43-1.spec.ts` plus updated 38.5/39.1/39.4 Settings assertions. Evidence under `px2-43-1/`.

## Exact stop gate

Story 43.1 DONE on accepted HEAD `e87896fc` (PR #393 merge `648405a3`). Epic 43 remains in-progress. Do not create 43.2.

## Tasks / Subtasks

- [x] Investigation + party + spec + UX + architecture recorded
- [x] `settings-routes.ts` map, legacy, defaults
- [x] `(workspace)` layout + Link rails/chips + index/legacy replace
- [x] Nested pages for existing sections; Team/Billing keep bodies
- [x] Permission/domain gates; one h1
- [x] Link migration (footer `/settings`)
- [x] ATDD + protected assertion updates

## Dev Notes

- Map `settings-account` → `/settings/profile`.
- Keep Team `router.replace` target as first allowed (`/settings/profile`), not raw `/settings` double hop if avoidable.
- `isSettingsProfilePath` continues to mean “Settings footer item” (any `/settings/*` except team/billing).
- Do not wrap `[...unmatched]` in workspace rails.

### References

- [Source: spec-43-1-settings-nested-routes]
- [Source: story-43-1-settings-nested-routes-investigation.md]
- [Source: party-43-1-settings-nested-routes.md]
- [Source: `_bmad/custom/mandatory-code-review-loop.md`]

## Readiness

PASS. Spec exists, delta classified, architecture spine recorded, protected contracts listed, ATDD targets named, non-goals explicit, 43.2–43.5 not in scope.
