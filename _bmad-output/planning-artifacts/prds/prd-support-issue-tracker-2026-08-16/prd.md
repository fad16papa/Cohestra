---
title: Support Issue Tracker
status: draft
created: 2026-08-16
updated: 2026-08-16
sources:
  - _bmad-output/planning-artifacts/briefs/brief-cohestra-support-tracker-2026-08-16/brief.md
  - _bmad-output/planning-artifacts/prfaqs/prfaq-support-issue-tracker-2026-08-16.md
  - _bmad-output/brainstorming/brainstorm-operator-support-touchpoints-2026-08-16/.memlog.md
---

# PRD: Support Issue Tracker

## 0. Document Purpose

Defines how **signed-in operators** submit support requests from Cohestra, receive a **human-readable issue ID**, trigger **two SendGrid emails** (Creativorare tech inbox + operator confirmation from noreply), and how **platform admins** triage those issues and view a **support volume report**.

Stakes: internal tooling for a live SaaS. Fast-path draft with `[ASSUMPTION]` tags.

## 1. Vision

When an operator is stuck, they should not leave the product to guess an email address. They submit once, get an ID they can quote, and Creativorare works that same ID in the platform console — not in a disconnected mailbox.

## 2. Target User

### 2.1 Jobs To Be Done

- **Operator:** “I need to tell Cohestra what broke, attach a screenshot, and have a number I can follow up with.”
- **Platform admin:** “I need to open the issue that matches the ID in the email, see the tenant, and mark it resolved.”
- **Creativorare ops:** “I need a report of how many issues are still open this week.”

### 2.2 Non-Users (v1)

- Registration guests and tenant public-site visitors.
- Anonymous marketing visitors (no public `/contact` in v1). `[ASSUMPTION]`

### 2.3 Key User Journeys

- **UJ-1. Ana submits a publish failure**
  - **Persona:** Ana, Core operator, cannot publish an activity.
  - **Path:** Settings → Help & support → subject, description, two screenshots → Send.
  - **Climax:** Screen shows `SUP20260816000003`. Email from noreply repeats that ID.
  - **Resolution:** She quotes the ID if she emails again.

- **UJ-2. Platform admin triages the same ID**
  - **Persona:** FA, platform admin.
  - **Path:** Gmail subject `[SUP20260816000003]` → `/platform/support` search → open issue → download screenshots → set In progress → reply by email quoting ID → set Resolved.
  - **Climax:** Tenant slug and operator email are already on the issue. No guessing.

- **UJ-3. Weekly ops glance**
  - **Path:** `/platform/support` report widgets: open count, opened this week, by status.
  - **Resolution:** Know whether support is piling up.

## 3. Glossary

- **Support issue** — Durable record of one operator submission.
- **Issue number** — Globally unique human-readable ID (`SUP` + UTC date + 6-digit sequence), shown to operators and used in email subjects.
- **Tech email** — Message to `techsolutions@creativorare.com`.
- **Confirmation email** — Message to the operator from `noreply@creativorare.com`.
- **Platform support report** — Cross-tenant aggregates for platform admins only.

## 4. Features

### 4.1 Operator intake

**Description:** All tenant operators (Admin and Member) can submit a support issue from Settings. Realizes UJ-1.

**Functional Requirements:**

#### FR-1: Help & support in Settings

Settings shows a **Help & support** card for every signed-in tenant operator (not admin-only). Fields: subject, description, optional screenshots (max 3, PNG/JPEG/WEBP, 2 MB each). Submit disabled while sending. Success shows the issue number prominently.

#### FR-2: Authenticated submit API

`POST /api/v1/admin/support-issues` (`TenantOperator`) accepts multipart subject, body, files. Server stamps tenant id, tenant slug, tenant name, plan, operator user id, operator email, user agent. Rejects anonymous and platform-admin tokens.

#### FR-3: Rate limit

Per operator identity (and IP) rate limit on submit. `[ASSUMPTION]` 5 submissions per rolling hour. Excess returns 429 with a clear message.

#### FR-4: Recent requests `[ASSUMPTION]`

The same Settings card lists the operator’s last 10 issues (number, subject, status, created). Read-only. No in-app reply.

### 4.2 Issue identity and persistence

#### FR-5: Global issue number

Each issue gets a **globally unique** `IssueNumber` formatted `SUP{yyyyMMdd}{6-digit}` (UTC), same generator style as registration numbers but **not** scoped per tenant. Platform search by number must hit exactly one row.

#### FR-6: Status model

Statuses: `Open` (default), `InProgress`, `WaitingOnOperator`, `Resolved`, `Closed`. Only platform admins change status in v1.

#### FR-7: Private attachments

Screenshots stored privately (not campaign-asset public URLs). Platform admins download via authenticated endpoint. Operators cannot fetch other tenants’ files.

### 4.3 Dual SendGrid notification

#### FR-8: Tech inbox email

On create, enqueue outbox mail **To:** `techsolutions@creativorare.com` (config `Support:RecipientEmail`). **From:** verified sender (`noreply@creativorare.com`). **Reply-To:** operator email. **Subject:** `[IssueNumber] {operator subject}`. Body includes tenant slug, tenant name, plan, operator email, description. Screenshots as **file attachments** (not public links).

#### FR-9: Operator confirmation email

On create, enqueue a second outbox mail **To:** operator email. **From:** `noreply@creativorare.com`. **Subject:** includes IssueNumber. Body: we received your request, quote this ID, we will reply by email. No internal notes. No other operators on the tenant are copied. `[ASSUMPTION]`

#### FR-10: On-screen ID even if email lags

Create transaction commits the issue before or with outbox enqueue. UI shows IssueNumber from the API response even if SendGrid is down. Outbox retries both emails independently.

### 4.4 Platform admin tracker

#### FR-11: Support nav and list

Platform header includes **Support**. `/platform/support` lists issues newest-first with number, tenant slug, operator email, subject, status, created. Search by issue number, tenant slug, operator email. Filter by status.

#### FR-12: Issue detail

`/platform/support/{id}` shows all stamped context, description, attachments (download), status control, `[ASSUMPTION]` optional internal note (platform-only, never emailed automatically). Link to tenant detail.

#### FR-13: Platform APIs

`GET/PATCH /api/v1/platform/support-issues` (`PlatformAdminOnly`). List is cross-tenant (`IgnoreTenantFilters`). PATCH status (and internal note). Attachment GET is PlatformAdminOnly.

### 4.5 Platform support report

#### FR-14: Volume report

Platform support report (on the Support page or `/platform/support/report`) for a period (`weekly` | `monthly` | `custom` matching tenant reports): issues opened, resolved/closed, still open, counts by status, top tenants by volume, daily opened trend. CSV export of issue rows **without** screenshot bytes. `[ASSUMPTION]` PII: operator email included for ops; no guest registrant PII.

Tenant `ReportsController` is **not** extended.

### 4.6 Docs and freeze copy

#### FR-15: Operator docs

`/docs` “If something goes wrong” includes a final row: still stuck → Settings → Help & support. Maintenance freeze page names Settings (when signed in) rather than a bare “contact support”.

## 5. Non-Functional Requirements

- **NFR-1 Security:** Operator JWT cannot list other tenants’ issues. Attachment URLs are not guessable public paths.
- **NFR-2 Reliability:** Dual emails via existing outbox; issue row is source of truth.
- **NFR-3 Privacy:** PII warning on the form; attachments retained `[ASSUMPTION]` 90 days then eligible for purge (can be “keep forever” until ops asks).
- **NFR-4 Observability:** Log issue number on create and on email send success/failure.

## 6. Success Metrics

- % of operator submissions that produce a confirmation email within 5 minutes (outbox drained).
- Platform admin time-to-first-status-change (qualitative until we log it).
- Counter-metric: support submissions per operator per week (watch for spam / 429s).

## 7. Out of Scope (v1)

- In-app message thread / operator replies in product.
- SLA clocks and plan-based priority queues.
- Public marketing contact form.
- Intercom, Zendesk, or forwarding into a third-party ticket ID.
- SMS / WhatsApp to operators from Cohestra support.

## 8. Open Questions

1. Confirm 5/hour rate limit and 3×2 MB screenshot caps.
2. Confirm recent-requests list in Settings (FR-4) vs email-only ID lookup.
3. Attachment retention (90 days vs indefinite).
4. Internal notes on platform detail (yes/no).
5. Exact confirmation email copy and whether to mention 1–2 business days.
