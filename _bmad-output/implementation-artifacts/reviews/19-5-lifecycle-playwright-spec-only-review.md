# Exact-HEAD review: Playwright spec-only UAT collection

Reviewed SHA: c0bde27028f60fc230c370e7cfab4b537149bee1

Reviewer: Grok 4.6 (primary). Composer 2.5: none.

## Cause

Deploy UAT 39008390930 / main 4d4477b8 deployed successfully (shaMatch PASS)
but the browser job failed immediately: Playwright loaded
e2e-uat/lifecycle/*.test.ts, which import vitest.

## Change

web/playwright.uat.config.ts now sets testMatch to spec.ts only and
testIgnore **/lifecycle/**. Validators enforce both.

No auth, seed, permission, or mutation-guard changes.

## Tests

- validate-uat-playwright.sh PASS
- validate-uat-lifecycle.sh 28 passed

## Findings

BLOCKER=0. MAJOR=0.

## Verdict

PASS.
