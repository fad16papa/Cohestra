# Story: Issue #534 permanent UAT readiness workflow

Date: 2026-11-01 (Asia/Singapore)

## Intent

Implement a permanent, event-driven, fail-closed UAT readiness evaluator that
is automatically injected into every current and future UAT candidate. Report
only. No privileged actions.

## TDD

- RED/GREEN: `deploy/evaluate-uat-readiness.test.sh`
- Workflow contract: `deploy/validate-uat-readiness-workflow.sh`
- Existing Deploy UAT HOLD-first and exact-SHA+GitGuardian contracts remain

## Implementation

- `deploy/lib/uat-readiness.py` — shared read-only validator
- `deploy/evaluate-uat-readiness.sh` — wrapper + secret scrub
- `deploy/require-uat-readiness-predeploy.sh` — enabled-path SSH block
- `.github/workflows/uat-readiness.yml` — event-driven workflow
- CI `uat-isolation` wiring
- Deploy UAT predeploy + immediate pre-SSH revalidation

## Non-goals (enforced)

- Do not set `UAT_DEPLOY_GATE_ACTIVE`
- Do not merge, dispatch, SSH, restore, or touch Production
- Do not change PR #505
- Do not revive ADCP
- Do not adopt closed Issue #519 release-branch architecture
