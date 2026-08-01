---
epic: 20
story: 1
status: done
baseline_commit: e3e98c5
---

# Story 20.1: Optional max registrants per activity

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Story

As a **Tenant Admin**,
I want **to optionally set a maximum number of registrants when creating or editing an activity**,
So that **registration closes automatically when the event reaches capacity without breaking unlimited events**.

## Context

- PRD lists "Capacity + waitlist" as a natural extension of published activities ([prd-cohestra-enterprise-2026-07-15/prd.md](../../planning-artifacts/prds/prd-cohestra-enterprise-2026-07-15/prd.md)).
- Today: `Activity` has no capacity field; `IsRegistrationOpen` on public API means **published only**; `RegistrationService.SubmitCoreAsync` inserts without counting.
- **Out of scope v1:** waitlist, auto-unpublish, denormalized counters, plan-limit changes.
- **Independent of Epic 19** (production launch) — additive product feature on `main`.

## Acceptance Criteria

1. **Given** an admin creates or updates an activity  
   **When** they leave max registrants blank  
   **Then** the activity remains **unlimited** (same behavior as all existing activities)

2. **Given** an admin sets max registrants to a positive integer `N`  
   **When** the activity is saved  
   **Then** `MaxRegistrants = N` is persisted  
   **And** validation rejects `N < 1`  
   **And** validation rejects lowering cap below current registration count on update

3. **Given** a published activity with `MaxRegistrants = N` and exactly `N` registrations  
   **When** a **new** client submits registration  
   **Then** API returns **409 Conflict** with ProblemDetails  
   **And** `errorCode` extension is `activity_full`  
   **And** detail is user-friendly (e.g. "This activity is full.")

4. **Given** the same activity at capacity  
   **When** an **already registered** client retries submit  
   **Then** existing **409 Already registered** behavior is unchanged (duplicate check before capacity)

5. **Given** a published activity at capacity  
   **When** public page loads `GET /api/v1/public/activities/{slug}`  
   **Then** response includes `isRegistrationFull: true`, `registrationCount`, and optional `maxRegistrants`  
   **And** `isRegistrationOpen` remains `true` when status is published (do **not** overload published semantics)

6. **Given** public page when `isRegistrationFull` is true  
   **When** user visits `/register/{slug}`  
   **Then** registration form is **not** shown  
   **And** user sees clear copy that the event is full (extend `PublicRegistrationUnavailable` or equivalent)

7. **Given** two concurrent submits when one spot remains  
   **When** both pass validation  
   **Then** exactly **one** succeeds (201) and the other gets 409 `activity_full`  
   **And** enforcement uses DB transaction with row lock on activity (no count-then-insert race)

8. **Given** a successful registration changes count toward capacity  
   **When** save completes  
   **Then** public activity Redis cache for that slug is invalidated/refreshed so `isRegistrationFull` updates on next GET

9. **Given** integration test stack (Postgres + Redis)  
   **When** capacity tests run  
   **Then** at least: submit until full → 409; concurrent last-spot test passes

10. **Given** `docs/contracts/public-registration-v1.md`  
    **When** story ships  
    **Then** contract documents new 409 `activity_full` case (additive extension)

## Tasks / Subtasks

- [x] **Task 1 — Domain & migration** (AC: 1, 2)
  - [x] Add `int? MaxRegistrants` to `Activity` entity
  - [x] Map column `max_registrants` nullable in `ActivityConfiguration`
  - [x] EF migration; existing rows stay `NULL` (unlimited)

- [x] **Task 2 — Admin API & validation** (AC: 1, 2)
  - [x] Extend `CreateActivityRequest`, `UpdateActivityRequest`, `ActivityResponse` with `MaxRegistrants?`
  - [x] Validate in `ActivitiesController` / `ActivityService`: `>= 1` if set; update cannot set below `RegistrationCount`
  - [x] Wire create + update paths; sync public cache on update when published

- [x] **Task 3 — Public API** (AC: 5, 8)
  - [x] Extend `PublicActivityResponse`: `MaxRegistrants?`, `RegistrationCount`, `IsRegistrationFull`
  - [x] In `GetPublicBySlugAsync` / `MapToPublicResponse`: count registrations when published; compute `IsRegistrationFull`
  - [x] **Cache strategy:** include count/full in cached payload **and** refresh cache after registration + after cap change (call `SyncPublicActivityCacheAsync` from registration success path)

- [x] **Task 4 — Registration enforcement** (AC: 3, 4, 7, 8)
  - [x] Add `IsActivityFull` to `PublicRegistrationSubmitResult` + factory `ActivityFull()`
  - [x] In `SubmitCoreAsync`: after duplicate-client check, inside transaction:
    - Load activity with `FOR UPDATE` (EF: transaction + reload or raw SQL lock)
    - Count registrations for `activity.Id`
    - If `MaxRegistrants` has value and `count >= MaxRegistrants` → return ActivityFull (unless duplicate path already returned)
    - Insert registration; commit
  - [x] Map to 409 in `PublicRegistrationsController` with `errorCode: activity_full`
  - [x] After successful save: invalidate/sync public activity cache for slug

- [x] **Task 5 — Admin UI** (AC: 1, 2)
  - [x] `create-activity-form.tsx`: optional number input "Max registrants" (blank = unlimited), helper text
  - [x] Activity detail overview (or edit panel): same field editable; show `{registrationCount}/{maxRegistrants}` when set
  - [x] `activities-api.ts` types + create/update payloads

- [x] **Task 6 — Public UI** (AC: 5, 6)
  - [x] `public-registration-api.ts`: parse new fields
  - [x] `register/[slug]/page.tsx`: if `isRegistrationFull` → full state (new reason `full` on unavailable component)
  - [x] `registration-form.tsx`: handle 409 `activity_full` from submit with friendly message

- [x] **Task 7 — Tests & docs** (AC: 9, 10)
  - [x] Integration: `PublicRegistrationIntegrationTests` or new file — fill to cap, next submit 409
  - [x] Integration: parallel last-spot (two tasks, one wins)
  - [x] Unit: admin validation cannot set cap below count
  - [x] Update `docs/contracts/public-registration-v1.md`

## Dev Notes

### Do NOT break

| Behavior | Location | Preserve |
|----------|----------|----------|
| Tenant monthly plan cap | `TenantAccessService` / controller 403 | Runs **before** activity cap |
| Per-client dedup | Unique `(ClientId, ActivityId)` | Check **before** capacity |
| Idempotency replay | `RegistrationService` Redis store | Only cache **201** successes, not 409 full |
| `isRegistrationOpen` | `MapToPublicResponse` | Still **published status only** — add separate `isRegistrationFull` |
| Draft/archived public 404 | Existing public activity rules | Unchanged |

### Enforcement order in `SubmitCoreAsync`

1. Load published activity by slug  
2. Validate answers  
3. Find/create client  
4. Duplicate registration check → 409 already registered  
5. **NEW:** Transaction + lock activity → count → cap check → insert  
6. Confirmation email (best-effort)  
7. Idempotency store + cache sync  

### Race condition (required)

Current code inserts without lock ([RegistrationService.cs:251-268](../../src/Infrastructure/Registrations/RegistrationService.cs)). Capacity **requires** transactional enforcement:

```csharp
await using var tx = await dbContext.Database.BeginTransactionAsync(cancellationToken);
// Reload activity with lock - use ExecuteSqlRaw FOR UPDATE or serializable isolation
var count = await dbContext.Registrations.CountAsync(r => r.ActivityId == activity.Id, cancellationToken);
if (activity.MaxRegistrants is int max && count >= max)
    return ActivityFull();
// insert + SaveChanges + commit
```

Prefer **`FOR UPDATE`** on activity row — matches PostgreSQL stack.

### Public cache invalidation (required)

`GetPublicBySlugAsync` caches `PublicActivityResponse` in Redis ([ActivityService.cs:367-388](../../src/Infrastructure/Activities/ActivityService.cs)). After registration, cached `isRegistrationFull` will be stale unless you:

- Call `SyncPublicActivityCacheAsync` after successful registration (inject `IActivityService` or cache helper into registration path), **or**
- Delete cache key for `(tenantId, slug)` on registration success

`TouchActivityAsync` on controller does **not** refresh activity cache today.

### Admin UX placement

- **Create form:** optional field at bottom before submit ([create-activity-form.tsx](../../web/components/activities/create-activity-form.tsx))
- **Edit:** `UpdateActivityRequest` path on activity detail overview tab
- Label: **Max registrants (optional)** — placeholder empty = unlimited

### Error contract

Mirror existing 409 already registered ([PublicRegistrationsController.cs:94-107](../../src/Api/Controllers/V1/PublicRegistrationsController.cs)):

```json
{
  "title": "Activity full",
  "detail": "This activity is no longer accepting registrations.",
  "status": 409,
  "errorCode": "activity_full"
}
```

### Layer touch list

| Layer | Files |
|-------|-------|
| Domain | `src/Domain/Activities/Activity.cs` |
| EF | `ActivityConfiguration.cs`, new migration |
| Contracts | `CreateActivityRequest`, `UpdateActivityRequest`, `ActivityResponse`, `PublicActivityResponse` |
| Services | `ActivityService.cs`, `RegistrationService.cs` |
| API | `ActivitiesController.cs`, `PublicRegistrationsController.cs` |
| App | `PublicRegistrationSubmitResult.cs` |
| Web admin | `create-activity-form.tsx`, `activities-api.ts`, activity detail overview |
| Web public | `public-registration-api.ts`, `register/[slug]/page.tsx`, `public-registration-unavailable.tsx`, `registration-form.tsx` |
| Docs | `docs/contracts/public-registration-v1.md` |
| Tests | `PublicRegistrationIntegrationTests.cs`, optional `ActivityServiceTests` |

### Testing standards

- Integration tests require Postgres (+ Redis for idempotency if used in test)
- Follow `[Trait("Category", ...)]` patterns from existing registration tests
- Use factory Pro bootstrap if needed (`EnsureDefaultTenantProPlanAsync` per project-context)

### References

- [enterprise-launch-checklist.md](../../docs/deploy/enterprise-launch-checklist.md) — registration flows
- [public-registration-v1.md](../../docs/contracts/public-registration-v1.md) — frozen contract (additive 409)
- [activity-form-schema-v1.md](../../docs/contracts/activity-form-schema-v1.md) — answers validation unchanged
- Epic 18 patterns: ProblemDetails `errorCode` at JSON root — web parsers must read root ([epic-18-retro](../../implementation-artifacts/epic-18-retro-2026-08-01.md))

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Optional `MaxRegistrants` on activities; null = unlimited.
- Public API exposes `isRegistrationFull`, `registrationCount`, `maxRegistrants` without overloading `isRegistrationOpen`.
- Registration enforcement uses `FOR UPDATE` + count inside transaction; 409 `activity_full`.
- Public Redis cache refreshed after registration and admin cap changes.
- Admin UI: create form + capacity panel on activity detail; branding save preserves cap.
- Public UI: full state on register page; submit errors surface ProblemDetails detail.

### File List

- `src/Domain/Activities/Activity.cs`
- `src/Infrastructure/Persistence/Configurations/ActivityConfiguration.cs`
- `src/Infrastructure/Persistence/Migrations/20260801150000_AddActivityMaxRegistrants.cs`
- `src/Infrastructure/Persistence/Migrations/CohestraDbContextModelSnapshot.cs`
- `src/Infrastructure/Activities/ActivityCapacityValidator.cs`
- `src/Infrastructure/Activities/ActivityMapper.cs`
- `src/Infrastructure/Activities/ActivityService.cs`
- `src/Infrastructure/Registrations/RegistrationService.cs`
- `src/Application/Activities/IActivityService.cs`
- `src/Application/Registrations/PublicRegistrationSubmitResult.cs`
- `src/Contracts/Activities/*.cs`
- `src/Api/Controllers/V1/PublicRegistrationsController.cs`
- `web/lib/activities-api.ts`
- `web/lib/public-registration-api.ts`
- `web/components/activities/create-activity-form.tsx`
- `web/components/activities/activity-capacity-panel.tsx`
- `web/components/activities/activity-detail-page-client.tsx`
- `web/components/activities/activity-branding-panel.tsx`
- `web/app/(public)/register/[slug]/page.tsx`
- `web/components/registration/public-registration-unavailable.tsx`
- `docs/contracts/public-registration-v1.md`
- `src/Infrastructure.Tests/Activities/ActivityCapacityValidatorTests.cs`
- `src/Api.IntegrationTests/PublicRegistrationCapacityIntegrationTests.cs`
- `src/Api.IntegrationTests/Infrastructure/IntegrationTestHelpers.cs`

## Change Log

- 2026-08-01: Story 20.1 created — optional max registrants per activity (ready-for-dev).
- 2026-08-01: Story 20.1 implemented — capacity field, enforcement, UI, tests, contract update.
