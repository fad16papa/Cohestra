# Traceability — Story 44.3

Date: 2026-10-09
HEAD: `9e2de2fd22fd5c0c783b781ed6b0e54af2a98a5a`
Gate: PASS for P0 (Playwright live-stack gated on `E2E_LIVE_STACK`)
Evaluator: Murat / TEA (Grok 4.6)
Coverage oracle: Epic 44 TEA P0-07 / P0-08 + P1-03 / P1-04 / P1-12 + Story 44.3 AC1–AC5

| ID | Requirement | Health source → DTO → UI | Test | Result |
| -- | ----------- | ------------------------ | ---- | ------ |
| P0-07 / AC1 / AD-14 / NFR-44-6 | `/ready` still postgres, redis, default-tenant; no rich diagnostics | `Program.cs` MapHealthChecks writer unchanged | `Ready_contract_stays_anonymous_three_checks_without_rich_diagnostics` | Pass |
| P0-07 / AC2 | Authenticated health lists not-in-probe deps | `PlatformOpsHealthService` ready-tagged checks + `not_in_probe` outbox/paddle/sendgrid/hosted-jobs | `PlatformOpsHealthServiceTests`, `PlatformOpsHealthIntegrationTests`, `platform-health.test.ts` | Pass |
| P0-08 / AC2 / NFR-44-1 / NFR-44-2 | Health DTO has no connection string / secrets | Sanitizer redacts Host=/Password=/redis:// /Bearer/ApiKey; Exception not copied | `PlatformHealthDescriptionSanitizerTests`, health integration + TenantIsolation secret patterns | Pass |
| P1-03 / AC5 | Directory degraded banner iff measured overall ≠ Healthy | `shouldShowDegradedBanner`; independent health fetch | `platform-health.test.ts`, Playwright intercept Degraded, source contract | Pass |
| P1-04 / AC3 / AD-13 | Overview health actual from canonical health service; unavailable on failure | `PlatformOpsOverviewService.ReadStackHealthAsync` | Overview unit actual/unavailable; overview integration actual; parser tests | Pass |
| P1-12 / AC4 / NFR-44-5 | `/platform/ops` skip, one h1, one main, Operations aria-current | Platform layout + ops page + header | Playwright spec + 43.4/44.3 source contracts | Pass |
| AC2 authz / NFR-44-9 | PlatformAdmin 200; TenantAdmin/Member 403; anonymous 401 | `PlatformAdminOnly` on controller | Policy, TenantAuthz, TenantIsolation, anonymous health | Pass |
| AC4 exclusions | No 44.4/44.5 APIs or queries | Ops placeholders only | Source contract rejects `outbox_messages` / `paddle_webhook` | Pass |
| 44.1 regression | Recovery 429/503/policy | Recovery methods unchanged | Controller recovery actions untouched; policy still PlatformAdminOnly | Pass |
| 44.2 regression | Tenant/support KPIs + hideLoadTest + directory | Overview tenant queries unchanged; health KPI only | Overview unit + integration | Pass |

Orphan ACs: **none**.

Quality gate: **PASS** for Story 44.3 P0. Not a production-cutover gate (NFR-44-10).
