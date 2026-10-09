# ATDD checklist — Story 44.1

Status: create (AI generation)
Stack: backend (.NET 9 xUnit)
Story: `44-1-platform-ops-http-gates-policy-recovery-rate-limits`
Generated: 2026-10-09
Mode: red-phase acceptance scaffolds before implementation

## P0 scenarios (must automate)

| ID | Location | Scenario | Expected |
| -- | -------- | -------- | -------- |
| P0-01 | `TenantAuthControllerPolicyTests` | `PlatformOpsController` in PlatformAdminOnly list | policy present; no Identity `Roles=` gate |
| P0-02 | `PlatformOpsHttpIntegrationTests` | PlatformAdmin search/snapshot/members/open-issues + recovery | 200/409 Epic 28 contracts |
| P0-03 | `TenantAuthzIntegrationTests` | TenantAdmin + TenantMember on ops routes | HTTP 403, `TenantIsolation` |
| P0-04a | `RedisPlatformRecoveryRateLimiterTests` | consume until limit; shared bucket | N allow, then deny |
| P0-04b | `PlatformOpsRecoveryRateLimitIntegrationTests` | exceed limit | 429 ProblemDetails `platform_recovery_rate_limited`; no email |
| P0-04c | same | limiter throws `RateLimiterUnavailableException` | 503 `rate_limiter_unavailable`; no email |

## Out of scope

44.2–44.9 UI/API, Playwright, `/ready` changes, billing/outbox mutation.

## Generation notes

- Reuse `IntegrationTestHelpers`, `FakeEmailSender` recording, dedicated low-limit factory.
- Unique PlatformAdmin actor for Redis key isolation.
- No new test framework.
