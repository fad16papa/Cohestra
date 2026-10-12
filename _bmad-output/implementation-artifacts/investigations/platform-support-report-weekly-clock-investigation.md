# Investigation: Platform support report weekly test clock boundary

## Hand-off Brief

1. **What happened.** Post-merge main CI run `38187503147` failed only `.NET build and test`: `GetReportAsync_aggregates_opened_resolved_and_still_open` expected opened `2` / actual `0`, and `ExportCsvAsync_includes_issue_rows_without_binary_data` missed `SUP20260816000004`.
2. **Where the case stands.** Concluded. Root cause is Confirmed: the tests seed `weekStart.AddHours(1/2/3)` while the production weekly window is `[Monday 00:00 UTC, UtcNow]`. Shortly after Monday 00:00 UTC those fixtures are future-dated and correctly excluded.
3. **What's needed next.** Test-only fixture clamp so in-period rows always sit in `[weekStart, capturedNow]`. Do not change `PlatformSupportReportService` weekly semantics. Do not treat a later-day CI rerun as the fix.

## Case Info

| Field            | Value |
| ---------------- | ----- |
| Ticket           | Post-merge main CI reliability — run `38187503147` |
| Date opened      | 2026-10-12 |
| Status           | Concluded |
| System           | Git HEAD `92c3cc58f73ade0943c428439425b2d35dbb3389` (`origin/main`); work branch `cursor/support-report-weekly-clock-59c2` |
| Evidence sources | Production service, unit tests, CI failure symptoms, UTC calendar (2026-10-12 is Monday) |

## Problem Statement

User-reported hypothesis (treated as Hypothesis #1, verified independently): `PlatformSupportReportServiceTests` is wall-clock unstable on early Monday UTC because seeded `CreatedAt` values at `weekStart + 1h/2h/3h` can be greater than the service's `endAt = DateTimeOffset.UtcNow`. Production report semantics are not accused. This is not a PR #440 Paddle/billing regression.

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------ | ----- |
| `PlatformSupportReportService.ResolvePeriod("weekly")` | Available | Returns `(StartOfUtcWeek(now), now)` |
| Inclusive filter `CreatedAt >= startAt && CreatedAt <= endAt` | Available | Future rows are excluded by design |
| `PlatformSupportReportServiceTests` seeds | Available | `weekStart.AddHours(1/2/3)` plus historical `AddDays(-10)` |
| CI run `38187503147` | Partial | Failure names + expected/actual supplied by owner; raw job log not re-fetched in this session |
| PR #440 / Paddle / billing | Available | Unrelated surface; no shared types with these tests |
| Production TimeProvider | Missing | Service uses `DateTimeOffset.UtcNow` directly; not required for a test-only fix |

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| - | --------------- | -------- | ------ | ----- |
| 1 | Confirm weekly contract on current main | High | Done | `startAt = Monday 00:00 UTC`, `endAt = UtcNow` |
| 2 | Confirm test fixtures can be future on early Monday | High | Done | `+1h/+2h/+3h` vs `endAt = now` |
| 3 | Distinguish production bug vs test bug | High | Done | Service exclusion of future rows is correct |
| 4 | Check PR #440 overlap | High | Done | No billing/Paddle files in this failure |
| 5 | Check whether TimeProvider is required | Medium | Done | Synthetic-clock helper tests are sufficient |

## Timeline of Events

| Time | Event | Source | Confidence |
| ---- | ----- | ------ | ---------- |
| 2026-10-12 ~00:18–00:19 UTC | Post-merge CI on `92c3cc58` runs `.NET build and test` | Owner report / run `38187503147` | Confirmed (owner) / Deduced (clock window) |
| Test setup | `now = DateTimeOffset.UtcNow`; `weekStart = Monday 2026-10-12 00:00 UTC` | `PlatformSupportReportServiceTests.cs:33-34,57-58` | Confirmed |
| Test seed | In-period rows at `weekStart+1h`, `+2h`, `+3h` | `PlatformSupportReportServiceTests.cs:37-38,67` | Confirmed |
| Service | `computedAt = DateTimeOffset.UtcNow`; weekly `endAt = computedAt` | `PlatformSupportReportService.cs:20-21,159` | Confirmed |
| Filter | `CreatedAt <= endAt` drops the three future rows | `PlatformSupportReportService.cs:27-28,96` | Confirmed |
| Assert | Opened `0` vs `2`; CSV missing `SUP20260816000004` | CI failure | Confirmed |

## Confirmed Findings

### Finding 1: Weekly window ends at current UtcNow

**Evidence:** `src/Infrastructure/Support/PlatformSupportReportService.cs:20-21,152-159`

**Detail:** `GetReportAsync` and `ExportCsvAsync` both compute `computedAt = DateTimeOffset.UtcNow` and resolve `"weekly"` to `(StartOfUtcWeek(now), now)`.

### Finding 2: Period filter is inclusive on both ends

**Evidence:** `src/Infrastructure/Support/PlatformSupportReportService.cs:27-28,96`

**Detail:** Opened/CSV rows require `CreatedAt >= startAt && CreatedAt <= endAt`. A row created after `UtcNow` is excluded. That is correct production behavior, not a defect.

### Finding 3: Tests seed fixed hour offsets from weekStart

**Evidence:** `src/Infrastructure.Tests/Support/PlatformSupportReportServiceTests.cs:33-38,57-67`

**Detail:** Aggregate test seeds open at `+1h` and resolved at `+2h`. CSV test seeds open at `+3h`. Historical closed issue at `weekStart.AddDays(-10)` is correctly out of period.

### Finding 4: 2026-10-12 is Monday UTC

**Evidence:** Calendar; CI timing supplied by owner (~00:18–00:19 UTC).

**Detail:** At 00:19 UTC, `weekStart + 1h` is 01:00, `+2h` is 02:00, `+3h` is 03:00 — all after `endAt ≈ 00:19`. The service correctly returns opened `0` and an empty CSV body (header only).

### Finding 5: Production service is not implicated

**Evidence:** Findings 1–4.

**Detail:** No production semantic bug. Changing `endAt` to `weekStart + 7 days` or otherwise widening the window would hide the test bug and alter the weekly business definition. Out of scope.

### Finding 6: Failure is independent of PR #440 / Epic 44 production code

**Evidence:** Test file and service file are Epic 44 support-report surfaces; PR #440 changed Paddle/billing only.

**Detail:** Post-merge timing exposed a pre-existing test clock bug. Not a billing regression and not an Epic 44 production regression.

## Deduced Conclusions

### Deduction 1: Early Monday 00:00–03:00 UTC is the deterministic failure window

**Based on:** Findings 1–4

**Reasoning:** Fixtures at `+1h/+2h/+3h` are future for any `UtcNow` in `[weekStart, weekStart+3h)`. After 03:00 UTC the same tests pass without a code change. A later-day rerun therefore hides the bug.

**Conclusion:** Resolution must be a fixture correction plus a synthetic-clock proof. Do not treat a later CI rerun as the fix.

### Deduction 2: Test-only clamp is sufficient; TimeProvider is not required

**Based on:** Findings 1–3

**Reasoning:** Capture `now` before seeding, then place rows at `min(weekStart + smallOffset, now)`. Service `UtcNow` is later than the captured clock, so `CreatedAt <= endAt` holds. Boundary proof can call the same helper with a fixed Monday 00:00 UTC and synthetic `now` values — no production `TimeProvider` abstraction.

**Conclusion:** Stay test-only. If a production clock abstraction were proposed, stop and justify first (not needed).

## Hypothesized Paths

### Hypothesis 1: Early-Monday UTC future fixtures (user premise)

**Status:** Confirmed

**Theory:** `weekStart + 1h/2h/3h` can be greater than service `endAt = UtcNow` shortly after Monday 00:00 UTC.

**Supporting indicators:** CI expected `2` / actual `0`; missing `SUP20260816000004`; 2026-10-12 Monday.

**Would confirm:** Weekly contract is `[Monday 00:00, UtcNow]` and seeds use hour offsets from weekStart.

**Would refute:** Service used a full-week `endAt`, or seeds were already `<= UtcNow`.

**Resolution:** Findings 1–4 confirm the premise independently.

### Hypothesis 2: Production weekly filter is wrong

**Status:** Refuted

**Theory:** The service should include rows created later today even if `CreatedAt > UtcNow`.

**Would confirm:** Product contract requiring a closed weekly interval ending at next Monday or end-of-day.

**Would refute:** Code and product weekly definition both end at current `UtcNow`.

**Resolution:** `ResolvePeriod("weekly")` explicitly returns `now` as `endAt`. Future rows must be excluded.

### Hypothesis 3: PR #440 billing change broke these tests

**Status:** Refuted

**Theory:** Interval-switch / proration work altered support-report aggregation.

**Would confirm:** Shared production code path or test fixture changed by #440.

**Would refute:** Failures isolated to support-report date-window tests with no Paddle types involved.

**Resolution:** Finding 6. #440 remains accepted. Story 19.4 stays OPEN for separate UAT/sandbox work.

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | ------ | ------------- |
| Raw CI job log for `38187503147` | Would timestamp the runner clock to the second | GitHub Actions log; not required — Monday + hour offsets already prove the window |
| Live production report at 00:19 UTC | Would show empty week if no real issues existed yet | Not needed; production filter is correct |

## Source Code Trace

| Element | Detail |
| ------- | ------ |
| Error origin | `PlatformSupportReportServiceTests.GetReportAsync_aggregates_opened_resolved_and_still_open` (`PlatformSupportReportServiceTests.cs:45`); `ExportCsvAsync_includes_issue_rows_without_binary_data` (`:75`) |
| Trigger | Unit tests run shortly after Monday 00:00 UTC |
| Condition | Seeded `CreatedAt` (`weekStart + 1h/2h/3h`) > service `endAt` (`UtcNow`) |
| Related files | `src/Infrastructure/Support/PlatformSupportReportService.cs`; `src/Infrastructure.Tests/Support/PlatformSupportReportServiceTests.cs` |

## Conclusion

**Confidence:** High

Root cause is Confirmed: a deterministic early-Monday UTC test bug. Production weekly semantics (`startAt = Monday 00:00 UTC`, `endAt = UtcNow`, inclusive) are correct and must not change. PR #440 is not implicated. Epic 44 production behavior is not implicated. Fix is test-only: seed in-period rows that always fall in `[weekStart, capturedNow]`, keep the historical `AddDays(-10)` row outside the week, and prove the Monday 00:00–03:00 UTC boundary with synthetic clocks — not wall-clock assertions and not a later CI rerun.

## Recommended Next Steps

### Fix direction

1. Replace `weekStart.AddHours(1/2/3)` with a helper that clamps candidates into `[weekStart, now]`.
2. Keep assertions: opened `2`, resolved/closed `1`, still-open `1`, top-tenant `alpha` first, CSV contains `SUP20260816000004`.
3. Add a Theory over synthetic Monday 00:00–03:00 UTC clocks proving the helper never emits future fixtures.
4. Do not introduce `TimeProvider` into production.
5. Do not modify Paddle, billing, PlatformAdmin runtime, schema, workflows, or Story 19.4.

### Diagnostic

Reproduce the old pattern against a synthetic `now = Monday 00:30 UTC` and show `weekStart.AddHours(1) > now`. Then show the clamped helper stays `<= now`.

## Reproduction Plan

1. Fix Monday `2026-10-12 00:00:00 +00:00`.
2. For `now` in `{00:00, 00:01, 00:59, 01:00, 01:59, 02:00, 02:59, 03:00}` compute former `+1h/+2h/+3h` vs clamped timestamps.
3. Former offsets are future whenever `now < weekStart + Nh`. Clamped timestamps are always in `[weekStart, now]`.
4. Run the two original facts after the helper change — they must pass regardless of wall-clock hour.

## Side Findings

- `stillOpen` counts all open/in-progress/waiting issues globally, not only in-period (`PlatformSupportReportService.cs:37-41`). The failing aggregate test still only had one open issue, so this did not cause the CI miss. Out of scope.
- Week-rollover mid-test (Sunday 23:59:59 → Monday 00:00:00 between seed and service) is a separate theoretical race. Not observed. Do not expand scope.

## Follow-up: 2026-10-12

### New Evidence

Independent re-read of current main `92c3cc58` confirmed Findings 1–3 on disk.

### Updated Conclusion

Proceed to `bmad-quick-dev` one-shot: test-only clamp + synthetic Monday boundary proof.
