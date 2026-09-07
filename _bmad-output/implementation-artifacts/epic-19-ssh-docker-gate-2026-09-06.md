# Epic 19 — SSH / Docker / live-discovery gate

**Date:** 2026-09-06  
**Owner evidence:** interactive `deploy@ubuntu-s-2vcpu-4gb-sgp1` (`129.212.235.2`)

## Verdicts

| Gate | Result |
|------|--------|
| SSH ACCESS | **PASS** — user `deploy`, groups `deploy sudo users docker`, interactive sudo proven |
| DOCKER DEPLOY ACCESS | **PASS** — `docker ps` without sudo; Compose v5.2.0 |
| EXISTING APP BASELINE | **PASS** — five `lead-generation-crm-*` containers healthy; public `/ready` 200 Healthy |
| LIVE EDGE DISCOVERY | **NOT YET** — this Cloud Agent has no owner SSH key (correct) |
| EDGE NETWORK | **NOT YET** — attach only after discover + backup on the droplet |
| COHESTRA INTERNAL DEPLOYMENT | **NOT YET** |
| SHARED UAT HOSTING | **PASS** (light UAT only) |
| HOST PATCH / REBOOT | **DEFERRED** — not a 19.1 blocker. Do not apt upgrade / reboot now |
| PASSWORDLESS SUDO | **NOT REQUIRED** — `uat-ssh-accept.sh` no longer fails on `sudo -n` |
| PR #294 MERGE | **BLOCKED** |

## Deploy-user capability (owner-proven)

- non-root: `deploy`
- sudo group + interactive `sudo whoami` → root
- docker group + `docker ps` without sudo
- `docker compose version` → v5.2.0
- Existing containers (Up ~2 months, healthy): nginx (0.0.0.0:80/443), web, api, postgres (127.0.0.1:5432), redis (127.0.0.1:6379)

## Public re-check from this agent (2026-09-06)

- `http://129.212.235.2/ready` → 200, status Healthy
- `https://thesocialcollectivesg.com/ready` → 200, status Healthy
- SSH from this VM: `Permission denied (publickey)` (expected; no key here)

## Live discovery boundary

Scripts to run **on the already-open `deploy@` session** after pulling this PR branch:

```bash
bash deploy/host-proxy/live-19-1.sh discover
bash deploy/host-proxy/live-19-1.sh backup
bash deploy/host-proxy/live-19-1.sh attach
```

Do not start Cohestra until those pass and UAT `.env` is reconciled (hostname still unknown here; no local `.env` on this VM). Preserve Paddle sandbox and SendGrid. Never print secrets.

## Secret exposure

No private key, passphrase, deploy password, Paddle, SendGrid, JWT, or DB secret was requested or printed.
