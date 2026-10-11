# Story 19.1 — EF migration ID compare (2026-10-11)

**Mutation:** none. Count 50 is **not** treated as harmless. Close stays blocked until IDs are pasted and compared.

## What is known

| Item | Value |
|------|--------|
| Owner count (09:26, Cohestra `uat-compose` postgres) | **50** |
| Repo Up() files at `f293650d` / #438 | **49** (`deploy/expected-ef-migration-ids.txt`) |
| Deleted-and-not-restored migration in git | `20260830140000_AddTenantEmailOnNewRegistration` (21114a20 → deleted 3bb03ef0) |
| Orphan Designer.cs | **none** — EF would not discover that class on a normal `MigrateAsync` |
| Fold | `EmailOnNewRegistration` was later added to `20260830141409_AddTenantFormTemplates` |

A count-only PASS was too weak. Status is **PARTIAL / ID-COMPARE BLOCKED**.

## Hypotheses (do not pick one without IDs)

1. Extra row is the deleted orphan ID. Schema may still be fine if `tenants.EmailOnNewRegistration` exists (folded migration or leftover column). Do **not** delete the history row without a column check.
2. Extra row is some other ID from an unmerged UAT deploy. That is an unknown schema object until identified.
3. Count 50 includes a duplicate / unexpected table. The pasted ID list will show this.

## Owner commands (non-secret)

```bash
cd /home/deploy/cohestra
# IDs only — no PII
bash deploy/uat-compose.sh exec -T postgres \
  psql -U crm -d cohestra -Atc 'SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY 1;' \
  | tee /tmp/uat-migration-ids.txt

# After this PR is on the droplet, or copy the 50 lines into the compare locally:
bash deploy/compare-ef-migration-ids.sh /tmp/uat-migration-ids.txt

# Column check (name only)
bash deploy/uat-compose.sh exec -T postgres \
  psql -U crm -d cohestra -c "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='EmailOnNewRegistration';"
```

Paste the 50 `MigrationId` lines (and the column name row). Do not paste other table dumps.

## Close rule

Migrations gate moves to **PASS** only when:

- all 49 expected IDs are present, and
- the single extra ID is identified, and
- the matching schema object is confirmed (or an owner-accepted leftover history row is recorded).

Until then 19.1 stays open.
