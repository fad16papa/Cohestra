# Epic 19 — UAT access + config readiness

**Date:** 2026-09-06  
**Verdict:** **SSH ACCESS PASS** (owner-proven 2026-09-06). Live docker exec still requires the owner `deploy@` session — this Cloud Agent has no key.

This Cloud Agent VM has no `~/.ssh/cohestra_uat`, no `ssh-agent`, and no local `.env`. That is correct. The private key must not be copied here.

## Public evidence (no SSH)

Documented existing droplet `129.212.235.2` (`docs/deploy/client-domain-thesocialcollectivesg.md`):

| Check | Result |
|-------|--------|
| TCP 22 / 80 / 443 | OPEN |
| `http://129.212.235.2/ready` | 200 Healthy (postgres + redis) |
| `https://129.212.235.2/ready` | 200 Healthy |
| `https://thesocialcollectivesg.com/ready` | 200 Healthy |
| `https://129-212-235-2.nip.io/ready` | 200 Healthy |
| SSH without owner key | `Permission denied (publickey)` for `ubuntu` and `deploy` |

The stack is already up. Story 19.1 is now: prove SSH, audit, reconcile `.env`, deploy **current `main`**, smoke. Not “create a droplet.”

## 1. SSH access status

| Item | Status |
|------|--------|
| Owner key `~/.ssh/cohestra_uat` on this VM | MISSING (required) |
| ssh-agent on this VM | MISSING |
| Key-based login from this VM | FAIL (expected) |
| Server offers publickey only | PASS |

Acceptance script (run on the **owner workstation**): `deploy/uat-ssh-accept.sh`

## 2. Server access prerequisites

- Existing droplet (do not create another)  
- Non-root deploy user with sudo  
- Public key only in that user’s `~/.ssh/authorized_keys`  
- Private key never on the server or in git  
- DigitalOcean console as lockout recovery  

Deploy user is **`deploy`** (owner-proven). Do not use `root`. `NOPASSWD: ALL` is not required.

Do **not** put `cohestra_uat` into GitHub `DROPLET_SSH_KEY`. 19.1 deploys from the owner workstation. Existing `deploy.yml` CI path is a separate, older model.

## 3. Local → UAT env classification

Baseline: owner’s current local `.env` (not present on this VM). Run `bash deploy/classify-uat-env.sh` locally.

| Action | Keys |
|--------|------|
| **PRESERVE** | `Paddle__ApiKey`, `Paddle__ClientToken`, `Paddle__Environment`, four `Paddle__Price*`, `Paddle__TrialPeriodDays`, `SendGrid__*`, sender/branding names, `JWT_ISSUER` / `AUDIENCE`, `POSTGRES_DB` / `USER`, existing droplet `POSTGRES_PASSWORD` and `JWT_SIGNING_KEY` if the volume already has data |
| **CHANGE FOR UAT** | `PUBLIC_BASE_URL`, `NEXT_PUBLIC_PADDLE_RETURN_ORIGIN`, `EmailBranding__WebsiteUrl`, CORS / `PublicWeb__BaseUrl` (compose binds these to `PUBLIC_BASE_URL`), HTTPS/nip.io/domain vars, **`Paddle__WebhookSecret` only if the notification destination URL changes** |
| **DEFER** | reCAPTCHA (19.3), Intelligence synthesis key |
| **REMOVE LOCAL-ONLY** | `DEV_TENANT_SLUG`, `OperatorSeed__*`, `DemoDataSeed__Enabled`, `LoadTestSeed__*`, `PlatformAdminSeed__*`, host port overrides, recaptcha test bypass |

Compose UAT already uses Docker DNS for postgres/redis. Do not paste `Host=localhost` connection strings onto the droplet.

## 4. Paddle sandbox preservation

**PRESERVE** the existing sandbox account, API key, client token, prices, `Environment=sandbox`. No live keys. No duplicate products/prices.

## 5. Webhook route preservation

**KEEP** `POST /api/v1/system/paddle/webhook`. Same server implementation for local and UAT. Do not add a second Cohestra route.

## 6. Notification destination reuse

Cannot read the Paddle dashboard from this VM (no API key here).

Rule:

- If the existing sandbox destination URL **already is** the intended UAT HTTPS webhook (`https://<uat-host>/api/v1/system/paddle/webhook`) → **REUSE** it and its secret.  
- If it points at ngrok / localhost / a dead host → keep the same account and Cohestra route; **update or add** the sandbox destination for the UAT URL; use **that** destination’s secret.  
- Do not create extras for neatness.  
- Full checkout/webhook acceptance remains **19.4**.

## 7. SendGrid readiness

On this VM: **MISSING**. Policy: **PRESERVE** the existing local SendGrid key and from-addresses onto the droplet `.env` (already required for UAT compose). Do not paste the key into chat. Classify locally: `SendGrid__ApiKey` → PRESENT / MISSING only.

The live droplet `/ready` is Healthy, so a SendGrid key is almost certainly already on that box. 19.1 must not rotate it.

## 8. Remaining owner actions

On the **owner workstation** only:

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/cohestra_uat
UAT_SSH_USER=YOUR_DEPLOY_USER bash deploy/uat-ssh-accept.sh
bash deploy/classify-uat-env.sh
```

Do not paste: private key, passphrase, Paddle/SendGrid/JWT secrets.

Optional: confirm deploy username if it is not `ubuntu`.

## 9. Port isolation (locked)

Cohestra shares the physical droplet only. It must use project `cohestra-uat`, network `cohestra_uat_internal`, dedicated volumes, and loopback host binds `3100` / `5100` / `8180`. Postgres/Redis: no host ports.

**Do not deploy** until `bash deploy/uat-port-audit.sh` on the droplet proves those loopback ports free. See `epic-19-uat-port-isolation-2026-09-06.md`.

## 10. Story 19.1 next executable action

**Owner:** run `uat-ssh-accept.sh` until PASS.

**Then (still on the workstation):** `uat-port-audit.sh` → freeze port plan → classify droplet `.env` (no dump) → deploy isolated `cohestra-uat` (never `-p cohestra-infra-uat`) → `uat-smoke.sh` → existing-app regression → resource/log review.

This agent continues the moment SSH from an agreed path works. It will not accept a private key paste.

## 11. Secret exposure

No secret values were written to this file, git, or chat. Droplet `/ready` JSON contains only postgres/redis health. SSH probe used `IdentitiesOnly` and `/dev/null` as a non-key (expected deny).
