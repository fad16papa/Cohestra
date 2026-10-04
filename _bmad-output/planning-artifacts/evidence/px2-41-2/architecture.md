# Story 41.2 architecture / UX / a11y / security contract

Baseline: `bb420f89`  
Roles: Architect, UX reviewer, Accessibility reviewer, Security reviewer  
Model: Grok 4.6

## Decision

Improve the existing Reports-style room pattern: `/ai` becomes a PageHeader room that renders the existing brief. Extract shared presentational insight cards from `DashboardIntelligenceBrief` so Dashboard and `/ai` share types and card markup without sharing fetch state.

## Fetch ownership

| Surface | Owns | Fetch |
| --- | --- | --- |
| Dashboard Needs attention | Compact summary + link to `/ai` | Independent `fetchIntelligenceBrief` |
| `/ai` Cohestra AI | Full room, all states | Independent `fetchIntelligenceBrief` |

Rejected shared cache: module-global store or sessionStorage would blur tenant/session freshness. The two surfaces do not mount together.

## Rejected alternatives

- New `/api/v1/admin/ai` endpoint or saved views
- Browser-side scoring or invented counts
- Chat / assistant chrome
- Merging Needs attention into the room (or renaming the Dashboard section)
- Enabling synthesis in appsettings
- Fail-closed parse that drops a whole brief because one action href is unsafe
- Weak `startsWith("/")` as the only href check

## Href rule

`isSafeAdminHref` accepts only decoded, relative, allowlisted admin paths:

- `/dashboard`, `/clients`, `/activities`, `/follow-up`, `/analytics`, `/ai`, `/reports`

Reject absolute, protocol-relative, encoded external, `javascript:` / `data:` / `vbscript:`, backslash, control characters, `//` segments, public/platform/operator routes.

- Evidence unsafe href → render value as text
- Action unsafe/missing href → keep insight; show named “Next action unavailable”
- Entire payload invalid → malformed / ProductErrorState, not empty success

## UX states

Loading, deterministic populated, synthesized populated, insufficient data, recoverable error + retry, permission denied, malformed payload, safe-action unavailable, optional stale/refreshing. Every non-populated state keeps `h1` Cohestra AI.

## Accessibility

- One `main#main-content`, one `h1`
- Insights: `article` with `h2`
- Evidence: named `ul` / `dl`
- Recommended links: descriptive names
- `details`/`summary` keyboard-native
- Loading: one polite status, pulse only under `motion-safe`
- Errors: `role=alert`
- Mode and priority as text
- Axe: no serious/critical contrast, landmark, heading, link-name, list

## Motion

Pathname-only route enter. No new timing. No continuous thinking animation. Reduced motion → existing zero-duration tokens.

## Security

- Tenant host + JWT. No `X-Tenant-Id`.
- Frontend is not authorization.
- Do not log brief contents, emails, phones, answers, tokens, or keys.
- Do not send the brief to a new provider from the browser.
