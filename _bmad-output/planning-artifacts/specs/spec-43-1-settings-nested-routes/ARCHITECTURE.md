# ARCHITECTURE — Story 43.1 Settings nested routes

Altitude: story  
Paradigm: **Pathname-canonical App Router composition**  
Date: 2026-10-06  
Baseline: `10c68679`

## Inherited invariants (do not reopen)

- 38.5 one `main#main-content` in DashboardLayout
- 39.4 PageHeader is the page `h1`
- 39.5 `InvokeNotFound` / `RouteBoundaryState`
- Epic 37 `adminRouteTransitionKey(pathname)` only
- Team/Billing/Paddle/UpgradePanel server contracts

## AD-1 Nested workspace group

**Binds:** Shared Settings chrome lives in `web/app/(admin)/settings/(workspace)/layout.tsx`.  
**Prevents:** Duplicating providers per page; wrapping 39.5 unmatched in Settings rails.  
**Rule:** Known areas (plan, brand, organization, notifications, embed, domain, profile, support, appearance, team, billing) sit under `(workspace)`. Index `settings/page.tsx` and `settings/[...unmatched]/page.tsx` stay outside the group.

## AD-2 Pathname owns section identity

**Binds:** `web/lib/settings-routes.ts` maps section id ↔ path, legacy aliases, default path, admin-only vs personal.  
**Prevents:** Dual authority (`pathname` Team vs `activeId` Billing).  
**Rule:** No `useState` for primary section selection. Local state remains for collapse, sheets, and forms.

## AD-3 Index and legacy redirects are replace

**Binds:** Client redirector uses `router.replace`. Server `redirect()` may still map index search when a legacy section is present.  
**Prevents:** History stacks of `/settings?section=team`.  
**Rule:** Strip `section` and `activeId`. Preserve other query keys.

## AD-4 Nav is links

**Binds:** Left rail and mobile chips render `next/link` to nested paths.  
**Prevents:** Button-simulated routes.  
**Rule:** `aria-current="page"` when pathname matches. Team/Billing are first-class nav items, not a separate “Admin pages” footer.

## AD-5 Permission boundary stays in existing components

**Binds:** Member Team replace + copy; Billing `resolveBillingSettingsAccess`; Team UpgradePanel; domain `isCustomDomainSettingsVisible`.  
**Prevents:** Router-level unlock or converting locks to Next 404.  
**Rule:** New admin-only pages reuse a small gate that mirrors Team (replace to `getDefaultSettingsPath(false)`). Ineligible domain renders `RouteBoundaryState` not-found without workspace rails.

## AD-6 Shared chrome, per-route body

**Binds:** Workspace layout renders header (from route meta), rails, chips, Context sheet, and `{children}`.  
**Prevents:** Re-mounting all Settings forms’ data loaders in every page via a giant client switch.  
**Rule:** Each page imports only its section body (`embedded`). Team/Billing pages keep current content modules; they drop inner `PageHeader` so the layout owns the single h1.

## Deferred

- Document title template (`Profile | Cohestra`) until the app adopts titles consistently
- Unifying Member Team redirect vs Billing stay-and-deny (product, 43.2/43.3)
- Custom-domain implementation
