# Story 39.5 readiness

Date: 2026-10-03  
Role: Product Manager (`bmad-check-implementation-readiness` story-level, matching 39.1–39.4)  
Baseline: `main` `e925fd5f`. Story 39.4 ACCEPTED/CLOSED. Epic 39 in-progress. Epic 40 not started.  
Disposition: **READY**

## Verdict

Every App Router surface has an explicit owner, fallback destination, and named state that must not be swallowed. Approved copy exists in `cohestra-content-language.md` §7. No open PO decision.

## Route-tree inventory

| Surface | Layout | Existing special files | Unmatched URL today | 39.5 owner | Recovery |
| --- | --- | --- | --- | --- | --- |
| Marketing / root / auth | `web/app/layout.tsx` (no `main`) | none | Next default 404 | `app/not-found.tsx`, `app/error.tsx` | `/` Home |
| Tenant admin | `(admin)/layout` → `DashboardLayout` `main#main-content` | none | Next default inside shell | `(admin)/not-found.tsx`, `(admin)/error.tsx` — **no nested main** | `/dashboard` |
| Platform console | `(platform)/layout` `<main>` | none | Guard first; else Next default | `(platform)/not-found.tsx`, `(platform)/error.tsx` — **no nested main** | `/platform` |
| Public registration | `(public)/layout` → `PublicFormLayout` `<main>` | none | Invalid slug is Epic 35 200 unavailable | `(public)/error.tsx` only. Do **not** replace unavailable | `/` Home |
| Embed | `embed/layout` (no `main`) | none | Next default | `embed/not-found.tsx`, `embed/error.tsx` — own `main` | `/` Home |
| Root layout crash | n/a | none | Next default | `app/global-error.tsx` (owns `html`/`body`/`main`) | `/` Home |

`loading.tsx`: **do not add.** Website Studio and Form Studio keep draft state in client trees. A segment `loading.tsx` remounts those trees.

## Named states that 39.5 must not own

| State | Owner | Must remain |
| --- | --- | --- |
| In-page fetch failure | `ProductErrorState` | h2 + retry; room `PageHeader` h1 stays |
| Registration activity missing | Epic 35 `PublicRegistrationUnavailable` | HTTP 200, not App Router 404 |
| Website Basic lock | 38.2 `UpgradePanel` | not a crash |
| Billing environment | 38.1 `BILLING_UNAVAILABLE_COPY` | not a crash |
| Role denial Team/Billing | Settings copy | not 404 |
| `plan_locked` 403 | UpgradePanel / typed 403 | not 500/404 |
| Tenant Suspended | `TenantMaintenancePage` | not “on hold” rewrite |
| Billing OnHold | `BillingBannerBar` | not workspace paused |
| Archived / unknown door | `page.tsx` `notFound()` | **may** use root 404 |

## Approved copy (do not invent)

| State | h1 | Supporting |
| --- | --- | --- |
| 404 | `Page not found` | Admin: “This page isn't in this workspace. Open Dashboard.” Marketing/public/embed: “This page isn't on Cohestra. Open the home page.” Platform: “This page isn't in the platform console. Open Platform home.” |
| Crash | `This screen failed` | “Something broke on this screen. Reload. If it repeats, contact support.” |
| Offline | `You're offline` | “You're offline. We'll retry when the connection returns.” |

Template from content-language §7: what happened / what it means / what to do. Tenant name is not fetched (no new API). “this workspace” substitutes `{tenant}`.

## Forced-error harness

Test/dev pages under `/dashboard/e2e-force-error` and `/e2e-force-error`. Server `notFound()` when `NODE_ENV === "production"`. No production query/cookie trigger.

## Open questions

None. READY to implement.
