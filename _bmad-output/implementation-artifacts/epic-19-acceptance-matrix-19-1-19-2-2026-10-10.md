# Stories 19.1 / 19.2 acceptance matrix — 2026-10-10

**Authorized main SHA to deploy (when owner says so):** `f293650d` (or later owner-approved `origin/main`).  
**Required CI on `f293650d`:** SUCCESS run `38065729824`.  
**Production:** NO-GO. **This matrix:** preparation only. No story marked PASS/done.

Statuses used: PASS / FAIL / PARTIAL / BLOCKED / MANUAL / NOT RUN.

## 19.1 — UAT droplet deploy and stack smoke

| Gate | Status | Evidence / remaining |
|------|--------|----------------------|
| Clean authorized `main` + required CI | **PASS** (repo) | `f293650d`; CI `38065729824` |
| Isolated project `cohestra-uat` | **PASS** (repo contract) | `docker-compose.uat.yml`, `uat-compose.sh` refuses other `-p` |
| Port/network isolation scripts | **PASS** (repo) | `uat-port-audit.sh`, `validate-uat-isolation.sh`; edge attach without recreate |
| Preflight / rollback docs | **PASS** (repo) | `preflight-launch.sh`, `remote-deploy.sh` hard-reset to `origin/main`, edge backups |
| Owner SSH acceptance | **BLOCKED** | Cloud Agent: no `~/.ssh/cohestra_uat`. Workstation: `uat-ssh-accept.sh` |
| Deployed SHA on droplet | **BLOCKED** | No SSH. Public `/ready` does not expose SHA. After deploy: `git rev-parse HEAD` must equal authorized main; `remote-deploy.sh` exports `GIT_SHA` |
| Compose up isolated stack | **BLOCKED** | Needs owner deploy auth + SSH |
| Docker health (uat postgres/redis/web/api/nginx) | **BLOCKED** | Droplet `docker ps` / compose ps |
| `uat-smoke.sh` | **BLOCKED** | `PUBLIC_BASE_URL=https://uat.cohestra.app` |
| EF migrations on Cohestra volume only | **BLOCKED** | API startup; do not touch existing-app DB volumes |
| Seeds off / no `DEV_TENANT_SLUG` | **BLOCKED** | `classify-uat-env.sh` on droplet (no secret print) |
| Public `/ready` Healthy | **PASS** (infra probe) | 200 postgres+redis+default-tenant — **not** SHA-proven |
| Existing-app regression | **FAIL** (TLS) / **PARTIAL** (process) | `thesocialcollectivesg.com` leaf expired 2026-10-01; insecure `/ready` Healthy. `verify-existing-app.sh` will FAIL until renew. Do not recreate that stack. |
| Firewall 22/80/443 | **MANUAL** | Droplet / DO firewall; not visible here |
| Product acceptance + BMAD close | **NOT RUN** | Do not close 19.1 |

## 19.2 — HTTPS edge and security headers

| Gate | Status | Evidence / remaining |
|------|--------|----------------------|
| UAT wildcard SAN | **PASS** (public) | `uat.cohestra.app` + `*.uat.cohestra.app` to 2026-12-13 |
| HTTP → HTTPS | **PASS** (public) | `http://uat.cohestra.app/ready` → 301 HTTPS |
| HSTS | **PASS** (public) | `Strict-Transport-Security: max-age=31536000` |
| Security headers once | **PASS** (public) | XFO, XCTO, Referrer-Policy, Permissions-Policy, CSP each once on `/` and `/ready` |
| Tenant SNI / Host routing | **PASS** (public) | `creativorare.uat.cohestra.app` 200, same wildcard, `X-Cohestra-Edge-Vhost: uat` |
| Shared-app TLS trust | **FAIL** | Expired leaf; see `epic-19-shared-tls-recovery-2026-10-10.md` |
| `prove-edge-tls-wildcard.sh` | **BLOCKED** | Needs SSH |
| `verify-security-headers.sh` | **BLOCKED** | Needs SSH / owner run |
| Renewal approach (UAT wildcard) | **MANUAL-ACCEPTED** (story) | DNS-01; do not auto-renew via HTTP-01 |
| Renewal approach (existing site) | **PREPARED / NOT RUN** | HTTP-01 `--cert-name thesocialcollectivesg.com` only; reload not recreate |
| Product acceptance + BMAD close | **NOT RUN** | 19.2 stays `review` |

## Owner workstation — SSH then (only if authorized) deploy

```bash
# On the OWNER workstation, from a Cohestra checkout
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/cohestra_uat
UAT_SSH_USER=deploy bash deploy/uat-ssh-accept.sh
```

Do **not** run the next block until the owner explicitly authorizes UAT deploy of `f293650d` (or a later approved main SHA):

```bash
# Still on the workstation. Confirms local main first:
git fetch origin main
git rev-parse origin/main    # must be the authorized SHA
bash deploy/uat-deploy-from-workstation.sh
```

On the droplet after deploy:

```bash
cd /home/deploy/cohestra
git rev-parse HEAD           # must equal authorized origin/main
bash deploy/classify-uat-env.sh
bash deploy/classify-paddle-env.sh   # expect SANDBOX; refuse LIVE
PUBLIC_BASE_URL=https://uat.cohestra.app bash deploy/uat-smoke.sh
bash deploy/host-proxy/verify-existing-app.sh
bash deploy/host-proxy/prove-edge-tls-wildcard.sh
```

Never set `COHESTRA_ALLOW_LIVE_PADDLE=1`. Never put live Paddle keys on UAT.
