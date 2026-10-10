# Checkpoint preview — Story 44.9

Workflow: bmad-checkpoint-preview
Date: 2026-10-10
Model: Cursor Grok 4.6
Evidence: `_bmad-output/planning-artifacts/evidence/px2-44-9/viewports/`

## Surfaces reviewed

- Overview actual SHA 1440 / 390
- Overview missing SHA 1440 / 390
- Overview error 1440
- Operations actual SHA 1440 / 390
- Operations missing SHA 1440 / 390
- Operations error 1440

## Questions

**Can PlatformAdmin identify the exact instrumented running revision without SSH?**
YES when GIT_SHA is instrumented. Full SHA is visible (short prefix + full mono value). Live API returned the injected 40-char SHA with freshness `actual` and source `GIT_SHA`.

**Does missing SHA clearly say missing instrumentation instead of inventing a version?**
YES. Overview/Operations show "Missing instrumentation" plus copy that the deployed commit is not instrumented. No v1/latest/main substitute.

**Can an anonymous caller learn the Git SHA from /system/info or /ready?**
NO. Live `/api/v1/system/info` is `{"name":"Cohestra","apiVersion":"v1"}`. Live `/ready` is status + postgres/redis/default-tenant only.

**Can PlatformAdmin trigger rollback/redeploy/SSH from this feature?**
NO. GET only. POST `/ops/version` is 405. UI has no Rollback/Redeploy/SSH controls.

**Did existing Epic 44 surfaces remain functional?**
YES. Overview KPI tiles remain when version is missing or errors. Operations Health, Billing / Paddle, and Outbox remain when version errors.

Gate: PASS
