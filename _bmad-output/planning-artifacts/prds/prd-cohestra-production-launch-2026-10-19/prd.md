---
title: Cohestra Production Infrastructure, Observability & Launch Readiness
status: final
created: 2026-10-19
updated: 2026-10-19
project: cohestra
epic: 46
author: John (PM) with Mary investigation, Winston architecture, Murat NFR
baseline_sha: dedcb1101aac48b80ad6ea3c7d88f695bb9953a5
production: NO-GO
---

# PRD: Cohestra Production Infrastructure, Observability & Launch Readiness

## 0. Document Purpose

This PRD is the product contract for **Epic 46**, Cohestra's official production-release program. It is for the owner, PM, architect, test architect, and implementing agents. It does not reopen Epic 19 (UAT acceptance, frozen) or Epic 45 (autonomous UAT delivery, frozen). It does not authorize production cutover. Downstream architecture, stories, NFR strategy, and the readiness matrix must use Glossary terms exactly.

UX: Platform Admin production-support UI already exists (Epic 43.4 / Epic 44). This PRD does not commission a new console. Story 46.8 may extend Operations cards using the existing KPI envelope; Sally is invoked only if that story invents a new room.

## 1. Vision

Cohestra is UAT-accepted and must become a dedicated, observable, recoverable production system that the owner can release on purpose — not by merging to `main`.

Production is a **separate world** from UAT: a new droplet, `cohestra.app` / `*.cohestra.app`, independent secrets, live Paddle, independent SendGrid, owner-gated deploys, proven backups, and OpenTelemetry-compatible telemetry. Platform Admin remains the internal production-support console. It consumes sanitized signals; it does not become a deployment, database, or secrets console.

Until the owner writes **PRODUCTION CUTOVER: AUTHORIZED**, the only legal production state is **NO-GO**. Completing this PRD, Epic 46 stories, or CI does not change that.

## 2. Target User

### 2.1 Jobs To Be Done

- **Owner:** Release Cohestra to the public on a known SHA, with a documented rollback, without sharing a host with UAT or the CRM product.
- **PlatformAdmin (Francis / operator):** See whether production is healthy, which SHA is running, whether webhooks/outbox/email are failing — without SSH or SQL.
- **Implementing engineer/agent:** Build infrastructure, pipelines, and observability against a locked topology, with owner gates named exactly.
- **On-call supporter:** Follow incident and release runbooks; page on CRITICAL alerts only.

### 2.2 Non-Users (v1)

- Tenant Admins and Members (they use tenant workspaces, not this program).
- Customers as Platform Admin users.
- Agents acting as droplet SSH clients from Cursor.
- Anyone treating UAT `uat.cohestra.app` as production.

### 2.3 Key User Journeys

- **UJ-1. Owner authorizes a production release of a reviewed SHA.**
  - **Persona + context:** Owner, after CI and UAT are green on a `main` SHA.
  - **Entry state:** GitHub Environment `production` protected; candidate SHA known.
  - **Path:** Approve Environment `production` → deploy job runs only that SHA → runtime `/ops/version` matches → smoke + observation window.
  - **Climax:** REVIEWED SHA = CI SHA = DEPLOY TARGET SHA = RUNTIME SHA = ACCEPTANCE SHA.
  - **Resolution:** Production is still NO-GO for public cutover unless the owner has issued the cutover phrase. A successful deploy to a dark/unannounced production host is not public launch.
  - **Edge case:** Missing production secret fails closed with `MISSING_SECRET=<NAME>`; no secret values in logs.

- **UJ-2. PlatformAdmin triages a production incident without touching infrastructure.**
  - **Persona + context:** Francis on `/platform/ops` at marketing apex.
  - **Entry state:** PlatformAdmin JWT; telemetry pipeline has published sanitized KPIs.
  - **Path:** Overview health/SHA → Operations outbox/Paddle/errors → tenant timeline if a workspace is implicated → incident runbook.
  - **Climax:** Enough context to decide “page owner / wait / open GitHub SHA” without SSH, SQL, or raw secrets.
  - **Resolution:** Support issue severity updated; no replay/requeue unless a later security-reviewed story exists (not this epic by default).

- **UJ-3. On-call receives a CRITICAL alert and restores service.**
  - **Persona + context:** Owner or designated on-call.
  - **Path:** Alert (ready unhealthy / 5xx spike / backup failure) → runbook → rollback or restore from tested backup → verify SHA and `/ready`.
  - **Climax:** Service restored within RTO; RPO not exceeded.
  - **Edge case:** Restore is performed on an isolated target first if data integrity is in doubt.

- **UJ-4. Owner refuses a premature public launch.**
  - **Path:** Readiness matrix shows remaining NO-GO rows (DNS, live Paddle, restore test, etc.).
  - **Climax:** Production remains NO-GO. No agent infers GO from Epic 46 story completion.

## 3. Glossary

- **Production** — The dedicated Cohestra live environment on a new droplet, serving `cohestra.app` and `*.cohestra.app`. Distinct from UAT.
- **UAT** — The accepted shared-host environment at `uat.cohestra.app` / `*.uat.cohestra.app` on the existing `lead-generation-crm` droplet. Unchanged by this epic except that production must never point at it.
- **Production droplet** — New DigitalOcean droplet that hosts Cohestra Production only.
- **GitHub Environment `production`** — Protected GitHub Environment for Production deploy secrets and the owner approval gate. Completely separate from Environment `uat`.
- **Owner release gate** — Explicit GitHub Environment `production` approval (and any additional written owner approval named in a story). CI green is not this gate.
- **SHA chain** — REVIEWED SHA = CI SHA = DEPLOY TARGET SHA = RUNTIME SHA = ACCEPTANCE SHA.
- **Platform Admin** — Internal Cohestra production-support console. Not a tenant workspace, not a deploy console, not a database console, not a secrets manager.
- **Sanitized support signal** — Operational datum published to Platform Admin after redaction, using the Epic 44 KPI envelope (`value`, `source`, `observedAt`, `freshness`).
- **Telemetry system** — OpenTelemetry-compatible pipeline (SDK → Collector → logs/metrics/traces/alerts). Platform Admin does not own collection.
- **Live Paddle** — Paddle production catalog, live credentials, live webhook destination. Independent of sandbox. Owner-gated.
- **Story 19.4** — Frozen historical UAT sandbox billing acceptance. Not a live-Paddle certificate.
- **PRODUCTION CUTOVER: AUTHORIZED** — The only owner phrase that may change Production from NO-GO to authorized public cutover.
- **NO-GO** — Production must not serve public customers; production domains must not point at UAT; live charges must not run.
- **OPTION A** — Self-hosted PostgreSQL on the Production droplet (planning default).
- **OPTION B** — DigitalOcean managed PostgreSQL (owner-gated purchase).
- **Isolated restore test** — Restore of a Production-format backup onto a non-production target, with integrity checks. Required before claiming backup readiness.
- **Owner gate** — A named point that engineering must not cross without owner approval. Not used for ordinary engineering work.

## 4. Features

### 4.1 Dedicated production infrastructure

**Description:** Production runs on a new droplet. It does not share the UAT/CRM host. Realizes UJ-1, UJ-4.

**Functional Requirements:**

#### FR-1: Dedicated Production droplet

Owner can require Cohestra Production to run only on a new dedicated droplet. Realizes UJ-1.

**Consequences:**
- Existing `lead-generation-crm` + Cohestra UAT host is never the Production deploy target.
- Production compose project is not `cohestra-uat`.

#### FR-2: Production network and host hardening

Production host exposes only 22/80/443 to the public internet (SSH source-restricted).

**Consequences:**
- PostgreSQL and Redis ports are not published to the public internet.
- Unattended security updates, firewall, and SSH key policy are documented and applied in Story 46.2.

#### FR-3: Production Docker topology

Production runs `cohestra-prod-web`, `cohestra-prod-api`, `cohestra-prod-postgres` (OPTION A) or managed Postgres endpoint (OPTION B), `cohestra-prod-redis`, `cohestra-prod-nginx`, plus an OpenTelemetry Collector sidecar/service.

**Consequences:**
- Outbox and hosted jobs remain inside the API process unless a later architecture change is justified.
- `docker-compose.prod.yml` (local overlay) is not the Production topology.

#### FR-4: PostgreSQL production readiness

Production PostgreSQL is sized, migrated, unexposed, and credential-isolated from UAT.

**Consequences:**
- OPTION A is the planning default. OPTION B requires an owner purchase gate.
- `DEV_TENANT_SLUG` is unset. Demo/load-test/operator seeds are disabled.

#### FR-5: Redis production readiness

Production Redis is internal-only, AOF enabled, used for cache, rate limits, refresh tokens, and OTP limiters.

**Consequences:**
- Redis is not the system of record.
- Redis loss may force re-login; fail-closed rate limiters still return 503.

### 4.2 Delivery control plane

**Description:** Production deploys only through GitHub Environment `production` after an owner release gate. Realizes UJ-1.

#### FR-6: GitHub Environment `production`

Engineering can implement workflows that reference Environment `production` with required reviewers, secret isolation, and no reuse of UAT secrets.

**Consequences:**
- Environment `uat` continues automatic post-CI UAT deploys.
- This planning pass does not create or populate production secrets.

#### FR-7: Production secrets isolation

Production secrets live only in Environment `production` (deploy keys) and on the Production host `.env` (app secrets).

**Consequences:**
- Secret names are listed in the bootstrap matrix; values are never printed.
- Missing required secrets fail closed with `MISSING_SECRET=<NAME>`.

#### FR-8: Owner-gated production deployment

A Production deploy runs only after CI success on the candidate SHA **and** the owner release gate.

**Consequences:**
- Every `main` merge must not deploy Production.
- SHA chain is verified before smoke.

#### FR-9: Rollback strategy

On-call can roll Production back to the previous accepted SHA (and restore DB if a forward migration is incompatible).

**Consequences:**
- Pre-deploy backup gate is required when migrations run.
- Rollback procedure is a tested runbook, not a comment in a PR.

### 4.3 Backup, restore, disaster recovery

**Description:** Backups exist, are encrypted, and are proven by isolated restore tests. Realizes UJ-3.

#### FR-10: Automated backups

Production PostgreSQL is backed up automatically on a defined schedule to off-host encrypted storage.

**Consequences:**
- Backup failure is a CRITICAL alert.
- Backup access is restricted to owner/ops identities, not Platform Admin.

#### FR-11: Tested restore procedure

A documented restore procedure passes an Isolated restore test on a cadence.

**Consequences:**
- Backup readiness is false until the first isolated restore test passes.
- Restore-verification failure is a CRITICAL alert.

#### FR-12: Disaster recovery targets

Production declares RPO and RTO and meets them in the restore test.

**Consequences (planning default):**
- RPO 1 hour with WAL/archive once proven; until then RPO 24 hours with daily dumps is the honest claim.
- RTO 4 hours for app+DB on a replacement or same host.

### 4.4 Observability

**Description:** Production emits structured logs, metrics, traces, and errors through an OpenTelemetry-compatible pipeline. Realizes UJ-2, UJ-3.

#### FR-13: Structured logging

API, web (where applicable), and jobs emit structured logs with tenant and request correlation, after redaction.

**Consequences:**
- Passwords, JWTs, refresh tokens, API keys, Paddle/SendGrid/reCAPTCHA secrets, database credentials, SSH keys, and unnecessary customer PII are prohibited in telemetry.

#### FR-14: OpenTelemetry instrumentation

API records OTel traces and metrics for HTTP, EF Core (safe spans), Redis (useful spans), outbox processing, Paddle webhooks, and hosted jobs.

**Consequences:**
- Vendor SDK lock-in is forbidden; export is OTLP.
- Paid observability subscription is an owner gate.

#### FR-15: Metrics

RED/USE metrics exist for API latency, 5xx rate, and dependency health.

#### FR-16: Tracing

Distributed traces exist for request → DB/Redis/outbox/webhook where valuable.

#### FR-17: Error tracking

Unhandled exceptions are queryable without leaking secrets or raw PII.

**Consequences:**
- Default is the OTel/OSS path. Sentry or similar is an owner gate.

#### FR-18: Uptime monitoring

External uptime checks cover website and `/ready` over HTTPS.

#### FR-19: Alerts

Alert classes INFO / WARNING / CRITICAL exist for the matrix in this PRD §6 companion (observability architecture).

**Consequences:**
- Noisy alerts are a defect. `/ready` flap must not page INFO.

#### FR-20: Production operational dashboard

On-call can view logs/metrics/traces/alerts in the telemetry system (Grafana OSS default).

#### FR-21: Platform Admin consumes sanitized signals

Platform Admin displays sanitized support signals from the telemetry system and existing DB read models. Realizes UJ-2.

**Consequences:**
- Platform Admin does not scrape hosts, store raw traces, or own collection.
- New privileged operational actions require a separate security review (out of default 46.8).

### 4.5 Platform Admin production identity

#### FR-22: PlatformAdmin production identity/security

Platform Admin remains `platform_admin=true`, no `tenant_id`, apex `/platform/login`, light-only, TenantAdmin strictly separated.

### 4.6 Production security program

#### FR-23: Tenant-isolation security review

TenantIsolation CI gate still required; production threat review recorded.

#### FR-24: Authentication/authorization production review

JWT, refresh, OTP, handoff, CORS, and PlatformAdmin denial of tenant JWTs are reviewed for Production.

#### FR-25: Rate limiting and abuse protection

Existing fail-closed Redis limiters remain; production thresholds documented.

#### FR-26: reCAPTCHA production configuration

Production uses live reCAPTCHA keys. Test bypass tokens are absent. Google test keys never appear on Production.

#### FR-27: Production secret audit

Named inventory of every Production secret, owner, rotation note, and storage location. No values in git.

### 4.7 Edge: DNS and TLS

#### FR-28: Production DNS

`cohestra.app` and `*.cohestra.app` point only at the Production droplet when cutover is authorized.

**Consequences:**
- UAT records stay on UAT.
- DNS change is an owner gate.
- This planning pass does not modify DNS.

#### FR-29: TLS and certificate renewal

Production serves HTTPS with automated renewal. Certificate expiry is a WARNING then CRITICAL alert.

### 4.8 Billing (Live Paddle)

#### FR-30: Paddle live readiness

Production uses live Paddle credentials only after the owner gate. Sandbox credentials never appear in Production.

#### FR-31: Paddle webhook production monitoring

Live webhook destination `https://cohestra.app/api/v1/system/paddle/webhook` is monitored via disposition rows + alerts.

#### FR-32: Billing safety acceptance

No real monetary mutation without owner approval. Story 19.4 remains frozen. `PaddleCredentialGuard` remains in force.

### 4.9 Email

#### FR-33: SendGrid production configuration

Production SendGrid key, from-address, and domain authentication are independent of UAT.

#### FR-34: Email deliverability

SPF/DKIM/DMARC for the Production sender domain; delivery monitoring.

#### FR-35: Outbox reliability

Outbox dispatcher health, backlog, and Failed counts are observed and alerted. Requeue remains forbidden unless a later security-reviewed story exists.

### 4.10 Performance and capacity

#### FR-36: Performance baseline

p95 API latency for public registration, login, and dashboard is measured on a Production-like stack.

#### FR-37: Capacity baseline

Host CPU, memory, disk headroom recorded.

#### FR-38: Load testing

A load test (not against live customers) informs the capacity claim. Load-test seed remains Development-only.

#### FR-39: Disk/storage monitoring

Disk WARNING and CRITICAL alerts; campaign-asset volume included.

### 4.11 Legal, ops, acceptance, cutover

#### FR-40: Legal/privacy launch checks

ToS/privacy URLs, cookie/consent, PII in logs, backup access, and data-retention notes are reviewed.

#### FR-41: Incident runbooks

Runbooks exist for the CRITICAL alert classes.

#### FR-42: Release runbook

Pre-deploy checks, migration compatibility, backup gate, deploy, verify, smoke, observe, rollback.

#### FR-43: Support operating model

Who is on-call, what Platform Admin may do, how tenants report issues (existing support inbox).

#### FR-44: Production smoke acceptance

Smoke covers `/ready`, apex, tenant door, TLS, headers, SHA, Paddle webhook URL (no live charge), signup recaptcha presence.

#### FR-45: Responsive/browser production acceptance

1440×900 and 390×844 on Production URLs after go-live authorization (or on the dark Production host before public DNS).

#### FR-46: Accessibility regression

WCAG 2.2 AA regression on Production marketing + Platform Admin + one tenant door.

#### FR-47: Final production readiness matrix

A single matrix covering domains A–AX with PASS / FAIL / BLOCKED / OWNER GATE / NO-GO.

#### FR-48: Explicit production cutover gate

Public cutover happens only after the owner phrase **PRODUCTION CUTOVER: AUTHORIZED**.

**Consequences:**
- Epic 46 planning or story completion never infers GO.
- Agents must not point Production domains at UAT.

#### FR-49: Post-launch verification

After authorized cutover: SHA, `/ready`, signup, webhook, email, backups, alerts.

#### FR-50: Launch hypercare

A defined hypercare window with heightened alert attention and a daily SHA/health check.

## 5. Non-Functional Requirements

- **NFR-1 Security:** Least privilege; no public DB/Redis; GitHub Environment protections; log redaction; PlatformAdmin cannot reach infra shells.
- **NFR-2 Reliability:** `/ready` frozen; fail-closed limiters; deploy concurrency does not cancel an in-flight Production deploy.
- **NFR-3 Observability:** OTLP; no fake KPIs; missing instrumentation uses Epic 44 freshness values.
- **NFR-4 Performance:** Production-like p95 targets set in the NFR strategy after baseline (do not invent numbers here).
- **NFR-5 DR:** RPO/RTO in FR-12; restore test is the evidence, not the script existing.
- **NFR-6 Isolation:** TenantIsolation tests remain required on `main`. SM-1 unchanged.
- **NFR-7 Data minimization:** Telemetry prohibition list in FR-13.
- **NFR-8 Deploy safety:** SHA chain; owner release gate; CI ≠ GO.
- **NFR-9 Cost:** No paid observability or managed DB without owner approval.
- **NFR-10 Independence:** UAT automatic deploy remains; Production never shares UAT secrets, Paddle sandbox, or SendGrid identity.
- **NFR-11 Accessibility:** Inherit Epic 43.5 / 44 AA for any Platform Admin extension.
- **NFR-12 Evidence:** No fictional PASS. Missing evidence is FAIL.

## 6. Success Metrics

- **SM-1** SHA chain holds on every Production deploy attempt (including failed ones that abort before mutate).
- **SM-2** Isolated restore test passes before any backup-readiness claim.
- **SM-3** CRITICAL alerts have runbooks; page-worthy alerts are not noisy in a 7-day UAT-or-dark-prod observation.
- **SM-4** Readiness matrix has no silent gaps in domains A–AX.
- **SM-5** Production remains NO-GO until the owner phrase.

**Counter-metrics:** Alert volume that trains people to ignore pages. Time-to-restore claimed without a restore test. “Production ready” language on UAT evidence.

## 7. Scope Boundaries

**In scope:** Planning and later implementation of Epic 46 stories 46.1–46.15 as decomposed in `epics-production-launch-readiness.md`.

**Out of scope:**
- Reopening Epic 19 or Epic 45.
- Placing Production on the UAT droplet.
- Automatic Production deploy from every `main` merge.
- Cursor SSH to droplets.
- Creating charges, live Paddle config, Production DNS/TLS mutation, Production DBs, or Production secrets during planning.
- Rebuilding Platform Admin.
- New worker microservice.
- Paid vendor subscriptions without owner approval.
- Impersonation, SQL consoles, secret managers in Platform Admin, webhook replay, outbox requeue.

## 8. Owner Gates

Exact owner approvals (not ordinary engineering):

1. Production droplet purchase/creation
2. Managed PostgreSQL purchase (only if OPTION B selected)
3. Paid observability vendor/subscription
4. Production secrets population
5. Live Paddle credentials
6. Real financial transaction
7. Production DNS change
8. Production TLS/domain mutation when externally controlled
9. Production deployment (Environment `production` approval)
10. Production data migration
11. Final public cutover (`PRODUCTION CUTOVER: AUTHORIZED`)

## 9. Assumptions

- `[ASSUMPTION]` OPTION A (self-hosted Postgres) unless the owner picks OPTION B.
- `[ASSUMPTION]` OSS Grafana + OTel Collector + Prometheus/Loki/Tempo (or compatible) unless the owner picks a paid vendor.
- `[ASSUMPTION]` Initial Production size 8 GiB / 4 vCPU Basic droplet ($48/mo list price, DigitalOcean 2026-10-19).
- `[ASSUMPTION]` Production sender domain will be `cohestra.app` (independent of the current `creativorare.com` SendGrid runbook). Owner may confirm an alternate domain.
- `[ASSUMPTION]` Hypercare window is 14 days after authorized cutover unless the owner sets another duration.
- `[ASSUMPTION]` No new Platform Admin room; 46.8 extends Operations/Overview.

## 10. Open Questions (non-blocking for 46.1)

- Confirm Production sender domain (`cohestra.app` vs existing authenticated domain).
- Confirm whether GitHub Environment `production` already exists empty.
- Confirm on-call identity (owner-only vs additional operator).
- OPTION A vs B if the owner prefers managed backups at extra cost.

These do not block Story 46.1.

## 11. Production state

**PRODUCTION: NO-GO**
