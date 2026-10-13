# BMAD Code Review — Story 19.4 email ownership

**HEAD:** `30942b26c97faf8e951367f84228872a34b63ec1` on `cursor/story-19-4-email-ownership-59c2`
**PR:** #445 (DRAFT)
**Mandatory Code Review Loop:** in force. Story 19.4 is **not** closed.
**Model:** Grok 4.6 exclusive. Composer not used. Auto disabled.

## Layers

### Blind Hunter — duplicate Paddle billing mail

- Closed notice set: `trial_reminder`, `past_due`, `on_hold`, `dormancy`, `scheduled_downgrade`, `scheduled_downgrade_reminder`, `scheduled_downgrade_applied`. `follow_up_digest` is not a billing lifecycle mail.
- `ConfirmPlanChangeAsync` immediate path does not call the composer. `PaddleWebhookProcessor` has no outbox enqueue.
- No payment-receipt / invoice producer exists. Tests A/B lock that absence.
- Scheduled confirm dropped “No charge today / billed at the new price.” Applied dropped “next invoice will reflect the price.”
- PastDue no longer says “payment did not succeed.”
- `PaddleBillingService` customer/recipient helpers are unchanged. PR #444 preserved.

**Paddle-owned receipt/invoice producer: ABSENT after this HEAD.**

### Edge Case Hunter

- Empty `AdminContactEmail`: composer returns false; jobs do not stamp Last* (regression vs first draft, now fixed).
- Reminder still usage-gated (`warnings.Count == 0` → no send).
- Scheduled confirm still sends without usage warnings because it carries “keep current plan access until DATE.”
- Trial reminder retained; Paddle trial coverage is not assumed.
- Recipient remains `tenant.AdminContactEmail.Trim()`.
- No sandbox-only branch. No mailbox-domain suppression.

### Acceptance Auditor

- CAP-1 immediate confirm + `transaction.completed` enqueue no receipt: PASS (A, B)
- CAP-2 scheduled downgrade usage warning, no financial copy: PASS (C, reminder, deferred/confirm operational)
- CAP-3 PastDue / OnHold / Dormancy remain, access-focused: PASS (D, E)
- CAP-4 recipient `AdminContactEmail`: PASS (F)
- CAP-5 applied copy has no invoice/price: PASS (G)
- #444 recipient contract: PASS (`PaddleBillingRecipientTests` still green in the 1231-unit run)

## Findings

| ID | Sev | Finding | Resolution |
| -- | --- | --- | --- |
| CR-1 | MAJOR | First draft stamped PastDue/OnHold Last* when enqueue no-op’d on empty owner email | Fixed on this HEAD: composer returns bool; jobs stamp only after enqueue |
| NIT-1 | NIT | Private `Enqueue(..., now)` unused | Left; callers already pass `now` into dedupe keys |
| NIT-2 | NIT | Live UAT outbox row for `fad16papa@gmail.com` was not readable | Classification uses producer inventory, not a droplet row |

Unresolved BLOCKER/MAJOR: **none**.

## Product / UAT

Story 19.4 remains OPEN. Live Paddle mutation was not performed. Production NO-GO.
STOP before merge.
