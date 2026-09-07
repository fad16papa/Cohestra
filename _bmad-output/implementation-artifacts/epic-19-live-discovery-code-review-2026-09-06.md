# BMAD code review — live nginx topology + additive vhost

**Implementation HEAD:** `29ba570`  
**PR:** https://github.com/fad16papa/Cohestra/pull/294  
**Date:** 2026-09-06

## Scope

Owner discover output on `af7eff9`. Repo updates: discovery record,
backup docker-cp fallback, `apply-additive-vhost.sh` for the real
single-file RO mount.

## Blind Hunter

- Existing hostname server blocks are not edited (`active-ssl.conf` untouched).
- Additive file is `zz-cohestra-uat.conf`; `nginx -t` before reload; rollback
  of the additive file if `-t` fails.
- Refuses `thesocialcollectivesg.com` and `127.0.0.1:8180`.
- Refuses apply until Cohestra nginx exists and edge network is attached.
- Backup still skips Let's Encrypt / privkey mounts.
- No existing-stack recreate.

No BLOCKER / MAJOR.

## Edge Case Hunter

- Host source under `/root/...` may be unreadable as `deploy` → docker cp fallback.
- `include conf.d/*.conf` means a second file is enough; persist later with a
  second bind mount, keeping `lead-generation-crm_default`.
- Apply is not wired into `live-19-1.sh` (cannot run too early by accident).

Deferred: Cohestra UAT hostname still owner-owned. Story 19.2 owns TLS.

## Acceptance Auditor

- LIVE EDGE DISCOVERY PASS recorded from real inspect — PASS  
- Existing app not mutated by this commit — PASS  
- Public proxy addition cannot replace existing server blocks — PASS  

## Tests

`validate-uat-isolation.sh` 30/30 PASS.

## Verdict

**CODE REVIEW: PASS** on `29ba570`. Story 19.1 in-progress. Do not merge or deploy Cohestra yet.
