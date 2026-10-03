# Story 40.2 independent review

Date: 2026-10-03  
Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor, `bmad-review-adversarial-general`  
Reviewed HEAD after first implementation, then patched, then this note.

## First-pass unresolved MAJORs (patched)

| ID | Finding | Action |
| --- | --- | --- |
| BH-1 | Short/incomplete page merge could look like success / empty | Fail closed when `merged.size < totalCount`; use `result.pageSize` |
| BH-2 | Permission sniffed from error text | Permission = `FollowUpAccessError` only |
| AC9 FAB / 390 chips | FAB overlap; Healthy off-canvas at 390 | Room `pb-20 md:pb-24`; chips `flex-wrap`; Healthy must be in viewport |
| Error honesty | Raw API detail; primary button contrast | Locked supporting copy; outline 44px Try again |
| Caption | “Last recorded outreach · Never” | Never append “Never” |
| TZ flash | Categorize before shell TZ | Keep loading while `shell.loading` |
| Card a11y name | `Open {name}` hid category | `Open {name}, {category}` |

## Dismissed / deferred (not close-blocking)

| Finding | Class | Why |
| --- | --- | --- |
| Relitigate locked category meanings vs cinema §4 prose | dismiss | Locked contract uses authoritative lead-status + due + outreach fields. No invented windows. |
| Dashboard vs room due-helper residual | defer | Documented in category-derivation. Do not import cinema. |
| Unbounded page fetch | dismiss | Architecture: paginate existing API until exhausted; fail closed if short. |
| Shared ProductEmptyState 36px CTAs | defer | Shared primitive; chips and result rows / retry meet 44px. |
| Invalid `?category=` left in URL | NIT | Resolves to Due now; no 404. |
| Adversarial “no evidence / QA pending” | dismiss | Playwright 6/6, protected 28/28, screenshots under `viewports/`. |

## Re-review of patched implementation

No remaining in-scope BLOCKER or MAJOR after the patch set. Story stays **review** / draft PR. Not done. Not merged. 40.3 not started.

## Composer 2.5

Not used.
