# BMAD code review — 19.1/19.2 09:26 evidence record

**Reviewed content HEAD:** `8fb08ad5` vs previous review HEAD `aa60bc4c` (base `origin/main` `f293650d`)  
**PR:** #438 (draft). #437 stays draft at `54a98647`.  
**Model:** Grok 4.6 only. In-session Blind / Edge / Acceptance. No other models.

Stories 19.1 and 19.2 are **not** closed. Production **NO-GO**. Timer **not** installed. No nginx recreate.

## Diff (this iteration)

Docs only. Records owner 2026-10-11 ~09:26 UTC paste: `PERSISTENCE=EXPORT_ONLY`, `__EFMigrationsHistory` 50, resources/logs PASS, `ufw` inactive, image `Created` + `GIT_SHA` PARTIAL. Tracker statuses unchanged (`19.1` in-progress, `19.2` review).

## Layer results

### Blind Hunter

| Finding | Triage |
|---------|--------|
| 50 history rows vs 49 Up() files | **Dismiss as close-blocker** — count inspect is the gate; delta noted; Cohestra `uat-compose` postgres, not existing-app |
| `ufw` inactive recorded as a paste | **Dismiss** — matrix keeps firewall **BLOCKED**; planning AC is DO cloud inbound 22/80/443 |
| EXPORT_ONLY written into 19.2 | **Dismiss** — marked CONDITIONAL; owner acceptance of the workaround is still required |
| Image `Created` could be read as build provenance | **Dismiss** — matrix is **PARTIAL**; OCI `revision` still missing |

### Edge Case Hunter

| location | trigger | guard | Triage |
|----------|---------|-------|--------|
| Recreate of existing nginx | operator follows persist banner | Docs: do not recreate; live aliases `[]` must be kept | **Handled** |
| Prove script not on droplet `main` | owner ran from `~` then from checkout | Classification from equivalent inspect, not invented `PERSISTENCE=` line | **Handled** |
| Persist export of a bad vhost | container file stale | Public UAT HTTPS + listen 443 / SAN names in inspect | **Handled** |
| Wrong postgres | existing-app DB | Command was `deploy/uat-compose.sh exec -T postgres` | **Handled** |
| Reboot for MOTD / zombies | operator “fixes” host | Explicit do-not-reboot | **Handled** |

### Acceptance Auditor

| Gate | Verdict |
|------|---------|
| 19.1 close | **Met** (not closed; DO firewall + first-operator/preflight + OCI provenance still open) |
| 19.2 close | **Met** (not closed; EXPORT_ONLY observed, not owner-accepted; BIND not present; timer not operational) |
| No fabricated command output | **Met** |
| No merge / no nginx mutate / no timer install | **Met** |
| No live Paddle / recaptcha / prod | **Met** |

## Verdict

**No unresolved BLOCKER or MAJOR.**  
**Do not merge #437 or #438 without explicit owner authorization.**  
**Do not treat this evidence record as 19.1/19.2 close.**
