# Autonomous merge policy — one-time owner authorization required

Status: **PROPOSAL**. Not authorized. Do not merge autonomously until the owner replies with an explicit approval of this document.

Production/live cutover is **not** covered by this policy even after approval.

## Proposed rule

For non-production Cohestra development/UAT pull requests, Grok 4.6 may merge autonomously when **all** of the following are true:

1. Scope belongs to an approved story in the tracker.
2. No unresolved product/security ambiguity.
3. The exact final HEAD was reviewed by Grok 4.6.
4. BLOCKER = 0 and MAJOR = 0 on that exact HEAD.
5. All required exact-head CI checks are green.
6. Security gates (UAT isolation, tenant isolation, live-Paddle refuse, secret-print refuse) are green.
7. No live/production mutation.
8. No irreversible customer-data action.
9. No new external financial charge.
10. Any migration is reviewed and tested where applicable.

Implementation changes after review invalidate the review. Re-review the new HEAD.

## Still owner-authorized after approval

- Production/live cutover
- Live Paddle / live money movement
- Production credential activation
- Live DNS / certificate ownership
- Destructive customer-data operations
- New external-service credentials
- Legal/business policy decisions
- Ambiguous material product decisions

## How to approve

Reply with: `APPROVE autonomous-merge-policy` (or `REJECT` with the clause to change).

Until then, PRs stay draft/unmerged unless the owner explicitly authorizes a specific PR.
