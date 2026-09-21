# Architecture spine — Epic 37 Operator shell motion

**Altitude:** epic  
**Status:** final  
**Updated:** 2026-09-21  
**Paradigm:** CSS-token route enter on the admin shell. Route identity is **pathname only**.

## Inherited

- Next.js App Router layouts persist; page `children` swap on navigation.
- No new animation libraries (`package.json` has React/Next/Tailwind/`tw-animate-css` only).
- Marketing cinema / landing motion stays in `web/components/marketing/*` (Epic 33). Do not unify it here.
- Form Studio draft lives in `ActivityFormTab` React state. Activity section tabs are React state (`activeTab`), optionally seeded from `?tab=`. Preview remounts only via `buildFormStudioPreviewKey` (schema material), not routes.

## AD-1 Shared admin enter primitive

**Binds:** Admin route enter animation has one owner: `AdminRouteTransition` + `adminRouteTransitionKey`.  
**Prevents:** Per-page `key={pathname}` / duplicated enter wrappers.  
**Rule:** `DashboardLayout` is the only admin integration point. Do not put enter keys on public, embed, platform, or marketing layouts.

## AD-2 Pathname is the only transition identity

**Binds:** `adminRouteTransitionKey(pathname)` returns the path with query and hash stripped.  
**Prevents:** Form Studio / activity tab / website-builder query or local-mode changes remounting the page and wiping draft.  
**Rule:** Never key on `useSearchParams()`, full URL, or Form Studio mode. `/activities/[id]` → `/activities/[otherId]` is a new pathname and **must** remount (clears the previous activity’s draft).

## AD-3 CSS motion, no View Transitions API, no JS animation library

**Binds:** Reuse existing `.animate-page-enter` (opacity + `translateY`, **280ms**, ease-out). Story 37.3 retuned this from 350ms so route enter stays inside the context budget (180–300ms) and does not feel slower than overlays.  
**Prevents:** `startViewTransition`, framer-motion, GSAP, WAAPI timelines.  
**Rule:** Transform and opacity only. No layout properties (`top`/`height`/`width`) in the enter animation. Operational admin surfaces must not stack a second enter (`animate-fade-in-up` is marketing/cinema-duration; do not use it under `AdminRouteTransition`).

## AD-4 Reduced motion is CSS, not a JS gate on first paint

**Binds:** `@media (prefers-reduced-motion: reduce) { .animate-page-enter { animation: none; } }` remains the source of truth (SSR-safe).  
**Prevents:** Waiting on `matchMedia` client mount to decide whether to animate (flash of motion).  
**Rule:** Do not introduce a JS `if (reduced) skip class` for this enter. Existing `useSyncMedia` stays for other features.

## AD-5 Shell chrome is stable; only page content is keyed

**Binds:** `key` sits on the transition wrapper **inside** `<main>`, not on `<main>` itself.  
**Prevents:** Remounting padding, banners, and the scroll-adjacent chrome on every navigation.  
**Rule:** Sidebar, top bar, billing banner, mobile tab bar stay mounted across admin routes.

## AD-6 Accessibility and history

**Binds:** Transition does not call `focus()`, does not intercept `popstate`, does not change Next.js scroll restoration.  
**Prevents:** Stolen keyboard focus, broken Back/Forward, trapped inert pages.  
**Rule:** No `inert` on the incoming page. No `aria-live` spam for ordinary navigations.

## AD-7 Overflow

**Binds:** Transition wrapper uses `min-w-0 overflow-x-clip`. Parent admin column already `overflow-hidden`.  
**Prevents:** Enter `translateY` / descendant overflow creating horizontal mobile scroll.

## AD-8 Builder studios use local surface motion, not route identity

**Binds:** Website Studio and Form Studio mode/tab/preview changes use `BuilderSurface` + CSS builder enter classes (`builder-context-enter`, `builder-tab-enter`, `builder-presence-enter`). Route primitive stays pathname-only (AD-2).  
**Prevents:** Wrapping studio modes in `AdminRouteTransition`; keep-mounted live preview trees; canvas scale or keystroke animation; new animation libraries; unifying Website and Form editor internals.  
**Rule:** Editor/build trees may `keepMounted`. Live preview (`WebsiteLivePreview` / `RegistrationPublicPreviewShell`) unmounts while the operator is editing. Motion is opacity and optional small `translateY` only — never layout properties, never scale of the edited canvas. `prefers-reduced-motion: reduce` disables builder enter classes in `globals.css` (SSR-safe). Shared tokens/primitives only.

## Deferred

- Migrating `ClientProfileSection` / marketing cinema to the admin primitive.
- View Transitions API for public registration.
