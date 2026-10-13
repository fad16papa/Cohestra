---
epic: 19
story: 4
status: in-progress
slice: email-ownership
baseline_commit: 6c12d068c6912ed62b2fbc652bdeab24058bb1db
---

# Story 19.4 slice — Paddle-owned billing email vs Cohestra operational email

Status: **in-progress**. Do **not** mark Story 19.4 done. Production remains **NO-GO**. Live Paddle sandbox mutation is **not** authorized.

Canonical spec: `_bmad-output/specs/spec-story-19-4-email-ownership/SPEC.md`

Investigation: `_bmad-output/implementation-artifacts/investigations/story-19-4-email-ownership-investigation.md`

## Classification

| Notice | Owner | Action |
| ------ | ----- | ------ |
| Payment receipt / invoice / renewal / billing-date | Paddle | Keep Cohestra producer absent |
| `scheduled_downgrade` | Hybrid | Keep operational copy; strip charge/invoice/price |
| `scheduled_downgrade_reminder` | Cohestra | Keep (usage-gated) |
| `scheduled_downgrade_applied` | Hybrid | Keep plan-access copy; strip next-invoice/price |
| `trial_reminder` | Cohestra | Keep (Paddle coverage unproven) |
| `past_due` | Hybrid | Keep access-impact copy |
| `on_hold` | Cohestra | Keep |
| `dormancy` | Cohestra | Keep |

## Acceptance tests (ATDD)

A. Immediate paid plan change does not enqueue Cohestra billing confirmation.
B. `transaction.completed` does not enqueue a payment receipt.
C. Scheduled downgrade with usage warning remains and has no Paddle financial copy.
D. PastDue → OnHold access-impact notices remain.
E. Dormancy remains.
F. Recipient is `Tenant.AdminContactEmail`.
G. Retained operational emails do not invent/repeat invoice, tax, charge, or price.

## Still required after this PR

UAT outbox row confirmation, Paddle lifecycle UAT, owner acceptance. Story stays OPEN.
