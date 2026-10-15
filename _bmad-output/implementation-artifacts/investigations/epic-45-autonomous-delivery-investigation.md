# Investigation: Epic 45 autonomous delivery and UAT acceptance gaps

## Hand-off Brief

1. **What happened.** Story 19.3 is ready-for-dev but the Cloud Agent cannot finish UAT acceptance because routine deploy/proof still depends on owner SSH and copy/paste; the existing Deploy workflow is mis-scoped and fail-opens on missing host secrets.
2. **Where the case stands.** Feasible. Control-plane code can land without droplet access. Live UAT deploy waits on one-time GitHub Environment `uat` secret bootstrap (names only).
3. **What's needed next.** Create Epic 45, correct Story 19.3 to a dual-layer machine-verifiable recaptcha contract, then implement 45.1 (`deploy-uat` + Environment `uat` + fail-closed secrets).

## Case Info

| Field            | Value |
| ---------------- | ----- |
| Ticket           | Epic 45 / Story 19.3 unblock |
| Date opened      | 2026-10-15 |
| Status           | Concluded |
| System           | Cohestra UAT on shared DigitalOcean droplet; GitHub Actions CI/Deploy; Cursor Cloud Agent (no droplet SSH) |
| Evidence sources | Tracker, workflows, deploy scripts, recaptcha verifier, Playwright config, Story 19.3, docs/deploy/github-actions-cd.md, public UAT HTML probe (prior cycle) |

## Problem Statement

Owner hypothesis: Cohestra development and UAT validation can become fully autonomous after one-time infrastructure/secret bootstrap, without Cursor holding SSH and without the owner running droplet commands for ordinary acceptance.

This investigation treats that as a hypothesis and checks what the repository actually has versus what the current 19.3 / 19.5 acceptance path still requires a human to do.

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------ | ----- |
| sprint-status.yaml on `bdd6d422` | Available | Epic 19 in-progress; 19.1/19.2/19.4 done; 19.3 and 19.5 ready-for-dev; highest epic 44 |
| `.github/workflows/ci.yml` | Available | Required jobs: .NET, integration, Next.js, UAT isolation, Docker smoke |
| `.github/workflows/deploy.yml` | Available | Triggers after main CI; concurrency `deploy-production`; repo-level `DROPLET_*` secrets; no Environment; no artifact |
| `deploy/remote-deploy.sh` | Available | fetch/reset `origin/main`, isolation guards, `uat-compose.sh up -d --build`, `uat-smoke.sh` |
| `deploy/uat-smoke.sh` | Available | Loopback + public `/ready`, web, onboarding, signup/pricing, security headers |
| `deploy/classify-uat-env.sh` / `classify-paddle-env.sh` | Available | Presence/classification only; no secret values |
| `deploy/preflight-launch.sh --strict-recaptcha` | Available | Host-side recaptcha + seed + live-Paddle refuse |
| `deploy/validate-uat-isolation.sh` | Available | Repo-side compose/network/bypass-token contract |
| Playwright `web/e2e/*` | Partial | Local/CI stack suite; `baseURL` default `localhost:8088`; desktop Chrome only; no public UAT project |
| Story 19.3 | Available | Still requires owner droplet `.env` edits, classify/preflight, web/api rebuild, then human signup/OTP |
| Cloud Agent SSH | Confirmed missing | No `~/.ssh/cohestra_uat`; prior attempts `Permission denied (publickey)` |
| GitHub `uat` Environment | Missing | Workflow does not declare `environment: uat` |
| On-host JSON acceptance probe | Missing | Smoke is human-readable stdout only |
| OTP mailbox automation | Missing | No dedicated inbox API |
| Acceptance-summary artifact | Missing | Owner paste is the current evidence path |

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| - | --------------- | -------- | ------ | ----- |
| 1 | Deploy workflow secret resolution and concurrency name | High | Done | Confirmed `deploy-production` + unset secrets |
| 2 | What remote-deploy already proves | High | Done | SHA + isolation + compose build + smoke |
| 3 | Story 19.3 AC vs machine-verifiable dual-layer recaptcha | High | Done | Manual human CAPTCHA solve is the stall |
| 4 | Playwright public UAT + viewports | Medium | Done | Suite exists; not aimed at `uat.cohestra.app` |
| 5 | Mailbox/OTP provider | Medium | Done | Deferred to 45.5 owner external-service gate |

## Timeline of Events

| Time | Event | Source | Confidence |
| ---- | ----- | ------ | ---------- |
| 2026-10-14 | 19.4 closed/frozen after PR #447 + UAT phone fix | `story-19-4-final-uat-closeout.md` | Confirmed |
| 2026-10-15 | 19.1/19.2 closed from live public evidence; main `bdd6d422` | sprint-status + recon investigation | Confirmed |
| 2026-10-15 | 19.3 story written as owner droplet-key gate | `19-3-recaptcha-production-enablement.md` | Confirmed |
| Prior cycle | Public `/signup` 200, no grecaptcha/widget | urllib probe of `https://uat.cohestra.app/signup` | Confirmed |
| Prior cycle | Deploy workflow fails ~7s `missing server host` | GitHub Actions Deploy logs | Confirmed |
| 2026-10-15 | Owner forbids further owner SSH/copy-paste for routine UAT | This request | Confirmed |

## Confirmed Findings

### Finding 1: Tracker next-story algorithm is not the owner next action

**Evidence:** `_bmad-output/implementation-artifacts/sprint-status.yaml` on `bdd6d422` — no `in-progress` stories; `33-7-cinema-house-tour-rebuild: review`; `19-3` and `19-5` `ready-for-dev`.

**Detail:** Default sprint-status recommendation is `code-review` for 33.7. Owner explicitly paused 19.3 manual execution and authorized an enabling epic. 45 is the next free epic number.

### Finding 2: Deploy workflow is a UAT path named as production

**Evidence:** `.github/workflows/deploy.yml:13-15` `concurrency.group: deploy-production`; job name “Deploy to DigitalOcean droplet”; secrets `DROPLET_HOST` / `USER` / `SSH_KEY` / `DEPLOY_PATH`; no `environment:` key.

**Detail:** This is the UAT droplet path (`remote-deploy.sh` → `cohestra-uat`). The concurrency name implies production cutover. Docs (`docs/deploy/github-actions-cd.md:22`) still tell the owner not to upload the workstation SSH key to GitHub, which leaves the workflow permanently secretless.

### Finding 3: Missing secrets fail late and without a named owner gate

**Evidence:** appleboy `host: ${{ secrets.DROPLET_HOST }}` with empty secret → `missing server host` in ~7s. No checkout, no artifact, no `MISSING_SECRET=NAME` line.

**Detail:** Cursor cannot distinguish “secret unset” from “SSH broken” without reading Actions logs, and the owner is currently asked to SSH instead.

### Finding 4: Host deploy/smoke already exists and is reusable

**Evidence:** `deploy/remote-deploy.sh:28-62`, `deploy/uat-smoke.sh`, `deploy/cohestra-uat-guards.sh`, `deploy/validate-uat-isolation.sh`, `deploy/classify-paddle-env.sh`, `deploy/preflight-launch.sh`.

**Detail:** Execution-plane work is mostly wrapping these scripts, emitting sanitized JSON, and uploading artifacts. Do not replace them.

### Finding 5: Story 19.3 current AC requires a human CAPTCHA solve

**Evidence:** `19-3-recaptcha-production-enablement.md:48-52` “Legitimate UAT signup + OTP verify completes”; enterprise AC `epics-cohestra-enterprise.md:1312-1315` “successful signup + OTP verify completes end-to-end” on the live URL.

**Detail:** Solving a real Google reCAPTCHA is a human action. Automating it would be defeating the challenge. Official Google v2 test keys exist and must never be substituted into normal UAT/production.

### Finding 6: Playwright is a local-stack harness, not a UAT acceptance plane

**Evidence:** `web/playwright.config.ts:3-22` — `PUBLIC_BASE_URL` default `http://localhost:8088`; one Chromium desktop project; `trace: on-first-retry`; no 390×844 project; CI workflow does not run `npm run test:e2e` against public UAT.

### Finding 7: Cursor SSH is absent by design and must stay absent

**Evidence:** Cloud Agent has no deploy key; owner policy forbids uploading the workstation key into Cursor; `docs/deploy/github-actions-cd.md:22`.

**Detail:** GitHub Actions may hold a dedicated deploy key on Environment `uat`. Cursor consumes workflow logs and artifacts only.

## Deduced Conclusions

### Deduction 1: Autonomous UAT is feasible without Cursor SSH

**Based on:** Findings 2–4, 7

**Reasoning:** The droplet already runs `remote-deploy.sh`. GitHub Actions already SSHes when secrets exist. The missing pieces are Environment scoping, fail-closed naming, JSON evidence, and a browser/OTP harness.

**Conclusion:** FEASIBLE. One-time owner bootstrap is secret/account setup, not a standing SSH loop.

### Deduction 2: 19.3 should pause until 45.1–45.6 exist, then resume through the pipeline

**Based on:** Findings 5–6, Story 19.3, owner intent

**Reasoning:** Continuing to ask the owner to rebuild web/api and solve CAPTCHA recreates the banned handoff. Dual-layer acceptance is stronger than a single human solve.

**Conclusion:** Course-correct 19.3 AC; do not weaken security; do not mark 19.3 done from planning.

### Deduction 3: Production remains a real owner gate

**Based on:** Epic 19 production NO-GO; `docs/deploy/paddle-production-cutover.md`; live-Paddle refuse in preflight

**Reasoning:** Autonomous UAT ≠ autonomous production. Live money, live Paddle, DNS/cert ownership, and customer-data destruction stay human.

## Hypothesized Paths

### Hypothesis 1: GitHub Environment `uat` can be declared in YAML before secrets exist

**Status:** Confirmed (workflow declaration) / Open (first-run environment creation)

**Theory:** Adding `environment: uat` is an in-repo change. Secret values remain an owner gate.

**Would confirm:** First Deploy UAT run reports `MISSING_SECRET=DROPLET_HOST` (or sibling names) instead of `missing server host`.

**Would refute:** GitHub blocks the job because the environment cannot be created by YAML alone.

**Resolution:** Treat environment creation + secret population as the one-time bootstrap. Code can still land.

### Hypothesis 2: Official Google reCAPTCHA v2 test keys are sufficient for Layer B

**Status:** Open pending 45.6 implementation

**Theory:** Google documents site/secret test keys that always pass/fail without a human challenge. They must run only on CI ephemeral or an isolated automation stack.

**Would confirm:** Isolated stack signup+OTP with test keys; real UAT still rejects empty/invalid tokens and still renders the real widget.

**Would refute:** Product signup cannot complete without a live-domain widget token even on the isolated stack.

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | ------ | ------------- |
| Whether GitHub Environment `uat` already exists | First deploy UX | Owner Settings → Environments (no values) |
| Whether any `DROPLET_*` repo secret is populated | Distinguishes unset vs wrong key | First fail-closed workflow line `MISSING_SECRET=` |
| Dedicated UAT mailbox provider | Blocks 45.5 only | Owner picks after Grok proposes minimal option |
| Live widget after rebuild | 19.3 Layer A | Automated probe after 45.1–45.3 deploy |

## Source Code Trace

| Element | Detail |
| ------- | ------ |
| Error origin | `.github/workflows/deploy.yml:28` empty `secrets.DROPLET_HOST` |
| Trigger | `workflow_run` CI success on `main` or `workflow_dispatch` |
| Condition | No GitHub Environment; secrets unset by policy |
| Related files | `deploy/remote-deploy.sh`, `deploy/uat-smoke.sh`, `docs/deploy/github-actions-cd.md`, `docker-compose.uat.yml`, `GoogleRecaptchaVerifier.cs` |

## Conclusion

**Confidence:** High

The stall is not “UAT cannot be automated.” The stall is a missing execution/evidence plane: Environment-scoped deploy credentials, fail-closed secret names, machine-readable host proof, public Playwright, dedicated OTP mailbox, and a dual-layer recaptcha contract. Existing deploy/smoke/classify/isolation scripts are the reuse core. Cursor must not gain SSH. Production stays NO-GO. Epic 45 is the enabling epic (number 45 is free).

## Recommended Next Steps

### Fix direction

1. Course-correct Story 19.3 to dual-layer machine evidence (no human CAPTCHA solve; no real-challenge defeat).
2. Publish Epic 45 stories 45.1–45.8.
3. Implement 45.1 in-repo immediately (workflow + fail-closed + docs). Live deploy waits on bootstrap names only.
4. Continue 45.2–45.6, then resume 19.3 through the pipeline.

### Diagnostic

First post-45.1 Deploy UAT run: read `MISSING_SECRET=` lines. If none, read deployed SHA from artifacts. Never ask the owner to paste droplet stdout.

## Reproduction Plan

1. Merge a no-op or 45.1 change to a branch and inspect the workflow YAML contract in CI (`deploy-uat`, `environment: uat`, fail-closed script test).
2. After owner populates Environment `uat` secrets, a green main CI should enqueue Deploy UAT without owner SSH.
3. After 45.2, the same run uploads `uat-acceptance.json`.

## Side Findings

- `workflow_run` jobs must pin `github.event.workflow_run.head_sha`, not `github.sha` (GitHub documents `github.sha` as default-branch HEAD for `workflow_run`).
- Current deploy script interpolates `DROPLET_DEPLOY_PATH` into the appleboy `script:` body; pass via `envs` instead so Actions logs do not embed secret expansions.
- Action item `Enable reCAPTCHA keys before public signup` remains a real owner bootstrap for *real UAT keys*; Layer A verifies they are present without asking for values.

## Follow-up: 2026-10-15

### New Evidence

Owner authorized Epic 45 and forbade further owner SSH prompts for routine UAT.

### Updated Conclusion

Proceed to correct-course + architecture + epic/story creation + 45.1 implementation. Do not mark 19.3 done.
