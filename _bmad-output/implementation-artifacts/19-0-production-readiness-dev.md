# Story 19.0: Production readiness (dev deliverables)

**Epic:** 19 — Production Launch Sign-off  
**Status:** in-progress (CI smoke still red; patch findings below)  
**Date:** 2026-08-11

## Goal

Close code/doc/CI gaps identified in post-roadmap production review before Epic 19 operator UAT on droplet.

## Dev deliverables (this PR)

| Item | Artifact |
|------|----------|
| Catalog backfill migration | `20260811160000_BackfillActivityCatalogPerTenant` — per-tenant Communities/Categories from activities |
| Preflight env gate | `deploy/preflight-launch.sh` |
| Security header verify | `deploy/verify-security-headers.sh` (CSP enforce, HSTS on HTTPS) |
| UAT smoke hardening | `deploy/uat-smoke.sh` — exit codes, header check, `--full` API smoke |
| CI Docker smoke | `deploy/ci-docker-smoke.sh` + `.github/workflows/ci.yml` job |
| Launch checklist | `docs/deploy/enterprise-launch-checklist.md` — CSP enforce, preflight, migration note |
| UAT env docs | `.env.uat.example` — reCAPTCHA production block |

## CI smoke fix (2026-08-12)

- `docker-compose.ci-smoke.yml` — force `DEV_TENANT_SLUG: ""` (compose `:-default` ignores empty host export)
- `deploy/local-smoke-run.sh` — `full_name` + `consent`; marketing door via `cohestra.app` host
- `deploy/uat-smoke.sh` — `--full` captures nested exit code in summary

## Ops gates (stories 19.1–19.5 — not automatable in repo)

- **19.1** — Provision droplet, fill `.env`, `docker compose -f docker-compose.uat.yml up`, `uat-smoke.sh --full`
- **19.2** — HTTPS via `setup-temporary-https.sh` or client domain; `verify-security-headers.sh https://…`
- **19.3** — reCAPTCHA keys in `.env`, rebuild web, apex signup E2E
- **19.4** — Stripe test keys + webhook on droplet URL
- **19.5** — Operator §7 flows + sign-off table

## Verification

```bash
# Local (requires Docker)
bash deploy/ci-docker-smoke.sh

# UAT droplet
bash deploy/preflight-launch.sh --strict-recaptcha
docker compose -f docker-compose.uat.yml up -d --build
PUBLIC_BASE_URL=https://YOUR_URL SMOKE_TENANT_HOST=tenant.YOUR_URL bash deploy/uat-smoke.sh --full
```

## References

- `docs/deploy/enterprise-launch-checklist.md`
- `_bmad-output/planning-artifacts/epics-cohestra-enterprise.md` (Epic 19)

### Review Findings

- [ ] [Review][Patch] `DEV_TENANT_SLUG=` export ineffective — compose `${DEV_TENANT_SLUG:-default}` treats empty as unset; CI marketing-door check still fails [`deploy/ci-docker-smoke.sh:14`, `docker-compose.yml:42`]
- [ ] [Review][Patch] Registration smoke missing `consent: true` — demo forms require consent; CI fails with 400 [`deploy/local-smoke-run.sh:123`]
- [ ] [Review][Patch] Marketing-door probe hardcodes `Host: localhost:8088` — breaks `--full` on non-8088 UAT URLs [`deploy/local-smoke-run.sh:41`]
- [ ] [Review][Decision] Preflight exits 0 with reCAPTCHA disabled (warn-only) — should default `--strict-recaptcha` for launch checklist path? [`deploy/preflight-launch.sh:92-103`]
- [ ] [Review][Patch] `uat-smoke.sh --full` aborts via `set -e` before summary when nested smoke fails [`deploy/uat-smoke.sh:107-110`]
- [ ] [Review][Patch] Document/require `SMOKE_TENANT_HOST` in checklist when `PUBLIC_BASE_URL` is apex IP/domain [`deploy/uat-smoke.sh:27-37`]
- [x] [Review][Defer] Migration `Down()` is no-op (irreversible backfill) — acceptable for data migrations [`20260811160000_BackfillActivityCatalogPerTenant.cs:49`]
- [x] [Review][Defer] Header verifier checks `/` only, not `/api/*` duplicate-header paths — pre-existing nginx design [`deploy/verify-security-headers.sh:24`]
- [x] [Review][Defer] Case-sensitive catalog backfill may leave duplicate casing variants — low likelihood in seeded data [`20260811160000_BackfillActivityCatalogPerTenant.cs:16`]
