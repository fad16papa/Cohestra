# EXPERIENCE — Story 43.1 Settings nested routes

Status: ready  
Date: 2026-10-06  
Scope: navigation, route identity, responsive chrome. Not a redesign of individual Settings forms.

## Foundation

Reuse the existing admin shell, PageHeader, Settings rails, chips, and Context sheet. No new visual language.

## Information architecture

Settings is a **room of pages**, not a panel switcher.

- Room door: `/settings` → first permitted nested route.
- Account menu “Settings”: `/settings/profile` (the person).
- Footer “Settings”: `/settings` (the room).
- Footer Team / Billing: unchanged hrefs; current item uses `aria-current`.

Primary Settings nav (links):

**Workspace** (Tenant Admin): Plan & limits, Brand accent, Organization, Notifications, Allowed embed hosts, Custom domain (Enterprise only), Team, Billing (when current entitlement shows it).

**Personal** (everyone): Your account, Help & support, Appearance.

## Route heading

`eyebrow`: Settings  
`h1`: section label from the route matrix  
`description`: existing section description (Team/Billing keep their current supporting copy in the body).

Do not render a second page-level heading for the same name. Section bodies stay `embedded` so inner h2s used for standalone mode remain off.

## Responsive & platform (the one pattern)

| Viewport | Nav | Content | Context |
| -------- | --- | ------- | ------- |
| 1440 | Left rail visible (`lg+`) | Primary column | Right rail visible (`xl+`) |
| 1280 | Left rail | Primary | Right rail |
| 1024 | Left rail | Primary (gets remaining width) | Context via sheet, not a missing-nav hole |
| 768 | Horizontal chips (`lg:hidden`) | Stacked full width | Context button → sheet |
| 390 | Chips, wrap/scroll, min 44px | Forms fit; no horizontal overflow | Context sheet |

Do not invent a compact icon-only medium rail as a second system.

## Permission-denied / lock

- Member on Team or admin-only workspace route: existing “tenant admins only” copy, then replace to `/settings/profile`. Settings nav shows only personal links.
- Member on Billing: stay; Billing h1 + existing deny copy.
- Basic Admin on Team: existing UpgradePanel (not 404).
- Billing owner-managed / content: unchanged.
- Domain not visible: 39.5 admin not-found (no Settings rails).

## Motion

Real pathname changes already enter via AdminRouteTransition (280ms, pathname-only). No extra Settings animation. `prefers-reduced-motion` unchanged.

## States

- Index `/settings`: brief “Loading settings…” without a false section h1, then replace.
- Canonical nested navigation: go directly to the page; no mega-page flash.
- Compatibility redirect: may resolve once via replace.
- Loading/error/lock/success inside each form: unchanged.

## Key flow

Admin opens Settings from the footer → lands on Plan & limits at `/settings/plan` → clicks Team → URL `/settings/team` → Back returns to Plan.
