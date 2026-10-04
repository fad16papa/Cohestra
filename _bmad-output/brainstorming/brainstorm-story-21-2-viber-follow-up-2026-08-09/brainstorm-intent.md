# Story 21.2 Intent — Viber follow-up status tracking

**Epic:** 21 — Viber client touch-base  
**Story ID:** 21.2  
**Date:** 2026-08-09  
**Depends on:** Story 21.1 — merged (Viber initiated)  
**Source:** Brainstorm session (memlog in this folder)

## Problem

Story 21.1 ships **Open Viber** + `ViberInitiated` timeline logging, but operators cannot record **what happened after** a Viber message. The profile **Log outreach** card (`ClientOutreachLogCard`) saves only to `whatsapp_follow_up_recorded` — Viber outreach is invisible in follow-up history and duplicate-log guards.

Without 21.2:

- Teams lose audit trail for Viber touch-points (FR-15, NFR-8 gap for second messenger)
- Dashboard/report coverage cannot include Viber in 21.3
- Operators must mentally track Viber outcomes outside Cohestra

## Goal

Mirror **WhatsApp follow-up** end-to-end for Viber: API dedup, timeline event, profile save UX — without changing dashboard predicates (Story 21.3) or share-kit (parked 21.4).

## Chosen approach (from brainstorm)

**API:** Line-for-line mirror of `RecordWhatsAppFollowUpAsync` → `RecordViberFollowUpAsync` with `ViberFollowUpRecorded` event type, 15-minute identical status+note cooldown, 409 on duplicate.

**UI:** Extend the existing **Log outreach** sidebar card with a **channel toggle** (WhatsApp | Viber) — do **not** add a second card (EXPERIENCE.md sidebar invariant: Next follow-up + Log outreach only).

| UX rule | Behavior |
|---------|----------|
| Default channel | Most recent `whatsapp_initiated` vs `viber_initiated` by `occurredAt`; tie → WhatsApp |
| Baseline / dirty guard | Per selected channel — reads latest `*_follow_up_recorded` for that channel only |
| Status options | Shared: `contacted` · `awaiting_reply` |
| Save | Routes to `recordWhatsAppFollowUp` or `recordViberFollowUp` based on toggle |
| Post-save nudge | Same parent toast (*Outreach log saved.* + **Set follow-up date**) for either channel |
| Viber visual | Toggle segment uses `--viber` token when Viber selected; card chrome stays neutral |

**Rejected alternatives:** duplicate Viber-only card (sidebar clutter); auto-route by last initiated without visible channel (hides operator intent); unified single timeline type (breaks mirror + 21.3 predicates).

## In scope (Story 21.2)

### 1. Domain & API (mirror WhatsApp)

| Layer | WhatsApp reference | Viber (this story) |
|-------|-------------------|-------------------|
| Enum | `WhatsAppFollowUpRecorded` | `ViberFollowUpRecorded` |
| Service | `RecordWhatsAppFollowUpAsync` | `RecordViberFollowUpAsync` |
| Dedup | `EnsureWhatsAppFollowUpIsNotDuplicate` + 15 min | `EnsureViberFollowUpIsNotDuplicate` + 15 min |
| Exception | `DuplicateWhatsAppFollowUpException` → 409 | `DuplicateViberFollowUpException` → 409 |
| Route | `POST .../whatsapp-follow-up` | `POST .../viber-follow-up` |
| Contract | `RecordWhatsAppFollowUpRequest` | `RecordViberFollowUpRequest` (same shape) |
| Timeline slug | `whatsapp_follow_up_recorded` | `viber_follow_up_recorded` |
| Timeline label | "WhatsApp follow-up recorded" | "Viber follow-up recorded" |

Status normalization: `contacted` | `awaiting_reply` → formatted subject `Contacted` | `Awaiting reply` (reuse existing helpers or extract shared private helpers in `ClientService`).

### 2. Timeline projection

- `ClientTimelineBuilder` case for `ViberFollowUpRecorded`
- Web: extend `ClientTimelineEventType`, `parseTimelineEventType`, `timeline-event.tsx` summary (show formatted status from `campaignSubject`)

### 3. Web — channel-aware Log outreach card

Refactor `ClientOutreachLogCard`:

- Add `OutreachChannel = 'whatsapp' | 'viber'` state + segmented toggle
- `getLatestOutreachStatus(client, channel)` filters by event type
- `handleSaveOutreachLog` calls appropriate API
- Helper copy unchanged: *Record what happened after messaging…*
- Optional subtitle when Viber selected: *Logging Viber outreach*

Add `recordViberFollowUp` to `clients-api.ts` (mirror `recordWhatsAppFollowUp`).

### 4. Tests

| Test | Reference |
|------|-----------|
| Unit dedup | `WhatsAppFollowUpDeduplicationTests` → `ViberFollowUpDeduplicationTests` (3 cases) |
| Integration dedup | `WhatsAppFollowUpDedupIntegrationTests` → `ViberFollowUpDedupIntegrationTests` (409 duplicate, allow different note) |
| Controller | 404 client, 400 invalid status (optional parity) |

### 5. Seed / demo data (optional, low priority)

Add sample `ViberFollowUpRecorded` entries in `DemoDataSeedCatalog` for UAT profiles — only if trivial alongside existing Viber initiated seeds.

## Out of scope

| Item | Owner story |
|------|-------------|
| Dashboard follow-up coverage predicates | 21.3 |
| Report outreach filters | 21.3 |
| Last outreach column on `/clients` list | 21.3 |
| Share-kit Copy Viber message | 21.4 (parked) |
| EXPERIENCE.md channel toggle doc | Optional polish — can note `viber_follow_up_recorded` in profile section or defer to 21.3 doc pass |
| Merging WhatsApp + Viber into one combined follow-up event | Never — channels stay independent |

## Acceptance criteria (from epic — implementation checklist)

1. **AC-21.2.1 — Save follow-up**  
   Given Viber contact, when operator sets status + optional note and saves, then `ViberFollowUpRecorded` appends with formatted status label; save blocked until status or note differs from last saved baseline **for Viber channel**.

2. **AC-21.2.2 — API dedup**  
   Identical status+note within 15 minutes → **409** with clear message.

3. **AC-21.2.3 — Integration tests**  
   Parallel Viber dedup integration tests mirroring WhatsApp suite.

4. **AC-21.2.4 — UI channel clarity**  
   Log outreach card exposes WhatsApp/Viber toggle; defaults sensibly; Viber uses brand token on active segment.

5. **AC-21.2.5 — Post-save nudge parity**  
   Viber save triggers same follow-up date nudge path as WhatsApp when `shouldNudgeFollowUpDateAfterOutreach` applies.

## Implementation notes

- **Primary references:** `ClientService.RecordWhatsAppFollowUpAsync`, `client-outreach-log-card.tsx`, `WhatsAppFollowUpDedupIntegrationTests.cs`
- **Story 21.1 file list:** `21-1-viber-click-to-message-from-client-profile.md` Dev Notes mirror table
- **EXPERIENCE.md:** Sidebar still one Log outreach card — update line 235 to mention both event types when doc touch is included
- **Helper extraction:** Prefer extracting shared `NormalizeFollowUpStatus` / dedup template to reduce duplication — only if diff stays readable; duplicating WhatsApp private methods is acceptable for minimal scope

## Success metric

Operator completes UJ-5 Flow F using **Viber** on a client row → opens profile → logs *Awaiting reply* on Viber channel → timeline shows **Viber follow-up recorded — Awaiting reply** → duplicate save within 15 min shows friendly 409.

## Next workflow

`bmad-create-story 21-2` → `bmad-dev-story 21-2`
