# Story 19.0: Production readiness (dev deliverables)

**Epic:** 19 — Production Launch Sign-off  
**Status:** in-progress (dev complete; ops gates remain)  
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

- `deploy/ci-docker-smoke.sh` — clear `DEV_TENANT_SLUG` so bare localhost returns marketing door
- `deploy/local-smoke-run.sh` — registration answers use `full_name` (matches form schema)

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
