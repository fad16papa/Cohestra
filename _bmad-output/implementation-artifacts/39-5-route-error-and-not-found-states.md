---
id: 39.5
key: 39-5-route-error-and-not-found-states
title: Route error and not-found states
status: done
epic: 39
created: 2026-10-03
baseline_commit: e925fd5f7a05965fb467bf980989bc29c1363209
accepted_commit: 443f83eb94b39b3d191f941fdffb12144d6c51d4
---

# Story 39.5: Route error and not-found states

Status: done (ACCEPTED/CLOSED)

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

Code review is repeating, not one-shot. Do not mark done from implementation alone.

## Story

As a tenant operator or visitor,
I want unmatched URLs and unexpected route crashes to speak in Cohestra’s product voice with a correct next action,
so that I never see a raw Next.js default, never leak internals, and always know whether to go to Dashboard, Marketing home, or Platform home.

## Scope delta vs the execution prompt

Canonical backlog §39.5, DESIGN.md **D11 / §11**, and `cohestra-content-language.md` §7 are authoritative. Story 38.5 already owns one-main / one-h1 on successful rooms. This story owns **App Router `not-found.tsx` / `error.tsx` / `global-error.tsx`** and the shared route-boundary primitive.

| Prompt / backlog note | Contract in this story |
| --- | --- |
| Replace per-page `ProductErrorState` | **Forbidden.** |
| Convert 403 / role denial into 404 | **Forbidden.** |
| Convert `plan_locked` into a generic error | **Forbidden.** |
| Mask 38.1 billing-unavailable or 38.2 UpgradePanel | **Forbidden.** |
| Replace Epic 35 registration unavailable shells | **Forbidden.** |
| Change Suspended vs OnHold | **Forbidden.** |
| Add `loading.tsx` | **No.** Studios remount and lose drafts. |
| Production forced-error route | **Forbidden.** Test/dev harness only, production `notFound()`. |
| Start Epic 40 | **Forbidden.** |

**In scope:**

1. Product-voiced 404, unexpected crash, and offline/connection states on App Router trees operators can reach.
2. Surface-specific recovery: tenant admin → Dashboard; marketing/auth/public/embed → Marketing home; platform → Platform home.
3. Exact h1s: `Page not found` / `This screen failed`. Offline uses the named content-language state.
4. Focus the presented h1 (`tabIndex={-1}`). One `main` and one `h1` per document/surface.
5. Public primary actions ≥48px. Admin actions ≥44px. 390 and 1440. Dark and forced-colors.
6. No stack traces, exception messages, tenant ids, tokens, request bodies, or personal data in the UI.

**Out of scope:** nav, entitlements, APIs, schemas, Paddle, marketing redesign, Epic 40, `loading.tsx`, production error triggers.

## Acceptance Criteria

1. Unmatched marketing/root URLs render the shared 404 primitive with h1 `Page not found` and recovery to Marketing home. No Next default.
2. Unmatched authenticated admin URLs render the same 404 h1 inside the existing admin `main#main-content` (no nested `main`) and recover to Dashboard.
3. Unmatched platform URLs recover to Platform home when the platform console is shown. Unauthenticated `/platform/*` still uses the existing platform login gate.
4. Unexpected route crashes render h1 `This screen failed`. Retry calls the Next `reset()` path. No raw error/stack/digest/token/tenant text in the document.
5. When the client is offline, the error surface uses approved offline copy (`You’re offline. We’ll retry when the connection returns.`) and does not impersonate a server 500.
6. Presented h1 receives programmatic focus. Keyboard reaches the recovery/retry actions. Public primary actions are at least 48×48 CSS px.
7. 390 and 1440 have no horizontal overflow. Dark and forced-colors remain perceivable. No independent motion beyond Epic 37.
8. Existing `ProductErrorState`, registration unavailable, Suspended/OnHold, 38.1 billing-unavailable, 38.2 Website UpgradePanel, and 403/plan-lock UIs are unchanged.
9. Forced-error harness exists only for test/dev and calls `notFound()` when `NODE_ENV === "production"`.
10. Protected: no nav/entitlement/API/Paddle/schema changes; no Epic 40; no `loading.tsx`.

## Architecture (Grok-owned)

See `_bmad-output/planning-artifacts/evidence/px2-39-5/architecture.md`.

## Readiness

See `_bmad-output/planning-artifacts/evidence/px2-39-5/readiness.md`. **READY.**

## ATDD

See `_bmad-output/planning-artifacts/evidence/px2-39-5/atdd.md`.

## Tasks / Subtasks

- [x] Shared copy, recovery matrix, and `RouteBoundaryState` primitive with h1 focus (AC 1, 4–7)
- [x] App Router `not-found` / `error` / `global-error` files by surface (AC 1–5, 8)
- [x] Test-only force-error harness with production `notFound()` guard (AC 4, 9)
- [x] Vitest + Playwright 39.5 + regressions 38.1 / 38.2 / 38.5 / 38.6 / 39.1–39.4 (AC 8–10)
- [x] PO MAJOR 1: catch-alls for every `ADMIN_PATH_PREFIXES` unmatched descendant, including `[id]` extra segments (AC 2)
- [x] PO MAJOR 2: first offline-to-online transition calls `reset()` once; no mount/online-loop reset (AC 5)

## Dev Notes

### Current state (do not regress)

- Zero `error.tsx` / `not-found.tsx` / `global-error.tsx` / `loading.tsx` under `web/app`.
- Root layout has no `main`. Admin layout owns `main#main-content`. Platform and public layouts already own `<main>`. Embed has no `main`.
- `ProductErrorState` is an in-page `h2` + `role="alert"` for fetch failures. Keep it.
- Public registration missing slug renders `PublicRegistrationUnavailable` at HTTP 200.
- `page.tsx` `notFound()` for archived/unknown doors will use root `not-found.tsx`.

### Must preserve

- 38.5 one `main#main-content` + one h1 on admin success rooms
- 38.6 overlays; 39.1–39.4 shell/header
- 38.1 billing-unavailable copy; 38.2 Website lock
- Epic 35 registration unavailable
- Epic 37 pathname-only admin enter motion

### Testing

- Vitest: copy, recovery matrix, production guard, h1/main contract, no error.message in tree
- Playwright: marketing 404, admin 404, platform recovery, forced error + reset, offline copy, h1 focus, 390/1440, 48px public action, dark/forced-colors
- Do not add a production throw route

### Previous story intelligence (39.4)

- Admin pages already have one h1 via `PageHeader`. Route 404/error must be the only h1 on that document.
- Settings wait uses role heading. Do not restore `h1.font-heading`.
- Axe disabled-control exemption stays a 43.5 residual.

## Dev Agent Record

### Agent Model Used

Grok 4.6 (architecture, implementation, tests, review). Composer 2.5 unused unless a later bounded visual is declared.

### Debug Log References

### Completion Notes List

- Shared `RouteBoundaryState` owns the document h1, focuses it, and never prints exception text.
- Nested App Router `not-found`/`error` files plus prefix catch-alls. Root unmatched URLs map surface from pathname.
- Offline uses approved “You're offline…” copy. Crash h1 is `This screen failed`. 404 h1 is `Page not found`.
- Force-error pages throw only after an explicit click and `notFound()` in production.
- Independent review: no unresolved BLOCKER/MAJOR. PO accepted HEAD `443f83eb`. Epic 40 not started.
- PO correction 2026-10-03: admin catch-alls now cover Clients, Activities, Campaigns, Billing, Reports, Intelligence, and Needs Attention descendants. Offline copy calls `reset()` once on reconnect.

### File List

- `_bmad-output/implementation-artifacts/39-5-route-error-and-not-found-states.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/evidence/px2-39-5/`
- `_bmad-output/planning-artifacts/evidence/px2-39-5/post-merge.md`
- `_bmad-output/implementation-artifacts/epic-39-close-2026-10-03.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `web/lib/route-boundary.ts`
- `web/lib/route-boundary.test.ts`
- `web/components/shared/route-boundary-state.tsx`
- `web/components/shared/route-error-screen.tsx`
- `web/components/shared/root-not-found.tsx`
- `web/components/shared/invoke-not-found.tsx`
- `web/components/e2e/e2e-force-error-page.tsx`
- `web/components/e2e/e2e-force-error-client.tsx`
- `web/app/not-found.tsx`
- `web/app/error.tsx`
- `web/app/global-error.tsx`
- `web/app/(admin)/not-found.tsx`
- `web/app/(admin)/error.tsx`
- `web/app/(platform)/not-found.tsx`
- `web/app/(platform)/error.tsx`
- `web/app/(public)/error.tsx`
- `web/app/embed/not-found.tsx`
- `web/app/embed/error.tsx`
- `web/e2e/route-errors-39-5.spec.ts`
- `web/app/(admin)/clients/[id]/[...unmatched]/page.tsx`
- `web/app/(admin)/activities/[id]/[...unmatched]/page.tsx`
- `web/app/(admin)/activities/new/[...unmatched]/page.tsx`
- `web/app/(admin)/activities/categories/[...unmatched]/page.tsx`
- `web/app/(admin)/activities/communities/[id]/[...unmatched]/page.tsx`
- `web/app/(admin)/campaigns/[id]/[...unmatched]/page.tsx`
- `web/app/(admin)/campaigns/new/[...unmatched]/page.tsx`
- `web/app/(admin)/billing/page.tsx`
- `web/app/(admin)/billing/[...unmatched]/page.tsx`
- `web/app/(admin)/reports/[...unmatched]/page.tsx`
- `web/app/(admin)/intelligence/[...unmatched]/page.tsx`
- `web/app/(admin)/needs-attention/[...unmatched]/page.tsx`

### Change Log

- 2026-10-03: Created Story 39.5 from main `e925fd5f` (39.4 tracker-close). Canonical D11 + content-language §7. Epic 40 not started.
- 2026-10-03: Implemented route-boundary primitive, App Router files, catch-alls, and live-stack Playwright. Status remains in-progress for PO pre-merge review.
- 2026-10-03: PO changes-required — complete admin 404 ownership + truthful offline auto-reset. Status remains in-progress. PR stays draft.
- 2026-10-03: Playwright proofs use `complementary` Workspace + `data-admin-shell`; offline reconnect does not click Try again.
- 2026-10-03: PR #365 merged as `7553872c` (implementation HEAD `443f83eb`). Required main CI `37125569345` 5/5 success. Post-merge: route-boundary Vitest 13/13; Playwright 39.5 2/2 plus 38.2/38.5/38.6/39.1–39.3. 39.4 43.999px classified D; assertion not weakened. ACCEPTED/CLOSED. Epic 39 closed. Epic 40 not started.
