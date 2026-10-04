---
title: Platform ops console v2
status: final
created: 2026-08-18
updated: 2026-08-18
parent: prd-cohestra-enterprise-2026-07-15
sources:
  - _bmad-output/forge/platform-ops-support-console/forged-idea.md
  - _bmad-output/brainstorming/brainstorm-platform-ops-support-2026-08-18/brainstorm-intent.md
---

# PRD: Platform ops console v2

## 0. Document Purpose

For Cohestra product, ops (Francis), and downstream epic/story authors. This PRD extends the enterprise PRD’s Platform Admin slice (FR-2 lifecycle, FR-7 role, FR-18 audit, UX-DR16 sparse console, A-5 no impersonation). It does not replace that PRD. Vocabulary is Glossary-locked. `[ASSUMPTION]` tags mark Fast-path inferences from the 2026-08-18 forge; confirm before stories freeze.

Shipped baseline: tenant directory + suspend/reactivate/archive + complimentary; support inbox (status, Internal Note, attachments, volume CSV); operator Settings Help intake; `/platform/login` vs `/login`. Create-tenant API exists without UI. `[ASSUMPTION: Fast path — forge + brainstorm intent are the brief.]`

## 1. Vision

Platform Admin supports a club **without becoming the club**. Today Francis must either guess from a ticket subject or sign into `{slug}/dashboard` — which overwrites the apex `auth_session` and still is not impersonation-safe. The product is a **Tenant Snapshot** beside the ticket, a **Reply** the Filer can read, and **Recovery Actions** that send the same emails self-serve already sends. Gmail stays a matching layer (Issue Number). The console does not become Intercom, a second app, or login-as.

This matters because every “just open their workspace” habit fights tenant isolation and the two-door login model we just locked.

## 2. Target User

### 2.1 Jobs To Be Done

- **Functional:** Match a Gmail `SUP…` subject to the right Tenant; see plan caps and billing dials without a tenant JWT; get a locked-out Operator back in; provision a pilot Tenant without SQL.
- **Emotional:** Stop feeling like the only way to help is to *be* them.
- **Social:** Leave an audit trail Legal can read (actor email, reason, action) when a workspace is frozen or a reset is sent.
- **Contextual:** One human Platform Admin, weekday Gmail + `/platform`, not a ten-person support org.

### 2.2 Non-Users (v1)

- Tenant clients (leads/registrants) — never a Platform Admin audience.
- Tenant Admins as authors of this console — they stay in Settings Help.
- A future team of many Platform Admins (no assignment/SLA).
- Sales using the console as a CRM.

### 2.3 Key User Journeys

- **UJ-1. Francis triages a ticket with a Tenant Snapshot.**
  - **Persona + context:** Francis, sole Cohestra ops, Gmail subject `SUP20260817000001`.
  - **Entry state:** Authenticated Platform Admin at `/platform/support` on marketing apex.
  - **Path:** Opens the Issue → Snapshot shows plan meters (e.g. communities 10/10), Billing Status, last activity, Operator emails → does **not** open `{slug}/dashboard`.
  - **Climax:** He knows the “plan limit” screenshot matches the Tenant without a second login.
  - **Resolution:** Status stays Open or moves In Progress; Internal Note optional.
  - **Edge case:** Load-test Tenant — Snapshot flags `isDemoOrLoadTest`; he filters those out next time.

- **UJ-2. Francis sends a Reply; the Filer reads it in Settings.**
  - **Persona + context:** Francis (ops) writing to the Filer who submitted Help.
  - **Entry state:** Issue Open; Internal Notes exist that the Filer must not see.
  - **Path:** Francis writes a Reply → status WaitingOnOperator → Filer gets email + sees the thread in Settings Help (not the Internal Note).
  - **Climax:** Filer can act on the question from Settings without a second login to `/platform`.
  - **Resolution:** Francis sets Resolved/Closed; Filer is emailed. Filer responds via email or a new Issue (no in-thread Filer comment in MVP).

- **UJ-3. Locked-out Operator cannot file a ticket; Francis recovers them.**
  - **Persona + context:** Tenant Admin who never receives OTP / forgot password.
  - **Entry state:** They cannot reach Settings Help (login required). They email or WhatsApp Francis.
  - **Path:** Francis Omni-search by email → Tenant members list → SendPasswordResetEmail (or ResendEmailVerification) → audit row with actor email.
  - **Climax:** Same reset/verify email as self-serve arrives; ops never types a password.
  - **Resolution:** Operator signs in on `{slug}/login`. No public cannot-sign-in form in v1.

- **UJ-4. Francis provisions a pilot Tenant after Sales asks.**
  - **Persona + context:** Francis (ops) on request from Sales; not Sales in the console.
  - **Entry state:** Authenticated at `/platform` directory.
  - **Path:** Create Tenant (slug, name) wrapping existing POST → optional separate complimentary action if Sponsored.
  - **Climax:** Workspace exists; no silent Tenant Admin user.
  - **Resolution:** Invite or complimentary remains a distinct audited step.

- **UJ-5. Francis finds by email or Issue Number.**
  - **Persona + context:** Francis matching a Gmail or verbal email to a Tenant.
  - **Entry state:** Directory or inbox on apex.
  - **Path:** One Omni-search box (slug, Operator email, Issue Number).
  - **Climax:** Lands on Tenant or Issue without guessing.

## 3. Glossary

- **Platform Admin** — Cohestra ops identity (`PlatformAdmin` role). JWT has no `tenant_id`. Mutually exclusive with Tenant Admin.
- **Operator** — Tenant Admin or Tenant Member of a workspace. Not Platform Admin.
- **Filer** — The Operator email on the Issue (who submitted Help).
- **Tenant** — A workspace row (slug, plan, Status, Billing Status).
- **Issue** — A support ticket with an **Issue Number** (`SUP…`) used to match Gmail.
- **Tenant Snapshot** — Read-only ops view of one Tenant: plan, Billing Status, complimentary, limit meters, last activity timestamps, open Issue count, demo/load-test flag, Operator/member emails and roles. No Client records, phones, or registration answers.
- **Reply** — Operator-visible message on an Issue. Distinct from **Internal Note**.
- **Internal Note** — Ops-only annotation on an Issue. Already shipped. Filer never sees it.
- **Recovery Action** — Audited Platform Admin trigger of an existing auth email (password reset or email verification resend) for a known Tenant member. Does not set a password. Is not impersonation.
- **Omni-search** — Single query that returns Tenant and Issue identifiers (slug, Issue Number, Operator/member email). No Client table scan.
- **Limit meter** — Used vs plan max for seats, communities, published activities, registrations-this-month (`TenantPlanLimits` / existing usage snapshot).
- **Load-test Tenant** — `isDemoOrLoadTest` is true when slug starts with `load-` **or** the Tenant is a known demo/seed workspace (`default` seed slug **or** `DemoDataSeed` / `LoadTest` provenance flag if present). Filterable; not hidden without a toggle.

## 4. Features

### 4.1 Tenant Snapshot

**Description:** One Tenant Snapshot card, same DTO, on Issue detail and Tenant detail. Realizes UJ-1. Reuses existing usage counts (`GetUsageAsync`) and billing dials already on the Tenant row. Sparse: one card, not a chart wall (UX-DR16).

**Functional Requirements:**

#### FR-OC-1: Show Tenant Snapshot on Issue and Tenant detail

Platform Admin can view a Tenant Snapshot for the Issue’s Tenant and on `/platform/tenants/{id}`. Realizes UJ-1.

**Consequences (testable):**
- Snapshot includes: plan, Status, Billing Status, isComplimentary, Limit meters (used/max for seats, communities, published activities, registrations this month), LastActivityAt as last-touch (login or public registration — OQ-4 closed), open Issue count, isDemoOrLoadTest, member emails + roles (Tenant Admin / Member).
- Snapshot omits: Client names, phones, emails, registration answers, activity content, JWTs.
- Platform Admin JWT still cannot call `/api/v1/admin/*` (403). Snapshot is served only from `/api/v1/platform/*` with `PlatformAdminOnly`.

**Out of Scope:**
- Live tail of operator UI / screen share.
- Stripe customer portal or invoice PDF fetch.

#### FR-OC-2: Deep links Issue ↔ Tenant

Platform Admin can open the Tenant from an Issue and the Tenant’s open Issues from Tenant detail. Realizes UJ-1, UJ-5.

**Consequences (testable):**
- Issue detail links to `/platform/tenants/{tenantId}`.
- Tenant detail lists open Issues with Issue Number links.
- `mailto:` for `adminContactEmail` when present.

### 4.2 Operator-visible Reply

**Description:** Filer can read Replies in Settings Help. Internal Note stays hidden. Email the Filer on Reply and on status WaitingOnOperator, Resolved, Closed. Append-only timeline. Realizes UJ-2. Gmail remains match-by-Issue-Number; we do not store Gmail credentials.

**Functional Requirements:**

#### FR-OC-3: Reply thread on an Issue

Platform Admin can add a Reply to an Issue. Realizes UJ-2.

**Consequences (testable):**
- Filer’s Settings Help shows Replies in chronological order with Issue Number, status, and timestamps.
- Filer’s Settings Help does **not** show Internal Note.
- Timeline is append-only (no edit/delete of a published Reply in v1).
- Empty/whitespace Reply is rejected (400).

#### FR-OC-4: Email the Filer on Reply and selected status changes

System emails the Filer when a Reply is added and when status becomes WaitingOnOperator, Resolved, or Closed. Realizes UJ-2.

**Consequences (testable):**
- Email goes to the Issue’s Operator email only (not every member).
- Email includes Issue Number and does not include Internal Note.
- InProgress / Open status-only changes do not email `[ASSUMPTION: avoid noise; Platform Admin can still Reply to notify]`.
- Suspend of a Tenant is **not** this FR (no new suspend-notify in v1 unless already implied by lifecycle — OQ-2).

### 4.3 Recovery Actions

**Description:** Known-member recovery without login-as. Same pipelines as forgot-password / verify resend. Realizes UJ-3. Extends enterprise FR-7 (still no impersonation).

**Functional Requirements:**

#### FR-OC-5: List Tenant members for ops

Platform Admin can list members of a Tenant (email, role, email-verified flag). Realizes UJ-3.

**Consequences (testable):**
- List is PlatformAdminOnly; no Client rows.
- Empty membership is a valid Tenant (provisioned husk).

#### FR-OC-6: Send password reset email

Platform Admin can trigger SendPasswordResetEmail for a member of that Tenant. Realizes UJ-3.

**Consequences (testable):**
- Uses the existing Operator reset-email pipeline (OTP or link — whichever production already sends).
- Platform Admin cannot set or view the new password.
- Action writes `platform_audit_logs` with actor email, Tenant id, member email, action name.
- Member not on that Tenant → 404/409, no email.

#### FR-OC-7: Resend email verification

Platform Admin can trigger ResendEmailVerification for an unverified member of that Tenant. Realizes UJ-3.

**Consequences (testable):**
- Same send caps / rate limits as self-serve resend (not a looser ops bypass).
- Already-verified member → 409 with a clear detail, no extra send.
- Audited as FR-OC-6.

### 4.4 Findability

**Description:** Omni-search and filters so Francis does not guess slugs. Directory remains `/platform` home. Support nav shows open Issue count. Realizes UJ-5.

**Functional Requirements:**

#### FR-OC-8: Omni-search

Platform Admin can search from directory and inbox with one query string matching Tenant slug, Tenant name, member/Operator email, or Issue Number. Realizes UJ-5.

**Consequences (testable):**
- Results are Tenants and Issues only (identifiers + snapshot-safe fields).
- Query does not search Client or registration tables.
- `[ASSUMPTION: Stripe customer id is not in v1 Omni-search — forge locked slug/email/SUP only.]`

#### FR-OC-9: Directory filters and Support badge

Platform Admin can filter the directory by Status and Billing Status, and optionally hide Load-test Tenants. Support nav shows a count of open Issues. Realizes UJ-1, UJ-5.

**Consequences (testable):**
- Hide Load-test defaults **off** (show all) with an explicit toggle.
- `/platform` remains the Tenant directory (not auto-redirect to Support).
- Badge count is Issues in Open + InProgress + WaitingOnOperator `[ASSUMPTION: “open” = not Resolved/Closed]`.

### 4.5 Create Tenant UI

**Description:** Form wraps existing `POST /api/v1/platform/tenants`. Realizes UJ-4.

**Functional Requirements:**

#### FR-OC-10: Create Tenant from directory

Platform Admin can create a Tenant (slug, name) from the directory UI. Realizes UJ-4.

**Consequences (testable):**
- Success uses the existing create API (201, uniqueness 409).
- Does not create a Tenant Admin user or membership.
- Complimentary remains the existing separate audited action (not part of the create form).

### 4.6 Audit readability

#### FR-OC-11: Actor email on audit rows

Platform Admin can read recent Tenant audits with actor **email** (not GUID-only). Realizes UJ-3 social/legal job.

**Consequences (testable):**
- New Recovery Actions and Replies appear in `platform_audit_logs` (or Issue timeline) with actor email.
- Existing GUID-only historical rows may show email as unknown if not backfilled `[ASSUMPTION: no backfill required for v1]`.

## 5. Non-Goals (Explicit)

- Impersonation / login-as-Operator (enterprise A-5 / FR-7).
- Client PII export, registration payload inspector, editing activities from Platform Admin.
- Stripe writes, Customer Portal as ops, invoice mutation.
- Second Next app / `platform.{apex}` origin / Intercom / bidirectional Gmail API.
- Public cannot-sign-in intake (abuse hose; deferred until Recovery Actions are proven).
- Changing default `/platform` home to the inbox.
- Ticket assignment, SLA clocks, sponsored-plan expiry, global audit search UI, ops health strip (outbox/Stripe lag).
- Tenant switcher inside the operator app.

## 6. MVP Scope

### 6.1 In Scope

FR-OC-1 through FR-OC-11, in forge build order: Snapshot → Reply+email → members+Recovery Actions → Omni-search/filters/badge → Create Tenant form → actor email on audits.

### 6.2 Out of Scope for MVP

- Public cannot-sign-in form — deferred; Recovery Actions first.
- Filer in-thread comment — **out of MVP** (email or a new Issue). `[NOTE FOR PM: reopen only if duplicate Issues stay high after FR-OC-4.]`
- Complimentary end-date, FR-25 dormancy days-idle list, archive-restore emphasis.
- Hide Load-test as default-on.

## 7. Success Metrics

**Primary**
- **SM-1:** Share of Issues moved to Resolved/Closed in a week where Platform Admin did **not** authenticate on a Tenant host in the same browser profile `[ASSUMPTION: measured by ops diary in v1, not analytics]`. Validates FR-OC-1. Target: Francis can describe the club from Snapshot for plan-limit / billing-dial tickets.
- **SM-2:** Filer receives a Reply or WaitingOnOperator email before a duplicate Issue is filed on the same Tenant+subject. Validates FR-OC-3, FR-OC-4. Target: duplicate-ticket rate down vs Epic 27 baseline (qualitative OK).

**Secondary**
- **SM-3:** Recovery Action used at least once in UAT without a password being set by ops. Validates FR-OC-6, FR-OC-7.
- **SM-4:** Pilot Tenant created from UI (no SQL) in UAT. Validates FR-OC-10.

**Counter-metrics (do not optimize)**
- **SM-C1:** Ticket volume — do not spam Filer email (hence FR-OC-4 limits).
- **SM-C2:** Snapshot field count — do not grow into a Client CRM.
- **SM-C3:** Platform Admin sessions on `{slug}` hosts — should stay rare, not “zero forever” (handoff testing still exists).

## 8. Open Questions

1. **OQ-1 (closed for MVP):** Filer in-thread comment is out. Email or a new Issue. Revisit if duplicate Issues stay high after FR-OC-4.
2. **OQ-2:** Should Suspend email `adminContactEmail`? Legal notice vs surprise 403. `[NOTE FOR PM: decide before any suspend-notify story; not in FR-OC-4.]`
3. **OQ-3 (closed):** `isDemoOrLoadTest` = slug prefix `load-` OR demo/seed provenance (`default` seed slug or Demo/LoadTest seed flag). See Glossary.
4. **OQ-4 (closed):** Snapshot last-touch is `LastActivityAt` only in v1 (already updated on login and public registration). No separate last-registration column.

## 9. Assumptions Index

- `[ASSUMPTION: Fast path — forge + brainstorm intent are the brief.]` — §0
- InProgress/Open status-only changes do not email (FR-OC-4).
- Omni-search excludes Stripe ids in v1.
- Badge “open” = not Resolved/Closed.
- No audit email backfill.
- SM-1 is diary-measured in v1.
- Last-touch is `LastActivityAt` (OQ-4 closed).

## 10. Source Trace

| Input | Where it landed |
|-------|-----------------|
| Forge locks (snapshot, reply, recovery, create UI, omni-search, badge, no home change) | §4, §6 |
| Forge kills (impersonation, PII export, Stripe writes, public form, second app) | §5 |
| Enterprise FR-7 / A-5 / UX-DR16 | §0, §4.1, §4.3, §5 |
| Research (Stripe/Vercel snapshot+thread+audited reset; Clerk impersonation as anti-pattern) | addendum |

## 11. Next

Epics and stories: `_bmad-output/planning-artifacts/epics-platform-ops-console-2026-08-18.md` (Epic 28, stories 28.1–28.13). Optional: `bmad-ux` if Snapshot card needs a ratified mock before 28.2. Architecture is an approved `PlatformAdminOnly` bypass of EF filters — not a new app.
