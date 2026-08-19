# Code Review — Epic 28 Platform Ops Console

**Branch:** `cursor/epic-28-platform-ops-4da3` vs `main`  
**Date:** 2026-08-19  
**Review mode:** no-spec (epics planning doc not in repo)

## Summary

**Code review complete.** 0 decision-needed, 4 patch (applied), 5 defer, 3 dismissed.

## Applied patches

- [x] [Review][Patch] Block password reset for unverified members — return 409 Conflict [`PlatformTenantOpsService.cs`]
- [x] [Review][Patch] Reject replies on resolved/closed issues — return 409 [`PlatformSupportIssueService.cs`]
- [x] [Review][Patch] Set status to WaitingOnOperator when platform adds reply [`PlatformSupportIssueService.cs`]
- [x] [Review][Patch] Status email dedupe key includes UpdatedAt ticks to allow repeat transitions [`PlatformSupportIssueService.cs`]
- [x] [Review][Patch] AddReply missing actor returns 401 not 400 [`PlatformSupportIssuesController.cs`]

## Open action items (defer)

- [x] [Review][Defer] No integration tests for new Epic 28 endpoints — defer, follow-up story recommended
- [x] [Review][Defer] Platform recovery endpoints lack admin-side rate limiting — defer, acceptable for PlatformAdminOnly v1
- [x] [Review][Defer] Omni-search SQL LIKE wildcard semantics (%/\_) — defer, low priority
- [x] [Review][Defer] Legacy audit rows fall back to current user email — defer, display-only backfill
- [x] [Review][Defer] Recovery audit not transactional with OTP send — defer, rare edge case

## Dismissed

- Multi-tenant member password reset scope — intentional; membership is global by design
- TenantAdmin 404 on others' issues — correct; operator detail is submitter-only
- Migration Down data loss — standard EF migration behavior

## Blind Hunter highlights (pre-patch)

1. Password reset audited/succeeded even when ForgotPassword no-ops for unverified email — **fixed**
2. Replies allowed on closed issues — **fixed**
3. Reply did not move status to WaitingOnOperator — **fixed**
4. Status notification dedupe suppressed repeat emails — **fixed**

## Test status

- `dotnet build` — pass
- `npm run build` — pass
- `dotnet test` — 591 passed; 1 pre-existing failure (`RegistrationThemeQueriesTests`, unrelated)
- Integration tests — 68 skipped (no DB in CI for this run)
