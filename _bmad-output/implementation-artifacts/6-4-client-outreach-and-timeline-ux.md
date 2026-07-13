---
baseline_commit: 793a2cd
---

# Story 6.4: Client Outreach and Timeline UX

Status: done

## Story

As an operator,
I want client profile outreach controls to prevent accidental duplicate logging,
So that the relationship timeline stays trustworthy and readable.

## Acceptance Criteria

1. **AC-6.4.1 — Timeline scroll**
   - **Given** a client with many timeline events
   - **When** I view the relationship timeline
   - **Then** the panel has fixed height and scrolls internally

2. **AC-6.4.2 — Follow-up save guard**
   - **Given** I have not changed follow-up status or note since last save
   - **When** I view WhatsApp outreach
   - **Then** "Save follow-up status" is disabled with helper text

3. **AC-6.4.3 — Toast deduplication**
   - **Given** an identical toast message is already visible
   - **When** the same message would show again
   - **Then** a duplicate toast is not stacked

## Dev Agent Record

### Completion Notes

- `client-whatsapp-outreach.tsx`: baseline/dirty tracking, submission guard, sync from latest follow-up
- `client-relationship-timeline.tsx`: responsive fixed-height scroll
- `toast-provider.tsx`: dedupe visible messages
