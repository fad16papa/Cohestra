---
story: 19.5
head: 523adc05f0fe3afdbb5ab6e57806d07619642cf5
reviewer: grok-4.6
date: 2026-10-16
---

# Exact-HEAD review — 19.5 sequential UAT build `523adc05`

## Scope

- `deploy/remote-deploy.sh`: `build api` → `build web` → `up -d --no-build`
- `.github/workflows/deploy.yml`: `command_timeout: 60m`
- isolation + deploy-uat workflow contracts
- investigation of Deploy UAT `38934206918`

Does not touch Paddle, billing, operator credentials, or production.

## Findings

| Sev | Finding | Disposition |
| --- | ------- | ----------- |
| BLOCKER | none | — |
| MAJOR | none | — |
| MINOR | Sequential compile can still take most of 60m on a cold 4 GB host | accepted — the 30m failure was a hang during parallel publish, not a finished 31m build; sequential avoids the OOM/thrash |
| MINOR | `up --no-build` will not rebuild nginx if its Dockerfile changes | accepted — nginx is an image, not a local build in `docker-compose.uat.yml` |
| NIT | Comment in remote-deploy avoids the exact `up -d --build` string so the isolation grep stays honest | accepted |

Checked: no production deploy workflow; concurrency still `deploy-uat`; SHA pin/EXPECTED_SHA unchanged; no secret printing; protected tenants not suspended.

## Verdict

PASS — BLOCKER=0, MAJOR=0. Story 19.5 stays OPEN. Production NO-GO.
Live UAT `/ready` was left unreachable by the killed parallel build; the next
Deploy UAT after this merge must restore it.
