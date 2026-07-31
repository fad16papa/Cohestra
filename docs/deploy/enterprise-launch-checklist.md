# Enterprise launch checklist (Cohestra multi-tenant)

Use before **public launch** or handing a production/UAT environment to operators. Focus: **multi-tenant isolation**, **self-serve signup safety**, **billing**, and **evidence-based sign-off**.

Supersedes the single-operator **[UAT polish checklist](./uat-polish-checklist.md)** for Cohestra Enterprise. That doc remains useful as historical reference for Platform 0.

**Related docs:** [SendGrid production setup](./sendgrid-production.md) · [DigitalOcean UAT](./digitalocean-uat.md) · [GitHub Actions CD](./github-actions-cd.md) · [Cloud / mobile testing](./cloud-mobile-testing.md) · [Database tools](./database-tools.md)

---

## Local Docker verify

Add to your hosts file (Windows: `C:\Windows\System32\drivers\etc\hosts`):

```
127.0.0.1 creativorare.localhost
127.0.0.1 cohestra.app
```

Start stack:

```bash
cp .env.example .env   # edit secrets as needed
docker compose build web api --no-cache   # after Dockerfile or dependency changes
docker compose up -d
```

| Surface | URL | Pass criteria |
|---------|-----|---------------|
| Tenant site (default) | `http://default.localhost:8088/` | Public door active; admin login works |
| Tenant site (UAT tenant) | `http://creativorare.localhost:8088/` | Door active; activities/register flow |
| Marketing apex | `http://cohestra.app:8088/` | Midnight Atelier marketing home |
| Pricing / signup | `http://cohestra.app:8088/pricing` | 200; self-serve signup UI |
| Platform admin | `http://localhost:8088/platform` | Platform admin login + tenant directory |

**Smoke script (automated):**

```bash
PUBLIC_BASE_URL=http://localhost:8088 API_BASE=http://localhost:8088 \
  TENANT_HOST=default.localhost:8088 \
  bash deploy/local-smoke-run.sh
```

Optional apex check is included when `PUBLIC_BASE_URL` is set (see script section *Enterprise apex*).

**Bootstrap reference:** [deploy/uat-bootstrap.sh](../../deploy/uat-bootstrap.sh) for seeded tenant + operator on fresh volumes.

---

## Isolation & security

- [ ] CI **SM-1** gate green on `main` (TenantIsolation trait — unit + integration jobs)
- [ ] GitHub **branch protection** requires SM-1 checks before merge to `main` (ops manual step)
- [ ] Cross-tenant admin GET returns **404/403**, never foreign payload
- [ ] Public site / door on Tenant A Host does **not** expose Tenant B slug, name, or activities
- [ ] `GET /api/v1/public/activities/{foreignSlug}` on Tenant A Host returns **404**
- [ ] `POST /api/v1/public/registrations` with Tenant B activity slug on Tenant A Host returns **404** (fail-closed)
- [ ] JWT minted on `{slug}.localhost` is scoped to that tenant; platform routes reject tenant JWTs
- [ ] No client-trusted `X-Tenant-Id` — Host + JWT only (AD-3)
- [x] **P1 shipped (Story 17.3):** Member JWT → 403 on admin-only routes; tenant JWT → 403 on `/platform/*`; platform admin positive control
- [x] **P1 shipped (Story 17.4):** Operator auth OTP verify throttling (`/api/v1/auth/verify-email`, `/reset-password`); refresh revoke-all on credential change; production secret validation; security headers (nginx + Next.js); OpenAPI dev-only; HtmlSanitizer ≥ 9.0.892

Run SM-1 locally (Postgres + Redis required):

```bash
dotnet test src/Api.IntegrationTests --filter "Category=TenantIsolation"
```

---

## Signup & abuse

- [ ] **reCAPTCHA enabled** before public signup (`SelfServeSignup__Recaptcha__Enabled=true` + keys in `.env`)
- [ ] Web build receives `NEXT_PUBLIC_RECAPTCHA_*` vars (rebuild web after changing)
- [ ] Public signup rate limits configured (`PublicSignupRateLimit` in appsettings / env)
- [ ] OTP verify flow tested end-to-end on apex `/pricing` or signup route
- [x] **P1 shipped (Story 17.2):** Signup OTP verify brute-force throttling + abuse integration tests
- [x] **P1 shipped (Story 17.1):** Auth handoff uses one-time server code exchange (`POST /api/v1/auth/handoff/exchange`) — no JWTs in URL hash

See [cloud-mobile-testing.md](./cloud-mobile-testing.md) for reCAPTCHA env blocks.

---

## Billing

- [ ] Stripe **test** keys on UAT; **live** keys only on production droplet
- [ ] `Stripe__WebhookSecret` matches Stripe Dashboard endpoint for deploy URL
- [ ] Customer Portal return URL uses live HTTPS apex or tenant subdomain
- [ ] Core / Pro price IDs match Stripe products (`Stripe__PriceCore*`, `Stripe__PricePro*`)
- [ ] Trial / delinquency jobs run (Epic 14.8) — verify logs after test checkout

---

## Deploy (production / UAT droplet)

- [ ] Droplet provisioned (Ubuntu 22.04+, 2 GB+ RAM, backups enabled)
- [ ] DigitalOcean firewall: **22, 80, 443 only** (no 5432/6379/3000/8080)
- [ ] DNS: apex `cohestra.app`, wildcard `*.cohestra.app` → droplet (or documented nip.io interim)
- [ ] `.env` filled with strong secrets (not dev defaults) — copy from [.env.uat.example](../../.env.uat.example)
- [ ] `docker compose -f docker-compose.uat.yml up -d --build` succeeds
- [ ] `bash deploy/uat-smoke.sh` passes on server
- [ ] `curl ${PUBLIC_BASE_URL}/ready` healthy (postgres + redis)
- [ ] HTTPS — [temporary-https-nipio.md](./temporary-https-nipio.md) or client domain
- [ ] **SendGrid domain auth complete** — [sendgrid-production.md](./sendgrid-production.md)
- [ ] `DemoDataSeed__Enabled=false` and `OperatorSeed__Enabled=false` in production
- [ ] `PublicWeb__BaseUrl` / registration links use live HTTPS URL

---

## Ops

- [ ] Know log command: `docker compose -f docker-compose.uat.yml logs -f api web`
- [ ] Postgres backup tested once; rollback plan documented (previous git tag + rebuild)
- [ ] **`DEV_TENANT_SLUG`** documented: local apex/`localhost` fallback only — **do not set in production** (use real subdomains). See [README](../../README.md) and `.env.example`.
- [x] **P1 shipped (Story 17.3):** Member JWT → 403 integration matrix on admin routes (see Isolation & security)
- [ ] **Product gate:** nip.io apex tightening vs wildcard DNS — decision recorded
- [ ] **Product gate:** Sender settings UI (15.6 defer) vs provisioned-email-only for v1 launch

---

## Core operator flows (per tenant)

Repeat on at least one **Basic** and one **Pro** tenant (e.g. `creativorare`):

- [ ] Dashboard metrics load
- [ ] Create activity → form → publish → QR / share kit
- [ ] Public registration + client dedup
- [ ] Reports + CSV export (Pro / plan-gated as applicable)
- [ ] Campaign send test (Pro) with tenant email branding
- [ ] Website builder publish (Pro) or stub home (Basic)
- [ ] Suspended / archived tenant shows maintenance or 404 on public door

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Dev | Cursor / Amelia | 2026-07-31 | Epic 17 P1 hardening merged (`23875d3`); SM-1 + abuse tests on main |
| Operator | | | Multi-tenant UAT on local Docker + droplet |
| PM | | | P1 dev items done; ops gates (reCAPTCHA, deploy) remain |

---

## P1 backlog (not blocking this checklist)

Track in sprint / deferred-work; do not block enterprise launch sign-off unless product elevates:

| Item | Owner |
|------|-------|
| ~~Auth handoff URL-hash → server code exchange~~ (Story 17.1) | Dev |
| ~~OTP verify brute-force throttling + abuse tests~~ (Story 17.2) | Dev |
| ~~Member JWT 403 integration matrix~~ (Story 17.3) | Dev |
| ~~Operator auth OTP throttling + production guardrails~~ (Story 17.4) | Dev |
| resend-otp rate limiting (deferred from 17.2 CR) | Dev |
| Platform async-action refactor (Epic 11 retro) | Dev |
| Close skippable platform integration tests in CI | Dev |
| Sender settings UI vs provisioned email | Product |
