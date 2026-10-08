---
id: 43.4
key: 43-4-platform-administration
title: Platform administration
status: in-progress
epic: 43
created: 2026-10-08
baseline_commit: 059ee9a44309cf157476d308a05c55c3d559b890
---

# Story 43.4: Platform administration

Status: ready-for-dev

DONE requires the Mandatory Code Review Loop on the final HEAD.

## Story

As a PlatformAdmin,
I want the Platform console to inherit Cohestra's semantic accessibility and interaction system without becoming a tenant dashboard,
so that I can operate tenants and support safely, distinguish Suspended from Billing OnHold, and trigger dangerous actions only deliberately.

## Already satisfied (OUT OF SCOPE)

- One `<main>` in Platform layout; page-level `<h1>` on directory / tenant / support / report
- Platform identity: ink header, gold wash, no tenant sidebar / Follow-up / PlanBadge / AdminRouteTransition
- Suspend two-step reason + break-glass copy (not collections)
- Complimentary set/update/clear + default-tenant complimentary UI guard
- Server default-tenant 409 on suspend/archive/complimentary
- PlatformAdminOnly API + frontend guard (guard is not sufficient alone)
- Scoped table overflow primitive
- Audit log fields (actor, tenant, action, reason, timestamp)
- Support inbox / detail / reply / note / status / snapshot / report workflows
- No impersonation

## Remaining scope

1. Alias shared `--plat-*` to Cohestra semantic tokens; keep gold wash + ink header; `--plat-stone` → `--text-muted` on paper; `--plat-header-muted` on ink.
2. Skip link + `#main-content` (no nested main).
3. `aria-current="page"`, 44px mobile menu, focus-visible (header ring contrasts on ink).
4. Pagination / recovery actions ≥44px.
5. Archive + recovery: AlertDialog (no `window.confirm`). Suspend stays two-step.
6. Operator language: Suspended = "Workspace paused."; OnHold = "Billing is on hold." Directory billing filter includes OnHold.
7. 390: directory, tenant detail, support — no page overflow.
8. Tests: source/unit, API default-tenant 409, Playwright PlatformAdmin / denial / 390 / dialogs / language. Local fixtures only.

## Acceptance Criteria

1. Platform remains a staff console: no tenant sidebar, Follow-up nav, tenant page header, PlanBadge, or AdminRouteTransition.
2. `--plat-stone` on paper/background aliases `--text-muted`. Gold wash and ink header remain. Header muted text stays AA on ink.
3. `/platform` first Tab reveals "Skip to main content"; skip focuses `#main-content`. Exactly one main and one h1 on `/platform`, `/platform/tenants/{id}`, `/platform/support`, `/platform/support/{id}`, `/platform/support/report`.
4. Tenants / Support nav expose `aria-current="page"` for the current area. Mobile menu control is ≥44px.
5. Archive uses AlertDialog titled with workspace identity, soft-archive consequence, action "Archive workspace". Cancel restores focus. Recovery reset/verify use AlertDialog.
6. Suspend remains reason-required + Confirm suspend with break-glass copy. Reactivate has no extra modal.
7. Suspended surfaces say "Workspace paused." OnHold surfaces say "Billing is on hold." Copy never implies Suspend = unpaid invoice.
8. Complimentary and default-tenant server rules unchanged. Default tenant suspend/archive/complimentary remain 409.
9. At 390, directory / tenant detail / support do not page-overflow; tables may scoped-scroll.
10. Non-PlatformAdmin cannot use Platform routes/APIs. No impersonation. No lifecycle/Paddle policy change.

## Tasks

- [ ] Token aliases + header muted + platform focus CSS
- [ ] Skip + main id
- [ ] Header aria-current + 44px + focus
- [ ] Archive + recovery AlertDialog
- [ ] Suspended / OnHold copy + OnHold filter
- [ ] Pagination / recovery 44px
- [ ] Source + copy unit tests
- [ ] Default-tenant 409 integration test
- [ ] Playwright 43.4

## Readiness

PASS — investigation + party + spec + UX frozen; remaining delta is implementation-sized; authz/lifecycle non-goals explicit.

## Exact stop

Do not create 43.5. Epic 43 stays in-progress until 43.5.
