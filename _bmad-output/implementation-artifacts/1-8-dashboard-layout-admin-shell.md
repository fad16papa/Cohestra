---
baseline_commit: b63b2900fc189ce1385f9a7f5b8a71c6307f8c06
---

# Story 1.8: DashboardLayout Admin Shell

Status: done

## Story

As an operator,
I want a consistent admin layout with sidebar navigation,
So that I can navigate the platform efficiently on desktop and mobile.

## Acceptance Criteria

1. **AC-1.8.1 — DashboardLayout shell (UX-DR17, UX-DR31)**
   - **Given** I am authenticated
   - **When** I view any admin page
   - **Then** DashboardLayout renders with 240px sidebar, top bar (page title + ThemeToggle), and content well max-w-7xl
   - **And** sidebar collapses to icon rail below 768px, then Sheet navigation
   - **And** placeholder routes exist for dashboard, activities, clients, campaigns, reports, settings

## Tasks / Subtasks

- [x] **Task 1: DashboardLayout component** (AC: 1.8.1)
  - [x] 240px sidebar at `lg` (`w-60`), icon rail at `md` (`w-16`)
  - [x] Top bar: page title, Updated time, ThemeToggle
  - [x] Content well `max-w-7xl` with `p-6` (24px)

- [x] **Task 2: Responsive navigation** (AC: 1.8.1)
  - [x] Desktop/tablet: persistent sidebar (`md+`)
  - [x] Mobile: Sheet navigation with menu trigger (`< md`)

- [x] **Task 3: Admin placeholder routes** (AC: 1.8.1)
  - [x] `/dashboard`, `/activities`, `/clients`, `/campaigns`, `/reports`, `/settings`

- [x] **Task 4: Verify** (AC: 1.8.1)
  - [x] `npm run build` and `npm run lint` pass

## Dev Notes

- Auth guard redirects to `/login` ship in Story 1.10 — layout is accessible without auth for now
- Home page links to `/dashboard`; public footer ThemeToggle remains until Story 1.9

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- `DashboardLayout` with sidebar, top bar, and content well
- Admin route group `(admin)` with shared layout
- Six placeholder pages with `AdminPlaceholder` card
- Responsive: icon rail at md, full labels at lg, Sheet nav below md

### File List

- `web/lib/admin-nav.ts`
- `web/components/layouts/dashboard-layout.tsx`
- `web/components/layouts/admin-sidebar.tsx`
- `web/components/layouts/admin-top-bar.tsx`
- `web/components/layouts/admin-nav-links.tsx`
- `web/components/layouts/admin-mobile-nav.tsx`
- `web/components/layouts/admin-placeholder.tsx`
- `web/components/layouts/updated-time.tsx`
- `web/components/ui/sheet.tsx`
- `web/app/(admin)/layout.tsx`
- `web/app/(admin)/dashboard/page.tsx`
- `web/app/(admin)/activities/page.tsx`
- `web/app/(admin)/clients/page.tsx`
- `web/app/(admin)/campaigns/page.tsx`
- `web/app/(admin)/reports/page.tsx`
- `web/app/(admin)/settings/page.tsx`
- `web/app/page.tsx`

### Change Log

- 2026-06-18: Story 1.8 implemented — DashboardLayout admin shell and placeholder routes
