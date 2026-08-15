# Code Review: Session Expired Login Fix

**Branch:** `cursor/fix-session-expired-login-4da3`  
**Scope:** 6 files, +153 / -24 lines  
**Spec:** `_bmad-output/planning-artifacts/auth-session-reliability/prd.md`

## Verdict

**Approve with minor follow-ups.** Core race conditions are addressed correctly; no blocking issues.

## Findings

### patch — Storage listener may validate stale token after cross-tab login

**Location:** `auth-provider.tsx` storage handler  
**Detail:** When another tab writes a new session, the handler calls `validateStoredSession()` without checking whether the token changed mid-flight (same pattern as mount effect). Lower risk than mount race because storage events fire after write completes, but rapid tab switching could still race.  
**Recommendation:** Reuse refresh-token-at-start guard in storage handler (defer to follow-up).

### defer — Refresh TTL still 24 hours

**Location:** `appsettings.json` Jwt.RefreshTokenHours  
**Detail:** Users away >24h will still see session-expired banner before login. Expected; PRD lists longer TTL as follow-up.

### dismiss — LoginForm still bypasses AuthProvider.login

**Detail:** Pre-existing pattern; not introduced by this PR. PRD follow-up covers consolidation.

### dismiss — handleSessionExpired still shows toast + redirect with reason

**Detail:** Intentional: toast when ejected from app; login page shows banner only (no duplicate toast). Acceptable.

## Layer summary

| Layer | Result |
|-------|--------|
| Blind Hunter | No unguarded clearAuthSession in changed refresh paths |
| Edge Case Hunter | Mount race guarded; storage handler minor gap |
| Acceptance Auditor | FR-1–FR-4 satisfied per PRD |

## Tests

- `auth-storage.test.ts` covers guarded clear — pass (5/5)

## Recommendation

Merge after optional storage-handler guard in follow-up PR.
