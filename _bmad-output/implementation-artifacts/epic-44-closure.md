# Epic 44 closure

**Epic:** 44 — Platform Production Operations & Support Center  
**Decision:** READY TO MERGE (docs/tracker only). Owner merge required.  
**Closure date:** 2026-10-10  
**Final main baseline:** `368d48e0d93193c359a4383e09f408fdc301b286`  
**Model:** Cursor Grok 4.6. Composer 2.5 not used. Auto disabled.

## Final scope

Read-mostly PlatformAdmin production-support console on the existing Platform plane. No second frontend. No deploy. No Epic 19 close.

## Stories

| Story | PR | Accepted HEAD | Merge SHA | Status |
| ----- | -- | ------------- | --------- | ------ |
| 44.1 HTTP gates / recovery limits | #412 | `fa68a424` | `ee71efbd` | DONE |
| 44.2 Overview KPIs | #414 | `42504409` | `4cc59432` | DONE |
| 44.3 Health + Operations shell | #416 | `03580b49` | `65e68eed` | DONE |
| 44.4 Outbox read-only | #418 | `aef6a9e9` | `1d9101d3` | DONE |
| 44.5 Paddle disposition | #420 | `8e33695d` | `41fa809e` | DONE |
| 44.6 Tenant timeline | #424 | `6060062d` | `8d71dff5` | DONE |
| 44.7 Searchable audits | #426 | `048a22a7` | `520189f6` | DONE |
| 44.8 Support severity | #428 | `142ea248` | `ca801778` | DONE |
| 44.9 Version health | #430 | `31da0413` | `41282944` | DONE |
| Platform light-only correction | #431 | `d9c413ba` | `4d058ebf` | DONE |
| Light-only tracker-close | #433 | `c19ec533` | `368d48e0` | DONE |

All accepted HEADs are ancestors of `368d48e0`.

## Coverage

- FR-44-1..18: PASS — `_bmad-output/test-artifacts/traceability/epic-44-final-closure.md`
- NFR-44-1..10: PASS — `_bmad-output/test-artifacts/nfr/epic-44-final-closure.md`
- UX-44-1..11: PASS — same trace
- Investigation: `_bmad-output/implementation-artifacts/investigations/epic-44-final-closure-investigation.md`
- Retrospective: `_bmad-output/implementation-artifacts/epic-44-retro-2026-10-10.md`
- Canonical epic: `_bmad-output/planning-artifacts/epics-platform-production-support.md`
- Spine: `_bmad-output/planning-artifacts/architecture/architecture-epic-44-platform-production-support/ARCHITECTURE-SPINE.md`

## Security boundaries

PlatformAdminOnly. Tenant JWT 403. No secrets, payload bodies, or raw stacks in platform DTOs. Recovery Redis fail-closed. tenantId isolation on new list/detail filters.

## Forbidden / deferred (remain out of Epic 44)

| Item | State |
| ---- | ----- |
| Failed-outbox requeue | Deferred / unauthorized |
| Standalone Incident entity | Deferred |
| Impersonation | Forbidden — ABSENT |
| SQL / shell / Hangfire | Forbidden — ABSENT |
| Webhook / job replay | Forbidden — ABSENT |
| Mark Paid / payment-state change | Forbidden — ABSENT |
| Secret reveal / PayloadJson | Forbidden — ABSENT |
| Second frontend / identity merge | Forbidden — ABSENT |
| Anonymous `/ready` widening | Forbidden — ABSENT |
| Rollback / Redeploy / SSH UI | Forbidden — ABSENT |
| OpenTelemetry / Serilog pipeline | Deferred |
| Production cutover | Epic 19 |

## Platform light-only

`/platform`, `/platform/login`, `/platform/**` resolve `theme=light`. OS dark and stored dark/system ignored. Visiting Platform does not write `ThemePreference` or operator/public storage. Tenant Light/Dark/System, Settings → Appearance, ThemeToggle, public registration, tenant website, Brand Accent, Form Studio preserved.

## Story 44.9 version health

`GET /api/v1/platform/ops/version` PlatformAdminOnly. Valid SHA → `actual`. Missing → `missing_instrumentation`. Malformed → `unavailable` (no echo). `environmentName` is runtime. `apiVersion` is `v1`. Public `/api/v1/system/info` remains `{ Cohestra, v1 }`. `/ready` unchanged.

## CI evidence

| Kind | Run | Result |
| ---- | --- | ------ |
| #431 exact-head (incl. GitGuardian) | `38029492629` | SUCCESS |
| #431 post-merge main required jobs | `38032215748` | SUCCESS |
| #433 exact-head (incl. GitGuardian) | `38032575482` | SUCCESS |
| Current main required jobs | `38032868311` | SUCCESS |
| Deploy on `368d48e0` | `38033105770` | FAILURE — Epic 19 host gap |

GitGuardian did **not** run on the main push of `368d48e0`. Use the PR runs above.

## Remaining future action items

Recorded in sprint-status `action_items` (epic 44, status open). Suggestions only. No implementation authorization.

## Epic 19 independence

Epic 19 stays `in-progress`. Epic 44 done does not mean UAT complete, production ready, production deployed, Paddle live, or DigitalOcean access fixed.
