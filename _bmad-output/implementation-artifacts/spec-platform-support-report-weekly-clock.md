---
title: 'Fix Platform support report weekly test clock boundary'
type: 'bugfix'
created: '2026-10-12'
status: 'in-progress'
route: 'one-shot'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/investigations/platform-support-report-weekly-clock-investigation.md'
---

# Fix Platform support report weekly test clock boundary

## Intent

**Problem:** `PlatformSupportReportServiceTests` seeds weekly in-period rows at `weekStart + 1h/2h/3h`. Shortly after Monday 00:00 UTC those timestamps are future relative to the service `endAt = UtcNow`, so opened count is `0` and CSV omits `SUP20260816000004`. Production weekly semantics are correct.

**Approach:** Test-only clamp. Seed in-period rows inside `[weekStart, capturedNow]`. Prove the Monday 00:00–03:00 UTC boundary with a fixed Monday and synthetic clocks. Do not change the weekly business definition.

## Boundaries & Constraints

**Always:**
- In-period fixtures must satisfy `weekStart <= CreatedAt <= capturedNow`.
- Keep assertions: opened `2`, resolved/closed `1`, still-open `1`, top tenant `alpha`, CSV contains `SUP20260816000004`.
- Keep the historical `weekStart.AddDays(-10)` issue outside the current week.
- Boundary proof must use a synthetic Monday, not `DateTimeOffset.UtcNow`.

**Ask First:**
- Any production `TimeProvider` or weekly-window change.

**Never:**
- Change `PlatformSupportReportService` weekly contract.
- Sleep, retry, or weaken assertions.
- Modify Paddle, billing, webhooks, entitlements, PlatformAdmin runtime, schema, migrations, deploy scripts, Docker/nginx, GitHub workflows, or Story 19.4.
- Reopen Epic 44.
- Treat a later-day CI rerun as the fix.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Early Monday 00:00–03:00 UTC | Synthetic `now` at 0/1/59/60/119/120/179/180 minutes after Monday 00:00 UTC | Helper timestamps stay in `[weekStart, now]` | None — proof only |
| Former +Nh offsets at 00:30 UTC | `weekStart.AddHours(1/2/3)` vs clamp | Former is future; clamp is in-window | None |
| Mid-week elapsed time | `now = weekStart + 10h` | Sequences 1/2/3 remain `weekStart + 1/2/3 minutes` | None |
| Aggregate weekly report | Two in-period + one historical | opened `2`, resolved `1`, still-open `1`, top `alpha` | None |
| Weekly CSV | In-period `SUP20260816000004` | CSV contains that issue number | None |

## Suggested Review Order

1. [Investigation conclusion](./investigations/platform-support-report-weekly-clock-investigation.md) — confirm test-only root cause
2. [Fixture clamp](../../src/Infrastructure.Tests/Support/PlatformSupportReportServiceTests.cs) — `InPeriodCreatedAt` and seed call sites
3. [Monday boundary proof](../../src/Infrastructure.Tests/Support/PlatformSupportReportServiceTests.cs) — synthetic 00:00–03:00 UTC Theory
4. Confirm `src/Infrastructure/Support/PlatformSupportReportService.cs` is untouched
