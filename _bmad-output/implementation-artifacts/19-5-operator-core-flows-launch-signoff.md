---
epic: 19
story: 5
status: in-progress
created: 2026-10-15
---

# Story 19.5: Operator core flows and launch sign-off

Status: **in-progress**. Machine acceptance PASS. Waiting for Operator + PM
sign-off. Do not fabricate those signatures. Production remains NO-GO.

## Live machine matrix (2026-10-17) — lifecycle PASS / OWNER_GATE=launch_signoff

Deploy UAT `39011680830` / main `e01674664111eae02b61b2863e5d7a201b7a9833`.
shaMatch PASS. Browser 31 passed / 5 skipped / 0 unexpected.

Live inputs (Environment `uat`):

- Variable `UAT_AUTO_LIFECYCLE_ENABLED=true`
- Secret `UAT_AUTO_PLATFORM_ADMIN_EMAIL` PRESENT / MASKED
- Secret `UAT_AUTO_PLATFORM_ADMIN_PASSWORD` PRESENT / MASKED

No secret values are recorded here. Host `platformAdminSeed` remained
false. First login passed, so one-shot bootstrap was correctly
`NOT REQUIRED`. Role exclusivity PASS.

Disposable tenant from this run only:
`uat-19-5-lifecycle-e0167466-11680830` — Basic / Complimentary / Free.
Suspend + public maintenance PASS. Reactivate PASS. Archive + public
404 PASS (independently rechecked). Audits:
TenantCreated, TenantSuspended, TenantReactivated, TenantArchived.
Protected hosts `default`, `picklemania`, and `creativorare` stayed
HTTP 200 with no maintenance copy. Paddle mutation NONE.

45.4 PASS. Basic PASS. Pro PASS. Lifecycle PASS.
`OWNER_GATE=launch_signoff`. Story 19.5 stays in-progress until real
Operator + PM sign-off. After close: set
`UAT_AUTO_LIFECYCLE_ENABLED=false` and rotate the dedicated aliases.

## Live machine matrix (2026-10-17) — first-use PlatformAdmin bootstrap required

Owner configured GitHub Environment `uat` after Deploy UAT `39009526569`:

- `UAT_AUTO_LIFECYCLE_ENABLED=true` (Environment variable)
- `UAT_AUTO_PLATFORM_ADMIN_EMAIL` (Environment secret)
- `UAT_AUTO_PLATFORM_ADMIN_PASSWORD` (Environment secret)

Values are not recorded here. The dedicated identity is brand new and is
not assumed to exist. First live run is expected to 401/403, run
`deploy/uat-platform-admin-oneshot.sh`, then retry login.

`39009526569` skipped with `lifecycle_disabled` and is not lifecycle
acceptance. Fresh Deploy UAT is required. Protected tenants remain
refused. Production NO-GO. After live lifecycle PASS:
`OWNER_GATE=launch_signoff`.

## Live machine matrix (2026-10-17) — lifecycle automation authorized

Deploy UAT `39004625819` / main `830adc140d3aa45edd9df70af8664789b25c2296`.
Browser 31 passed / 5 skipped / 0 unexpected. Basic PASS on picklemania.
Pro PASS. 45.4 login PASS. Remaining machine AC is lifecycle.

Owner authorized a dedicated UAT PlatformAdmin identity and opt-in
lifecycle job. Protected tenants stay refused. Production NO-GO.
After live lifecycle PASS: `OWNER_GATE=launch_signoff`.

## Live machine matrix (2026-10-17) — Basic PASS on picklemania

Deploy UAT `39003393683` / main `0e1281e9`. Host deploy PASS.
`UAT_AUTO_BASIC_SLUG` PRESENT / MASKED (Environment secret). Browser job
FAILED only on leftover 45.4 `authenticated.spec.ts` (broad Sign-in
button + `domcontentloaded` submit). Canonical 19.5 Basic tests RAN and
PASSED on `picklemania.uat.cohestra.app` desktop 1440 and mobile 390:

- login (implicit) PASS
- dashboard PASS
- activities PASS
- website Core-lock + public stub PASS
- campaigns Pro-lock PASS

Pro rooms + mutating walk PASS (no regression). Do not count the 45.4
failure as a Basic product FAIL. 45.4 login will use the same
hydration + `Sign in to workspace` path as 19.5.

`OWNER_GATE=lifecycle_disposable_tenant` — no disposable UAT tenant.
Protected: `picklemania`, `creativorare`, `default`. Do not fabricate
Operator/PM sign-off. Production NO-GO.

## Live machine matrix (2026-10-17) — Deploy UAT `39001637293` slug still empty

Main `dc175eb1` / Deploy UAT `39001637293`. Host deploy PASS. Browser
failed because `UAT_AUTO_BASIC_SLUG=` and `UAT_AUTO_PRO_SLUG=` were
empty at injection time, so the harness fell back to `default` again.
Credentials remain VALID. 45.4 no longer hits Show-password strict-mode;
it failed on the same default-host login.

Workflow now also reads Environment secrets as fallback
(`vars || secrets`) in case the slug was stored with the other
`UAT_AUTO_*` secrets. Do not hardcode `picklemania`. If both sources
are empty on the next run, `OWNER_GATE=basic_tenant_slug_mapping`.

Pro rooms + mutating walk PASS on this run. Production NO-GO.

## Live machine matrix (2026-10-17) — Basic slug mismatch (credentials VALID)

Deploy UAT `38999310722` / main `55791870`. Host deploy PASS. Browser
21 passed / 5 skipped / 10 unexpected.

BASIC CREDENTIALS: VALID (owner signed in on the live Basic workspace).
BASIC TENANT: `picklemania`.
FAILED TEST HOST: `default` (`default.uat.cohestra.app/login`).
ROOT CAUSE: tenant slug mismatch. `OWNER_GATE=basic_credentials_invalid`
is superseded.

Presence: `UAT_AUTO_BASIC_EMAIL` / `UAT_AUTO_BASIC_PASSWORD` PRESENT /
MASKED; tests RAN. Deploy UAT did not pass `UAT_AUTO_BASIC_SLUG`, so the
harness fell back to `default`. Same mapped pair works at
`https://picklemania.uat.cohestra.app/dashboard` (Plan = Basic).

Repair: inject Environment `uat` vars `UAT_AUTO_BASIC_SLUG` and
`UAT_AUTO_PRO_SLUG` into the Playwright job. Do not hardcode
`picklemania`. Do not create a user/tenant or reset the password.

Pro reconfirmed PASS. Separate 45.4 defect: `getByLabel(/password/i)`
matches the Show-password control — not the 19.5 host mismatch.

Protected: `picklemania`, `creativorare`, `default`. Do not
suspend/archive any of them. Production NO-GO.

## Live machine matrix (2026-10-17) — Basic aliases mapped; fresh Deploy UAT required

Owner reports Environment `uat` now has existing Basic operator aliases
mapped privately as `UAT_AUTO_BASIC_EMAIL` and `UAT_AUTO_BASIC_PASSWORD`.
Do not print values. Do not create another Basic user or tenant. Do not
reset the Basic password.

Last Deploy UAT `38955178032` on main `1cc39375` predates that mapping.
On that run Basic still SKIP (`UAT_AUTO_BASIC_EMAIL/PASSWORD are not
mapped`). GitHub Environment secret listing may remain 403. Presence is
proven only by masked Actions injection and skip-vs-run: expected
`UAT_AUTO_BASIC_EMAIL` PRESENT / MASKED and `UAT_AUTO_BASIC_PASSWORD`
PRESENT / MASKED, with Basic tests RUN (not SKIP).

Fresh Deploy UAT is required to score:

- Basic login (tenant-host `/login` → `/dashboard`)
- Basic dashboard
- Basic activities
- Basic website Core-lock and/or public stub home
- Basic campaigns Pro-lock
- Responsive desktop 1440×900 and mobile 390×844

Do not count SKIP as PASS. OTP mailbox is not required.

CI `38998378356` on tracker HEAD `cae6a6c1` failed two Saturday-host
schedule tests: `DateTimeOffset.TryParse(AssumeUniversal)` treated
`Sat 10:00` as UTC. Parser now matches weekday/week-Saturday patterns
before generic DateTimeOffset parse so tenant `Asia/Singapore` wall
time is preserved. See
`investigations/story-19-5-sat-schedule-utc-parse.md`.

Pro acceptance is preserved from `38952447077` / `38955178032` unless a
genuine regression appears.

`OWNER_GATE=lifecycle_disposable_tenant` remains after Basic PASS — no
disposable UAT tenant; never suspend/archive `default` or `creativorare`.
Do not fabricate Operator/PM sign-off. Production NO-GO.

## Live machine matrix (2026-10-16)

Deploy UAT `38952447077` / SHA `756e408821ae4cf7bdd62753be5a07493f63dc87`
(`shaMatch: true`). Host acceptance PASS. Public smoke PASS. Browser
21 passed / 15 skipped / 0 unexpected.

Presence only: `UAT_AUTO_PRO_*` configured (masked); `UAT_AUTO_BASIC_*`
empty. Pro mutating walk PASS (create/publish/share/register/dedup/CSV/
campaign `send-test`). Basic SKIP. OTP mailbox not required.

`OWNER_GATE=lifecycle_disposable_tenant` — no disposable UAT tenant;
never suspend/archive `default` or `creativorare`. Do not fabricate
Operator/PM sign-off. Production NO-GO.

Owner reports Environment `uat` aliases mapped for existing operators
(`UAT_AUTO_PRO_*`, and `UAT_AUTO_BASIC_*` if a default TenantAdmin is
known). Presence is proven by skip vs run on Deploy UAT — never by
printing values.

Deploy UAT `38930275247` / `268bbd74` (presence only): Pro aliases
configured (tests ran); Basic aliases missing (skip string
`UAT_AUTO_BASIC_EMAIL/PASSWORD are not mapped`). Pro UI login +
dashboard/analytics/website studio/campaigns room PASS desktop+mobile.
Mutating create `POST /api/v1/admin/activities` 500
(`traceId` `0HNPBK3NVLJ13`) — see
`investigations/story-19-5-pro-activity-create-500.md`.

`UAT_AUTO_BASIC_*` / `UAT_AUTO_PRO_*` are aliases for **existing** isolated
UAT TenantAdmins (Basic candidate `default`, Pro `creativorare`). Do not
create replacement users because of the names. Authenticated walks skip
until those aliases are mapped on Environment `uat`.

**OTP mailbox is not a 19.5 blocker.** Canonical AC is existing-operator
login plus §7 product flows. Signup OTP remains Story 19.3 / Epic 45.5.
Campaign send uses outbound SendGrid, not IMAP.

After Epic 45.4+, machine-verify every core flow that is machine-verifiable (Playwright/API). Stop only for a genuine subjective/product/business judgment. Do not require owner SSH or manual screenshots for ordinary regression.

## Story

As a **platform operator**,
I want **full §7 core flows verified on live UAT and sign-off recorded**,
So that **stakeholders can approve public launch with evidence**.

This story cannot close on code-only evidence. Operator and PM signatures must be real.

## Canonical acceptance

From `epics-cohestra-enterprise.md` Story 19.5. Given at least one **Basic** and one **Pro** UAT tenant:

| # | Flow | Current evidence | Remaining |
| - | ---- | ---------------- | --------- |
| 1 | Dashboard metrics load | Pro `/dashboard` PASS. Basic `/dashboard` PASS desktop+mobile on `39003393683` (`picklemania`). | — |
| 2 | Create activity → publish → share kit | PASS on `38952447077` mutating walk (desktop). | — |
| 3 | Public registration + client dedup | PASS same walk (two 201s, same clientId). | — |
| 4 | Reports + CSV export (Pro) | PASS analytics room + weekly CSV. | — |
| 5 | Campaign send test (Pro) + tenant branding | PASS campaigns room + `send-test` (no blast). Website branding PASS. | — |
| 6 | Website builder publish (Pro) or stub home (Basic) | Pro Website Studio PASS. Basic Core-lock + stub PASS desktop+mobile on `39003393683`. | — |
| 7 | Suspended/archived tenant → maintenance or 404 | No disposable UAT tenant. Protected: `picklemania`, `creativorare`, `default`. | `OWNER_GATE=lifecycle_disposable_tenant` |
| — | Billing | 19.4 CLOSED — do not re-walk as a 19.5 blocker | Frozen PASS |
| — | Authentication / settings | Pro login PASS. Basic login PASS on picklemania (`39003393683`). | — |
| — | Checklist Operator + PM rows | Empty — do not fabricate | After lifecycle + Basic, `OWNER_GATE=launch_signoff` |

Also: SendGrid domain auth per `docs/deploy/sendgrid-production.md`, or documented defer with product approval.

## Isolated tenants only

Use isolated UAT tenants (example: `creativorare.uat.cohestra.app`). No production customer PII. No Platform Admin walk as a substitute.

## Do NOT

- Mark Production GO.
- Enable live Paddle or charge customers.
- Reopen 19.4, Cinema, or Epics 36–38 / 42–44.
- Fabricate Operator/PM signatures.
