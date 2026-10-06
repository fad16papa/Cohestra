# Code review — Story 43.2 Team and permissions

HEAD reviewed: current branch `cursor/story-43-2-team-and-permissions-8d20`  
Date: 2026-10-06  
Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor

## Verdict

**PASS** for merge from this HEAD, pending exact-HEAD CI green. No unresolved BLOCKER/MAJOR.

## Blind Hunter

- Server `TenantAdminOnly` unchanged. Member GET/POST team remains 403.
- Member UI is ProductErrorState + 43.1 replace. No UpgradePanel / Start trial.
- Basic still `invitesAllowed === false` → UpgradePanel.
- Seat cap is capacity copy (revoke/remove/upgrade), not permission.
- No production Member seeder. Invites use `@example.com`.
- No new roles. Billing presentation untouched.

## Edge Case Hunter

- Dialog actions are Cancel / Remove member / Revoke invite (not Yes/No).
- Self-remove hidden; API 400 covered by integration test.
- Last-admin `member_remove_conflict` mapped.
- Accepted-invite revoke now 409 instead of swallowing Conflict as 204.
- Tenant A cannot delete Tenant B member (404/403).
- 390 Send invite ≥44px; stacked rows; no page overflow.
- Core seat-cap e2e fills pending invites then cleans up.

## Acceptance Auditor vs SPEC CAP-1–CAP-9

| CAP | Evidence |
| --- | -------- |
| CAP-1 Member deny | Playwright Member test + ProductErrorState |
| CAP-2 Basic lock | Playwright Basic + API plan_locked |
| CAP-3 eligible Admin | Playwright Admin Team |
| CAP-4 seat cap | Core e2e + API 409 |
| CAP-5 dialogs | Playwright revoke/remove |
| CAP-6 server auth | TeamInviteIntegrationTests + TenantAuthz |
| CAP-7 390 | Playwright 390 |
| CAP-8 43.1 | Member/Basic 43.1 tests still pass |
| CAP-9 no prod seeder | Only local fixtures |

## Findings

### MINOR

1. ProductErrorState uses destructive styling for role denial (same as Campaigns). Distinct from UpgradePanel; acceptable reuse.
2. 390 invite card can sit under the mobile tab bar until scrolled (pre-existing shell padding; same class as 43.1 password residual).

### NIT

1. Remove-dialog screenshot can catch overlay fade. Interaction test still passed.

## Tests on this HEAD

- Infrastructure unit: 939 passed
- Vitest `team-api.test.ts`: 4 passed
- Integration TeamInvite + TenantAuthz: 9 passed
- Playwright 43.2: 3 passed (after seat-cap fill-before-enable fix)
- Playwright 43.1 Member + Basic Team: passed

## Repeat rule

Any behavior-changing fix requires review of the new HEAD.
