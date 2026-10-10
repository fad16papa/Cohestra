---
id: 44.6
key: 44-6-tenant-diagnostic-timeline
title: Tenant Diagnostic Timeline
status: in-progress
epic: 44
created: 2026-10-10
baseline_commit: 7f11f02f49b8bcf40d9dd68831c9e1cd94578968
---

# Story 44.6: Tenant Diagnostic Timeline

Status: in-progress

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

Code review is repeating, not optional, not one-shot.

## Story

As a **PlatformAdmin**,
I want **one tenant timeline correlating safe operational events from platform audits, support, billing/status snapshot, outbox, and Paddle deliveries**,
so that **I can investigate one workspace without SQL**.

## Acceptance Criteria

1. **Given** `GET /api/v1/platform/tenants/{tenantId}/timeline`
   **When** PlatformAdmin requests an existing tenant
   **Then** 200 with a canonical timeline DTO: items (id, type, timestamp, provenance, safe summary, optional safe metadata) plus source statuses, `observedAt`, and `hasHistoricalEvents`
   **And** TenantAdmin 403, TenantMember 403, anonymous 401
   **And** unknown tenant 404 — never 200 empty
   **And** server policy is the security boundary (not the frontend route guard)

2. **Given** tenant A and tenant B each have audit, support, outbox, and Paddle diagnostic rows
   **When** PlatformAdmin requests tenant A
   **Then** zero tenant B records appear (P0-16)
   **And** the reverse request excludes tenant A
   **And** Paddle rows with `tenantId = null` are never correlated
   **And** tenant ownership comes only from each source's authoritative TenantId — never from actor identity

3. **Given** the five sources
   **When** the timeline is composed
   **Then** historical sources are: `platform_audit_logs` (TenantId), support issue opened + reply recorded for that tenant, `outbox_messages` (TenantId, 44.4 summaries only), `paddle_webhook_deliveries` where TenantId equals the requested tenant
   **And** current billing/status is a `billing_snapshot` stamped `observedAt` — not a fabricated historical BillingStatus transition
   **And** merge order is newest-first, then type, then id
   **And** each historical source is queried with `Take(25)`; merged cap is 50 (AD-15)
   **And** Paddle empty = `missing_instrumentation`; other historical empties = `empty`; no synthetic events

4. **Given** raw source rows containing sentinels
   **When** the timeline JSON is returned
   **Then** none of DetailsJson, PayloadJson, LastError, DedupeKey, support body/description/internal note, webhook body, signature, or credentials appear
   **And** summaries are constructed allow-list strings

5. **Given** `/platform/tenants/{id}`
   **When** the page loads
   **Then** an additive Timeline section has loading / empty / error states
   **And** snapshot, lifecycle, complimentary, recent audit, and ops recovery remain (P1-07)
   **And** 1440×900 and 390×844 do not overflow (P1-01)
   **And** skip-link + one h1 + timeline heading remain (P1-12)
   **And** Timeline is read-only — no retry/replay/requeue/status mutations

6. **Given** a query failure
   **When** all sources share one DbContext
   **Then** the API returns 503 and the UI shows unavailable — not an empty/complete timeline that silently omitted a source
   **And** other tenant-detail sections remain usable

## Source audit (Winston / Grok — current schema)

| Source | Ownership | Timestamp | Event-like? | Safe fields used | Intentionally excluded |
|---|---|---|---|---|---|
| `platform_audit_logs` (`PlatformAuditLog`) | `TenantId` required | `CreatedAt` | Yes | Id, Action, Reason (sanitized), ActorUserId, ActorEmail, CreatedAt | `DetailsJson` omitted entirely — no allow-listed projection exists |
| `support_issues` (`SupportIssue`, ITenantScoped) | `TenantId` | `CreatedAt` | Yes — opened milestone only | Id, IssueNumber, Status, CreatedAt | Description, Subject, InternalNote, OperatorEmail, attachments, UserAgent |
| `support_issue_replies` (`SupportIssueReply`) | via parent `SupportIssue.TenantId` | `CreatedAt` | Yes — reply recorded | Id, IssueNumber, CreatedAt | Body, ActorEmail, ActorUserId |
| `outbox_messages` (`OutboxMessage`, not ITenantScoped) | `TenantId` required | `CreatedAt` | Yes | Id, MessageType, Status, AttemptCount, CreatedAt, ProcessedAt, DispatchedAt, LastErrorSanitized | PayloadJson, DedupeKey, raw LastError |
| `paddle_webhook_deliveries` (`PaddleWebhookDelivery`) | optional `TenantId` — **null = uncorrelated** | `ObservedAt` | Yes (44.5 diagnostic) | Id, EventType, Disposition, HttpStatus, DetailSanitized, ObservedAt | EventId unused in summary; never body/signature/ApiKey/WebhookSecret/ClientToken. Do **not** read `paddle_webhook_events` |
| `tenants` current row | `Tenant.Id` | `observedAt` (query time) | **Current-state only** | Plan, Status, BillingStatus, IsComplimentary | PaddleCustomerId, PaddleSubscriptionId, AdminContactEmail, schedule/secret fields. Never treat `UpdatedAt` as a billing history event |

Support has no persisted status-change history. Do not invent `status changed` events from `UpdatedAt` / current Status.

Partial failure: all sources are PostgreSQL on one `CohestraDbContext`. Canonical query is all-or-nothing. Exception → 503. Do not present a partial merge as complete.

## Tasks / Subtasks

- [ ] Canonical timeline DTO + composer (AC: 3–4)
- [ ] `GET .../timeline` PlatformAdminOnly + 404/503 (AC: 1, 6)
- [ ] Bounded per-source queries + deterministic merge (AC: 3)
- [ ] Additive Timeline on tenant detail; keep recent audit (AC: 5)
- [ ] Unit, integration, TenantIsolation, frontend, Playwright (AC: all)
- [ ] BMAD code-review loop on final HEAD; trace; NFR; checkpoint (AC: all)

## Dev Notes

### Type vocabulary

`audit` | `support` | `outbox` | `paddle` | `billing_snapshot`

### Provenance

`platform_audit_logs` | `support_issues` | `outbox_messages` | `paddle_webhook_deliveries` | `tenants/current billing snapshot`

### Bounds (implementation detail)

Per historical source: 25 recent rows (AD-15 default). Merged cap: 50 (AD-15 max). Billing snapshot always included and is newest (`observedAt`).

### Exclusions

Do not start 44.7–44.9. No platform-wide audit search, no Severity, no GIT_SHA. No mutations. DigitalOcean missing host is Epic 19, not this story.

### Project context / AD

- AD-12 / AD-18: read-only observability; reuse 44.4/44.5 sanitization
- AD-15: page default 25 / max 50
- P0-16 tenant isolation mandatory
- FR-44-12

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6 (exclusive primary). Composer 2.5 not delegated. Auto disabled.

### Debug Log References

### Completion Notes List

### File List
