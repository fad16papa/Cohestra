# Story 40.2 architecture

Date: 2026-10-03  
Owner: Grok 4.6 (Architect / UX). Composer 2.5 not used for this contract.  
Correction: PO MAJOR 1 + MAJOR 2. Previous “existing API only / unbounded page fetch dismissed” disposition is **retracted**.

## Outcome

`/follow-up` is the primary Follow-up room. Opportunity is a category inside that room. Dashboard Needs follow-up stays a preview.

The room must not download the complete tenant client collection to establish category counts or render one filter.

## Data source decision (corrected)

| Rank | Option | Verdict |
| --- | --- | --- |
| 1 | Existing `GET /api/v1/admin/clients` with optional Follow-up query capability | **Selected** — one source of truth |
| 2 | Shared client-side resolver over a fully downloaded list | **Retracted** — disproven at the 5,000-client operating target and by unstable multi-request paging |
| 3 | Dedicated Follow-up query endpoint | **Rejected** — extending the clients list is a smaller, backward-compatible contract and avoids two competing sources of truth |
| 4 | Larger page-size cap, concurrent fan-out, timeout inflation, client-only full-tenant cache, or virtualizing 5,000 downloaded rows | **Forbidden** |

Ownership:

- `ClientService` is the category and paging authority.
- `GET /api/v1/admin/clients` remains the only list contract.
- `web/lib/follow-up-category.ts` owns URL parse/serialize, empty-state classification, and captions. It consumes server totals + the requested page. It does not re-walk pages to compute counts.
- Dashboard queue keeps its existing two queries (`followUpDue`, `leadStatus=new&withoutOutreach`). Do not dual-write.

No database-schema migration.

## Clients-list extension (backward compatible)

When Follow-up parameters are **absent**, existing callers keep current filter, sort-primary, paging, and status-count behavior.

When `followUpCategory` is present:

| Query | Contract |
| --- | --- |
| `followUpCategory` | `due-now` \| `at-risk` \| `opportunity` \| `healthy`. Invalid → repository 400, same family as invalid `leadStatus`. |
| `page` / `pageSize` | Existing normalization: page &lt; 1 → 1; pageSize capped at 100. |
| `sortBy` / `sortDirection` | Existing fields. Follow-up uses `lastRegistrationDate` desc. |

Response additions (ignored by existing clients-list UI):

- `followUpCategoryCounts`: `{ dueNowCount, atRiskCount, opportunityCount, healthyCount }` — tenant-scoped (after any other list filters, before the category filter). Always returned when `followUpCategory` is present. `null`/omitted when absent.
- `totalCount`: count of the **selected category**, not the whole tenant.
- `items`: only the requested page of that category.

Needs-attention = Due now + At risk + Opportunity. Healthy is excluded.

## Deterministic ordering

Every paged query used by Follow-up, and every shared clients-list sort, uses:

1. requested primary sort
2. unique secondary key: client `Id` ascending

The same ordering applies to every page of the same query. This is a minimal, backward-compatible safety fix for equal or null `LastRegistrationAt` (and other ties). It does not change the primary sort meaning.

## Category derivation

Locked in `category-derivation.md`. Server is authoritative. First-match presentation labels only. Not persisted. Not cinema. Not a route, sales stage, activity type, or score.

The web client must not implement a second filter/count engine over a downloaded tenant. Display captions may still use `isFollowUpDue` for truthful date language.

## Fetch (web)

1. One `fetchClients` call with `followUpCategory` = selected category, `page`, `pageSize` ≤ 100, `sortBy=lastRegistrationDate`, `sortDirection=desc`.
2. Render that page only.
3. Keep server totals while paging.
4. Category change resets `page` to 1 (omit default page from the URL).
5. If the selected page is empty after data changes but the category total is still &gt; 0, reconcile to the last valid page.
6. Preserve unrelated query keys.
7. Any request failure → recoverable error or permission denial. Never convert a healthy tenant into global-empty. Missing totals on a Follow-up request fail closed.

## URL / history (existing Cohestra list/view pattern)

Resolver input: `searchParams.get("category")` and `searchParams.get("page")` only.

| `category` query | Resolved |
| --- | --- |
| absent | `due-now` |
| `due-now` / `at-risk` / `opportunity` / `healthy` | that value |
| any other string | `due-now` |

| `page` query | Resolved |
| --- | --- |
| absent / invalid / &lt; 1 | `1` |
| positive integer | that page |

Serialize: omit `due-now`; omit `page=1`; write the other categories and page &gt; 1. Preserve unrelated query keys. `router.replace` on change. Re-select of the already resolved category is a true no-op. No localStorage. Do not read `cohestra.dashboard.viewMode`. Do not put category in the pathname.

The URL `category` resolver is a UI convenience. The API still 400s an invalid `followUpCategory`.

## Page structure

1. `PageHeader` h1 **Follow-up** + optional supporting count (needs-attention only).
2. Category radiogroup with truthful server counts.
3. Results region (cards / composition / table) for the current page, honest Previous/Next paging, or the matching empty/error/loading state.

Loading/error/empty keep the h1. Empty copy is h2.

## Dashboard continuity

- Queue “View all” / “Open Follow-up” remain `/follow-up` with no required query (defaults to Due now, page 1).
- Queue still slices 5 from its existing two fetches.
- Room owns the categorized working list via server pages.
- `commitDashboardViewChange` and `adminRouteTransitionKey(pathname)` stay untouched.

## Security

`[Authorize(Policy = TenantOperator)]` on the existing clients endpoint. TenantAdmin and TenantMember on every plan. Tenant scoping from authenticated tenant context. No PlatformAdmin or cross-tenant leakage. No new workspace-setting capability. No entitlement or billing changes. Backend remains authoritative.

## Motion / a11y / responsive

Unchanged from the accepted room chrome: `.motion-local` / reduced-motion instant; named radiogroup; 44×44 controls; cards &lt;768; composition 768–1023; table ≥1024.

## Non-goals

No `/opportunities`. No messaging. No schema rewrite. No cinema import. No 40.3. No entitlement change. No deploy. No second Follow-up list source.
