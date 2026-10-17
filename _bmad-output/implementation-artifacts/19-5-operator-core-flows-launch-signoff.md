---
epic: 19
story: 5
status: in-progress
created: 2026-10-15
---

# Story 19.5: Operator core flows and launch sign-off

Status: **in-progress**. 19.3 dual-layer live artifacts passed (`38911205011` / `26f594bc`). 19.4 is CLOSED / FROZEN.

## Live machine matrix (2026-10-17) — Basic credentials rejected

Deploy UAT `38999310722` / main `55791870`. Host deploy PASS (containers
Healthy). Browser 21 passed / 5 skipped / 10 unexpected.

Presence (masked Actions injection, values not printed):

- `UAT_AUTO_BASIC_EMAIL`: PRESENT / MASKED (`***`, not empty)
- `UAT_AUTO_BASIC_PASSWORD`: PRESENT / MASKED (`***`, not empty)
- `UAT_AUTO_PRO_EMAIL` / `UAT_AUTO_PRO_PASSWORD`: PRESENT / MASKED

Basic tests RAN (not SKIP). Canonical 19.5 login on
`default.uat.cohestra.app/login` submitted email+password via `#email` /
`#password` and stayed on `/login`. Product alert: `Invalid email or
password.` Same on desktop 1440 and mobile 390. Do not print the
mapped values. Do not create a user/tenant. Do not reset the password.

`OWNER_GATE=basic_credentials_invalid` — rejected by the live default
workspace; cannot remap aliases without owner secret intervention.

Pro reconfirmed PASS on this run (rooms desktop+mobile; mutating walk
desktop). 45.4 apex `/login` `getByLabel(/password/i)` is a separate
harness strict-mode miss on the Show-password control — not the 19.5
tenant-host failure.

Lifecycle still blocked after Basic is remapped: no disposable tenant;
never suspend/archive `default` or `creativorare`. Production NO-GO.

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
| 1 | Dashboard metrics load | Pro `/dashboard` PASS desktop+mobile on `38952447077`. Basic SKIP on `38955178032` (predates alias mapping). | Fresh Deploy UAT after 2026-10-17 Basic alias mapping |
| 2 | Create activity → publish → share kit | PASS on `38952447077` mutating walk (desktop). | — |
| 3 | Public registration + client dedup | PASS same walk (two 201s, same clientId). | — |
| 4 | Reports + CSV export (Pro) | PASS analytics room + weekly CSV. | — |
| 5 | Campaign send test (Pro) + tenant branding | PASS campaigns room + `send-test` (no blast). Website branding PASS. | — |
| 6 | Website builder publish (Pro) or stub home (Basic) | Pro Website Studio PASS desktop+mobile. Basic website/stub SKIP on `38955178032`. | Fresh Deploy UAT after 2026-10-17 Basic alias mapping |
| 7 | Suspended/archived tenant → maintenance or 404 | No disposable UAT tenant. Protected: `default`, `creativorare`. | `OWNER_GATE=lifecycle_disposable_tenant` |
| — | Billing | 19.4 CLOSED — do not re-walk as a 19.5 blocker | Frozen PASS |
| — | Authentication / settings | Pro login PASS desktop+mobile | Fresh Basic login after 2026-10-17 alias mapping |
| — | Checklist Operator + PM rows | Empty — do not fabricate | After lifecycle + Basic, `OWNER_GATE=launch_signoff` |

Also: SendGrid domain auth per `docs/deploy/sendgrid-production.md`, or documented defer with product approval.

## Isolated tenants only

Use isolated UAT tenants (example: `creativorare.uat.cohestra.app`). No production customer PII. No Platform Admin walk as a substitute.

## Do NOT

- Mark Production GO.
- Enable live Paddle or charge customers.
- Reopen 19.4, Cinema, or Epics 36–38 / 42–44.
- Fabricate Operator/PM signatures.
