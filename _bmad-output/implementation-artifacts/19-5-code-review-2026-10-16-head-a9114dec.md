---
story: 19.5
head: a9114dec16ee7cdbfb1b78a420bc929210ece0c6
reviewer: grok-4.6
date: 2026-10-16
---

# Exact-HEAD review — 19.5 git fetch retry `a9114dec`

## Scope

- `.github/workflows/deploy.yml` SSH: 6× `git fetch origin` with
  `GIT_HTTP_LOW_SPEED_*` and 20s backoff
- `deploy/remote-deploy.sh` same retry
- deploy-uat workflow contract

Does not touch Paddle, billing, or production.

## Findings

| Sev | Finding | Disposition |
| --- | ------- | ----------- |
| BLOCKER | none | — |
| MAJOR | none | — |
| MINOR | Retries cannot repair persistent droplet DNS | accepted — live `/ready` is Healthy again; this merge retriggers Deploy UAT; operator SSH is not available here |
| NIT | `sleep 20` × 6 adds up to ~2m on total failure vs previous ~10m hang | accepted |

Checked: SHA pin/EXPECTED_SHA unchanged; `git fetch origin "$DEPLOY_BRANCH"` still present for contracts; no secret printing.

## Verdict

PASS — BLOCKER=0, MAJOR=0. Story 19.5 stays OPEN. Production NO-GO.
