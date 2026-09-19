# Story 35.7 — Epic 35 verification matrix

**Generated:** 2026-09-19  
**Branch:** `cursor/modern-form-experience-system-a139`

## Live browser matrix (Epic closure gate)

| Experience | 1440 | 1024 | 768 | 430 | 390 | 360 |
|------------|------|------|-----|-----|-----|-----|
| Modern Centered | CI Docker e2e | CI Docker e2e | CI Docker e2e | CI Docker e2e | CI Docker e2e | CI Docker e2e |
| Split Event | CI Docker e2e | CI Docker e2e | CI Docker e2e | CI Docker e2e | CI Docker e2e | CI Docker e2e |
| Event Poster | CI Docker e2e | CI Docker e2e | CI Docker e2e | CI Docker e2e | CI Docker e2e | CI Docker e2e |
| Conversational | CI Docker e2e | CI Docker e2e | CI Docker e2e | CI Docker e2e | CI Docker e2e | CI Docker e2e |

**Runner:** `deploy/ci-docker-smoke.sh` → `web/e2e/form-experience-epic-35.spec.ts` with `E2E_LIVE_STACK=1` on Playwright Chromium against nginx `:8088` stack with demo seed.

**Cloud agent VM:** Postgres/API unavailable locally — matrix executed via CI only (not NOT EXECUTED if CI job passes).

## Entitlement evidence

| Capability | Basic | Core | Pro |
|------------|-------|------|-----|
| Centered | Unit + integration | Unit | Unit |
| Split | Blocked (integration + unit) | Allowed (unit) | Allowed |
| Poster | Blocked (integration + unit) | Allowed | Allowed |
| Conversational | Normalized (unit) | Blocked (integration + unit) | Allowed (unit) |
| Immersive preset | Core blocked (unit) | Blocked | Allowed |

## Formal review debt

- **Adversarial:** `_bmad-output/implementation-artifacts/35-7-adversarial-review.md`
- **Test architecture:** automated suites + new e2e matrix (see Tests section in final report)
- **Checkpoint preview:** satisfied when CI Docker e2e + form studio spec pass on HEAD

## Architecture (final)

Single schema, single validation, single submission, single `PublicRegistrationOpen` foundation, single Preview shell — verified by code review + regression tests.
