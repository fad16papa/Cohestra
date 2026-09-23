---
id: 38.3
key: 38-3-e2e-tenant-and-theme-isolation
title: E2E tenant and theme isolation
status: review
epic: 38
created: 2026-09-23
baseline_commit: 01a139df0921ea670e964c8b4f5e9a18e257e687
readiness: ready
---

# Story 38.3: E2E tenant and theme isolation

Status: review

## Story

As a developer running `E2E_LIVE_STACK=1`,
I want every live Playwright spec to own or deterministically reset its mutable tenant/activity/theme/plan state,
so that Form Studio columns, registration success copy, and responsive registration pass independently, in either order, and under supported parallelism.

## Acceptance Criteria

1. The two-column Form Studio test receives the intended entitled (Core/Pro) tenant and the Two-column control is enabled.
2. Registration-success-copy can exercise a Conversational-capable form path without changing the activity used by responsive registration tests.
3. All previously skipped responsive registration cases execute normally (Join visible; no skip-for-dirty-theme).
4. Each formerly failing spec passes alone.
5. The affected specs pass together in both orders.
6. The affected group passes on repeated runs.
7. The affected group passes with supported Playwright parallelism (`fullyParallel` / default workers; do not disable parallelism globally).
8. Full `E2E_LIVE_STACK=1` suite passes.
9. Canonical Marina / cinema / demo seed records are unchanged after the suite.
10. Basic / Core / Pro entitlement fixtures return their intended plan in both API and UI.
11. A failed test followed by another affected test does not contaminate the second test.
12. No new production-only code path, reset endpoint, or security bypass.

## Readiness

Phase 1 ACCEPTED. Story 38.2 ACCEPTED/CLOSED at `01a139df`. Investigation below is complete. **Ready to implement.** No open PO decision. Isolation is test-only.

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

## Investigation

### Failure 1 — Two-column disabled on the intended Pro tenant

`form-studio-columns-36-4.spec.ts` Pro checkpoint uses `loginOperatorSession` (default tenant, Plan=Pro) and `demo-runners-draft-clinic`.

A **separate** describe in the same file, `Story 36.4 — Basic plan UI lock`, runs:

```
UPDATE tenants SET "Plan" = 0 WHERE "Slug" = 'default';
```

and restores Plan=2 in `finally`. Playwright `fullyParallel: true` and non-CI `workers` > 1, so the Basic SQL flip races the Pro checkpoint. The Pro operator then loads Form Studio against a temporarily Basic default tenant and sees “Two-column rows require Core or Pro”.

This is a **shared tenant plan row**, not a frontend gate bug and not a missing Pro entitlement.

### Failure 2 — Marina stays Conversational; responsive Join skipped

Writers of shared `demo-marina-social-meetup`:

- `form-experience-epic-35.spec.ts` calls `applyRegistrationTheme` for every Epic 35 experience, including `flow: conversational`, and does not restore Centered/single-page.
- `form-studio-design-36-5.spec.ts` mutates `demo-wellness-morning-yoga` the same way.

`registration-success-copy.spec.ts` does **not** write theme. It only submits against `resolvePublishedE2eSlug(..., marina)`. After Epic 35, marina is Conversational: Full name + “Join activity” are not on the first paint. Success-copy then fails or appears to “leave” marina Conversational.

`registration-responsive.spec.ts` reads the same marina slug and **converts missing Join into `test.skip`**. That is order-dependent skip, not a product defect.

### Shared-state inventory

| Record | Used by | Mutation |
| --- | --- | --- |
| Tenant `default` Plan | All operator specs; **SQL flipped by 36-4 Basic test** | Plan 0 ↔ 2 |
| `demo-marina-social-meetup` | Epic 35, success-copy, responsive | Theme/flow/layout |
| `demo-wellness-morning-yoga` | 36.5 public design | Theme/style/tokens |
| `demo-runners-draft-clinic` | 36.4 checkpoint, 36.6 preview, 36.7 domain | Form schema / composition |
| Timestamped `e2e-cols-*` / `e2e-365-*` | 36.4 / 36.5-checkpoint | Created, never archived |
| Tenant `px2-basic` | 38.2 Website only | Plan Basic (do not flip) |
| Playwright storageState | none configured | No cookie leak |
| Redis public activity cache | publish/theme PUT | Invalidated by existing API |

Tenant identity today: JWT + `Host` header. `applyRegistrationTheme` / `fetchActivity` hardcode `Host: default.localhost`. Browser `tenantWebBase()` rewrites localhost → `default.localhost`.

### Chosen isolation model

Prefer order: (1) dedicated deterministic fixture per scenario/worker, (2) existing admin API factory, (3) explicit reset owned by the test, (4) idempotent seed restoration only if a spec still reads a canonical slug (it must not).

- `provisionOwnedActivity({ ownerKey, tenant, theme, schema, publish })` creates or resets `e2e-{ownerKey}` via admin API.
- Pro/Core tests stay on default (Pro) catalog; they never SQL-update Plan.
- Basic Two-column lock uses `px2-basic` (or a catalog provisioned on that tenant). Never mutate `default.Plan`.
- Success-copy, responsive, Epic 35, 36.5 each own an activity. Conversational is applied only to the Epic 35 owned activity.
- 36.4 / 36.6 / 36.7 own drafts; do not write `demo-runners-draft-clinic`.
- Cleanup: reset-in-place (bounded one row per ownerKey+worker). Archive leftover timestamped `e2e-*` created by this story’s old helper if found. Tenant-scoped only.
- Remove skip-on-missing-Join. Keep only `E2E_LIVE_STACK` environment skips.
- Do not add a production reset endpoint.
- Do not disable `fullyParallel`.

### Rejected alternatives

| Alternative | Why rejected |
| --- | --- |
| Global `workers: 1` | Hides the race; forbidden unless unavoidable external constraint |
| Restore marina after Epic 35 | Still uses canonical demo as mutable storage; fails if a test crashes |
| SQL plan flip + finally | Parallel-unsafe; contaminates every default-tenant spec |
| Skip when Join missing | Converts contamination into a green skip |
| Production reset API | Security bypass; out of scope |

## Tasks / Subtasks

- [x] Owned-fixture helper: tenant host/login, catalog ensure, create-or-reset activity, theme/schema/publish, archive leftovers, canonical snapshot
- [x] Parameterize `Host` / web base in registration e2e helpers (no hardcoded default-only writes for Basic)
- [x] 36.4: Pro checkpoint on owned Pro draft; Basic lock on `px2-basic`; delete SQL plan flip
- [x] Success-copy + responsive: owned single-page published activity; remove dirty-theme skips
- [x] Epic 35 + 36.5: owned activities (never marina/yoga)
- [x] 36.6 + 36.7: owned drafts (never runners clinic)
- [x] 36.5-checkpoint: reuse owned provision (already creates; stop unbounded timestamps)
- [x] Isolation spec: Basic/Pro plan API+UI; canonical demo unchanged
- [x] Unit tests for fixture data/host helpers
- [x] Solo / reversed / repeat / parallel / full live suite
- [x] Docker smoke Basic fixture: Development-only `E2eEntitlementFixtureSeeder` under `DemoDataSeed` (no production seeder; no SQL plan flip)

## Non-goals

Do not begin 38.4. Do not change Epics 35–37 product behavior. Do not unlock Basic two-column. Do not add production seeders or reset endpoints. Do not weaken entitlement enforcement. Do not disable parallelism globally.

## Dev Notes

- New: `web/e2e/helpers/e2e-owned-fixtures.ts`, `web/e2e/helpers/owned-fixture-data.ts`
- Update: `web/e2e/helpers/registration-e2e-api.ts` and the live specs listed above
- Evidence: `_bmad-output/planning-artifacts/evidence/px2-38-3/`
- `px2-basic` currently has 0 communities/categories; helper must create them via existing admin POST (Basic limit 1 community).

## Dev Agent Record

### Agent Model Used

Grok 4.6

### Debug Log References

- Full live suite: 74 passed / 0 skipped / 0 failed (`--workers=3`)
- Affected group reversed + forward + `--repeat-each=2 --workers=3`: all passed
- Evidence: `_bmad-output/planning-artifacts/evidence/px2-38-3/checks.md`

### Completion Notes List

- Root cause 1: 36.4 Basic test SQL-flipped `default.Plan` under `fullyParallel`.
- Root cause 2: Epic 35 / 36.5 wrote Conversational/theme onto shared marina/yoga; responsive skipped missing Join; success-copy only read marina.
- Fix: owned `e2e-{ownerKey}-w{worker}` create-or-reset via admin API; Basic lock on `px2-basic`; no production reset endpoint.
- CI Docker smoke had no `px2-basic` (OperatorSeed + DemoDataSeed only seed `default`). Platform `POST /tenants` does not create a loginable admin. `E2eEntitlementFixtureSeeder` (gated by `DemoDataSeed:Enabled`, which Production rejects) provisions `px2-basic` / `px2-basic-admin@cohestra.local`.

### File List

- `_bmad-output/implementation-artifacts/38-3-e2e-tenant-and-theme-isolation.md`
- `_bmad-output/implementation-artifacts/38-2-basic-website-entitlement-api-behavior.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/evidence/px2-38-3/checks.md`
- `web/e2e/helpers/owned-fixture-data.ts`
- `web/e2e/helpers/owned-fixture-data.test.ts`
- `web/e2e/helpers/e2e-owned-fixtures.ts`
- `web/e2e/helpers/registration-e2e-api.ts`
- `web/e2e/isolation-38-3.spec.ts`
- `web/e2e/form-studio-columns-36-4.spec.ts`
- `web/e2e/registration-success-copy.spec.ts`
- `web/e2e/registration-responsive.spec.ts`
- `web/e2e/form-experience-epic-35.spec.ts`
- `web/e2e/form-studio-design-36-5.spec.ts`
- `web/e2e/form-studio-design-36-5-checkpoint.spec.ts`
- `web/e2e/form-studio-preview-36-6.spec.ts`
- `web/e2e/form-studio-domain-36-7.spec.ts`
- `web/playwright.config.ts`
- `web/vitest.config.ts`
- `src/Infrastructure/Seed/E2eEntitlementFixtureSeeder.cs`
- `src/Infrastructure.Tests/Seed/E2eEntitlementFixtureSeederTests.cs`
- `src/Infrastructure.Tests/Auth/ProductionSecurityValidatorTests.cs`
- `src/Infrastructure/Auth/OperatorSeeder.cs`
- `src/Api/Program.cs`

### Senior Developer Review (AI)

Date: 2026-09-23. HEAD reviewed: `1445cacd` then review-patch. Independent layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor (`bmad-code-review`). Model: Grok 4.6. Mandatory Code Review Loop in force.

### Review Findings

- [x] [Review][Patch] `workerIndex` required; 36.6 / 36.7 / Epic 35 conversational no longer default to `-w0`
- [x] [Review][Patch] Isolation plan asserts exact `Pro` / `Basic`, not `/pro/i` (Profile false pass)
- [x] [Review][Patch] px2-basic catalog create retries list on conflict
- [x] [Review][Patch] `findActivityIdBySlug` searches by slug before paging
- [x] [Review][Defer] Canonical snapshot is same-test double-read — suite proof is post-run DB + no writers
- [x] [Review][Defer] `archiveOwnedActivity` unused; reset-in-place is the cleanup path
- [x] [Review][Defer] `resolvePublishedE2eSlug` leftover helper — unused by live specs
- [x] [Review][Patch] Seeder must not reset an existing account password or unsuspend/unarchive `px2-basic`
- [x] [Review][Dismiss] `loginOwnedTenant` hint does not authenticate against `default` (Host is the fixture slug)
- [x] [Review][Dismiss] Acceptance Auditor: AC 1–12 met; no production reset path

### Change Log

- 2026-09-23: Created Story 38.3 after 38.2 merge `01a139df`.
- 2026-09-23: Implemented owned-fixture isolation; live suite 74 passed / 0 skipped.
- 2026-09-23: Review patches — required workerIndex, exact plan asserts, catalog race, slug search.
- 2026-09-23: CI Docker smoke 401 — Development-only px2-basic fixture seeder under DemoDataSeed.
- 2026-09-23: Review patch — create-if-absent admin; do not reset colliding passwords or unsuspend existing tenants.
