# Story 41.1 four-layer review

HEAD: recorded at commit time in `test-results.md`.  
Model: Grok 4.6. Composer 2.5 unused.  
Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor, `bmad-review-adversarial-general`.

## Blind Hunter

No second Analytics room. No new KPIs, endpoints, saved views, or billing math. `/reports` still uses `destinationWithSearch`. 403 is denied. Export reasons are named. Filter history uses `router.push`; default query uses `replace`. Dashboard Graphs keeps `/dashboard?view=graphs` and adds `Open Analytics`.

Kept findings: none BLOCKER/MAJOR.

## Edge Case Hunter

Invalid `preset` → weekly. Invalid `leadStatus` dropped. Incomplete custom range does not fetch. Empty period disables export with a reason. Error on a new query key is cleared so stale+old-error cannot stick. Same-key 403 stays denied (no flash). Cross-tenant ranking/export IDs do not overlap.

Kept findings: none BLOCKER/MAJOR.

## Acceptance Auditor

Playwright 41.1 covers the 15 listed ACs. Protected 38.4–40.5 passed 51/51. Entitlements match Story 39.3 (Basic weekly open, monthly Core lock). Stories 41.2 and 41.3 were not created.

Kept findings: none BLOCKER/MAJOR.

## Adversarial (cynical)

Ten issues considered; none independently verified as BLOCKER/MAJOR.

1. UpgradePanel still mentions saved views — pre-existing copy; saved views remain a non-goal. **NIT / dismiss.**
2. Basic monthly still fires the reports request behind the lock — wasteful, not an unlock. **MINOR / defer.**
3. `reportFilterKey` is read in the fetch effect without being a dependency — intentional to avoid a success refetch loop. **NIT.**
4. Referral debounce can push multiple history entries — existing 400ms debounce. **NIT.**
5. Only the trend chart has a `<table>`; other charts use lists/`dl`. Accepted in architecture. **Dismiss.**
6. Operator appearance can persist dark into later screenshots. Perceivable; not a contract break. **Dismiss.**
7. Export toast `"Report exported."` for zero rows is unreachable because export is disabled. **NIT.**
8. Follow-up bars still use status color plus labels. Not color-only. **Dismiss.**
9. “Back to weekly” uses `replace` so lock is not a history trap. **Dismiss.**
10. No production seeder or DigitalOcean work. **Dismiss (non-goal).**

## Disposition

No unresolved BLOCKER or MAJOR. Story may move to `review` for product-owner stop-gate. Do not mark done. Do not merge.
