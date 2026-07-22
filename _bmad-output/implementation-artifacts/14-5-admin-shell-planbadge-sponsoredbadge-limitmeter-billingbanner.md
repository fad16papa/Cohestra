---
baseline_commit: 8c1c210
---

# Story 14.5: Admin shell — PlanBadge, SponsoredBadge, LimitMeter, BillingBanner

Status: done

## Story

As a **Tenant Admin or Member**,
I want **clear plan, limit, and billing-state chrome in the atelier admin shell**,
So that **I always know my tier, headroom, and what to do when money or limits need attention**.

## Acceptance Criteria

1. **Given** authenticated tenant admin UI **When** the shell renders **Then** PlanBadge shows current Plan (Member read-only) **And** SponsoredBadge when `IsComplimentary=true`
2. **Given** usage toward communities / published activities / regs-mo caps **When** LimitMeter renders **Then** warns at ≥80% and blocks at 100%
3. **Given** BillingBanner states (Trialing last 7d, PastDue, OnHold, ReadOnly_OverLimit) **When** active **Then** copy + CTA match EXPERIENCE; text+icon+link; Admin-only billing CTA
4. **Given** Basic empty tenant dashboard **When** Priya lands after signup **Then** opening-ritual CTAs guide Community → Activity
5. **Given** UpgradePanel on locked modules **When** Admin vs Member **Then** Admin gets upgrade CTA; Member gets feature-locked without billing CTA

## Tasks / Subtasks

- [x] Task 1: Tenant shell API (AC: 1–3)
  - [x] 1.1 `GET /api/v1/admin/shell` — plan, billing, limits, usage, limit dials, billing banner
  - [x] 1.2 `TenantPlanLimits` + `TenantShellService`

- [x] Task 2: Shell chrome components + layout wiring (AC: 1–3)
  - [x] 2.1 PlanBadge + SponsoredBadge in AdminTopBar
  - [x] 2.2 LimitMeter in sidebar
  - [x] 2.3 BillingBanner above main content
  - [x] 2.4 TenantShellProvider

- [x] Task 3: Basic empty dashboard ritual (AC: 4)
  - [x] 3.1 DashboardEmptyState — Community → Activity opening ritual

- [x] Task 4: UpgradePanel on Campaigns / Site / Reports (AC: 5)
  - [x] 4.1 Campaigns — Pro gate
  - [x] 4.2 Website builder — Basic → Core gate
  - [x] 4.3 Reports — Basic advanced filters → Core gate
  - [x] 4.4 `/settings/billing` admin surface

- [x] Task 5: Tests + verify
  - [x] 5.1 `TenantShellServiceTests`
  - [x] 5.2 `dotnet build` + `npm run build`

## Dev Agent Record

### Completion Notes List

- Added `GET /api/v1/admin/shell` with plan/billing snapshot, usage vs limits, limit dials (warn ≥80%, block at 100%), and billing banner variants.
- Wired PlanBadge, SponsoredBadge, LimitMeter, BillingBanner into admin layout via TenantShellProvider.
- UpgradePanel on Campaigns (Pro), Website (Core from Basic), Reports advanced filters (Core from Basic).
- Basic empty dashboard guides Community → Activity first.

### File List

- `src/Domain/Tenants/TenantPlanLimits.cs`
- `src/Contracts/Admin/TenantShellContracts.cs`
- `src/Application/Tenants/ITenantShellService.cs`
- `src/Infrastructure/Tenants/TenantShellService.cs`
- `src/Api/Controllers/V1/AdminShellController.cs`
- `src/Infrastructure.Tests/Tenants/TenantShellServiceTests.cs`
- `web/lib/shell/tenant-shell-api.ts`
- `web/components/shell/*`
- `web/components/layouts/dashboard-layout.tsx`
- `web/components/layouts/admin-top-bar.tsx`
- `web/components/layouts/admin-sidebar.tsx`
- `web/components/dashboard/dashboard-empty-state.tsx`
- `web/components/campaigns/campaigns-list-page.tsx`
- `web/components/website/website-builder-page.tsx`
- `web/components/reports/reports-page-client.tsx`
- `web/app/(admin)/settings/billing/page.tsx`
- `web/components/settings/settings-billing-page-content.tsx`

## Change Log

- 2026-07-22: DS 14.5 — admin shell plan/limit/billing chrome; status → review.
- 2026-07-22: CR 14.5 — banner priority, mobile shell parity, billing refresh; status → done.

## Review Findings

| Severity | Finding | Resolution |
|----------|---------|------------|
| High | `admin-mobile-nav.tsx` used shell hooks/components without imports | Added PlanBadge, SponsoredBadge, LimitMeter, useTenantShell imports |
| Medium | Billing banner over-limit could beat PastDue/OnHold/Trialing | Reordered priority: PastDue → OnHold → Trialing (7d window, future only) → over-limit |
| Medium | Over-limit CTA always pointed at Pro | Dynamic upgrade slug: Basic→Core, Core→Pro |
| Medium | PlanBadge hidden on small screens in top bar | Removed `hidden sm:flex` wrapper |
| Low | Shell stale after Stripe checkout return | Refresh shell when `?billing=success` in dashboard layout |

### Story completion status

done — DS + CR complete.
