---
title: Epic 46 parallel execution plan
status: final
created: 2026-10-19
tracks: 6
---

# Parallel execution plan

Six tracks. 46.1 is the only mandatory serial start. Do not start 46.15 without the cutover phrase.

## TRACK A — Infrastructure

Stories: **46.1** (start), **46.2**, **46.4** (with Track B), **46.5**

- Production host, network, Docker/runtime, database/Redis
- Owner gate: droplet; optional managed DB

## TRACK B — Delivery

Stories: **46.3**, rollback pieces of 46.3, SHA provenance

- GitHub Environment `production`, CI/CD, rollback
- Depends on 46.1 names; secrets after 46.2
- Owner gate: populate secrets; each Production deploy approval

## TRACK C — Observability

Stories: **46.6**, **46.7**

- Telemetry, metrics, logs, tracing, alerting
- 46.6 is mostly in-repo and can overlap 46.2
- Owner gate: paid vendor only if requested

## TRACK D — Operations

Stories: **46.8**, runbooks in **46.14**, DR evidence from **46.5**

- Platform Admin sanitized signals, incident/support processes
- 46.8 depends on 46.6 signals (or honest `missing_instrumentation`)

## TRACK E — External services

Stories: **46.10**, **46.11**, **46.13** (DNS/TLS)

- Paddle, SendGrid, DNS/TLS
- Owner gates: live Paddle, real money, DNS, TLS

## TRACK F — Acceptance

Stories: **46.9**, **46.12**, **46.14**, **46.15**

- Security, load/performance, production smoke, cutover readiness
- 46.9 parallel after 46.1
- 46.15 remains NO-GO

## Track dependency arrows

```
A.46.1 ─┬─► A.46.2 ─► A.46.4 ─► A.46.5 ─► F.46.14
        ├─► B.46.3 ─► A.46.4
        ├─► C.46.6 ─► C.46.7 ─► F.46.14
        │         └─► D.46.8 ─► F.46.14
        ├─► F.46.9 ────────────► F.46.14
        └─► F.46.12 ───────────► F.46.14
A.46.4 ─┬─► E.46.10 ──────────► F.46.14
        ├─► E.46.11 ──────────► F.46.14
        └─► E.46.13 ──────────► F.46.14
F.46.14 ─► F.46.15 (blocked)
```

UAT Track (Epic 45) continues independently. Do not serialize Epic 46 behind Epic 33 cinema work.

## Suggested first parallel wave after 46.1 merges

1. 46.6 (in-repo OTel) + 46.9 (security tests/docs) + 46.3 (workflow files, no secrets)
2. Owner: 46.2 droplet
3. Then 46.4 + 46.5 + 46.7
