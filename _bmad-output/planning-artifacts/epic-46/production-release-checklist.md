---
title: Epic 46 Production release checklist
status: final
created: 2026-10-19
production: NO-GO
---

# Production release checklist

Canonical operational checklist for Epic 46. Does not authorize cutover. UAT checklists remain for UAT.

Legend: OPEN = not done; GATE = owner approval required; NO-GO = public launch blocked.

## A–I Infrastructure and data

- [ ] A Dedicated Production droplet created (GATE)
- [ ] B Network/host hardening (22/80/443, SSH keys, no public 5432/6379)
- [ ] C `docker-compose.production.yml` topology including otel-collector; jobs in API
- [ ] D GitHub Environment `production` with reviewers (do not populate secrets in planning)
- [ ] E Production secrets isolated from UAT (GATE to populate)
- [ ] F Owner-gated deploy workflow; no auto-deploy from every main merge
- [ ] G Rollback script + runbook
- [ ] H PostgreSQL Production readiness (OPTION A default)
- [ ] I Automated encrypted off-host backups
- [ ] J Isolated restore test passed (without this, backup = FAIL)
- [ ] K DR RPO/RTO recorded against actual restore evidence
- [ ] L Redis internal + password

## M–T Observability

- [ ] M Structured logs + redaction
- [ ] N OpenTelemetry instrumentation (OTLP)
- [ ] O Metrics dashboards
- [ ] P Tracing
- [ ] Q Error tracking (OSS default)
- [ ] R Uptime monitoring
- [ ] S Alert matrix wired (not noisy)
- [ ] T Grafana operational dashboard

## U–AA Support and security

- [ ] U Platform Admin consumes sanitized signals
- [ ] V PlatformAdmin Production identity
- [ ] W Tenant-isolation review recorded
- [ ] X Authn/authz Production review
- [ ] Y Rate limiting / abuse
- [ ] Z reCAPTCHA Production keys, no bypass
- [ ] AA Secret audit (names/locations)

## AB–AI Edge and providers

- [ ] AB DNS (GATE) — never point Production names at UAT
- [ ] AC TLS + renewal
- [ ] AD Paddle live readiness (GATE)
- [ ] AE Paddle webhook monitoring
- [ ] AF Billing safety acceptance (GATE for real money)
- [ ] AG SendGrid Production independent of UAT
- [ ] AH Email deliverability (domain auth)
- [ ] AI Outbox reliability alerts

## AJ–AX Performance, legal, launch

- [ ] AJ Performance baseline
- [ ] AK Capacity baseline
- [ ] AL Load testing (not on customers)
- [ ] AM Disk/storage monitoring
- [ ] AN Legal/privacy launch checks
- [ ] AO Incident runbooks
- [ ] AP Release runbook
- [ ] AQ Support operating model
- [ ] AR Production smoke
- [ ] AS Responsive/browser
- [ ] AT Accessibility regression
- [ ] AU Final readiness matrix all rows filled
- [ ] AV Cutover gate: `PRODUCTION CUTOVER: AUTHORIZED` (GATE) — currently **NO-GO**
- [ ] AW Post-launch verification
- [ ] AX Hypercare window

## Hard rule

Epic 46 complete ≠ Production GO.
