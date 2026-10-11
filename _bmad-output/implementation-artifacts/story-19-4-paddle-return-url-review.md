# BMAD Code Review — Story 19.4 Paddle return URL

**Reviewed HEAD (this report):** `b1aa4fbb` then patched; **final HEAD after in-scope fixes must be re-stated after commit.**  
**Reviewer:** Grok 4.6 (Blind Hunter + Edge Case Hunter + Acceptance Auditor, same model)  
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
| 6 | blind | NIT | dismiss | Port omitted from match — intentional, same as prior helper; required for `localhost:3000` vs portless host |
| 7 | auditor | NIT | dismiss | `X-Forwarded-Host: evil.example` 403s at tenant resolution; allow-list still unused for that host |
| 8 | auditor | — | defer | Live UAT / Paddle sandbox not run (explicit release restriction) |
| 9 | blind | NIT | dismiss | 400-before-503 and portal slug `Forbid` are intentional fail-closed |
| 10 | blind | NIT | defer | Default return URL uses slug public origin, not custom domain (browser always sends `window.location.href`) |
| 11 | edge | NIT | defer | Trailing-dot FQDN / IDN punycode |
| 12 | blind | NIT | dismiss | Apex host is not a tenant workspace origin |

Dismissed: 4. Deferred: 3. Patched in this loop: 1–5.

## Verdict after patches

Unresolved **BLOCKER**: none  
Unresolved **MAJOR**: none (1–2 patched)  

Product/UAT acceptance still required on an authorized deploy. Do not mark 19.4 done.
