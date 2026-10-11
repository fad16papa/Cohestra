# BMAD code review — 19.1/19.2 acceptance + HTTP-01 host renew

**Reviewed content HEAD:** `54881d63` vs `origin/main` `f293650d`  
**PR:** #438 (draft). #437 stays draft at `54a98647`.  
**Model:** Grok 4.6 only. In-session Blind / Edge / Acceptance. No other models.

Stories 19.1 and 19.2 are **not** closed. Production **NO-GO**. Timer **not** installed. No nginx recreate.

## Diff (this iteration)

Host-side `renew-existing-site-http01.sh` (no certbot deploy-hook), mocked tests (6/0), system timer units (install-later), expiry watch, persistence/renew docs, isolation 55/0.

## Layer results

### Blind Hunter

| Finding | Triage |
|---------|--------|
| systemd unit sets `COHESTRA_AUTHORIZE_EXISTING_RENEW=1` | **Dismiss** — install is the authorization boundary; script still refuses UAT names |
| “new droplet evidence” still BLOCKED | **Dismiss** — outputs were not pasted; not fabricated |

### Edge Case Hunter

| location | trigger | guard | Triage |
|----------|---------|-------|--------|
| certbot deploy-hook docker exec | no docker in certbot CT | removed; host fingerprint + exec | **Fixed** |
| fingerprint via nginx | certs not mounted | live discovery mounts certs; fail → FINGERPRINT_FAIL | **Handled** |
| `nginx -t` fail after disk change | bad conf | no reload; in-memory cert stays | **Handled** |
| user systemd timer | logout | system units, not user | **Handled** |
| UAT name on renew | operator mistake | refuse_wrong_lineage + isolation | **Handled** |

### Acceptance Auditor

| Gate | Verdict |
|------|---------|
| 19.1 close | **Met** (not closed; firewall/migrations/logs/provenance BLOCKED) |
| 19.2 close | **Met** (not closed; zz BIND BLOCKED; timer not operational) |
| Tests for renew / no-op / certbot fail / nginx -t fail | **Met** |
| No merge without owner | **Met** |
| No live Paddle / recaptcha / prod | **Met** |

## Verdict

**No unresolved BLOCKER or MAJOR.**  
**Do not merge #437 or #438 without explicit owner authorization.**  
**Do not treat CI green as 19.1/19.2 close.**
