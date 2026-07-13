---
baseline_commit: b63b2900fc189ce1385f9a7f5b8a71c6307f8c06
---

# Story 1.10: Login Page and Admin Route Protection

Status: done

## Story

As an operator,
I want to sign in via a login page and be blocked from admin routes when unauthenticated,
So that client data stays protected.

## Acceptance Criteria

1. **AC-1.10.1 — Admin route guard (FR-16)**
   - **Given** I am not authenticated
   - **When** I visit `/dashboard`, `/activities`, `/clients`, `/campaigns`, or `/reports`
   - **Then** I am redirected to `/login`

2. **AC-1.10.2 — Login success**
   - **Given** I am on `/login`
   - **When** I submit valid credentials
   - **Then** I am redirected to `/dashboard` with tokens stored for API calls

3. **AC-1.10.3 — Session expired (UX-DR27)**
   - **Given** my session expires
   - **When** I attempt an admin action
   - **Then** I am redirected to `/login` with toast "Session expired — sign in again."

## Tasks / Subtasks

- [x] **Task 1: Auth client and token storage** (AC: 1.10.2, 1.10.3)
  - [x] `lib/auth-storage.ts` — localStorage session with access/refresh tokens
  - [x] `lib/auth-api.ts` — login, refresh, profile validation, `fetchWithAuth`

- [x] **Task 2: Login page** (AC: 1.10.2)
  - [x] `/login` with email/password form
  - [x] Redirect authenticated users to `/dashboard`

- [x] **Task 3: Admin route protection** (AC: 1.10.1)
  - [x] `AuthProvider` + `AdminRouteGuard` on `(admin)` layout
  - [x] Protects all admin routes including `/settings`

- [x] **Task 4: Session expired UX** (AC: 1.10.3)
  - [x] Toast provider with session-expired message
  - [x] `useAuth().authFetch()` triggers redirect + toast on 401 after refresh failure

- [x] **Task 5: API CORS for browser auth** (AC: 1.10.2)
  - [x] Default CORS policy allowing `http://localhost:3000`

- [x] **Task 6: Verify build** (AC: all)
  - [x] `npm run build` and `npm run lint` pass

## Dev Notes

- Use `authFetch` from `useAuth()` for all future admin API calls (Epic 2+)
- Settings appearance sync to operator profile ships in Story 1.11

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Login page at `/login` with centered card and ThemeToggle
- JWT session in localStorage; refresh rotation via existing API endpoints
- Admin `(admin)` routes gated; unauthenticated visits redirect to login
- Session expiry shows toast + inline notice on login page
- API CORS enabled for local Next.js origin (required for browser login)

### File List

- `web/lib/auth-storage.ts`
- `web/lib/auth-api.ts`
- `web/components/auth/auth-provider.tsx`
- `web/components/auth/admin-route-guard.tsx`
- `web/components/auth/login-form.tsx`
- `web/components/auth/login-page-client.tsx`
- `web/components/ui/input.tsx`
- `web/components/ui/label.tsx`
- `web/components/ui/toast-provider.tsx`
- `web/app/login/page.tsx`
- `web/app/(admin)/layout.tsx`
- `web/app/layout.tsx`
- `web/app/page.tsx`
- `web/README.md`
- `src/Api/Program.cs`
- `src/Api/appsettings.json`

### Change Log

- 2026-06-18: Story 1.10 implemented — login page, JWT client auth, admin route guard, session expired toast

### Review Findings

- [x] [Review][Patch] `fetchWithAuth` spreads `init.headers` — fails when caller passes a `Headers` instance [web/lib/auth-api.ts:185-193]
- [x] [Review][Patch] Authenticated session not re-validated on window focus — expired refresh token leaves user in admin shell until manual navigation [web/components/auth/auth-provider.tsx:45-66]
- [x] [Review][Patch] Document `docker compose build web` after web route changes — stale container caused `/login` 404 on port 3000 [README.md:11-16]

- [x] [Review][Patch] Focus handler skips API when access token still valid locally [web/components/auth/auth-provider.tsx:76-98]

- [x] [Review][Defer] Client-side route guard only — admin HTML shell briefly reachable before redirect; architecture uses direct JWT in localStorage, not HttpOnly cookies
- [x] [Review][Defer] `authFetch` has no admin callers yet — session-expired toast on API 401 ships with Epic 2 admin API usage; focus re-validation covers idle expiry
- [x] [Review][Defer] CORS `AllowedOrigins` hardcoded to localhost — production origin config deferred to deployment story
