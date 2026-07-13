---
baseline_commit: pending
---

# Story 7.6: Operator Delivery Checklist

Status: done

## Story

As an operator,
I want visibility into SendGrid sender/domain setup status,
So that I know why campaigns may not reach inboxes.

## Acceptance Criteria

1. **AC-7.6.1 — Campaigns checklist**
   - **Given** I open campaigns or compose
   - **When** SendGrid is misconfigured or sender unverified
   - **Then** I see actionable checklist text (DNS, sender verification) without exposing secrets

2. **AC-7.6.2 — Settings checklist**
   - **Given** I open Settings
   - **When** delivery setup is incomplete or sandbox mode is on
   - **Then** I see the full checklist with status per step

## Dev Agent Record

### File List

- `src/Contracts/Email/EmailDeliveryContracts.cs` — status + checklist DTOs
- `src/Application/Email/IEmailDeliveryStatusService.cs` — service contract
- `src/Infrastructure/Email/EmailDeliveryStatusService.cs` — config + optional SendGrid verification lookup
- `src/Api/Controllers/V1/EmailDeliveryController.cs` — `GET /api/v1/admin/email-delivery/status`
- `src/Infrastructure.Tests/Email/EmailDeliveryStatusServiceTests.cs` — parser + checklist unit tests
- `src/Api.IntegrationTests/EmailDeliveryStatusIntegrationTests.cs` — authenticated status endpoint
- `web/lib/email-delivery-api.ts` — fetch helper
- `web/components/campaigns/email-delivery-checklist.tsx` — banner + panel variants
- `web/components/campaigns/campaigns-list-page.tsx` — banner when not ready
- `web/components/campaigns/campaign-compose-page.tsx` — banner when not ready
- `web/app/(admin)/settings/page.tsx` — full delivery panel

### Completion Notes

- API returns checklist only — no API keys or secrets
- When configured for live send, queries SendGrid verified senders + domain authentication
- Sandbox mode, missing key, and unverified sender/domain surface as actionable hints
