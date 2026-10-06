---
id: spec-43-1-settings-nested-routes
slug: 43-1-settings-nested-routes
status: ready
created: 2026-10-06
baseline: 10c686791b5587a7eda8b9a21c96465f0366c065
---

# SPEC — Story 43.1 Settings nested routes

## Why

Operators cannot bookmark, reload, or use browser history for most Settings areas because those areas are in-page `activeId` panels behind `/settings/profile`. Each existing Settings area must become a real URL without changing who can see or do what.

## Capabilities

- **CAP-1** Every current Settings area has a stable App Router path (route matrix). Unknown nested paths use existing 39.5 not-found.
- **CAP-2** `/settings` is not a content URL. It `replace`s to the first permitted nested route (Admin → `/settings/plan`, Member → `/settings/profile`).
- **CAP-3** Legacy `?section=` and `?activeId=` map to nested paths with replace-style navigation and are stripped. They are not canonical IA.
- **CAP-4** Pathname is the only primary section identity. Settings nav items are links with `aria-current="page"` on the current route.
- **CAP-5** Role, entitlement, Team, Billing, Paddle, UpgradePanel, domain waitlist, and appearance persistence are unchanged.
- **CAP-6** Member direct URLs to admin-only workspace Settings follow the current Team convention (copy + replace to first allowed). Billing keeps stay-and-deny.
- **CAP-7** Each nested route owns one page `h1` (section name) and uses the existing shell `main#main-content`. No nested `main`. No Settings+section dual h1.
- **CAP-8** Responsive pattern stays: 1280+ three-pane; 1024–1279 two-pane; &lt;1024 stacked chips + Context sheet. 390 remains usable (discoverable areas, ≥44px chips, no overflow).
- **CAP-9** Browser Back/Forward and reload restore the nested route. Epic 37 pathname-only route motion applies; no extra Settings animation.
- **CAP-10** Internal canonical links use nested routes. Footer Settings → `/settings`. Account menu → `/settings/profile`.

## Constraints

- Do not change server authorization, seat rules, billing owner rules, or plan gates.
- Do not implement 43.2 Team redesign or 43.3 Billing presentation.
- Do not ship custom-domain configuration.
- Do not reopen 38.5/39.4 architecture; only update Settings-specific heading assertions.
- Do not add a global unsaved-change guard.
- Do not introduce a document-title template; keep `Cohestra`.
- Do not create placeholder routes for nonexistent products.

## Non-goals

- New roles, permissions, invite flows, destructive-dialog redesign
- Paddle / checkout / portal changes
- Brand-accent algorithm changes
- Theme flash / public `forcedTheme` changes
- New Settings forms or copy systems
- Complex dynamic metadata
- Epic 43.2–43.5

## Success signal

An operator can open `/settings/appearance`, refresh, bookmark it, move to Team, press Back, and land on Appearance — and a Member still cannot manage Team or Billing.

## Route matrix

| Path | Section id | h1 | Admin | Member | Notes |
| ---- | ---------- | -- | ----- | ------ | ----- |
| `/settings` | (index) | n/a | → `/settings/plan` | → `/settings/profile` | replace |
| `/settings/plan` | settings-plan | Plan & limits | yes | redirect | |
| `/settings/brand` | settings-brand | Brand accent | yes | redirect | |
| `/settings/organization` | settings-organization | Organization | yes | redirect | |
| `/settings/notifications` | settings-notifications | Notifications | yes | redirect | |
| `/settings/embed` | settings-embed | Allowed embed hosts | yes | redirect | |
| `/settings/domain` | settings-domain | Custom domain | Enterprise admin | 39.5 not-found | waitlist only |
| `/settings/team` | settings-team | Team | yes (UpgradePanel if Basic) | copy + replace | 43.2 out of scope |
| `/settings/billing` | settings-billing | Billing | current access resolver | stay + deny | 43.3 out of scope |
| `/settings/profile` | settings-account | Your account | yes | yes | |
| `/settings/support` | settings-support | Help & support | yes | yes | |
| `/settings/appearance` | settings-appearance | Appearance | yes | yes | |
| `/settings/teem` etc. | unmatched | Page not found | 39.5 | 39.5 | outside workspace layout |

## Legacy redirect matrix

Aliases (case-insensitive) for `section` or `activeId`: `plan`, `settings-plan`, `brand`, `settings-brand`, `organization`, `settings-organization`, `notifications`, `settings-notifications`, `embed`, `settings-embed`, `domain`, `settings-domain`, `account`, `settings-account`, `profile`, `support`, `settings-support`, `appearance`, `settings-appearance`, `team`, `billing`.

Unknown alias: ignore and use the current path’s default (index → first allowed). Other query keys (e.g. billing `session_id`) are preserved.

## Permission matrix

| Actor | Personal routes | Workspace admin routes | Team | Billing |
| ----- | --------------- | ---------------------- | ---- | ------- |
| Tenant Admin | pass | pass | current entitled | current entitled |
| Tenant Member | pass | redirect to `/settings/profile` | copy + replace `/settings/profile` | stay + deny copy |
| Platform Admin | unchanged / out of Settings tenant tree | | | |

Frontend hiding is not authorization. API enforcement stays.

## Plan-entitlement matrix

| Plan | Team | Domain | Billing | Other settings |
| ---- | ---- | ------ | ------- | -------------- |
| Basic | route exists; UpgradePanel | not-found | current | unchanged |
| Core / Pro | current team UI | not-found | current owner rules | unchanged |
| Enterprise | current | waitlist surface | current | unchanged |

Routing must not 404/500 a locked Team page or unlock a gated feature.

## Accessibility contract

- One `main#main-content` from DashboardLayout
- One `h1` = section label (Team/Billing keep those labels)
- Skip link still targets `#main-content`
- Current nav item `aria-current="page"`
- Keyboard + focus-visible retained
- Reduced-motion: existing 280ms pathname enter only
- Focus not lost after compatibility replace
