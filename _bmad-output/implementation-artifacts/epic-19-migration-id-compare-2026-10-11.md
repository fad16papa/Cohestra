# Story 19.1 — EF migration ID compare (2026-10-11)

**Mutation:** none. Owner pasted IDs from `/home/deploy/cohestra` (cwd miss from `~` first, then success).

## Result: MATCH (50 / 50)

| Item | Value |
|------|--------|
| Applied IDs (owner 09:37, Cohestra postgres) | **50** |
| Repo Up() files at `f293650d` / this PR | **50** |
| Extra / missing | **none** |
| `RESULT` | **MATCH** |

The earlier **49** file count was a tooling error: `grep -v Snapshot` also dropped `20260707140334_AddSitePagePreviousPublishedSnapshot` (real Up() migration for `site_pages.PreviousPublishedAt` + `previous_published_sections_json`). That ID **is** in the repo (Designer included) and **is** on UAT.

The deleted orphan `20260830140000_AddTenantEmailOnNewRegistration` is **not** in the history table.

`deploy/expected-ef-migration-ids.txt` now lists all 50. Compare self-test checks the list against Up() files using `! -name CohestraDbContextModelSnapshot.cs`, not a `Snapshot` substring.

## Gate

**PASS** — Cohestra volume, all current IDs applied, no unknown extras.

This does **not** close 19.1. Firewall, first-operator, preflight, and live OCI revision remain open.
