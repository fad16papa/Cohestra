# Story: Authenticated acceptance enforcement (Issue #531 workstream B)

## Goal

`DEPLOYED_ACCEPTED` requires mandatory Basic and Pro Playwright tests to have
**run** (not skipped) with valid stats. OTP and Story 19.5 lifecycle remain
explicitly optional under their existing authorized-skip rules.

## In scope

- Fail closed when Basic/Pro credentials are missing (no `test.skip`).
- Final outcome and acceptance summary inspect Playwright suite evidence.
- OTP skip stays optional. Lifecycle skip stays `lifecycle_disabled|story_closed`.
- Negative TDD: skipped Basic, skipped Pro, stats-only JSON, OTP-only skip.

## Out of scope

- `deploy.yml` tip-pin / gate / rollback workflow.
- `UAT_DEPLOY_GATE_ACTIVE`, Production, ADCP, PR #505.

## File ownership (exclusive)

`deploy/lib/uat-playwright-coverage.py`,
`deploy/uat-final-outcome.sh`, `deploy/uat-final-outcome.test.sh`,
`deploy/uat-acceptance-summary.sh`, `deploy/uat-acceptance-summary.test.sh`,
`deploy/validate-uat-playwright.sh`,
`web/e2e-uat/authenticated.spec.ts`, `web/e2e-uat/operator-core-flows.spec.ts`,
`_bmad-output/implementation-artifacts/uat-authenticated-acceptance.md`.
