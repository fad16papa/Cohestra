# BMAD code review — `170458c` UAT marketing apex

**Status:** PASS (no unresolved BLOCKER / MAJOR on this HEAD)  
**HEAD:** `170458c`  
**CI:** PASS (5/5 jobs; GitGuardian neutral)  
**Story:** 19.1 inbound Host so `http://uat.cohestra.app/` is marketing, not tenant slug `uat`

## Loop

Mandatory Code Review Loop is in force. This review is of implementation HEAD `170458c` only.

## Layers

| Layer | Result |
|---|---|
| Blind Hunter | Findings triaged; copy-paste / naming / missing outbound tests dismissed or deferred |
| Edge Case Hunter | Trailing-dot, X-Forwarded-Host list, outbound builders, reserved slug `uat` — pre-existing, deferred |
| Acceptance Auditor | Inbound Host matches 19.1 locked hostname. Outbound `TenantPublicWebUrlBuilder` still rewrites to production apex — deferred, not caused by this diff |

## Verdict

`uat.cohestra.app` / `www.uat.cohestra.app` are marketing apex. `{slug}.uat.cohestra.app` is the tenant host. A row with slug `uat` is not bound from the UAT apex.

Product acceptance for `/` still requires the droplet API image rebuild onto this HEAD.

Do not mark Story 19.1 done. Do not merge PR #294.
