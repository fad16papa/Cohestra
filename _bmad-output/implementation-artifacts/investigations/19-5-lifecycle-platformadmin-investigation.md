# Investigation: Story 19.5 UAT PlatformAdmin lifecycle automation

## Hand-off Brief

1. **What happened.** Story 19.5 machine AC is complete for Basic (`picklemania`) and Pro (`creativorare`) on Deploy UAT `39004625819` / main `830adc140d3aa45edd9df70af8664789b25c2296`. The remaining machine AC is tenant lifecycle (suspend → maintenance, archive → 404). No disposable tenant existed, so the prior owner gate was `lifecycle_disposable_tenant`.
2. **Where the case stands.** Owner authorized a dedicated UAT-only PlatformAdmin identity and a bounded lifecycle harness. Existing PlatformAdmin APIs and `PlatformAdminSeeder` are sufficient; a second admin system is not required.
3. **What's needed next.** Implement the opt-in UAT lifecycle job with hard protected-tenant refusals, one-shot seeder bootstrap that does not persist credentials, contract tests, exact-HEAD review, then live UAT execution.

## Case Info

| Field            | Value |
| ---------------- | ----- |
| Ticket           | Story 19.5 lifecycle |
| Date opened      | 2026-10-17 |
| Status           | Concluded (exploration sufficient for implementation) |
| System           | Cohestra UAT (`https://uat.cohestra.app`), GitHub Environment `uat` |
| Evidence sources | Source on `830adc14`, Deploy UAT `39004625819`, PlatformAdmin/tenant APIs |

## Problem Statement

Owner authorization to automate Story 19.5 lifecycle acceptance using a dedicated UAT PlatformAdmin identity. Must not invent a second administration system, must not persist seed passwords on the droplet, must not touch protected tenants (`default`, `picklemania`, `creativorare`), production, or Paddle.

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------ | ----- |
| PlatformAdminSeeder | Available | `src/Infrastructure/Auth/PlatformAdminSeeder.cs` — Enabled=false by default; fail-closed on TenantAdmin collision |
| PlatformAdminSeedSettings | Available | Defaults exist; UAT compose does not inject seed env |
| ProductionSecurityValidator | Available | Blocks Operator/Demo/LoadTest seed in Production; does **not** block PlatformAdminSeed |
| Platform tenant APIs | Available | Create / suspend / reactivate / archive — no membership, no email, no Paddle |
| Public door 15.7 | Available | Suspended web `/` → 200 + "Workspace paused"; Archived web `/` → 404 |
| Deploy UAT workflow | Available | `deploy` → `browser` → `evidence`; `permissions: contents: read` |
| Dedicated PlatformAdmin on UAT | Missing | Presence only via masked secret injection + login |

## Confirmed Findings

### Finding 1: Existing PlatformAdmin path is sufficient

**Evidence:** `src/Api/Controllers/V1/PlatformTenantsController.cs:16-199`, `PlatformMeController.cs:21-44`, `PlatformAdminSeeder.cs:30-89`

**Detail:** Login is `POST /api/v1/auth/login`. Profile is `GET /api/v1/platform/me`. Lifecycle mutations already exist and write `TenantCreated` / `TenantSuspended` / `TenantReactivated` / `TenantArchived` audits. Create sets `Status=Active`, `BillingStatus=Free`, optional `IsComplimentary`, and does not create memberships or call Paddle.

### Finding 2: UAT API is Production environment with seed disabled

**Evidence:** `docker-compose.uat.yml:74`, `:82-84`; `appsettings.json` `PlatformAdminSeed.Enabled=false`; `ProductionSecurityValidator.cs:44-60`

**Detail:** Recreating the running API with seed enabled would work, but a collision throw would prevent the replacement container from becoming healthy. One-shot `docker compose run` that exits after `PlatformAdminSeeder.SeedAsync` leaves the running API up.

### Finding 3: Default tenant is API-blocked; other protected tenants are not

**Evidence:** `PlatformTenantService` suspend/archive blocks the default tenant; picklemania/creativorare have no API hard-block.

**Detail:** The harness must refuse those slugs before any mutation. The tenant id used for suspend/archive must come only from the Create response of the same run.

### Finding 4: Public acceptance is not the API status field

**Evidence:** `web/app/page.tsx` (suspended maintenance vs archived `notFound()`); `web/components/public/tenant-maintenance-page.tsx`

**Detail:** Suspended public `/` is HTTP 200 with maintenance copy. Archived public `/` is HTTP 404. API `GET /api/v1/public/door` returns kind but is supporting evidence only.

## Deduced Conclusions

### Deduction 1: Bootstrap is optional and must be one-shot

**Based on:** Findings 1–2

**Conclusion:** Try login first. If the dedicated identity already exists, do not seed. If login is 401, run a one-shot container with `PlatformAdminSeed__Enabled=true` sourced from GitHub Environment secrets, then immediately exit without hosting HTTP. Never write the password into the canonical droplet `.env`.

### Deduction 2: Lifecycle must stay opt-in

**Based on:** Owner authorization + Deploy UAT architecture

**Conclusion:** A dedicated job after browser acceptance, gated on `UAT_AUTO_LIFECYCLE_ENABLED=true` and `19-5-lifecycle-gate.json.lifecycleOpen=true`, keeps this from becoming a permanent PlatformAdmin backdoor.

## Hypothesized Paths

### Hypothesis 1: Dedicated PlatformAdmin already exists

**Status:** Open

**Theory:** Owner will place `UAT_AUTO_PLATFORM_ADMIN_EMAIL` / `PASSWORD` in Environment `uat` for an already-created exclusive PlatformAdmin.

**Would confirm:** Login 200 + `/platform/me` roles exactly `PlatformAdmin`.

**Would refute:** 401 after secrets present → one-shot seed; TenantAdmin collision → `OWNER_GATE=platform_admin_bootstrap_conflict`.

## Source Code Trace

| Element | Detail |
| ------- | ------ |
| Trigger | Deploy UAT after accepted main SHA, browser PASS, lifecycle opt-in |
| Seed | `PlatformAdminSeeder.SeedAsync` via one-shot process exit |
| Mutate | Existing `/api/v1/platform/tenants*` only |
| Public proof | `https://<slug>.uat.cohestra.app/` |
| Related files | `PlatformTenantService.cs`, `TenantHostResolver.cs`, `deploy.yml` |

## Conclusion

**Confidence:** High

Reuse the existing PlatformAdmin seeder and tenant lifecycle APIs. Add a UAT-only, opt-in, allowlisted harness with pinned Create-response IDs, protected-tenant refusals, and a one-shot seed that cannot take down the running API or persist credentials.

## Recommended Next Steps

### Fix direction

Implement guards + harness + one-shot + Deploy UAT job + contract tests. No new GITHUB_TOKEN write permissions. No Paddle. No production.

## Reproduction Plan

1. Unit/contract tests for refusals.
2. Exact-HEAD review.
3. Merge to main → Deploy UAT → score live matrix.
