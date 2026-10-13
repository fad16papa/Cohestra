---
id: SPEC-story-19-4-email-ownership
companions:
  - ../../implementation-artifacts/investigations/story-19-4-email-ownership-investigation.md
sources: []
---

> **Canonical contract.** Paddle owns provider billing facts in customer email. Cohestra owns Cohestra workspace consequences. Story 19.4 stays OPEN. Production NO-GO.

# Story 19.4 — Paddle-owned billing email vs Cohestra operational email

## Why

A **pain to solve**: after Paddle correctly emailed the workspace billing owner, a second Cohestra message repeated payment/subscription confirmation with different wording. Paddle is authoritative for money and provider lifecycle. Cohestra remains authoritative for workspace access, usage limits, and dormancy.

## Capabilities

- **CAP-1**
  - **intent:** Immediate paid plan change and Paddle `transaction.completed` do not create a Cohestra payment receipt or invoice email.
  - **success:** No `billing.notification` with payment/invoice/charge facts is enqueued.

- **CAP-2**
  - **intent:** Scheduled downgrade still emails Cohestra workspace impact and usage/read-only risk when present.
  - **success:** Notice `scheduled_downgrade` (and reminder when usage exceeds limits) is enqueued. Copy has no charge amount, tax, credit, invoice reference, or “billed at the new price.”

- **CAP-3**
  - **intent:** PastDue / OnHold / Dormancy remain Cohestra operational notices focused on workspace access, not Paddle receipts.
  - **success:** Those notice types still enqueue to `Tenant.AdminContactEmail`. PastDue does not say “payment did not succeed” as a receipt.

- **CAP-4**
  - **intent:** Retained billing notifications still go to the workspace billing owner.
  - **success:** `ToEmail` is `Tenant.AdminContactEmail`. PR #444 Paddle customer sync is unchanged.

- **CAP-5**
  - **intent:** Scheduled-downgrade applied mail states Cohestra plan access only.
  - **success:** Notice `scheduled_downgrade_applied` remains and does not mention invoice, next charge, tax, or price.

## Constraints

- Do not revert #444. Operator email stays authorization-only.
- Environment-independent. No sandbox-only suppression. No mailbox-domain branching.
- Do not invent or repeat Paddle money fields.
- Do not assume Paddle trial-ending mail; keep generic Cohestra trial reminder.
- No live Paddle mutation. Story 19.4 stays OPEN. Production NO-GO.

## Non-goals

- Changing Paddle sandbox forwarding.
- Owner-transfer UX.
- Deleting OnHold, dormancy, or usage-warning mail.
- Closing Story 19.4 or deploying production.

## Success signal

A paid plan change that Paddle invoices does not produce a second Cohestra receipt. A scheduled downgrade with over-limit usage still gets a Cohestra warning without invoice language.

## Assumptions

- UAT outbox row was not readable; immediate confirm has no receipt producer; overlapping copy is scheduled-downgrade financial sentences.
- Paddle trial emails are not proven for this configuration.
