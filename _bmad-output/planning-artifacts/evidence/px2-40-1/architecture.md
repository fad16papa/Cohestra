# Story 40.1 architecture

Date: 2026-10-03  
Owner: Grok 4.6 (Architect / UX). Composer 2.5 not used for this contract.

## Hierarchy (after)

1. `PageHeader` h1 **Dashboard** + supporting greeting `<p>`
2. View selector (tabs)
3. **Needs attention** — existing intelligence brief (section, not a room). Do not rewrite generation.
4. **Needs follow-up** — queue; primary “View all” / review actions → `/follow-up`
5. **Today / current work** — today strip from metrics
6. **Supporting metrics and activity performance** — tiles, charts/tables by view

Before: greeting theater card → brief → view switcher → today → queue (links to `/clients`) → quick actions → metric tiles → charts.

## URL / history / preference precedence

Resolver input: `searchParams.get("view")` and stored preference.

| `view` query | Stored preference | Resolved mode |
| --- | --- | --- |
| absent (`null` or `""`) | valid `overview` / `graphs` / `table` | stored |
| absent | missing, corrupt, or legacy `tables` | `overview` (legacy stored `tables` migrates to `table` on read) |
| `overview` / `graphs` / `table` | any | query wins |
| any other string (including `tables`) | any | `overview` |

Serialization when the operator switches views:

- `overview` → push `/dashboard` with `view` omitted (other query keys preserved)
- `graphs` / `table` → push `?view=graphs` / `?view=table`
- Always write the resolved mode to localStorage after a user switch

History: `router.push` so Overview → Graphs → Back restores Overview. Shared `?view=table` is read on first paint (after hydration of `useSearchParams`).

If the current URL omitted `view` (default overview), switching views first pins the current resolved mode with `history.replaceState` to an explicit `?view=…` (including `?view=overview`). That keeps Back honest after preference is written for the next query-less visit.

Do **not** put view in the pathname. Do **not** pass `searchParams` through the server `page.tsx` in a way that remounts the client tree. Wrap `useSearchParams` in `Suspense`. Data stays in `DashboardPageClient` state; view is a render branch only.

## Motion

`AdminRouteTransition` key remains `adminRouteTransitionKey(pathname)`. View swap may use existing local `motion-local` / 160ms or instant under `prefers-reduced-motion`. No new tokens.

## Accessibility

- One `main#main-content`, one h1 `Dashboard`
- View control: `role="tablist"` + `role="tab"` + `aria-selected`; panel `role="tabpanel"`
- Skip link unchanged
- Status in queue/insights uses text + existing badges, not color alone
- View tabs `min-h-11 min-w-11` (44px)

## Honesty

- Follow-up fetch failure → error + retry, never empty-success or “all caught up”
- Intelligence error stays an alert
- Today strip must not claim “all caught up” when a sibling widget failed
- Global metrics error still uses `ProductErrorState`

## Role / plan

No entitlement changes. Empty-state plan copy, campaign section locks, and Website links stay as 39.3/38.2 already behave.

## Non-goals

No 40.2 room. No 41.2 AI room. No new APIs.
