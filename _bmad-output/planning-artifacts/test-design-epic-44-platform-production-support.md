---
workflowStatus: complete
totalSteps: 5
stepsCompleted: [1, 2, 3, 4, 5]
lastStep: step-05
nextStep: ''
lastSaved: 2026-10-08
---

# Test Design: Epic 44 - Platform Production Operations & Support Center

**Date:** 2026-10-08
**Author:** Admin (planning; Murat TEA conventions)
**Status:** Draft pending implementation (planning authorized only)

---

## Executive Summary

**Scope:** Epic-level test design for Epic 44 (9 stories).

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (≥6): 6
- Critical categories: SEC, DATA, BUS

**Coverage Summary:**

- P0 scenarios: 18 (authz, isolation, secret/payload omission, `/ready` freeze, Paddle semantics)
- P1 scenarios: 14 (provenance UI, pagination, retention, a11y/viewports)
- P2/P3 scenarios: 8 (copy, empty states, SHA missing)
- Effort is story-sized; do not treat hour estimates as a calendar commitment

---

## Not in Scope

| Item | Reasoning | Mitigation |
| ---- | --------- | ---------- |
| **Epic 19 live UAT / Paddle sandbox checkout** | Independent production gate | Keep 19.4 tests and droplet checks separate |
| **Outbox requeue** | Owner deferred | Negative tests: no route |
| **Incident entity** | Owner deferred | Schema/API must not add Incident |
| **Webhook replay** | Forbidden | Negative tests: no route |
| **OTel/Serilog** | Deferred | N/A |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- |
| R-001 | SEC | Tenant JWT reads platform ops/overview/outbox/paddle | 2 | 3 | 6 | 44.1+ TenantIsolation 403 | Dev |
| R-002 | SEC | Outbox payload or Paddle body/secrets in DTO | 2 | 3 | 6 | Contract tests forbid fields | Dev |
| R-003 | DATA | Disposition write changes webhook HTTP / double-inserts events | 2 | 3 | 6 | Processor regression suite must stay green | Dev |
| R-004 | BUS | UI claims `/ready` covers Paddle/outbox | 2 | 3 | 6 | Copy + health DTO `not_in_probe` tests | UX/Dev |
| R-005 | SEC | Cross-tenant timeline/outbox/deliveries mix | 2 | 3 | 6 | Two-tenant isolation tests | Dev |
| R-006 | DATA | Fake health when instrumentation missing | 2 | 3 | 6 | Provenance enum tests | Dev |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- |
| R-007 | PERF | Unbounded audit/outbox export | 2 | 2 | 4 | pageSize + CSV cap tests | Dev |
| R-008 | OPS | Recovery rate limit skipped when Redis down | 2 | 2 | 4 | 503 fail-closed test | Dev |
| R-009 | TECH | Invalid-signature log fills disk | 1 | 3 | 3 | Retention/cap tests | Dev |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ------ |
| R-010 | BUS | 43.4 nav E2E brittle after additive links | 2 | 1 | 2 | Extend 43.4 spec; keep directory home |

### Risk Category Legend

- **TECH**, **SEC**, **PERF**, **DATA**, **BUS**, **OPS** as TEA template.

---

## NFR Planning

| NFR | Criterion | Test level |
| --- | --------- | ---------- |
| NFR-44-1 Security | 403 tenant JWT; no secrets in JSON | Integration + unit |
| NFR-44-2 Minimization | sanitized error ≤ 200; redaction unit tests | Unit |
| NFR-44-3 Retention | prune job/query respects caps | Unit |
| NFR-44-4 Pagination | pageSize 51 → clamped or 400 | Integration |
| NFR-44-5 A11y | skip-link, 44px, 390 overflow | Playwright |
| NFR-44-6 `/ready` freeze | check names unchanged | Integration |
| NFR-44-7 Truth | missing SHA ≠ `v1` as build | Unit + E2E |
| NFR-44-8 Rate limit | 429 and Redis-down 503 | Unit + integration |
| NFR-44-9 Isolation | TenantIsolation trait | CI gate |
| NFR-44-10 Epic 19 | no story AC claims production GO | Review |

---

## P0 scenarios (must automate)

| ID | Story | Scenario |
| -- | ----- | -------- |
| P0-01 | 44.1 | `PlatformOpsController` in policy test list |
| P0-02 | 44.1 | PlatformAdmin snapshot/search/members/recovery HTTP |
| P0-03 | 44.1 | TenantAdmin 403 on those routes (`TenantIsolation`) |
| P0-04 | 44.1 | Recovery 429 after limit; 503 if Redis down |
| P0-05 | 44.2 | Overview KPIs have provenance; no fake health |
| P0-06 | 44.2 | `/platform` still directory; TenantAdmin blocked |
| P0-07 | 44.3 | `/ready` still 3 checks; health API lists not-in-probe |
| P0-08 | 44.3 | Health DTO has no connection string |
| P0-09 | 44.4 | List JSON has no `payloadJson` |
| P0-10 | 44.4 | tenantId filter isolation |
| P0-11 | 44.4 | No requeue route (404) |
| P0-12 | 44.5 | Existing Paddle processor tests still pass |
| P0-13 | 44.5 | Invalid signature still 400; no body stored |
| P0-14 | 44.5 | Diagnostic write failure does not flip webhook status |
| P0-15 | 44.5 | No replay route; config has no secrets |
| P0-16 | 44.6 | Timeline tenant isolation |
| P0-17 | 44.7 | CSV cap; tenant JWT 403 |
| P0-18 | 44.8–44.9 | No Incident type; public `/system/info` unchanged |

## P1 scenarios

| ID | Story | Scenario |
| -- | ----- | -------- |
| P1-01 | 44.2–44.7 | Playwright 1440 and 390 Overview/Ops/Audits/timeline |
| P1-02 | 44.2 | aria-current Overview vs Tenants |
| P1-03 | 44.3 | Directory degraded banner on Unhealthy |
| P1-04 | 44.3 | Overview health becomes `actual` after 44.3 |
| P1-05 | 44.4 | Empty Failed list copy |
| P1-06 | 44.5 | Pagination + tenant filter on deliveries |
| P1-07 | 44.6 | Snapshot + recovery still on tenant detail |
| P1-08 | 44.7 | Audit search filters |
| P1-09 | 44.8 | PATCH severity + audit row |
| P1-10 | 44.8 | 43.4 support E2E still pass |
| P1-11 | 44.9 | Missing SHA → `missing_instrumentation` UI |
| P1-12 | all UI | skip-link + one h1 |
| P1-13 | 44.5 | Retention/FIFO cap unit |
| P1-14 | 44.4 | lastError redaction unit |

## P2/P3

Copy lock regression; hideLoadTest on Overview; Operations empty Billing/Outbox sections before 44.4/44.5; reduced-motion; support badge still works.

---

## Per-story required tests

| Story | Unit | Integration | Frontend unit | Playwright | Manual |
| ----- | ---- | ----------- | ------------- | ---------- | ------ |
| 44.1 | limiter | ops HTTP + 403 + 429/503 | — | — | — |
| 44.2 | KPI mapping | overview 200/403 | provenance render | overview 1440/390 | numbers vs DB |
| 44.3 | health sanitize | `/ready` freeze; health 403 | banner | ops + directory banner | copy does not overclaim |
| 44.4 | redaction | list/filter isolation; no payload | — | outbox empty/error | compare counts to SQL |
| 44.5 | disposition mapping; no body | processor regression; webhook 400/503 | — | billing section | sandbox webhook still retries |
| 44.6 | merge order | two-tenant | — | timeline 1440/390 | ticket walkthrough |
| 44.7 | export cap | search 403 | — | audits 1440/390 | — |
| 44.8 | enum | PATCH + audit | — | inbox filter | — |
| 44.9 | missing SHA | version 403; system/info unchanged | — | version labels | deploy env documented |

## Quality gates

CI: `Category!=Integration` unit + required `TenantIsolation` + web lint on touched files. Integration locally/`CI=true` with fresh `cohestra_test`.

Manual product acceptance is mandatory for Overview/Health/Outbox/Paddle numbers. **Do not** treat CI as production readiness (NFR-44-10).

## Traceability

FR-44-1..18 map to P0/P1 IDs above. UX-44-1..11 covered by Playwright + 43.4 regression.
