---
story: 19.5
head: f2614bfd3610469b0f65aee91ca1ee8b8c8c0750
reviewer: grok-4.6
date: 2026-10-17
---

# Exact-HEAD review — 19.5 Saturday schedule parse `f2614bfd`

## Scope

- `ActivityScheduleParser` matches week-Saturday and weekday-only strings
  before `DateTimeOffset.TryParse(AssumeUniversal)`
- Unit test pins Saturday 2026-10-17 UTC and asserts Singapore `+08:00` / hour 10
- Investigation `story-19-5-sat-schedule-utc-parse.md`

Does not touch Paddle, billing, tenant suspend/archive, or production.

## Findings

| Sev | Finding | Disposition |
| --- | ------- | ----------- |
| BLOCKER | none | — |
| MAJOR | none | — |
| MINOR | `CreateAsync` test still uses `UtcNow` (cannot inject parser reference) | accepted — weekday path is now host-calendar independent; hour/offset asserts hold any day |
| NIT | Weekday path still schedules *next* matching weekday when `daysUntil == 0` | accepted — pre-existing; harness wants a future Saturday |

Checked: ISO / display / `Week N, Saturdays` formats still reach their original parsers; weekday regex cannot consume ISO or `ddd, MMM d, yyyy` strings; no secret values.

## Verdict

PASS — BLOCKER=0, MAJOR=0. Story 19.5 stays OPEN until fresh Deploy UAT scores Basic. Production NO-GO.
