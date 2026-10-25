---
title: ADCP proposed stories (placeholder IDs)
status: draft
created: 2026-10-25
updated: 2026-10-25
epic_assignment: OWNER_GATE
---

# Proposed stories

`sprint-status.yaml` highest epic is **46** (in-progress). **Do not assign a number in the tracker until the owner signs D2.** The next unused number is **47**; that is a recommendation, not an assignment.

This file is a proposal. It was not written into `sprint-status.yaml`. Story IDs are **ADCP-P1..ADCP-P4** until D2 is signed. Do not create `47.n` (or any `N.n`) files until D2.

**No story in this file may be implemented until D1 + D3 + D4 + D8 are signed.** D2 is required before tracker IDs. D5 (keys) and D11 (actor allowlist) are required before any live dispatch (ADCP-P4). D3 chooses topology; ADCP-P2 exists only if D3 = A.

## Requirements coverage

| FR / NFR | Proposed placeholder | Notes |
| --- | --- | --- |
| FR-1..4, FR-15, NFR-5 | ADCP-P1 | Governance contracts + architecture halt |
| FR-5..9 | ADCP-P1 | Closed-set skill router; isolation from Epic 46 |
| FR-10..14, FR-16..19, NFR-1 | ADCP-P2 | Only if D3 = A (GitHub-native). If D3 = B/C, rewrite after the matching ADR |
| FR-20..21, NFR-3 | ADCP-P3 | Milestone reporter + audit schema |
| Pilot | ADCP-P4 | Live harmless-task validation after D5 + D11 |
| NFR-2, NFR-4 | ADCP-P2 / ADCP-P4 | Cancel-on-timeout; no always-on host in pilot |

## Epic (number OWNER_GATE): Autonomous Development Control Program

Make BMAD work dispatchable through GitHub and Cursor Cloud Agents, with ChatGPT advisory and Product Owner architecture/Production authority. Production remains NO-GO.

### ADCP-P1 — Governance contracts and architecture halt

As a **Product Owner**,
I want **path-based architecture halt and a closed-set BMAD skill list in repo contracts**,
So that **agents cannot invent workflows or silently edit Production, UAT isolation, methodology, or this program**.

**Depends:** D1 + D8. Does not require D3, D4, or D5.

**AC**

- Given a fixture diff that touches **any** of: this program spine, `_bmad-output/planning-artifacts/architecture/**`, `autonomous-merge-policy.md`, `_bmad/custom/**`, `docker-compose.production.yml`, `docker-compose.uat.yml`, `.github/workflows/deploy.yml`, `.github/workflows/deploy-production.yml`, `.github/workflows/ci.yml`, or a future ADCP dispatcher YAML — the halt script exits non-zero with `OWNER_GATE=architecture`
- Given a fixture diff that only touches `web/lib/plan-limit-utils.test.ts`, the halt script exits 0
- Halt is evaluated at dispatch preview **and** on the PR HEAD diff
- Skill router refuses names absent from `_bmad/_config/bmad-help.csv` **and** absent from `_bmad/custom/`
- No workflow YAML contains secret **values**. Secret **names** may appear only after D8 in a later story
- Epic 46 story files, Epic 46 spine, and `sprint-status.yaml` are unchanged

### ADCP-P2 — Dispatcher (conditional on D3)

As a **Product Owner**,
I want **an owner-gated runner that can create, poll, and cancel a Cursor Cloud Agent**,
So that **ChatGPT does not need to run continuously**.

**Depends:** D1 + D3 + D4 + D8. **Exists only if D3 = A.** If D3 = B, replace this story after an infrastructure ADR. If D3 = C, this story is not created.

**AC (D3 = A only)**

- Workflow is a new file (proposed name `.github/workflows/adcp-dispatch.yml`) behind Environment `adcp` or the owner-chosen D4 name. It must not use Environment `production` or `uat`
- Default trigger is `workflow_dispatch` from an allowlisted human (D11). Label/comment triggers are off until D11 is signed
- Workflow-level `permissions:` default-deny. Job may grant only `contents:read`, `issues:write`, `pull-requests:write`, `actions:read`. Forbidden: `id-token:write`, `actions:write`, `contents:write` on `main`, `environment: production`, `environment: uat`
- `persist-credentials: false` on checkout. No SSH private keys
- Secret **name** allowlist the job may reference: `CURSOR_API_KEY` and optional ChatGPT key only. A contract test fails if the workflow YAML references `PROD_DROPLET_*`, `DROPLET_*`, `UAT_AUTO_*`, `UAT_OTP_*`, `PROD_PUBLIC_BASE_URL`, or Production host `.env` class names (JWT, Redis password, live Paddle, SendGrid, reCAPTCHA secret, backup encryption key)
- Dry-run mode calls a mock; live mode is owner-gated (D5)
- Timeout covers agent runtime **and** waiting for CI. On expiry: `POST` cancel, do not treat timed-out CI as SUCCESS, escalate
- Occupancy: refuse a second launch against the same branch or `startingRef`
- `workOnCurrentBranch` is forbidden on `main`. `repos[]` is pinned to `fad16papa/Cohestra`. No host secrets via `envVars`. No Cloud Agent environment-secret creation
- Self-dispatch: ignore events the dispatcher created. Retry budget does not increment on ignored events
- Missing key prints `MISSING_SECRET=CURSOR_API_KEY` and no value
- Cursor artifact list/download: do not post presigned URLs into public issue comments
- Privilege-expansion diffs (merge-policy list, D12) halt with `OWNER_GATE=privilege`

### ADCP-P3 — Milestone reporter

As a **Product Owner**,
I want **a posted report that cannot be marked complete without PR number, SHA, and CI URL**,
So that **agent-reported PASS is not treated as evidence**.

**Depends:** D1 + D8. Can trail ADCP-P1.

**AC**

- Template matches `06-milestone-reports.md` including actor, follow-up, cancel, and Environment name
- Completeness checker fails unless section 10 has **all** of: PR number, 40-hex HEAD that still matches the PR, and CI run URL (`and`, not `or`)
- Completeness refuses `MILESTONE=complete` without BMAD review evidence on that HEAD (0 BLOCKER / 0 MAJOR)
- GitGuardian `neutral` cannot satisfy a Production-provenance complete flag. For UAT/non-prod, NEUTRAL is recorded as a risk, not SUCCESS evidence
- `AUTHOR_ROLE` is not a substitute for recorded `github.actor`
- Audit record is the union of NFR-3, `04-governance.md` audit trail, and template section 10

### ADCP-P4 — Pilot validation

As a **Product Owner**,
I want **one harmless live dispatch**,
So that **the program is proven without touching Production**.

**Depends:** D1 + D3=A + D4 + D5 + D8 + D11 + ADCP-P1..P3.

**AC**

- Target is a docs-only or test-only task on a throwaway branch
- Milestone report posted and completeness-checked
- Architecture halt does not fire on the pilot target
- Rollback documented (disable workflow, revoke keys)
- Production compose, `deploy-production.yml`, Epic 46 files, and `sprint-status.yaml` remain untouched

## Explicitly not in this proposal

- Dedicated orchestrator service (Option B) until D3 = B and D9
- Autonomous Production merge
- ChatGPT desktop daemon
- Changing `main` branch protection (D10)
- Any Epic 46 story implementation
- Writing `47.n` story files before D2
- Creating GitHub Environments or secrets in this planning PR
