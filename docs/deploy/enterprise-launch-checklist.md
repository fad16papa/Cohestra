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
127.0.0.1 default.localhost
```

Start stack:

```bash
cp .env.example .env   # edit secrets as needed
docker compose build web api --no-cache   # after Dockerfile or dependency changes
docker compose up -d
```

Launch overlay (reCAPTCHA on, demo seeds off — keeps Development env for local Docker creds):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
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

bash deploy/verify-security-headers.sh http://localhost:8088
```

Optional apex check is included when `PUBLIC_BASE_URL` is set (see script section *Enterprise apex*).

**Database migrations:** apply on deploy (`20260811140000_AddTenantCustomDomain`, `20260811160000_BackfillActivityCatalogPerTenant`). The catalog backfill prevents activity edit failures after community/category validation shipped in P2.

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
- [x] **P1 shipped (Story 17.4):** Operator auth OTP verify throttling; refresh revoke-all; production secret validation; security headers; OpenAPI dev-only; HtmlSanitizer ≥ 9.0.892
- [x] **P2 shipped (Story 18.3):** Security header ownership — **nginx** owns headers in Docker/production (`app.conf`, `app-ssl.conf.template`); **Next.js** emits them only in `next dev` (`web/security-headers.ts`). Nginx `proxy_hide_header` strips upstream duplicates on `/`.
- [x] **P2 shipped (Story 18.2):** CSP baseline — **enforce** policy (`Content-Security-Policy`) owned by nginx in Docker/production; Next.js emits dev variant in `next dev`. Canonical policy in `web/content-security-policy.ts`.

**Verify single header values (Docker on port 8088):**

```bash
bash deploy/verify-security-headers.sh http://localhost:8088
# Or manually:
curl -sI -H "Host: default.localhost:8088" http://localhost:8088/ | grep -E '^(X-Frame-Options|X-Content-Type-Options|Referrer-Policy|Permissions-Policy|Content-Security-Policy):'
```

Each name should appear **once**. After HTTPS setup, repeat against `https://…` and confirm `Strict-Transport-Security` is present (HTTPS template only).

### CSP (Story 18.2 — enforce mode shipped)

v1 ships **enforce** — `Content-Security-Policy` (not Report-Only). Canonical policy in `web/content-security-policy.ts`; nginx owns it in Docker/production.

**Before launch:**

1. **Smoke** — run `bash deploy/verify-security-headers.sh` on HTTP and HTTPS URLs.
2. **Flows** — login, dashboard, website builder, public registration, marketing home with DevTools console open; fix any blocked resources in `content-security-policy.ts` + nginx templates together.
3. **CI** — `deploy/ci-docker-smoke.sh` runs header + Playwright smoke on every PR.

**CSP smoke (manual, Docker 8088):**

| Surface | URL | Pass |
|---------|-----|------|
| Tenant login | `http://default.localhost:8088/login` | Page loads; no broken UI |
| Dashboard | after login | Shell + nav render |
| Website builder | `/dashboard/website` | Editor loads |
| Public registration | tenant door `/register` or apex `/signup` | Form + reCAPTCHA (if enabled) |
| Marketing | `http://cohestra.app:8088/` | Home + fonts/images |

```bash
curl -sI -H "Host: default.localhost:8088" http://localhost:8088/ | grep -i content-security-policy
# Expect: Content-Security-Policy: ... (NOT Report-Only)
```

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
- [x] **P2 shipped (Story 18.1):** Resend OTP rate limiting (signup + tenant login); 429 + `Retry-After`

See [cloud-mobile-testing.md](./cloud-mobile-testing.md) for reCAPTCHA env blocks.

### OTP send vs resend limits (Story 18.1)

Signup and tenant login use **two independent Redis-backed limits**. Both use a **15-minute sliding window**. Operators often hit the **send cap** before the resend limiter during UAT.

| Limit | What it counts | Default | Config (`appsettings` / env) | User-facing signal |
|-------|----------------|---------|------------------------------|-------------------|
| **OTP send cap** | Every OTP **email sent** (initial signup/login send + each resend) | **3 sends / 15 min** per email | `AuthOtp:MaxSendAttemptsPerWindow`, `AuthOtp:SendWindowMinutes` | 429 when cap exceeded (may occur before resend limiter) |
| **Resend limiter** | Explicit **Resend OTP** API calls only | **5 resends / 15 min** per email **or** client IP | `PublicSignupResendRateLimit:*` (apex signup), `AuthResendOtpRateLimit:*` (tenant login) | 429 + `Retry-After` header (seconds until window slot frees) |

**Operator guidance:**

- If resend is blocked after only a few tries, the **send cap (3)** likely fired first — wait up to **15 minutes** from the first send in the window, then try again.
- **Verify brute-force** is separate (Story 17.2): **10 failed verify attempts / 15 min** per email (`PublicSignupVerifyRateLimit`, `AuthOtpVerifyRateLimit`).
- **Redis outage:** rate limiters and OTP send fail **closed** → API returns **503** with a friendly message (Story 18.4). Raw Redis errors must not appear in the UI.
- **Local dev:** OTP codes log as `DEV ONLY — OTP for …` in API container logs (`docker compose logs api`).

**UAT smoke (optional):**

```bash
dotnet test src/Api.IntegrationTests --filter "FullyQualifiedName~Resend_otp"
```

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
- [ ] `bash deploy/preflight-launch.sh --strict-recaptcha` passes before first deploy
- [ ] `docker compose -f docker-compose.uat.yml up -d --build` succeeds
- [ ] `bash deploy/uat-smoke.sh --full` passes on server
- [ ] **`SMOKE_TENANT_HOST` set** when `PUBLIC_BASE_URL` is apex or bare IP (e.g. `creativorare.cohestra.app` or `creativorare.YOUR_NIP_IO`) — required for tenant door/login checks in `--full` mode
- [ ] `bash deploy/verify-security-headers.sh https://YOUR_TENANT_HOST` passes after HTTPS
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
- [ ] Website builder publish (Core Essentials or Pro Studio) or stub home (Basic)
- [ ] Suspended / archived tenant shows maintenance or 404 on public door

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Dev | Cursor / Amelia | 2026-08-11 | Epic 19 production-readiness: catalog backfill migration, preflight + header verify scripts, CI Docker smoke, CSP enforce docs |
| Dev | Cursor / Amelia | 2026-07-31 | Epic 17 P1 hardening merged (`23875d3`); SM-1 + abuse tests on main |
| Operator | | | Multi-tenant UAT on local Docker + droplet |
| PM | | | Epic 19 stories 19.1–19.5 ops gates remain (reCAPTCHA keys, droplet, Stripe UAT, operator sign-off) |

---

## P1 backlog (not blocking this checklist)

Track in sprint / deferred-work; do not block enterprise launch sign-off unless product elevates:

| Item | Owner |
|------|-------|
| ~~Auth handoff URL-hash → server code exchange~~ (Story 17.1) | Dev |
| ~~OTP verify brute-force throttling + abuse tests~~ (Story 17.2) | Dev |
| ~~Member JWT 403 integration matrix~~ (Story 17.3) | Dev |
| ~~Operator auth OTP throttling + production guardrails~~ (Story 17.4) | Dev |
| ~~resend-otp rate limiting~~ (Story 18.1) | Dev |
| Platform async-action refactor (Epic 11 retro) | Dev |
| Close skippable platform integration tests in CI | Dev |
| Sender settings UI vs provisioned email | Product |
