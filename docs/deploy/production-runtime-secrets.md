# Production runtime secrets (Story 46.4)

Repository contract for isolated Production application configuration.

**PRODUCTION=NO-GO.** This document does not authorize compose-up, DNS, live Paddle, or cutover.

## Planes

| Plane | Marker | Redis auth | `DEV_TENANT_SLUG` | Public origins |
| --- | --- | --- | --- | --- |
| Dedicated Production | `Cohestra__DeploymentPlane=Production` (locked in `docker-compose.production.yml`) | Required | Forbidden | `https://cohestra.app` + `https://{tenant}.cohestra.app` |
| UAT (also `ASPNETCORE_ENVIRONMENT=Production`) | marker absent | Passwordless (unchanged) | UAT-only | `uat.cohestra.app` |
| Development | marker absent | Local | Allowed | localhost |

UAT continues to run the Production ASP.NET environment name with sandbox Paddle. The dedicated plane marker is what applies 46.4 fail-closed rules.

## Host `.env` (owner-controlled, later)

Do **not** create this file in git. Production Compose reads the checkout-root `.env` beside `docker-compose.production.yml`. On the dedicated Production droplet that path is `/home/deploy/cohestra-production/.env`:

```bash
cp .env.production.example .env
# fill values on the host
bash deploy/prepare-production-host-env.sh --check-names /home/deploy/cohestra-production/.env
```

`deploy/prepare-production-host-env.sh` does not write `.env`. `--check-names` may inspect only that exact checkout-root `.env`, and only when it is a regular non-symlink file, untracked, and ignored by this repository's `.gitignore`. A global Git ignore rule or a `.git/info/exclude` entry alone does not qualify. Every other path inside the worktree is refused. This document does not move the host checkout or authorize a deploy.

Required names (values never recorded here):

- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `JWT_SIGNING_KEY` (min 32 characters, not a placeholder)
- `SendGrid__ApiKey` (independent Production key; not the UAT key)
- `SendGrid__FromEmail`
- `PUBLIC_BASE_URL=https://cohestra.app` (apex only; tenant CORS is pattern-based)

Locked / forbidden:

- `ASPNETCORE_ENVIRONMENT` and `Cohestra__DeploymentPlane` (compose-locked)
- `OperatorSeed__Enabled`, `PlatformAdminSeed__Enabled`, `DemoDataSeed__Enabled`, `LoadTestSeed__Enabled` = false
- `DEV_TENANT_SLUG` unset
- `COHESTRA_SHARED_HOST_UAT` unset/false
- `Paddle__AllowLive=false`, `Paddle__Environment=sandbox` until Story 46.10
- `SendGrid__UseSandbox=false`
- GitHub `PROD_DROPLET_*` deploy secrets stay in Environment `production` (Story 46.3)

## Classified UAT versus Production check

Owner gate `production_host_application_secrets` is **PENDING** until the owner runs a classified comparison on live inventories.

Format (names + 4-character suffixes only; never full values):

```text
JWT_SIGNING_KEY	ab12
POSTGRES_PASSWORD	cd34
```

```bash
bash deploy/compare-classified-secrets.sh uat.classified production.classified
```

Repository fixtures under `deploy/fixtures/46-4/` are **synthetic**. Passing those fixtures is not live isolation proof.

`OWNER_GATE=owner_classified_verification_still_required` until the owner records a classified PASS without secret values.

## Fail-closed runtime

`ProductionSecurityValidator` runs at API start:

- Dedicated plane requires `ASPNETCORE_ENVIRONMENT=Production`
- Missing / placeholder JWT, Postgres, Redis, and SendGrid secrets throw
- Seeds cannot be enabled
- `DEV_TENANT_SLUG` cannot be set
- CORS / `PublicWeb:BaseUrl` cannot be UAT, localhost, or http
- `PaddleCredentialGuard` still refuses sandbox/live mix and live Paddle on UAT hosts
- Exceptions name settings, not values

## Cross-story ownership

- Story 46.6 owns telemetry instrumentation. Do not add OTel SDK work here.
- Story 46.9 owns the independent security audit.
- Story 46.11 owns Production email DNS / deliverability evidence.
- Story 46.10 owns live Paddle.

## Production state

Cutover authorization: **NOT GRANTED** (does not waive this gate).

Owner secret gate: **PENDING**.

Production release readiness: **NOT YET COMPLETE**.

Production: **NO-GO**.
