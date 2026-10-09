# Checkpoint preview — Story 44.4 Operations Outbox

Date: 2026-10-09
Reviewer: Sally / UX checkpoint (Grok 4.6)
Evidence: `_bmad-output/planning-artifacts/evidence/px2-44-4/viewports/`

## Visual review

| State | Viewport | File |
| --- | --- | --- |
| Empty Failed | 1440×900 | `ops-outbox-empty-1440.png` |
| Empty Failed | 390×844 | `ops-outbox-empty-390.png` |
| Failed rows | 1440×900 | `ops-outbox-failed-1440.png` |
| Failed rows | 390×844 | `ops-outbox-failed-390.png` |

Live Playwright `platform-ops-44-4.spec.ts` passed locally with API :8080 and web :3000 (empty, failed, 390, 1440, error/unavailable, no mutation, axe serious/critical none). 44.3 spec still passes.

## Questions

1. Can a Platform operator identify a stuck notification job without being able to see customer message content or mutate queue execution?
   **YES.** Failed row shows status, type, tenant id, attempts, timestamps, and `[redacted] smtp timeout`. No payload, no email body, no Requeue/Replay/Retry.

2. Does zero Failed incorrectly imply email delivery health?
   **NO.** Empty copy is “No failed outbox jobs are recorded.” plus “This does not mean email is healthy…”. Health still lists outbox as not in this probe.

## Notes

- 390 table uses scoped horizontal scroll; page-level overflow is false.
- Billing/Paddle remains missing instrumentation (44.5 not started).
- Theme toggle overlap on 390 health block is pre-existing 44.3 chrome, not introduced by the Outbox section.
