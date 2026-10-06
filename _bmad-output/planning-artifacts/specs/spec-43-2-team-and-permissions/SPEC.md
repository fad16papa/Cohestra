---
id: spec-43-2-team-and-permissions
slug: 43-2-team-and-permissions
status: ready
created: 2026-10-06
baseline: e4bb77c66d39a958dab300df80f5ebc460e6ccc0
---

# SPEC — Story 43.2 Team and permissions

## Why

Operators must immediately tell whether Team is unavailable because of ROLE, PLAN, or SEAT CAP, and destructive membership actions must be confirmed accessibly — without changing who is allowed to do what.

## Capabilities

- **CAP-1** TenantMember `/settings/team` shows ProductErrorState role denial (not UpgradePanel) and keeps the 43.1 replace to `/settings/profile`. Layout h1 remains Team.
- **CAP-2** TenantAdmin on Basic still sees UpgradePanel (`invitesAllowed === false`). Nested route does not unlock invites.
- **CAP-3** Eligible Admin sees seat usage, members, pending invites, and invite form. Seat cap is a capacity state, not a permission or plan lock.
- **CAP-4** Seat-cap copy states current usage/limit, that invite is blocked, and that revoke/remove or upgrade can free or raise capacity.
- **CAP-5** Remove member and revoke invite use 38.6 AlertDialog with specific action labels, trapped focus, Esc/Cancel restoring focus.
- **CAP-6** Server TenantAdminOnly remains authoritative. UI mapping of `plan_locked`, `seat_cap_reached`, `member_remove_conflict`, and self-removal does not weaken API checks.
- **CAP-7** 390 Team: heading, seat line, stacked rows, invite controls ≥44px, dialogs usable, no page-level horizontal overflow.
- **CAP-8** 43.1 nested routing, nav visibility, and Basic lock remain. No `?section=` as canonical.
- **CAP-9** QA uses existing local Member fixtures. No production Member seeder or real invite email.

## Constraints

- Do not add roles, impersonation, or RBAC redesign.
- Do not change seat math (members + pending; Admin counts).
- Do not rewrite invite tokens, expiry, or email security.
- Do not implement 43.3 Billing presentation.
- Do not reopen 38.5/39.4 heading architecture (one main, one h1).
- ProductErrorState titles are h2; SettingsRouteHeader owns h1.

## Non-goals

- Copy-link / resend invite UI
- Real-time collaboration
- Ownership transfer
- Paddle / checkout changes
- Production shared Member account

## Success signal

An operator can tell in one glance whether Team is blocked by role, plan, or seats — and a Member still cannot invite, remove, or revoke via UI or API.

## Role matrix

| Actor | `/settings/team` | Team APIs | UpgradePanel |
| ----- | ---------------- | --------- | ------------ |
| TenantAdmin eligible | manage | 200 / mutate | no |
| TenantAdmin Basic | UpgradePanel | POST invite 403 `plan_locked` | yes |
| TenantMember | ProductErrorState + replace profile | 403 | no |
| Unauthenticated | login | 401 | n/a |

## Plan / seat matrix

| Plan | Seats | InvitesAllowed | Cap UX |
| ---- | ----- | -------------- | ------ |
| Basic | 1 | false | UpgradePanel (not seat banner) |
| Core | 3 | true | manage until members+pending ≥ 3 |
| Pro | 10 | true | same |
| Enterprise | 999 | true | same |

Pending unexpired non-revoked invites reserve seats. Revoke/remove frees capacity. Server 409 `seat_cap_reached` on extra invite.

## Invite states (domain truth)

Pending / Accepted / Expired / Revoked derived from `AcceptedAt`, `RevokedAt`, `ExpiresAt`. Settings list shows pending only.

## Destructive actions

- Remove: confirm “Remove member”; self-remove hidden; API 400 if attempted.
- Revoke: confirm “Revoke invite”.
- Last remaining TenantAdmin: API 409 `member_remove_conflict`; surface copy; no ownership transfer.

## Accessibility

One `main#main-content`. One h1 Team. Denied ProductErrorState is `role="alert"` with h2. Dialogs trap focus. Status not color-only. Reduced-motion: existing overlay 160ms.
