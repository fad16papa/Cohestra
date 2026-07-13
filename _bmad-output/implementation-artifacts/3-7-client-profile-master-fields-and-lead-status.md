---
baseline_commit: b4fba25
---

# Story 3.7: Client Profile Master Fields and Lead Status

Status: done

## Story

As an operator,
I want to view and edit Client profile fields and Lead Status,
So that I can manage follow-up priorities.

## Acceptance Criteria

1. **AC-3.7.1 — Master profile + answer history (FR-5)**
   - **Given** I open `/clients/{id}`
   - **When** the profile loads
   - **Then** master fields display (name, contact, email/social, profession, consent, notes) plus activity-specific answer history

2. **AC-3.7.2 — Lead status update (UX-DR6)**
   - **Given** I am on a client profile
   - **When** I change Lead Status via dropdown
   - **Then** a confirmation toast appears after a successful update

3. **AC-3.7.3 — Audited status change (NFR-8)**
   - **Given** I change a client's Lead Status
   - **When** the update succeeds
   - **Then** a `ClientTimelineEvent` is appended with timestamp

## Tasks / Subtasks

- [x] **Task 1: Timeline event persistence** (AC: 3.7.3)
  - [x] `ClientTimelineEvent` entity + migration
  - [x] Append `LeadStatusChanged` event on status update

- [x] **Task 2: Client profile API** (AC: 3.7.1, 3.7.3)
  - [x] `GET /api/v1/admin/clients/{id}` with master fields + registration answer history
  - [x] `PATCH /api/v1/admin/clients/{id}/lead-status`

- [x] **Task 3: Client profile UI** (AC: 3.7.1, 3.7.2)
  - [x] `/clients/[id]` profile page with master fields card
  - [x] Registration answer history card (newest first)
  - [x] Lead status dropdown with success toast

- [x] **Task 4: Verify build** (AC: all)
  - [x] `dotnet build`, `npm run lint`, `npm run build`

## Dev Notes

- Timeline UI component ships in Story 3.8; this story persists audit events only
- Merge-suspect banner ships in Story 3.9
- Notes remain read-only until a dedicated edit story; FR-5 edit scope here is Lead Status

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Client profile API returns master fields and labeled registration answer history
- Lead status PATCH appends audited timeline events
- Profile page replaces placeholder with master fields, answer history, and status control

### File List

- `src/Domain/Clients/ClientTimelineEvent.cs`
- `src/Domain/Clients/ClientTimelineEventType.cs`
- `src/Domain/Clients/Client.cs`
- `src/Contracts/Clients/ClientDetailResponse.cs`
- `src/Application/Clients/IClientService.cs`
- `src/Infrastructure/Clients/ClientService.cs`
- `src/Infrastructure/Clients/ClientDetailMapper.cs`
- `src/Infrastructure/Clients/ClientRegistrationAnswerFormatter.cs`
- `src/Infrastructure/Persistence/Configurations/ClientTimelineEventConfiguration.cs`
- `src/Infrastructure/Persistence/CohestraDbContext.cs`
- `src/Infrastructure/Persistence/Migrations/*AddClientTimelineEvents*`
- `src/Api/Controllers/V1/ClientsController.cs`
- `src/Api/Api.http`
- `web/lib/clients-api.ts`
- `web/components/clients/client-profile-page.tsx`
- `web/components/clients/client-master-fields.tsx`
- `web/components/clients/client-registration-history.tsx`
- `web/components/clients/client-lead-status-control.tsx`
- `web/app/(admin)/clients/[id]/page.tsx`

### Change Log

- 2026-06-16: Story 3.7 implemented — client profile API/UI and audited lead status updates
- 2026-06-16: Review patch applied — timeline event status fields stored lowercase
- 2026-06-16: Review patch applied — normalized ClientsController.cs formatting (pass 3)

### Re-review (2026-06-16, pass 2)

✅ **Clean review — all layers passed.**

- Pass 1 patch verified: `PreviousLeadStatus` / `NewLeadStatus` written with `ToLowerInvariant()` to match API contract
- All AC-3.7.1–3.7.3 satisfied; no new patch or decision-needed findings
- Deferred items unchanged (heavy PATCH include, schema-only history, duplicate labels, tests)

### Re-review (2026-06-16, pass 3)

✅ **Clean review — all layers passed.**

- Pass 3 patch verified: `ClientsController.cs` normalized to 120 lines, matches project controller formatting
- Pass 1 timeline casing patch re-verified in `ClientService.UpdateLeadStatusAsync`
- All AC-3.7.1–3.7.3 satisfied; no new patch or decision-needed findings
- Deferred items unchanged; pre-pass-1 timeline rows may still use PascalCase status strings — 3.8 should normalize both casings when rendering

### Review Findings

- [x] [Review][Patch] `ClientsController.cs` has blank lines between every source line (~240 lines vs ~120) — accidental formatting corruption; normalize to match other controllers [`ClientsController.cs`]
- [x] [Review][Patch] Timeline event status fields stored as PascalCase enum names (`New`, `Contacted`) while API contract uses lowercase (`new`, `contacted`) — Story 3.8 timeline rendering will need extra normalization unless fixed at write time [`ClientService.cs:117-118`]
- [x] [Review][Defer] `UpdateLeadStatusAsync` loads full registration + activity graph on every status PATCH — acceptable for MVP; optimize with a lighter read path if profile updates become frequent [`ClientService.cs:93-96`]
- [x] [Review][Defer] Answer keys present in registration JSON but absent from activity form schema are omitted from history when schema exists — edge case for legacy/migrated data [`ClientRegistrationAnswerFormatter.cs:24-34`]
- [x] [Review][Defer] Duplicate lead status label maps in `lead-status-badge.tsx` and `clients-api.ts` — consolidate when touching badge styling [`lead-status-badge.tsx:4-8`, `clients-api.ts:5-10`]
- [x] [Review][Defer] No integration/unit tests asserting timeline event append on status change — consistent with Epic 3 defer pattern [`ClientService.cs:111-121`]
- [x] [Review][Dismiss] `isMergeSuspect` returned by API but not shown in profile UI — Story 3.9 scope
- [x] [Review][Dismiss] Notes and other master fields are read-only — documented in Dev Notes; AC edit scope is Lead Status only
