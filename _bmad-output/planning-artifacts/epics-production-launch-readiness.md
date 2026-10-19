---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/implementation-artifacts/investigations/epic-46-production-launch-readiness-investigation.md
  - _bmad-output/planning-artifacts/prds/prd-cohestra-production-launch-2026-10-19/prd.md
  - _bmad-output/planning-artifacts/prds/prd-cohestra-production-launch-2026-10-19/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-cohestra-epic-46-2026-10-19/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/epic-46/observability-architecture.md
  - _bmad-output/planning-artifacts/epic-46/backup-dr-strategy.md
  - _bmad-output/planning-artifacts/epic-46/deployment-release-architecture.md
  - _bmad-output/planning-artifacts/epic-46/production-security-model.md
  - _bmad-output/planning-artifacts/epic-46/platform-admin-production-support-boundary.md
  - _bmad-output/planning-artifacts/epic-46/nfr-test-strategy.md
  - _bmad-output/planning-artifacts/epic-46/production-release-checklist.md
  - _bmad-output/planning-artifacts/epic-46/story-dependency-graph.md
  - _bmad-output/planning-artifacts/epic-46/parallel-execution-plan.md
  - _bmad-output/planning-artifacts/epics-platform-production-support.md
  - _bmad-output/planning-artifacts/epics-autonomous-delivery.md
  - _bmad-output/planning-artifacts/architecture/architecture-epic-44-platform-production-support/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-cohestra-epic-45-2026-10-15/ARCHITECTURE-SPINE.md
  - _bmad-output/project-context.md
  - docs/deploy/github-actions-cd.md
  - docs/deploy/paddle-production-cutover.md
project_name: cohestra
initiative: Production Infrastructure, Observability & Launch Readiness
outputNote: Dedicated file — does not replace Platform 0, Enterprise, Epic 19, 44, or 45 files
epicsApproved: 2026-10-19
storiesCompleted: 2026-10-19
validationStatus: passed
storyCounts:
  epic46: 15
updated: 2026-10-19
production: NO-GO
baseline_sha: dedcb1101aac48b80ad6ea3c7d88f695bb9953a5
---

# cohestra — Epic Breakdown (Production Launch Readiness)

## Overview

Canonical **Epic 46** for Cohestra's official production-release program: dedicated Production infrastructure, observability, DR, security, live-provider readiness, and an explicit cutover gate.

**Brownfield.** Extend deploy/compose/CI and the existing API/web. Do not reopen Epic 19. Do not repurpose Epic 45. Do not rebuild Platform Admin. Do not put Production on the UAT droplet.

**Planning only in this PR.** This file does not authorize `bmad-dev-story` for 46.1 in the same pass, droplet creation, live Paddle, DNS mutation, or secret population.

**Hard rule:** Epic 46 complete ≠ Production GO. Public cutover requires owner phrase `PRODUCTION CUTOVER: AUTHORIZED`.

## Requirements Inventory

### Functional Requirements

FR-1 Dedicated Production droplet
FR-2 Production network and host hardening
FR-3 Production Docker topology (jobs remain in API)
FR-4 PostgreSQL production readiness (OPTION A default)
FR-5 Redis production readiness
FR-6 GitHub Environment `production`
FR-7 Production secrets isolation
FR-8 Owner-gated production deployment + SHA chain
FR-9 Rollback strategy
FR-10 Automated backups
FR-11 Tested restore procedure
FR-12 Disaster recovery RPO/RTO
FR-13 Structured logging
FR-14 OpenTelemetry instrumentation
FR-15 Metrics
FR-16 Tracing
FR-17 Error tracking
FR-18 Uptime monitoring
FR-19 Alerts
FR-20 Production operational dashboard
FR-21 Platform Admin consumes sanitized signals
FR-22 PlatformAdmin production identity/security
FR-23 Tenant-isolation security review
FR-24 Authentication/authorization production review
FR-25 Rate limiting / abuse protection
FR-26 reCAPTCHA production configuration
FR-27 Production secret audit
FR-28 Production DNS
FR-29 TLS / certificate renewal
FR-30 Paddle live readiness
FR-31 Paddle webhook production monitoring
FR-32 Billing safety acceptance
FR-33 SendGrid production configuration
FR-34 Email deliverability
FR-35 Outbox reliability
FR-36 Performance baseline
FR-37 Capacity baseline
FR-38 Load testing
FR-39 Disk/storage monitoring
FR-40 Legal/privacy launch checks
FR-41 Incident runbooks
FR-42 Release runbook
FR-43 Support operating model
FR-44 Production smoke acceptance
FR-45 Responsive/browser production acceptance
FR-46 Accessibility regression
FR-47 Final production readiness matrix
FR-48 Explicit production cutover gate
FR-49 Post-launch verification
FR-50 Launch hypercare

### NonFunctional Requirements

NFR-1 Security — least privilege, no public DB/Redis, redaction
NFR-2 Reliability — `/ready` frozen, fail-closed limiters, non-cancelling prod deploy
NFR-3 Observability — OTLP, no fake KPIs
NFR-4 Performance — baselines measured in 46.12
NFR-5 DR — restore test is the evidence
NFR-6 Isolation — TenantIsolation CI remains
NFR-7 Data minimization — telemetry deny-list
NFR-8 Deploy safety — SHA chain; CI ≠ GO
NFR-9 Cost — no paid vendor without owner
NFR-10 Independence — UAT unchanged; no shared secrets
NFR-11 Accessibility — inherit 43.4/44 for Platform Admin extensions
NFR-12 Evidence — missing is FAIL

### Additional Requirements

- Do not invent a worker process (investigation: hosted services in API).
- `docker-compose.prod.yml` is a local overlay — not Production topology.
- OPTION A self-hosted Postgres unless owner selects OPTION B.
- OpenTelemetry.Extensions.Hosting 1.20.0 seed; pin collector/Grafana at implement time.
- Story 19.4 remains frozen historical sandbox acceptance.
- Cursor is not an SSH client (Epic 45 AD-1 inherited).
- Planning pass must not provision infrastructure or store production secrets.

### UX Design Requirements

UX-46-1: No new Platform Admin room by default. 46.8 extends Overview/Operations using Epic 44 KPI envelope, 43.4 tokens, light-only, 1440×900 and 390×844.
UX-46-2: Invoke Sally only if 46.8 proposes a new nav entry.
UX-46-3: Production marketing/tenant UX is existing product; this epic adds no consumer chrome.

### FR Coverage Map

FR-1: 46.1, 46.2
FR-2: 46.2
FR-3: 46.1, 46.4
FR-4: 46.1, 46.4, 46.5
FR-5: 46.1, 46.4
FR-6: 46.3
FR-7: 46.3, 46.4, 46.9
FR-8: 46.3
FR-9: 46.3
FR-10–12: 46.5
FR-13–17: 46.6
FR-18–20, FR-39: 46.7
FR-21–22: 46.8
FR-23–27: 46.9
FR-28–29, FR-44: 46.13
FR-30–32: 46.10
FR-33–35: 46.11, 46.6/46.7 for outbox alerts
FR-36–38: 46.12
FR-40–47: 46.14
FR-48–50: 46.15
NFR-8, NFR-10, FR-48: all stories (NO-GO)

## Epic List

- Epic 46: Cohestra Production Infrastructure, Observability & Launch Readiness (46.1–46.15)

## Epic 46: Cohestra Production Infrastructure, Observability & Launch Readiness

Stand up a dedicated, observable, recoverable Production world that deploys only through an owner release gate, while UAT stays on the existing shared droplet. Production remains NO-GO until the owner cutover phrase.

### Story 46.1: Production architecture and infrastructure baseline

As a **platform operator**,
I want **the Production topology, compose contract, and runbook names locked in-repo**,
So that **later stories do not invent a second hosting model or reuse UAT/shared-host guards**.

**FRs:** FR-1, FR-3, FR-4, FR-5
**Track:** A
**Depends on:** none
**Owner gate:** none
**Rollback:** delete new production compose/docs; UAT untouched

**Acceptance Criteria:**

**Given** this story lands
**When** engineers inspect the repo
**Then** `docker-compose.production.yml` exists with project `cohestra-production` and services web, api, postgres, redis, nginx, otel-collector
**And** postgres and redis have no public host ports
**And** API still hosts outbox and billing/expiration jobs (no worker service)
**And** `docker-compose.prod.yml` remains documented as local overlay only
**And** `.env.production.example` lists secret **names** only

**Given** the UAT path
**When** this story is merged
**Then** `deploy.yml` still uses Environment `uat` and concurrency `deploy-uat`
**And** no workflow auto-deploys Production

**Given** documentation
**When** `docs/deploy/production-launch-program.md` is read
**Then** it points at Epic 46 as canonical Production program
**And** it states PRODUCTION=NO-GO
**And** it forbids placing Production on the UAT droplet

---

### Story 46.2: Dedicated production host and network hardening

As an **owner**,
I want **a new droplet that only hosts Cohestra Production**,
So that **UAT and lead-generation-crm never share the Production runtime**.

**FRs:** FR-1, FR-2
**Track:** A
**Depends on:** 46.1
**Owner gate:** droplet purchase/creation
**Rollback:** destroy the new droplet; never reuse UAT host

**Acceptance Criteria:**

**Given** owner approval to create the droplet
**When** 46.2 executes
**Then** a new DigitalOcean droplet exists that is not the UAT/CRM host
**And** firewall allows 22 (source-restricted), 80, 443 only
**And** 5432, 6379, 3000, 8080 are not publicly reachable
**And** password SSH is disabled

**Given** no owner approval
**When** an agent attempts to create the droplet
**Then** the story remains blocked and records OWNER GATE
**And** UAT is not modified

---

### Story 46.3: GitHub Production Environment and owner-gated CI/CD

As an **owner**,
I want **Production deploys to require my Environment approval on a pinned SHA**,
So that **merging to main cannot ship Production the way it ships UAT**.

**FRs:** FR-6, FR-7, FR-8, FR-9
**Track:** B
**Depends on:** 46.1 (workflow files); 46.2 (live target)
**Owner gate:** populate production secrets; each deploy approval
**Rollback:** disable workflow; Environment `uat` unchanged

**Acceptance Criteria:**

**Given** CI is green on a 40-character SHA
**When** nobody has approved Environment `production`
**Then** Production deploy does not run

**Given** owner approval of that SHA
**When** the Production workflow runs
**Then** REVIEWED = CI = DEPLOY TARGET = RUNTIME SHA is verified
**And** mismatch fails closed
**And** concurrency group is `deploy-production` with `cancel-in-progress: false`

**Given** missing `PROD_DROPLET_*` secrets
**When** the workflow starts
**Then** it fails with `MISSING_SECRET=<NAME>` and prints no values

**Given** a previous accepted SHA
**When** rollback is invoked
**Then** `deploy/production-rollback.sh` targets that SHA
**And** DB restore is opt-in, not implicit

**Given** this story
**When** `main` is pushed
**Then** UAT auto-deploy still runs
**And** Production does not

This story must not populate secret values in git or in chat.

---

### Story 46.4: Production runtime, config, and secrets isolation

As a **platform operator**,
I want **Production `.env` and compose runtime isolated from UAT**,
So that **sandbox Paddle, UAT SendGrid, and UAT JWT material cannot boot the Production API**.

**FRs:** FR-3, FR-4, FR-5, FR-7
**Track:** A + B
**Depends on:** 46.2, 46.3
**Owner gate:** production secrets (names filled by owner on host)
**Rollback:** leave host powered off

**Acceptance Criteria:**

**Given** Production compose
**When** the API starts
**Then** `ASPNETCORE_ENVIRONMENT=Production`
**And** demo/load/operator seeds are false
**And** `DEV_TENANT_SLUG` is unset
**And** Redis requires a password
**And** `PaddleCredentialGuard` still refuses sandbox/live mix and UAT hosts

**Given** UAT `.env`
**When** compared to Production
**Then** no secret values are shared
**And** a classified check (names/suffixes only) is recorded

---

### Story 46.5: PostgreSQL backup, restore, and DR

As an **owner**,
I want **encrypted off-host backups that we have actually restored**,
So that **a droplet loss is a 4-hour problem, not a company-ending one**.

**FRs:** FR-10, FR-11, FR-12, FR-4
**Track:** A + D
**Depends on:** 46.4
**Owner gate:** OPTION B purchase only if selected (default OPTION A)
**Rollback:** keep dumps; do not claim DR if restore failed

**Acceptance Criteria:**

**Given** OPTION A
**When** the daily backup job runs
**Then** an encrypted dump is stored off-host
**And** backup failure alerts CRITICAL

**Given** a dump
**When** the isolated restore procedure runs on a non-production target
**Then** integrity checks pass
**And** outbound Paddle/SendGrid are blocked on that target
**And** evidence JSON contains no secrets

**Given** no passing isolated restore
**When** anyone claims backup readiness
**Then** the readiness matrix row is FAIL

**Given** planning defaults
**When** restore evidence exists only for dumps
**Then** advertised RPO is 24 hours and RTO 4 hours until WAL archive is also proven

---

### Story 46.6: Production observability instrumentation

As a **platform operator**,
I want **OpenTelemetry logs, metrics, and traces from API requests, outbox, Paddle webhooks, and jobs**,
So that **we are not blind the first time Production breaks**.

**FRs:** FR-13, FR-14, FR-15, FR-16, FR-17, FR-35
**Track:** C
**Depends on:** 46.1
**Owner gate:** none for OSS OTel; paid vendor is a gate
**Rollback:** feature-flag OTel exporter off; API still serves

**Acceptance Criteria:**

**Given** the API
**When** OpenTelemetry is enabled
**Then** packages export OTLP (Hosting 1.20.x line)
**And** HTTP, EF (no parameter values), Redis (no token payloads), outbox, Paddle webhook, and hosted jobs are instrumented
**And** `/ready` is unchanged (still three checks)

**Given** a log/trace containing a forbidden field
**When** redaction tests run
**Then** passwords, JWTs, API keys, Paddle/SendGrid/reCAPTCHA secrets, DB credentials, SSH keys, and default PII are absent
**And** `SendGridEmailSender` does not log recipient email or raw provider body in Production

**Given** the collector is down
**When** a request is served
**Then** the API does not crash

---

### Story 46.7: Metrics, dashboards, and alerting

As on-call,
I want **Grafana dashboards and a quiet alert matrix**,
So that **I page on `/ready` down and backup failure, not on every deploy log line**.

**FRs:** FR-18, FR-19, FR-20, FR-39
**Track:** C
**Depends on:** 46.6
**Owner gate:** paid observability subscription
**Rollback:** disable alert routes; keep collector

**Acceptance Criteria:**

**Given** the default OSS stack
**When** 46.7 completes
**Then** dashboards exist for latency, 5xx, `/ready`, postgres, redis, disk, memory, CPU, outbox, Paddle dispositions, SHA
**And** the alert matrix in `observability-architecture.md` is encoded as rules
**And** INFO events do not page

**Given** owner has not approved a paid vendor
**When** implementation chooses a backend
**Then** it is Grafana OSS + Prometheus + Loki + Tempo (or OTLP-compatible self-hosted equivalent)

---

### Story 46.8: Platform Admin production-support telemetry integration

As a **PlatformAdmin**,
I want **sanitized Production signals on Overview/Operations**,
So that **I can support tenants without Grafana login or SSH**.

**FRs:** FR-21, FR-22
**Track:** D
**Depends on:** 46.6 (honest missing_instrumentation allowed until 46.7)
**Owner gate:** none for read-only KPIs
**UX:** UX-46-1
**Rollback:** hide new cards; Epic 44 pages remain

**Acceptance Criteria:**

**Given** PlatformAdmin
**When** they open Overview/Operations
**Then** new figures use the Epic 44 KPI envelope
**And** missing telemetry is `missing_instrumentation` or `unavailable`, never a fake healthy chart
**And** no SSH, SQL, secrets, webhook replay, or outbox requeue controls exist

**Given** a TenantAdmin JWT
**When** they call any new platform telemetry route
**Then** 403 and TenantIsolation tests cover it

**Given** this story
**When** UX is reviewed
**Then** no new nav room is added unless a Sally spec is explicitly added (default: none)

---

### Story 46.9: Production security and tenant-isolation hardening

As an **owner**,
I want **a recorded Production threat review and the holes it finds closed**,
So that **launch does not depend on UAT luck**.

**FRs:** FR-23, FR-24, FR-25, FR-26, FR-27
**Track:** F
**Depends on:** 46.1; host items on 46.2/46.4
**Owner gate:** none for the review; secret rotation if audit demands owner action
**Rollback:** do not weaken ProductionSecurityValidator or PaddleCredentialGuard

**Acceptance Criteria:**

**Given** `production-security-model.md`
**When** 46.9 completes
**Then** each row has PASS/FAIL with evidence
**And** Production Redis requires a password
**And** Production compose still publishes no 5432/6379
**And** Production reCAPTCHA is enabled with empty bypass
**And** CORS origins are Production hosts only
**And** nginx CSP allows live Paddle and does not require sandbox Paddle
**And** secret audit lists names and locations, zero values in git

**Given** TenantIsolation
**When** CI runs
**Then** the gate remains required
**And** no new Production support query bypasses tenant filters except documented PlatformAdmin IgnoreTenantFilters

---

### Story 46.10: Paddle live readiness

As an **owner**,
I want **Production to be able to use live Paddle without dragging UAT into live mode**,
So that **sandbox tenants keep sandbox money**.

**FRs:** FR-30, FR-31, FR-32
**Track:** E
**Depends on:** 46.4; public URL prefers 46.13
**Owner gate:** live credentials; any real financial transaction
**Rollback:** unset AllowLive; restore sandbox on UAT only

**Acceptance Criteria:**

**Given** UAT
**When** 46.10 is in progress or done
**Then** UAT still cannot use live keys (`PaddleCredentialGuard` / uat host rule)
**And** Story 19.4 remains frozen

**Given** Production `.env` without owner live gate
**When** live keys are present
**Then** the API refuses to start unless `AllowLive` is true **and** the public host is not UAT
**And** agents must not paste live key values

**Given** owner-approved live destination
**When** webhook monitoring is configured
**Then** Platform Admin deliveries + CRITICAL/WARNING alerts exist
**And** no Replay control exists

**Given** billing safety
**When** a real charge is requested
**Then** it is a documented owner gate, not a story AC to “just try a $1 charge”

---

### Story 46.11: SendGrid and email production readiness

As an **owner**,
I want **Production email identity separate from UAT**,
So that **a UAT key leak or creativorare.com change cannot silently become Cohestra Production mail**.

**FRs:** FR-33, FR-34, FR-35
**Track:** E
**Depends on:** 46.4
**Owner gate:** Production sender-domain DNS if externally controlled
**Rollback:** disable campaign send; API still requires Production SendGrid to boot

**Acceptance Criteria:**

**Given** Production
**When** SendGrid is configured
**Then** the API key and From domain are not the UAT identity
**And** `UseSandbox=false` as Production already requires
**And** domain authentication evidence is recorded (SPF/DKIM)
**And** this planning pass did not create the SendGrid subscription

**Given** outbox email failures
**When** alerts from 46.7 exist
**Then** WARNING fires on handler fail rate per the matrix
**And** Platform Admin still has no requeue button

---

### Story 46.12: Performance, capacity, and load acceptance

As an **owner**,
I want **measured p95 and host headroom**,
So that **we do not launch on a 4 GiB host because UAT happened to work**.

**FRs:** FR-36, FR-37, FR-38
**Track:** F
**Depends on:** 46.1; prefers 46.4-like compose
**Owner gate:** none
**Rollback:** none (report only)

**Acceptance Criteria:**

**Given** a Production-like stack
**When** load tests run
**Then** they do not target customer DNS
**And** LoadTestSeed remains disabled in Production
**And** a report records p95/p99, error rate, CPU, RAM, disk
**And** 46.7 latency WARNING threshold is set to 2× measured p95
**And** a go/no-go size recommendation is recorded (planning seed: 8 GiB)

---

### Story 46.13: Production DNS, TLS, and readiness smoke

As an **owner**,
I want **HTTPS on the Production host and a smoke that proves SHA and `/ready`**,
So that **cutover is a DNS decision, not a science experiment**.

**FRs:** FR-28, FR-29, FR-44
**Track:** E + F
**Depends on:** 46.2, 46.3, 46.4
**Owner gate:** public Production DNS change; public TLS for `cohestra.app`
**Rollback:** leave public DNS on previous records (likely none); keep UAT DNS

**Acceptance Criteria:**

**Given** no owner DNS approval
**When** 46.13 runs
**Then** smoke may use a dark host or IP/Host header
**And** `cohestra.app` is not pointed at UAT
**And** `cohestra.app` is not pointed at Production until cutover if the owner withholds DNS

**Given** TLS on the Production host
**When** certificates exist
**Then** renewal is automated
**And** expiry alerts exist (from 46.7)

**Given** smoke
**When** it passes
**Then** `/ready` is Healthy, HTTPS works, security headers present, runtime SHA matches
**And** Paddle webhook path returns 400 missing signature (no live charge)

---

### Story 46.14: Final production release acceptance

As an **owner**,
I want **one matrix covering A–AX with honest PASS/FAIL/GATE/NO-GO**,
So that **nobody infers launch from a green CI badge**.

**FRs:** FR-40 through FR-47, plus residual gaps
**Track:** F
**Depends on:** 46.5–46.13, 46.9, 46.12
**Owner gate:** none to fill the matrix; cutover remains NO-GO
**Rollback:** n/a

**Acceptance Criteria:**

**Given** domains A–AX
**When** 46.14 completes
**Then** every row has a status and evidence pointer
**And** legal/privacy, incident runbooks, release runbook, and support model exist
**And** browser 1440×900 and 390×844 plus a11y regression are recorded for Production URLs or dark host
**And** the matrix header still says PRODUCTION=NO-GO
**And** backup row is FAIL unless 46.5 restore proof exists

**Given** any BLOCKER/MAJOR from Murat NFR audit of implemented evidence
**When** 46.14 is proposed done
**Then** it cannot close until those are fixed or owner-accepted in writing

---

### Story 46.15: Production cutover

As an **owner**,
I want **a cutover runbook that refuses to execute without my phrase**,
So that **Epic 46 finishing cannot quietly become a public launch**.

**FRs:** FR-48, FR-49, FR-50
**Track:** F
**Depends on:** 46.14
**Owner gate:** `PRODUCTION CUTOVER: AUTHORIZED`
**Rollback:** revert public DNS to not-Production; Production droplet may stay dark

**Acceptance Criteria:**

**Given** the owner has not written `PRODUCTION CUTOVER: AUTHORIZED`
**When** cutover scripts run
**Then** they exit non-zero
**And** they do not change Production DNS
**And** they do not migrate customer data
**And** they do not enable public traffic

**Given** the phrase is present
**When** cutover proceeds
**Then** DNS points `cohestra.app` / `*.cohestra.app` at the Production droplet only
**And** UAT domains remain on UAT
**And** post-launch verification (SHA, `/ready`, signup, webhook, email, backup job, alerts) is recorded
**And** hypercare window starts (planning default 14 days)

Until the phrase exists, this story is **blocked** even if 46.14 is PASS.

## Parallelism

See `_bmad-output/planning-artifacts/epic-46/parallel-execution-plan.md` (six tracks).

## Owner gates (exact)

1. Production droplet purchase/creation — 46.2
2. Managed database purchase — 46.5 only if OPTION B
3. Paid observability — 46.7
4. Production secrets population — 46.3/46.4
5. Live Paddle credentials — 46.10
6. Real financial transaction — 46.10
7. Production DNS change — 46.13/46.15
8. Production TLS/domain mutation when externally controlled — 46.13
9. Production deployment — each Environment `production` approval
10. Production data migration — 46.15
11. Final public cutover — 46.15 phrase

## Next story after this planning PR

**46.1 Production architecture and infrastructure baseline**

Do not implement 46.1 in the planning pass.

## Production

**NO-GO**
