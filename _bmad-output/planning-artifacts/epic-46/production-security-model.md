---
title: Epic 46 Production security model
status: final
created: 2026-10-19
owner: Murat + Winston
production: NO-GO
---

# Production security model

Story 46.9 is the review-and-harden story. This document is the threat/risk spine for that work.

## Boundaries

| Trust zone | Contains | Exposure |
| --- | --- | --- |
| Public edge | nginx 80/443 | Internet |
| SSH | port 22 | Source-restricted; deploy key + owner key only |
| App network | web, api, otel | Docker internal |
| Data | postgres, redis | Docker internal, no published ports |
| Control plane | GitHub Environment `production` | Owner reviewers |
| Support plane | Platform Admin | PlatformAdmin JWT only, apex |

## Threat review

| Area | Risk | Existing control | Production gap |
| --- | --- | --- | --- |
| Tenant isolation | Cross-tenant read/write | EF global filters, TenantIsolation CI | Re-run review on new prod endpoints; no bypass in telemetry queries |
| PlatformAdmin isolation | Tenant JWT on `/platform/*` | `PlatformAdminOnly`; no tenant_id | Confirm Production CORS/apex; keep light-only |
| JWT/session | Stolen refresh | Redis store, lifetimes, handoff codes | Strong `Jwt__SigningKey`; no placeholder; rotate runbook |
| Secret boundaries | UAT/prod mix | Separate env files conceptually | Separate GitHub Environment + host `.env`; audit 46.9/46.4 |
| CORS | Over-broad origins | `Cors:AllowedOrigins` | Production list = `https://cohestra.app` + tenant pattern, not localhost |
| CSP | XSS | nginx enforce CSP | Drop sandbox Paddle origins on Production; keep live Paddle + recaptcha |
| Security headers | Clickjacking/mime | nginx | Verify once on Production URL (`verify-security-headers.sh`) |
| Rate limiting | Abuse | Redis fail-closed 503 | Confirm Production Redis; no fail-open |
| Abuse prevention | Signup flood | Recaptcha + signup caps | Live keys; no test bypass |
| reCAPTCHA | Bypass in prod | Verifier ignores bypass when enabled in Production | Assert env: enabled, secret set, bypass empty |
| Database exposure | Internet scan | UAT compose unpublished | Production compose same; droplet firewall deny 5432 |
| Redis exposure | Session theft | UAT unpublished | Same; require password on Production Redis |
| SSH | Host takeover | UAT deploy key | Dedicated Production key; disable password auth |
| GitHub environments | Secret leak / rogue deploy | UAT environment | Production required reviewers; no self-approve if possible |
| Production SHA provenance | Unreviewed or unscanned main SHA ships | UAT auto-deploy after CI | 46.3 Layer A exact-SHA Actions CI **and** Layer B associated merged PR + GitGuardian on `${deploy_sha}^2`; direct-to-main REFUSE |
| `main` branch protection | Direct pushes and weak required checks | Not a Production trust boundary today | Later hardening (candidate 46.9). Do not treat 46.3 as the Settings-mutation story |
| Paddle webhooks | Forged events | HMAC + timestamp | Live secret; monitor invalid signatures |
| SendGrid | Account takeover / spam | Restricted key recommended | Distinct Production key, Mail Send scope |
| PII/logging | Leak in Loki | Partial DTO sanitizer | Pipeline redaction AD-9; fix SendGrid email logs |
| Backup access | Off-host dump theft | None | Encryption + restricted bucket + no Platform Admin access |

## Platform Admin must never expose

SSH, raw secrets, arbitrary SQL, database consoles, production credentials, unrestricted Paddle controls, infrastructure shell.

## Production secret audit (names)

JWT signing key, Postgres password, Redis password, SendGrid API key, Paddle API key, Paddle client token, Paddle webhook secret, reCAPTCHA secret, droplet SSH keys, backup encryption key, GitHub deploy key, optional intelligence API key. Store locations: host `.env`, Environment `production` (deploy only), backup key offline/owner store.

## Redis password

UAT Redis has no password in compose. Production Redis **must** require a password (`requirepass` or ACL). Fail-closed limiters already treat Redis down as 503.

## CSP / headers

nginx owns Production headers (AD-14). Story 46.9 verifies live Paddle `cdn.paddle.com` / `buy.paddle.com` / `api.paddle.com` are allowed and sandbox hosts are not required.

## 46.9 evidence matrix

Recorded against main baseline `e962c8c3eead953a1f56f2b397b3e9d4fc669041` plus this story's in-repo hardening. Live Production URL probes were **not** performed (SSH and live Production probes are prohibited). Missing live evidence is **PENDING**, never PASS.

| Area | Verdict | Evidence | Owner gate |
| --- | --- | --- | --- |
| Tenant isolation | PASS (in-repo) | EF filters `CohestraDbContext`; SM-1 in `.github/workflows/ci.yml`; new negatives in `TenantIsolationApiTests`; allowlist `deploy/tenant-filter-bypass-allowlist.txt` | None |
| X-Tenant-Id trust | PASS (in-repo) | `TenantResolutionMiddleware` ignores header; integration `Admin_XTenantIdHeader_CannotWidenAccessToForeignActivity` | None |
| JWT↔Host impersonation | PASS (in-repo) | Middleware unit + `Admin_JwtTenantA_OnForeignHost_Returns403_TenantMismatch` | None |
| Platform Admin isolation | PASS (in-repo) | `PlatformAdminOnly`; TenantAdmin 403 including `/platform/reports/support` | Apex login host PENDING 46.13 |
| IgnoreTenantFilters | PASS (in-repo) | Documented allowlist + CI contract; no new undocumented bypass | New sites need 46.9-style review |
| JWT / refresh / handoff | PASS (in-repo) | `ProductionSecurityValidator` placeholder + min length; Redis stores fail-closed 503 in Production | Host `JWT_SIGNING_KEY` PENDING 46.4 |
| CORS | PASS (validator) | Rejects localhost/loopback in non-Dev; compose binds `PUBLIC_BASE_URL` | Apex origin value PENDING 46.4 / 46.13 |
| CSP / headers | PASS (in-repo) / PENDING (live URL) | Shared nginx allows live Paddle; `deploy/nginx/production-live-csp.snippet` omits sandbox; `verify-security-headers.sh` on `https://cohestra.app` not run | 46.13 TLS + owner URL |
| Rate limiting | PASS (in-repo) | Redis fail-closed 503 unchanged | Production Redis password value PENDING 46.4 |
| reCAPTCHA bypass | PASS (in-repo) | Verifier never honors bypass in Production; validator rejects bypass + Google test keys; apex+open signup requires enabled | Live keys / compose enable PENDING 46.4 |
| Redis auth | PASS (compose + validator) | `docker-compose.production.yml` `--requirepass`; validator requires password except UAT public host | Host password PENDING 46.4 |
| DB / Redis ports | PASS (compose) | `validate-production-compose.sh` — no 5432/6379 publish | Droplet firewall live PENDING 46.2 owner |
| Paddle live/sandbox | PASS (guard) | `PaddleCredentialGuard` + compose locked sandbox / `AllowLive=false` | Live cutover PENDING 46.10 |
| Secret inventory | PASS (names) | `docs/deploy/production-secret-inventory.md`; example names-only | Values stay off git (46.4) |
| SHA provenance | PASS (in-repo 46.3) | `workflow_dispatch` + Layer A/B + two-parent merge; direct-to-main REFUSE | Live Environment reviewers PENDING Settings (do not mutate) |
| GitGuardian PR HEAD | PASS (in-repo 46.3) | Evaluated on `${deploy_sha}^2`; missing/pending = REFUSE | GitHub App install PENDING owner |
| Direct-to-main | PASS (deploy refuse) | Provenance chain | `main` Settings PENDING owner — 46.9 does not change branch protection |
| UAT isolation | PASS (in-repo) | `deploy.yml` remains `uat` / `deploy-uat` | None |
| PII / logging | PENDING | Owned by 46.6 (OTel/redaction, SendGrid email logs) | 46.6 |
| Backup access | PENDING | Owned by 46.5 | 46.5 |
| SSH / live headers / DNS / TLS | PENDING | No SSH or Production URL probe in 46.9 | 46.2 / 46.13 owner |

### Cross-story dependencies (not edited here)

- **46.4** owns host `.env`, enabling Production reCAPTCHA keys, `PUBLIC_BASE_URL`, Redis/JWT/Postgres values, and compose runtime wiring.
- **46.6** owns instrumentation and log redaction.
- **46.3** already owns deploy provenance; 46.9 re-reviewed and did not mutate GitHub Environment or branch settings.
- **46.10** owns live Paddle credential cutover and adopting `production-live-csp.snippet` on the live nginx config.

PRODUCTION=NO-GO.
