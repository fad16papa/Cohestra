# Story 40.2 architecture

Date: 2026-10-03  
Owner: Grok 4.6 (Architect / UX). Composer 2.5 not used for this contract.

## Outcome

`/follow-up` becomes the primary Follow-up room. Opportunity is a category inside that room. Dashboard Needs follow-up stays a preview.

## Data source decision

| Rank | Option | Verdict |
| --- | --- | --- |
| 1 | Existing `GET /api/v1/admin/clients` via `fetchClients` | **Selected** as the only network contract |
| 2 | Shared client-side resolver over authoritative list fields | **Selected** as the category engine |
| 3 | Smallest server extension | **Rejected** — inventory proved list fields sufficient |

Ownership: `web/lib/follow-up-category.ts` owns derivation and URL parse/serialize. The room client owns fetch, paging, and presentation. `ClientService` / lead-status / next-follow-up PATCH stay unchanged. Dashboard queue keeps its existing two queries.

## Fetch

1. `fetchClients(authFetch, { page, pageSize: 100, sortBy: "lastRegistrationDate", sortDirection: "desc" })`.
2. Repeat while `items.length === pageSize` and `page * pageSize < totalCount`.
3. Deduplicate by `id`.
4. Run `resolveFollowUpCategory(client, registrationTimeZoneId)` per row.
5. Partition in memory. Filtering never PATCHes.

Failure: any page reject → recoverable error, discard partial success for honesty (do not show a truncated “all caught up” list). 401/403 → permission denial. Do not render results before the first resolution.

## Category derivation

Locked in `category-derivation.md`. First-match presentation labels only. Not persisted. Not cinema.

## URL / history (existing Cohestra list/view pattern)

Resolver input: `searchParams.get("category")` only.

| `category` query | Resolved |
| --- | --- |
| absent | `due-now` |
| `due-now` / `at-risk` / `opportunity` / `healthy` | that value |
| any other string | `due-now` |

Serialize: omit `due-now`; write the other three. Preserve unrelated query keys. `router.replace` on change. Re-select is a true no-op. No localStorage. Do not read `cohestra.dashboard.viewMode`. Do not put category in the pathname.

## Page structure

1. `PageHeader` h1 **Follow-up** + optional supporting count (needs-attention only).
2. Category radiogroup.
3. Results region (cards / composition / table) or the matching empty/error/loading state.

Loading/error/empty keep the h1. Empty copy is h2.

## Dashboard continuity

- Queue “View all” / “Open Follow-up” remain `/follow-up` with no required query (defaults to Due now).
- Queue still slices 5 from its two existing fetches.
- Room owns the full categorized list.
- `commitDashboardViewChange` and `adminRouteTransitionKey(pathname)` stay untouched.

## Motion / a11y / responsive

- Filter/list chrome: `.motion-local` (160ms) / instant under `prefers-reduced-motion`.
- Radiogroup named “Follow-up category”; selected via `aria-checked` + visible selected chrome (not color-only).
- Client links: accessible name includes the person.
- Focus: existing opaque `--ring`.
- Cards `<768`; composition `768–1023` with no page `min-w` trap; table `≥1024`.
- Controls and row links `min-h-11 min-w-11`.
- Do not change main padding or FAB visibility.

## Non-goals

No `/opportunities`. No messaging. No schema rewrite. No cinema import. No 40.3. No entitlement change. No deploy.
