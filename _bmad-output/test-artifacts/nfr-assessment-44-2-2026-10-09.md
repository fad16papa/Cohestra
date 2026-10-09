# NFR evidence — Story 44.2

Date: 2026-10-09
Evaluator: Murat / TEA (Grok 4.6)
Overall: PASS for story scope. Not production-ready (NFR-44-10).

| NFR | Verdict | Evidence |
| --- | ------- | -------- |
| NFR-44-1 Security | PASS | `PlatformAdminOnly` on `PlatformOpsController`; TenantAdmin/Member 403; anonymous 401; parser rejects fake health strings |
| NFR-44-2 Minimization | PASS | Aggregates only (`key`/`count`); isolation test rejects slug, email, password, Redis, Bearer, JWT |
| NFR-44-3 Retention | N/A | No disposition logging |
| NFR-44-4 Performance | PASS | `GroupBy` Status, `GroupBy` BillingStatus, `Count` open support with IQueryable tenant subquery. No table scan of outbox/webhooks. Not a load test. |
| NFR-44-5 Accessibility | PASS | One main/`#main-content`, one h1, skip, `aria-current`, 44px menu, provenance not color-only. Live Playwright 1440×900 and 390×844 passed locally (1/1). |
| NFR-44-6 Reliability | PASS | `/ready` unmodified. Health is `missing_instrumentation`, not inferred from postgres/redis. |
| NFR-44-7 Truth | PASS | Freshness vocabulary AD-13 only. Empty list is actual zero. Malformed KPI throws (error, not fake zero). Health never Healthy/Green/OK/100%. |
| NFR-44-8 Abuse | PASS (inherit 44.1) | Recovery limiter unchanged. Overview GET is a cheap aggregate; no new expensive diagnostic. |
| NFR-44-9 Isolation | PASS | TenantIsolation trait on TenantAuthz + dedicated overview aggregates-without-secrets test |
| NFR-44-10 Independence | PASS | Epic 19 remains the production/UAT gate. This NFR audit does not claim production cutover. |
| Epic 19 separation | PASS | No deploy/credential/`/ready` changes |

Residual: Header Support badge still uses unfiltered inbox count (deferred). Live Playwright passed locally; required GitHub CI on exact HEAD is still the merge gate.
