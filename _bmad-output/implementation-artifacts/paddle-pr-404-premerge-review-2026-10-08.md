# PR #404 independent pre-merge review

**Reviewed against:** `origin/main` `c82f44ee`  
**Implementation HEAD at review close:** `35a663165f3b3bd58ef31bdbeaa473bdf5f09572`  
**Model:** Grok 4.6 only (no Composer, no Auto, no cross-model subagents)  
**Loop:** Mandatory Code Review Loop in force. Story 19.4 remains ready-for-dev.

## Findings (kept)

| ID | Sev | Bucket | Result |
|----|-----|--------|--------|
| 1 | BLOCKER | patch | UAT (`PublicWeb:BaseUrl` / `uat.cohestra.app`) could boot live Paddle when ASP.NET is Production and `AllowLive=true`. **Fixed:** UAT host lock ignores AllowLive. |
| 2 | MAJOR | patch | Stale/out-of-order `adjustment.*` (older approved after newer rejected) could apply PastDue. **Fixed:** `paddle_adjustment_cursors` monotonic by `occurred_at`. |
| 3 | MAJOR | patch | Concurrent unique violations treated every unique as event duplicate. **Fixed:** webhook EventId → 200 duplicate; adjustment cursor PK → 503 retry. |
| 4 | — | decision_needed | Merchant refund entitlement revoke / partials / reverse — still escalated, not implemented. |
| 5 | MINOR | defer | Unresolvable tenant → 503 until Paddle exhausts retries. |
| 6 | MINOR | defer | Webhook secret has no sandbox/live shape. |
| 7 | MINOR | defer | Site page seed after ledger uses ambient tenant filter on webhook path. |
| 8 | NIT | dismiss | 503 JSON still `{ received: true }` — Paddle uses status code. |

Unresolved BLOCKER/MAJOR on this patch set: **none**.

## Acceptance vs request

- Webhook 200/503/400 and ledger-after-success: **pass**
- Same SaveChanges for tenant + event (+ cursor); concurrent EventId → duplicate 200: **pass**
- Refund ingest no revoke; chargeback approved → PastDue; complimentary skip: **pass**
- Stale pending/approved cannot regress plan or recover-then-PastDue via older adjustment: **pass**
- UAT + Production + AllowLive + live keys: **rejected** (unit + preflight)
- UAT + Production + AllowLive + sandbox keys: **allowed**
- Live apex `https://cohestra.app` + AllowLive + live keys: **allowed** (cutover path only)
- No live billing activation; no production host changes; PR not merged

## Merge gate (later 2026-10-08)

Re-fetched `origin/main` (`c82f44ee`) and PR #404. **HEAD remains** `47ebb1b532d464a9fdc326437d53447f6bc2c5fd`. CI run `37786641310` all SUCCESS (including Docker stack smoke + GitGuardian). `mergeable=MERGEABLE`, `mergeStateStatus=CLEAN`. No new BLOCKER/MAJOR. Artifact: `paddle-pr-404-merge-gate-2026-10-08.md`.

**MERGE READY for owner authorization. Not merged.**

## Tests executed after the patch

See the agent delivery report for commands and counts.
