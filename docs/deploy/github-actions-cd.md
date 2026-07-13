# GitHub Actions CI/CD — deploy to DigitalOcean droplet

Automatic deployment runs **after CI passes on `main`**, or manually via **Actions → Deploy → Run workflow**.

## Pipeline overview

```
push / merge to main
    → CI workflow (build + test)
    → Deploy workflow (SSH to droplet)
    → git pull + docker compose up --build
    → smoke tests (/ready)
```

| Workflow | File | Trigger |
|----------|------|---------|
| CI | `.github/workflows/ci.yml` | Push/PR to `main` |
| Deploy | `.github/workflows/deploy.yml` | CI success on `main`, or manual |

Secrets stay on the **droplet** in `.env`. GitHub only stores SSH access — not SendGrid or database passwords.

---

## Step 1 — One-time droplet setup (SSH)

On your droplet:

```bash
# Replace with your GitHub repo URL
REPO_URL=https://github.com/YOUR_ORG/cohestra.git bash deploy/droplet-init.sh
```

If Docker was just installed, **log out and back in**, then run init again.

### Edit `.env` on the server

```bash
nano ~/cohestra/.env
```

Minimum required:

```bash
PUBLIC_BASE_URL=http://YOUR_DROPLET_IP
POSTGRES_PASSWORD=<openssl rand -base64 24>
JWT_SIGNING_KEY=<openssl rand -base64 48>
SendGrid__ApiKey=SG.your-live-key
SendGrid__FromEmail=noreply@creativorare.com
```

See [sendgrid-production.md](./sendgrid-production.md) for SendGrid setup.

### Test first deploy manually

```bash
cd ~/cohestra
bash deploy/remote-deploy.sh
```

Open `http://YOUR_DROPLET_IP` and complete operator registration at `/register`.

### Private repository — git pull on the droplet

The deploy script runs `git fetch` on the server. For a **private** repo:

1. On the droplet: `ssh-keygen -t ed25519 -C "droplet-deploy" -f ~/.ssh/id_ed25519_deploy -N ""`
2. Add `~/.ssh/id_ed25519_deploy.pub` as a **read-only deploy key** on the GitHub repo
3. Configure git:

```bash
cd ~/cohestra
git remote set-url origin git@github.com:YOUR_ORG/cohestra.git
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519_deploy
ssh -T git@github.com
```

---

## Step 2 — GitHub Actions secrets

In GitHub: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Required | Example |
|--------|----------|---------|
| `DROPLET_HOST` | Yes | `157.230.12.34` |
| `DROPLET_USER` | Yes | `root` or `ubuntu` |
| `DROPLET_SSH_KEY` | Yes | Private key PEM (full contents) |
| `DROPLET_DEPLOY_PATH` | No | Default: `~/cohestra` |
| `DROPLET_SSH_PORT` | No | Default: `22` if omitted |

### Create a deploy SSH key (recommended)

On your **local machine** (not the droplet):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/lead-crm-deploy -N ""
```

1. Add **`lead-crm-deploy.pub`** to the droplet: `~/.ssh/authorized_keys`
2. Add **`lead-crm-deploy`** (private key) to GitHub secret `DROPLET_SSH_KEY`

Use a **dedicated key** — not your personal SSH key.

---

## Step 3 — Push code and deploy

1. Merge/push to **`main`** on GitHub
2. Wait for **CI** to finish green
3. **Deploy** runs automatically (or trigger **Deploy → Run workflow** manually)

Watch progress: **Actions** tab in GitHub.

---

## Step 4 — Firewall

DigitalOcean cloud firewall — inbound only:

| Port | Purpose |
|------|---------|
| 22 | SSH |
| 80 | HTTP (Docker nginx) |
| 443 | HTTPS (when configured) |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Deploy: `permission denied (publickey)` | Check `DROPLET_SSH_KEY` matches public key on droplet |
| Deploy: `cd: ... No such file` | Run `droplet-init.sh` or set `DROPLET_DEPLOY_PATH` |
| Deploy: `git fetch` fails | Private repo deploy key on server (see above) |
| Deploy: `.env is missing` | Create `.env` on droplet from `.env.uat.example` |
| Deploy: API exits | SendGrid config — `docker compose ... logs api` on droplet |
| Build timeout in Actions | Normal on 4 GB — `command_timeout` is 30m; retry or build off-peak |
| CORS / wrong API URL | `PUBLIC_BASE_URL` must match browser URL; redeploy rebuilds web |

### Logs on droplet

```bash
cd ~/cohestra
docker compose -f docker-compose.uat.yml logs -f nginx api web
```

### Smoke script: `set: pipefail: invalid option name`

Shell scripts edited on Windows may have CRLF line endings. On the droplet:

```bash
cd ~/cohestra
sed -i 's/\r$//' deploy/*.sh
bash deploy/uat-smoke.sh
```

Future pulls include `.gitattributes` to keep `*.sh` as LF on Linux.

---

## Related

- [digitalocean-uat.md](./digitalocean-uat.md) — full server runbook
- [sendgrid-production.md](./sendgrid-production.md) — email setup
- [uat-polish-checklist.md](./uat-polish-checklist.md) — pre-handoff QA
