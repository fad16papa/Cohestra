---
id: 44.4
key: 44-4-outbox-notification-observability-read-only
title: Outbox and notification observability (read-only)
status: ready-for-dev
epic: 44
created: 2026-10-09
baseline_commit: 6b1ccb988f8b828e68b16781688fef691fe63a01
---

# Story 44.4: Outbox and notification observability (read-only)

Status: ready-for-dev

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

Code review is repeating, not optional, not one-shot.

## Story

As a **PlatformAdmin**,
I want **paginated outbox counts and failed-job rows without payloads**,
so that **I can see stuck notification mail without reading customer email bodies**.

## Acceptance Criteria

1. **Given** `outbox_messages` rows
   **When** PlatformAdmin `GET /api/v1/platform/ops/outbox/summary`
   **Then** counts by `Status` (Pending, Processing, Completed, Failed) and by `MessageType` are AD-13 `PlatformKpi` with `freshness=actual` and source `PostgreSQL outbox_messages`
   **And** counts come from PostgreSQL aggregation (no full-table load, no N+1)
   **And** TenantAdmin/TenantMember 403; anonymous 401

2. **Given** `GET /api/v1/platform/ops/outbox`
   **When** filters include status, messageType, tenantId, from, to
   **Then** items include only: id, tenantId, messageType, status, attemptCount, createdAt, nextAttemptAt, processedAt, claimedAt, dispatchedAt, lastErrorSanitized
   **And** JSON never contains payloadJson, PayloadJson, DedupeKey, raw LastError, MIME, email To/From/subject/body, tokens, connection strings, or customer payload sentinels
   **And** `lastErrorSanitized` is redact-then-truncate ≤ 200 characters via the shared diagnostic sanitizer
   **And** `from`/`to` filter `CreatedAt` (UTC DateTimeOffset, inclusive); `from > to` is 400 ProblemDetails (inputs are not swapped)
   **And** invalid `status` is 400 ProblemDetails (not an empty list)
   **And** `messageType` is exact ordinal match on the indexed column — never payload search
   **And** `page` default 1; `pageSize` default 25, max 50 (clamp); omitting tenantId is allowed but still paginated
   **And** order is `CreatedAt` DESC, `Id` DESC

3. **Given** tenant A and tenant B outbox rows
   **When** list is filtered `tenantId=A`
   **Then** response contains A only (P0-10 TenantIsolation)

4. **Given** Operations → Outbox on `/platform/ops`
   **When** there are zero Failed rows
   **Then** copy is "No failed outbox jobs are recorded." — not that email is healthy, SendGrid delivered, or hosted workers are healthy
   **And** UI has zero Requeue / Replay / Retry / Run now / Reset / Delete / Cancel controls (AD-18)
   **And** `POST /api/v1/platform/ops/outbox/{id}/requeue` is 404 (P0-11)
   **And** loading does not render temporary zeros; query failure is unavailable/error, not 0

5. **Given** 44.3 health
   **When** this story ships
   **Then** authenticated health still lists outbox as `not_in_probe`
   **And** zero Failed rows do not overwrite Overview/Operations health to Healthy
   **And** Billing/Paddle remains missing instrumentation (44.5 not started)

## Tasks / Subtasks

- [ ] Safe DTOs + shared sanitizer reuse (AC: 2)
  - [ ] Allow-listed list DTO; never serialize `OutboxMessage`
  - [ ] Reuse `PlatformHealthDescriptionSanitizer` (redact first, max 200); extend JWT/email/stack redaction in that one primitive
- [ ] Summary + list services with aggregation, AsNoTracking, filters before pagination (AC: 1–3)
- [ ] PlatformAdminOnly endpoints on `PlatformOpsController` (AC: 1–2, 4)
- [ ] Operations Outbox section on existing `/platform/ops` (AC: 4–5)
- [ ] Unit, integration, TenantIsolation, frontend, Playwright (AC: all)
- [ ] BMAD code-review loop on final HEAD; trace; NFR; checkpoint (AC: all)

## Dev Notes

### Outbox domain — current reality (do not invent)

`OutboxMessage`: Id, TenantId, MessageType, PayloadJson, DedupeKey, Status, AttemptCount, CreatedAt, NextAttemptAt, ProcessedAt, ClaimedAt, DispatchedAt, LastError.

`OutboxMessageStatus`: Pending=0, Processing=1, Completed=2, Failed=3.

`LastError` column max 2000 chars (processor trims to 2000). Platform API must not return it raw.

OutboxMessage is **not** `ITenantScoped` — no global tenant query filter. Fleet reads use `AsNoTracking` on `OutboxMessages`. Do not add a tenant filter to the entity.

Do **not** modify `OutboxProcessor.ProcessBatchAsync`, claim/`FOR UPDATE SKIP LOCKED`, retry, MaxAttempts, backoff, dead-letter, campaign side effects, hosted service, or `PayloadJson`.

### AD-13 KPI envelope

Every displayed summary count: `{ value, source, observedAt, freshness }`. Successful query → `freshness=actual`. Query failure → HTTP 503 ProblemDetails; UI shows unavailable, never cached 0 / green.

Source lock: `PostgreSQL outbox_messages`. Do not invent health semantics from queue counts.

### AD-15 safe diagnostic DTOs

Never return PayloadJson, email bodies, access tokens, connection strings, Paddle secrets, exception stacks, DedupeKey.

`lastErrorSanitized` max 200 **after** redaction. Single sanitizer: `PlatformHealthDescriptionSanitizer`.

### AD-18 no mutation

Zero outbox requeue/replay/retry endpoints or UI. Zero billing mutation. Zero SQL console. Zero impersonation. 44.5 Paddle diagnostics are out of scope.

### Pagination

Follow `TenantListResponse` shape `{ items, page, pageSize, totalCount }`. AD-15 max pageSize is **50** (not the tenant directory max of 100).

### Filters

| Param | Semantics |
| --- | --- |
| status | Exact `OutboxMessageStatus` name; invalid → 400 |
| messageType | Exact ordinal match on `MessageType`; omitted = all |
| tenantId | Guid; PlatformAdmin may omit (still paginated) |
| from, to | Inclusive UTC `CreatedAt`; `from > to` → 400 |

### UI

Activate Operations → Outbox on existing `/platform/ops`. Do not add a new route. Health section stays 44.3 (outbox remains not_in_probe). Default list filter = Failed. Desktop table; 390 uses scoped horizontal table scroll (`PlatformDataTable`) — page itself must not overflow. Status is textual, not color-only.

### Project Structure Notes

- `src/Contracts/Platform/` — DTOs
- `src/Application/Platform/` — `IPlatformOpsOutboxService`
- `src/Infrastructure/Platform/` — implementation + sanitizer reuse
- `src/Api/Controllers/V1/PlatformOpsController.cs` — GET only
- `web/app/(platform)/platform/ops/page.tsx` — Outbox section
- `web/lib/platform-api.ts` — extend, do not fork

### References

- Epic 44 Story 44.4; FR-44-9; NFR-44-1, 44-2, 44-4, 44-5, 44-9, 44-10
- AD-12, AD-13, AD-15, AD-18
- TEA P0-09, P0-10, P0-11, P1-05, P1-14, P1-12
- Story 44.3 Operations shell and health truth
- `_bmad/custom/mandatory-code-review-loop.md`

## Previous Story Intelligence

- 44.3: PlatformAdminOnly class-level; health 503 on throw; sanitizer `[redacted]` not `Host=***`; Overview actual/unavailable; Operations placeholders; Playwright `getByText("postgres", { exact: true })`; TenantIsolation avoids matching the word `redis` in source strings — assert `redis://`.
- 44.2: KPI envelope + hideLoadTest; do not invent health from counts.
- 44.1: recovery limiter 429 / Redis-down 503; Tenant JWT 403.

## Git Intelligence

Baseline `origin/main` `6b1ccb988f8b828e68b16781688fef691fe63a01` (44.3 tracker-close). Branch from that SHA only.

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6 (exclusive primary). Composer 2.5 not delegated. Auto disabled.

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-10-09: Story context from Epic 44, AD-13/15/18, TEA P0-09/10/11, P1-05/14, and 44.3 Operations shell.
