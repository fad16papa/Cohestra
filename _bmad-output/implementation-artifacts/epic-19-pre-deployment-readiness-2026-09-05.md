# Epic 19 pre-deployment readiness

**Date:** 2026-09-05  
**HEAD this report was written against:** `f907c24` (`main`) plus this branch’s UAT compose / preflight patches  
**Verdict:** **PASS** — repo contract is ready. 19.1 is blocked only on owner credentials.

Cinema, Epic 25, and Epic 34 stay frozen. Do not reopen them for launch.

This is **not** 19.1 done. PASS means the droplet can be created and smoked from artifacts already in the repo. It does not mean a live UAT URL exists.

## Prepared (in repo)

| Item | Canonical artifact |
|------|--------------------|
| UAT environment contract | `docs/deploy/digitalocean-uat.md`, `docker-compose.uat.yml` |
| Deployment checklist | `docs/deploy/enterprise-launch-checklist.md` § Deploy |
| Env / secrets matrix | `.env.uat.example` + this document |
| Migration sequence | EF on API startup (see below) |
| Smoke test script | `deploy/uat-smoke.sh` (`--full` for tenant door) |
| Preflight | `deploy/preflight-launch.sh` (`--strict-recaptcha` from 19.3) |
| Rollback procedure | This document + `docs/deploy/digitalocean-uat.md` § Backup |
| Operator UAT checklist | `docs/deploy/enterprise-launch-checklist.md` § Core operator flows (Story 19.5) |
| Evidence checklist | This document, 19.1 section |
| Bootstrap | `deploy/uat-bootstrap.sh` |
| HTTPS (after 19.1) | `docs/deploy/temporary-https-nipio.md`, `deploy/setup-temporary-https.sh` |
| SendGrid runbook | `docs/deploy/sendgrid-production.md` |
| Paddle sandbox runbook | `docs/deploy/production-droplet-setup.md`, `docs/deploy/paddle-sandbox-local-checkout.md` |

## Owner must provide

Do **not** invent a droplet. Do **not** commit secrets. Paste values only into the droplet `.env`.

1. **DigitalOcean access / SSH** — either:
   - existing UAT droplet host + SSH user/key, or
   - DigitalOcean API token + permission to create the UAT droplet
2. **SendGrid UAT/live Mail Send key** — `SendGrid__ApiKey` plus verified `SendGrid__FromEmail` / `SendGrid__RegistrationFromEmail` ([sendgrid-production.md](../../docs/deploy/sendgrid-production.md)). Production compose will not start without this.
3. **Paddle sandbox credentials** (needed for 19.4; 19.1 can start without them):
   - `Paddle__ApiKey` (`pdl_sdbx_…`)
   - `Paddle__ClientToken` (`test_…`)
   - `Paddle__WebhookSecret`
   - `Paddle__PriceCoreMonthly` / `Annual`, `Paddle__PriceProMonthly` / `Annual`
   - `Paddle__Environment=sandbox`
4. **reCAPTCHA UAT credentials** (needed for 19.3; 19.1 can start with reCAPTCHA off):
   - `SelfServeSignup__Recaptcha__SecretKey`
   - `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
   - then `SelfServeSignup__Recaptcha__Enabled=true` and `NEXT_PUBLIC_RECAPTCHA_ENABLED=true` and rebuild `web`

Also generate on the droplet (not owner-supplied, but required in `.env`):

| Variable | How |
|----------|-----|
| `POSTGRES_PASSWORD` | `openssl rand -base64 24` — not `crm` |
| `JWT_SIGNING_KEY` | `openssl rand -base64 48` — ≥32 chars |
| `PUBLIC_BASE_URL` | `http://DROPLET_IP` until 19.2 HTTPS |

Never set `DEV_TENANT_SLUG`. Keep `DemoDataSeed__Enabled` and `OperatorSeed__Enabled` false (compose defaults). Create the first operator at `/register`.

**Stripe keys must not be set.** Epic 29 cancelled Stripe. Preflight now fails if `Stripe__*` is present.

## Recommended droplet

From `docs/deploy/digitalocean-uat.md` — do not resize below this:

| Setting | Recommendation |
|---------|----------------|
| OS | Ubuntu 22.04 or 24.04 LTS |
| Size | **2 GB RAM / 1 vCPU** minimum (4 GB recommended for campaigns + image builds) |
| Region | Closest to operators (Philippines → Singapore or Bangalore) |
| Backups | Enable weekly droplet backups before UAT |
| Firewall inbound | **22, 80, 443 only** — never 5432, 6379, 3000, 8080 |

Topology: nginx (`:80`/`:443`) → web `:3000` + api `:8080` → postgres + redis on the Docker network, bound to `127.0.0.1` only.

## Env / secrets matrix

| When | Must be set | May wait |
|------|-------------|----------|
| 19.1 first `compose up` | `PUBLIC_BASE_URL`, `POSTGRES_PASSWORD`, `JWT_SIGNING_KEY`, `SendGrid__ApiKey` + from-addresses | Paddle, reCAPTCHA |
| 19.2 HTTPS | `LETSENCRYPT_EMAIL` + domain or nip.io vars | — |
| 19.3 signup | reCAPTCHA site + secret; rebuild web | — |
| 19.4 billing | all `Paddle__*` sandbox values; webhook URL `https://{domain}/api/v1/system/paddle/webhook` | live Paddle keys (public launch only) |

`docker-compose.uat.yml` now forwards `Paddle__*` into the API container (same as local `docker-compose.yml`). Empty values are fine for 19.1.

## Migration sequence

1. `docker compose -f docker-compose.uat.yml up -d --build`
2. API container starts only after postgres and redis are healthy.
3. **EF migrations apply automatically on API startup.** Do not run `dotnet ef database update` by hand on the droplet unless recovering a failed start.
4. Catalog backfill `20260811160000_BackfillActivityCatalogPerTenant` is irreversible (`Down()` is a no-op). Take a `pg_dump` before the first production-shaped deploy if the volume already has data.
5. Confirm with `curl "$PUBLIC_BASE_URL/ready"` → `"status":"Healthy"`.

## Smoke

On the droplet after `.env` is filled:

```bash
bash deploy/preflight-launch.sh
docker compose -f docker-compose.uat.yml up -d --build
PUBLIC_BASE_URL=http://DROPLET_IP bash deploy/uat-smoke.sh
# When using apex or bare IP, set SMOKE_TENANT_HOST to a real tenant host for --full:
# SMOKE_TENANT_HOST=creativorare.YOUR_HOST PUBLIC_BASE_URL=… bash deploy/uat-smoke.sh --full
```

19.1 AC: script exits 0 for `/ready`, web home, auth onboarding, signup/pricing surfaces.

## Rollback

1. **App only:** `git fetch && git checkout <known-good-sha>` then `docker compose -f docker-compose.uat.yml up -d --build`.
2. **Data:** restore the latest `pg_dump` from `docs/deploy/digitalocean-uat.md` § Backup Postgres. Do not rely on EF `Down()` for the catalog backfill.
3. **DNS / HTTPS:** keep the previous `active-ssl.conf` / certbot volume if 19.2 already ran; switching domain uses `deploy/switch-https-domain.sh`.
4. **Logs:** `docker compose -f docker-compose.uat.yml logs -f nginx api web`.

## Operator UAT checklist (19.5 — after live URL)

From `docs/deploy/enterprise-launch-checklist.md` § Core operator flows, on at least one Basic and one Pro tenant:

1. Dashboard metrics load  
2. Create activity → publish → share kit  
3. Public registration + client dedup  
4. Reports + CSV export (Pro)  
5. Campaign send test (Pro) with tenant email branding  
6. Website builder publish (Pro) or stub home (Basic)  
7. Suspended/archived tenant → maintenance or 404 on public door  

## Evidence checklist (19.1 close)

Record these before marking 19.1 done. Mandatory Code Review Loop still applies, plus real-environment evidence.

- [ ] Droplet size/region/backups match the table above  
- [ ] Firewall is 22/80/443 only  
- [ ] `preflight-launch.sh` passed (reCAPTCHA may warn until 19.3)  
- [ ] `docker compose -f docker-compose.uat.yml ps` all healthy  
- [ ] `uat-smoke.sh` exit 0 (paste output, redact secrets)  
- [ ] `/ready` Healthy  
- [ ] `DemoDataSeed__Enabled=false`, `OperatorSeed__Enabled=false`, `DEV_TENANT_SLUG` unset  
- [ ] First operator created via `/register` (or documented one-time seed then disabled)  
- [ ] DNS: IP-only, nip.io, or apex+wildcard — documented which  

## Sequence after credentials arrive

1. **19.1** — provision + `.env` + compose up + `uat-smoke.sh`  
2. **19.2** — HTTPS + `verify-security-headers.sh`  
3. **19.3** — reCAPTCHA on + rebuild web + apex signup  
4. **19.4** — Paddle **sandbox** only  
5. **19.5** — operator §7 + sign-off table  

## Stop

Work stops here until the owner provides item 1 (DigitalOcean / SSH) and item 2 (SendGrid). Items 3–4 can follow after the stack is up.

This Cloud Agent VM has no Docker daemon and no DO token. Routine engineering resumes immediately after access is granted.
