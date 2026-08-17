# Brainstorm intent — platform admin login path

**Topic:** Separate platform-admin login URL; one tenant login for apex and slug hosts  
**Goal:** Two honest auth doors in one Next app — no web split  
**Date:** 2026-08-17

## Killed

- Second Next app (`web-platform`), second Docker/nginx upstream, `packages/auth-client` extract
- `platform.{apex}` origin (path on marketing apex is enough until a real origin split is forced)
- API `audience` field on `POST /api/v1/auth/login`
- Platform link in tenant login footer
- Forgot-password / register on platform login
- Ops routes on tenant/custom domains

## Model: Host ⊥ path

| Axis | Selects |
|------|---------|
| **Host** | Tenant (slug/custom domain) vs marketing apex |
| **Path** | Operator door (`/login`) vs ops door (`/platform/login`) on apex only |

Host and path are orthogonal. Ops UI on a club host is a bug to prevent.

## Two doors

### Door A — `/login`

- **Who:** All tenants and TenantAdmins
- **Where:** Apex and every `{slug}` host — **same page module** (`app/login/page.tsx`)
- **UX:** Host-aware branding + workspace notice; email-first on apex; no platform chrome
- **Marketing CTA / invite accept:** always `/login` (never ops path)

### Door B — `/platform/login`

- **Who:** PlatformAdmin / Cohestra ops only
- **Where:** Marketing apex only (`localhost`, `cohestra.app`, `www.cohestra.app`)
- **UX:** `AuthFlowShell` eyebrow “Platform console”; `siteBranding=null`; noindex; no register/reset; seed creds documented here only
- **Home after login:** `/platform` (not the login URL)

## UI audience rejection (product truth)

| Door | Reject | CTA |
|------|--------|-----|
| Operator `/login` | `PlatformAdmin` | `/platform/login` |
| Platform `/platform/login` | non-`PlatformAdmin` (e.g. TenantAdmin) | `/login` |

- Reject in UI so the URL means the audience; JWT/API role policies remain the security boundary.
- Do **not** advertise `/platform/login` on empty operator form; CTA after mismatch is acceptable.
- Platform form may link “Operator sign in” → `/login` as escape hatch.
- Authenticated `PlatformAdmin` already on `/login` may continue to `/platform` (session exists).

## Tenant-host `/platform*` → apex

- Any `/platform` or `/platform/login` (or `/platform*`) on a tenant slug host → **307** to apex equivalent
- Preserve query string (e.g. `reason=session-expired`)
- Use `parseTenantSlugFromHostname` (not `isTenantSubdomainHost` — nip.io gap); `resolveMarketingApexUrl` for slug.localhost → localhost
- Middleware runs before static short-circuit; matcher covers all paths
- Do not 404 — 307 for mistyped bookmarks

## Admin guard bounce

- `AdminRouteGuard`: authenticated `PlatformAdmin` on `/dashboard` (admin shell) → `/platform`
- Platform shell already bounces non-platform roles → `/dashboard`

## Session-expired return paths

- From `/platform/*` → `/platform/login?reason=session-expired`
- From `/dashboard` / operator shell → `/login?reason=session-expired`

## Do not change

- API contract (`loginWithPassword`, no audience DTO)
- Docker compose (no new `web-platform` service)
- Tenant login route module identity (one page, apex + slug)
- Cookie domain / storage key (same origin, one session; roles mutually exclusive)
- CSP, fonts, nginx single `location /` → `web:3000`

## Implementation slice

1. **Helpers** — `loginAudienceMismatch`, `resolvePlatformOpsRedirectUrl`; unit-test both
2. **Middleware** — tenant-host `/platform*` 307 to apex (query preserved)
3. **LoginForm symmetry** — reject `PlatformAdmin` on operator door (platform door already rejects others)
4. **AdminRouteGuard** — bounce `PlatformAdmin` → `/platform`
5. **Tests** — Playwright: platform heading on apex; tenant-host `/platform/login` asserts apex redirect
6. **Docs** — README: two doors, one app; launch checklist: ops door is `/platform/login` on apex (not `/platform` as login URL)

## Assets (reuse)

- `PLATFORM_LOGIN_PATH`, `resolveLoginPath`
- `LoginForm` `audience=platform`; platform login outside `(platform)` group for unauthenticated apex render
- `PlatformAdminSeed` + existing noindex / no register on platform door
