# Production backup and disaster recovery (Story 46.5)

**OPTION A** — self-managed PostgreSQL on the dedicated Production droplet.  
**Production:** NO-GO until owner cutover phrase.  
**PRODUCTION_RECOVERY_PROVEN:** NO  
**Readiness:** FAIL until an owner runs isolated restore against a **real** off-host backup (not CI synthetic only).

WAL archiving is **not** implemented in this story. Do not claim point-in-time recovery.

| Planning default | Value |
| --- | --- |
| RPO | 24 hours (daily dump only) |
| RTO | 4 hours |

## Required owner-supplied settings

| Variable | Purpose |
| --- | --- |
| `BACKUP_OFFHOST_DIR` | Absolute directory for encrypted ciphertext (owner-provided off-host mount) |
| `BACKUP_GPG_PUBLIC_KEY_FILE` | Armored **public** key file for encryption on the backup host |
| `Backup__AttestationPath` | Path to JSON attestation consumed by the API migration gate |

The repository documents names only. Never commit keys, passwords, or connection strings.

`BACKUP_OFFHOST_DIR` must be an absolute path on an off-host mount the owner provides. A directory used only for local/CI tests is **not** Production off-host proof.

## Encryption

- Tool: **GnuPG** (`gpg`)
- Import the public key into a temporary `GNUPGHOME` for `backup`
- Encrypt with `gpg --batch --trust-model always`
- Refuse a key file that contains a `BEGIN PGP PRIVATE KEY BLOCK`
- The public key must include an **encryption** capability (for example an `encr` subkey)
- Private decryption material belongs on the **restore workstation**, not on the Production droplet
- On restore hosts, operators set `GNUPGHOME` to a keyring that holds the backup private key (out of band)

## Backup script

`deploy/production-backup.sh`:

| Command | Purpose |
| --- | --- |
| `backup` | `pg_dump --format=custom --no-owner`, encrypt, SHA-256, copy ciphertext to `BACKUP_OFFHOST_DIR`, write manifest (`status=backup_complete`) |
| `verify-artifact` | Recompute SHA-256; manifest must match (does not mark verified) |
| `restore-isolated` | Localhost disposable DB only; decrypt; `pg_restore`; write attestation (`status=verified`, `production_recovery_proven=false`) |

Example (names only):

```bash
export BACKUP_OFFHOST_DIR=/mnt/cohestra-backups
export BACKUP_GPG_PUBLIC_KEY_FILE=/etc/cohestra/backup-recipient.pub.asc
export PGHOST=postgres
./deploy/production-backup.sh backup --database cohestra
./deploy/production-backup.sh verify-artifact --artifact-basename cohestra-....dump.gpg
```

## Retention (policy)

14 daily, 4 weekly, 3 monthly — **policy only** in this story; no automated deletion is implemented here.

## Access control

- Backup ciphertext and manifests: **owner/ops** credentials only
- Not exposed in Platform Admin or the web application

## Key handling

- Public encryption key may live on the backup host
- Private decryption key **must not** live on the Production application droplet

## Recovery procedure (owner)

1. Provision an **isolated** restore target (localhost disposable DB or temporary host — never Production or UAT names).
2. Mount `BACKUP_OFFHOST_DIR` or copy the ciphertext artifact.
3. Configure `GNUPGHOME` with the offline private key on the restore station.
4. Run `restore-isolated` into a `*_disposable` database that passes name guards.
5. Confirm attestation JSON: `status=verified`, `production_recovery_proven=false`, expected `sha256` and row checks.
6. Point a non-production API at the restored DB only for validation; block outbound Paddle/SendGrid on that target.
7. Record evidence for 46.14; destroy the isolated target.

Synthetic CI rehearsal **does not** prove Production recovery.

## Production migration gate

When `Cohestra:DeploymentPlane=Production`, the API calls `ProductionBackupGate.EnsureMigrationsAllowed` before `Database.MigrateAsync`.

Dedicated Production requires:

- Valid `Backup__AttestationPath` file
- JSON `status=verified`
- 64-character hex `sha256`
- Basename `artifact` (no path segments)
- Disposable database name rules
- `production_recovery_proven` must be **false**

Any failure logs `BACKUP_GATE_BLOCKED` only (no attestation body). Migrations do not run.

UAT and Development planes are unchanged.

## Failure behavior

Any backup, encryption, verification, or restore failure leaves **no** verified attestation and blocks dedicated Production migrations until a new verified attestation exists.

## Related

- Disposable rehearsal: `deploy/disposable-backup-restore.sh`
- App rollback (not DB restore): `deploy/production-rollback.sh`
- Deploy workflow DB restore: `NOT_IMPLEMENTED_46_5` in `.github/workflows/deploy-production.yml`