---
story: 19.5
slug: story-19-5-pro-activity-create-500
date: 2026-10-16
status: open
deploy_uat: 38930275247
head: 268bbd74ce528d34855dd8352d4691cda67be8cb
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

### H1 — First catalog community default-template clone throws (Open)

`ensureCatalog` reused `items[0]` from `/api/v1/admin/communities`. `ActivityService.CreateAsync` then calls `ApplyCommunityDefaultFormSchemaAsync`, which loads `Community.DefaultFormTemplateId`, clones `FormSchema`, and runs `FormFieldStepAssigner.ApplyMissingBuckets`.

Confirmed code paths that are **not** converted to 409:

- `JsonException` while serializing/deserializing the pinned template
- `NullReferenceException` if cloned `Fields` is null (`foreach` in `ApplyMissingBuckets`)
- EF materialization failure of corrupt template jsonb
- `DbUpdateException` that is not a unique-slug violation after a cloned schema is attached

Resolution in this change: never reuse `items[0]`; find-or-create dedicated `19.5 Harness` / `19.5 Category` (no default template on create). Fail-open optional prefill so a corrupt pin cannot 500 create.

### H2 — Payload/binding error (Refuted)

Controller `ValidateCreateRequest` returns 400. Harness body matches local e2e (`name`, `category`, `schedule: "Sat 10:00"`, `location`, `communityLabel`, `status: "draft"`). Observed status is 500.

### H3 — Tenant/JWT missing (Refuted)

Same token/origin `GET /api/v1/admin/me` succeeded immediately before create.

### H4 — Login GET leak (Refuted for this run)

PR #464: Pro UI login PASS desktop+mobile on this SHA.

## Missing evidence

UAT API logs for `traceId` `0HNPBK3NVLJ13` (no droplet SSH in this run). If H1 is wrong, the next Deploy UAT create failure will include `community=` / `category=` in the Playwright message.
