# Story 40.3 architecture

Date: 2026-10-04  
Baseline: `7e7c3c07`

## Decision

Presentation and accessibility of the existing Clients room and profile. **No API, schema, category, entitlement-math, or merge-algorithm change.**

## Table semantics

**Choose semantic HTML `<table>` at `md+`.** Cards (`<article>`) below 768px.

Rejected: incomplete ARIA `role="row"` header (current). Rejected: mixing `<table>` with leftover `role="columnheader"` on buttons without `th`. Rejected: shipping a shared Epic 41 data-table primitive in this story.

Sortable headers are `<th scope="col" aria-sort>`. Body is `<tr><td>`. Checkbox and actions are named.

## URL / remount

Remove `key={searchParams}` on `/clients`. Filter URL keys stay. Sort/page stay local (40.5 can persist them). Changing a filter must not remount or wipe filters.

## Follow-up CTA

`Open in Follow-up` when Due now membership matches 40.2:

`isFollowUpDue(nextFollowUpAt)` OR (`leadStatus === "new"` AND no recorded outreach).

Profile derives outreach from timeline events (`whatsapp_*`, `viber_*`, `email_campaign_sent`). Href is `FOLLOW_UP_PATH` (`/follow-up`). No `?clientId=`. No category persistence. Server remains category authority.

## Motion

`ClientProfileExpandableRegion`: `duration-200` → `motion-local` (160ms) + `motion-reduce:transition-none`. Do not edit 100ms press or 280ms route-enter.

## Overlays

Keep `MessengerOpenConfirmDialog` on 38.6 `AlertDialog`. Verify trap / Escape / restore / inert / PRM.

## Non-goals

No `/opportunities`. No Clients Follow-up tab. No 40.4. No deploy. No Calendar FAB rename (43.5).
