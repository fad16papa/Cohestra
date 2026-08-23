---
status: done
story_id: 29.5
story_key: 29-5-portal-period-end-cancel-resume-schedule
---

# Story 29.5: Portal, cancel, resume, scheduled change

Status: done

## Story

As a **Tenant Admin**,
I want **Manage billing, cancel-at-period-end, resume, and undo scheduled change**,
so that **FR-24 period-end behavior is unchanged**.

## Acceptance Criteria

- Portal returns a Paddle customer portal URL; complimentary cannot open it.
- Cancel at period end sets Paddle `scheduled_change=cancel` and tenant scheduled Basic.
- Resume clears the scheduled cancel.
- Paid downgrade / interval change uses `effective_from=next_billing_period` and existing scheduled fields + emails.
- Cancel scheduled change restores the current price immediately without proration.
- Immediate paid upgrades prorate on the next invoice (same user-visible rule).
