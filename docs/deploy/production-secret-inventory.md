---
title: Production secret inventory
story: 46.9
production: NO-GO
---

# Production secret inventory

Names and locations only. **No values.** Do not paste credentials into git, PRs, evidence, logs, or chat.

Owner rotation is an owner gate when 46.4/46.5/46.10/46.11 demand it. This file is the 46.9 FR-27 audit record.

| Secret name | Owner | Storage | Rotation note | 46.9 status |
| --- | --- | --- | --- | --- |
| `JWT_SIGNING_KEY` | Owner | Host `.env` | Unique Production value; min 32 chars; no placeholders | PASS (validator) / PENDING host value (46.4) |
| `POSTGRES_PASSWORD` | Owner | Host `.env` | Distinct from UAT/`crm` | PASS (validator rejects `crm`) / PENDING host value (46.4) |
| `REDIS_PASSWORD` | Owner | Host `.env` | Required on Production Redis; UAT may stay passwordless | PASS (compose + validator on non-UAT) / PENDING host value (46.4) |
| `SendGrid__ApiKey` | Owner | Host `.env` | Distinct Production key; Mail Send scope | PENDING 46.11 / 46.4 |
| `Paddle__ApiKey` | Owner | Host `.env` | Live keys only after 46.10 owner gate | PASS (guard keeps sandbox) / PENDING live (46.10) |
| `Paddle__ClientToken` | Owner | Host `.env` | Same as API key | PASS / PENDING live (46.10) |
| `Paddle__WebhookSecret` | Owner | Host `.env` | Live webhook secret after 46.10 | PENDING 46.10 / 46.4 |
| `SelfServeSignup__Recaptcha__SecretKey` | Owner | Host `.env` | Live secret; Google test keys rejected | PASS (validator) / PENDING enablement (46.4) |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Owner | Host `.env` / web build | Live site key; no test token | PENDING 46.4 |
| Droplet SSH keys / deploy key | Owner | Host + GitHub Environment `production` | Dedicated Production key; not UAT | PENDING live host (46.2/46.3) |
| `PROD_DROPLET_SSH_KEY` | Owner | GitHub Environment `production` | Deploy only; never in app `.env` | PENDING Gate B (46.3) |
| `PROD_DROPLET_HOST` / `USER` / `DEPLOY_PATH` / `PROD_PUBLIC_BASE_URL` | Owner | GitHub Environment `production` | Names in 46.3 fail-closed script | PENDING live dispatch (46.3) |
| Backup encryption key | Owner | Offline / owner store | 46.5; never Platform Admin | PENDING 46.5 |
| Optional intelligence API key | Owner | Host `.env` if used | Optional | PENDING if enabled |
| `GITHUB_TOKEN` | GitHub Actions | Workflow runtime | Provenance API reads only | PASS (46.3 workflow) |

## Forbidden in git

- Host `.env` values
- GitHub Environment secret values
- `SelfServeSignup__Recaptcha__TestBypassToken`
- `NEXT_PUBLIC_RECAPTCHA_TEST_TOKEN`
- Live Paddle credentials
- SSH private keys

`.env.production.example` remains names-only. `deploy/validate-production-secret-inventory.sh` asserts that contract.
