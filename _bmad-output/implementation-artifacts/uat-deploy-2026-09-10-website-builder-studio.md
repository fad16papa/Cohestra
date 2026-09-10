# UAT Deploy — Website Builder Studio Revamp

**Date:** 2026-09-10  
**Target:** `https://uat.cohestra.app`  
**Branch:** `main` @ `865b680` (includes PR #305 Website Builder studio + story 33-13)

## Release contents

- Website Builder studio workspace (Build / Split / Preview)
- Bounded live preview viewport
- Compact publish readiness
- Add section dialog (Core / Studio)
- Section → preview scroll anchors
- Dev CSP allows `localhost:8080` (dev only; UAT uses production CSP)

## Pre-deploy status

| Check | Result |
|-------|--------|
| `main` CI (865b680) | PASS |
| UAT isolation contract | PASS |
| Web vitest (218) | PASS |
| `https://uat.cohestra.app/ready` | Healthy (pre-deploy) |
| Cloud Agent SSH | **BLOCKED** — no `cohestra_uat` key |
| GitHub Actions deploy | **BLOCKED** — `DROPLET_HOST` secret missing |

## Deploy procedure (owner workstation)

```bash
cd /path/to/Cohestra
git checkout main && git pull origin main
bash deploy/prepare-uat-release.sh

eval "$(ssh-agent -s)"
ssh-add ~/.ssh/cohestra_uat
bash deploy/uat-deploy-from-workstation.sh
```

Expected on droplet: `remote-deploy.sh` → `git reset --hard origin/main` → `uat-compose.sh up -d --build` → `uat-smoke.sh`.

## Post-deploy verification

1. `curl -fsS https://uat.cohestra.app/ready`
2. Operator login → `/dashboard/website`
3. Confirm Build / Split / Preview workspace bar
4. Confirm preview scrolls inside pane (not full-page height)
5. Publish flow smoke (draft save, preview, readiness)

## Alternative: GitHub Actions

Configure repository secrets: `DROPLET_HOST`, `DROPLET_USER`, `DROPLET_SSH_KEY`, optional `DROPLET_DEPLOY_PATH=/home/deploy/cohestra`.

Then: **Actions → Deploy → Run workflow** (after CI green on main).

## Rollback

On droplet:
```bash
cd /home/deploy/cohestra
git reset --hard <previous-sha>
bash deploy/uat-compose.sh up -d --build
bash deploy/uat-smoke.sh
```
