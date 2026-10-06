---
id: experience-43-2-team-and-permissions
status: ready
created: 2026-10-06
---

# EXPERIENCE — Story 43.2 Team

## Foundation

Admin Settings workspace on `/settings/team` (43.1 chrome). Do not redesign Settings rails.

## States

| State | What the operator sees | Next action |
| ----- | ---------------------- | ----------- |
| Permission denied | h1 Team; ProductErrorState “You don’t have permission to manage Team” + tenant-admins-only copy; Back to your account; replace to profile | Leave Team |
| Plan locked | h1 Team; UpgradePanel “Add a second keyholder” | Compare Core/Pro |
| Seat cap | Seat line at capacity; amber status; invite disabled; members/invites still actionable | Revoke, remove, or upgrade |
| Loading | Loading team… | Wait |
| API failure | ProductErrorState with retry | Retry |
| Eligible | Members, pending, invite form | Manage |
| Empty extra members | Only you (admin) listed; pending empty copy | Invite |
| Invite pending | Email, role, expiry, Revoke | Revoke or wait |
| Member active | Email, role, Remove (not on self) | Remove |

## 390

Stack member/invite rows. Remove, Revoke, Send invite `min-h-11`. Invite fields full width. No horizontal page overflow. Context sheet unchanged.

## Dialogs

Remove: title “Remove team member?”; action “Remove member”; cancel “Cancel”.
Revoke: title “Revoke invite?”; action “Revoke invite”; cancel “Cancel”.
Consequence copy names the person/email.

## Voice

Role denial never mentions upgrade. Plan lock never says permission. Seat cap never says you lack permission.
