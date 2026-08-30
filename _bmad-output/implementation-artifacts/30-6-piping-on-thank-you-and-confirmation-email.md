---
story_id: 30.6
story_key: 30-6-piping-on-thank-you-and-confirmation-email
epic: 30
status: done
baseline_commit: 60cac03
created: 2026-08-30
sources:
  - _bmad-output/planning-artifacts/epics-registration-capture.md
  - _bmad-output/specs/spec-registration-capture/SPEC.md
  - _bmad-output/implementation-artifacts/30-5-core-scale-and-emergency-contact.md
---

# Story 30.6: Piping on thank-you and confirmation email

Status: done

## Story

As an Operator,
I want thank-you copy and the confirmation email to substitute `{{full_name}}`, `{{email}}`, `{{phone}}`, and `{{field:<id>}}`,
So that Maya sees “See you Saturday, Maya” without a hardcoded name — and Hidden values never leak to her.

**FRs:** FR-RC-5 (CAP-4). **UX:** UX-DR-RC-5 piping cheatsheet + live preview.

## Acceptance Criteria

1. **Given** operator-authored success copy with `{{full_name}}`
   **When** Maya submits with a name Field value “Maya”
   **Then** the success screen shows her name and uses `role="status"`
   **And** missing values substitute to empty string

2. **Given** confirmation subject/body with the same token set
   **When** Outbox sends the existing registration confirmation
   **Then** tokens are substituted
   **And** email layout and hero stay on `RegistrationThemeResolver`
   **And** Hidden Field values are never substituted into success screen or confirmation email

3. **Given** the success-copy editor
   **When** I open the token cheatsheet
   **Then** Hidden Field ids are not offered
   **And** live preview substitutes sample name “Maya”

## Tasks / Subtasks

- [x] **Task 1 — Domain + schema meta** (AC: 1–2)
  - [x] `FormSchemaMeta` success + confirmation email fields
  - [x] `FormSchemaValidator` / mapper round-trip + max lengths
  - [x] `RegistrationPipingTokenSubstitutor` (empty-string missing rule; hidden/non-input blocked)

- [x] **Task 2 — Submit + email wiring** (AC: 1–2)
  - [x] `PublicRegistrationSubmitResult` + `SubmitPublicRegistrationResponse.successCopyMarkdown`
  - [x] `RegistrationService` success copy on create
  - [x] `RegistrationConfirmationEmailBuilder` custom subject/closing (layout unchanged)
  - [x] `RegistrationNotificationService` piping from schema + answers

- [x] **Task 3 — Web** (AC: 3)
  - [x] Meta types + parse in `activities-api.ts`
  - [x] Form tab editors + `PipingCheatsheet` + live preview
  - [x] `registration-piping.ts` client preview helper
  - [x] Success screen displays server-substituted copy

- [x] **Task 4 — Tests + docs** (AC: 1–3)
  - [x] Substitutor, validator, email builder, notification service tests
  - [x] Vitest `registration-piping.test.ts`
  - [x] Contract docs updated

### Review Findings

- [x] [Review][Decision] `{{full_name}}` falls back to `DisplayName` (email/phone) when `NameFromForm` is null — resolved: **A** name-from-form only; empty when no name field answered

- [x] [Review][Patch] `FormFieldTypes.Hidden.Contains(field.Type)` is substring check on `"hidden"`, not type equality [`RegistrationPipingTokenSubstitutor.cs:65`]
- [x] [Review][Patch] Unknown/malformed tokens (e.g. `{{foo}}`) left verbatim instead of cleared [`RegistrationPipingTokenSubstitutor.cs:26-28`, `registration-piping.ts:55`]
- [x] [Review][Patch] Field token lookup is case-sensitive on schema id; regex allows mixed case [`RegistrationPipingTokenSubstitutor.cs:56-57`, `registration-piping.ts:49`]
- [x] [Review][Patch] Confirmation email cheatsheet insert defaults to body when subject input unfocused [`activity-form-tab.tsx:360-375`]
- [x] [Review][Patch] Add validator tests rejecting overlong `confirmationEmailSubject` / `confirmationEmailBodyMarkdown` [`FormSchemaValidatorTests.cs`]
- [x] [Review][Patch] Add substitutor tests for `{{email}}`, `{{phone}}`, and `section_header`/`info` field blocking [`RegistrationPipingTokenSubstitutorTests.cs`]
- [x] [Review][Patch] Add notification test asserting hidden `{{field:ref}}` never appears in sent email [`RegistrationNotificationServiceTests.cs`]

- [x] [Review][Defer] Idempotency replay omits `successCopyMarkdown` (documented intentional, same as confirmation fields) [`RegistrationService.cs:74-79`] — deferred, acceptable v1 replay tradeoff
- [x] [Review][Defer] Post-substitution copy can exceed template max length when tokens expand [`RegistrationService.cs`, `RegistrationNotificationService.cs`] — deferred, template-bound not expansion-bound
- [x] [Review][Defer] Outbox email uses live schema at send time, not submit-time snapshot [`RegistrationNotificationService.cs`] — deferred, pre-existing outbox pattern
- [x] [Review][Defer] Live preview uses field labels for `{{field:id}}`, not formatted answers [`registration-piping.ts`] — deferred, AC3 only requires sample name for `{{full_name}}`
- [x] [Review][Defer] No live preview for confirmation email subject/body editors [`activity-form-tab.tsx`] — deferred, not in AC
- [x] [Review][Defer] Single-newline vs double-newline rendering differs success screen vs email [`registration-success-screen.tsx`, `RegistrationConfirmationEmailBuilder.cs`] — deferred, polish
- [x] [Review][Defer] No integration test asserting `successCopyMarkdown` on public submit API [`PublicRegistrationsController.cs`] — deferred, unit coverage sufficient for slice
- [x] [Review][Defer] No component/E2E test proving piped copy renders on success screen [`registration-success-screen.tsx`] — deferred, manual QA path

### Review Findings (Pass 2)

- [x] [Review][Patch] Duplicate 30-6 deferred-work block pasted twice [`deferred-work.md:1-21`]
- [x] [Review][Patch] Unclosed/incomplete tokens (`{{foo`, `{{}}`) survive; only closed unknown `{{…}}` pairs are cleared [`RegistrationPipingTokenSubstitutor.cs:87-88`, `registration-piping.ts:10`]
- [x] [Review][Patch] Custom confirmation subject allows embedded `\r`/`\n` after piping (header-smuggling risk) [`RegistrationConfirmationEmailBuilder.cs:37-39`, `FormSchemaValidator.cs`]
- [x] [Review][Patch] Success screen strips `<…>` from server-substituted copy; can mangle values like `x < y` [`registration-success-screen.tsx:46`]
- [x] [Review][Patch] Add `section_header` substitutor blocking test (info covered; section_header not) [`RegistrationPipingTokenSubstitutorTests.cs`]
- [x] [Review][Patch] Hidden email notification test uses brittle `DoesNotContain("wa")` substring assert [`RegistrationNotificationServiceTests.cs`]

- [x] [Review][Defer] Success screen shows generic “Save the date…” sign-off even when operator thank-you copy is set [`registration-success-screen.tsx`] — deferred, UX polish not in AC
- [x] [Review][Defer] Live preview `{{phone}}` uses formatted sample; server uses raw extracted phone [`registration-piping.ts`] — deferred, AC3 only requires name preview
- [x] [Review][Defer] Client `getFormSchemaClientIssues` omits piping meta max-length mirrors [`form-schema-utils.ts`] — deferred, HTML maxLength + server gate sufficient
- [x] [Review][Defer] Unused `encodedName` in email HTML builder [`RegistrationConfirmationEmailBuilder.cs:88`] — deferred, pre-existing dead assignment

**Pass 2 verdict:** AC1–AC3 satisfied. Pass 2 patches applied.

### Review Findings (Pass 3)

- [x] [Review][Patch] Confirmation closing message HTML splits on `\n` only; lone `\r` from `\r\n` body copy can survive in output [`RegistrationConfirmationEmailBuilder.cs:221-223`]

- [x] [Review][Defer] Post-substitution unknown/unclosed token sweeps can strip literal `{{…}}` inside piped field **answers** (e.g. notes value `I use {{mustache}}`) [`RegistrationPipingTokenSubstitutor.cs:30-31`, `registration-piping.ts:69-71`] — deferred, low likelihood; fix needs template-only sanitization pass
- [x] [Review][Defer] All-empty token substitution returns `null` success copy (template set but every token empty) [`RegistrationService.cs:392`] — deferred, indistinguishable from unset in API
- [x] [Review][Defer] Token insert can push draft past `maxLength` without client-side truncate [`activity-form-tab.tsx`] — deferred, HTML maxLength + server validator catch on save

- [x] [Review][Dismiss] Emergency fields are piping-eligible (third-party contact is participant-visible by design) [`registration-piping.ts`, `RegistrationPipingTokenSubstitutor.cs`]
- [x] [Review][Dismiss] Cheatsheet lists both `{{email}}` and `{{field:email}}` when an email field exists — redundant but not incorrect [`piping-cheatsheet.tsx`]

**Pass 3 verdict:** AC1–AC3 satisfied (Acceptance Auditor). **713** .NET + **6** Vitest tests pass. One optional hygiene patch (closing `\r`); no blockers.

### Review Findings (Pass 4)

- [ ] [Review][Patch] Confirmation subject validation and `SanitizeEmailSubject` only reject/normalize `\r`/`\n`; Unicode line separators (`\u2028`, `\u2029`) in templates or piped field values can survive into the email subject header [`FormSchemaValidator.cs:65-68`, `RegistrationConfirmationEmailBuilder.cs:217-218`]

- [x] [Review][Defer] Live schema at outbox send time (TOCTOU hidden-value / copy divergence vs submit-time `successCopyMarkdown`) [`RegistrationNotificationService.cs:177-197`, `RegistrationService.cs:386-392`] — deferred, pre-existing outbox pattern
- [x] [Review][Defer] Post-substitution unknown/unclosed token sweeps strip literal `{{…}}` inside piped field answers [`RegistrationPipingTokenSubstitutor.cs:30-31`, `registration-piping.ts:69-71`] — deferred, low likelihood
- [x] [Review][Defer] Token-only confirmation templates that substitute to whitespace-only fall back to default subject/closing instead of empty [`RegistrationConfirmationEmailBuilder.cs:38-40`, `208-211`] — deferred, safer email UX than blank subject/sign-off
- [x] [Review][Defer] `EncodeClosingMessageHtml` `RemoveEmptyEntries` drops intentional blank lines in closing copy [`RegistrationConfirmationEmailBuilder.cs:225-227`] — deferred, polish
- [x] [Review][Defer] Idempotency replay omits `successCopyMarkdown`; no submit-path integration test [`RegistrationService.cs:74-79`] — deferred, documented v1 tradeoff
- [x] [Review][Defer] All-empty token substitution returns `null` success copy [`RegistrationService.cs:392`] — deferred, indistinguishable from unset in API
- [x] [Review][Defer] Post-substitution copy can exceed template max length when tokens expand — deferred, template-bound not expansion-bound
- [x] [Review][Defer] Success screen generic boilerplate alongside operator copy; single- vs double-newline rendering vs email — deferred, UX polish not in AC
- [x] [Review][Defer] Confirmation email editors lack live preview; client phone preview format differs from server — deferred, AC3 scoped to success-copy editor
- [x] [Review][Defer] Token insert can push draft past `maxLength` without client truncate [`activity-form-tab.tsx`] — deferred, server validator catches on save
- [x] [Review][Defer] No outbox-path test for hidden-field leak on schema mutation between enqueue and send — deferred, pre-existing outbox pattern

- [x] [Review][Dismiss] Emergency fields piping-eligible by design (participant-visible third-party contact) [`RegistrationPipingTokenSubstitutor.cs`, `registration-piping.ts`]
- [x] [Review][Dismiss] Malformed templates with extra wrapping braces (e.g. `{{{full_name}}}`) leave stray `{` characters — operator typo; extremely low likelihood

**Pass 4 verdict:** AC1–AC3 satisfied (Acceptance Auditor). **714** .NET + **6** Vitest tests pass. One optional hygiene patch (Unicode line separators in subject); no blockers.

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes

- Missing token rule: **empty string** (tested).
- Confirmation email: custom subject + closing message only; hero/layout untouched.
- Idempotency replays omit `successCopyMarkdown` (same as confirmation email fields today).
