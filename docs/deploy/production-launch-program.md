# Production launch program (Epic 46)

Canonical Production-release planning lives in:

- `_bmad-output/planning-artifacts/epics-production-launch-readiness.md`
- `_bmad-output/planning-artifacts/architecture/architecture-cohestra-epic-46-2026-10-19/ARCHITECTURE-SPINE.md`
- `_bmad-output/planning-artifacts/prds/prd-cohestra-production-launch-2026-10-19/prd.md`
- `_bmad-output/planning-artifacts/epic-46/`

This file is a pointer so deploy docs do not keep treating UAT compose as Production.

## Locked facts

- Production is a **new dedicated droplet**. It is not the UAT / `lead-generation-crm` host.
- Production domains: `cohestra.app`, `*.cohestra.app`.
- UAT remains: `uat.cohestra.app`, `*.uat.cohestra.app`.
- Production deploys are **owner-gated**. CI green and `main` merge do not ship Production.
- `docker-compose.prod.yml` is a **local overlay**, not Production topology.
- `docker-compose.uat.yml` remains UAT.
- Platform Admin is internal production-support only. It is not a deploy/database/secrets console.
- Story 19.4 is frozen sandbox history, not live Paddle acceptance.

## Historical docs (do not follow for Production topology)

- [digitalocean-uat.md](./digitalocean-uat.md) — UAT shared host
- [github-actions-cd.md](./github-actions-cd.md) — UAT CD; production NO-GO there is still correct
- [production-droplet-setup.md](./production-droplet-setup.md) — Paddle-on-droplet notes; UAT-shaped
- [enterprise-launch-checklist.md](./enterprise-launch-checklist.md) — still names `docker-compose.uat.yml` for “production / UAT droplet”
- [paddle-production-cutover.md](./paddle-production-cutover.md) — live Paddle remains owner-gated; Epic 46 Story 46.10

## Production state

**NO-GO** until the owner writes `PRODUCTION CUTOVER: AUTHORIZED`.
