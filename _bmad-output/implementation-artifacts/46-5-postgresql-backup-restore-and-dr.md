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

## Dev Agent Record

### Completion Notes

- OPTION A: GnuPG public-key encryption to owner `BACKUP_OFFHOST_DIR`; no S3/rclone/network upload.
- Isolated restore refuses live hosts, protected names, outbound API env vars, and writes attestation only after integrity checks.
- Dedicated Production migrations fail closed without verified attestation; synthetic CI roundtrip does **not** set `production_recovery_proven`.
- **PRODUCTION_RECOVERY_PROVEN=NO**; cutover **NOT_GRANTED**; Production **NO-GO**.

### Debug Log

- GnuPG quick-generated keys require an `encr` subkey for public-only encryption (documented in operator guide).

### Test commands and results (2026-11-18)

```text
PGPASSWORD=crm bash deploy/production-backup.test.sh
→ all refusal PASS; synthetic gpg backup roundtrip PASS

PGPASSWORD=crm bash deploy/disposable-backup-restore.test.sh
→ all refusal PASS; representative restore PASS

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