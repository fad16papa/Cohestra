# BMAD code review — Epic 19 SSH/Docker gate + live phases

**Implementation HEAD:** `777ce18`  
**PR:** https://github.com/fad16papa/Cohestra/pull/294  
**Date:** 2026-09-06

## Scope

`uat-ssh-accept.sh` no longer requires `sudo -n` / `NOPASSWD: ALL`.
Droplet-side `live-19-1.sh` phases: discover / backup / attach / verify.
Fail-closed data-target proof and empty-backup refuse.

## Blind Hunter

- Passwordless sudo is optional WARN, not FAIL. Docker/Compose/sudo group are gates.
- Default deploy user is `deploy`. Root refused.
- Backup skips letsencrypt/privkey/account mounts and fails if zero configs copied.
- `live-19-1.sh` never runs `uat-compose.sh` and never writes `zz-cohestra-uat.conf`.
- Attach refuses without a backup MANIFEST, then re-verifies the existing app.
- Inspect remains read-only. No key material printed.

No BLOCKER / MAJOR.

## Edge Case Hunter

- Named-volume / image-only nginx config → backup FAIL (correct; do not attach blind).
- `verify-existing-app.sh` uses `"status":"Healthy"` grep (no python required).
- Host patch/reboot is not automated.
- This Cloud Agent still cannot SSH — live discovery is an owner-session step.

Deferred MINOR: validator checks are syntactic; live proof requires the droplet.

## Acceptance Auditor

Owner contract:

- SSH/Docker capabilities without weakening to NOPASSWD: ALL — PASS  
- Existing app baseline recorded; not mutated from this agent — PASS  
- Live discover → backup → attach order enforced — PASS  
- Cohestra not started — PASS  
- Paddle/SendGrid not printed or rotated — PASS  

## Tests

- `validate-uat-isolation.sh` 29/29 PASS  
- `dotnet test` Category!=Integration — 838 passed  

## Verdict

**CODE REVIEW: PASS** on `777ce18`.

Story 19.1 stays **in-progress**. PR #294 stays draft. No deploy from this agent.
