---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/planning-artifacts/proposal-platform-production-support.md
  - _bmad-output/implementation-artifacts/investigations/platform-admin-production-support-investigation.md
  - _bmad-output/implementation-artifacts/investigations/party-platform-production-support.md
  - _bmad-output/planning-artifacts/spec-43-4-platform-administration.md
  - _bmad-output/planning-artifacts/ux-spec-43-4-platform-administration.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-07-18/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-07-18/EXPERIENCE.md
  - _bmad-output/planning-artifacts/architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/epics-cohestra-enterprise.md
  - _bmad-output/planning-artifacts/prds/prd-cohestra-enterprise-2026-07-15/prd.md
  - _bmad-output/project-context.md
  - docs/deploy/paddle-production-cutover.md
ownerApproval: 2026-10-08
ownerSource: "Approve Production Support Planning — PR #411 refinements"
reconciledHead: "69814fc3"
project_name: cohestra
initiative: Platform Production Operations & Support Center
outputNote: Dedicated file — does not replace Platform 0 epics.md or Enterprise epics-cohestra-enterprise.md
epicsApproved: 2026-10-08
storiesCompleted: 2026-10-08
validationStatus: passed
storyCounts:
  epic44: 9
updated: 2026-10-08
---

# cohestra — Epic Breakdown (Platform Production Support)

## Overview

This document is the canonical Epic **44** definition for Cohestra's **Platform Production Operations & Support Center**. It decomposes the owner-approved Phase 0 investigation (draft PR #411, `main` `69814fc3`) plus 2026-10-08 refinements into independently deliverable stories.

**Brownfield.** Extend the existing Platform Admin plane. Do not create a second frontend. Do not merge Platform UI into tenant Admin. Do not reopen Epics 11, 26–28, 29, 43.4, or treat this epic as Epic 19 UAT.

**Planning only.** This file does not authorize `bmad-dev-story`, feature code, merge to `main`, deploy, or production credential changes.

## Requirements Inventory

### Functional Requirements

FR-44-1: All new and existing `/api/v1/platform/*` endpoints require `PlatformAdminOnly` (`platform_admin=true`, no `tenant_id`, no membership `role`). Tenant Admin / Member JWTs receive 403.

FR-44-2: Platform recovery POSTs (password-reset, resend-email-verification) are rate-limited per actor. Redis outage fails closed (HTTP 503), matching Epic 18.4 limiter policy.

FR-44-3: HTTP integration tests cover Epic 28 ops routes (search, snapshot, members, open-issues, recovery). Controller policy tests include `PlatformOpsController`. TenantIsolation includes tenant-JWT denial of those routes.

FR-44-4: PlatformAdmin can open **Overview** at `/platform/overview`. `/platform` remains the tenant-directory home. Overview is a separate nav entry listed first.

FR-44-5: Overview shows fleet KPIs with a required provenance envelope (`value`, `source`, `observedAt`, `freshness` ∈ `actual` | `missing_instrumentation` | `unavailable` | `stale`). No fictional health or availability numbers.

FR-44-6: Authenticated `GET /api/v1/platform/ops/health` wraps ready-tagged `HealthCheckService` checks (postgres, redis, default-tenant). It must not describe `/ready` as proving outbox, Paddle, SendGrid, or hosted-job health. Anonymous `GET /ready` JSON and check set stay unchanged.

FR-44-7: Platform nav adds **Operations** (`/platform/ops`) and **Audits** (`/platform/audits`) as separate entries. Existing Tenants and Support workflows stay.

FR-44-8: Directory `/platform` shows a degraded banner when authenticated health is not Healthy. Banner uses actual health data, not a synthetic pulse.

FR-44-9: PlatformAdmin can inspect outbox depth and Failed/Pending/Processing rows via paginated, tenant-filterable read APIs. Responses omit `PayloadJson`, email bodies, tokens, and unredacted traces.

FR-44-10: Additive Paddle webhook **disposition** logging records processor outcomes plus controller-level invalid-signature and malformed requests with data minimization and bounded retention. It does not replace `paddle_webhook_events` idempotency, change HTTP retry semantics, alter entitlements, or allow replay.

FR-44-11: PlatformAdmin can diagnose Paddle configuration (no secrets) and browse disposition/ledger rows. UI has no Replay, Mark Paid, or payment-state controls.

FR-44-12: Tenant detail exposes a diagnostic **timeline** correlating platform audits, support issue events, current billing snapshot, that tenant's outbox summaries, and that tenant's Paddle deliveries. Cross-tenant mix is forbidden.

FR-44-13: PlatformAdmin can search `platform_audit_logs` with pagination, filters, and a bounded CSV export. Unbounded cross-tenant PII dumps are forbidden.

FR-44-14: Support issues gain an additive **Severity** field. Platform inbox can filter and set it. Tenant submit default is defined. A standalone Incident entity is not in this epic.

FR-44-15: Authenticated version readout (`gitSha`, environment name, api version) with provenance. Missing SHA is `missing_instrumentation`, never a fake build id. No rollback control.

FR-44-16: Mutations introduced in this epic (severity changes, rate-limit configuration is not a mutation) write `PlatformAuditLog` with actor, action, tenantId when applicable, timestamp. Existing lifecycle/recovery audits remain.

FR-44-17: Failed-outbox requeue, impersonation, SQL consoles, arbitrary job replay, manual payment-state changes, and webhook replay are not implemented.

FR-44-18: Preserve Platform Admin identity: `/platform/login` on marketing apex; mutually exclusive roles; 43.4 tokens, skip-link, copy lock (“Workspace paused.” / “Billing is on hold.”).

### NonFunctional Requirements

NFR-44-1 (Security): Least privilege; PlatformAdminOnly; tenant JWT denial; path `tenantId` isolation; no secret/payload/token leakage in DTOs or logs.

NFR-44-2 (Data minimization): Sanitize provider/error text to a bounded allowlisted/truncated string (max 200 chars, no stack traces, no connection strings, no Paddle/JWT/SendGrid secrets).

NFR-44-3 (Retention): Disposition rows for invalid-signature and malformed requests retain ≤ 14 days and are capped; successful/ignored/retryable delivery rows retain ≤ 90 days; FIFO prune when over cap. Exact windows are the planning default pending owner override.

NFR-44-4 (Performance): List endpoints clamp `pageSize` (default 25, max 50). Omni-search caps unchanged. Overview/health queries must not table-scan unbounded outbox/webhook history.

NFR-44-5 (Accessibility): WCAG 2.2 AA; 43.4 skip-link, one main, one h1, `aria-current`, ≥44px targets, focus-visible on ink. Viewports 1440×900 and 390×844; no page overflow at 390.

NFR-44-6 (Reliability): Anonymous `/ready` remains postgres + redis + default-tenant only. Health UI distinguishes confirmed failure vs missing instrumentation vs unavailable vs stale.

NFR-44-7 (Truth in metrics): Never generate fictional live metrics. If a source is absent, render `missing_instrumentation` or `unavailable`.

NFR-44-8 (Abuse): Recovery rate limits fail closed on Redis outage. Diagnostic GETs may be rate-limited if they are expensive; they must still be PlatformAdminOnly.

NFR-44-9 (Isolation gate): TenantIsolation category tests on every new platform list/detail that accepts `tenantId`. SM-1 still required on PRs to `main`.

NFR-44-10 (Independence): Epic 19 remains the production-readiness/UAT gate. Epic 44 CI green does not mean production cutover.

### Additional Requirements

- Brownfield extend `Cohestra.sln` + `web/` only (project-context).
- Inherit enterprise AD-7 (Platform Admin claim, not TenantMembership), AD-10 (TenantIsolation), FR-7 (no impersonation), FR-18 (`/ready` anonymous + immutable lifecycle audit — **extend**, do not replace).
- Preserve Epic 29 / `#404` Paddle processor: signature verification, `event_id` uniqueness, retry HTTP 503, adjustment cursors, complimentary skip, Suspend ≠ collections.
- Reuse `RedisRateLimiterOperations` and fail-closed 503 (`RateLimiterUnavailableException`) for recovery limits.
- Inject deploy SHA via existing deploy path (`deploy/remote-deploy.sh` already logs commit) — do not invent a metrics microservice or Hangfire.
- KPI DTO envelope is an architecture invariant (see epic spine AD-13).
- Disposition logging is additive to `paddle_webhook_events`; do not dual-purpose the idempotency table as a failure log.
- No starter-template story (brownfield).

### UX Design Requirements

UX-44-1: Nav order — Overview, Tenants (`/platform` home), Support, Operations, Audits, Sign out. `aria-current` rules extended per route family without breaking 43.4 Tenants/Support tests except by additive cases.

UX-44-2: `/platform` directory IA, filters, create tenant, omni-search, lifecycle, complimentary, support inbox/detail/report remain.

UX-44-3: Operations is one nav item with in-page sections Health, Billing, Outbox — not three top-level links.

UX-44-4: Every new view implements loading, empty, stale, degraded, error, unauthorized, success. Sparse Platform voice. Errors say what happened, what it means, what to do.

UX-44-5: Directory degraded banner when authenticated health ≠ Healthy; actual data; not a chart.

UX-44-6: Inherit `--plat-*` aliases, gold wash, `--plat-header-muted` on ink, no `AdminRouteTransition`, no tenant sidebar / PlanBadge / Follow-up chrome.

UX-44-7: Copy lock — Suspended “Workspace paused.”; Billing OnHold “Billing is on hold.” Operations displays BillingStatus; never offers mark-paid.

UX-44-8: Prove 1440×900 and 390×844 for Overview, Operations, Audits, tenant timeline, and existing directory/support regressions. Mobile menu ≥44px.

UX-44-9: Motion — `transition-colors` only; inherit `prefers-reduced-motion`. No Cinema on platform.

UX-44-10: KPI provenance is visible in the UI (source + freshness + observed time), not only in JSON.

UX-44-11: Destructive/sensitive future actions stay AlertDialog (38.6 / 43.4). This epic has no new destructive recovery except existing password-reset / resend-verify dialogs.

### FR Coverage Map

FR-44-1: Stories 44.1–44.9 (policy on every new controller; 44.1 closes existing ops gap)
FR-44-2: Story 44.1
FR-44-3: Story 44.1
FR-44-4: Story 44.2
FR-44-5: Story 44.2 (health KPI may be `missing_instrumentation` until 44.3)
FR-44-6: Story 44.3
FR-44-7: Stories 44.2 (Overview), 44.3 (Operations), 44.7 (Audits)
FR-44-8: Story 44.3
FR-44-9: Story 44.4
FR-44-10: Story 44.5
FR-44-11: Story 44.5
FR-44-12: Story 44.6
FR-44-13: Story 44.7
FR-44-14: Story 44.8
FR-44-15: Story 44.9
FR-44-16: Stories 44.5 (system disposition writes), 44.8 (severity)
FR-44-17: All stories (negative AC / non-goals)
FR-44-18: All UI stories 44.2–44.9

## Epic List

### Epic 44: Platform Production Operations & Support Center

PlatformAdmins operate production from the existing staff console: verified fleet pulse, infrastructure health that does not overclaim, outbox and Paddle diagnostics without secrets or replay, correlated tenant timelines, searchable audits, and support severity — without impersonation, SQL, payment mutation, or a second frontend.

**FRs covered:** FR-44-1 through FR-44-18
**NFRs covered:** NFR-44-1 through NFR-44-10
**UX-DRs covered:** UX-44-1 through UX-44-11

**User outcome:** A PlatformAdmin can answer “is the box healthy, is mail stuck, did Paddle ingest, what happened to this tenant, who changed what, which tickets are urgent?” from `/platform/*` using source-backed data.

**Independence:** Does not require Epic 19 close. Does not require a later Incident epic. Does not implement outbox requeue.

## Epic 44: Platform Production Operations & Support Center

PlatformAdmins gain a production operations and support center on the existing Platform Admin identity, authorization, and UX plane. Each story is independently shippable in sequence and leaves Tenants + Support usable.

**Depends on (existing, done):** Epic 11 lifecycle/directory/`/ready`; 12.4 `platform_admin` claim; 17.3 platform JWT 403; Epics 26–28 support + ops console; 43.4 staff-console UX; Epic 29 + `#404` Paddle processor.

**Must not depend on:** Epic 19.4/19.5 acceptance.

**Threat model (epic-wide):** tenant JWT on platform routes; cross-tenant mix on `tenantId` filters; outbox/Paddle payload or secret leak; unredacted traces; unbounded exports; webhook replay UI; fake health; widening `/ready`.

---

### Story 44.1: Platform ops HTTP gates, policy coverage, and recovery rate limits

As a **PlatformAdmin**,
I want **existing ops and recovery APIs proven authorized, integration-tested, and rate-limited**,
So that **the console we already shipped cannot be abused before we add more production-support surface**.

**FRs:** FR-44-1, FR-44-2, FR-44-3, FR-44-17, FR-44-18
**Depends on:** none (first story)
**Authorization:** existing `PlatformAdminOnly`
**Rollback:** revert test + limiter middleware; no schema

**Acceptance Criteria:**

**Given** the Platform ops controller is deployed
**When** `TenantAuthControllerPolicyTests` runs
**Then** `PlatformOpsController` is included in the PlatformAdminOnly allow-list with Tenants, Support, Reports, and Me
**And** no platform controller uses Identity role names as the gate

**Given** a PlatformAdmin session
**When** the client calls `GET /api/v1/platform/search`, `GET .../tenants/{id}/snapshot`, `GET .../members`, `GET .../open-issues`, and recovery POSTs for a member of that tenant
**Then** integration tests assert 200/409 as specified by current Epic 28 behavior (unverified member password-reset 409; remaining routes 200)
**And** snapshot/search/members/open-issues responses match existing contracts

**Given** a TenantAdmin or TenantMember JWT
**When** those same platform ops routes are called
**Then** the response is 403
**And** tests are tagged `TenantIsolation`

**Given** a PlatformAdmin who exceeds the recovery rate limit
**When** they POST password-reset or resend-email-verification
**Then** the API returns 429 with ProblemDetails
**And** Redis-backed limiter uses `RedisRateLimiterOperations`
**And** if Redis is unavailable the API returns 503 (`RateLimiterUnavailableException`) rather than sending mail

**Given** this story
**When** implementation is reviewed
**Then** no Overview, Operations, Audits, outbox, Paddle disposition, severity, or version features are added
**And** no impersonation, SQL, webhook replay, or outbox requeue exists

---

### Story 44.2: Production overview with source-backed KPIs

As a **PlatformAdmin**,
I want **a fleet Overview at `/platform/overview` that states where each number came from**,
So that **I can see tenant and support pulse without treating missing instrumentation as live health**.

**FRs:** FR-44-4, FR-44-5, FR-44-7 (Overview nav), FR-44-18
**UX:** UX-44-1, UX-44-4, UX-44-6, UX-44-8, UX-44-9, UX-44-10
**Depends on:** 44.1
**Authorization:** `PlatformAdminOnly` on `GET /api/v1/platform/ops/overview`
**Rollback:** remove route + nav item; `/platform` directory unchanged

**Acceptance Criteria:**

**Given** a PlatformAdmin
**When** they open `/platform/overview`
**Then** the page has one h1, skip-link still lands on `#main-content`, and Overview has `aria-current="page"`
**And** nav order is Overview, Tenants, Support (Operations/Audits may be absent until later stories)

**Given** the same admin
**When** they open `/platform`
**Then** the tenant directory is unchanged as home (search, filters, create, omni-search)
**And** Tenants has `aria-current="page"`

**Given** `GET /api/v1/platform/ops/overview`
**When** a PlatformAdmin calls it
**Then** each KPI is a provenance envelope with `value`, `source`, `observedAt`, `freshness`
**And** tenant counts by Status and BillingStatus are `actual` from PostgreSQL `tenants`
**And** open support count is `actual` from `support_issues` (or the existing open-count query)
**And** stack health is `missing_instrumentation` or omitted until Story 44.3 — never a fake “healthy” gauge
**And** demo/load-test tenants follow the same hideLoadTest convention as the directory (default hidden)

**Given** a TenantAdmin JWT
**When** they `GET /api/v1/platform/ops/overview` or open `/platform/overview`
**Then** API 403 and the platform route guard redirects away from the console

**Given** empty or error data
**When** Overview renders
**Then** empty, error, and loading states exist
**And** Playwright covers 1440×900 and 390×844 with no page overflow

---

### Story 44.3: Authenticated infrastructure health and Operations shell

As a **PlatformAdmin**,
I want **to see postgres, redis, and default-tenant check results in Operations, and a directory banner when they are not Healthy**,
So that **I do not confuse anonymous `/ready` with outbox, Paddle, or email health**.

**FRs:** FR-44-6, FR-44-7, FR-44-8
**UX:** UX-44-3, UX-44-4, UX-44-5, UX-44-10
**Depends on:** 44.2
**Authorization:** `PlatformAdminOnly` on `GET /api/v1/platform/ops/health`
**Rollback:** remove health endpoint + Operations route + banner; `/ready` unchanged

**Acceptance Criteria:**

**Given** anonymous `/ready`
**When** this story ships
**Then** the check set is still postgres, redis, default-tenant only
**And** response shape is unchanged from `Program.cs` ready writer

**Given** a PlatformAdmin
**When** they `GET /api/v1/platform/ops/health`
**Then** the payload includes those three checks with status, duration, and sanitized description
**And** it explicitly lists dependencies **not** checked (outbox, Paddle, SendGrid, hosted jobs) as `missing_instrumentation` or `not_in_probe` — not as Healthy
**And** connection strings, Redis endpoints with passwords, and exception stacks are absent
**And** overall status is Healthy / Degraded / Unhealthy from `HealthCheckService`, not invented

**Given** Overview
**When** health API exists
**Then** the Overview health KPI freshness is `actual` and uses this endpoint
**And** if the health API fails, Overview shows `unavailable`, not a cached fake green

**Given** `/platform/ops`
**When** a PlatformAdmin opens it
**Then** Operations appears in nav with `aria-current` on `/platform/ops`
**And** the Health section renders the authenticated checks
**And** Billing and Outbox sections may be empty-with-`missing_instrumentation` until 44.4/44.5

**Given** authenticated health is not Healthy
**When** the admin is on `/platform`
**Then** a degraded banner explains which checks failed and that `/ready` does not cover outbox/Paddle/email
**And** the banner uses actual check results

**Given** a TenantAdmin JWT
**When** they call the health API
**Then** 403

---

### Story 44.4: Outbox and notification observability (read-only)

As a **PlatformAdmin**,
I want **paginated outbox counts and failed-job rows without payloads**,
So that **I can see stuck notification mail without reading customer email bodies**.

**FRs:** FR-44-9 · **NFRs:** NFR-44-4
**Depends on:** 44.3
**Authorization:** `PlatformAdminOnly`
**Rollback:** revert endpoints + Outbox section; no requeue to remove

**Acceptance Criteria:**

**Given** `outbox_messages` rows
**When** PlatformAdmin `GET /api/v1/platform/ops/outbox/summary`
**Then** counts by `Status` (and optional `MessageType`) are `actual` with provenance
**And** `pageSize` default 25 max 50 on list endpoints

**Given** `GET /api/v1/platform/ops/outbox`
**When** filters include status, messageType, tenantId, from, to
**Then** items include id, tenantId, messageType, status, attemptCount, timestamps, and `lastErrorSanitized`
**And** JSON never contains `payloadJson`, raw MIME, email To/From bodies, or tokens
**And** `lastErrorSanitized` is truncated ≤ 200 characters with secrets stripped

**Given** `tenantId` of tenant A
**When** the list is filtered
**Then** no tenant B rows appear
**And** TenantIsolation tests cover that filter
**And** omitting tenantId is allowed for PlatformAdmin but still paginated (not an unbounded dump)

**Given** Operations → Outbox
**When** there are zero Failed rows
**Then** empty state explains that no failed jobs are recorded — not that email is healthy
**And** UI has no Requeue / Replay / Retry control

**Given** a TenantAdmin JWT
**When** they call outbox endpoints
**Then** 403

---

### Story 44.5: Additive Paddle disposition logging and billing diagnostics

As a **PlatformAdmin**,
I want **a minimized Paddle delivery log and config flags without secrets**,
So that **I can see whether webhooks were processed, ignored, retried, or rejected without changing billing**.

**FRs:** FR-44-10, FR-44-11, FR-44-16
**Depends on:** 44.3 (Operations shell); does not change 44.4
**Authorization:** `PlatformAdminOnly` on diagnostic GETs; webhook POST remains anonymous + signature
**Rollback:** stop writing/reading disposition table; processor and `paddle_webhook_events` unchanged; table may remain unused

**Acceptance Criteria:**

**Given** `POST /api/v1/system/paddle/webhook`
**When** signature verification, duplicate `event_id`, tracked-type handling, 503 retry, complimentary skip, and entitlement transitions run
**Then** behavior matches pre-story processor tests (`PaddleWebhookProcessorTests`, integration tests)
**And** `paddle_webhook_events` remains the idempotency ledger (insert after successful handle)

**Given** a processed, duplicate, ignored, or retryable processor result
**When** the request finishes
**Then** an additive disposition row is stored with event id (if known), event type, disposition, optional tenantId, HTTP status, sanitized detail ≤ 200 chars, timestamp
**And** raw JSON body is never persisted
**And** disposition write failure must not change webhook HTTP semantics (log + continue; do not convert 200 into 500 because the diagnostic log failed)

**Given** missing/invalid `Paddle-Signature` or malformed JSON
**When** the controller rejects the request
**Then** HTTP status remains 400 (or existing 503 if secret unconfigured)
**And** a disposition row is stored without body, without secrets, without stack traces
**And** invalid-signature/malformed retention is ≤ 14 days and subject to a hard row cap with FIFO prune
**And** other dispositions retain ≤ 90 days (planning default)

**Given** `GET /api/v1/platform/ops/paddle/config`
**When** a PlatformAdmin calls it
**Then** response may include `isConfigured`, `environment`, `allowLive`, and API host — never `ApiKey`, `WebhookSecret`, `ClientToken`, or price IDs unless already public catalog ids are explicitly listed as non-secret (default: omit price ids)

**Given** `GET /api/v1/platform/ops/paddle/deliveries`
**When** PlatformAdmin filters by disposition, eventType, tenantId, time
**Then** pagination clamps apply
**And** TenantAdmin receives 403
**And** tenantId filter never returns another tenant

**Given** Operations → Billing
**When** rendered
**Then** diagnostics are read-only
**And** there is no Replay Webhook, Mark Paid, Edit BillingStatus, or secret reveal
**And** UI states include empty, error, and `missing_instrumentation` if the table is empty solely because logging just started (not “Paddle is down”)

**Given** existing tenant complimentary / Suspend rules
**When** this story ships
**Then** Platform tenant lifecycle and FR-23 automation are unchanged

---

### Story 44.6: Tenant diagnostic timeline

As a **PlatformAdmin**,
I want **one tenant timeline that correlates audits, support, billing snapshot, outbox, and Paddle deliveries**,
So that **I can investigate a workspace without SQL**.

**FRs:** FR-44-12
**Depends on:** 44.4, 44.5
**Authorization:** `PlatformAdminOnly` on `GET /api/v1/platform/tenants/{tenantId}/timeline`
**Rollback:** remove timeline endpoint + detail section; snapshot remains

**Acceptance Criteria:**

**Given** tenant A
**When** PlatformAdmin requests the timeline
**Then** items are merged in time order from: `platform_audit_logs` for A, support issue events for A, outbox rows for A (summaries only), Paddle deliveries with tenantId A, plus a current billing/status snapshot stamped `observedAt`
**And** each item has type, timestamp, provenance, and a safe summary string
**And** no outbox payload, no webhook body, no secrets

**Given** tenant B's id
**When** the same admin requests it
**Then** zero tenant A events appear
**And** unknown tenant → 404

**Given** TenantAdmin JWT
**When** they call the timeline
**Then** 403

**Given** tenant detail `/platform/tenants/{id}`
**When** the page loads
**Then** a Timeline section uses loading/empty/error states
**And** existing snapshot, lifecycle, complimentary, recent audit, and ops recovery remain
**And** 1440 and 390 do not overflow

**Given** a source that 44.4/44.5 did not populate for this tenant
**When** timeline renders
**Then** that stream is empty or `missing_instrumentation`, not filled with synthetic events

---

### Story 44.7: Platform-wide searchable audits

As a **PlatformAdmin**,
I want **to search operational audits across tenants with a bounded export**,
So that **I can answer who changed what without a database console**.

**FRs:** FR-44-13, FR-44-7
**UX:** UX-44-1 (Audits nav)
**Depends on:** 44.1 (authz tests pattern); UI nav additive on 44.2 header
**Authorization:** `PlatformAdminOnly` on `GET /api/v1/platform/audits` and export
**Rollback:** remove route + nav item

**Acceptance Criteria:**

**Given** `platform_audit_logs`
**When** PlatformAdmin searches by action, tenantId, actor email, from, to
**Then** results paginate (default 25, max 50)
**And** DTO includes id, actorUserId, actorEmail, tenantId, action, reason, createdAt
**And** `DetailsJson` is omitted or replaced by a safe allowlisted projection — never raw JSON that may contain PII beyond actor email / tenant id already on the row

**Given** CSV export
**When** the same filters apply
**Then** export is capped (max 5,000 rows or the filtered page budget documented in AC tests)
**And** exceeding the cap returns 400 ProblemDetails rather than streaming the world
**And** TenantAdmin 403

**Given** `/platform/audits`
**When** opened
**Then** Audits is a separate nav entry with `aria-current`
**And** loading/empty/error/success states exist
**And** 1440 and 390 pass overflow checks
**And** tenant detail “recent audit” remains

---

### Story 44.8: Support severity (no Incident entity)

As a **PlatformAdmin**,
I want **to set and filter support issue severity**,
So that **the existing inbox can be triaged without a second case system**.

**FRs:** FR-44-14, FR-44-16
**Depends on:** 44.1
**Authorization:** `PlatformAdminOnly` to set severity on platform update; tenant submit does not require a new role
**Rollback:** ignore column in UI; nullable column may remain

**Acceptance Criteria:**

**Given** `SupportIssue`
**When** this story ships
**Then** an additive `Severity` exists (`Unspecified` | `Low` | `Medium` | `High` | `Critical` — names locked in implementation story file)
**And** there is **no** Incident entity, incident clock, or on-call roster

**Given** a tenant operator submits a new issue
**When** they do not choose severity
**Then** the stored value is `Unspecified` (planning default)
**And** tenant Support UX may omit the field in this epic (platform-only triage is sufficient)

**Given** PlatformAdmin on issue detail
**When** they PATCH severity
**Then** the change persists, inbox can filter on it, and `PlatformAuditLog` records `SupportIssueSeverityChanged`
**And** existing status/reply/attachment behavior is unchanged

**Given** Playwright/support E2E
**When** 43.4 inbox tests run
**Then** they still pass aside from additive filter control
**And** 390/1440 still hold

---

### Story 44.9: Deployment version health (read-only)

As a **PlatformAdmin**,
I want **to see the running git SHA and environment with provenance**,
So that **I know what is deployed without a rollback button**.

**FRs:** FR-44-15
**Depends on:** 44.2, 44.3
**Authorization:** `PlatformAdminOnly` on `GET /api/v1/platform/ops/version`
**Rollback:** omit SHA display; `system/info` public shape unchanged

**Acceptance Criteria:**

**Given** `GET /api/v1/platform/ops/version`
**When** `GIT_SHA` (or documented equivalent) is set in the API process environment
**Then** response includes `gitSha`, `environmentName`, `apiVersion` with provenance `actual`
**And** secrets are absent

**Given** SHA is unset
**When** the endpoint is called
**Then** `gitSha` freshness is `missing_instrumentation`
**And** the UI labels it as missing instrumentation — never `v1` as if it were a build id

**Given** `GET /api/v1/system/info`
**When** called anonymously
**Then** it remains `{ Name: Cohestra, ApiVersion: v1 }` — this story does not widen the public info endpoint with SHA

**Given** Overview and Operations
**When** version is shown
**Then** there is no Rollback, Redeploy, or SSH control
**And** TenantAdmin 403 on the version API

**Given** deploy docs
**When** this story is implemented
**Then** `deploy/remote-deploy.sh` (or compose build args) is the documented SHA injection path
**And** Epic 19 live cutover is still not claimed

---

## Definition of Done and merge gates

A story is DONE only when the **same HEAD** has:

1. SPEC (this epic + story AC)
2. Implementation on the existing Platform plane
3. `dotnet` build
4. Unit tests for new services/DTOs/sanitization/rate limits
5. Integration tests (`CI=true`, fresh `cohestra_test`) including PlatformAdmin 200 and Tenant JWT 403
6. TenantIsolation category coverage for new `tenantId` filters
7. Frontend unit tests for API helpers and provenance rendering
8. Playwright E2E for new routes at 1440×900 and 390×844 where UI shipped
9. Accessibility checks (skip-link, one h1, `aria-current`, 44px, no 390 overflow)
10. Repeating `bmad-code-review` with no unresolved BLOCKER/MAJOR
11. Product acceptance on **data truth** (UI numbers match DB / health checks)
12. UX/visual where UI changed
13. CI on that HEAD
14. Final HEAD review

**Not DoD:** CI green ≠ production ready. Epic 19 UAT, live Paddle cutover, and droplet SSH remain owner-gated and out of Epic 44.

**Merge:** Do not merge or deploy without explicit owner authorization. Do not modify production credentials.

## Deferred and forbidden capabilities

| Item | Status | Notes |
| ---- | ------ | ----- |
| Failed-outbox requeue | **Deferred — conditional future decision** | Not authorized. Revisit only after 44.4 is accepted in production use. Requires a new owner approval. |
| Standalone Incident entity | **Deferred** | Severity only (44.8) |
| Impersonation | **Forbidden** | FR-7 / 43.4 |
| Raw SQL / shell / command console | **Forbidden** | |
| Webhook replay | **Forbidden** | Would bypass `event_id` idempotency / double-apply billing |
| Arbitrary job replay / Hangfire dashboard | **Forbidden** | |
| Manual payment-state / Mark Paid | **Forbidden** | Preserve Paddle semantics |
| Secret display (Paddle, JWT, SendGrid, connection strings) | **Forbidden** | |
| Outbox `PayloadJson` in API/UI | **Forbidden** | |
| Second frontend / tenant-admin merge | **Forbidden** | |
| Widening anonymous `/ready` | **Forbidden** in this epic | Add authenticated health instead |
| Serilog / OpenTelemetry pipeline | **Deferred** | Separate observability epic |
| Rollback execute from UI | **Forbidden** | Runbook remains SSH/compose |
| Epic 19 close / live cutover | **Out of scope** | Independent gate |

## Remaining decisions requiring owner authorization

These do **not** block creating this epic file. They **do** block implementation choices inside the named stories if the owner disagrees with the planning default.

1. **Disposition retention windows** — default 14 days (invalid/malformed) / 90 days (other) + FIFO cap 50,000 rows. Approve or replace.
2. **Tenant-submitted severity default** — `Unspecified` vs `Medium`. Default `Unspecified`; tenant UI may omit the control in 44.8.
3. **Overview inclusion of demo/load-test tenants** — default match directory `hideLoadTest=true`.
4. **SHA environment variable name** — default `GIT_SHA` injected by `remote-deploy.sh`.
5. **Whether PlatformAdmin diagnostic GETs (outbox/paddle/audit search) are themselves audit-logged** — default **no** (noisy); mutations only. Flip requires owner yes.
6. **Failed-outbox requeue** — remains unauthorized until a later written approval after 44.4 acceptance.
7. **Any production merge/deploy** of implementation PRs.

## Required automated and manual tests

See `_bmad-output/planning-artifacts/test-design-epic-44-platform-production-support.md` (TEA epic test design).

Minimum per story is listed in that file. Epic-wide:

- .NET unit + integration
- Frontend unit
- Playwright E2E (new surfaces + 43.4 regression)
- TenantIsolation
- Accessibility
- Security: DTO omission tests (payload, secrets, stacks)
- Performance: pageSize clamp tests
- Manual: product acceptance that Overview/Ops numbers match DB and that `/ready` copy does not overclaim

## Architecture and security companions

- Spine: `_bmad-output/planning-artifacts/architecture/architecture-epic-44-platform-production-support/ARCHITECTURE-SPINE.md`
- UX delta: `_bmad-output/planning-artifacts/ux-designs/ux-epic-44-platform-production-support/`
- Security decisions are AD-12–AD-19 in the spine (data minimization, retention, no replay).
- Cross-functional review: `_bmad-output/planning-artifacts/reviews/epic-44-planning-review-2026-10-08.md`
- Readiness: `_bmad-output/planning-artifacts/implementation-readiness-epic-44-2026-10-08.md`
