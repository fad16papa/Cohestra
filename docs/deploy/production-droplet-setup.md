# Production droplet setup & CI/CD (single server)

One **DigitalOcean droplet** runs production. There is no separate UAT server. Local Docker is pre-flight; the droplet is live.

**Your specs (OK):** Ubuntu · 2 vCPU · 4 GB RAM · 80 GB disk — meets recommended size in `digitalocean-uat.md`.

**Compose file:** `docker-compose.uat.yml` (name is legacy — this **is** the production stack).

---

## Architecture

```
Developers → GitHub (main)
                │
                ├─ CI workflow (.github/workflows/ci.yml)
                │     dotnet test + integration + web build + Docker smoke
                │
                └─ Deploy workflow (.github/workflows/deploy.yml)
                      SSH → droplet → deploy/remote-deploy.sh
                      git pull + docker compose up --build + smoke

Internet → :443/:80 → nginx (Docker) → web + api → postgres + redis (127.0.0.1 only)
```

**Secrets live on the droplet** in `.env`. GitHub stores **SSH only** — not SendGrid, JWT, or DB passwords.

---

## CI/CD strategy (recommended)

| Phase | Deploy trigger | When |
|-------|----------------|------|
| **Bootstrap** | Manual SSH only | First time — config `.env`, first `remote-deploy.sh` |
| **Stabilize** | GitHub **Deploy → Run workflow** (manual) | Until HTTPS + smoke green |
| **Steady state** | Auto after **CI green on `main`** | Default once Epic 19.1 evidence captured |

### Pipeline rules

1. **Never deploy without CI green** — branch protection on `main` should require CI checks (SM-1 + integration + web + docker smoke).
2. **One deploy at a time** — `concurrency: deploy-production` in deploy workflow (already set).
3. **Rebuild web when `PUBLIC_BASE_URL` or `NEXT_PUBLIC_*` changes** — those are **build args**; `docker compose up --build` handles this.
4. **Post-deploy smoke** — `remote-deploy.sh` runs `uat-smoke.sh`; full tenant smoke when `SMOKE_TENANT_HOST` is in `.env`.

### Optional hardening (GitHub UI)

- **Environment `production`** with required reviewers before Deploy job runs.
- Disable auto-deploy: remove `workflow_run` trigger from `deploy.yml` until ready (keep `workflow_dispatch`).

---

## Step 1 — Droplet one-time init

SSH as root or sudo user:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl

# Replace with your repo (HTTPS or git@ for private + deploy key)
REPO_URL=https://github.com/fad16papa/Cohestra.git \
  bash -c "$(curl -fsSL https://raw.githubusercontent.com/fad16papa/Cohestra/main/deploy/droplet-init.sh 2>/dev/null || cat deploy/droplet-init.sh)"
```

If Docker was just installed, **log out and back in**, then re-run init.

**Private repo** — on droplet:

```bash
ssh-keygen -t ed25519 -C "droplet-git-read" -f ~/.ssh/id_ed25519_deploy -N ""
cat ~/.ssh/id_ed25519_deploy.pub   # → GitHub repo Deploy keys (read-only)
cd ~/cohestra
git remote set-url origin git@github.com:fad16papa/Cohestra.git
```

### Firewall (DigitalOcean cloud firewall)

| Inbound | Purpose |
|---------|---------|
| 22 | SSH |
| 80 | HTTP |
| 443 | HTTPS |

Do **not** expose 5432, 6379, 3000, 8080.

Enable **weekly droplet backups** before first production deploy.

---

## Step 2 — Configure `.env` (phased)

Copy template and edit on server:

```bash
cd ~/cohestra
cp .env.uat.example .env
nano .env
```

Validate without deploying:

```bash
bash deploy/droplet-env-check.sh
bash deploy/preflight-launch.sh
```

### Phase P0 — Required before first deploy

| Variable | Notes |
|----------|-------|
| `PUBLIC_BASE_URL` | `https://cohestra.app` or `http://DROPLET_IP` until TLS |
| `SMOKE_TENANT_HOST` | e.g. `creativorare.cohestra.app` — **required** for full post-deploy smoke |
| `POSTGRES_PASSWORD` | `openssl rand -base64 24` |
| `JWT_SIGNING_KEY` | `openssl rand -base64 48` (min 32 chars) |
| `SendGrid__ApiKey` | Live Mail Send key — [sendgrid-production.md](./sendgrid-production.md) |
| `SendGrid__FromEmail` | Verified sender |
| `SendGrid__RegistrationFromEmail` | OTP / registration mail |

**Must be false / unset:**

- `DemoDataSeed__Enabled=false`
- `LoadTestSeed__Enabled=false`
- `OperatorSeed__Enabled=false` (create operator via `/register`)
- `DEV_TENANT_SLUG` — **unset**

### Phase P1 — HTTPS (Epic 19.2)

| Variable | Notes |
|----------|-------|
| `PUBLIC_BASE_URL` | Switch to `https://…` |
| `NGINX_CONFIG_PATH` | `./deploy/nginx/active-ssl.conf` after cert |
| `LETSENCRYPT_EMAIL` | For certbot |

Run once: `bash deploy/setup-temporary-https.sh` or `bash deploy/switch-https-domain.sh cohestra.app you@email.com`

Then: `bash deploy/verify-security-headers.sh https://YOUR_TENANT_HOST`

### Phase P2 — Public signup hardening (Epic 19.3)

| Variable | Notes |
|----------|-------|
| `SelfServeSignup__Recaptcha__Enabled=true` | |
| `SelfServeSignup__Recaptcha__SecretKey` | |
| `NEXT_PUBLIC_RECAPTCHA_ENABLED=true` | |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | |

Rebuild web after change: `docker compose -f docker-compose.uat.yml up -d --build web`

Verify: `bash deploy/preflight-launch.sh --strict-recaptcha`

### Phase P3 — Billing (Epic 19.4)

Use **Stripe test keys** first on production droplet; switch to live keys at public launch.

| Variable | Notes |
|----------|-------|
| `Stripe__SecretKey` | `sk_test_…` then `sk_live_…` |
| `Stripe__PublishableKey` | |
| `Stripe__WebhookSecret` | Dashboard endpoint → `https://YOUR_DOMAIN/api/v1/billing/webhook` |
| `Stripe__PriceCoreMonthly` etc. | Match Stripe products |

---

## Step 3 — DNS

For Cohestra multi-tenant:

| Record | Target |
|--------|--------|
| Apex `cohestra.app` | Droplet IP |
| Wildcard `*.cohestra.app` | Droplet IP (tenant subdomains) |

Until wildcard is ready, use nip.io interim — see [temporary-https-nipio.md](./temporary-https-nipio.md).

---

## Step 4 — First manual deploy

```bash
cd ~/cohestra
bash deploy/remote-deploy.sh
```

Or full evidence bundle (Epic 19.1):

```bash
bash deploy/epic-19-1-evidence.sh
```

Create platform admin and first tenant via self-serve signup or existing seeds policy.

---

## Step 5 — GitHub Actions CD

**Repository → Settings → Secrets and variables → Actions**

| Secret | Example |
|--------|---------|
| `DROPLET_HOST` | Droplet public IP or `cohestra.app` |
| `DROPLET_USER` | `root` or `ubuntu` |
| `DROPLET_SSH_KEY` | Private key PEM (dedicated deploy key) |
| `DROPLET_DEPLOY_PATH` | Optional — default `~/cohestra` |
| `DROPLET_SSH_PORT` | Optional — default `22` |

**Create deploy SSH key** (on your laptop):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/cohestra-deploy -N ""
```

1. Append `cohestra-deploy.pub` to droplet `~/.ssh/authorized_keys`
2. Put private key contents in GitHub secret `DROPLET_SSH_KEY`

**Test CD:** Actions → **Deploy** → **Run workflow**

After bootstrap, merges to `main` auto-deploy when CI succeeds.

---

## Step 6 — Operator checklist after deploy

```bash
curl -s "${PUBLIC_BASE_URL}/ready" | jq .
bash deploy/uat-smoke.sh --full   # needs SMOKE_TENANT_HOST in .env
docker compose -f docker-compose.uat.yml logs -f api web --tail=50
```

See [enterprise-launch-checklist.md](./enterprise-launch-checklist.md) for Epic 19 sign-off.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API won't start | `docker compose logs api` — usually SendGrid missing/invalid |
| Wrong API URL in browser | `PUBLIC_BASE_URL` mismatch — rebuild web |
| Smoke passes but tenant broken | Set `SMOKE_TENANT_HOST` in `.env` |
| Deploy OOM on 4 GB | Deploy off-peak; `docker system prune`; build one service at a time |
| CRLF on scripts | `sed -i 's/\r$//' deploy/*.sh` |

---

## Related

- [github-actions-cd.md](./github-actions-cd.md) — workflow details
- [digitalocean-uat.md](./digitalocean-uat.md) — server runbook (same stack)
- [sendgrid-production.md](./sendgrid-production.md) — email DNS
- [enterprise-launch-checklist.md](./enterprise-launch-checklist.md) — Epic 19 gates
