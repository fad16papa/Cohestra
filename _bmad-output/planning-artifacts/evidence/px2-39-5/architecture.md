# Story 39.5 architecture

Date: 2026-10-03  
Owner: Grok 4.6 (Architect). Composer 2.5 not used for this contract.

## Primitive

`RouteBoundaryState` (client) in `web/components/shared/route-boundary-state.tsx`.

Props: `kind` (`not-found` | `error` | `offline`), `surface`, optional `reset`, `ownsMain`.

- Owns the document `h1` (`tabIndex={-1}`). Focuses it on present via `useLayoutEffect`.
- Does **not** render `<main>` when the parent layout already has one (`admin`, `platform`, `public`).
- Renders `<main>` when `ownsMain` (`marketing`, `embed`, `global`).
- Never renders `error.message`, `error.stack`, `digest`, tokens, or tenant ids.
- Public/embed/marketing/global primary actions: `min-h-12 min-w-12` (48px).
- Admin actions: `min-h-11 min-w-11` (44px).
- No enter animation. Existing Epic 37 admin pathname motion may wrap children; the primitive itself is static.

Copy and hrefs live in `web/lib/route-boundary.ts` so Vitest can lock the matrix without rendering Next files.

## Boundary ownership

| File | Handles | `ownsMain` |
| --- | --- | --- |
| `app/not-found.tsx` | Unmatched marketing/auth/root URLs; `notFound()` from `app/page.tsx` | yes |
| `app/error.tsx` | Unexpected errors in root segment | yes |
| `app/global-error.tsx` | Root-layout failures. Owns `html`/`body`. Imports `globals.css`. Logs `digest` only. | yes |
| `(admin)/not-found.tsx` | Unmatched `/dashboard…` `/clients…` etc. Nested `notFound()` under admin | no |
| `(admin)/error.tsx` | Admin segment crashes | no |
| `(platform)/not-found.tsx` | Unmatched `/platform/…` when the console renders | no |
| `(platform)/error.tsx` | Platform segment crashes | no |
| `(public)/error.tsx` | Registration route crash. Does not change unavailable 200 | no |
| `embed/not-found.tsx` | Unmatched `/embed/…` | yes |
| `embed/error.tsx` | Embed crash | yes |

Root `not-found` does **not** handle admin/platform unmatched URLs — those groups have their own files.

Admin unmatched descendants must call `notFound()` from a nested catch-all so `(admin)/not-found.tsx` renders **inside** `DashboardLayout` / `main#main-content`. Prefix catch-alls exist for Dashboard, Settings, Analytics, AI, Follow-up, Billing, Reports, Intelligence, and Needs Attention. Entity trees use targeted catch-alls that do **not** replace `[id]` pages:

- `clients/[id]/[...unmatched]`
- `activities/[id]/[...unmatched]`, `activities/new/[...unmatched]`, `activities/categories/[...unmatched]`, `activities/communities/[id]/[...unmatched]`
- `campaigns/[id]/[...unmatched]`, `campaigns/new/[...unmatched]`
- `billing/page.tsx` (exact `/billing`) + `billing/[...unmatched]` (includes `/billing/checkout/extra`)

Valid entity routes keep `ProductErrorState`. Compatibility rooms (`/reports`, `/intelligence`, `/needs-attention`) still redirect; only extra segments 404.

## Next-action resolution

| Surface | href | label |
| --- | --- | --- |
| admin | `/dashboard` | Dashboard |
| marketing / auth / public / embed / global | `/` | Home |
| platform | `/platform` | Platform home |

Unauthenticated `/platform/*` remains `PlatformRouteGuard` → `/platform/login`. That is not a 404.

## Online / offline

`error.tsx` (all surfaces) is a thin client wrapper:

1. Subscribe to `window` `online`/`offline`.
2. If `navigator.onLine === false`, render `kind="offline"`.
3. Else render `kind="error"`.
4. Manual **Try again** always calls Next `reset()`.
5. The first offline-to-online transition also calls `reset()` exactly once (`shouldAutoResetOnReconnect`). An initially online mount never auto-resets. Repeated `online` events after that first reconnect do not reset again.
6. Offline copy must not claim a server 500.

404 never becomes offline. A missing URL is still not found.

## Retry / reset

`reset` remounts the segment. The force-error client throws only after an explicit “Trigger test error” click so React Strict Mode cannot auto-recover and Retry remounts the idle harness. Production never mounts that client. Routes are `/e2e-force-error` and `/dashboard/e2e-force-error`.

## Hydration

Boundary files that call `reset` or read `navigator` are client components. Server `not-found.tsx` files may import the client primitive. Force-error **pages** are server components that `notFound()` in production before the client thrower hydrates.

## Logging and privacy

- UI: stable product copy only.
- Client `error.tsx` / `global-error.tsx`: `console.error` with `error.digest` only (Next-provided). Never `error.message` or stack into the DOM or into toasts.
- No new telemetry APIs.

## Security

- No production path throws on purpose.
- Force-error URLs are not linked from product chrome.
- Production request to those URLs is a product 404.

## Motion

No new motion tokens. Admin 404/error may appear inside `AdminRouteTransition` (existing 280ms pathname enter). The primitive does not add enter/exit.

## Non-goals (architecture lock)

Do not add `loading.tsx`. Do not nest `main` in admin/platform/public. Do not reuse `ProductErrorState` as the document h1 (it is an h2 alert). Do not start Epic 40.
