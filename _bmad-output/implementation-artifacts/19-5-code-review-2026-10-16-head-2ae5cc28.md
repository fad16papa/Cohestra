---
story: 19.5
head: 2ae5cc28c8b54aa467f5270763df543d08835124
reviewer: grok-4.6
date: 2026-10-16
---

# Exact-HEAD review — 19.5 schedule UTC persist `2ae5cc28`

## Scope

- `ActivityService.NormalizeScheduledStartsAt`: parsed wall times `ToUniversalTime()`
- `ActivityConfiguration.ScheduledStartsAt` UTC conversion on write
- Unit tests: Singapore `Sat 10:00` parse has non-UTC offset; create persists UTC
- Investigation follow-up (H1 refuted, H5 confirmed)

Does not touch Paddle, billing, or production.

## Findings

| Sev | Finding | Disposition |
| --- | ------- | ----------- |
| BLOCKER | none | — |
| MAJOR | none | — |
| MINOR | In-memory tests cannot reproduce the Npgsql timestamptz throw | accepted — next Deploy UAT Pro mutating walk is the Postgres proof |
| NIT | Public `ScheduledStartsAt` JSON for Singapore creates becomes UTC `Z` | accepted — same instant; previous path 500'd so no live client depended on +08:00 |

Checked: explicit `ScheduledStartsAt` already UTC; parser still returns tenant-offset instants for comparisons; expiration reads convert via tenant TZ; no secret printing; no suspend/archive.

## Verdict

PASS — BLOCKER=0, MAJOR=0. Story 19.5 stays OPEN until Deploy UAT re-scores the mutating walk. Production NO-GO.
