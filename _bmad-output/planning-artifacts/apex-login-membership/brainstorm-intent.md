# Brainstorm: Apex localhost login for multi-membership operators

**Topic:** Generic localhost login blocked for creativorare operators  
**Date:** 2026-08-15

## Root cause

`OperatorSeeder.BackfillDefaultTenantAdminMembershipsAsync` links every TenantAdmin to the `default` tenant. Real workspace admins (e.g. creativorare) end up with **two memberships**. Bare localhost login counts all memberships → `multiple_workspaces` error. Slug login works because host resolves directly to creativorare.

## Ideas

1. **Filter default backfill artifact at login** — apex login ignores default when non-default workspaces exist
2. **Stop backfilling default** when user already has non-default membership
3. **Workspace picker UI** on apex login for true multi-workspace operators
4. **Primary workspace flag** on membership row
5. **Last-used workspace** cookie to disambiguate
6. **Remove default tenant** from production paths entirely
7. **Migration** to delete default memberships where non-default TenantAdmin exists
8. **Handoff always** — never issue tokens on apex for tenant admins

## Chosen fix (P0)

- `ApexLoginMembershipFilter.ForEmailFirstLogin` — drop default when real workspaces exist
- Skip default backfill for users with existing non-default membership
- Keep `multiple_workspaces` only for **two or more non-default** workspaces
