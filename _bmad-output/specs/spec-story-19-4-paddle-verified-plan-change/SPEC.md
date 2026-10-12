---
id: SPEC-story-19-4-paddle-verified-plan-change
companions:
  - ./plan-change-matrix.md
  - ./review-flow.md
  - ../../implementation-artifacts/investigations/story-19-4-paddle-hosted-plan-change-investigation.md
  - ../../party-mode/2026-10-12-story-19-4-paddle-plan-change-party.md
sources: []
---

> **Canonical contract.** Implementation is **blocked** until the owner accepts this design. Do not implement from this SPEC until authorized.

# Story 19.4 — Paddle-verified same-subscription plan change

## Why

A **pain to solve**: an operator on an existing paid subscription (Pro Monthly → Pro Yearly) confirms a correct Cohestra dialog, then the subscription is PATCH'd immediately and they return to Billing without seeing Paddle-calculated amounts. They expected a Paddle-backed review before the mutation. Ordinary Checkout would look like Paddle but would create a **second** subscription. The force is trust + same-subscription safety, not Checkout chrome.

## Capabilities

- **CAP-1**
  - **intent:** An operator changing an existing paid or trialing Core/Pro subscription can see Paddle-calculated billing impact (credit, amount due now, currency, next renewal, new recurring amount) before Cohestra commits the change.
  - **success:** Review UI displays only fields present on `PATCH /subscriptions/{id}/preview` (`update_summary`, `immediate_transaction`, `next_transaction`, `recurring_transaction_details`, `next_billed_at`, `currency_code`). Missing fields are omitted or generic; no Cohestra-computed money.

- **CAP-2**
  - **intent:** Confirming the review applies that change to the same Paddle subscription the tenant already has.
  - **success:** After apply, `Tenant.PaddleSubscriptionId` is unchanged; Paddle has no extra active subscription for that tenant's plan; webhook `subscription.updated` remains source of truth. Confirm uses the same `price_id` and `proration_billing_mode` as the preview.

- **CAP-3**
  - **intent:** After a successful apply, the operator sees an explicit completion state including Paddle invoice/transaction reference, amount charged, currency, and next renewal when those values exist on trusted provider data.
  - **success:** Completion copy is shown. Transaction/amount lines appear only from PATCH/webhook/list-transactions provider fields. Invoice history continues to list Paddle transactions.

- **CAP-4**
  - **intent:** Workspaces without a paid subscription still start Core/Pro through ordinary Paddle Checkout.
  - **success:** Basic → Core/Pro, new paid subscription, and payment-method-required first purchase still open Paddle Checkout. Existing `completedInApp` Checkout bypass is not used for those cases.

## Constraints

- Never create a second Paddle subscription to make a plan or interval change "look hosted."
- Never calculate proration, credit, or due-now in Cohestra when Paddle preview can supply it.
- Do not display guessed values. If preview cannot return a field, omit it or keep non-numeric generic copy.
- Frequency changes keep `#440` Paddle rules: `prorated_immediately` / `full_immediately` / `do_not_bill` only; trials `do_not_bill`.
- Past due: reject plan change; payment-method update stays on the existing subscription transaction/portal. Paddle will not preview `past_due` except clearing `scheduled_change`.
- Deferred downgrades (paid tier down, or annual → monthly same tier) stay period-end; do not immediate PATCH.
- Customer Portal remains for manage payment / invoices / cancel — not catalog plan switches.
- Production billing remains NO-GO. No production credentials. No live sandbox mutation until a later owner authorization.
- Webhook reconciliation remains source of truth over optimistic UI.

## Non-goals

- Forcing ordinary Paddle Checkout overlay for existing-subscription catalog changes.
- Using Customer Portal as the plan-switch UI for Core/Pro monthly/annual matrix.
- Creating a second subscription, then cancelling the first.
- Closing Story 19.4, deploying production, or mutating sandbox during this design.
- Changing `#440` deferred-path / two-step cancel policy except to insert preview where Paddle allows.

## Success signal

Owner repeats Active Pro Monthly → Pro Yearly: they see Paddle-derived credit and due now **before** confirm; after confirm they remain on one subscription; yearly billing completion cites a Paddle transaction when Paddle returned one. Basic → Pro still opens Checkout.

## Assumptions

- Saved payment method on an automatic subscription is how Paddle collects `prorated_immediately` after PATCH (no overlay required for that collection).
- Preview is read-only and does not charge.
- UAT deploy of `7ef2b539` is still outstanding; this design does not depend on that SHA being live.

## Open Questions

- Owner: accept Option A (preview + PATCH), or keep current direct PATCH with generic copy only?
- If immediate PATCH succeeds but `immediate_transaction` is absent on the response, wait for webhook before showing amount, or show "Yearly billing is active" without money?
- Should deferred annual→monthly also call preview (likely null immediate totals) or keep period-end copy only?
