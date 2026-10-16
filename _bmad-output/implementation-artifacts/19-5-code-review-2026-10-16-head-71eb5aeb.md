---
story: 19.5
head: 71eb5aeb066172fda6b5ca4be0b6bc6bc5101fe1
reviewer: grok-4.6
date: 2026-10-16
---

# Exact-HEAD review — 19.5 Share kit locator `71eb5aeb`

## Scope

- `web/e2e-uat/operator-core-flows.spec.ts`: Share kit proof uses
  `getByLabel("Public registration URL")` instead of ambiguous `getByText`
- Playwright contract asserts that label
- Investigation follow-up for Deploy UAT `38947776906`

Does not touch Paddle, billing, activity create, or production.

## Findings

| Sev | Finding | Disposition |
| --- | ------- | ----------- |
| BLOCKER | none | — |
| MAJOR | none | — |
| MINOR | Label string is coupled to Share kit copy | accepted — `aria-label="Public registration URL"` is the control contract |
| NIT | finally-unpublish still runs if later steps fail | accepted — same as prior HEAD |

Checked: create/publish/register/dedup/CSV/send-test/unpublish unchanged; no tenant suspend/archive; no secret printing.

## Verdict

PASS — BLOCKER=0, MAJOR=0. Story 19.5 stays OPEN until Deploy UAT re-scores the mutating walk. Production NO-GO.
