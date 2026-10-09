# Traceability — Story 44.1

Date: 2026-10-09
HEAD reviewed after tests: see git log on `cursor/story-44-1-platform-ops-gates-59c2`
Gate: PASS (P0 covered)

| ID | Requirement | Test | Result |
| -- | ----------- | ---- | ------ |
| P0-01 / AC1 / FR-44-1 | `PlatformOpsController` on PlatformAdminOnly list; no Identity role gates | `TenantAuthControllerPolicyTests.Platform_controllers_use_PlatformAdminOnly_policy` + leftover-role scan | Pass (unit) |
| P0-02 / AC2 / FR-44-3 | PlatformAdmin search/snapshot/members/open-issues + recovery 200/409 Epic 28 | `PlatformOpsHttpIntegrationTests.PlatformAdmin_ops_routes_preserve_epic_28_contracts` | Pass |
| P0-03 / AC3 / NFR-44-9 | TenantAdmin + TenantMember 403 on ops routes | `TenantAuthzIntegrationTests` TenantIsolation | Pass |
| P0-04a / AC4 / AD-17 | Shared per-actor Redis bucket | `RedisPlatformRecoveryRateLimiterTests.Consumes_shared_actor_bucket_then_denies` | Pass |
| P0-04b | HTTP 429 + no mail | `PlatformOpsRecoveryRateLimitIntegrationTests` 429 case | Pass |
| P0-04c | HTTP 503 + no mail | same class 503 case + existing `GlobalExceptionHandlerRateLimiterTests` | Pass |
| AC5 / FR-44-17 | No 44.2–44.9 / replay / requeue | Diff file list vs story exclusions | Pass (review) |

Quality gate: **PASS** for Story 44.1 P0. Stories 44.2–44.9 remain untested by design.
