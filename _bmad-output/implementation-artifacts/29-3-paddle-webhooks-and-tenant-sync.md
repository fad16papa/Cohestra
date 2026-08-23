---
status: done
story_id: 29.3
story_key: 29-3-paddle-webhooks-and-tenant-sync
---

# Story 29.3: Paddle webhooks and tenant sync

Status: done

## Story

As a **platform**,
I want **signed Paddle notifications to update tenant billing state**,
so that **plan, trial, and delinquency stay correct without a Stripe payload**.

## Acceptance Criteria

- `POST /api/v1/system/paddle/webhook` verifies `Paddle-Signature` (HMAC SHA256, `ts` + body).
- Ledger `paddle_webhook_events` is idempotent on `event_id`.
- Event map: `transaction.completed` / `subscription.created|updated` → IDs + plan + Trialing/Active; `subscription.canceled` → Basic+Free (or period-end path); renewal `transaction.completed` → clear PastDue/OnHold; `transaction.payment_failed` → PastDue + `DelinquencyStartedAt`.
- `SyncFromProviderAsync` pulls the latest Paddle subscription (optional `txn_` id).
- Over-limit remains `ReadOnly_OverLimit`, not Suspended (jobs unchanged).
