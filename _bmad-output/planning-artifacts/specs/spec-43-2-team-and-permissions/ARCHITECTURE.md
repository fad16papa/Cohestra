# ARCHITECTURE — Story 43.2 Team permissions presentation

## Paradigm

**Presentation on existing authorization.** Server `TenantAdminOnly` is the source of truth. The UI maps outcomes; it does not grant access.

## AD-1 Shared denied primitive

**Binds:** Team (and SettingsAdminOnlyGate) reuse `ProductErrorState`.
**Prevents:** A second PermissionDenied framework; dual h1.
**Rule:** Layout h1 stays the Settings section name. Denied title is ProductErrorState h2. Member Team still `router.replace` to `/settings/profile` (43.1).

## AD-2 Seat and plan ownership

**Binds:** `InvitesAllowed` and `SeatCapReached` come from `TeamInviteService.GetOverviewAsync`.
**Prevents:** Client-side plan/seat invention.
**Rule:** Basic → UpgradePanel. Eligible + cap → banner. Member → ProductErrorState. Map `plan_locked` / `seat_cap_reached` / `member_remove_conflict` from ProblemDetails.

## AD-3 Fixture architecture

**Binds:** Local QA uses `E2eEntitlementFixtureSeeder` / Playwright `PX2_PRO_MEMBER` / integration `CreateTenantMemberUserAsync`.
**Prevents:** Production Member seeder, shared production passwords, auth bypass.
**Rule:** Invite tests use FakeEmailSender or NullEmailSender. Addresses stay `.local` / `example.com`.

## Deferred

Concurrent serializable seat insert; copy-link; Billing 43.3.
