# Brainstorm: Auth Session Reliability

**Topic:** False "session expired" on login after days away  
**Goal:** Identify root causes and fix directions for login/session UX  
**Date:** 2026-08-15

## Root cause clusters

1. **Expected expiry after idle** — Refresh tokens TTL 24h in Redis; stale localStorage triggers cleanup → redirect to `/login?reason=session-expired`. This is correct behavior, but UX reads like login failed.

2. **Race: stale refresh vs new login** — Mount-time `validateStoredSession()` and background `refreshAuthSession()` call `clearAuthSession()` on 401, wiping a session written by a concurrent successful login.

3. **Race: validation after login** — `AuthProvider` mount effect sets `unauthenticated` when stale validation resolves after `applyProfile()`.

4. **Multi-tab rotation** — Tab A refreshes token; Tab B's stale refresh 401 clears storage for both.

5. **Duplicate messaging** — `handleSessionExpired` toast + login page toast + amber banner = feels like repeated failure.

## Solution directions (prioritized)

| Priority | Fix | Impact |
|----------|-----|--------|
| P0 | Guard session clear by refresh token fingerprint | Stops login wipe |
| P0 | Ignore stale validateStoredSession when token changed | Stops post-login downgrade |
| P1 | Cross-tab storage listener | Sync logout/login across tabs |
| P1 | Single session-expired surface (banner OR toast) | Clearer UX |
| P2 | "Remember me" / longer refresh TTL | Reduce idle return friction |
| P2 | Route LoginForm through AuthProvider.login | Single auth state path |

## Wildcards

- Server-side session versioning header to detect stale client state
- Silent re-auth handoff for tenant subdomain redirects
- Proactive localStorage cleanup on login page before form submit

## Chosen implementation (this PR)

- `clearAuthSessionIfRefreshTokenMatches`
- Stale validation guard in AuthProvider
- Storage event cross-tab sync
- Remove duplicate login-page toasts (keep banner + handleSessionExpired toast)
