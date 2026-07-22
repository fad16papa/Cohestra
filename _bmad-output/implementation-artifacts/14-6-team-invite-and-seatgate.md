---
baseline_commit: d4e689e
---

# Story 14.6: Team invite and SeatGate

Status: done

## Story

As a Tenant Admin on Core+, I want to invite Members up to my seat cap, so that a partner can operate the workspace — while Basic stays intentionally solo.

## Acceptance Criteria

- [x] Basic: invite disabled + upgrade-to-Core CTA; API returns plan-limit error
- [x] Core/Pro: invite when `active_members + pending_invites < cap`; 7-day token; revoke
- [x] Accept invite → membership; Team/Billing hidden for Members
- [x] Seat cap soft-block UI + API
- [x] Upgrade tier only (no per-seat add-ons)

## Dev Agent Record

- `TenantInvite` entity + migration
- `ITeamInviteService` / `TeamInviteService`
- `GET/POST/DELETE /api/v1/admin/team` + public accept/preview
- `/settings/team`, `/invite/accept`, seat dial in shell

## Change Log

- 2026-07-22: DS 14.6 — team invite + SeatGate complete.
