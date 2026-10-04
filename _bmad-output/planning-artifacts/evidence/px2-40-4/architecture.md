# Story 40.4 architecture and UX contract

Date: 2026-10-04  
Owner: Grok 4.6 (Architect / UX). Composer 2.5 unused for this contract.  
Baseline: `327c0a4a`

## Outcome

Default Activities surface prioritizes actionable records. Archived remains discoverable. Opportunity stays a Follow-up category. No new room, API, schema, or scoring model.

## Investigated facts (before selecting a design)

1. Paging, filtering, and sorting are **server-side**. The browser does not re-sort.
2. Default sort is `updatedAt desc`. Archive bumps `UpdatedAt`, so Archived can lead.
3. There is **no** existing Draft-before-Published partition.
4. Follow-up list has `lastActivityName` only — no activity id.
5. Activity detail populated `h1` is already the name.
6. Archive dialog exists for Published; Draft skips it.
7. Cap warning reads shell dials.
8. Form Studio is already read-only when Archived.

## Selected design

### 1. Server status-group + requested sort + Id

When `status` is omitted:

1. Archived last (`Status == Archived ? 1 : 0`)
2. Requested primary sort (default `UpdatedAt desc`)
3. `Id` ascending

When `status` is present: steps 2–3 only.

**Draft vs Published:** intermixed by the requested sort. Backlog “Published/draft-first” means both precede Archived. The prompt’s 1/2/3 list is actionability, not a three-bucket sort. Inventing Draft-then-Published would change operator recency without evidence.

### 2. List remount and paging honesty

Remove `key={searchParams}` on `/activities`. Fix the fetch effect so a filter change on page 1 still fetches (40.3 lesson). Keep `page` in React state (40.5 owns URL page persistence). Filter/sort change resets page to 1.

### 3. Honest states

Reuse `PageHeader`, `ProductEmptyState`, `ProductErrorState`, `CardGridSkeleton`, `ActivitiesAtCapBanner`. Classify 401/403 as denied. Never render empty-success on fetch failure. Cap stays shell-authoritative.

### 4. Detail headings

Populated: activity name. Loading / denied / not-found / error: `h1` `Activity`. Distinct `ProductErrorState` titles. Status badge text required.

### 5. Archive dialog

Extend existing 38.6 `ArchiveActivityDialog` to Draft (new `draft` variant). No optimistic removal. On success, `onActivityUpdated` + shell refresh. List route is not remounted.

### 6. Opportunity / source links

No Activities Opportunity filter, tab, or `/opportunities`. Do not add Follow-up source links from a name string. Preserve existing `/clients?activityId=` and `/clients/{id}` destinations that already have IDs.

## Rejected alternatives

| Option | Verdict |
| --- | --- |
| Client-only reorder of the current page | **Rejected** — lies across pages |
| Default filter excluding Archived | **Rejected** — hides Archived |
| Three-bucket Draft → Published → Archived | **Rejected** — no investigated product contract |
| New `sortBy=status` API value | **Rejected** — unnecessary surface |
| New `LastActivityId` on clients list | **Rejected** — new API without evidence |
| `/opportunities` or Activities Opportunity tab | **Forbidden** (D2 / D16 / 40.2) |
| Production reset / fixture mutation | **Forbidden** |
| Infer cap from visible card count | **Rejected** — server dials own the cap |
| Convert 403 into upgrade panel | **Forbidden** |

## Security / isolation

Unchanged: tenant query filters, `TenantOperator` policy, recovery-write archive when over plan. No entitlement or billing math change.

## Motion / a11y / responsive

- Cards remain the Activities list primitive (already phone-first).
- Filters and actions ≥44×44 via local classes (`min-h-11 min-w-11`). Do not rewrite shared `FilterSelect` globally.
- One `main#main-content`, one document `h1`, skip link unchanged.
- Archive overlay: 38.6 trap / Escape / restore / inert / reduced motion.
- Epic 37 pathname-only enter unchanged. Query-only filter changes must not remount route motion.

## Non-goals

40.5 crumbs. Studio redesign. Composition schema. Publish confirm semantics. Website Studio. Campaigns. Dashboard/Follow-up/Clients IA. Plans/Paddle. Production deploy.
