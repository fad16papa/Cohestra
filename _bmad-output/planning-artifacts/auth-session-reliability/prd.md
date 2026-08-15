---
title: Auth Session Reliability
status: draft
created: 2026-08-15
updated: 2026-08-15
---

# PRD: Auth Session Reliability

## Problem

Operators returning after several days see "session expired" messaging during what they believe is their first login attempt with correct credentials. Investigation shows this is primarily a **client-side race and UX confusion** problem, not invalid credentials.

## Goals

- Successful login must never be undone by stale background refresh/validation.
- Session expiry after idle must be clearly distinguished from login failure.
- Multi-tab usage must not corrupt auth state.

## Non-goals (this iteration)

- Changing JWT access token lifetime (15 min)
- Changing refresh token TTL (24 h) — tracked as follow-up
- "Remember me" checkbox — follow-up epic

## User journeys

### UJ-1: Operator returns after a week

**Mary**, tenant admin, opens bookmarked dashboard after 7 days away.

1. Stale refresh token in localStorage; app redirects to `/login?reason=session-expired`.
2. Amber banner explains prior session ended; she enters credentials.
3. Login succeeds immediately; no duplicate toasts; lands on dashboard.

**Acceptance:** Banner visible once; no toast duplicate; login succeeds on first try.

### UJ-2: Login during background validation

**Mary** lands on login with stale session while `validateStoredSession` runs.

1. She submits correct credentials before validation completes.
2. New session is stored; stale validation returns null.
3. Auth state remains authenticated; redirect proceeds.

**Acceptance:** `status` never flips to `unauthenticated` after successful login.

### UJ-3: Two tabs, one refreshes

Tab A rotates refresh token; Tab B holds stale refresh.

1. Tab B refresh fails with 401.
2. Clear only if refresh token still matches Tab B's attempt — does not wipe Tab A's newer token.

**Acceptance:** Active tab stays signed in.

## Functional requirements

### FR-1 Session clear guard

System shall clear localStorage auth session on refresh/profile failure **only when** the failing refresh token still matches stored session.

### FR-2 Stale validation ignore

On AuthProvider mount, if refresh token changed during `validateStoredSession`, system shall discard the validation result.

### FR-3 Cross-tab sync

When `auth_session` localStorage changes in another tab, AuthProvider shall re-validate or clear state accordingly.

### FR-4 Session-expired messaging

Login pages shall show at most one session-expired indicator (banner). Toast on redirect from app (`handleSessionExpired`) is sufficient; login page shall not duplicate.

## NFRs

- **NFR-1 Reliability:** Zero false session clears on concurrent login (unit-tested guard).
- **NFR-2 UX:** Session-expired copy must not appear as login error alert.

## Success metrics

- Support tickets / reports of "can't login after days away" drop to zero for credential-related cases.
- No regression in forced logout on genuine expiry.

## Follow-ups

- Evaluate 7–30 day refresh TTL or opt-in "stay signed in"
- Consolidate LoginForm to use AuthProvider.login exclusively
- Integration test for mount validation + login race
