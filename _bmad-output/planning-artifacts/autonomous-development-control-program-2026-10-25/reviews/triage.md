---
title: ADCP planning-review triage
status: patched-awaiting-owner
created: 2026-10-25
updated: 2026-10-25
first_pass: FAIL
production: NO-GO
---

# Triage — first-pass reviews vs planning patches

First-pass reviews (`review-adversarial.md`, `review-edge-cases.md`, `review-security.md`) judged the **pre-patch** package **FAIL**. Those files are retained as evidence. This note records what was rewritten in planning and what remains an owner decision.

Planning patches do **not** adopt AD-1..AD-10. They do **not** authorize implementation. Remaining BLOCKER/MAJOR items that require GitHub settings, secrets, or topology are **OWNER_GATE**.

## First-pass BLOCKERs

| ID | Finding | Planning patch | Residual |
| --- | --- | --- | --- |
| ADV B-1 | Stories encoded Option A / epic 47 / Environment `control-plane` while D2/D3/D4/D8 OPEN | Stories are `ADCP-P*`. ADCP-P2 exists only if D3=A. Implementation depends on D1+D3+D4+D8+D12 | Owner must still sign those rows. Do not treat recommendation as adoption |
| ADV B-2 | Halt glob missed this spine, UAT deploy, `_bmad/custom`, dispatcher | `04` halt set is the union listed there. ADCP-P1 AC fixtures this spine **and** `deploy.yml` | Implementation must keep the fixture list |
| ADV B-3 / SEC B-5 | ChatGPT replaced Grok 4.6 vs Epic 45 AD-12 | AD-2, FR-2, `04` ChatGPT limits, D6 recommend human-only for pilot | D6/D7 still OPEN |
| ADV B-4 / SEC B-1 | Unattended `adcp/task` / `/adcp run` without actor allowlist | Default trigger is allowlisted `workflow_dispatch`. D11 added. Label/comment off until D11 | Owner must sign D11 before unattended triggers |
| SEC B-2 | Name collision `control-plane` vs Epic 46 control plane | Proposed Environment name is `adcp`. D4 forbids `production` / `uat` / `control-plane` | Owner creates Environment (D4) — this PR does not |
| SEC B-3 | Halt missed dispatcher / `ci.yml` / UAT merge mutating UAT | Halt includes `.github/workflows/**`. Successful UAT-path merge still mutates UAT by existing policy; ADCP must not use that path for privilege files | D10 `main` protection remains later |
| SEC B-4 | Cursor API key unbounded (`envVars`, secrets, `repos[]`) | AD-3 forbids `envVars` secrets, Cloud Agent secret creation, requires pin `fad16papa/Cohestra`, forbids `workOnCurrentBranch` on `main` | Key creation is D5. Artifact download AC added to ADCP-P2 |

## First-pass MAJORs (selected)

| Finding | Planning patch | Residual |
| --- | --- | --- |
| `GITHUB_TOKEN` matrix disagreed across 07 / 47.2 | One matrix in `04` + `07` + ADCP-P2 | Must be copied into YAML only after D8 |
| Audit schema split (NFR-3 / 04 / 06 / 47.3) | Union recorded in `04` audit trail + `06` section 10 + ADCP-P3 (`and`, not `or`) | Reporter not implemented |
| Secret denylist only `PROD_DROPLET_*` | Allowlist `CURSOR_API_KEY` + optional ChatGPT; denylist expanded in ADCP-P2 | Owner inventory of remaining repo/org secrets is still a D4/D12 action |
| GG NEUTRAL treated as success | `06` + `05`: NEUTRAL is not SUCCESS; UAT records it as risk | Layer B still requires `success` for Production-provenance |
| Self-dispatch / occupancy / CI timeout | AD-3 occupancy; AD-7 timeout covers CI; dispatcher ignores own events | Must be contract-tested in ADCP-P2 |
| Environment without required reviewers | D4 includes required reviewer; D12 names creation as privilege expansion | Owner GitHub settings — this PR does not change them |
| FR-19 no AC | ADCP-P2 privilege-expansion halt | Detector is specified, not built |
| Story 47.1 “no workflow YAML that holds API keys” | Clarified: values never in git; names allowed after D8 | — |

## Edge-case hunter (6 unhandled paths)

All six named paths now have a written guard in `04` / `05` / AD-6 / AD-7 / ADCP-P1..P2:

1. CI timeout after agent FINISHED → cancel, `RECOVERY=ci_timeout`, do not count as SUCCESS
2. PR diff includes Production files after launch → post-PR halt
3. ChatGPT invents a skill → catalog check before `POST /v1/agents`
4. GitGuardian NEUTRAL → not SUCCESS
5. Self-triggering workflow → ignore own events
6. Two agents same branch → occupancy refuse

## What is still FAIL for implementation

The program is **not** implementation-ready. D1–D12 are OPEN. No Environment, secret, workflow YAML, or epic tracker row exists. First-pass review files remain FAIL against the pre-patch text; this triage is the planning response.

**Do not implement. STOP AT OWNER_GATE.**
