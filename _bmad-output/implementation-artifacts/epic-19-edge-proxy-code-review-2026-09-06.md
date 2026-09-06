# BMAD code review — Epic 19 Docker edge topology

**Implementation HEAD:** `9ca04c5`  
**Prior HEAD (invalid):** `20db8e2`  
**PR:** https://github.com/fad16papa/Cohestra/pull/294  
**Date:** 2026-09-06

## Pass 1 on `20db8e2` (stale)

BLOCKER/MAJOR: static `proxy_pass` IP cache; `compose down` could remove a shared network; compose overlay could replace live nginx networks; validator `|| true` false-pass; overlay `services:` merge risk.

## Fixes on `9ca04c5`

- `cohestra_uat_edge` is `external: true`; `uat-compose.sh` creates it
- Example vhost: `resolver 127.0.0.11` + variable `proxy_pass`
- Overlay has no `services:` (cannot be applied blindly)
- Reconcile refuses a container that does not publish 80/443
- Validator fails closed if the membership parser errors
- `zz-cohestra-uat.conf` naming so it is not default_server

`validate-uat-isolation.sh`: **23/23 PASS**

## Pass 2 on `9ca04c5`

No unresolved BLOCKER / MAJOR.

Deferred: live `docker network connect` still must be re-applied if the existing nginx is recreated; persist by editing **their** compose while keeping existing networks. ACME/HTTPS for the Cohestra hostname is Story 19.2.

**CODE REVIEW: PASS** on `9ca04c5`. Story 19.1 stays in-progress. Do not merge or deploy.
