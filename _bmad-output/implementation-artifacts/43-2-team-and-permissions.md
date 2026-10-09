---
id: 43.2
key: 43-2-team-and-permissions
title: Team and permissions
status: in-progress
epic: 43
created: 2026-10-06
baseline_commit: e4bb77c66d39a958dab300df80f5ebc460e6ccc0
accepted_commit: 1e46911597ed7b8c55bf49a018998f33ffb9fa73
implementation_merge: df42ea2ee9b27f6b31db5d4f829ef18b5ba9c50f
completeness_baseline: 556f7192890dcc7589252f1e1bdf790710402a6f
---

# Story 43.2: Team and permissions

Status: in-progress (completeness increment on already-merged PR #395)

DONE requires the Mandatory Code Review Loop on the final HEAD.

## Story

As a TenantAdmin or TenantMember,
I want Team to tell me clearly whether I am blocked by my role, my plan, or seat capacity, and I want remove/revoke confirmed accessibly,
so that I take the correct next action without gaining or losing permission by accident.

## Already satisfied (OUT OF SCOPE)

- 43.1 nested `/settings/team`, Member copy+replace, nav hiding
- Basic UpgradePanel
- Seat-cap banner mentioning revoke/remove/upgrade
- AlertDialog (not window.confirm) + 38.6 trap
- Server TenantAdminOnly, self-remove 400, last-admin 409
- Local `px2-pro-member` fixture
- One main / one Team h1

## Remaining scope

1. ProductErrorState for Member (and SettingsAdminOnlyGate) role denial; keep replace.
2. Dialog actions: Cancel / Remove member / Revoke invite.
3. 390 stacked rows + min-h-11 on Team actions.
4. Map `plan_locked`, `seat_cap_reached`, `member_remove_conflict` to distinct copy.
5. ProductErrorState retry on Team load failure.
6. Tests: API auth/plan/seat/isolation; Playwright Admin/Member/Basic/390/dialogs; 43.1 regression.
7. Document local Member fixture in story notes. No production seeder.

## Acceptance Criteria

1. Member `/settings/team` shows ProductErrorState permission copy including “tenant admins only”, no UpgradePanel/Start trial, then replace to profile.
2. Basic Admin still UpgradePanel; invites stay locked.
3. Eligible Admin can see members, pending invites, invite by email.
4. Seat cap disables invite and explains revoke/remove/upgrade.
5. Remove/revoke use AlertDialog with specific verbs; Cancel restores focus.
6. Member Team APIs 403. Basic invite 403 `plan_locked`. Cap invite 409 `seat_cap_reached`.
7. 390: no overflow; primary Team actions ≥44px.
8. `/settings/team` deep link, refresh, aria-current remain 43.1-correct.
9. No production Member seeder or real invite email in tests.

## Tasks

- [x] SettingsAdminOnlyGate + Team deny → ProductErrorState
- [x] Dialog labels + 390 stacking/touch
- [x] team-api error mapping
- [x] Integration tests
- [x] Playwright 43.2
- [x] 43.1 regression still green

## Close

Story 43.2 DONE on accepted HEAD `1e469115` (PR #395 merge `df42ea2e`). Epic 43 remains in-progress. Do not create 43.3.

## Exact stop

Story 43.2 DONE on PR #395. Epic 43 later closed through 43.5. Do not create or reopen 43.3–43.5.

## Completeness increment 2026-10-09

Owner re-authorized 43.2. Delta audit: product outcome already on main. Remaining gaps only:

- Wire AlertDialog `finalFocus` so Cancel returns focus to Remove/Revoke
- Service tests for self-remove and last-admin Conflict
- Playwright: Cancel focus restore; 390 Revoke/Remove ≥44px
- Display `formatInviteRole` on Team lists (admin/member, no new roles)

Do not reopen Settings routing. Do not add a production Member seeder.
