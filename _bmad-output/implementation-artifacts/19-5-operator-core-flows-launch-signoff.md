---
epic: 19
story: 5
status: in-progress
created: 2026-10-15
---

# Story 19.5: Operator core flows and launch sign-off

Status: **in-progress**. 19.3 dual-layer live artifacts passed (`38911205011` / `26f594bc`). 19.4 is CLOSED / FROZEN.

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
| 1 | Dashboard metrics load | Pro `/dashboard` PASS on `38930275247`. Basic SKIP (aliases unmapped). | Basic live run after aliases exist |
| 2 | Create activity → publish → share kit | FAIL 500 on create (`0HNPBK3NVLJ13`). Not scored PASS. | Dedicated `19.5 Harness` catalog + fail-open prefill, then rerun |
| 3 | Public registration + client dedup | Blocked by create 500. Not scored PASS. | Same mutating walk |
| 4 | Reports + CSV export (Pro) | Analytics room PASS. Weekly CSV blocked by create 500. | CSV on next mutating walk |
| 5 | Campaign send test (Pro) + tenant branding | Campaigns room PASS (no blast). `send-test` blocked by create 500. Website branding PASS (`siteName` contains creativorare). | `send-test` on next mutating walk |
| 6 | Website builder publish (Pro) or stub home (Basic) | Pro Website Studio PASS. Basic website/stub SKIP. | Basic live run |
| 7 | Suspended/archived tenant → maintenance or 404 | No disposable UAT tenant. Protected: `default`, `creativorare`. | `OWNER_GATE=lifecycle_disposable_tenant` |
| — | Billing | 19.4 CLOSED — do not re-walk as a 19.5 blocker | Frozen PASS |
| — | Authentication / settings | Pro login PASS desktop+mobile after #464 | Basic login still SKIP |
| — | Checklist Operator + PM rows | Empty — do not fabricate | `OWNER_GATE=launch_signoff` after machine matrix |

Also: SendGrid domain auth per `docs/deploy/sendgrid-production.md`, or documented defer with product approval.

## Isolated tenants only

Use isolated UAT tenants (example: `creativorare.uat.cohestra.app`). No production customer PII. No Platform Admin walk as a substitute.

## Do NOT

- Mark Production GO.
- Enable live Paddle or charge customers.
- Reopen 19.4, Cinema, or Epics 36–38 / 42–44.
- Fabricate Operator/PM signatures.
