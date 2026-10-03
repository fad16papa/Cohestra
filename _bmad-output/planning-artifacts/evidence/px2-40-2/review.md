# Story 40.2 independent review

Date: 2026-10-03  
Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor, `bmad-review-adversarial-general`  
Reviewed HEAD after first implementation, after first patches, then after PO Direct Adjustment.

## Retracted disposition

**The previous “unbounded page fetch dismissed” finding is retracted.**

PO MAJOR 1 (full-tenant sequential fan-out) and MAJOR 2 (unstable multi-request pagination without a unique sort tie-breaker) are accepted defects of the original “existing API only + client-side walk” architecture.

Corrected decision: extend `GET /api/v1/admin/clients` with optional `followUpCategory` + authoritative `followUpCategoryCounts`, return only the selected category page, and apply primary sort + unique client `Id` on every shared clients-list sort. Client-side full-tenant fan-out is forbidden.

Sprint change proposal: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-03-story-40-2.md` (Direct Adjustment).

## First-pass unresolved MAJORs (patched before this correction)

| ID | Finding | Action |
| --- | --- | --- |
| BH-1 | Short/incomplete page merge could look like success / empty | Architecture retracted; room no longer merges pages |
| BH-2 | Permission sniffed from error text | Permission = `FollowUpAccessError` only |
| AC9 FAB / 390 chips | FAB overlap; Healthy off-canvas at 390 | Room `pb-20 md:pb-24`; chips `flex-wrap`; Healthy must be in viewport |
| Error honesty | Raw API detail; primary button contrast | Locked supporting copy; outline 44px Try again |
| Caption | “Last recorded outreach · Never” | Never append “Never” |
| TZ flash | Categorize before shell TZ | Keep loading while `shell.loading` |
| Card a11y name | `Open {name}` hid category | `Open {name}, {category}` |

## PO-correction review findings (patched)

| ID | Layer | Severity | Finding | Action |
| --- | --- | --- | --- | --- |
| PO-1 | Architect / BH | MAJOR | `loadFollowUpClients()` walked every 100-row page | Retracted. `loadFollowUpPage()` issues one request. |
| PO-2 | Architect / Edge | MAJOR | `ApplySort()` lacked unique tie-break; equal/null `LastRegistrationAt` could duplicate/omit | `ThenBy(Id)` on every shared clients-list sort. |
| PO-3 | Edge | MAJOR | Integration fixture used default-tenant markers and `>=` counts | Isolated tenant + exact counts. |
| PO-4 | Edge | MAJOR | 101-row paging used null `LastRegistrationAt` only | Real registrations share one `CreatedAt`. |
| PO-5 | Edge | MINOR | `totalCount` from `query.Count()` could race chip totals | `totalCount` bound to selected chip count. |
| PO-6 | Acceptance | MAJOR | FE-8 `/clients/{id}` continuity helper missing | `followUpClientHref` + Vitest. |
| PO-7 | BH | MINOR | Empty `?page=N` not rewritten when `totalCount == 0` | Reconcile whenever the page is empty and not already reconciled. |
| PO-8 | Adversarial | MAJOR | Playwright did not prove pager replace | Added replace-without-duplicates journey; named `Next page` to avoid Next.js Dev Tools collision. |
| PO-9 | Adversarial | MAJOR | Frontend silently dropped duplicate ids | Fail closed on duplicate ids or `totalCount` ≠ selected chip. |

## Dismissed / deferred (not close-blocking)

| Finding | Class | Why |
| --- | --- | --- |
| Relitigate locked category meanings vs cinema §4 prose | dismiss | Locked contract uses authoritative lead-status + due + outreach fields. No invented windows. |
| Dashboard vs room due-helper residual | defer | Documented in category-derivation. Do not import cinema. |
| **Unbounded page fetch** | **retracted, not dismissed** | See corrected architecture. Client fan-out is gone. |
| Computing four totals still scans the tenant in one HTTP call | dismiss | Required chip contract. Not sequential page fan-out. No persisted category column. |
| High page number clamped by existing list contract | dismiss | page `< 1` → 1; oversized pageSize → 100; empty high page reconciles on the client. |
| Shared ProductEmptyState 36px CTAs | defer | Shared primitive; chips, result rows, retry, and pager meet 44px. |
| Invalid `?category=` left in URL | NIT | Resolves to Due now; API still 400s invalid `followUpCategory`. |
| Client `resolveFollowUpCategory` mirror remains in the helper module | dismiss | Room does not use it to filter or count. Server is authoritative. Mirror stays for meaning-unit tests only. |
| 39.4 43.999px | D | Assertion not weakened. |

## Re-review of patched implementation

Re-review on `5455b75b` found one new MAJOR: `shell.loading` on window-focus refresh remounted the skeleton after a successful populate. Patched to wait only until the first shell (`shellLoading && !shell`).

Independent layers re-ran on `8c4af64b`. Blind Hunter MAJOR BH-01 (chip `totalCount` alias hid count-vs-items drift) and the matching adversarial “tautological fail-closed / empty populated page” findings were patched on the next HEAD:

- `totalCount` is again `CountAsync` on the filtered item query (chips stay a separate authoritative scan).
- Empty page `> 1` always steps back; empty page 1 with a positive total fails closed.
- Category change does not classify stale zero counts as empty while the next page is in flight.
- `Skip` overflow uses a `long` offset.

Adversarial “Playwright pager is mocked” is **dismissed as MAJOR**: UI replace is mocked; scale/determinism is proven by the isolated 101-row PostgreSQL test. Dual client `resolveFollowUpCategory` is **dismissed**: the room does not filter or count with it.

Story stays **review** / draft PR. Not done. Not merged. 40.3 not started.

## Composer 2.5

Not used.
