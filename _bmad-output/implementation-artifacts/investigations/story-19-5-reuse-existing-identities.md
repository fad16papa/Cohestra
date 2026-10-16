---
story: 19.5
slug: story-19-5-reuse-existing-identities
date: 2026-10-16
status: closed
main: 91df97f0d24aedbd62c9dfc902feca3b91b8bfdb
---

# Case: reuse existing UAT identities before creating new ones

## Premise (owner, challenged)

Do not create new UAT users or mailboxes merely because the automation
contract uses `UAT_AUTO_*` / `UAT_OTP_*` names. Those names are aliases.

## Stronghold (Confirmed)

Live UAT `https://uat.cohestra.app/ready` is Healthy. Public tenant homes
that return HTTP 200:

| Slug | Public site name | Other public evidence |
| ---- | ---------------- | --------------------- |
| `default` | Cohestra | Seeded platform tenant (`TenantIds.DefaultSlug`). `/ready` depends on this row. Plan unverified in SQL; entity default is Basic. |
| `creativorare` | CreativoRare | Story 19.4 closed against this tenant as **Pro** (Paddle sandbox Pro Annual). Public activity `sunday-dragon-highlander-2` exists (archived). |

Other probed slugs (`harbourline`, `demo`, `px2-basic`, `uat-basic`, …)
return public-home 404. Login pages still 200 because Next.js serves `/login`
regardless of tenant existence.

## Findings

### F1 — Existing-account login does not use OTP (Confirmed)

`AuthService.LoginAsync` (`src/Infrastructure/Auth/AuthService.cs`) for a
confirmed user is email + password. OTP is `OtpPurpose.EmailVerification`
(signup) or password reset. Story 19.3 already proved signup → OTP →
verify → handoff.

Canonical Story 19.5 AC (`epics-cohestra-enterprise.md`) is dashboard,
activity publish/share, registration/dedup, Pro reports/CSV, Pro campaign
send, website/stub, suspended/archived public door. None of those items
require reading a signup OTP.

### F2 — OTP mailbox is a 45.5 leftover, not a 19.5 blocker (Confirmed)

`web/e2e-uat/operator-core-flows.spec.ts` (pre-correction) skipped only on
`UAT_AUTO_BASIC_*` / `UAT_AUTO_PRO_*`. Mailbox secrets live on the 45.5
spec. The 19.5 review NIT that “campaign send requires mailbox” is
**Refuted**: campaign send is outbound SendGrid.

### F3 — SendGrid FromEmail is not an IMAP inbox (Confirmed)

`.env.uat.example` / `docs/deploy/sendgrid-production.md`: outbound sender
`noreply@creativorare.com`. That is Mail Send, not a mailbox reader.
Personal consumer inboxes are forbidden by `otp-mailbox.ts`.

### F4 — Pro operator exists; Basic operator is unverified (Mixed)

- **Pro user:** Confirmed. Owner completed authenticated 19.4 Billing on
  CreativoRare as TenantAdmin. Password is owner-known, not in the app DB
  and not readable here.
- **Basic user:** Unverified. UAT compose sets `OperatorSeed__Enabled=false`.
  `CleanupStaleDefaultTenantAdminMembershipsAsync` removes default
  memberships when the same admin already owns another workspace, so the
  CreativoRare operator is **not** a safe Basic stand-in.
- **Passwords:** Must be mapped privately into Environment `uat`. Do not
  query Identity hashes.

### F5 — Two tenants must not be used for lifecycle AC (Confirmed)

Item 7 (suspend/archive → maintenance/404) must **not** target:

- `default` — `/ready` default-tenant health
- `creativorare` — live Paddle sandbox proof tenant

That is a disposable-tenant concern, not a reason to mint Basic/Pro
operators for dashboard/analytics walks.

### F6 — Harness could not exercise Pro even after mapping (Confirmed)

`.github/workflows/deploy.yml` browser job passed `UAT_AUTO_BASIC_*` and
mailbox names, but **not** `UAT_AUTO_PRO_EMAIL` / `UAT_AUTO_PRO_PASSWORD`.
Apex `baseURL` login would also miss tenant-host sessions. Both are
harness defects, not identity gaps.

Deploy UAT `38913544123` on `91df97f0`: `UAT_AUTO_BASIC_EMAIL` empty;
19.5 tests skipped.

## Decision

| Role | Existing tenant | Existing user | Safe to automate | Known credential path | Recommendation |
| ---- | --------------- | ------------- | ---------------- | --------------------- | -------------- |
| Basic operator | YES (`default`) | UNVERIFIED | YES if TenantAdmin exists; never suspend this tenant | Owner-known password only | REUSE tenant. Map existing TenantAdmin if present; otherwise RESET that test password. Do not create a new tenant. |
| Pro operator | YES (`creativorare`) | YES (19.4 TenantAdmin) | YES for walks; never suspend / never live Paddle | Owner-known password from 19.4 | REUSE. Map that identity to `UAT_AUTO_PRO_*`. Prefer the workspace operator over a personal inbox if both exist. |
| OTP mailbox | SendGrid outbound only | n/a | Personal inbox forbidden | None observed | NOT REQUIRED for 19.5. Do not create. |

## Owner gate

`OWNER_GATE=map_existing_credentials`

Names only:

- `UAT_AUTO_BASIC_EMAIL`
- `UAT_AUTO_BASIC_PASSWORD`
- `UAT_AUTO_PRO_EMAIL`
- `UAT_AUTO_PRO_PASSWORD`

Not required for 19.5: `UAT_OTP_MAILBOX_HOST` / `USER` / `SECRET` / `ADDRESS`.
