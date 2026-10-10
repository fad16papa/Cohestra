---
epic: 19
story: 5
status: ready-for-dev
baseline_commit: f293650d3ab3b536e159c2888f562b124540f26f
created: 2026-10-10
---

# Story 19.5: Operator core flows and launch sign-off

Status: ready-for-dev

Depends on 19.1–19.4 real-environment close. Do not start the walk on an unproven UAT SHA. Do not fabricate Operator or PM signatures.

## Story

As a **platform operator**,
I want **full §7 core flows verified on live UAT and sign-off recorded**,
So that **stakeholders can approve public launch with evidence**.

## DONE requires the Mandatory Code Review Loop

Any code fix: IMPLEMENT → BUILD → TEST → `bmad-code-review` on the new HEAD → re-walk UAT → CLOSE.

This story cannot close on code-only evidence.

## Acceptance Criteria

Copied from `epics-cohestra-enterprise.md` Epic 19.5 and `docs/deploy/enterprise-launch-checklist.md` Core operator flows:

Given at least one **Basic** and one **Pro** isolated UAT tenant, exercise or mark N/A with reason:

1. Dashboard metrics load
2. Create activity → publish → share kit
3. Public registration + client dedup
4. Reports + CSV export (Pro) — canonical `/analytics` (compat `/reports`)
5. Campaign send test (Pro) with consented recipients + tenant email branding (SendGrid)
6. Website builder publish (Core+/Pro) or stub home (Basic)
7. Suspended / archived tenant → maintenance or 404 on the public door

Also:

- SendGrid domain auth complete per `docs/deploy/sendgrid-production.md`, or documented defer with product approval.
- After 19.1–19.5 all pass: Operator and PM rows in `docs/deploy/enterprise-launch-checklist.md` filled with date and UAT URL. Remaining §6 product gates listed with owner.
- Record screenshots, pass/fail, safe test identifiers, accessibility/responsive failures, unresolved issues.

## Isolated tenants only

Use real isolated Basic and Pro UAT tenants (example historically: `creativorare.uat.cohestra.app`). No production customer PII. No Platform Admin walk as a substitute.

## Tasks

- [ ] Confirm deployed SHA equals authorized `origin/main` (19.1) and HTTPS/headers still pass (19.2).
- [ ] Confirm reCAPTCHA UAT enablement closed (19.3) if the walk includes public signup.
- [ ] Confirm Paddle sandbox UAT closed or explicitly N/A for this walk (19.4). Billing checkout is 19.4, not 19.5.
- [ ] Seed or identify Basic + Pro UAT tenants.
- [ ] Walk each §7 item on both plans as applicable.
- [ ] Capture screenshots (no secrets, no customer PII).
- [ ] Record SendGrid evidence or product-approved defer.
- [ ] Genuine Operator + PM sign-off — names and dates from those people.
- [ ] Update checklist + `sprint-status.yaml` only after gates pass.

## Do NOT

- Mark Production GO.
- Activate live Paddle or charge customers.
- Change Cinema or the marketing landing page.
- Invent refund/dispute policy (escalate; that is 19.4).
- Fabricate signatures or mark blocked/manual/partial as PASS.
- Update the launch checklist sign-off table before all gates are satisfied.

## Halt / owner actions

Cloud Agent cannot SSH and cannot sign as Operator/PM. Owner must be present for the walk and sign-off.

## Dev Agent Record

### Agent Model Used

Grok 4.6 (`bmad-create-story` 2026-10-10; walk not started — 19.1/19.2 not closed)
