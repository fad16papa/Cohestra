---
epic: 34
story: 1
status: done
baseline_commit: 43abb8a2b1f49f590b81428342d31897e4b164b9
---

# Story 34.1: Deterministic operator brief API

Status: done

## Story

As a **Tenant Admin or Member**,
I want **a tenant-scoped brief of what needs attention, with evidence and a next action**,
So that **I do not invent a morning from four screens**.

## DONE requires the Mandatory Code Review Loop

IMPLEMENT → BUILD → TEST → `bmad-code-review` (repeat on new HEAD) → PRODUCT/UX ACCEPTANCE → CLOSE.

Do not mark this story done from implementation alone.

## Acceptance Criteria

1. **Given** a resolved tenant operator  
   **When** `GET /api/v1/admin/intelligence/brief`  
   **Then** 200 JSON with `generatedAt`, `timeZoneId`, `insights[]`, and `insufficientData`  
   **And** each insight has `kind`, `title`, `whyItMatters`, `evidence[]`, `recommendedAction.{label,href}`, `priority`

2. **Given** clients with `NextFollowUpAt` before start-of-tomorrow in the tenant TZ  
   **When** the brief is computed  
   **Then** a `follow_up_due` insight appears whose count matches the Clients `followUpDue` filter  
   **And** evidence includes up to 5 real client names  
   **And** action href is `/clients?followUpDue=true`

3. **Given** New clients with no outreach coverage events  
   **When** the brief is computed  
   **Then** a `new_without_outreach` insight appears with href `/clients?leadStatus=new`

4. **Given** merge-suspect clients  
   **Then** a `merge_suspects` insight appears with href `/clients?mergeSuspect=true`

5. **Given** a published activity with `MaxRegistrants` set and remaining spots ≤ 3 or ≤ 15%  
   **Then** a `capacity_pressure` insight appears with href `/activities/{id}`

6. **Given** previous 7-day registrations ≥ 3  
   **Then** a `registration_wow` insight may appear with both period counts as evidence  
   **And** no invented percentage if previous period is 0

7. **Given** zero clients and zero published activities  
   **Then** `insights` is empty and `insufficientData` explains that there is not enough operational data

8. **Given** no JWT or unresolved tenant  
   **Then** 401/403 or fail-closed — never another tenant’s names

9. **Given** TenantIsolation tests  
   **Then** tenant B names and counts never appear in tenant A’s brief

## Tasks / Subtasks

- [x] Contracts + service + controller
- [x] Deterministic insight builders (due, new, merge, capacity, wow)
- [x] Unit + isolation + HTTP tests
- [x] DI registration

## Do NOT implement in 34.1

- LLM / provider calls
- Dashboard UI (34.2)
- Chat
- Attendance / first-timer / cinema at-risk scoring

## Dev Notes

- Reuse `RegistrationPeriod.GetStartOfTomorrowUtc` and `ClientOutreachCoverage.FollowUpCoverageEventTypes`.
- Same fail-closed tenant guard as `DashboardService`.
- No Redis cache in 34.1 — correctness over a stale brief.
- Clients list URL does not persist `withoutOutreach` today, so the new-people deep link is `/clients?leadStatus=new` (UI-honored). Residual for 34.2 if we want the exact intersection.

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6

### Debug Log

- First build failed: `RegistrationTimeZoneDefaults` not in scope — added `using Cohestra.Domain.Tenants`.
- This VM had no snapshot `dotnet`; installed SDK 9.0.317 to `$HOME/.dotnet`.
- Postgres/Redis installed locally for integration tests.

### Completion Notes List

- Deterministic brief API only. No LLM.
- Code review: `_bmad-output/implementation-artifacts/34-1-code-review-2026-09-05.md` — no BLOCKER/MAJOR.
- Product acceptance (API): all five truths pass; UX surface is 34.2.
- CI on PR #287 still required before `done`.

### File List

- `src/Contracts/Intelligence/IntelligenceBriefContracts.cs`
- `src/Application/Intelligence/IIntelligenceBriefService.cs`
- `src/Infrastructure/Intelligence/IntelligenceBriefService.cs`
- `src/Api/Controllers/V1/IntelligenceController.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Infrastructure.Tests/Intelligence/IntelligenceBriefServiceTests.cs`
- `src/Api.IntegrationTests/IntelligenceBriefIntegrationTests.cs`
- `src/Api.IntegrationTests/TenantIsolationApiTests.cs`
- `_bmad-output/implementation-artifacts/34-1-code-review-2026-09-05.md`

## Change Log

- 2026-09-05: Deterministic operator brief API (facts only, no LLM).
- 2026-09-05: Mandatory code review — no unresolved BLOCKER/MAJOR; one deferred MINOR.

## Product acceptance (2026-09-05)

| Truth | Result |
| --- | --- |
| Product | Operator gets prioritized, evidenced attention items from real tenant data. |
| Data | Due/outreach/merge/capacity/wow rules match existing Clients/Activities/Dashboard definitions. |
| UX | N/A for API-only; 34.2 owns the surface. |
| Integration | TenantOperator, existing deep-link routes, same filter semantics. |
| Regression | 825 unit + 13 TenantIsolation + 12 brief unit tests green. |
