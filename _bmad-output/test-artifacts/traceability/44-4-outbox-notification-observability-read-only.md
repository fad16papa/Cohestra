# Traceability — Story 44.4

Date: 2026-10-09
Evaluator: Murat / TEA (Grok 4.6)
Coverage oracle: Epic 44 TEA P0-09 / P0-10 / P0-11 / P1-05 / P1-14 / P1-12 + Story 44.4 AC1–AC5
Gate: PASS for P0 (Playwright live-stack run locally with `E2E_LIVE_STACK=1`)

| ID | Requirement | Implementation | Test | Result |
| -- | ----------- | -------------- | ---- | ------ |
| P0-09 | List JSON has no payloadJson / customer body | Safe projection DTO; parser allow-list | `PayloadJson_and_customer_body_are_absent_from_list_json` | Pass |
| P0-10 | tenantId filter isolation | `Where(message => message.TenantId == tenantId)` before pagination | `Platform_ops_outbox_tenantId_filter_returns_only_requested_tenant` | Pass |
| P0-11 | No requeue route | No outbox mutation actions | `Requeue_route_does_not_exist` 404 + policy mutation empty | Pass |
| P1-05 | Truthful zero-Failed copy | `NO_FAILED_OUTBOX_COPY` + caveat | Frontend source/unit + Playwright empty state | Pass |
| P1-14 | lastError redaction | Shared sanitizer redact-then-truncate ≤200 | `PlatformHealthDescriptionSanitizerTests` | Pass |
| P1-12 | skip, one h1, one main, Operations aria-current, 1440/390 | Existing platform shell + Outbox section | Playwright 44.4 + 44.3 regression | Pass |
| AC1 | Summary counts + provenance | GroupBy Status/MessageType; `freshness=actual` | Unit summary + integration summary | Pass |
| AC2 | Filters, pagination, CreatedAt, 400s | TryNormalize + AsNoTracking query | Integration filters/pagination/invalid status | Pass |
| AC2 authz | PlatformAdmin 200; TA/TM 403; anon 401 | PlatformAdminOnly | TenantAuthz + anonymous + isolation | Pass |
| AC4 UI | No mutation; loading/error not zeros | Outbox section | Source contract + Playwright | Pass |
| AC5 | 44.3 health truth intact | Health service unchanged; outbox still not_in_probe | 44.3 Playwright + health integration | Pass |
| 44.1 | Recovery limiter | Controller recovery POSTs unchanged | Policy + existing recovery tests | Pass |
| 44.2 | Overview KPIs | Overview service unchanged | Overview unit/integration | Pass |

Orphan ACs: **none**.

Quality gate: **PASS** for Story 44.4 P0. Not a production-cutover gate (NFR-44-10).
