---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-platform-ops-console-2026-08-18/prd.md
  - _bmad-output/planning-artifacts/prds/prd-platform-ops-console-2026-08-18/addendum.md
  - _bmad-output/planning-artifacts/prds/prd-cohestra-enterprise-2026-07-15/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-07-18/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-07-18/EXPERIENCE.md
  - _bmad-output/project-context.md
project_name: cohestra
initiative: Platform ops console v2 (Epic 28)
parentPrd: prd-platform-ops-console-2026-08-18
outputNote: Dedicated file — extends Epic 11/26/27 baseline; does not replace planning-artifacts/epics.md or epics-cohestra-enterprise.md
epicsApproved: 2026-08-18
storiesCompleted: 2026-08-18
validationStatus: passed
validationNotes: "All FR-OC-1..11 mapped to Epic 28 stories 28.1–28.13. Brownfield — no starter. Single epic consolidates /platform/* file churn. OQ-2 suspend-notify deferred. No UX mock for Snapshot — UX-DR16 sparse card only."
storyCounts:
  epic28: 13
updated: 2026-08-18
---

# cohestra — Epic Breakdown (Platform Ops Console v2)

## Overview

This document decomposes **Platform ops console v2** (PRD `prd-platform-ops-console-2026-08-18`) into implementable stories for Epic **28**. It extends the shipped baseline: tenant directory + lifecycle (Epic 11), operator Settings → Help intake (Epic 26), support inbox + volume CSV (Epic 27), and dual login doors (`/platform/login` vs `/login`).

**Thesis:** Platform Admin supports a club **without becoming the club** — Tenant Snapshot beside tickets, operator-visible Reply thread, audited Recovery Actions, no impersonation (enterprise FR-7 / A-5).

**Build order (PRD §6.1):** Snapshot → Reply+email → members+Recovery → Omni-search/filters/badge → Create Tenant UI → audit actor email.

## Requirements Inventory

### Functional Requirements

FR-OC-1: Platform Admin can view a Tenant Snapshot on Issue detail and `/platform/tenants/{id}` — plan, Status, Billing Status, isComplimentary, limit meters (seats, communities, published activities, registrations this month), LastActivityAt, open Issue count, isDemoOrLoadTest, member emails + roles; omits Client PII; served only from `/api/v1/platform/*` with PlatformAdminOnly.

FR-OC-2: Platform Admin can deep-link Issue ↔ Tenant; Tenant detail lists open Issues with Issue Number links; `mailto:` for adminContactEmail when present.

FR-OC-3: Platform Admin can add an append-only Reply to an Issue; Filer sees Replies in Settings Help (not Internal Note); empty Reply rejected (400).

FR-OC-4: System emails the Filer on Reply add and when status becomes WaitingOnOperator, Resolved, or Closed; email includes Issue Number, excludes Internal Note; Open/InProgress-only changes do not email.

FR-OC-5: Platform Admin can list Tenant members (email, role, email-verified flag) via PlatformAdminOnly API; no Client rows.

FR-OC-6: Platform Admin can trigger SendPasswordResetEmail for a Tenant member using the existing Operator reset pipeline; cannot set/view password; audited with actor email; wrong-tenant member → 404/409.

FR-OC-7: Platform Admin can trigger ResendEmailVerification for unverified members with same caps as self-serve; already-verified → 409; audited as FR-OC-6.

FR-OC-8: Platform Admin can Omni-search from directory and inbox by slug, name, member/Operator email, or Issue Number; no Client table scan; no Stripe customer id in v1.

FR-OC-9: Platform Admin can filter directory by Status and Billing Status; optional hide Load-test Tenants (default off); Support nav shows open Issue count (Open + InProgress + WaitingOnOperator); `/platform` remains directory home.

FR-OC-10: Platform Admin can create Tenant (slug, name) from directory UI wrapping existing `POST /api/v1/platform/tenants`; no auto Tenant Admin; complimentary remains separate action.

FR-OC-11: Platform Admin can read recent Tenant audits with actor **email** (not GUID-only) for new Recovery Actions and Replies; historical GUID-only rows may show unknown email (no backfill).

### NonFunctional Requirements

NFR-OC-1 (Security): Platform Admin JWT has no `tenant_id`; cannot call `/api/v1/admin/*` (403). All new endpoints are PlatformAdminOnly. No impersonation or tenant-session minting.

NFR-OC-2 (Privacy): Tenant Snapshot and Omni-search results omit Client names, phones, emails, registration answers, activity content, JWTs.

NFR-OC-3 (Audit): Recovery Actions and Replies write immutable `platform_audit_logs` with actor email, tenant id, action name, and relevant target email.

NFR-OC-4 (Rate limits): Ops-triggered email verification resend respects the same send caps as self-serve — no looser ops bypass.

NFR-OC-5 (UX density): Sparse console — one Snapshot card per surface, not a chart wall (enterprise UX-DR16).

NFR-OC-6 (Accessibility): WCAG 2.2 AA on platform admin surfaces; status/badges not color-only; form labels and error text on Create Tenant and Reply forms.

NFR-OC-7 (Brownfield): Extend existing Next.js `/platform/*` app and `PlatformTenantsController` / `PlatformSupportIssuesController` namespaces — no second app or origin.

### Additional Requirements

**From PRD addendum + architecture (brownfield)**

- Snapshot reads `ITenantAccessService.GetUsageAsync` + `TenantPlanLimits.For(plan)` + approved Platform Admin EF bypass for members; `LastActivityAt` from existing `TouchActivityAsync` (OQ-4 closed).
- `isDemoOrLoadTest`: slug prefix `load-` OR demo/seed provenance (`default` slug or Demo/LoadTest seed flag) (OQ-3 closed).
- Replies: new timeline rows or table; Internal Note field stays ops-only and never copied into Reply emails (OQ-1 closed — no Filer in-thread comment in MVP).
- Recovery: invoke same application services as self-serve forgot-password and verify resend — do not mint tenant JWT for Platform Admin.
- Omni-search: parameterized ILIKE on slug/name/email/issue_number; no `clients` join.
- Create Tenant: existing `POST /api/v1/platform/tenants` — UI only in this epic.
- Document separate browser profile for `/platform/login` vs tenant work in README (session hygiene — not a code FR).
- OQ-2 suspend-notify email: **deferred** — not in Epic 28 unless PM decides before a suspend-notify story.

**From enterprise architecture spine (inherited)**

- Platform Admin uses `platform_admin` claim; tenant routes require `tenant_id` + membership.
- Shared DB row-level tenancy; Platform Admin paths explicitly bypass EF filters only where marked.
- API-first `/api/v1/`, ProblemDetails, DTOs on wire, Docker Compose stack unchanged.

### UX Design Requirements

UX-DR16: Platform Admin console stays **sparse/ops-focused** — one Tenant Snapshot card (not a dashboard of charts); reuse existing `PlatformCard`, `PlatformDataTable`, and Midnight Atelier tokens from `ux-cohestra-2026-07-18`; atelier refresh of `platform-admin-suspend.html` mock is optional, not blocking.

UX-DR-OC-1: Snapshot card layout — labeled rows for plan/status/billing, compact limit meters (used/max), last activity timestamp, open issue count, demo/load-test badge, member list truncated with expand or link to members panel.

UX-DR-OC-2: Reply composer on Issue detail — distinct visual treatment from Internal Note (e.g., separate card/section heading "Reply to operator"); published Replies read-only list below composer.

UX-DR-OC-3: Recovery Actions on Tenant detail — per-member row actions (Send password reset, Resend verification) with confirm dialog citing audit trail; disabled with tooltip when already verified (for resend) or action inapplicable.

UX-DR-OC-4: Omni-search — single search input shared pattern on `/platform` directory and `/platform/support` inbox; results grouped Tenants vs Issues with safe fields only.

UX-DR-OC-5: Support nav badge — count pill on "Support" in platform header; does not change default landing route.

### FR Coverage Map

FR-OC-1: Epic 28 — Stories 28.1, 28.2
FR-OC-2: Epic 28 — Story 28.3
FR-OC-3: Epic 28 — Stories 28.4, 28.5
FR-OC-4: Epic 28 — Story 28.6
FR-OC-5: Epic 28 — Story 28.7
FR-OC-6: Epic 28 — Story 28.8
FR-OC-7: Epic 28 — Story 28.9
FR-OC-8: Epic 28 — Story 28.10
FR-OC-9: Epic 28 — Story 28.11
FR-OC-10: Epic 28 — Story 28.12
FR-OC-11: Epic 28 — Story 28.13

## Epic List

### Epic 28: Platform Ops Console v2 — Snapshot, Reply, Recovery & Findability

Francis (Platform Admin) can triage support Issues with a Tenant Snapshot beside the ticket, send operator-visible Replies the Filer reads in Settings Help, recover locked-out Operators via audited email actions, find Tenants and Issues via Omni-search, provision pilot Tenants from the directory, and read audits with actor email — **without signing into `{slug}/dashboard` or impersonating anyone**.

**FRs covered:** FR-OC-1 through FR-OC-11
**Depends on:** Epic 11 (platform directory/lifecycle), Epic 26 (operator intake), Epic 27 (support inbox), platform login path hardening
**Pre-sprint gate:** Platform Admin authenticated at apex `/platform/login`; Epic 27 inbox smoke passes

## Epic 28: Platform Ops Console v2 — Snapshot, Reply, Recovery & Findability

Francis can support clubs from the apex console alone: see plan context on every ticket, close the loop with the Filer, reset access safely, and find the right workspace fast.

### Story 28.1: Tenant Snapshot API

As a **Platform Admin**,
I want a read-only Tenant Snapshot API,
So that Issue and Tenant detail pages can show plan context without a tenant JWT.

**Acceptance Criteria:**

**Given** I am authenticated with a Platform Admin JWT
**When** I GET `/api/v1/platform/tenants/{tenantId}/snapshot`
**Then** the response includes plan, Status, Billing Status, isComplimentary, limit meters (seats, communities, published activities, registrations this month), LastActivityAt, open Issue count, isDemoOrLoadTest, and member emails with roles (Tenant Admin / Member) (FR-OC-1)
**And** the response omits Client names, phones, registration answers, activity content, and JWTs (NFR-OC-2)
**And** limit meters use `GetUsageAsync` + `TenantPlanLimits.For(plan)` per addendum

**Given** `isDemoOrLoadTest` evaluation
**When** the Tenant slug starts with `load-` OR matches demo/seed provenance (`default` slug or Demo/LoadTest seed flag)
**Then** `isDemoOrLoadTest` is true (OQ-3)

**Given** a tenant Admin JWT without platform claim
**When** it calls the snapshot endpoint
**Then** the API returns 403 (NFR-OC-1)

**Given** a Platform Admin JWT
**When** it calls any `/api/v1/admin/*` route
**Then** the API returns 403 (FR-OC-1 consequence)

### Story 28.2: Tenant Snapshot UI on Issue and Tenant Detail

As a **Platform Admin**,
I want the Tenant Snapshot card on Issue detail and Tenant detail,
So that I can diagnose plan-limit and billing tickets without opening `{slug}/dashboard`.

**Acceptance Criteria:**

**Given** I open `/platform/support/{issueId}`
**When** the Issue loads
**Then** a single Snapshot card renders beside or below Issue metadata using the Story 28.1 API (FR-OC-1, UX-DR16, UX-DR-OC-1)
**And** the card shows labeled plan/status/billing rows, compact used/max meters, LastActivityAt, open Issue count, demo/load-test badge when true, and member emails with roles

**Given** I open `/platform/tenants/{tenantId}`
**When** the Tenant loads
**Then** the same Snapshot card component renders with identical fields (FR-OC-1)
**And** the layout remains sparse — no chart wall or CRM-style panels (NFR-OC-5)

**Given** the Snapshot API fails
**When** the page renders
**Then** I see an inline error on the card without breaking Issue/Tenant actions

### Story 28.3: Deep Links Issue ↔ Tenant

As a **Platform Admin**,
I want navigation between an Issue and its Tenant plus open Issue links on Tenant detail,
So that I can move between ticket and directory context in one click.

**Acceptance Criteria:**

**Given** I am on Issue detail
**When** I view the Snapshot or Tenant header area
**Then** a link navigates to `/platform/tenants/{tenantId}` (FR-OC-2)

**Given** I am on Tenant detail
**When** open Issues exist for that Tenant
**Then** a list shows Issue Number links to `/platform/support/{issueId}` for Issues not in Resolved/Closed status (FR-OC-2)
**And** an empty state shows when no open Issues exist

**Given** the Tenant has `adminContactEmail`
**When** I view Tenant detail
**Then** a `mailto:` link is available for that address (FR-OC-2)

### Story 28.4: Reply API (Append-Only)

As a **Platform Admin**,
I want to add Replies to an Issue via API,
So that operators can read responses in Settings Help without seeing Internal Notes.

**Acceptance Criteria:**

**Given** I am a Platform Admin
**When** I POST a non-empty Reply body to `/api/v1/platform/support-issues/{id}/replies`
**Then** a Reply row is persisted with timestamp and actor id (FR-OC-3)
**And** the Reply is append-only — no edit or delete endpoint in v1

**Given** I POST whitespace-only or empty Reply body
**When** the API validates the request
**Then** it returns 400 ProblemDetails (FR-OC-3)

**Given** Replies exist on an Issue
**When** I GET Issue detail as Platform Admin
**Then** Replies are included in chronological order separate from Internal Note

**Given** Internal Note content on the Issue
**When** any operator-facing DTO is built
**Then** Internal Note is excluded from operator Help responses (FR-OC-3)

### Story 28.5: Operator-Visible Reply in Settings Help

As an **Operator (Filer)**,
I want to read Replies on my support requests in Settings → Help,
So that I can act on Francis's guidance without signing into `/platform`.

**Acceptance Criteria:**

**Given** I am a Tenant Admin authenticated on my tenant host
**When** I open Settings → Help and view a submitted Issue
**Then** I see Replies in chronological order with Issue Number, status, and timestamps (FR-OC-3, UJ-2)
**And** Internal Note is never shown (FR-OC-3)

**Given** no Replies exist yet
**When** I view the Issue in Help
**Then** I see the original subject/description and current status only

**Given** Platform Admin adds a Reply on `/platform/support/{id}`
**When** I refresh Settings Help
**Then** the new Reply appears without exposing Internal Note

### Story 28.6: Email Filer on Reply and Selected Status Changes

As an **Operator (Filer)**,
I want email when Francis replies or moves my Issue to WaitingOnOperator, Resolved, or Closed,
So that I know to check Settings Help without filing a duplicate ticket.

**Acceptance Criteria:**

**Given** a Platform Admin publishes a Reply
**When** the Reply is saved
**Then** an email is sent to the Issue's Operator email only with Issue Number and Reply body (FR-OC-4)
**And** Internal Note is not included in the email

**Given** Issue status changes to WaitingOnOperator, Resolved, or Closed
**When** the update succeeds
**Then** the Filer receives an email with Issue Number and new status (FR-OC-4)
**And** Open → InProgress or InProgress → Open changes alone do **not** send email

**Given** email dispatch fails
**When** the Reply or status update already persisted
**Then** the API still succeeds; failure is logged for ops follow-up (outbox/retry pattern consistent with Epic 27)

### Story 28.7: List Tenant Members for Ops

As a **Platform Admin**,
I want to list members of a Tenant with role and verification status,
So that I can identify who to help when an Operator is locked out.

**Acceptance Criteria:**

**Given** I am a Platform Admin
**When** I GET `/api/v1/platform/tenants/{tenantId}/members`
**Then** the response lists email, role (Tenant Admin / Member), and email-verified flag per member (FR-OC-5)
**And** no Client rows are returned (FR-OC-5, NFR-OC-2)

**Given** a Tenant with zero memberships (provisioned husk)
**When** I call the members endpoint
**Then** I receive an empty list with 200 (FR-OC-5)

**Given** I am on `/platform/tenants/{tenantId}`
**When** the members panel loads
**Then** it displays the member list from the API (UX-DR-OC-3 precursor)

### Story 28.8: Send Password Reset (Audited)

As a **Platform Admin**,
I want to send a password reset email to a Tenant member,
So that a locked-out Operator can recover using the same flow as self-serve forgot-password.

**Acceptance Criteria:**

**Given** I am a Platform Admin viewing Tenant members
**When** I confirm Send password reset for a member on that Tenant
**Then** the system invokes the existing Operator reset-email pipeline (OTP or link — whichever production uses) (FR-OC-6)
**And** Platform Admin cannot set or view the new password (FR-OC-6, NFR-OC-1)

**Given** the action succeeds
**When** audit logs are written
**Then** `platform_audit_logs` includes actor email, tenant id, member email, and action name (FR-OC-6, NFR-OC-3)

**Given** the member id is not on the requested Tenant
**When** I trigger reset
**Then** the API returns 404 or 409 and no email is sent (FR-OC-6)

**Given** I trigger reset
**When** the confirm dialog appears
**Then** copy mentions the action is audited (UX-DR-OC-3)

### Story 28.9: Resend Email Verification (Audited)

As a **Platform Admin**,
I want to resend email verification for an unverified Tenant member,
So that OTP/login issues can be fixed without impersonation.

**Acceptance Criteria:**

**Given** a member with unverified email on the Tenant
**When** I confirm Resend verification
**Then** the system uses the same send caps and rate limits as self-serve resend (FR-OC-7, NFR-OC-4)
**And** an audit row is written with actor email like Story 28.8 (FR-OC-7, NFR-OC-3)

**Given** the member is already verified
**When** I trigger resend
**Then** the API returns 409 with clear ProblemDetails and sends no email (FR-OC-7)

**Given** the member is not on the Tenant
**When** I trigger resend
**Then** the API returns 404 or 409 and sends no email

### Story 28.10: Omni-Search

As a **Platform Admin**,
I want one search box on the directory and inbox,
So that I can find a Tenant or Issue by slug, name, email, or Issue Number.

**Acceptance Criteria:**

**Given** I am on `/platform` or `/platform/support`
**When** I enter a query matching a Tenant slug, Tenant name, member/Operator email, or Issue Number (`SUP…`)
**Then** results return Tenants and Issues only with snapshot-safe identifier fields (FR-OC-8, UX-DR-OC-4)
**And** the search does not query Client or registration tables (FR-OC-8, NFR-OC-2)
**And** Stripe customer id is not searchable in v1

**Given** I select a Tenant result
**When** I activate it
**Then** I navigate to `/platform/tenants/{id}`

**Given** I select an Issue result
**When** I activate it
**Then** I navigate to `/platform/support/{id}`

**Given** no matches
**When** results render
**Then** I see an empty state with guidance to try slug, email, or Issue Number

### Story 28.11: Directory Filters and Support Open-Count Badge

As a **Platform Admin**,
I want directory filters and a Support nav badge,
So that I can hide load-test noise and see how many Issues need attention.

**Acceptance Criteria:**

**Given** I am on `/platform` directory
**When** I apply Status and Billing Status filters
**Then** the tenant list reflects the selected filters (FR-OC-9)
**And** `/platform` remains the default home — no auto-redirect to Support (FR-OC-9)

**Given** the hide Load-test toggle
**When** default page load occurs
**Then** the toggle is **off** (all tenants shown including load-test) (FR-OC-9)
**And** when enabled, tenants with `isDemoOrLoadTest` are hidden from the list

**Given** Issues in Open, InProgress, or WaitingOnOperator status
**When** I view the platform header
**Then** the Support nav shows a badge count equal to that total (FR-OC-9, UX-DR-OC-5)
**And** Resolved/Closed Issues are excluded from the count

### Story 28.12: Create Tenant UI

As a **Platform Admin**,
I want to create a Tenant from the directory UI,
So that I can provision a pilot workspace after Sales asks without SQL.

**Acceptance Criteria:**

**Given** I am on `/platform`
**When** I open Create Tenant and submit slug + name
**Then** the UI calls existing `POST /api/v1/platform/tenants` (FR-OC-10)
**And** success navigates to or highlights the new Tenant (201)
**And** duplicate slug returns 409 with clear error

**Given** create succeeds
**When** the Tenant exists
**Then** no Tenant Admin user or membership is created automatically (FR-OC-10)
**And** complimentary plan remains a separate audited action on Tenant detail (FR-OC-10)

**Given** the create form
**When** I interact with it
**Then** fields have visible labels and accessible validation errors (NFR-OC-6)

### Story 28.13: Actor Email on Audit Rows

As a **Platform Admin**,
I want audit rows to show actor email,
So that Legal can read who performed recovery and reply actions.

**Acceptance Criteria:**

**Given** I perform a Recovery Action (Stories 28.8–28.9) or add a Reply (Story 28.4)
**When** the action completes
**Then** a corresponding audit entry includes actor **email** (FR-OC-11, NFR-OC-3)

**Given** I view recent audits on Tenant detail
**When** audit rows render
**Then** actor email is displayed instead of GUID-only (FR-OC-11)
**And** historical rows without email backfill show "Unknown" or equivalent (FR-OC-11 assumption)

**Given** new platform audit writes
**When** persisted
**Then** actor email is captured from the authenticated Platform Admin profile at action time

---

## Validation Summary (Step 4)

| Check | Result |
| --- | --- |
| FR-OC-1..11 coverage | ✅ All mapped to stories 28.1–28.13 |
| Starter template | ✅ N/A — brownfield extension |
| DB/entity creation JIT | ✅ Replies table/rows in 28.4; snapshot is read-only aggregation |
| Story sizing | ✅ Each story targets one API surface + matching UI where applicable |
| Epic independence | ✅ Single epic; each story builds on prior stories in build order |
| File churn | ✅ Consolidated into Epic 28 — all touch `/platform/*` and platform controllers |
| Forward dependencies | ✅ None — Reply email (28.6) follows Reply API (28.4); UI follows API within each feature |
| UX-DR coverage | ✅ UX-DR16 + UX-DR-OC-1..5 referenced in snapshot, reply, recovery, search, badge stories |
| Deferred | OQ-2 suspend-notify; Filer in-thread comment; audit email backfill |

**Ready for:** `bmad-dev-story` per story file, or `bmad-ux` if Snapshot card needs a ratified mock before 28.2.
