# Story 46.4 code review 4 — HEAD `1308a60d`

Reviewer: Grok 4.6 (Blind Hunter + Edge Case Hunter + Acceptance Auditor)  
Mandatory Code Review Loop: this review targeted `1308a60daf711a536cc865e1478eca786faa1fc8` only.

Exact-HEAD CI on this SHA: https://github.com/fad16papa/Cohestra/actions/runs/40106674234 — SUCCESS (23:26 SGT, 24 Oct 2026).

## Result

**PASS** — unresolved BLOCKER = 0, unresolved MAJOR = 0.

Review 3 PASS was `ee5035ac`. Two later commits (docs evidence + shallow `origin/main` freeze fetch) made that review stale. This pass re-reviewed the current implementation HEAD.

## Triage

Hunter layers raised 22 adversarial items and 7 edge-case paths. Acceptance Auditor found no AC violations.

Kept residual MINORs are deferred below. Inflated BLOCKER/MAJOR claims were dismissed:

| Claim | Disposition | Why |
| --- | --- | --- |
| Dedicated-plane marker is opt-in | dismiss | Story design. UAT also uses `ASPNETCORE_ENVIRONMENT=Production`. Compose locks the marker. |
| Classified suffix is not live proof | dismiss | AC5 / owner gate. Script always prints `LIVE_ISOLATION_PROVEN=NO`. |
| Paddle names not required in classified compare | dismiss | Live Paddle is 46.10. Compose leaves Paddle empty; `AllowLive=false`. |
| Redis not pinned to hostname `redis` | dismiss | AC requires password + unpublished ports, not a hostname pin. |
| Seeders still invoked | dismiss | Operator/PlatformAdmin/Demo/Load/E2E seeders no-op when `Enabled=false`. Compose locks those flags. `SitePageSeeder` is content bootstrap, not a listed seed. One-shot still requires a UAT public base. |
| Tenant-label CORS | dismiss | AC3 requires `https://{label}.cohestra.app`. |
| Blank CORS slots unproven | dismiss | Review-2 fix; compose contract + CI Docker smoke passed. `appsettings.json` has exactly three localhost slots. |
| Two-dot freeze vs change-set | dismiss | Fail-closed ownership check for shallow CI. No 46.6/46.9 path differs vs `origin/main`. |

## Deferred MINOR (documented; no AC / security / architecture risk)

- Redis `password=` with no endpoint, or exotic loopback aliases (`::1:6379`, `.localhost`), are not rejected. Compose always sets `redis:6379,password=...`.
- `git diff` failure after `origin/main` exists would take the `else` PASS branch. `rev-parse` already failed closed if the ref is missing; CI run 40106674234 executed the freeze check.
- Host `--check-names` and C# `IdnHost` are not the same parser. Owner later uses both; API start remains fail-closed.

## Owner gates

Live classified UAT-versus-Production verification remains **PENDING**.  
`LIVE_ISOLATION_PROVEN=NO`. Production remains **NO-GO**. Do not merge autonomously.
