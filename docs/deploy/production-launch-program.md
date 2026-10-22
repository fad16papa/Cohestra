# Production launch program (Epic 46)

Canonical Production-release planning lives in:

- `_bmad-output/planning-artifacts/epics-production-launch-readiness.md`
- `_bmad-output/planning-artifacts/architecture/architecture-cohestra-epic-46-2026-10-19/ARCHITECTURE-SPINE.md`
- `_bmad-output/planning-artifacts/prds/prd-cohestra-production-launch-2026-10-19/prd.md`
- `_bmad-output/planning-artifacts/epic-46/`

This file is a pointer so deploy docs do not keep treating UAT compose as Production.

## Locked facts

- Production is a **new dedicated droplet**. It is not the UAT / `lead-generation-crm` host.
- The UAT shared host is **forbidden** for Production.
- Production domains: `cohestra.app`, `*.cohestra.app`.
- UAT remains: `uat.cohestra.app`, `*.uat.cohestra.app`.
- Production deploys are **owner-gated**. CI green and `main` merge do not ship Production.
- `docker-compose.prod.yml` is a **local overlay**, not Production topology.
- `docker-compose.uat.yml` remains UAT.
- Platform Admin is internal production-support only. It is not a deploy/database/secrets console.
- Story 19.4 is frozen sandbox history, not live Paddle acceptance.

## Story 46.1 compose contract (landed in-repo)

This is a repository contract only. It is **not** deployment evidence. No Production droplet, DNS, TLS, secrets, or CD exists yet.

- Production compose file: `docker-compose.production.yml`
- Production compose project: `cohestra-production`
- Production Docker network: `cohestra_production_internal`
- Required containers: `cohestra-prod-web`, `cohestra-prod-api`, `cohestra-prod-postgres`, `cohestra-prod-redis`, `cohestra-prod-nginx`, `cohestra-prod-otelcol`
- No worker service. Hosted jobs stay inside `cohestra-prod-api`.
- Postgres 16 and Redis 7 are internal-network only (no public host ports 5432 / 6379).
- Postgres planning default is OPTION A (self-hosted). OPTION B is not implemented.
- Redis authentication uses `${REDIS_PASSWORD}` (not hardcoded). UAT Redis remains passwordless.
- Environment template: `.env.production.example` (names only).
- OTel collector is a container contract (`deploy/otel/production-collector.yaml`). App SDK, dashboards, and alerts are Stories 46.6 / 46.7.
- Production CD belongs to Story 46.3. This story does not auto-deploy.
- Next owner gate after 46.1: `droplet_purchase` (Story 46.2). Do not create the droplet automatically.

## Story 46.2 host (dedicated droplet)

Owner gate `droplet_purchase` is **APPROVED**. Cutover phrase is **GRANTED** and does **not** waive remaining Epic 46 stories. Production release readiness is **NOT YET COMPLETE**.

- Dedicated DigitalOcean droplet name: `cohestra-production`
- Plan: Basic `s-4vcpu-8gb` (8 GiB / 4 vCPU / 160 GiB)
- Database: OPTION A (self-hosted Postgres later). OPTION B not purchased.
- UAT shared host (`129.212.235.2` / `uat.cohestra.app`) is forbidden and must remain a different machine.
- Cloud firewall: 22 source-restricted, 80 and 443 public; 5432/6379/3000/8080 closed.
- SSH password authentication disabled after key proof.
- Unattended security updates enabled. No application workload deploy in 46.2.
- Public inventory: [production-host.md](./production-host.md) and [production-host-inventory.json](./production-host-inventory.json) (no credentials).
- Owner-confirmed DigitalOcean project: `Cohestra` (API project list is 403 with the current token). Droplet IDs/IPv4s unchanged after the reported project move.
- Owner Windows SSH is **owner-reported PASS** (`116.86.142.14/32`). Cloud Agent SSH is not owner proof. Recovery Console is owner-reported PASS.
- Story 46.3 is **ready-for-dev** (planning artifact only). Implementation is **not** authorized in the planning pass.
- Next remaining owner gates for 46.3: GitHub Environment `production` protections, then `production_secrets` before any live SSH.
- Do not create `.github/workflows/deploy-production.yml` until the 46.3 implementation pass.

## Historical docs (do not follow for Production topology)

- [digitalocean-uat.md](./digitalocean-uat.md) — UAT shared host
- [github-actions-cd.md](./github-actions-cd.md) — UAT CD; production NO-GO there is still correct
- [production-droplet-setup.md](./production-droplet-setup.md) — Paddle-on-droplet notes; UAT-shaped
- [enterprise-launch-checklist.md](./enterprise-launch-checklist.md) — still names `docker-compose.uat.yml` for “production / UAT droplet”
- [paddle-production-cutover.md](./paddle-production-cutover.md) — live Paddle remains owner-gated; Epic 46 Story 46.10

## Production state

Cutover authorization: **GRANTED**.

Production release readiness: **NOT YET COMPLETE**.

Do not point `cohestra.app` at this droplet in 46.2 or 46.3 planning. Do not auto-deploy. Do not enable live Paddle.

## Story 46.3 control plane (planning only)

Canonical story: `_bmad-output/implementation-artifacts/46-3-github-production-environment-and-owner-gated-ci-cd.md`

- Trigger: `workflow_dispatch` with explicit 40-character SHA. Never `push`, PR merge, UAT, or CI completion.
- Environment: `production` (independent of `uat`), required owner approval, `main` only.
- Concurrency: `deploy-production` with `cancel-in-progress: false`.
- SHA chain: AD-7 `REVIEWED = CI = DEPLOY TARGET = RUNTIME = ACCEPTANCE` remains intact. GitHub merge commits split reviewed PR HEAD from the merged main SHA; the control plane must prove the link.
- Production provenance is two-layer and fail-closed:
  - Layer A = five Actions CI jobs SUCCESS on the exact merged `deploy_sha` (newest unfiltered `push`/`workflow_dispatch` run).
  - Layer B = unique associated PR targeting `main` with hydrated `merged == true` and `merge_commit_sha == deploy_sha`, plus `GitGuardian Security Checks` (`app.slug=gitguardian`) SUCCESS on immutable `${deploy_sha}^2`.
- GitGuardian is not required on the merge commit itself (it attaches to the PR HEAD). Requiring it on `deploy_sha` would refuse legitimate merges.
- Direct-to-main commits fail closed. `ancestor of main` is not reviewed. Branch protection is not mutated in 46.3.
- One-parent squash/rebase deploys fail closed (no immutable merge-time PR HEAD). Merge-method Settings are not changed in 46.3.
- Secrets: `PROD_DROPLET_*` + `PROD_PUBLIC_BASE_URL` names only. Fail closed with `MISSING_SECRET=<NAME>`.
- Target: existing droplet `cohestra-production` / `159.223.55.242`. UAT `129.212.235.2` is forbidden.
- Rollback: `deploy/production-rollback.sh` with explicit SHA; DB restore is 46.5 and never implicit.
- UAT `deploy.yml` / `deploy-uat` remains automatic and unchanged.
- Implementation of workflow/rollback scripts is a later pass. This file does not deploy Production.
