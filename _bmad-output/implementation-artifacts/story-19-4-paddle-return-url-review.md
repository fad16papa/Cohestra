# BMAD Code Review — Story 19.4 Paddle return URL

**Implementation HEAD reviewed after patches:** `e38572cbad7dd4413a0f94e2eda5c687e15fc43d`  
**Prior review HEAD:** `b1aa4fbb` (stale after MAJOR patches)  
**Reviewer:** Grok 4.6 (Blind Hunter + Edge Case Hunter + Acceptance Auditor, same model; second pass on the patch HEAD)  
**Mandatory Code Review Loop:** in force. Story 19.4 is **not** closed.

## Layers

- Blind Hunter: completed
- Edge Case Hunter: completed
- Acceptance Auditor: completed — **no AC violations** on allow-list security constraints

## Triage

| ID | Source | Severity | Decision | Title |
| -- | ------ | -------- | -------- | ----- |
| 1 | blind+edge | MAJOR | patch | Invalid/null `PublicWeb` used `TenantPublicWebUrlBuilder` production fallback |
| 2 | edge | MAJOR | patch | Null `PublicWeb:BaseUrl` could NRE in `Trim()` |
| 3 | blind+edge | MINOR | patch | Checkout defaults were not run through `IsAllowed` |
| 4 | blind | MINOR | patch | Custom domain had no portal integration proof |
| 5 | blind | NIT | patch | Slug origin not asserted once custom domain is present |
| 6 | blind+owner | MINOR | patch | Port omitted from match — tightened; scheme + host + `Uri.Port` (default 80/443 equivalent) |
| 7 | auditor | NIT | dismiss | `X-Forwarded-Host: evil.example` 403s at tenant resolution; allow-list still unused for that host |
| 8 | auditor | — | defer | Live UAT / Paddle sandbox not run (explicit release restriction) |
| 9 | blind | NIT | dismiss | 400-before-503 and portal slug `Forbid` are intentional fail-closed |
| 10 | blind | NIT | defer | Default return URL uses slug public origin, not custom domain (browser always sends `window.location.href`) |
| 11 | edge | NIT | defer | Trailing-dot FQDN / IDN punycode |
| 12 | blind | NIT | dismiss | Apex host is not a tenant workspace origin |

Dismissed: 3. Deferred: 3. Patched in this loop: 1–6.

## Second pass on `e38572cb`

Re-read `BillingReturnUrl`, portal/checkout, and the new tests. Invalid `PublicWeb` no longer becomes `https://{slug}.cohestra.app` for allow-listing. Checkout defaults go through `IsAllowed`. Custom-domain portal 503/400 paths exist.

Unresolved **BLOCKER**: none  
Unresolved **MAJOR**: none  

Residual NIT/defer only (live UAT/Paddle, trailing-dot FQDN). Product/UAT acceptance still required on an authorized deploy. Do not mark 19.4 done.

## Third pass — port origin (owner review finding)

**Decision:** tighten, do not accept. A nonstandard port is a different web origin. Paddle would otherwise be allowed to return to `{tenant-host}:8443`.

`MatchesWorkspace` now requires `returnUri.Port == origin.Port`. .NET `Uri.Port` treats omitted `:80` / `:443` as the default, so UAT `https://{slug}.uat.cohestra.app/settings/billing` still matches. Local PublicWeb `http://localhost:3000` requires `:3000` on the slug host. Custom-domain origins keep the public scheme’s default port and do not inherit the localhost dev port.

Unit and integration tests cover explicit `:443`, rejected `:8443` / portless localhost / `:3001`, and checkout/portal workspace URLs on `:3000`.

Unresolved **BLOCKER**: none  
Unresolved **MAJOR**: none  
Story 19.4 remains open. Production NO-GO. Do not merge without owner approval. #437/#438 untouched.

## Final gate

| Gate | Result |
| ---- | ------ |
| Spec | Defect scoped; 19.4 remains open |
| Implementation | Tenant public origin allow-list |
| Build | .NET 9 succeeded |
| Tests | Unit 1124; billing unit 24; billing integration 20; full integration 207; Next billing 29; isolation 51/0 |
| BMAD review | Pass on `e38572cb` (no unresolved BLOCKER/MAJOR) |
| Product/UX acceptance | Not claimed — needs authorized UAT deploy |
| CI | Watch PR #439 |
| Production | NO-GO |
