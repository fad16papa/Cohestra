---
epic: 21
story: 2
status: review
baseline_commit: 24a4d3f263988c77e4873469c4bdb63ce0fa376a
---

# Story 21.2: Viber follow-up status tracking

Status: review

## Story

As a **Tenant Admin or Member**,
I want **to record Viber follow-up status on a Client after messaging**,
So that **my team sees outreach history and avoids duplicate logging**.

## Context

- Epic 21 extends client outreach alongside WhatsApp. Story 21.1 shipped `ViberInitiated`; this story adds follow-up parity.
- Brainstorm intent: channel toggle on existing **Log outreach** card; API mirrors WhatsApp dedup (15 min, 409).
- Dashboard/report coverage deferred to Story 21.3.

## Acceptance Criteria

1. **Given** I contacted a Client via Viber  
   **When** I set follow-up status (`contacted` | `awaiting_reply`) with optional note and save on the Viber channel  
   **Then** `ViberFollowUpRecorded` appends to the timeline with formatted status label  
   **And** save is blocked until status or note differs from the last saved baseline for the Viber channel

2. **Given** an identical follow-up status and note within the cooldown window  
   **When** the same Viber follow-up POST is submitted again  
   **Then** API returns **409** with a clear message

3. **Given** integration tests for WhatsApp follow-up dedup exist  
   **When** Viber follow-up ships  
   **Then** parallel integration tests cover Viber dedup behavior

4. **Given** the client profile Log outreach card  
   **When** rendered  
   **Then** WhatsApp | Viber channel toggle is visible; Viber segment uses `--viber` token when active; default channel from latest initiated event

5. **Given** Viber outreach log save succeeds  
   **When** follow-up date nudge applies  
   **Then** same post-save toast path as WhatsApp (`onOutreachSaved` in parent)

## Tasks / Subtasks

- [x] **Task 1 — Domain & API** (AC: 1, 2)
  - [x] Add `ViberFollowUpRecorded` to `ClientTimelineEventType`
  - [x] `RecordViberFollowUpAsync` + dedup in `ClientService`
  - [x] `DuplicateViberFollowUpException` → 409
  - [x] `POST /api/v1/admin/clients/{id}/viber-follow-up` on `ClientsController`
  - [x] `RecordViberFollowUpRequest` contract

- [x] **Task 2 — Timeline projection** (AC: 1)
  - [x] `ClientTimelineBuilder` case → `viber_follow_up_recorded` / label "Viber follow-up recorded"
  - [x] Web: extend timeline types, `parseTimelineEventType`, `timeline-event.tsx`

- [x] **Task 3 — Channel-aware Log outreach card** (AC: 1, 4, 5)
  - [x] WhatsApp | Viber toggle on `ClientOutreachLogCard`
  - [x] Per-channel baseline/dirty guard
  - [x] Default channel from latest initiated event (tie → WhatsApp)
  - [x] `recordViberFollowUp` in `clients-api.ts`

- [x] **Task 4 — Tests** (AC: 2, 3)
  - [x] `ViberFollowUpDeduplicationTests.cs` (3 unit tests)
  - [x] `ViberFollowUpDedupIntegrationTests.cs` (409 + different note)

- [x] **Task 5 — List outreach mapping** (AC: 1)
  - [x] Include `ViberFollowUpRecorded` in outreach event types + `MapOutreachKind` → `viber`

### Review Findings

- [ ] [Review][Patch] Channel switch keeps per-channel drafts (decision: option 2) — stash status/note per channel on toggle; restore stash or baseline; clear draft on successful save [`web/components/clients/client-outreach-log-card.tsx`]
- [ ] [Review][Patch] Dirty guard ignores last saved note — enables Save that 409s when same note is retyped [`web/components/clients/client-outreach-log-card.tsx:155`]
- [ ] [Review][Patch] Add cross-channel isolation unit test (identical WhatsApp follow-up must not 409 Viber) [`src/Infrastructure.Tests/Clients/ViberFollowUpDeduplicationTests.cs`]
- [ ] [Review][Patch] Channel toggle a11y: use `radiogroup` / `role="radio"` exclusive pattern [`web/components/clients/client-outreach-log-card.tsx:214`]
- [x] [Review][Defer] Concurrent identical POSTs can both succeed — deferred, pre-existing WhatsApp race [`src/Infrastructure/Clients/ClientService.cs`]
- [x] [Review][Defer] First Contacted+empty note blocked by synthetic baseline — deferred, pre-existing WhatsApp dirty pattern [`web/components/clients/client-outreach-log-card.tsx`]
- [x] [Review][Defer] No web tests for channel toggle / default channel — deferred, follow-up coverage [`web/components/clients/client-outreach-log-card.tsx`]
- [x] [Review][Defer] Note length not validated before DB max 500 — deferred, pre-existing WhatsApp path [`src/Infrastructure/Clients/ClientService.cs`]
- [x] [Review][Defer] Integration tests omit success-body timeline assertions — deferred, dedup coverage sufficient for AC-3 [`src/Api.IntegrationTests/ViberFollowUpDedupIntegrationTests.cs`]

## Dev Notes

### Mirror WhatsApp follow-up

| Layer | WhatsApp reference | Viber (this story) |
|-------|-------------------|-------------------|
| Enum | `WhatsAppFollowUpRecorded` | `ViberFollowUpRecorded` |
| Service | `RecordWhatsAppFollowUpAsync` | `RecordViberFollowUpAsync` |
| Route | `POST .../whatsapp-follow-up` | `POST .../viber-follow-up` |
| Timeline slug | `whatsapp_follow_up_recorded` | `viber_follow_up_recorded` |

### Out of scope (21.3)

- Dashboard follow-up coverage predicates
- Report filters
- Last outreach column on `/clients` list

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Implemented Viber follow-up API mirroring WhatsApp (15-min dedup, 409 on duplicate).
- Extended Log outreach card with WhatsApp | Viber channel toggle; per-channel baseline; brand tokens on active segment.
- Unit tests (3) and integration dedup tests (2) added. Web build + unit tests pass.

### File List

- `_bmad-output/implementation-artifacts/21-2-viber-follow-up-status-tracking.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/Domain/Clients/ClientTimelineEventType.cs`
- `src/Application/Clients/IClientService.cs`
- `src/Application/Clients/DuplicateViberFollowUpException.cs`
- `src/Contracts/Clients/ViberContracts.cs`
- `src/Infrastructure/Clients/ClientService.cs`
- `src/Infrastructure/Clients/ClientTimelineBuilder.cs`
- `src/Api/Controllers/V1/ClientsController.cs`
- `src/Infrastructure.Tests/Clients/ViberFollowUpDeduplicationTests.cs`
- `src/Api.IntegrationTests/ViberFollowUpDedupIntegrationTests.cs`
- `web/lib/clients-api.ts`
- `web/components/clients/client-outreach-log-card.tsx`
- `web/components/clients/timeline-event.tsx`

### Change Log

- 2026-08-09: Story 21.2 — Viber follow-up status tracking (Epic 21)
