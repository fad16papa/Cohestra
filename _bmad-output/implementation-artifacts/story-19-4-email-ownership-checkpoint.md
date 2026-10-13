# Checkpoint preview — Story 19.4 email ownership

**PR:** https://github.com/fad16papa/Cohestra/pull/445 (DRAFT)
**HEAD:** `30942b26c97faf8e951367f84228872a34b63ec1`
**Ask:** owner review of email ownership. Do not merge from this agent. Do not close Story 19.4.

## What changed

Paddle is the only customer email for payment, invoice, renewal, and billing-date provider facts. Cohestra keeps workspace-impact mail (usage/read-only, OnHold, dormancy, trial reminder) and strips charge/invoice/price sentences from scheduled downgrade copy.

## Why it matters

UAT showed Paddle already emails the billing owner. A second Cohestra message with the same provider facts creates duplicate, differently worded billing communication.

## What to look at

1. No receipt producer on immediate confirm or `transaction.completed` (tests A/B).
2. `scheduled_downgrade` still says “keep current plan access until DATE” and usage/read-only risk; no “No charge today.”
3. PastDue is “workspace access at risk,” not “payment did not succeed.”
4. Recipient remains `Tenant.AdminContactEmail`. PR #444 untouched.

## What this PR does not do

- Does not delete OnHold, dormancy, or usage-warning mail.
- Does not revert the Paddle customer email fix.
- Does not change Paddle sandbox forwarding.
- Does not close Story 19.4 or authorize production.

## Live evidence still needed (owner workstation)

Read-only UAT `outbox_messages` row for the Cohestra mail sent to the billing owner: `noticeType`, subject, timestamp, tenant id, delivery disposition. This VM could not read the droplet.

## Decision

Implementation is ready for exact-head CI + owner review. STOP before merge. Production remains NO-GO.
