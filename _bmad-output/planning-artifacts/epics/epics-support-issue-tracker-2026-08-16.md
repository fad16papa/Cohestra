---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-support-issue-tracker-2026-08-16/prd.md
  - _bmad-output/planning-artifacts/prds/prd-support-issue-tracker-2026-08-16/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-support-issue-tracker-2026-08-16/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/briefs/brief-cohestra-support-tracker-2026-08-16/brief.md
  - _bmad-output/planning-artifacts/prfaqs/prfaq-support-issue-tracker-2026-08-16.md
---

# cohestra - Epic Breakdown: Support Issue Tracker

## Overview

Epics **26–27** decompose the Support Issue Tracker PRD into implementable stories. Operators submit from Settings with screenshots, receive a **SUP** issue ID and **noreply@creativorare.com** confirmation; Creativorare receives **techsolutions@creativorare.com** mail with Reply-To set to the operator. Platform admins triage in `/platform/support` with a volume report.

**PRD:** `_bmad-output/planning-artifacts/prds/prd-support-issue-tracker-2026-08-16/prd.md`  
**Architecture:** `_bmad-output/planning-artifacts/architecture/architecture-support-issue-tracker-2026-08-16/ARCHITECTURE-SPINE.md`

## Requirements Inventory

### Functional Requirements

FR-1: Settings shows **Help & support** for every signed-in tenant operator (Admin and Member). Fields: subject, description, optional screenshots (max 3, PNG/JPEG/WEBP, 2 MB each). Success shows issue number prominently.

FR-2: `POST /api/v1/admin/support-issues` (`TenantOperator`) accepts multipart subject, body, files. Server stamps tenant id, slug, name, plan, operator user id, operator email, user agent.

FR-3: Rate limit on submit — 5 submissions per rolling hour per operator (+ IP). Returns 429 when exceeded.

FR-4: Settings card lists operator's last 10 issues (number, subject, status, created). Read-only.

FR-5: Globally unique `IssueNumber` formatted `SUP{yyyyMMdd}{6-digit}` (UTC). Platform search by number returns exactly one row.

FR-6: Statuses: Open (default), InProgress, WaitingOnOperator, Resolved, Closed. Platform admins change status in v1.

FR-7: Screenshots stored privately — not public campaign URLs. Platform admins download via authenticated endpoint.

FR-8: On create, outbox email To `techsolutions@creativorare.com` (config `Support:RecipientEmail`), From verified sender, Reply-To operator, subject `[IssueNumber] {subject}`, body includes tenant context, screenshots as file attachments.

FR-9: On create, outbox confirmation To operator, From `noreply@creativorare.com`, subject includes IssueNumber, body quotes ID and sets reply-by-email expectation.

FR-10: Issue row commits with outbox enqueue; API returns IssueNumber even if SendGrid is down; outbox retries emails independently.

FR-11: Platform header **Support** link; `/platform/support` lists issues with search/filter.

FR-12: `/platform/support/{id}` shows context, attachments, status control, optional internal note, link to tenant.

FR-13: `GET/PATCH /api/v1/platform/support-issues` (`PlatformAdminOnly`), cross-tenant list, attachment download PlatformAdminOnly.

FR-14: Platform support report: opened, resolved/closed, open by status, top tenants, daily trend, CSV export (no screenshot bytes).

FR-15: `/docs` ch.18 adds still-stuck → Settings → Help & support; maintenance page points signed-in operators to Settings.

### NonFunctional Requirements

NFR-1: Operator JWT cannot list other tenants' issues or download others' attachments. No guessable public attachment URLs.

NFR-2: Dual emails via outbox; issue row is source of truth.

NFR-3: PII warning on form; attachment retention deferred (keep until ops defines purge).

NFR-4: Log IssueNumber on create and email send success/failure.

### Additional Requirements (Architecture)

- AD-1: One `SupportIssue` aggregate; create + outbox in same transaction.
- AD-2: Global unique index on `IssueNumber` (not per-tenant).
- AD-3: Outbox types `support.issue.tech` and `support.issue.confirmation` with separate dedupe keys.
- AD-4: Extend `EmailMessage` with `FileAttachments` and `ReplyToEmail`; private disk under `data/support-attachments/`.
- AD-5: Confirmation From noreply; tech To config default techsolutions@creativorare.com.
- AD-6: New platform report service — do not extend tenant `ReportService`.
- AD-7: Operator API create + list-own only; PATCH status platform-only.
- Config: `Support:RecipientEmail`, `Support:AttachmentStoragePath`, `Support:MaxFiles`, `Support:MaxFileBytes`.
- Follow `RegistrationNumberGenerator` pattern for SUP numbers (global scan).
- Register outbox handlers in `DependencyInjection.cs`; add controller policy tests.

### UX Design Requirements

UX-DR1: Reuse existing Settings section card pattern (`SettingsSectionCard`, `change-password-section` form UX).

UX-DR2: Reuse platform console patterns (`PlatformDataTable`, `PlatformCard`, tenant detail layout).

UX-DR3: Reuse tenant report period presets and chart primitives for platform support report where practical.

UX-DR4: Success state must show IssueNumber in large, copy-friendly type — operator's primary receipt if email lags.

UX-DR5: Form includes brief PII warning for screenshots.

### FR Coverage Map

| FR | Epic | Story |
| --- | --- | --- |
| FR-1 | 26 | 26.5 |
| FR-2 | 26 | 26.4 |
| FR-3 | 26 | 26.4 |
| FR-4 | 26 | 26.5 |
| FR-5 | 26 | 26.1 |
| FR-6 | 26 | 26.1 |
| FR-7 | 26 | 26.3, 26.4 |
| FR-8 | 26 | 26.2, 26.4 |
| FR-9 | 26 | 26.2, 26.4 |
| FR-10 | 26 | 26.4 |
| FR-11 | 27 | 27.1 |
| FR-12 | 27 | 27.1 |
| FR-13 | 27 | 27.1 |
| FR-14 | 27 | 27.2 |
| FR-15 | 27 | 27.3 |
| NFR-1 | 26–27 | 26.3, 26.4, 27.1 |
| NFR-2 | 26 | 26.2, 26.4 |
| NFR-3 | 26 | 26.5 |
| NFR-4 | 26 | 26.4 |

## Epic List

### Epic 26: Operator Support Intake
Signed-in operators submit support requests from Settings with screenshots, receive a global **SUP** issue ID on screen, and trigger dual SendGrid notifications (tech inbox + noreply confirmation).
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, FR-10

### Epic 27: Platform Support Operations
Platform admins triage support issues cross-tenant, update status, download attachments, and view a support volume report with CSV export. Docs and maintenance copy point operators to Settings.
**FRs covered:** FR-11, FR-12, FR-13, FR-14, FR-15

---

## Epic 26: Operator Support Intake

Signed-in operators submit support requests from Settings with screenshots, receive a global **SUP** issue ID on screen, and trigger dual SendGrid notifications (tech inbox + noreply confirmation).

**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, FR-10  
**Architecture:** AD-1, AD-2, AD-4 (storage), AD-5, AD-7 (operator plane)

### Story 26.1: Support issue domain and global SUP numbers

As a **platform engineer**,
I want **SupportIssue and SupportIssueAttachment entities with global SUP issue numbers**,
So that **every submission has a durable, unique ID Creativorare and operators can quote**.

**Acceptance Criteria:**

**Given** the Domain layer  
**When** `SupportIssue` is introduced  
**Then** it includes `Id` (Guid v7), `IssueNumber` (string, globally unique), `TenantId`, `SubmittedByUserId`, `Subject`, `Description`, `Status` (Open default), `OperatorEmail`, `OperatorDisplayName`, `TenantSlug`, `TenantName`, `Plan`, `UserAgent`, `CreatedAt`, `UpdatedAt`, and optional `InternalNote` (platform-only, nullable)  
**And** `SupportIssueAttachment` includes FK to issue, `FileName`, `ContentType`, `SizeBytes`, `RelativePath`

**Given** `SupportIssueNumberGenerator`  
**When** generating the next number for UTC date  
**Then** format is `SUP{yyyyMMdd}{6-digit}` incrementing globally for that date prefix  
**And** unique index on `IssueNumber` (not composite with TenantId)

**Given** EF migration  
**When** applied  
**Then** `SupportIssues` and `SupportIssueAttachments` tables exist with tenant FK and indexes  
**And** unit tests cover generator sequencing and uniqueness

**Given** status enum  
**Then** values are Open, InProgress, WaitingOnOperator, Resolved, Closed (FR-6)

### Story 26.2: Email file attachments and support outbox types

As a **platform engineer**,
I want **SendGrid to send file attachments and Reply-To on support emails**,
So that **techsolutions receives downloadable screenshots and can reply directly to the operator**.

**Acceptance Criteria:**

**Given** `EmailMessage`  
**When** extended for support  
**Then** it supports optional `ReplyToEmail` and `FileAttachments` (filename, content type, bytes) with SendGrid `Disposition=attachment`

**Given** `OutboxMessageTypes`  
**Then** includes `support.issue.tech` and `support.issue.confirmation`  
**And** handlers are registered in DI

**Given** `SupportSettings` configuration  
**Then** `RecipientEmail` defaults to `techsolutions@creativorare.com`  
**And** options bind from `Support` section in appsettings / env

**Given** `SupportIssueTechEmailBuilder` and `SupportIssueConfirmationEmailBuilder`  
**When** building messages  
**Then** tech email subject is `[{IssueNumber}] {Subject}`, body includes tenant slug, name, plan, operator email, description  
**And** confirmation From uses `noreply@creativorare.com` (SendGrid FromEmail), subject includes IssueNumber, body tells operator to quote the ID (FR-8, FR-9, AD-5)

**Given** handler unit tests with stub `IEmailSender`  
**When** handlers run  
**Then** tech message uses Reply-To operator email and includes file attachments from payload

### Story 26.3: Private support attachment storage

As a **platform engineer**,
I want **screenshots stored on private disk, not public campaign assets**,
So that **support images are not anonymously downloadable** (NFR-1, FR-7).

**Acceptance Criteria:**

**Given** `SupportAttachmentService`  
**When** saving files for an issue  
**Then** bytes are written under configurable path (default `data/support-attachments/{issueId}/`)  
**And** only PNG, JPEG, WEBP accepted; max 2 MB per file; max 3 files per issue

**Given** a saved attachment  
**Then** no public URL is registered on `PublicCampaignAssetsController`  
**And** metadata row links to `SupportIssueAttachment`

**Given** invalid file type or oversize upload  
**Then** API returns 400 ProblemDetails with clear message

### Story 26.4: Create support issue API, rate limit, and dual outbox enqueue

As a **Tenant Admin or Member**,
I want **to submit a support issue via API with attachments**,
So that **Creativorare receives a tracked request and I get an issue ID immediately** (FR-2, FR-3, FR-8–FR-10).

**Acceptance Criteria:**

**Given** authenticated `TenantOperator` on tenant host  
**When** `POST /api/v1/admin/support-issues` with multipart subject, description, files  
**Then** issue is created with stamped tenant/operator context and global IssueNumber  
**And** attachments are stored via Story 26.3  
**And** two outbox messages enqueue in the same transaction with dedupe keys `support:{issueId}:tech` and `support:{issueId}:confirmation`  
**And** response 201 includes `issueNumber`, `id`, `status`, `createdAt`

**Given** `GET /api/v1/admin/support-issues`  
**Then** returns only the current operator's issues for the current tenant (last 10 default, FR-4 backend)  
**And** another operator on the same tenant cannot see a colleague's submissions unless they submitted it

**Given** 6 submissions within one hour from same operator  
**Then** the 6th returns 429 with clear rate-limit message (FR-3)

**Given** platform-admin JWT or anonymous caller  
**When** calling admin support endpoints  
**Then** request is rejected (403/401)

**Given** SendGrid disabled in test env  
**When** create succeeds  
**Then** IssueNumber is still returned (FR-10)  
**And** outbox rows remain Pending for retry

**Given** integration test  
**When** outbox is drained  
**Then** tech email targets configured RecipientEmail and confirmation targets operator email  
**And** logs include IssueNumber (NFR-4)

**Given** `TenantAuthControllerPolicyTests`  
**Then** `SupportIssuesController` uses `TenantOperator` policy

### Story 26.5: Settings Help & support UI

As a **Tenant Admin or Member**,
I want **Help & support in Settings with subject, description, screenshots, and my recent requests**,
So that **I can reach Creativorare without leaving the app** (FR-1, FR-4, UX-DR1, UX-DR4, UX-DR5).

**Acceptance Criteria:**

**Given** I open `/settings` as any tenant operator  
**Then** I see a **Help & support** section (not admin-only)  
**And** fields: subject (required), description (required), file input (optional, max 3)  
**And** PII warning: avoid guest phone numbers in screenshots unless needed (NFR-3)

**Given** I submit valid data  
**When** the API succeeds  
**Then** submit button shows loading state during request  
**And** success UI prominently displays the IssueNumber with copy-friendly styling (UX-DR4)  
**And** toast confirms email confirmation was sent to my operator address

**Given** validation or rate-limit errors  
**Then** inline or toast error explains the problem (429, file too large, wrong type)

**Given** the same section  
**Then** **Recent requests** lists my last 10 issues with number, subject, status badge, created date (FR-4)  
**And** list is read-only (no in-app reply)

**Given** API failure after partial upload  
**Then** form remains editable and does not falsely show success

---

## Epic 27: Platform Support Operations

Platform admins triage support issues cross-tenant, update status, download attachments, and view a support volume report. Docs point operators to Settings.

**FRs covered:** FR-11, FR-12, FR-13, FR-14, FR-15  
**Architecture:** AD-6, AD-7 (platform plane)

### Story 27.1: Platform support inbox and issue detail

As a **Platform Admin**,
I want **a Support section in the platform console to list, search, and update issues**,
So that **I can match Gmail `[SUP…]` subjects to the correct tenant and operator** (FR-11–FR-13).

**Acceptance Criteria:**

**Given** platform admin authenticated at `/platform`  
**Then** header nav includes **Support** alongside Tenants (FR-11)

**Given** `/platform/support`  
**Then** table shows IssueNumber, tenant slug, operator email, subject, status, created (newest first)  
**And** search by issue number, tenant slug, or operator email  
**And** filter by status

**Given** `/platform/support/{id}`  
**Then** I see full stamped context, description, status dropdown, optional internal note field (platform-only, not emailed)  
**And** attachment list with download buttons  
**And** link to `/platform/tenants/{tenantId}` (FR-12)

**Given** `GET /api/v1/platform/support-issues`  
**Then** returns cross-tenant results using ignore-tenant-filter queries (`PlatformAdminOnly`)  
**And** non–platform-admin receives 403

**Given** `PATCH /api/v1/platform/support-issues/{id}`  
**When** I change status or internal note  
**Then** changes persist and appear on refresh  
**And** operators cannot call this endpoint (FR-6, AD-7)

**Given** `GET .../attachments/{attachmentId}`  
**Then** platform admin receives file bytes with correct content-type  
**And** tenant operator cannot download attachments via guessable public URL (NFR-1)

**Given** UI implementation  
**Then** reuses `PlatformDataTable` / `PlatformCard` patterns (UX-DR2)

### Story 27.2: Platform support volume report and CSV export

As a **Platform Admin**,
I want **a support volume report with trends and export**,
So that **I can see whether issues are piling up** (FR-14, AD-6).

**Acceptance Criteria:**

**Given** `/platform/support` or `/platform/support/report`  
**When** I select weekly, monthly, or custom period (same preset pattern as tenant reports)  
**Then** I see: issues opened in period, resolved/closed in period, still open, counts by status, top tenants by volume, daily opened trend (UX-DR3)

**Given** `GET /api/v1/platform/reports/support`  
**Then** aggregates ignore tenant filter and require `PlatformAdminOnly`  
**And** tenant `ReportsController` is unchanged

**Given** CSV export action  
**Then** download includes issue rows (number, tenant, operator email, subject, status, timestamps)  
**And** does not embed screenshot binary data

**Given** empty period  
**Then** report shows zero states without error

### Story 27.3: Docs and maintenance copy for support path

As an **operator reading help docs or hitting a maintenance page**,
I want **clear directions to Settings → Help & support**,
So that **I know how to reach Creativorare when self-help fails** (FR-15).

**Acceptance Criteria:**

**Given** `/docs` chapter **18. If something goes wrong**  
**Then** table includes row: **Still stuck?** → open **Settings → Help & support**, attach a screenshot, save your support ID

**Given** `tenant-maintenance-page` (billing/support freeze)  
**Then** copy tells signed-in operators to use Settings → Help & support  
**And** does not expose techsolutions@ as the primary CTA for operators

**Given** marketing footer Contact link  
**Then** unchanged for v1 (no public contact form) unless explicitly added later

---

## Final Validation (Step 4)

| Check | Result |
| --- | --- |
| All FR-1..FR-15 covered | ✅ |
| All NFR-1..NFR-4 addressed in stories | ✅ |
| Architecture AD-1..AD-7 reflected | ✅ |
| Epics deliver user value (not layers) | ✅ Epic 26 operator, Epic 27 platform ops |
| Epic 27 standalone after Epic 26 | ✅ |
| No forward story dependencies within epic | ✅ 26.1→26.2→26.3→26.4→26.5; 27.1→27.2; 27.3 independent |
| Entities created when needed | ✅ 26.1 creates schema; not upfront for unrelated features |
| Brownfield — no starter template story | ✅ N/A |

**Ready for development.** Next: `bmad-create-story` for **26.1**, or `bmad-sprint-planning` to register epic in sprint status.
