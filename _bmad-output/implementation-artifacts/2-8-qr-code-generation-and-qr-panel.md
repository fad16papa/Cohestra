---
baseline_commit: 4daa64a
---

# Story 2.8: QR Code Generation and QrPanel

Status: done

## Story

As an operator,
I want to preview, copy, and download a QR code for my published Activity,
So that I can share it at venues and on social media.

## Acceptance Criteria

1. **AC-2.8.1 — QrPanel on QR & Link tab (UX-DR13, FR-3)**
   - **Given** a published Activity
   - **When** I open Activity detail QR & Link tab
   - **Then** QrPanel shows live QR preview, copy URL button, and download PNG

2. **AC-2.8.2 — QR URL matches public link**
   - **And** QR URL matches public link `/register/{slug}`

3. **AC-2.8.3 — Theme-independent PNG**
   - **And** downloaded PNG has white background + black modules regardless of UI theme

## Tasks / Subtasks

- [x] **Task 1: Server-side QR generation** (AC: 2.8.2, 2.8.3)
  - [x] QRCoder PNG generator with black modules on white background
  - [x] `GET /api/v1/admin/activities/{id}/registration-link`
  - [x] `GET /api/v1/admin/activities/{id}/qr-code.png` (published only)
  - [x] `PublicWeb:BaseUrl` config for absolute registration URLs

- [x] **Task 2: QrPanel UI** (AC: 2.8.1, 2.8.2, 2.8.3)
  - [x] Live QR preview from server PNG blob
  - [x] Copy public link + download PNG actions
  - [x] Draft/archived disabled states with publish-gate messaging

- [x] **Task 3: Activity detail QR & Link tab** (AC: 2.8.1)
  - [x] Dedicated tab per UX-DR19; panel kept mounted with `hidden` pattern

- [x] **Task 4: Verify build** (AC: all)
  - [x] `dotnet build`, `npm run lint`, `npm run build`

## Dev Notes

- QR payload uses the same absolute URL returned by registration-link endpoint
- Server generates PNG so colors stay consistent across light/dark admin theme

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Server-side QRCoder PNG with black-on-white modules
- Admin endpoints for registration link and QR PNG (published activities only)
- QrPanel loads preview, copy link, and download on QR & Link tab

### File List

- `src/Infrastructure/Infrastructure.csproj`
- `src/Infrastructure/Activities/ActivityQrCodeGenerator.cs`
- `src/Infrastructure/Activities/ActivityService.cs`
- `src/Infrastructure/Activities/PublicWebOptions.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Application/Activities/IActivityService.cs`
- `src/Contracts/Activities/ActivityRegistrationLinkResponse.cs`
- `src/Api/Controllers/V1/ActivitiesController.cs`
- `src/Api/appsettings.json`
- `src/Api/Api.http`
- `docker-compose.yml`
- `web/lib/activities-api.ts`
- `web/components/activities/activity-qr-panel.tsx`
- `web/components/activities/activity-detail-page-client.tsx`
- `web/components/activities/activity-publish-controls.tsx`

### Change Log

- 2026-06-16: Story 2.8 implemented — server QR generation and QrPanel on QR & Link tab
- 2026-06-20: Marked done during Epic 2 closure — implementation verified; formal code review deferred (shipped with 2.9–2.11 review cycle)
