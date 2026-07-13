---
baseline_commit: pending
---

# Story 7.5: Server Outreach Dedup

Status: done

## Story

As an operator,
I want the API to reject duplicate WhatsApp follow-up logs,
So that timeline audit stays trustworthy beyond UI guards.

## Acceptance Criteria

1. **AC-7.5.1 — Duplicate follow-up rejected**
   - **Given** an identical follow-up status and note was recorded recently (within 15 minutes)
   - **When** the same follow-up POST is submitted again
   - **Then** API returns **409 Conflict** with a clear ProblemDetails message

2. **AC-7.5.2 — Legitimate updates allowed**
   - **Given** a recent follow-up with the same status
   - **When** the note differs (or status differs, or cooldown elapsed)
   - **Then** API accepts the new entry

## Dev Agent Record

### File List

- `src/Application/Clients/DuplicateWhatsAppFollowUpException.cs` — domain exception with operator-facing message
- `src/Infrastructure/Clients/ClientService.cs` — `EnsureWhatsAppFollowUpIsNotDuplicate` (15-minute cooldown, status + note match)
- `src/Api/Controllers/V1/ClientsController.cs` — maps exception to 409 Conflict
- `src/Infrastructure.Tests/Clients/WhatsAppFollowUpDeduplicationTests.cs` — unit tests for dedup helper
- `src/Api.IntegrationTests/WhatsAppFollowUpDedupIntegrationTests.cs` — API tests (409 on duplicate; 200 on note change)

### Completion Notes

- Dedup compares latest `WhatsAppFollowUpRecorded` timeline event: formatted status + normalized note within 15-minute window
- UI dirty-state guard (Epic 6.4) remains; server dedup closes API replay / double-submit gap
- Frontend already surfaces ProblemDetails via existing error parsing — no web change required
