---
story: 19.5
slug: story-19-5-uat-ssh-timeout
date: 2026-10-16
status: open
deploy_uat: 38934206918
head: 93892675c63e083cfd0081f04cc010155f089214
---

# Case: Deploy UAT SSH command timeout mid image rebuild

## Stronghold (Confirmed)

Deploy UAT `38934206918` on `93892675` (PR #465 merge):

- Post-merge CI 5/5 green.
- SSH `command_timeout: 30m` (`INPUT_COMMAND_TIMEOUT: 30m`).
- 16:44:02 both `cohestra-uat-api` and `cohestra-uat-web` Building.
- 16:44:06 `dotnet publish` (api `#30`).
- 16:44:11 `next build` (web `#31`).
- No further build output until `17:13:55 Run Command Timeout`.
- Browser acceptance skipped. Live `/ready` then timed out.

## H1 — Parallel on-droplet compile exhausted the 4 GB / 0-swap host (Confirmed)

Port audit on the same job: "Host has no swap" and "Prefer sequential / off-host image builds". `remote-deploy.sh` ran `uat-compose.sh up -d --build`, which builds api and web together.

## Repair

Sequential `build api` then `build web` then `up -d --no-build`. Raise SSH `command_timeout` to 60m. Do not resize the droplet. Production NO-GO.

## Follow-on (Confirmed) — Deploy UAT `38939912298`

Sequential YAML was on GHA (`command_timeout: 60m`) but the droplet never reached compose:

`fatal: unable to access 'https://github.com/fad16papa/Cohestra.git/': Could not resolve host: github.com` (git status 128).

Likely leftover DNS from the previous parallel-build OOM. Live `/ready` later returned Healthy (old stack recovered). `gh workflow dispatch` is 403 from this agent; next merge retriggers Deploy UAT. Git fetch now retries 6× with low-speed abort.
