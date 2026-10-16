---
epic: 19
story: 5
status: in-progress
created: 2026-10-15
---

# Story 19.5: Operator core flows and launch sign-off

Status: **in-progress**. 19.3 dual-layer live artifacts passed (`38911205011` / `26f594bc`). 19.4 is CLOSED / FROZEN. Authenticated operator walks use Environment `uat` names `UAT_AUTO_BASIC_*` / `UAT_AUTO_PRO_*` and skip if absent.

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
| 1 | Dashboard metrics load | Partial — operator has used dashboard/Billing on CreativoRare Pro | Official Basic + Pro walk + screenshot |
| 2 | Create activity → publish → share kit | Missing official 19.5 evidence | Owner UAT walk |
| 3 | Public registration + client dedup | Tenant register URL 200 (`creativorare.uat.cohestra.app/register/sunday-dragon-highlander-2`) | Dedup + new submit walk |
| 4 | Reports + CSV export (Pro) | Missing | Owner UAT walk (`/analytics`) |
| 5 | Campaign send test (Pro) + tenant branding | Missing | Owner UAT + SendGrid auth or product-approved defer |
| 6 | Website builder publish (Pro) or stub home (Basic) | Missing official 19.5 evidence | Owner UAT walk |
| 7 | Suspended/archived tenant → maintenance or 404 | Missing | Owner UAT walk |
| — | Billing | 19.4 CLOSED — do not re-walk as a 19.5 blocker | Frozen PASS |
| — | Authentication / settings | Used during 19.4 Billing | Confirm during walk |
| — | Checklist Operator + PM rows | Empty | After 19.1–19.5 all pass |

Also: SendGrid domain auth per `docs/deploy/sendgrid-production.md`, or documented defer with product approval.

## Isolated tenants only

Use isolated UAT tenants (example: `creativorare.uat.cohestra.app`). No production customer PII. No Platform Admin walk as a substitute.

## Do NOT

- Mark Production GO.
- Enable live Paddle or charge customers.
- Reopen 19.4, Cinema, or Epics 36–38 / 42–44.
- Fabricate Operator/PM signatures.
