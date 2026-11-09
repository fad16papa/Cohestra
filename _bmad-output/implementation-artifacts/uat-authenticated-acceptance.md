# Story: Authenticated acceptance enforcement (Issue #531 workstream B)

## Goal

`DEPLOYED_ACCEPTED_BASIC_BETA` requires each individually listed Basic-beta
Playwright scenario to have a **final** pass after retries. Scope is
`basic_beta`. Pro live end-to-end is `NOT_TESTED` and is not a pass. A
sibling Basic test passing is not enough. OTP and Story 19.5 lifecycle remain
explicitly optional under their existing authorized-skip rules. Empty and
invalid CAPTCHA probes are required on desktop and may skip on the other
viewport. A total skip of those probes is not a pass.

## In scope

- Fail closed when Basic credentials are missing (no `test.skip`).
- Missing Pro QA credentials do not block basic-beta acceptance.
- Final outcome and acceptance summary inspect Playwright suite evidence.
- OTP skip stays optional. Lifecycle skip stays `lifecycle_disabled|story_closed`.
- Negative TDD: skipped or missing Basic, stats-only JSON, OTP-only skip,
  and a summary that claims Pro live PASS. A skipped Pro title stays
  `NOT_TESTED` and does not count as success.

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
