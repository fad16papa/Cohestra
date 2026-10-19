---
title: Epic 46 Backup and DR strategy
status: final
created: 2026-10-19
owner: Winston + Murat
production: NO-GO
---

# Backup / DR strategy

Spine: AD-5, AD-11. OPTION A default.

## What exists

- Documented `pg_dump` on UAT (`docs/deploy/digitalocean-uat.md`)
- Paddle cutover “dump before live” note
- Edge nginx config backup scripts (UAT shared host — not Production)
- No restore script, no cadence, no isolated restore evidence
- Redis AOF on UAT compose; Redis is not system of record

**Backup is not ready.**

## Mechanism (OPTION A)

1. Daily `pg_dump` (custom format) of Production Postgres
2. Continuous WAL archive to off-host object storage (DigitalOcean Spaces or equivalent) once the daily dump path is proven
3. Pre-deploy dump gate when EF migrations are in the SHA
4. GPG or age encryption before upload; keys not stored on the same droplet only
5. Application volumes (campaign assets, support attachments) snapshotted daily to the same bucket

OPTION B (managed Postgres) would use vendor backups plus the same isolated restore test requirement. Not selected.

## Frequency / retention / location

| Item | Value |
| --- | --- |
| Full dump | Daily 03:00 UTC |
| WAL archive | Every 5 minutes once enabled |
| Asset rsync | Daily |
| Retention | 14 daily + 4 weekly + 3 monthly |
| Location | Off-host encrypted bucket in the same region; not the Production droplet disk as the only copy |
| Access | Owner/ops credentials; not in Platform Admin; not in web app |

## RPO / RTO

| Phase | RPO | RTO |
| --- | --- | --- |
| Until WAL proven | 24 hours (honest) | 4 hours |
| After WAL + restore test | 1 hour | 4 hours |

Redis: RPO not applicable for customer records. Refresh tokens/OTP limiter state may reset. Acceptable.

## Restore process (required)

1. Provision isolated restore target (temporary droplet or local docker — never overwrite Production until cutover recovery)
2. Decrypt backup
3. `pg_restore` into empty database
4. Apply volume restore if testing assets
5. Boot API against restored DB with Production-like env but non-production hostnames
6. Integrity checks: tenant count, outbox not executed against live Paddle/SendGrid (block outbound), `/ready`, one tenant login on isolated host
7. Record evidence JSON (no secrets)
8. Destroy isolated target

Cadence: first pass in 46.5; then monthly and after any backup-script change.

## Alerts

Backup failure = CRITICAL. Restore verification failure = CRITICAL.

## Rollback vs restore

- **App rollback:** previous accepted SHA, same database, only if migrations are backward compatible
- **Data restore:** when deploy corrupts data or migrations are forward-only — uses this DR path
- Pre-deploy backup gate exists so those two remain distinct
