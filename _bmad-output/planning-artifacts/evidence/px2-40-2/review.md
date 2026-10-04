# Story 40.2 independent review

Date: 2026-10-03  
Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor, `bmad-review-adversarial-general`  
Final implementation HEAD reviewed below. Composer 2.5 unused.

## Retracted disposition

**The previous “unbounded page fetch dismissed” finding is retracted.**

PO MAJOR 1 (full-tenant sequential fan-out) and MAJOR 2 (unstable multi-request pagination without a unique sort tie-breaker) are accepted defects of the original “existing API only + client-side walk” architecture.

Corrected decision: extend `GET /api/v1/admin/clients` with optional `followUpCategory` + authoritative `followUpCategoryCounts`, return only the selected category page, and apply primary sort + unique client `Id` on every shared clients-list sort. Client-side full-tenant fan-out is forbidden.

Sprint change proposal: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-03-story-40-2.md` (Direct Adjustment).

## Four-layer triage on `c835a30d` (then patched)

Independent layers re-ran on **final candidate** `c835a30d`.

| Layer | BLOCKER | MAJOR | Disposition |
| --- | --- | --- | --- |
| Blind Hunter | 0 | 0 | BH-01 (chip `totalCount` alias) already gone. Residuals MINOR/NIT: chip vs `CountAsync` race, isolation page-1 items-only, skip overflow, dirty invalid `?category=`. |
| Edge Case Hunter | 0 | 0 | Requested boundaries guarded. NIT: skip overflow keeps huge URL; chip/`CountAsync` are two queries. |
| Acceptance Auditor | 0 | 0 | PO required tests and ACs 1–11 present. MINOR test-depth only (permission e2e, skip-guarded member/isolation, keyboard/FAB). |
| Adversarial-general | 0 | **1 real** | Empty populated: page 1 `{ items: [], totalCount: 0, chip > 0 }` classified populated. |

### Real MAJOR patched after `c835a30d`

| ID | Layer | Finding | Patch |
| --- | --- | --- | --- |
| ADV-1 | Adversarial | `classifyFollowUpListState` uses chips; fail-closed only threw when `totalCount > 0`. Chip-positive / `totalCount === 0` / empty items painted a blank populated list. | `loadFollowUpPage` now fails closed when page 1 is empty and **either** `totalCount > 0` **or** the selected chip is `> 0`. Vitest covers both bodies. Recoverable error, not global-empty. |

Dismissed as not close-blocking (same as prior correction):

| Finding | Class | Why |
| --- | --- | --- |
| Playwright pager is mocked | MINOR | UI replace is mocked; 101-row PostgreSQL test is the scale/determinism proof. |
| Two category engines | dismiss | Room does not filter or count with `resolveFollowUpCategory`. Server is membership authority. |
| Tautological chip==chip fail-closed | dismiss | Fail-closed compares items to `CountAsync` and selected chip, not chip to itself. |
| Full-tenant SQL chip scan | dismiss | Required totals contract. Not 50 sequential page fetches. |
| 39.4 43.999px | D | Assertion still `toBeGreaterThanOrEqual(44)`. Not weakened. |
| Shared empty/permission 36px CTAs | defer | Shared primitives; chips, rows, retry, pager meet 44px. |
| Caption `isFollowUpDue` vs server due window | defer | Documented in category-derivation. Do not import cinema. |
| Invalid `?category=` left in URL | NIT | Resolves to Due now; API still 400s invalid `followUpCategory`. |
| Story done / 40.3 started / Opportunity pipeline / Healthy in needs-attention / schema / entitlements | dismiss | None present. |

## Earlier patches (still in this branch)

| ID | Action |
| --- | --- |
| PO-1 / PO-2 | Server `followUpCategory` + `ThenBy(Id)`. Room fetches one page. |
| PO-3 / PO-4 | Isolated tenant + 101 identical non-null registrations. |
| BH-01 | `totalCount` = filtered `CountAsync`. Empty page `> 1` steps back. |
| FE-8 | `followUpClientHref`. |
| Dup ids | Fail closed. |

## Final-head re-review

After ADV-1, the empty-populated payload throws before classification. Blind Hunter / Edge / Acceptance had no remaining BLOCKER/MAJOR on `c835a30d`. ADV-1 was the only real MAJOR; it is patched on the next HEAD.

Story stays **review** / draft PR #369. Not done. Not merged. 40.3 not started. No production claim.

## Composer 2.5

Not used.
