# Story 41.1 architecture, UX, a11y, and security contract

Model: Grok 4.6 (Architect + UX + accessibility + security). Composer 2.5 unused.

## Selected mechanism

Keep the relocated Reports page as the Analytics room. Close presentation gaps only:

1. Recoverable error uses `ProductErrorState` + retry. HTTP 403 is a denied heading, never UpgradePanel.
2. Export disabled reason is visible and referenced from the button.
3. Stale copy uses a polite live region, not `role="alert"`.
4. Trend chart gets a semantic daily summary table. Existing ranking/follow-up lists remain the color-independent equivalent for donuts/bars.
5. Chart grids become `md:grid-cols-2` so they stack below 768px.
6. Filter selects/inputs/chips meet `min-h-11` (44px).
7. Dashboard Graphs adds a named `Open Analytics` link to `/analytics` without sharing fetch or merging views.

URL identity stays the existing report query. Href builders reuse `analyticsHref` / `ANALYTICS_PATH`. User-initiated filter changes use `router.push` so Back/Forward restores the prior Analytics query. Default `?preset=weekly` injection still uses `router.replace`. Query-only writes stay on the pathname motion key.

## Rejected alternatives

| Alternative | Why rejected |
| --- | --- |
| New Analytics backend / KPIs | Existing `ReportResponse` already feeds the page. |
| Saved views | Not coded. URL query is the share mechanism. |
| Unlock Basic monthly because the API allows it | Would change entitlement presentation vs Story 39.3. |
| Merge Dashboard Graphs into `/analytics` | Graphs stays a Dashboard view. |
| `sessionStorage` as filter identity | Fails refresh/share. |
| Raw `returnTo` / continuity tokens for report rows | Sensitive data must not enter `ctx`. |

## Security

Continuity is never used for report payloads. Export and query remain tenant-scoped on the server. Frontend UpgradePanel is presentation, not a grant. Do not weaken `ValidateReportPlanAsync` or tenant filters.
