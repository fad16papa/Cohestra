# Checkpoint preview — Story 43.2 Team and permissions

Human question: Can an operator immediately tell whether Team is unavailable because of their ROLE, PLAN, or SEAT CAP, and do they know the correct next action?

**Observed: YES.**

| State | Evidence | Next action |
| ----- | -------- | ----------- |
| Role denied | `settings-team-member-denied-1440.png` — ProductErrorState, no upgrade | Back to your account |
| Plan locked | `settings-team-basic-lock-1440.png` — UpgradePanel | Start Core trial |
| Seat cap | `settings-team-seat-cap-1440.png` — 3 of 3, revoke/remove/upgrade | Revoke or remove |
| Eligible | `settings-team-admin-1440.png` | Invite / remove |
| 390 | `settings-team-admin-390.png` | Invite form usable |
| Revoke | `settings-team-revoke-dialog-1440.png` | Cancel / Revoke invite |
| Remove | `settings-team-remove-dialog-1440.png` | Cancel / Remove member |

Playwright exercised invite, revoke, cancel-remove, Member deny, Basic lock, Core seat cap, and 390 overflow/touch. No real invitation email was sent (`@example.com`, Null/Fake transport).
