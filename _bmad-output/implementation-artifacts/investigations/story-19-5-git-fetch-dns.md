---
story: 19.5
slug: story-19-5-git-fetch-dns
date: 2026-10-16
status: open
deploy_uat: 38939912298
head: 12925d69a7a2658831d30f8f705feb59e6001c07
---

# Case: Deploy UAT git fetch could not resolve github.com

## Stronghold (Confirmed)

Deploy UAT `38939912298` SSH failed in ~10m with git status 128:

`Could not resolve host: github.com`

`command_timeout` was 60m; compose never started. Sequential build from PR #466 therefore did not run on the droplet.

Live `https://uat.cohestra.app/ready` later returned Healthy (old stack recovered). `gh workflow dispatch` is 403 from this agent.

## Repair

Retry `git fetch origin` 6 times with `GIT_HTTP_LOW_SPEED_*` abort. Next merge retriggers Deploy UAT. Production NO-GO.
