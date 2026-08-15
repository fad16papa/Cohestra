# Code Review: Apex Login Primary Workspace (PR #189)

**Reviewed:** `e9a4249..8b57117` (merged)  
**Spec:** `_bmad-output/planning-artifacts/apex-login-membership/prd.md`  
**Date:** 2026-08-15  
**Patches applied:** 2026-08-15 (`cursor/apex-login-review-patches-4da3`)

## Verdict

**Approve with follow-ups.** Core fix is sound for the reported creativorare + default + load-test case. Review patches applied for filter order and client auth host forwarding.

## Patch status

| Finding | Status |
|---------|--------|
| Filter order (load-test before TenantAdmin narrowing) | ✅ Applied |
| `X-Forwarded-Host` on all client auth fetches | ✅ Applied via `buildClientAuthHeaders()` |
| Member-on-real + TenantAdmin-on-load-test edge case | ✅ Test added |

## Layer summary

| Layer | Result |
|-------|--------|
| Blind Hunter | Manual (Bugbot: empty diff on main) — no blocking security/auth bypass found |
| Edge Case Hunter | 5 findings (see triage below) |
| Acceptance Auditor | FR-1/2/UJ-1/UJ-2 met; FR-3 extended beyond spec (load-test deprioritization) |

---

## Triage

### patch — TenantAdmin narrowing before load-test filter can pick wrong workspace

**Location:** `ApexLoginMembershipFilter.cs:55-70`  
**Source:** edge  
**Detail:** If an operator is `TenantMember` on a real workspace but `TenantAdmin` on a `load-*` tenant, the TenantAdmin filter drops the real membership and apex login handoffs to the load-test workspace. Uncommon but possible for invited members who also ran load-test seeds.  
**Fix:** Apply load-test deprioritization *before* TenantAdmin narrowing, or require the chosen workspace to be TenantAdmin when Identity role is TenantAdmin.

---

### defer — Single TenantMember membership resolves without admin role check

**Location:** `ApexLoginMembershipFilter.cs:50-52`  
**Source:** edge  
**Detail:** A sole non-default `TenantMember` membership is returned even when Identity has `TenantAdmin`. Likely misconfiguration; server still authorizes per-endpoint. Pre-existing pattern.

---

### defer — Multiple load-test-only admins pick alphabetically

**Location:** `ApexLoginMembershipFilter.cs:81-84`  
**Source:** edge  
**Detail:** QA-only scenario (multiple `load-*` TenantAdmin, no real workspace). Intentional convenience for load-test operators signing in at localhost. Not production risk.

---

### defer — `load-` prefix duplicated in Application vs Infrastructure

**Location:** `ApexLoginMembershipFilter.cs:10`, `OperatorSeeder.cs:232`  
**Source:** edge+auditor  
**Detail:** Duplicated heuristic vs `LoadTestTenantRules`. A customer slug starting with `load-` would bypass cleanup. Extremely unlikely; consolidate in a follow-up.

---

### patch — `X-Forwarded-Host` only on password login

**Location:** `web/lib/auth-api.ts:258-260`  
**Source:** edge  
**Detail:** `loginWithPassword` now forwards browser host; `refreshAuthSession`, `verifyEmailOtp`, and other client auth calls do not. Apex login may succeed then refresh on a mismatched host path. Extend header to all client-side auth fetches or centralize in a helper.

---

### dismiss — PRD FR-3 extension (load-test filtering)

**Detail:** PRD says fail when 2+ non-default memberships remain after default filter. Implementation additionally deprioritizes `load-*` slugs — deliberate product improvement for UAT, not a regression.

---

## Acceptance checklist

| Requirement | Status |
|-------------|--------|
| FR-1 Filter default bootstrap membership | ✅ |
| FR-2 Prevent backfill duplication (PR #188) | ✅ |
| FR-3 True multi-workspace guard (2+ real workspaces) | ✅ |
| UJ-1 localhost login → creativorare handoff | ✅ (with rebuild) |
| UJ-2 Slug login unchanged | ✅ |
| Startup cleanup of stale default membership | ✅ (new) |

## Tests

- Unit: `ApexLoginMembershipFilterTests`, `AuthServiceMembershipGuardTests`, `OperatorMembershipBackfillTests` — adequate for happy path
- Gap: no test for Member-on-real + TenantAdmin-on-load-test edge case
- Gap: no web test for `X-Forwarded-Host` on login fetch

## Recommended next actions

1. **patch** — Reorder filter: deprioritize load-test before TenantAdmin narrowing  
2. **patch** — Shared auth fetch helper with `X-Forwarded-Host` for all browser auth calls  
3. **defer** — Workspace picker UI for operators with 2+ real TenantAdmin workspaces
