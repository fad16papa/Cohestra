# Story: UAT rollback and recovery (Issue #531 workstream A)

## Goal

Provide a dedicated UAT-safe previous-SHA recovery procedure that does not
weaken Deploy UAT's current-`origin/main`-tip policy and does not touch
Production.

## In scope

- `deploy/uat-rollback.sh` dry-run by default; execute only when
  `UAT_ROLLBACK_AUTHORIZED=true` and `UAT_ROLLBACK_EXECUTE=true`.
- Owner phrase `UAT ROLLBACK: AUTHORIZED` on `workflow_dispatch`.
- Refuse current tip, non-ancestors, malformed SHAs, and DB restore flags.
- New workflow `.github/workflows/deploy-uat-rollback.yml` only
  (`workflow_dispatch`, Environment `uat`, no auto trigger).
- Owner checklist and rollback documentation. No live SSH/restore.

## Out of scope

- Changing `UAT_DEPLOY_GATE_ACTIVE` or `.github/workflows/deploy.yml`.
- Production workflows, ADCP, PR #505, live rollback execution.

## File ownership (exclusive)

`.github/workflows/deploy-uat-rollback.yml`,
`.github/workflows/ci.yml` (one rollback contract step only),
`deploy/uat-rollback.sh`, `deploy/uat-rollback.test.sh`,
`deploy/validate-uat-rollback-workflow.sh`,
`docs/deploy/uat-rollback.md`,
`docs/deploy/uat-activation-owner-checklist.md`,
`_bmad-output/implementation-artifacts/uat-rollback-recovery.md`.
