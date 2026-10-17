---
story: 19.5
slug: story-19-5-sat-schedule-utc-parse
date: 2026-10-17
status: confirmed
ci_run: 38998378356
head: cae6a6c132aa5e00159b40bb90af0c2c52abf463
---

# Case: Saturday host parses `Sat 10:00` as UTC

## Stronghold (Confirmed)

PR #472 CI `38998378356` `.NET build and test` on Saturday 2026-10-17 UTC:

- `ActivityServiceScheduleUtcTests.TryParseStartsAt_SingaporeWeekday_HasNonUtcOffset`
  Expected: Not `00:00:00`. Actual: `00:00:00`.
- `ActivityServiceScheduleUtcTests.CreateAsync_SingaporeWeekdaySchedule_PersistsUtcScheduledStartsAt`
  Expected Singapore hour `10`. Actual `18` (`10:00` UTC → `+08`).

Docs-only HEAD `cae6a6c1`. Same tests passed on Friday 2026-10-16 Deploy/CI.

## H1 — `DateTimeOffset.TryParse(AssumeUniversal)` wins on Saturday (Confirmed)

`ActivityScheduleParser.TryParseStartsAt` tried generic
`DateTimeOffset.TryParse(..., AssumeUniversal | AdjustToUniversal)` before the
weekday regex. On a Saturday host, `"Sat 10:00"` is a valid DateTimeOffset and
returns UTC. The `Asia/Singapore` weekday path never runs.

On other weekdays the generic parse fails and the weekday path applies +08:00.
That is why PR #468 held until Saturday CI.

## Repair

Match `WeekSaturdayPattern` / `WeekdayTimePattern` before generic DateTimeOffset
parse. Pin the unit test to Saturday 2026-10-17 UTC so the Saturday host case
stays covered.
