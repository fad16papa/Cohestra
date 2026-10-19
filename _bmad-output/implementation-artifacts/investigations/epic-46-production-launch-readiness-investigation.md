# Investigation: Epic 46 production launch readiness (current-state gap analysis)

## Hand-off Brief

1. **What happened.** Cohestra UAT is live and accepted on the shared `lead-generation-crm` droplet; production infrastructure, production GitHub Environment, owner-gated production CD, OpenTelemetry, backups-with-restore-proof, live Paddle, and dedicated `cohestra.app` DNS do not exist in the repo or as authorized operations.
2. **Where the case stands.** Status Concluded for planning. Confidence High that Epic 46 is the correct new program and must not reopen Epic 19 or Epic 45. Production remains NO-GO.
3. **What's needed next.** Plan Epic 46 (this pass), then implement Story 46.1 (architecture and infrastructure baseline) without provisioning.

## Case Info

| Field            | Value |
| ---------------- | ----- |
| Ticket           | Epic 46 (new) |
| Date opened      | 2026-10-19 |
| Status           | Concluded |
| System           | Cohestra main `dedcb1101aac48b80ad6ea3c7d88f695bb9953a5`; UAT droplet shared with lead-generation-crm; production not authorized |
| Evidence sources | `sprint-status.yaml`, compose files, `.github/workflows/*`, `deploy/`, `docs/deploy/*`, API health/platform/outbox/Paddle/SendGrid code, Epic 19/44/45 artifacts |

## Problem Statement

Owner request (hypothesis to verify): Cohestra needs an official production-release program covering dedicated infrastructure, observability, DR, security, billing, email, and an explicit cutover gate. No Epic 46 exists. Epic 19 and Epic 45 must stay closed. Production must not land on the UAT droplet. Planning only — no provisioning, no live Paddle, no DNS mutation, no secrets.

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------ | ----- |
| Git `main` SHA | Available | Confirmed `dedcb1101aac48b80ad6ea3c7d88f695bb9953a5` |
| Sprint tracker | Available | Epic 19 done, Epic 44 done, Epic 45 done, Epic 33 in-progress, no epic-46 |
| Docker compose | Available | `docker-compose.yml` local; `docker-compose.uat.yml` shared-host UAT; `docker-compose.prod.yml` is a local overlay, not production topology |
| GitHub workflows | Available | `ci.yml` + `deploy.yml` (Environment `uat` only) |
| Deploy scripts | Available | `remote-deploy.sh`, UAT smoke/acceptance; no production deploy/rollback/restore scripts |
| Platform Admin (Epic 44) | Available | Read-only ops health, outbox, Paddle disposition, version SHA, KPI envelope |
| Observability packages | Missing | No Serilog/OpenTelemetry/Sentry in `*.csproj` |
| Backup/restore proof | Partial | `pg_dump` documented; no restore script; no restore-test evidence |
| Production GitHub Environment | Missing | No `environment: production` in repo |
| Live Paddle | Partial | Guards exist; cutover doc is do-not-execute |
| Production DNS/TLS | Missing | UAT uses `uat.cohestra.app` on shared edge nginx |

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| - | --------------- | -------- | ------ | ----- |
| 1 | UAT vs production hosting | High | Done | Shared droplet confirmed; dedicated prod required by owner |
| 2 | Job hosting (API vs worker) | High | Done | Four hosted services inside API |
| 3 | Observability baseline | High | Done | Health/ops exist; OTel missing |
| 4 | Deploy/SHA provenance | High | Done | UAT SHA pin exists; production CD missing |
| 5 | Backup/DR | High | Done | Dump documented, restore unproven |
| 6 | Platform Admin boundary | High | Done | Epic 44 consume-not-collect |
| 7 | Paddle/SendGrid isolation | High | Done | Guards exist; live config not authorized |
| 8 | Live droplet inventory | Medium | Blocked | Planning pass must not SSH production/UAT |

## Timeline of Events

| Time | Event | Source | Confidence |
| ---- | ----- | ------ | ---------- |
| 2026-10-08 | Epic 44 planning approved; Platform Admin support center | `epics-platform-production-support.md` | Confirmed |
| 2026-10-10 | Epic 44 done; OTel/Serilog deferred to future observability epic | `epic-44-retro-2026-10-10.md`, `sprint-status.yaml:861` | Confirmed |
| 2026-10-14 | Story 19.4 Paddle sandbox UAT accepted; live cutover frozen | `sprint-status.yaml:10`, `docs/deploy/paddle-production-cutover.md:1-5` | Confirmed |
| 2026-10-15 | Epic 45 autonomous UAT delivery done | `epics-autonomous-delivery.md`, sprint tracker | Confirmed |
| 2026-10-17 | Story 19.5 operator sign-off APPROVED; Epic 19 DONE; Production cutover NOT AUTHORIZED | `sprint-status.yaml:3-4` | Confirmed |
| 2026-10-19 | This investigation on main `dedcb110` | git | Confirmed |

## Confirmed Findings

### Finding 1: Verified baseline matches owner brief

**Evidence:** `git rev-parse HEAD` = `dedcb1101aac48b80ad6ea3c7d88f695bb9953a5`; `_bmad-output/implementation-artifacts/sprint-status.yaml:294-299` (`epic-19: done`); `:477-478` (`epic-45: done`); no `epic-46` key.

**Detail:** Epic 19, Story 19.5, Epic 45, and UAT acceptance are done. Production cutover is explicitly NOT AUTHORIZED. Epic 46 does not exist.

### Finding 2: UAT is a shared-host stack, not production

**Evidence:** `docker-compose.uat.yml:1-24`; `docs/deploy/digitalocean-uat.md`; `.github/workflows/deploy.yml:1-24` (`name: Deploy UAT`, `environment: uat`).

**Detail:** Public `:80/:443` terminate on `lead-generation-crm-nginx-1`. Cohestra UAT nginx is loopback `127.0.0.1:8180`. Postgres and Redis have no host ports on UAT. Shared-host TLS scripts refuse Cohestra-owned certbot when `COHESTRA_SHARED_HOST_UAT=true`.

### Finding 3: `docker-compose.prod.yml` is not a production topology

**Evidence:** `docker-compose.prod.yml:1-25` — overlay on local `docker-compose.yml`, keeps Development credentials, toggles reCAPTCHA and seeds.

**Detail:** True droplet runtime is `docker-compose.uat.yml` with `ASPNETCORE_ENVIRONMENT=Production`. There is no `docker-compose.production.yml` and no dedicated production project name.

### Finding 4: Background/outbox processing is inside the API process

**Evidence:** `src/Infrastructure/DependencyInjection.cs:178-201` registers `BillingJobsHostedService`, `FollowUpDigestHostedService`, `OutboxDispatcherHostedService`, `ActivityExpirationHostedService`. No worker service in any compose file.

**Detail:** Do not invent a separate worker for launch. Advisory locks exist for some jobs. Multi-instance API would duplicate pollers unless locks cover all of them.

### Finding 5: Production GitHub Environment and production CD do not exist

**Evidence:** Glob `.github/workflows` = `ci.yml`, `deploy.yml` only. `deploy.yml` concurrency `deploy-uat`. `deploy/validate-deploy-uat-workflow.sh` forbids `deploy-production` on the UAT path. `docs/deploy/github-actions-cd.md:5-6` production NO-GO.

**Detail:** Main CI success automatically deploys UAT. That automatic path must never become production. SHA pinning (REVIEWED/CI/DEPLOY/RUNTIME) exists for UAT and is the template for production, with an added owner approval gate.

### Finding 6: Health is production-useful but not production observability

**Evidence:** `src/Api/Program.cs:131-134` and `:253-268` — `/health` is a liveness stub; `/ready` is postgres + redis + default-tenant. `PlatformHealthNotInProbeNames` lists outbox, paddle, sendgrid, hosted-jobs. Platform `GET /api/v1/platform/ops/health` wraps the same ready checks plus `not_in_probe` placeholders.

**Detail:** `/ready` must stay frozen (Epic 44 AD-14). Observability must be a new pipeline, not a widened public probe.

### Finding 7: OpenTelemetry / Serilog / metrics / traces / alerts are missing

**Evidence:** No OpenTelemetry, Serilog, Prometheus, or Sentry package in `src/Api/Api.csproj` or `src/Infrastructure/Infrastructure.csproj`. Epic 44 retro action “Serilog / OpenTelemetry pipeline remains a future observability epic candidate” is open (`sprint-status.yaml:861-863`).

**Detail:** Logging is default `ILogger` with some scopes (`tenantId`/`tenantSlug`). SendGrid warnings log recipient email and response body (`SendGridEmailSender.cs:108-112`). Platform DTOs sanitize via `PlatformHealthDescriptionSanitizer`. No `/metrics`, no `ActivitySource`, no uptime vendor config, no alert rules.

### Finding 8: Platform Admin is a support console, not a telemetry system

**Evidence:** Epic 44 spine AD-12 through AD-19; `PlatformOpsController` read APIs; integration tests 404 requeue/replay; KPI envelope `value/source/observedAt/freshness`.

**Detail:** Existing signals: fleet KPIs, ready-tagged health, outbox summary/list (no payload), Paddle config (no secrets) + deliveries, version/`GIT_SHA`, tenant timeline, audits, support severity. Forbidden: SSH, SQL, secrets, webhook replay, outbox requeue, impersonation, unrestricted Paddle controls.

### Finding 9: Backup is documented, restore is not proven

**Evidence:** `docs/deploy/digitalocean-uat.md:244-248` `pg_dump`; `docs/deploy/paddle-production-cutover.md:12,61-63` dump-before-cutover and restore-if-needed. No `restore*.sh`. No isolated restore-test artifact.

**Detail:** Claiming backup readiness would be false. Redis AOF is on in UAT compose; Redis is not the system of record.

### Finding 10: Paddle and SendGrid have production guards, not production configuration

**Evidence:** `PaddleCredentialGuard.cs:8-62` — live keys forbidden on UAT hosts; `Paddle:Environment=production` requires `AllowLive`. `docs/deploy/paddle-production-cutover.md` “Do not execute”. SendGrid production validator requires API key, FromEmail, `UseSandbox=false`. Current SendGrid runbook uses `noreply@creativorare.com` (`docs/deploy/sendgrid-production.md:11-14`).

**Detail:** Story 19.4 is frozen historical sandbox acceptance. Production SendGrid must be independent of UAT (likely `cohestra.app` domain auth, not reuse of UAT key/domain as the production identity).

### Finding 11: Security baseline is strong for UAT; production still needs a dedicated review pass

**Evidence:** TenantIsolation CI gate; `PlatformAdminOnly`; JWT validation; Redis fail-closed rate limits; nginx security headers + CSP enforce (`deploy/nginx/app.conf:34`); UAT compose does not publish 5432/6379; ProductionSecurityValidator blocks weak JWT/seeds/dev passwords outside Development.

**Detail:** Remaining production work: secret audit, production reCAPTCHA keys (no test bypass), CSP live-Paddle directives vs sandbox CDNs, production CORS origins, disk/host hardening, GitHub Environment protections, backup access control, log redaction at source.

### Finding 12: Existing production docs mix UAT and launch and must not be the Epic 46 source of truth

**Evidence:** `docs/deploy/production-droplet-setup.md` is Paddle-on-droplet, still UAT-shaped. `enterprise-launch-checklist.md:173-180` still says `docker compose -f docker-compose.uat.yml` for “production / UAT droplet”.

**Detail:** Epic 46 planning must supersede those docs for production topology without rewriting UAT runbooks.

## Deduced Conclusions

### Deduction 1: Production must get a new compose project and a new GitHub Environment

**Based on:** Findings 2, 3, 5, 12

**Reasoning:** Reusing `cohestra-uat` guards, shared edge, or Environment `uat` would violate owner decisions 1, 2, and 5.

**Conclusion:** Introduce `docker-compose.production.yml` (name locked in architecture) and GitHub Environment `production`, leaving UAT automation unchanged.

### Deduction 2: Observability is a new plane that feeds Platform Admin, not a Platform Admin rewrite

**Based on:** Findings 6, 7, 8

**Reasoning:** Epic 44 already forbids fake metrics and widening `/ready`. Retro explicitly deferred OTel.

**Conclusion:** Instrument API/jobs with OpenTelemetry; collect via OTel Collector; store/query in a self-hosted OSS stack unless the owner approves a paid vendor; publish sanitized KPIs into existing Platform Admin envelope.

### Deduction 3: Default database option is self-hosted Postgres on the production droplet

**Based on:** Finding 2 (single-host UAT pattern), owner “one dedicated production droplet”, cost data (DO Basic 8 GiB $48/mo vs managed Postgres 4 GiB $60.90/mo plus droplet).

**Reasoning:** Managed Postgres buys automated backups and optional HA at extra cost and network complexity. Launch can meet RPO/RTO with WAL + object storage on self-hosted Postgres if restore tests pass.

**Conclusion:** Architecture default = OPTION A. OPTION B is an OWNER DECISION if cost is accepted for operational offload.

### Deduction 4: First implementation story is architecture baseline, not droplet purchase

**Based on:** Owner planning-only stop condition; Finding 5 (no prod CD); Finding 3 (no prod compose).

**Reasoning:** 46.2 host creation is owner-gated. 46.1 can land compose contracts, secret names, network model, and runbooks without provisioning.

**Conclusion:** Next story = 46.1.

## Hypothesized Paths

### Hypothesis 1: A GitHub Environment named `production` already exists in org settings

**Status:** Open

**Theory:** Environment might exist unused.

**Would confirm:** GitHub Settings → Environments includes `production`.

**Would refute:** Only `uat` exists.

**Resolution:** Planning must define the environment either way. Do not create or populate secrets in this pass.

### Hypothesis 2: UAT already uses live SendGrid (not sandbox)

**Status:** Confirmed for intended UAT posture

**Theory:** UAT compose sets `SendGrid__UseSandbox=false` and Production ASPNETCORE.

**Supporting indicators:** `docker-compose.uat.yml` SendGrid block; `sendgrid-production.md`.

**Would confirm:** Live UAT `.env` classification (out of scope — no secret read).

**Resolution:** Production still needs a **separate** key, from-address/domain, and delivery monitoring identity. Independence is the requirement, not “SendGrid doesn’t exist.”

### Hypothesis 3: Current UAT droplet size is 4 GiB (OOM sequential builds)

**Status:** Open (operational)

**Theory:** `remote-deploy.sh` sequential api-then-web builds exist to avoid OOM on 4GB.

**Would confirm:** DigitalOcean droplet size in owner console.

**Resolution:** Production sizing recommendation: start at 8 GiB / 4 vCPU Basic ($48/mo list, 2026-10-19 DigitalOcean pricing) unless load tests say otherwise.

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | ----- | ------------- |
| Live UAT resource usage (CPU/RAM/disk) | Capacity baseline | Owner-gated host metrics after 46.2; do not SSH in this pass |
| Whether GitHub `production` Environment exists | 46.3 bootstrap | Owner inspects GitHub Settings |
| Actual UAT SendGrid domain vs `creativorare.com` | Email independence design | Owner/SendGrid console |
| Current `cohestra.app` DNS records | DNS cutover plan | Owner DNS console — do not change |
| Isolated restore test | Backup readiness | Story 46.5 |

## Source Code Trace

| Element | Detail |
| ------- | ------ |
| UAT deploy entry | `deploy/remote-deploy.sh` after SHA `git reset --hard` |
| Production CD | none |
| Ready probe | `src/Api/Program.cs` MapHealthChecks `/ready` |
| Ops health | `PlatformOpsHealthService` |
| Outbox dispatch | `OutboxDispatcherHostedService` in API |
| Paddle live guard | `PaddleCredentialGuard` |
| Version SHA | `GIT_SHA` env → `PlatformOpsVersionService` |

## Conclusion

**Confidence:** High

Epic 46 is the canonical production-release program. UAT on the shared droplet is accepted and must remain the UAT path. Production requires a new droplet, new compose project, new GitHub Environment, owner-gated deploy, OTel-compatible observability feeding sanitized Platform Admin, proven backups, independent live Paddle and SendGrid, and an explicit cutover phrase. Nothing in this investigation authorizes production GO.

## Recommended Next Steps

### Fix direction

Planning artifacts (PRD, architecture spine, stories, NFR, readiness). No runtime code. Do not start 46.1 in this pass after planning lands.

### Diagnostic

None required beyond owner consoles listed in Missing Evidence when 46.2/46.3 begin.

## Reproduction Plan

Not a defect case. Verification of this exploration: re-read sprint-status, `deploy.yml`, compose files, and Epic 19/44/45 closures on `dedcb110`.

## Side Findings

- Epic 33 (Live Proof Cinema) is still in-progress (`33-7` review, several backlog stories). It does not block Epic 46 planning; it must not be treated as a production gate.
- Open tracker action items from older epics (CSP retro, reCAPTCHA enable) are partly stale: nginx already emits enforce CSP; UAT recaptcha was accepted via Epic 45/19.3. Epic 46 still needs production reCAPTCHA keys and a production CSP review for live Paddle hosts.
- `enterprise-launch-checklist.md` still conflates production with UAT compose. Epic 46 must publish a replacement production checklist.

## Follow-up: 2026-10-19

### New Evidence

Parallel inventories of deploy/CI, observability, and Platform Admin/security (this file). DigitalOcean list prices retrieved 2026-10-19: Basic 4 GiB $24/mo, Basic 8 GiB $48/mo; Managed PostgreSQL Standard 1 GiB $15.15, 2 GiB $30.45, 4 GiB $60.90. OpenTelemetry.Extensions.Hosting current NuGet 1.20.0 (2026-10-15).

### Updated Conclusion

Planning default: dedicated 8 GiB droplet + self-hosted Postgres/Redis (OPTION A); OTel 1.20.x + OSS collector/Grafana; no paid vendor. OWNER DECISION required to switch to managed Postgres or a paid observability product.
