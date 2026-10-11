# BMAD code review — #438 HEAD after CI + ingest prep

**Reviewed content HEAD:** `a1a4b28e` (docs) on implementation tree `d3339598`  
**Required CI already on `d3339598`:** SUCCESS `38129104256` (6/6). Rerun required on the new HEAD.  
**PR:** #438 draft. #437 stays draft at `54a98647` — **not merged** (no owner “merge it” this turn).  
**Model:** Grok 4.6 only. In-session Blind / Edge / Acceptance.

Stories 19.1 / 19.2 **open**. Production **NO-GO**. Live images **unlabeled**.

## Implementation review (already on `d3339598`)

| Artifact | Check | Result |
|----------|--------|--------|
| `src/Api/Dockerfile` / `web/Dockerfile` | `ARG GIT_SHA=` on **final** stage + `LABEL org.opencontainers.image.revision` | Correct. Empty default. Does **not** prove running UAT images. |
| `docker-compose.uat.yml` | build.args `GIT_SHA: ${GIT_SHA:-}` on api + web; runtime env unchanged | Correct. No hardcoded SHA. |
| `renew-existing-site-http01.sh` | no `--deploy-hook`; no Docker socket; host `nginx -t` / reload after fingerprint | Correct. Lineage + `COHESTRA_AUTHORIZE_EXISTING_RENEW=1`. |
| Mocked renew tests | renew / no-op / certbot fail / nginx -t fail / UAT refuse / no auth | 6/0 (isolation). |
| System timers | system units in git | **Not installed**. |

## This iteration

Pin CI `38129104256`. Migrations stay **PASS** (no DB write). Missing firewall / preflight / first-operator → **BLOCKED**. Login-only walk path. Bind plan requires live network/mount dump; keep `cohestra_uat_edge` aliases `[]`.

## Layer results

### Blind Hunter

| Finding | Triage |
|---------|--------|
| OCI LABEL on running images | **Dismiss** — matrix PARTIAL; no rebuild |
| Missing preflight treated as FAIL | **Fixed** — BLOCKED |
| Merge #437 from “after authorization” wording | **Dismiss** — restrictions + no “merge it” this turn |

### Edge Case Hunter

| location | trigger | guard | Triage |
|----------|---------|-------|--------|
| Bind drops `cohestra_uat_edge` | compose edit | live dump must show both networks + empty aliases | **Handled** |
| Create-path when bootstrap closed | `registrationAvailable: false` | login-only; no invented account | **Handled** |
| Preflight paste leaks `.env` | owner pastes full shell | ingest asks for ✅/❌/⚠️ + summary only | **Handled** |

### Acceptance Auditor

| Gate | Verdict |
|------|---------|
| 19.1 close | **Met** (not closed) |
| 19.2 close | **Met** (not closed; EXPORT_ONLY unaccepted) |
| No merge / no nginx mutate / no timer / no rebuild | **Met** |

## Verdict

**No unresolved BLOCKER or MAJOR.**  
**Do not merge #437 or #438 without a later explicit owner command.**  
**Production NO-GO.**
