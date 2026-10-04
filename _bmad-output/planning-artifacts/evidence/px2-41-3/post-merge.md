# Story 41.3 post-merge verification

Date: 2026-10-04  
Accepted implementation commit: `109729f36d65d8335b142bc45b40e2ed84cb3645`  
Implementation merge SHA: `efdb342b81f0d000b9f6d62eed497f3f0007e1d1` (PR #381)  
PR HEAD at merge: `109729f36d65d8335b142bc45b40e2ed84cb3645`  
`109729f3` is an ancestor of `efdb342b`.  
Merge parents: `ac5538e1910fc48650b7793214ed57fde40bf09c` + `109729f36d65d8335b142bc45b40e2ed84cb3645`.

## Required main CI

Run [`37202230854`](https://github.com/fad16papa/Cohestra/actions/runs/37202230854) on `efdb342b` — **5/5 success**

- .NET build and test
- API integration tests
- Next.js build
- UAT isolation contract
- Docker stack smoke

DigitalOcean Deploy run [`37202552329`](https://github.com/fad16papa/Cohestra/actions/runs/37202552329) is the existing classification **C** path (`Error: missing server host`). Credentials and infrastructure were not modified. Production not claimed.

PR CI on #381 is not the close signal. Final-head PR CI was [`37201891309`](https://github.com/fad16papa/Cohestra/actions/runs/37201891309) on `109729f3` (6/6) before merge. Superseded commit `ddce2a8` was not used.

## Focused post-merge tests on synchronized `main` `efdb342b`

Env: `E2E_LIVE_STACK=1 PUBLIC_BASE_URL=http://localhost:3000 E2E_API_BASE_URL=http://localhost:8080`

| Gate | Result |
| --- | --- |
| Affected Campaigns Vitest | **15 passed** (`campaign-html`, `campaign-room-access`, `campaigns-api`, `campaigns-41-3-source`) |
| Campaign / segment / Pro-gate units | **24 passed** |
| Campaign consent + isolation + RequireProPlan + TenantIsolation | **11 passed** including `ProTenantB_CannotReadOrReuse_ProTenantA_CampaignResources` |
| `e2e/campaigns-41-3.spec.ts` | **6 passed** — Basic/Core lock with zero send/test-send; Pro member no checkout; unknown plan pending without SKU; 390 compose + dirty + preview + QR + irreversible confirm; queued/partial/safe HTML; zero-recipient cannot confirm |

## Protected Story 38.4–41.2 regressions

| Gate | Result |
| --- | --- |
| `e2e` tokens / a11y 38.4 | **8 passed** |
| `e2e/landmarks-38-5.spec.ts` | **4 passed** |
| `e2e/overlays-38-6.spec.ts` | **1 passed** |
| `e2e/desktop-shell-39-1.spec.ts` | **1 passed** |
| `e2e/mobile-nav-39-2.spec.ts` | **1 passed** |
| `e2e/entitlement-visibility-39-3.spec.ts` | **5 passed** |
| `e2e/page-header-39-4.spec.ts` | **1 passed** — clip assertion still `toBe(false)`; not weakened or skipped |
| `e2e/route-errors-39-5.spec.ts` | **2 passed** |
| `e2e/dashboard-40-1.spec.ts` | **5 passed** |
| `e2e/follow-up-40-2.spec.ts` | **7 passed** |
| `e2e/continuity-40-5.spec.ts` | **1 passed** |
| `e2e/analytics-41-1.spec.ts` | **5 passed** |
| `e2e/ai-41-2.spec.ts` | **5 passed** |
| Combined Playwright | **52 passed / 0 failed** |

No assertion was weakened. No failure was converted into a skip.

## Same-entitlement isolation proof

`Cohestra.Api.IntegrationTests.CampaignIsolationIntegrationTests.ProTenantB_CannotReadOrReuse_ProTenantA_CampaignResources` — **passed** on synchronized `main`.

- Pro tenant A owns Campaign A, template, client, activity, and asset.
- Separate Pro tenant B uses its own TenantOperator JWT and Host.
- Tenant B cannot list/get Campaign A, read recipient results, preview/send using A’s identifiers, reuse A’s template, QR A’s activity, or GET A’s public asset on B’s host.
- Responses do not leak A’s subject, body, recipient identities, counts, or delivery state.
- Tenant A’s campaign and template remain intact after B’s probes.

## Side-effect-safe send / test-send

- Playwright intercepts `/send` and `/send-test`. Locked Basic/Core produce zero of those requests.
- Compose confirmation and queued/partial states are simulated. Duplicate click is blocked in-flight.
- Isolation send probes used `FakeEmailSender`. No real provider or recipient was contacted.

## Tracker

- `41-1-analytics-room: done`
- `41-2-cohestra-ai-room: done`
- `41-3-campaigns: done`
- `epic-41: done`
- Epic 42 was not created and not started

## Deferred residuals

From four-layer review on `109729f3` — no unresolved BLOCKER or MAJOR:

- Image allowlist is path-based and host-blind, matching server `IsAllowedImageSrc` — **MINOR / accept**.
- Browser sanitizer remains regex defense-in-depth; server Ganss.Xss is authoritative on send — **MINOR / accept**.
- Extra isolation probes (outbox rows, AllClients, send-test) — **MINOR / defer**.
- 200% zoom evidence remains deferred beyond 390 compose + overflow — **MINOR / defer**.
- Dirty in-app navigation still uses native `beforeunload` only — **NIT / accept**.

## Composer 2.5

Not used. Grok 4.6 owned FINAL HEAD REVIEW, merge, post-merge verification, CI triage, close, and reporting.
