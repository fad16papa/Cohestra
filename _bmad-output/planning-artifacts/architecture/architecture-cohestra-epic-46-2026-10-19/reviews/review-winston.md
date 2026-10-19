---
reviewer: Winston (architect)
artifact: ARCHITECTURE-SPINE.md
date: 2026-10-19
verdict: PASS with owner-decision residual (OPTION B / paid OTel)
---

# Winston architecture review — Epic 46 spine

## Verdict

The spine is internally consistent with the brownfield modular monolith, Epic 44 Platform Admin plane, and Epic 45 UAT control plane. It does not reopen those epics. Production vs UAT isolation is enforceable. Jobs-in-API is evidence-backed. I would not send two implementation stories off this spine and expect them to invent incompatible topologies.

## Findings

### Critical

None.

### High

None remaining after distill. OPTION A vs B is an AD (AD-5) with an owner gate, not an unstated fork.

### Medium

1. **Collector/Grafana image tags are pinned at implement time.** Acceptable at epic altitude; 46.1 must pin digests before the host is built so 46.2 and 46.7 cannot pick different Grafana majors.
2. **OTel on the same droplet as prod traffic.** Disk and memory contention is a 46.12/46.7 concern. If load tests show the 8 GiB host saturates, the owner may move Grafana off-box (still OTLP) — that is a later spine update, not a silent story choice.
3. **Production Redis password** — closed in distill as **AD-15**. 46.4/46.9 must implement it.

### Low

- `docker-compose.production.yml` filename is locked; do not also create `docker-compose.prod-droplet.yml`.
- UAT `remote-deploy.sh` sequential builds exist because of 4 GiB OOM. Production recommend 8 GiB; 46.3 may still sequential-build to be safe.

## Adversarial pair test

Could 46.3 and 46.1 disagree on project name? AD-3 and AD-6 plus naming convention lock `cohestra-production` / `deploy-production`. Could 46.8 and 46.6 both invent metric JSON? Inherited AD-13 KPI envelope + AD-10 consume-not-collect. Could 46.5 and 46.4 split on managed vs local Postgres? AD-5 default OPTION A. Hole closed.

## Inherited conflicts

None. `/ready` stays frozen (AD-14 inherited). Live Paddle still blocked on UAT. Cursor still not SSH.

## Web-researched stack

- DigitalOcean Basic 8 GiB $48/mo list 2026-10-19
- Managed Postgres Standard 2 GiB $30.45 / 4 GiB $60.90 list 2026-10-19
- OpenTelemetry.Extensions.Hosting 1.20.0 released 2026-10-15

## Residual owner decisions (not architecture defects)

- OPTION B managed Postgres
- Paid observability
- Sender domain if not `cohestra.app`
