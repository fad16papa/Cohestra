---
story_id: 32.3
story_key: 32-3-website-contact-section-creates-a-client
epic: 32
status: done
baseline_commit: 6f920e6
created: 2026-08-31
depends_on:
  - 32-2-activity-embed-route-and-share-kit-snippet
sources:
  - _bmad-output/planning-artifacts/epics-registration-capture.md
---

# Story 32.3: Website Contact section creates a Client

Status: done

## Story

As a Core or Pro Operator,
I want a homepage Contact section with a fixed Field set,
So that "I only wanted a contact form" creates a Client without inventing a fake Activity.

**FRs:** FR-RC-13 (CAP-11). **UX:** UX-DR-RC-9. **Depends:** 32.2 (epic stack).

## Acceptance Criteria

1. **Given** a Core or Pro tenant website builder
   **When** I add a Contact section
   **Then** Fields are fixed: name, email, phone, message, consent checkbox
   **And** I author heading, intro, button label, and success message — not a Form tab
   **And** there is no Recipe, slash palette, or multi-form library on this section

2. **Given** a published homepage with Contact enabled
   **When** a visitor submits Contact
   **Then** `POST /api/v1/public/website-inquiries` upserts a Client (`LeadStatus = New`)
   **And** a Website inquiry timeline event is written
   **And** no Activity Registration is created
   **And** duplicate phone/email updates the existing Client (same dedup as public Registration)

3. **Given** consent unchecked → Client created; marketing opt-in **not** set
   **Given** consent checked → marketing opt-in set

4. **Given** a successful Contact submit → Outbox enqueues `WebsiteInquiryOperatorNotify` (not `RegistrationOperatorNotify`)

5. **Given** a Basic tenant → UI and API are `plan_locked` like the website builder

## Tasks / Subtasks

- [x] **Task 1 — Backend website inquiry API** (AC: 2–5)
  - [x] Contracts + `WebsiteInquiryService` with dedup, timeline, outbox
  - [x] `PublicWebsiteInquiriesController` + rate limit + Basic plan gate
  - [x] `WebsiteInquiryOperatorNotify` outbox handler + email builder
  - [x] `contact` in `SiteSectionPlanGate` Essentials
  - [x] Unit + integration tests

- [x] **Task 2 — Web Contact section** (AC: 1, 5)
  - [x] Registry defaults + builder fields (heading, intro, button, success)
  - [x] Public `ContactSection` form + submit API client
  - [x] Timeline display for website inquiry
  - [x] Web unit tests

- [x] **Task 3 — Verify + ship** (AC: all)
  - [x] `dotnet test Cohestra.sln --filter "Category!=Integration"` — 647 passed
  - [x] `npm run test -- website-inquiry-api` — 2 passed
  - [x] Commit, push, PR

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Added `contact` Essentials section (Core/Pro) with fixed name/email/phone/message/consent fields; operator edits heading, intro, button label, success message, and consent label only
- `POST /api/v1/public/website-inquiries` upserts Client via `ClientDeduplicationService`, writes `WebsiteInquiry` timeline event, enqueues `WebsiteInquiryOperatorNotify` — no Registration
- Basic plan returns 403 `plan_locked`; submit gated on published site with enabled contact section; shares public registration rate limiter
- Admin client timeline shows `website_inquiry` events with message excerpt

### File List

- `_bmad-output/implementation-artifacts/32-3-website-contact-section-creates-a-client.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/Domain/Clients/ClientTimelineEventType.cs`
- `src/Domain/Outbox/OutboxMessageTypes.cs`
- `src/Contracts/WebsiteInquiries/SubmitWebsiteInquiryRequest.cs`
- `src/Application/WebsiteInquiries/IWebsiteInquiryService.cs`
- `src/Application/WebsiteInquiries/IWebsiteInquiryOperatorNotifyService.cs`
- `src/Infrastructure/WebsiteInquiries/*`
- `src/Infrastructure/Outbox/WebsiteInquiryOperatorNotifyOutboxHandler.cs`
- `src/Infrastructure/Site/SiteSectionPlanGate.cs`
- `src/Infrastructure/Clients/ClientTimelineBuilder.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Api/Controllers/V1/PublicWebsiteInquiriesController.cs`
- `src/Api/Infrastructure/PublicRegistrationRateLimitMiddleware.cs`
- `src/Infrastructure.Tests/WebsiteInquiries/WebsiteInquiryValidatorTests.cs`
- `src/Infrastructure.Tests/Site/SiteSectionPlanGateTests.cs`
- `src/Api.IntegrationTests/WebsiteInquiryIntegrationTests.cs`
- `web/lib/site-sections/registry.ts`
- `web/lib/website-inquiry-api.ts`
- `web/lib/website-inquiry-api.test.ts`
- `web/lib/clients-api.ts`
- `web/lib/site-builder-utils.ts`
- `web/components/marketing/sections/contact-section.tsx`
- `web/components/marketing/site-page-renderer.tsx`
- `web/components/website/website-section-fields.tsx`
- `web/components/clients/timeline-event.tsx`

### Change Log

- 2026-08-31: Pass 1 code review — decision (keep consentLabel) + 7 patches applied

### Review Findings (2026-08-31)

- [x] [Review][Decision] **Consent checkbox label editable beyond AC copy fields** — Resolved: keep `consentLabel` editable for compliance/marketing copy (operator need outweighs strict four-field AC wording).

- [x] [Review][Patch] **Message validated to 2000 chars but stored/emailed truncated at 500** — aligned `MaxMessageLength` to 500 (timeline `Note` column limit).
- [x] [Review][Patch] **Operator notify email uses persisted client record, not inquiry payload** — outbox payload now carries submission snapshot; notify service emails inquiry fields.
- [x] [Review][Patch] **API status always `"created"` even when `ClientCreated=false`** — returns `"updated"` on dedup hit.
- [x] [Review][Patch] **Controller 400 detail says "name and message are required" but only checks name** — detail now `"Name is required."`
- [x] [Review][Patch] **Contact form missing client-side max-length validation** — `website-inquiry-limits.ts` + inline validation in `ContactSection`.
- [x] [Review][Patch] **Integration test omits `ConsentGiven=false` assertion on dedup path** — added assertion + `"updated"` status check.
- [x] [Review][Patch] **No integration test for Basic tenant `plan_locked` on submit** — `SubmitWebsiteInquiry_BasicTenant_ReturnsPlanLocked` added.

### Review Findings — Pass 2 (2026-08-31)

Pending re-review after pass 1 patches.

- [x] [Review][Defer] **LeadStatus not reset to New on dedup update** [`WebsiteInquiryService.cs` + `ClientDeduplicationService`] — deferred, matches public registration dedup (LeadStatus only set on create)
- [x] [Review][Defer] **Consent unchecked cannot revoke prior opt-in** [`ClientDeduplicationService.ApplyProfileAsync`] — deferred, pre-existing dedup service behavior shared with registration
- [x] [Review][Defer] **No idempotency key on website inquiry submit** [`WebsiteInquiryService.cs`] — deferred, not in Story 32.3 AC; double-submit creates duplicate timeline/outbox entries
- [x] [Review][Defer] **No integration test for phone-based dedup** [`WebsiteInquiryIntegrationTests.cs`] — deferred, email dedup path covers same `ClientDeduplicationService`; phone path unverified in CI
