# Traceability — Story 44.2

Date: 2026-10-09
HEAD: see `cursor/story-44-2-production-overview-59c2`
Gate: PASS for P0 (Playwright live-stack gated on `E2E_LIVE_STACK`)
Evaluator: Murat / TEA (Grok 4.6)
Coverage oracle: Epic 44 TEA P0-05 / P0-06 + Story 44.2 AC1–AC5

| ID | Requirement | API / query / provenance / UI | Test | Result |
| -- | ----------- | ----------------------------- | ---- | ------ |
| P0-05 / AC3 / AD-13 / NFR-44-7 | Overview KPIs have provenance; no fake health | `GET /api/v1/platform/ops/overview` → GroupBy Status/BillingStatus + open support Count; `PlatformKpi`; health `missing_instrumentation` | `PlatformOpsOverviewServiceTests`, `PlatformOpsOverviewIntegrationTests`, `platform-overview.test.ts` | Pass |
| P0-06 / AC2 / AC4 | `/platform` remains directory; TenantAdmin/Member blocked | Directory page unchanged; `PlatformAdminOnly`; guard redirects | `TenantAuthzIntegrationTests`, `TenantIsolationApiTests.Platform_overview_*`, `platform-overview-44-2.spec.ts`, `platform-43-4-source.test.ts` | Pass |
| AC1 / NFR-44-5 | `/platform/overview` one h1, skip, Overview `aria-current`, nav Overview→Tenants→Support | Platform shell + header | Playwright 1440 + source contract | Pass (live E2E skip without stack) |
| AC3 hideLoadTest | Default overview matches directory hide convention | Shared `PlatformTenantVisibility.ApplyHideLoadTest`; API default true | Unit parity + integration `TotalCount` vs sum | Pass |
| AC5 | Loading ≠ zero ≠ error ≠ missing instrumentation | Page gates tiles on `overview && !loading && !error`; parser throws on malformed counts | Source contract + parser tests | Pass |
| NFR-44-1 / NFR-44-2 / NFR-44-9 | PlatformAdmin 200; tenant JWT 403; aggregates only | Controller policy; isolation body has no slug/email/secrets | Policy + TenantAuthz + TenantIsolation | Pass |
| NFR-44-4 | Aggregate queries, no N+1 | Two GROUP BY + one COUNT | Review of `PlatformOpsOverviewService` | Pass |
| NFR-44-6 / AD-14 | `/ready` unchanged; no health probes | Diff excludes ready/ops/health | Review | Pass |
| 44.1 regression | Recovery 429/503, policy, limiter | Unchanged recovery methods | `PlatformOpsRecoveryRateLimitIntegrationTests`, Redis limiter units | Pass |
| 44.3–44.9 | Not started | No ops/health, Operations, outbox, Paddle, audits | Diff file list | Pass |

Orphan ACs: **none**.

Quality gate: **PASS** for Story 44.2 P0. Not a production-cutover gate (NFR-44-10). Playwright live run is residual until `E2E_LIVE_STACK=1` or CI UAT.
