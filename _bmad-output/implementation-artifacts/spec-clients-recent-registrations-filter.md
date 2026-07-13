---
title: 'Clients recent registrations filter and dedup copy'
type: 'feature'
created: '2026-06-16'
status: 'done'
baseline_commit: '8a9eaa7aeb07b6088dc837c3309bcdcba16f5abf'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** After activity registrations, operators see one client row or a filtered subset and assume the list is broken. Dashboard "New this week" filters by client `CreatedAt`, not recent sign-ups, and the clients page does not explain phone/email dedup.

**Approach:** Add `registeredWithinDays` list filter aligned with dashboard metric and tile link; count clients with any registration in the period; clarify clients list copy and filter banners.

## Boundaries & Constraints

**Always:** Keep `createdWithinDays` behavior unchanged for backward compatibility. Dedup by phone/email stays as-is.

**Ask First:** Changing metric semantics for historical dashboard comparisons.

**Never:** Remove dedup, merge activity registrations into clients list as separate rows.

## I/O & Edge-Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Recent registration filter | `registeredWithinDays=7`, client re-registered yesterday, created 30 days ago | Client included in list | N/A |
| Created-only filter | `createdWithinDays=7`, same client | Client excluded | N/A |
| Dashboard tile | Click "New this week" | Navigates to `/clients?registeredWithinDays=7` | N/A |
| Invalid param | `registeredWithinDays=0` | 400 Bad Request | ProblemDetails |

</frozen-after-approval>

## Code Map

- `src/Infrastructure/Clients/ClientService.cs` -- add `registeredWithinDays` filter
- `src/Infrastructure/Dashboard/DashboardService.cs` -- metric counts registrations in period
- `src/Api/Controllers/V1/ClientsController.cs` -- query param + validation
- `web/lib/clients-api.ts` -- fetch param
- `web/components/clients/clients-list-page.tsx` -- filter UI + dedup copy
- `web/components/dashboard/dashboard-page-client.tsx` -- tile href + hint

## Tasks & Acceptance

**Execution:**
- [x] `src/Application/Clients/IClientService.cs` -- add parameter -- API contract
- [x] `src/Infrastructure/Clients/ClientService.cs` -- filter implementation -- core behavior
- [x] `src/Infrastructure/Dashboard/DashboardService.cs` -- metric alignment -- dashboard count
- [x] `src/Api/Controllers/V1/ClientsController.cs` -- expose param -- HTTP
- [x] `src/Api/Controllers/V1/CommunitiesController.cs` -- pass null -- compile
- [x] `web/lib/clients-api.ts` -- client fetch -- frontend API
- [x] `web/components/clients/clients-list-page.tsx` -- banner + copy -- UX
- [x] `web/components/dashboard/dashboard-page-client.tsx` -- tile link -- UX
- [x] `src/Infrastructure.Tests/Clients/ClientServiceListFilterTests.cs` -- unit test -- regression guard

**Acceptance Criteria:**
- Given a client registered within 7 days but created earlier, when opening `/clients?registeredWithinDays=7`, then the client appears in the list.
- Given the dashboard "New this week" tile, when clicked, then the clients list opens with the registration window filter active.
- Given the clients list page, when loaded without filters, then copy explains one row per contact and dedup by phone/email.

## Spec Change Log

## Verification

**Commands:**
- `dotnet test src/Infrastructure.Tests/Infrastructure.Tests.csproj` -- all pass
- `cd web && npm run build` -- succeeds
