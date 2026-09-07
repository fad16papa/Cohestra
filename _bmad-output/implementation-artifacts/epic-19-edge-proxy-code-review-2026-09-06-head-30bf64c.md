# BMAD code review — Epic 19 Docker edge topology (exact HEAD)

**Implementation HEAD:** `30bf64c`  
**Prior reviewed HEAD (superseded for this revision):** `9ca04c5`  
**PR:** https://github.com/fad16papa/Cohestra/pull/294  
**Date:** 2026-09-06

## Scope

Adversarial review of the isolation + Dockerized edge-proxy contract after owner
host-local evidence and the reverse-proxy topology correction.

Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor.

## Blind Hunter

- Public edge is `lead-generation-crm-nginx-1` on `0.0.0.0:80/443`. Compose does
  not claim those ports. Frozen loopback binds stay `127.0.0.1:3100/5100/8180`.
- Example vhost uses Docker DNS (`resolver 127.0.0.11` + variable `proxy_pass`
  to `http://cohestra-uat-nginx:80`). No `127.0.0.1:8180` upstream.
- `cohestra_uat_edge` is `external: true`. Only Cohestra nginx joins it.
  Postgres/Redis/web/api/certbot stay on `cohestra_uat_internal`.
- Overlay YAML has no `services:` (cannot replace live nginx networks).
- Inspect is read-only (`docker inspect` / `exec` grep+ls+`nginx -t` only).
  Continues after a failed `nginx -t`. Walks `/etc/nginx` conf/templates.
  Does not print key material.
- Reconcile is `docker network connect` only and refuses a container that does
  not publish 80/443.

No BLOCKER / MAJOR.

## Edge Case Hunter

- `compose down` cannot delete `cohestra_uat_edge` while it is external.
- Static `proxy_pass` IP cache is avoided via variable + resolver.
- `zz-cohestra-uat.conf` naming so the new vhost is not HTTP `default_server`.
- Inspect glob/`find` skips missing dirs; no `cat` of `privkey.pem`.
- Swap missing → WARN only, not a port-audit FAIL.
- Validator 26/26 PASS locally.

Deferred (not merge-blocking for this pre-deploy PR):

- MINOR: validator safety checks are syntactic (grep), not a live Docker proof.
- MINOR: `docker network connect` must be re-applied if the existing nginx is
  recreated; persist later in **their** compose while keeping existing networks.
- Story 19.2 owns Cohestra HTTPS on the existing edge.

## Acceptance Auditor

Owner validation list (repo contract):

1. project `cohestra-uat` — PASS  
2–4. loopback 3100 / 5100 / 8180 — PASS  
5–6. Postgres/Redis unpublished — PASS  
7. internal network isolated — PASS  
8. only Cohestra nginx on shared edge — PASS  
9. stable Docker DNS alias `cohestra-uat-nginx` — PASS (repo); live resolve not applied  
10. existing app resources unchanged in this PR — PASS  
11. no host 80/443 — PASS  
12. public proxy snippet additive — PASS  

Live attach, existing-hostname regression, and SSH remain Story 19.1 execution
gates. This review does **not** authorize deploy or merge.

## Tests

- `deploy/validate-uat-isolation.sh` — 26/26 PASS  
- `dotnet test Cohestra.sln --filter "Category!=Integration"` — 838 passed  
- CI API integration: pre-existing flake
  `FormTemplatePlanLimitIntegrationTests.CreateFormTemplate_WhenBasicTenantAtSlotCap_Returns403PlanLocked`
  (class F — unrelated). Do not weaken.

## Verdict

**CODE REVIEW: PASS** on `30bf64c`.

No unresolved BLOCKER / MAJOR.

Story 19.1 stays **in-progress**. PR #294 stays **draft / DO NOT MERGE**.
No Cohestra deploy. Existing application untouched.
