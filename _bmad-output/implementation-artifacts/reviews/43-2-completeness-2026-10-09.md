# Code review — Story 43.2 completeness increment

HEAD reviewed: working tree vs `origin/main` `556f7192890dcc7589252f1e1bdf790710402a6f`  
Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor  
Model: Cursor Grok 4.6

## Verdict

No unresolved BLOCKER or MAJOR. Completeness increment may enter review / draft PR.

## Blind Hunter

- [x] [Review][Dismiss] Authorization hole — no API/controller change; TenantAdminOnly untouched
- [x] [Review][Dismiss] Production Member seeder — none added
- [x] [Review][Dismiss] New roles — `formatInviteRole` maps existing TenantAdmin/TenantMember only
- [x] [Review][Dismiss] Billing 43.3 reopen — Billing presentation untouched
- [x] [Review][Dismiss] 43.1 routing reopen — `/settings/team` contract unchanged

## Edge Case Hunter

- [x] [Review][Dismiss] Last-admin HTTP unreachable — self-remove 400 is the reachable path; service Conflict covers outsider actor
- [x] [Review][Dismiss] `null!` unused TeamInviteService deps — RemoveMemberAsync uses DbContext only
- [x] [Review][Dismiss] Cancel during submit — existing `actionSubmitting` still blocks close

## Acceptance Auditor

| Requirement | Result |
| --- | --- |
| ROLE ≠ PLAN ≠ SEAT | Already on main; unchanged |
| Cancel restores focus | PASS — `finalFocus={restoreFocusRef}` |
| Last-admin proof | PASS — service Conflict + self Validation |
| 390 Remove/Revoke ≥44px | PASS — Playwright extended |
| No production seeder | PASS |
| 43.3–43.5 not started | PASS — no Billing/platform-admin/closure edits |

No unresolved BLOCKER or MAJOR.
