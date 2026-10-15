# GitHub Actions CI/CD — deploy UAT to the DigitalOcean droplet

Automatic **UAT** deployment runs **after CI passes on `main`**, or manually via **Actions → Deploy UAT → Run workflow**.

This is **not** production cutover. Production remains owner-authorized and NO-GO until a separate live gate.

Cursor / Cloud Agent does **not** need droplet SSH. GitHub Actions is the execution plane. Agents read workflow logs and artifacts.

```
push / merge to main
    → CI workflow (build + test)
    → Deploy UAT (Environment `uat`, concurrency `deploy-uat`)
    → fail-closed secret names
    → SSH with a dedicated Actions deploy key
    → DEPLOY_SHA=<accepted CI SHA> via appleboy envs (never an unpinned branch tip)
    → SSH pins origin to that SHA *before* invoking on-disk remote-deploy.sh
    → deploy/remote-deploy.sh re-asserts the same SHA
    → EXPECTED_SHA == DEPLOYED_SHA or fail closed
    → uat-deploy-dispatch.json (result=dispatched; later artifacts own deployed/accepted)
```

| Workflow | File | Trigger |
|----------|------|---------|
| CI | `.github/workflows/ci.yml` | Push/PR to `main` |
| Deploy UAT | `.github/workflows/deploy.yml` | CI success on `main`, or manual |

Application secrets (SendGrid, JWT, Postgres, Paddle sandbox, recaptcha) stay on the **droplet** in `.env`. GitHub Environment `uat` stores only deploy access and later UAT automation credentials. See `_bmad-output/planning-artifacts/epic-45-uat-secret-bootstrap-matrix.md` for names.

Do **not** upload the owner workstation key (`~/.ssh/cohestra_uat`) to GitHub or Cursor. Mint a **dedicated** Actions deploy key.

---

## One-time bootstrap — GitHub Environment `uat`

1. GitHub → **Settings → Environments → `uat`** (created on first workflow use if missing).
2. Add Environment secrets (values never in chat):

| Secret | Required | Purpose |
|--------|----------|---------|
| `DROPLET_HOST` | Yes | Droplet host |
| `DROPLET_USER` | Yes | SSH user (`deploy`) |
| `DROPLET_SSH_KEY` | Yes | Dedicated Actions private key |
| `DROPLET_DEPLOY_PATH` | No | Default `/home/deploy/cohestra` |

Later Epic 45 stories add automation-login and mailbox names to the same Environment. Not required for 45.1.

3. On the droplet, authorize the **matching public key** in `~/.ssh/authorized_keys` for the deploy user.

If a required secret is missing, Deploy UAT fails immediately with:

```
OWNER_GATE=missing_protected_secret
MISSING_SECRET=DROPLET_HOST
```

That is the owner gate. Do not paste the value into Cursor.

### Create the dedicated Actions key

On a trusted admin machine (not Cursor):

```bash
ssh-keygen -t ed25519 -C "github-actions-uat-deploy" -f ~/.ssh/cohestra-uat-gha -N ""
```

1. Append `cohestra-uat-gha.pub` to the droplet deploy user's `authorized_keys`.
2. Put `cohestra-uat-gha` (private) in Environment `uat` secret `DROPLET_SSH_KEY`.
3. Delete the local private copy if you do not need it. Do not commit it.

---

## Routine deploy (no owner SSH)

1. Merge to **`main`**.
2. Wait for **CI** green.
3. **Deploy UAT** starts automatically.
4. Download the `uat-deploy-dispatch` artifact for the SHA. Later stories add `uat-acceptance.json`.

`workflow_run` pins `TARGET_SHA=github.event.workflow_run.head_sha` and passes it as `DEPLOY_SHA` through appleboy `envs`. The droplet must reset to that exact 40-character SHA after proving it is an ancestor of `origin/main`. If main has advanced to SHA B after CI accepted SHA A, UAT still deploys A or fails closed. It must never silently deploy B.

Actions never deploy an unpinned branch tip. Empty `DEPLOY_SHA` is refused on the GitHub Actions path. The droplet helper may still reset to `origin/$DEPLOY_BRANCH` only for an explicit manual operator run that does not set `DEPLOY_SHA`.

The SSH step emits non-secret `EXPECTED_SHA` / `DEPLOYED_SHA` and fails if they differ.

Third-party actions in `deploy.yml` are pinned to reviewed commit SHAs (`actions/checkout`, `actions/upload-artifact`, `appleboy/ssh-action`). Permissions stay `contents: read`. Concurrency stays `deploy-uat` and must never share a group with production.

---

## Droplet application `.env`

Still provisioned once on the host (not in GitHub, not in chat). See [digitalocean-uat.md](./digitalocean-uat.md) and `.env.uat.example`.

`deploy/remote-deploy.sh` already:

- refuses the live public compose project name
- refuses Cohestra :80/:443 on the shared host
- rebuilds compose project `cohestra-uat`
- runs `deploy/uat-smoke.sh`

Shared CRM (`lead-generation-crm`) stays the public edge.

---

## Firewall

DigitalOcean cloud firewall — inbound only:

| Port | Purpose |
|------|---------|
| 22 | SSH (Actions deploy key) |
| 80 | Existing public nginx |
| 443 | Existing public TLS |

Cohestra UAT loopback binds stay `127.0.0.1:3100 / 5100 / 8180`.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `MISSING_SECRET=…` | Populate that **name** on Environment `uat`. Do not paste the value into chat. |
| Deploy: `permission denied (publickey)` | Dedicated Actions pubkey missing on the droplet user |
| Deploy: `cd: ... No such file` | Set `DROPLET_DEPLOY_PATH` or finish `droplet-init.sh` once |
| Deploy: `git fetch` fails | Droplet read-only GitHub deploy key for `git fetch` (separate from Actions SSH) |
| Deploy: `.env is missing` | Create droplet `.env` from `.env.uat.example` (one-time host bootstrap) |
| `REFUSE: DEPLOY_SHA…` / `EXPECTED_SHA != DEPLOYED_SHA` | Actions tried to deploy an unpinned or drifted SHA. Re-run from the accepted CI SHA; do not reset to `origin/main` by hand unless this is an explicit manual operator deploy. |
| Live Paddle / production | Refused. This workflow is UAT only. |

Agents should read the Actions log and artifacts instead of asking for droplet stdout.

---

## Related

- [digitalocean-uat.md](./digitalocean-uat.md) — host runbook
- [sendgrid-production.md](./sendgrid-production.md) — email setup
- `_bmad-output/planning-artifacts/epic-45-uat-secret-bootstrap-matrix.md` — secret names only
- `_bmad-output/planning-artifacts/autonomous-merge-policy.md` — approved for non-production/UAT; privilege expansion remains owner-gated; production NO-GO
