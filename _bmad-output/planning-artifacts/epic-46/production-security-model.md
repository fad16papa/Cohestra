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
