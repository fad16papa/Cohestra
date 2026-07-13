---
baseline_commit: b4fba25
---

# Story 3.8: Client Relationship Timeline

Status: done

## Story

As an operator,
I want to see a Client's registration history and follow-up events,
So that I have full context before outreach.

## Acceptance Criteria

1. **AC-3.8.1 — Timeline list (UX-DR11, FR-7)**
   - **Given** a Client with multiple Registrations
   - **When** I view the profile timeline
   - **Then** TimelineEvent lists Registrations chronologically (newest first) with Activity name and date

2. **AC-3.8.2 — Referral source per registration**
   - **Given** a registration captured referral source answers
   - **When** I view the timeline entry
   - **Then** referral source history is visible for that registration

3. **AC-3.8.3 — Status change events**
   - **Given** a Client with lead status changes audited in Story 3.7
   - **When** I view the timeline
   - **Then** lead status change events appear merged with registrations, newest first

## Tasks / Subtasks

- [x] **Task 1: Timeline projection on client detail API** (AC: 3.8.1, 3.8.2, 3.8.3)
  - [x] `ClientTimelineItemResponse` on `ClientDetailResponse`
  - [x] `ClientTimelineBuilder` merges registrations + `ClientTimelineEvent` rows
  - [x] Referral source extracted per registration from form answers

- [x] **Task 2: TimelineEvent UI** (AC: 3.8.1, 3.8.2, UX-DR11)
  - [x] `TimelineEvent` component — primary left border, caps label, muted timestamp
  - [x] `ClientRelationshipTimeline` on client profile page

- [x] **Task 3: Verify build** (AC: all)
  - [x] `dotnet build`, `npm run lint`, `npm run build`

## Dev Notes

- Registration timeline rows are synthesized from immutable `Registration` records (not duplicate DB events)
- Campaign / WhatsApp timeline types ship in Epic 5
- Merge-suspect banner remains Story 3.9

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Client detail API returns merged timeline (registrations + lead status audit events)
- Profile page renders UX-DR11 TimelineEvent list with referral source per registration entry

### File List

- `src/Contracts/Clients/ClientTimelineItemResponse.cs`
- `src/Contracts/Clients/ClientDetailResponse.cs`
- `src/Infrastructure/Clients/ClientTimelineBuilder.cs`
- `src/Infrastructure/Clients/ClientDetailMapper.cs`
- `src/Infrastructure/Clients/ClientService.cs`
- `web/lib/clients-api.ts`
- `web/components/clients/timeline-event.tsx`
- `web/components/clients/client-relationship-timeline.tsx`
- `web/components/clients/client-profile-page.tsx`

### Change Log

- 2026-06-16: Story 3.8 implemented — relationship timeline API projection and profile UI

### Review Findings

- [x] [Review][Defer] Timeline list keys for `lead_status_changed` events omit status transition — rely on `occurredAt` uniqueness; add `previousLeadStatus`/`newLeadStatus` to key if rapid updates collide [`client-relationship-timeline.tsx:36`]
- [x] [Review][Defer] Equal `OccurredAt` timestamps leave registration vs status event order undefined in merge sort [`ClientTimelineBuilder.cs:48-50`]
- [x] [Review][Defer] Referral source extraction only reads `referral_source` field type — text-field referral answers omitted (form templates use typed field) [`ClientTimelineBuilder.cs:63`]
- [x] [Review][Defer] No tests for timeline projection or referral extraction — Epic 3 defer pattern [`ClientTimelineBuilder.cs`]

### Re-review (2026-06-16, pass 1)

✅ **Clean review — all layers passed.**

- Registrations + lead status audit events merged newest-first with activity name and timestamp (UX-DR11 left border, caps label)
- Referral source shown per registration timeline entry when captured in form answers
- All AC-3.8.1–3.8.3 satisfied; no patch or decision-needed findings
