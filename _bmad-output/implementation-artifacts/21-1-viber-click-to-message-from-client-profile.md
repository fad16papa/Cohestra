---
epic: 21
story: 1
status: review
baseline_commit: 2cdaf89f48300f9854c97eb9a240a4f97e435e1e
---

# Story 21.1: Viber click-to-message from client profile

Status: review

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Story

As a **Tenant Admin or Member**,
I want **to open Viber with a Client's phone number pre-filled from their profile**,
So that **I can reach clients on their preferred messenger without leaving Cohestra**.

## Context

- Epic 21 extends client outreach **alongside** WhatsApp (Platform 0 Epic 5 Stories 5.6–5.7). WhatsApp remains unchanged.
- v1 model: **click-to-message + timeline audit** — no Viber Business/Bot API ([epics-cohestra-enterprise.md](../planning-artifacts/epics-cohestra-enterprise.md) Epic 21).
- **This story:** open Viber + log `ViberInitiated` only. Follow-up status (21.2) and dashboard coverage (21.3) are separate stories.
- `ClientTimelineEvent.EventType` is stored as **string** in Postgres — adding enum member does **not** require EF migration.

## Acceptance Criteria

1. **Given** a Client with a registered mobile number in E.164 storage  
   **When** I click **Open Viber** on the client profile Viber outreach panel  
   **Then** `viber://chat?number=%2B{digits}` opens in a new tab/app  
   **And** the API records `ViberInitiated` on the client timeline **before** navigation  
   **And** the button is disabled with helper text when the client has no phone on file

2. **Given** the client profile on a narrow viewport  
   **When** the Viber action renders  
   **Then** the button uses the Viber brand token (`--viber`, `#7360F2`) and is full-width on mobile

3. **Given** WhatsApp outreach remains on the same profile  
   **When** both panels render  
   **Then** WhatsApp and Viber are separate actions — neither replaces the other

4. **Given** the follow-up panel quick actions (parity with WhatsApp)  
   **When** the client has a phone number  
   **Then** **Open Viber** is available alongside **Open WhatsApp** and logs `ViberInitiated` on click

5. **Given** integration test stack (Postgres)  
   **When** `POST /api/v1/admin/clients/{id}/viber-initiated` runs for a client with phone  
   **Then** response is 200 with timeline containing `viber_initiated` event  
   **And** POST for client without phone returns 400

## Tasks / Subtasks

- [x] **Task 1 — Domain & API** (AC: 1, 5)
  - [x] Add `ViberInitiated` to `ClientTimelineEventType`
  - [x] `IClientService.RecordViberInitiatedAsync` + `ClientService` implementation (mirror `RecordWhatsAppInitiatedAsync`)
  - [x] `POST /api/v1/admin/clients/{id}/viber-initiated` on `ClientsController`

- [x] **Task 2 — Timeline projection** (AC: 1, 5)
  - [x] `ClientTimelineBuilder` case → `viber_initiated` / label "Viber initiated"
  - [x] Web: extend `ClientTimelineEventType`, `parseTimelineEventType`, `timeline-event.tsx` summary

- [x] **Task 3 — Phone & deep link helper** (AC: 1)
  - [x] `buildViberChatUrl(phone)` in `phone-countries.ts` — reuse `toWhatsAppPhoneDigits`, encode `%2B` prefix

- [x] **Task 4 — Brand token** (AC: 2)
  - [x] `--viber` / `--viber-foreground` in `brand-tokens.css` + `globals.css` Tailwind color

- [x] **Task 5 — Web UI** (AC: 1, 2, 3, 4)
  - [x] `recordViberInitiated` in `clients-api.ts`
  - [x] `client-viber-outreach.tsx` (Open Viber panel, no follow-up form — deferred to 21.2)
  - [x] Mount on `client-profile-page.tsx` adjacent to WhatsApp outreach
  - [x] `client-follow-up-panel.tsx`: Open Viber quick action

- [x] **Task 6 — Tests** (AC: 5)
  - [x] `ViberInitiatedIntegrationTests.cs`: success + no-phone 400

## Dev Notes

### Mirror WhatsApp initiated (do not copy follow-up)

| Layer | WhatsApp reference | Viber (this story) |
|-------|-------------------|-------------------|
| Enum | `WhatsAppInitiated` | `ViberInitiated` |
| Service | `RecordWhatsAppInitiatedAsync` | `RecordViberInitiatedAsync` |
| Route | `POST .../whatsapp-initiated` | `POST .../viber-initiated` |
| Timeline slug | `whatsapp_initiated` | `viber_initiated` |
| Deep link | `https://wa.me/{digits}` | `viber://chat?number=%2B{digits}` |
| UI | `client-whatsapp-outreach.tsx` | `client-viber-outreach.tsx` (open only) |

### Do NOT implement in 21.1

- `ViberFollowUpRecorded`, follow-up form, dedup (Story 21.2)
- Dashboard/report coverage predicates (Story 21.3)
- Share-kit Viber copy (parked 21.4)

### Viber deep link

```text
viber://chat?number=%2B6593395845
```

Digits from existing `toWhatsAppPhoneDigits()` — same E.164 normalization as WhatsApp.

### Order of operations (web)

Same as WhatsApp: **POST log first**, then `window.open(viberUrl)` — if POST fails, do not open Viber.

### Files to touch

**Backend:** `ClientTimelineEventType.cs`, `IClientService.cs`, `ClientService.cs`, `ClientsController.cs`, `ClientTimelineBuilder.cs`

**Frontend:** `phone-countries.ts`, `clients-api.ts`, `client-viber-outreach.tsx` (new), `client-profile-page.tsx`, `client-follow-up-panel.tsx`, `timeline-event.tsx`, `brand-tokens.css`, `globals.css`

**Tests:** `ViberInitiatedIntegrationTests.cs` (new)

### References

- [Epic 21](../planning-artifacts/epics-cohestra-enterprise.md#epic-21-viber-client-touch-base)
- [Story 5.6 WhatsApp](../planning-artifacts/epics.md) (Platform 0)
- [client-whatsapp-outreach.tsx](../../web/components/clients/client-whatsapp-outreach.tsx)
- [RecordWhatsAppInitiatedAsync](../../src/Infrastructure/Clients/ClientService.cs)

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

### Completion Notes List

- Implemented Viber click-to-message mirroring WhatsApp initiated flow: API logs `ViberInitiated`, web opens `viber://chat?number=%2B{digits}` after successful POST.
- Added Viber outreach panel + follow-up panel quick action; WhatsApp unchanged.
- Brand token `--viber` (#7360F2) on Open Viber buttons; full-width on mobile in outreach panel.
- Integration tests: success timeline event + 400 when no phone. Unit tests: 406 passed.

### File List

- `_bmad-output/implementation-artifacts/21-1-viber-click-to-message-from-client-profile.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/Domain/Clients/ClientTimelineEventType.cs`
- `src/Application/Clients/IClientService.cs`
- `src/Infrastructure/Clients/ClientService.cs`
- `src/Infrastructure/Clients/ClientTimelineBuilder.cs`
- `src/Api/Controllers/V1/ClientsController.cs`
- `src/Api.IntegrationTests/ViberInitiatedIntegrationTests.cs`
- `web/lib/phone-countries.ts`
- `web/lib/clients-api.ts`
- `web/components/clients/client-viber-outreach.tsx`
- `web/components/clients/client-profile-page.tsx`
- `web/components/clients/client-follow-up-panel.tsx`
- `web/components/clients/timeline-event.tsx`
- `web/styles/brand-tokens.css`
- `web/app/globals.css`

### Change Log

- 2026-08-02: Story 21.1 — Viber click-to-message from client profile (Epic 21)
