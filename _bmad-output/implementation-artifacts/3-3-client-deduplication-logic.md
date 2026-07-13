---
baseline_commit: 84b22b6
---

# Story 3.3: Client Deduplication Logic

Status: done

## Story

As the platform,
I want to match registrations to existing Clients by normalized phone and email,
So that Elena does not create duplicate records when registering for multiple activities.

## Acceptance Criteria

1. **AC-3.3.1 — E.164 phone dedup (FR-6)**
   - **Given** ATDD red-phase tests covering the dedup matrix
   - **When** a registration arrives with phone matching an existing Client (E.164 normalized, +63 default)
   - **Then** the existing Client is updated, not duplicated
   - **And** a new distinct Registration record is still created

2. **AC-3.3.2 — Merge-suspect flag (FR-6)**
   - **Given** phone matches but email conflicts across records
   - **When** dedup runs
   - **Then** Client is flagged merge-suspect only; email is not overwritten

## Tasks / Subtasks

- [x] **Task 1: ATDD dedup matrix** (AC: 3.3.1, Murat gate)
  - [x] `Infrastructure.Tests` with phone normalization + dedup scenario tests
  - [x] Tests pass after implementation

- [x] **Task 2: E.164 normalization (+63 default)** (AC: 3.3.1)
  - [x] `ClientContactNormalizer.NormalizePhone` — PH local formats → `+639…`
  - [x] Used by `ClientProfileExtractor` for dedup keys

- [x] **Task 3: Dedup service + merge-suspect** (AC: 3.3.1, 3.3.2)
  - [x] `ClientDeduplicationService` — phone match priority, then email
  - [x] `Client.IsMergeSuspect` column + migration
  - [x] Partial unique indexes on normalized phone/email
  - [x] Email conflict on phone match flags merge-suspect without overwriting email

- [x] **Task 4: Verify build + tests** (AC: all)
  - [x] `dotnet build`, `dotnet test`

## Dev Notes

- Story 3.9 adds merge-suspect banner UI; this story flags only
- Registration ingestion still creates a new Registration per submit (Story 3.1)
- Resolves deferred items from Story 3.1 review (dedup constraints, merge-suspect on email conflict)

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- E.164 normalization with +63 default for Philippine mobile formats
- Dedicated dedup service with phone-first matching and merge-suspect on contact conflicts
- ATDD test matrix in `Infrastructure.Tests` (17 tests)
- Review pass 1 patches: cross-client email ownership guard, split phone/email match merge-suspect

### File List

- `src/Domain/Clients/Client.cs`
- `src/Infrastructure/Registrations/ClientContactNormalizer.cs`
- `src/Infrastructure/Registrations/ClientDeduplicationService.cs`
- `src/Infrastructure/Registrations/ClientProfileExtractor.cs`
- `src/Infrastructure/Registrations/RegistrationService.cs`
- `src/Infrastructure/Persistence/Configurations/ClientConfiguration.cs`
- `src/Infrastructure/Persistence/Migrations/*AddClientMergeSuspectAndUniqueContacts*`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Infrastructure/Infrastructure.csproj`
- `src/Infrastructure.Tests/Infrastructure.Tests.csproj`
- `src/Infrastructure.Tests/Registrations/ClientContactNormalizerTests.cs`
- `src/Infrastructure.Tests/Registrations/ClientDeduplicationServiceTests.cs`
- `LeadGenerationCrm.sln`

### Change Log

- 2026-06-16: Story 3.3 implemented — E.164 dedup, merge-suspect flag, ATDD test matrix
- 2026-06-16: Review patches applied — cross-client contact collision guard, split-match merge-suspect

### Review Findings

- [x] [Review][Patch] Phone match can assign email already owned by another Client — unique index violation at save [`ClientDeduplicationService.cs:97-107`]
- [x] [Review][Patch] Phone and email match different Clients but no merge-suspect flag [`ClientDeduplicationService.cs:33-52`]
- [x] [Review][Defer] No integration test asserting distinct Registration per deduped submit [`RegistrationService.cs:182-192`] — deferred, covered by 3.1 flow; add with registration integration tests later
- [x] [Review][Defer] Email-match + conflicting phone path untested [`ClientDeduplicationService.cs:110-114`] — deferred, symmetric edge case; add test when patching cross-client logic

### Re-review (2026-06-16, pass 3)

✅ **Clean review — all layers passed.**

- Pass 1 patches verified: cross-client email ownership guard prevents unique-index 500; split phone/email match sets `IsMergeSuspect` on phone client
- New tests assert save succeeds after cross-client email collision and split-match scenarios
- `RegistrationService` still creates a distinct `Registration` per submit after dedup (AC-3.3.1)
- 17/17 `Infrastructure.Tests` pass; no new patch or decision-needed findings
- Deferred items unchanged (registration integration test, email-match + cross-client phone unit test, concurrent-create race)
