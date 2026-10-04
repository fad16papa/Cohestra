# Story 40.3 independent review

Date: 2026-10-04
Reviewed HEAD: `cf4a0d11ec7d494f31f75c105da1d0fe8258d114`
Baseline: `7e7c3c07`
PR: https://github.com/fad16papa/Cohestra/pull/371
Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor, adversarial-general
Model: Grok 4.6. Composer 2.5 unused.

## Blind Hunter

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| BH-1 | MAJOR | Desktop `table-fixed` could clip `Contacted` / `Inactive` | **Fixed** before this note: `table-fixed` removed. |
| BH-2 | MINOR | Desktop still mounts a `md:hidden` card list in the DOM | Accept. `display: none` removes it from a11y/tab order. |
| BH-3 | NIT | Community lead list still uses the legacy CSS-grid `role="row"` header | Out of scope. Story 40.3 owns `/clients` only. |
| BH-4 | NIT | `Open in Follow-up` does not select the person | Accepted architecture. No `?clientId=`. |

## Edge Case Hunter

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| EH-1 | MINOR | Filter change resets page only through wrapped setters, not browser Back | Accept. Sort/page URL is Story 40.5. Fetch still clamps `page > totalPages`. |
| EH-2 | MINOR | Failed reload keeps previous `clients` in state | Accept. Table is gated on `!error`, so stale rows are not shown. |
| EH-3 | NIT | Basic `/clients?leadStatus=active` can be a no-match empty | Covered. Empty and no-match stay distinct; Basic entitlement test no longer requires Active. |
| EH-4 | NIT | Cross-tenant GetById is 404, not 403 | Preserved isolation. Denied state is proven with a 403 mock. |
| EH-5 | NIT | First Playwright locator hit hidden card links | **Fixed.** Tests now use `visible=true`. |

## Acceptance Auditor

| AC | Result | Evidence |
| --- | --- | --- |
| 1 List landmarks | PASS | Playwright 40.3 + screenshots |
| 2 Profile h1 / missing copy / status text | PASS | Profile tests + `LeadStatusBadge` |
| 3 Filters / export / campaign / no remount | PASS | URL test; remount `key` removed |
| 4 Responsive / 44px / no overflow | PASS | 390/768/1024/1440 |
| 5 Semantic table | PASS | No `role="row"`; Axe parent/children empty |
| 6 Open in Follow-up | PASS | Due-now → `/follow-up` |
| 7 160ms motion | PASS | Source contract + reduced-motion e2e |
| 8 Messenger 38.6 | PASS | Escape + focus restore |
| 9 Roles / plans / isolation | PASS | Member, Basic upgrade, isolation API |
| 10 No 40.4 / no production | PASS | Tracker has no 40-4 key |

## Adversarial-general

1. Dual card+table markup is extra complexity; hidden cards must stay `display: none`.
2. 45px profile actions are a floor strengthening, not a weakened 44px assertion.
3. Combined 38.4–39.5 run’s first 39.4 failure was the known 43.999 residual; assertion unchanged; retry after 45px passed.
4. Inventory still describes the pre-change 42rem grid; that is historical, not the shipped contract.
5. Story file status must stay `review` / `in-progress`, never `done`.
6. Live API in this VM used `cohestra_test` and still had 48 default-tenant clients; isolation used px2-basic.
7. No real WhatsApp/Viber/email/campaign send occurred.
8. Calendar FAB name remains 43.5.
9. No `/opportunities`, no Follow-up tab, no `followUpCategory` on the Clients room request.
10. Draft PR must stay unmerged.

## Gate

Unresolved BLOCKER: **0**
Unresolved MAJOR: **0**

Story 40.3 remains **review**. Epic 40 remains **in-progress**. Stop for product-owner pre-merge review.
