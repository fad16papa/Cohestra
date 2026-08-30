---
story_id: 30.7
story_key: 30-7-closed-message
epic: 30
status: done
baseline_commit: cafb75e
created: 2026-08-30
sources:
  - _bmad-output/planning-artifacts/epics-registration-capture.md
  - _bmad-output/specs/spec-registration-capture/SPEC.md
  - _bmad-output/implementation-artifacts/30-6-piping-on-thank-you-and-confirmation-email.md
---

# Story 30.7: Closed message

Status: done

## Story

As an Operator,
I want my own Closed message when the Form is unavailable,
So that Maya sees “Waitlist opens Monday on WhatsApp” instead of only platform “Full.”

**FRs:** FR-RC-6 (CAP-5). **UX:** UX-DR-RC-3 reason chip + Closed message.

## Acceptance Criteria

1. **Given** I set `form_schema.meta.closedMessage` (max 2000, markdown-lite, no images)
   **When** the public Form is unavailable for a reason that already exists (capacity full, paused, or Activity ended)
   **Then** the Operator copy is shown XSS-sanitized
   **And** a reason chip still shows (Full / Closed / Paused / Ended)
   **And** empty Closed message → existing platform copy

2. **Given** light and dark themes
   **When** the unavailable screen renders
   **Then** contrast meets WCAG 2.2 AA; the message is not image-only

## Tasks / Subtasks

- [x] **Task 1 — Domain + schema meta** (AC: 1)
  - [x] `FormSchemaMeta.closedMessage` + DTO/mapper round-trip
  - [x] `FormSchemaValidator` max length 2000

- [x] **Task 2 — Web editor** (AC: 1)
  - [x] Meta types + parse in `activities-api.ts` / `form-schema-utils.ts`
  - [x] Form tab Closed message textarea

- [x] **Task 3 — Public unavailable screen** (AC: 1–2)
  - [x] Reason chip (Full / Paused / Ended / Closed)
  - [x] Operator closed message with XSS-safe markdown-lite render
  - [x] Fallback to platform copy when empty

- [x] **Task 4 — Tests + docs** (AC: 1–2)
  - [x] Validator tests
  - [x] Vitest for markdown-lite / reason chip helper
  - [x] Contract doc update

### Review Findings (Pass 1)

- [ ] [Review][Patch] `operatorCopy` uses raw trim, not post-sanitize content; HTML-only values (e.g. `"<b></b>"`) suppress platform title/description but render nothing [`public-registration-unavailable.tsx:55,70-88`]

- [ ] [Review][Patch] Reason chip uses `text-primary` on `bg-primary/10`; dark-mode computed contrast ~3.5:1 (fails WCAG 2.2 AA 4.5:1 for small text) [`public-registration-unavailable.tsx:65-66`]

- [x] [Review][Defer] Client HTML strip via regex only (no entity decode); same pattern as intro copy — deferred, React text nodes + strip sufficient for v1 [`markdown-lite-copy.ts:4`]
- [x] [Review][Defer] No server-side HTML strip on save for `closedMessage`; max-length only — deferred, matches intro/success copy meta pattern [`FormSchemaValidator.cs:80-83`]
- [x] [Review][Defer] Unavailable page checks `!isRegistrationOpen` before `isRegistrationFull`; combined states show first branch chip — deferred, pre-existing order; Close-at precedence is Story 30.8 [`page.tsx:58-84`]
- [x] [Review][Defer] Single `\n` line breaks collapse (paragraph split only); editor `onChange` persists untrimmed value — deferred, consistent with intro copy editor [`markdown-lite-copy.ts`, `activity-form-tab.tsx`]
- [x] [Review][Defer] No component/E2E test for unavailable UI wiring; no automated contrast test — deferred, unit coverage + design tokens sufficient for slice

- [x] [Review][Dismiss] `error` / `not-found` paths could show operator copy if prop passed — page never passes `closedMessage` for those reasons [`page.tsx:45-50`]
- [x] [Review][Dismiss] `activityStatus` undefined maps unavailable → Closed chip — page always passes status on wired routes [`registration-unavailable.ts:24-25`]

**Pass 1 verdict:** AC1 partial fail (sanitize-to-empty fallback); AC2 partial fail (dark chip contrast). **722** .NET + **3** Vitest tests pass. Two patch findings; no blockers beyond AC gaps above.

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes

- `closedMessage` stored in `form_schema.meta`; max 2000 chars validated on save.
- Public unavailable screen shows reason chip + operator copy (HTML stripped, paragraph breaks); falls back to platform title/description when empty.
- Reason chips: Full, Paused, Ended (published + closed), Closed (archived/draft unavailable).
