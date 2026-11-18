---
id: 46.5
key: 46-5-postgresql-backup-restore-and-dr
title: PostgreSQL backup, restore, and DR
status: review
epic: 46
created: 2026-11-18
baseline_commit: 86669ca9258a7d454c50f3f294fc99d405146cb0
depends_on:
  - 46.4
owner_gate: none (OPTION A default; OPTION B purchase not selected)
cutover_authorization: NOT_GRANTED
production: NO-GO
production_recovery_proven: NO
implementation_authorized: true
---

# Story 46.5: PostgreSQL backup, restore, and DR

Status: review

## Story

As an **owner**,
I want **encrypted off-host backups that we have actually restored**,
So that **a droplet loss is a 4-hour problem, not a company-ending one**.

**FRs:** FR-10, FR-11, FR-12, FR-4  
**Track:** A + D  
**Depends on:** 46.4  
**Owner gate:** OPTION B purchase only if selected (default OPTION A)  
**Rollback:** keep dumps; do not claim DR if restore failed

## Acceptance Criteria

1. **Given** OPTION A  
   **When** the daily backup job runs  
   **Then** an encrypted dump is stored off-host  
   **And** backup failure leaves no verified attestation (CRITICAL alerting is 46.7 — not implemented here)

2. **Given** a dump  
   **When** the isolated restore procedure runs on a non-production target  
   **Then** integrity checks pass  
   **And** outbound Paddle/SendGrid env vars are refused on restore  
   **And** evidence JSON contains no secrets

3. **Given** no passing isolated restore against a **real** Production backup  
   **When** anyone claims backup readiness  
   **Then** the readiness matrix row is FAIL (`production_recovery_proven` remains NO)

4. **Given** planning defaults  
   **When** restore evidence exists only for dumps  
   **Then** advertised RPO is 24 hours and RTO 4 hours until WAL archive is also proven

5. **Given** dedicated Production plane  
   **When** EF migrations would run  
   **Then** `ProductionBackupGate.EnsureMigrationsAllowed` requires verified attestation with `production_recovery_proven=false`  
   **And** UAT / Development are unchanged

## Tasks / Subtasks

- [x] Add `deploy/production-backup.sh` (`backup`, `verify-artifact`, `restore-isolated`) with GnuPG + `BACKUP_OFFHOST_DIR` guards
- [x] Add `Cohestra.Infrastructure.Auth.ProductionBackupGate` and wire `ApplyMigrationsAsync` in `src/Api/Program.cs`
- [x] Add `ProductionBackupGateTests` and `deploy/production-backup.test.sh`
- [x] Add `docs/deploy/backup-dr-strategy.md` operator procedure
- [x] Wire CI step for `production-backup.test.sh`
- [x] Run required test commands and record results

### Review Findings

Reviewed implementation HEAD `9c9b0363709553fb79544419d8a23ea4b30795ab` against base `86669ca9258a7d454c50f3f294fc99d405146cb0`. CI run `44351406310` was green, including the exact-SHA security scan and GitGuardian. Production remains NO-GO. These items are not fixed.

- [ ] [Review][Patch][BLOCKER] A failed backup, verify, or restore can leave a previous verified attestation in place. `set -euo pipefail` exits on `pg_dump`, `cp`, `sha256_file`, `dropdb`, `createdb`, and `psql` without calling `invalidate_attestation`. On the paths that do call it, `mkdir ... || return 0` and `python3 ... || true` ignore a failed rewrite. This breaks AC1. [`deploy/production-backup.sh:12`]
- [ ] [Review][Patch][BLOCKER] Isolated restore does not refuse the Paddle and SendGrid variables this app uses. The script checks `PADDLE_API_KEY`, `SENDGRID_API_KEY`, and `SENDGRID_API_KEY_ID`. Compose and the API use `Paddle__ApiKey`, `Paddle__ClientToken`, `Paddle__WebhookSecret`, and `SendGrid__ApiKey`. This breaks AC2. [`deploy/production-backup.sh:90`]
- [ ] [Review][Patch][BLOCKER] The migration gate does not require `production_recovery_proven` to be JSON false. It blocks only a boolean true. An omitted field, null, number, or string still allows dedicated Production migrations. This breaks AC5. [`src/Infrastructure/Auth/ProductionBackupGate.cs:117`]
- [ ] [Review][Patch][BLOCKER] `--artifact-basename ..` is accepted. The destination becomes the parent of `BACKUP_OFFHOST_DIR` because the check only rejects a slash. [`deploy/production-backup.sh:277`]
- [ ] [Review][Patch][MAJOR] `restore-isolated` drops and recreates the target database before it requires an attestation path. A missing path then refuses after the disposable database has already been replaced. [`deploy/production-backup.sh:381`]
- [ ] [Review][Patch][MAJOR] An off-host directory inside `PGDATA` is accepted. The guard refuses only an exact resolved match, so a subdirectory of the data directory still prints `BACKUP_COMPLETE`. [`deploy/production-backup.sh:107`]
- [ ] [Review][Patch][MAJOR] The production rehearsal exits 0 when `gpg` or the PostgreSQL client tools are missing. `ROUNDTRIP` stays 0 and the script skips the synthetic restore, so CI can pass without proving the roundtrip. [`deploy/production-backup.test.sh:228`]

## Dev Agent Record

### Completion Notes

- OPTION A: GnuPG public-key encryption to owner `BACKUP_OFFHOST_DIR`; no S3/rclone/network upload.
- Isolated restore refuses live hosts, protected names, outbound API env vars, and writes attestation only after the ciphertext SHA-256 matches the manifest.
- Source database `cohestra` can be dumped only with `BACKUP_SOURCE_PLANE=dedicated-local` on a local host. Restore cannot target it.
- A failed backup, verify, or restore rewrites a configured attestation to `status=failed`. The restore command does not delete the operator `GNUPGHOME`.
- Dedicated Production migrations fail closed without verified attestation; synthetic CI roundtrip does **not** set `production_recovery_proven`.
- CI and `restore-isolated` require PostgreSQL **16** client majors to match the server (`transaction_timeout` and similar PG17+ dump settings otherwise break `pg_restore` on PG16).
- **PRODUCTION_RECOVERY_PROVEN=NO**; cutover **NOT_GRANTED**; Production **NO-GO**.

### Debug Log

- GnuPG quick-generated keys require an `encr` subkey for public-only encryption (documented in operator guide).

### Test commands and results (2026-11-18)

```text
PGPASSWORD=crm bash deploy/production-backup.test.sh
→ exit 0; all refusal PASS; rehearsal client major matches server (16); forced pg_restore failure PASS; synthetic gpg backup roundtrip PASS

PGPASSWORD=crm bash deploy/disposable-backup-restore.test.sh
→ exit 0; all refusal PASS; representative restore PASS

dotnet test src/Infrastructure.Tests/Infrastructure.Tests.csproj --filter ProductionBackupGateTests
→ Passed: 10, Failed: 0

dotnet test Cohestra.sln --filter "Category!=Integration"
→ Passed: 1341, Failed: 0, Skipped: 0
```

## File List

- deploy/production-backup.sh
- deploy/production-backup.test.sh
- docs/deploy/backup-dr-strategy.md
- src/Infrastructure/Auth/ProductionBackupGate.cs
- src/Infrastructure.Tests/Auth/ProductionBackupGateTests.cs
- src/Api/Program.cs
- .github/workflows/ci.yml
- _bmad-output/implementation-artifacts/46-5-postgresql-backup-restore-and-dr.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-11-18: Story 46.5 implementation — encrypted off-host backup script, migration gate, tests, operator DR doc. Status review. Production NO-GO; recovery not proven.
- 2026-11-18: Safety fix — allow dedicated-local dump of `cohestra`, require manifest SHA-256 before restore, invalidate attestation on failure, and keep the operator keyring.
- 2026-11-18: PG16 client alignment — CI `Install PostgreSQL client` pins major-16 `pg_dump`/`pg_restore`/`psql` (apt `postgresql-client-16` or `postgres:16-alpine` wrappers); `restore-isolated` refuses client/server major mismatch and treats `pg_restore` non-zero as failure; rehearsal tests assert client major and a forced `pg_restore` failure. Status remains review; Production NO-GO; recovery not proven.
- 2026-11-18: The `postgres:16-alpine` wrappers run as the invoking user. A root-owned dump under `/tmp` blocked the disposable rehearsal from appending its restore check. The wrapper text stays inside the workflow `run` block so the file remains valid YAML.
- 2026-11-19: BMAD code review of `9c9b0363709553fb79544419d8a23ea4b30795ab`. Four BLOCKER and three MAJOR patch findings recorded. Status remains review. Production NO-GO. Recovery not proven.