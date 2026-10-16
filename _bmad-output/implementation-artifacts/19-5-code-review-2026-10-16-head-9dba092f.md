---
story: 19.5
head: 9dba092f3b1b4d34da9b8923002d4f0917c6d123
reviewer: grok-4.6
date: 2026-10-16
---

# Exact-HEAD review — 19.5 canonical operator walks `9dba092f`

## Scope

- Expand `web/e2e-uat/operator-core-flows.spec.ts` to canonical Story 19.5
  Basic + Pro rooms and the desktop Pro mutating walk
- Contract greps in `deploy/validate-uat-playwright.sh`
- Signoff tracker update (story stays in-progress)

## Findings

| Sev | Finding | Disposition |
| --- | ------- | ----------- |
| BLOCKER | none | — |
| MAJOR | none | — |
| MINOR | Same-activity re-register is 409; harness uses two published activities for 201/201 clientId reuse | accepted — matches `RegistrationService` and is stronger dedup evidence |
| MINOR | Campaign test-send emails the live Pro operator via outbound SendGrid | accepted — canonical AC; never `/send` blast |
| MINOR | `default` live plan is still unverified without SQL; Basic Core-lock can fail if that tenant is not Basic | accepted — fail closed as product evidence; do not invent a tenant |
| NIT | `unpublishIfPresent` asserts inside `finally` and can mask an earlier failure message | accepted — still unpublishes harness activities; does not archive tenants |
| NIT | Empty catalog creates a community/category on CreativoRare | accepted — last resort; existing names are reused first |

Checked: skip strings remain `UAT_AUTO_BASIC_EMAIL/PASSWORD are not mapped` and `UAT_AUTO_PRO_EMAIL/PASSWORD are not mapped`; no OTP mailbox import or `UAT_OTP_MAILBOX`; login is tenant-host `/login` then `/dashboard` (not public `/`); Share kit UI; public registration + clientId equality; weekly CSV; `campaigns/send-test` only; unpublish not tenant suspend/archive; no Paddle/billing; no secret values.

## Verdict

PASS — BLOCKER=0, MAJOR=0. Story 19.5 stays OPEN pending live skip-vs-run on Deploy UAT, then `OWNER_GATE=lifecycle_disposable_tenant` for item 7, then human `OWNER_GATE=launch_signoff`. Production NO-GO.
