# BMAD Code Review — Story 19.4 Paddle interval switch

**Implementation HEAD reviewed:** `96b0e26b086b9aacc9861433260a4d315b46a0bd`  
**Reviewer:** Grok 4.6 (Blind Hunter + Edge Case Hunter + Acceptance Auditor, same model; no cross-model delegation)  
**Mandatory Code Review Loop:** in force. Story 19.4 is **not** closed.

## Layers

- Blind Hunter: completed
- Edge Case Hunter: completed
- Acceptance Auditor: completed — ACs for documented Paddle modes, fail-closed states, and sanitized errors hold on this HEAD

## Triage

| ID | Source | Severity | Decision | Title |
| -- | ------ | -------- | -------- | ----- |
| 1 | blind+edge | MAJOR | patch | Hard-coded `prorated_next_billing_period` on frequency changes and trials |
| 2 | edge | MAJOR | patch | Stale tenant `Trialing` must not force `do_not_bill` when Paddle is active without trial dates |
| 3 | edge | MAJOR | patch | Unknown/unmapped live price must not classify a frequency change |
| 4 | edge | MAJOR | patch | Defer vs immediate must use live Paddle interval, not stale tenant interval |
| 5 | edge | MAJOR | patch | Scheduled cancel must not be overwritten by an immediate item replace |
| 6 | edge | MINOR | patch | Empty item list used the “extra items” message |
| 7 | auditor | MINOR | patch | Checkout URL could stay `interval=monthly` while UI/POST were annual |
| 8 | auditor | MINOR | patch | Immediate banner said “next invoice” for yearly-now charges |
| 9 | auditor | — | defer | Live UAT SHA / Paddle error body not inspected (no SSH) |
| 10 | auditor | — | defer | No Paddle dollar-amount preview API; copy is policy-accurate, not invoice-accurate |
| 11 | auditor | — | defer | Authorized sandbox UAT after merge/deploy |
| 12 | blind | NIT | dismiss | Immediate confirm title is yearly-only; dialog is only opened for yearly upgrades |
| 13 | edge | NIT | defer | Deferred path still GETs the subscription a second time |
| 14 | blind | NIT | dismiss | Server logs still attach `PaddleApiException`; user-facing messages stay sanitized |

Patched in this loop: 1–8. Deferred: 9–11, 13. Dismissed: 12, 14.

## Second pass

Re-read `PaddleSubscriptionChangePolicy`, `UpgradeExistingSubscriptionAsync`, checkout validation/copy, and new unit tests.

- Trialing / open `trial_dates` → `do_not_bill`
- Active frequency change → `prorated_immediately`
- Same-frequency upgrade → `prorated_next_billing_period`
- Annual → monthly → deferred from **live** price interval
- Past due, scheduled change/cancel, extra items, quantity ≠ 1, unmapped price → no PATCH
- Provider 400/409/429/5xx → no entitlement change, no leaked detail

Unresolved **BLOCKER**: none  
Unresolved **MAJOR**: none  

Residual only: live UAT evidence, sandbox lifecycle, dollar preview. Do not mark 19.4 done. Production NO-GO. Do not merge or deploy without owner authorization. #437/#438 untouched.

## Final gate

| Gate | Result |
| ---- | ------ |
| Spec | Defect scoped; 19.4 remains open |
| Implementation | Status + transition state machine |
| Build | .NET 9 succeeded |
| Tests | See PR report |
| BMAD review | Pass after patches (no unresolved BLOCKER/MAJOR) |
| Product/UX acceptance | Not claimed — needs authorized UAT deploy |
| Production | NO-GO |
