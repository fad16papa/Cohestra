---
story: 19.5
slug: story-19-5-pro-activity-create-500
date: 2026-10-16
status: open
deploy_uat: 38944473091
head: b433f63e7b8ddb22102862ac06d99f393824c6e3
---

# Case: Pro mutating walk 500 on POST /api/v1/admin/activities

## Stronghold (Confirmed)

Deploy UAT `38930275247` on `268bbd74` (PR #464 hydration merge):

- `UAT_AUTO_PRO_EMAIL` / `UAT_AUTO_PRO_PASSWORD` present (masked in job env).
- `UAT_AUTO_BASIC_EMAIL` / `UAT_AUTO_BASIC_PASSWORD` empty.
- Pro UI login + dashboard/analytics/website/campaigns PASS on desktop and mobile.
- Desktop mutating walk FAIL (retry same):

  `create activity 500 {"title":"An unexpected error occurred.","status":500,"instance":"/api/v1/admin/activities","traceId":"0HNPBK3NVLJ13:00000001"}`

ActivitiesController maps only `InvalidOperationException` → 409. A 500 is therefore an unhandled exception, not catalog validation.

## Hypotheses

### H1 — First catalog community default-template clone throws (Refuted)

Deploy UAT `38944473091` on `b433f63e` (harness isolation + fail-open prefill live):

`create activity 500 community=19.5 Harness category=19.5 Category`

Dashboard meter moved 2→3 communities on retry. Dedicated catalog was used. Product prefill is fail-open. Still 500.

Earlier repair (PR #465) still valuable: do not reuse `items[0]`; fail-open corrupt pins. It did not stop this 500.

### H2 — Payload/binding error (Refuted)

Controller `ValidateCreateRequest` returns 400. Harness body matches local e2e (`name`, `category`, `schedule: "Sat 10:00"`, `location`, `communityLabel`, `status: "draft"`). Observed status is 500.

### H3 — Tenant/JWT missing (Refuted)

Same token/origin `GET /api/v1/admin/me` succeeded immediately before create.

### H4 — Login GET leak (Refuted for this run)

PR #464: Pro UI login PASS desktop+mobile on this SHA.

### H5 — Npgsql timestamptz rejects Singapore-offset ScheduledStartsAt (Confirmed)

CreativoRare dashboard: registration period resets Singapore. Harness `schedule: "Sat 10:00"` parses via `ActivityScheduleParser` to a DateTimeOffset with offset +08:00. `NormalizeScheduledStartsAt` converted explicit `ScheduledStartsAt` to UTC but left parsed values in the tenant offset.

Npgsql `timestamp with time zone` accepts UTC DateTimeOffset only. In-memory tests cannot see this. Default-tenant UTC offset 0 would also not throw.

Fix: persist parsed starts-at as UTC; EF conversion as belt-and-suspenders.

## Follow-up: 2026-10-16 #2

SHA provenance on Deploy UAT `38944473091`: `targetSha == apiGitSha == b433f63e`, `shaMatch: true`. Git fetch retry + sequential build PASS. Host acceptance PASS. Public smoke PASS.

Pro rooms PASS desktop+mobile. Mutating create still 500 (traceIds `0HNPBM1Q9SVNS`, `0HNPBM1Q9SVOD`). H1 refuted. H5 confirmed by code + timezone evidence.

## Missing evidence

UAT API logs for those traceIds (no droplet SSH). Not required to ship the UTC persist fix.
