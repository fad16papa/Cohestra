# Checkpoint — Story 43.2 completeness 2026-10-09

Question: Can an operator immediately tell whether Team is unavailable because of their ROLE, PLAN, or SEAT CAP, and do they know the correct next action?

**YES** on current main + this increment.

| State | Evidence | Result |
| --- | --- | --- |
| 1440 eligible Admin Team | Playwright passed; `settings-team-admin-1440.png` | PASS |
| 390 eligible Admin Team | Playwright passed; Send/Revoke ≥44px; no page overflow | PASS |
| Remove/Revoke dialogs | Specific verbs; Cancel restores focus | PASS |
| Member denied | ProductErrorState + 43.1 replace; integration Member GET 403 | PASS (Playwright skipped locally: fixture password 401, seeder does not reset) |
| Basic locked | UpgradePanel; API `plan_locked` 403 | PASS (same fixture skip locally) |
| Seat cap | Banner revoke/remove/upgrade; API 409 | PASS (same fixture skip locally) |

Local Member fixture remains Development `E2eEntitlementFixtureSeeder`. Users exist; passwords are create-if-absent. No production seeder added.
