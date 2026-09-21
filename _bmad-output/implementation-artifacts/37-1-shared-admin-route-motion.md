---
status: review
story_key: 37-1-shared-admin-route-motion
epic: 37
---

# Story 37.1: Shared admin route-transition primitive

Status: review

## Story

As an operator using the Cohestra admin shell,  
I want a single, shared page-enter motion when I change **routes**,  
so that navigation feels consistent without remounting Form Studio drafts, activity tabs, or Website Builder workspace state.

## Acceptance Criteria

1. **Shared primitive** — Admin route enter is implemented once (`AdminRouteTransition` + `adminRouteTransitionKey`) and used from `DashboardLayout`. No second admin enter wrapper. No new animation library. No `dangerouslySetInnerHTML`. No View Transitions API.

2. **Pathname identity** — `adminRouteTransitionKey("/activities/abc?tab=form#x")` equals `adminRouteTransitionKey("/activities/abc?tab=preview")` and differs from `adminRouteTransitionKey("/activities/xyz")`. Search params and hash must never be part of the key.

3. **Form Studio / studio state** — Build ↔ Preview (`formStudioMode` in `ActivityFormTab`) and activity section tabs (`activeTab` in `ActivityDetailPageClient`) must not become transition keys. Website Builder stays on `/dashboard/website` with local `workspaceMode`. Do not remount those surfaces on mode/tab change.

4. **Activity identity remount** — Changing pathname `/activities/[idA]` → `/activities/[idB]` still remounts page content (clears the previous activity draft). This is required.

5. **Reduced motion** — `.animate-page-enter` remains disabled under `@media (prefers-reduced-motion: reduce)` in `web/app/globals.css`. No JS-first motion gate that can flash animation before hydration.

6. **Motion budget** — Enter uses existing opacity + translateY only (~350ms). No layout-property animation. Transition wrapper is `min-w-0 overflow-x-clip`.

7. **A11y / history** — Primitive does not steal focus, does not mark incoming content `inert`, does not intercept browser history. Next.js Link / Back / Forward keep working.

8. **Scope** — Public registration, embed, marketing, and login shells are unchanged except they may continue to reuse the CSS class `.animate-page-enter` as they do today.

9. **Tests** — Unit tests cover key stripping, activity-id difference, and that `DashboardLayout` sources `adminRouteTransitionKey` / `AdminRouteTransition` and does not `key={pathname}` on `<main>`. No `dangerouslySetInnerHTML` in the new components.

## Non-goals

- Animating Form Studio Build ↔ Preview
- Unifying marketing cinema motion
- Adding framer-motion / GSAP / View Transitions
- Changing Form Studio save/preview data flow
- Changing activity tab URL sync (tabs are local state today)

## Tasks / Subtasks

- [x] Task 1 — Key helper (AC: 2, 4)
  - [x] `web/lib/admin-route-motion.ts` with `adminRouteTransitionKey`
  - [x] `web/lib/admin-route-motion.test.ts`
- [x] Task 2 — Primitive + shell integration (AC: 1, 5, 6, 7)
  - [x] `web/components/motion/admin-route-transition.tsx`
  - [x] `DashboardLayout`: key wrapper inside `<main>`, not on `<main>`
  - [x] Confirm globals.css PRM rule still lists `.animate-page-enter`
- [x] Task 3 — Regression tests + source guards (AC: 3, 8, 9)
  - [x] Layout source does not `key={pathname}` on main
  - [x] New files have no `dangerouslySetInnerHTML` / `startViewTransition`

## Dev Notes

### Current state (must preserve)

- `web/components/layouts/dashboard-layout.tsx` puts `key={pathname}` on `<main className="animate-page-enter">`. That remounts **main + children** on every pathname change. Children already swap via App Router; the extra main remount also remounts padding chrome.
- Activity tabs: `setActiveTab` — **no router push**. `?tab=` only seeds initial tab. [Source: `activity-detail-page-client.tsx`]
- Form Studio modes: `setFormStudioMode("build" | "preview")` — React state. Preview remount key is `buildFormStudioPreviewKey` (schema), not routes. [Source: `activity-form-tab.tsx`]
- Website Builder: `/dashboard/website` + local `workspaceMode`. [Source: `website-builder-page.tsx`]
- Reduced motion for `.animate-page-enter` already exists in `globals.css` (~line 533).
- `useSyncMedia` exists; do **not** use it to toggle this enter class (AD-4).

### Architecture (binding)

See `_bmad-output/planning-artifacts/architecture-operator-shell-motion-37-2026-09-21/ARCHITECTURE-SPINE.md` AD-1…AD-7.

### Anti-patterns

- `key={pathname}` or `key={searchParams.toString()}` on `<main>`
- `startViewTransition`
- `framer-motion` / new deps
- Wrapping Form Studio tab panels in `AdminRouteTransition`
- JS `prefers-reduced-motion` check that delays applying `animation: none`

### Testing

Vitest includes only `web/lib/**/*.test.ts`. Keep tests there. Source-read `dashboard-layout.tsx` like `registration-success-copy.test.ts`.

## Dev Agent Record

### Agent Model Used

Grok 4.6 (primary). Composer 2.5 not used.

### Debug Log References

### Completion Notes List

- Pathname-only `adminRouteTransitionKey` + `AdminRouteTransition` in `DashboardLayout`.
- `<main>` is no longer keyed; chrome stays mounted.
- Form Studio / activity tabs remain local state and are not wrapped.
- Vitest: 348 passed including 6 new admin-route-motion tests.

### File List

- `_bmad-output/planning-artifacts/architecture-operator-shell-motion-37-2026-09-21/ARCHITECTURE-SPINE.md`
- `_bmad-output/planning-artifacts/epics-operator-shell-motion-37.md`
- `_bmad-output/implementation-artifacts/37-1-shared-admin-route-motion.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `web/lib/admin-route-motion.ts`
- `web/lib/admin-route-motion.test.ts`
- `web/components/motion/admin-route-transition.tsx`
- `web/components/layouts/dashboard-layout.tsx`

## Change Log

- 2026-09-21: Shared admin route enter primitive; pathname-only identity.
