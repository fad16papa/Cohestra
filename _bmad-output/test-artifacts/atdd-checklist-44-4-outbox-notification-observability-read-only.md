---
id: atdd-44-4
story: 44-4-outbox-notification-observability-read-only
status: in-progress
created: 2026-10-09
mode: create
---

# ATDD Checklist — Story 44.4 Outbox observability (read-only)

Red-phase acceptance coverage generated from Epic 44 Story 44.4, AD-13/15/18, TEA P0-09/10/11, P1-05/14.

## P0 HTTP / security

| ID | Level | Scenario | Expected |
| --- | --- | --- | --- |
| P0-09 | Integration | List JSON has no `payloadJson` | HTTP list of a row whose PayloadJson contains sentinel customer/MIME/token text. Body must not contain `payloadJson`, `PayloadJson`, the sentinel, email body, MIME, raw secrets. Allow-list item properties. |
| P0-10 | TenantIsolation | tenantId filter isolation | Tenant A + B rows. `tenantId=A` returns A only. |
| P0-11 | Integration | No requeue route | `POST /api/v1/platform/ops/outbox/{id}/requeue` → 404. Controller has no outbox mutation verbs. |
| AUTH-PA | Integration | PlatformAdmin summary/list | 200 |
| AUTH-TA | Integration + TenantIsolation | TenantAdmin | 403 |
| AUTH-TM | Integration + TenantIsolation | TenantMember | 403 |
| AUTH-ANON | Integration | Anonymous | 401 |

## P0/P1 API contract

| ID | Level | Scenario | Expected |
| --- | --- | --- | --- |
| SUM-1 | Integration | Summary counts | Status counts match seeded rows; freshness=actual; source PostgreSQL outbox_messages |
| SUM-2 | Unit | Aggregation | GroupBy queries; all four statuses present including zeros |
| LIST-1 | Integration | status filter | Failed only |
| LIST-2 | Integration | invalid status | 400 ProblemDetails, not empty 200 |
| LIST-3 | Integration | messageType exact | Only matching type |
| LIST-4 | Integration | from/to on CreatedAt | Inclusive UTC; from>to → 400 |
| LIST-5 | Integration | pagination | default pageSize 25; request 100 → pageSize 50 |
| LIST-6 | Integration | zero rows | 200 empty items, totalCount 0 |
| P1-14 | Unit | lastError redaction | Password=, Bearer, ApiKey, Secret, connection string, redis://, JWT, email, >200 chars; redact first then truncate; ≤200 |

## Frontend / Playwright

| ID | Level | Scenario | Expected |
| --- | --- | --- | --- |
| P1-05 | Frontend + Playwright | Zero Failed copy | "No failed outbox jobs are recorded." Not healthy/email-up |
| UI-1 | Frontend | No mutation controls | No Requeue/Replay/Retry |
| UI-2 | Frontend | Loading / error | Loading text; error unavailable not 0 |
| P1-12 | Playwright | 1440 and 390 | one main, one h1, skip link, Operations aria-current, no page overflow, table semantics, no mutation |

## Regression (must stay green)

| Story | Proof |
| --- | --- |
| 44.1 | recovery 429/503; PlatformAdminOnly |
| 44.2 | Overview KPI provenance; hideLoadTest |
| 44.3 | /ready freeze; health not_in_probe for outbox; Operations shell; directory banner |

## Out of scope (must not appear)

44.5 Paddle deliveries, 44.6 timeline, 44.7 audits, 44.8 severity, 44.9 version, outbox processor changes, requeue, payload viewer.
