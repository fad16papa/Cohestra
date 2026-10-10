# NFR evidence audit — Epic 44 final closure

Workflow: bmad-testarch-nfr (Create)
Baseline: main `368d48e0d93193c359a4383e09f408fdc301b286`
Model: Cursor Grok 4.6
Gate: **PASS**

Story NFR files remain the detailed evidence. This audit confirms the integrated epic on current main.

| ID | Theme | Evidence on current main | Verdict |
| -- | ----- | ------------------------ | ------- |
| NFR-44-1 | Security | Class-level `PlatformAdminOnly` on platform controllers; tenant JWT 403; no secret fields on health/outbox/paddle/version DTOs | PASS |
| NFR-44-2 | Data minimization | `PlatformHealthDescriptionSanitizer` max 200 chars; outbox `lastErrorSanitized`; no stack traces / connection strings | PASS |
| NFR-44-3 | Retention | `PaddleWebhookDeliveryRetention` 14-day invalid/malformed, 90-day other, FIFO cap | PASS |
| NFR-44-4 | Performance | Epic 44 list APIs clamp pageSize default 25 / max 50; audit export cap 5000; overview/health avoid unbounded history scans | PASS |
| NFR-44-5 | Accessibility | Skip-link, one main, one h1, `aria-current`, ≥44px nav; 1440/390 story e2e; light-only axe on Platform | PASS |
| NFR-44-6 | Reliability | Anonymous `/ready` remains postgres + redis + default-tenant; UI distinguishes actual / missing_instrumentation / unavailable / stale | PASS |
| NFR-44-7 | Truth in metrics | `PlatformKpi` envelope required; missing SHA is `missing_instrumentation`; no fictional live metrics | PASS |
| NFR-44-8 | Abuse | Recovery POSTs Redis fail-closed 503; diagnostic GETs remain PlatformAdminOnly | PASS |
| NFR-44-9 | Tenant isolation | `TenantIsolationApiTests` covers overview/health/outbox/paddle/timeline/audits/severity tenantId paths | PASS |
| NFR-44-10 | Epic 19 independence | Required main CI green ≠ production ready. Deploy workflow failure on `368d48e0` is Epic 19 host gap. Epic 19 tracker unchanged (`in-progress`) | PASS |

## Special attention

| Control | Result |
| ------- | ------ |
| No secrets in DTOs / version / paddle config | PASS |
| No outbox `PayloadJson` in API/UI | PASS |
| No raw stack traces | PASS |
| Bounded lists (25/50) on new Epic 44 endpoints | PASS |
| Bounded audit export | PASS |
| tenantId isolation | PASS |
| Missing instrumentation semantics | PASS |
| Redis fail-closed recovery | PASS |

## Notes (not blockers)

- Pre-44 tenant directory and support inbox lists still allow pageSize ≤ 100. Epic 44 new lists use 25/50.
- Diagnostic GETs are not themselves audit-logged (planning default #5).
- GitGuardian ran on PR CI (#431, #433), not on the main push of `368d48e0`.
