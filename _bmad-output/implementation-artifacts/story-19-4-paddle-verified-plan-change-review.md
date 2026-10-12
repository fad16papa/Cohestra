# BMAD Code Review — Story 19.4 Option A (Paddle preview + same-subscription PATCH)

**HEAD:** implementation branch `cursor/story-19-4-paddle-preview-impl-59c2` (review re-run after same-id guard).
**Mandatory Code Review Loop:** in force. Story 19.4 is **not** closed.
**Model:** Grok 4.6 exclusive. Composer not used. Auto disabled.

## Layers

### Blind Hunter — duplicate-subscription paths

- Immediate Core/Pro catalog switches go through `PreviewPlanChangeAsync` / `ConfirmPlanChangeAsync`.
- `CreateCheckoutSessionAsync` for an existing immediate switch throws `PreviewRequiredMessage` and does not call Checkout or `CreateSubscriptionAsync`.
- Tests assert `CreateCheckoutTransactionCalls == 0` and `CreateSubscriptionCalls == 0` for Active monthly→annual, Core→Pro, and Trialing monthly→annual.
- Basic → Core/Pro still uses `CreateCheckoutTransactionAsync`.
- PATCH response with a different subscription id is rejected **before** `ApplyLiveSubscriptionAsync`.

**Duplicate subscription path: ABSENT.**

### Edge Case Hunter

- Preview provider failure: no PATCH, sanitized copy, confirm disabled.
- Stale fingerprint / live item change: 409, no PATCH.
- PastDue / scheduled paid downgrade / pending cancel immediate: rejected, no preview call.
- Deferred annual→monthly and Pro→Core: period-end `do_not_bill` preserved, including two-step cancel-clear.
- Trialing: `do_not_bill`; due now is provider 0 or omitted.
- Missing immediate transaction after PATCH: success copy, no fabricated amount.
- Double preview/confirm: frontend `previewLoading` / `confirming` gates.
- Webhook race: UI refreshes once; webhook remains source of truth.

### Acceptance Auditor

- Provider values shown before charge: PASS (nullable Paddle fields only).
- Same subscription: PASS.
- New subscription Checkout preserved: PASS.
- No guessed money: PASS (integer minor units; decimal strings dropped).
- Production NO-GO: PASS (no live credentials, no sandbox mutation in this PR).

## Findings

| ID | Sev | Finding | Resolution |
| -- | --- | --- | --- |
| BH-1 | MAJOR | Persist Paddle id from PATCH before verifying it matches the tenant | Fixed: compare `updated.Id` to `PaddleSubscriptionId` before `ApplyLiveSubscriptionAsync` |
| EC-1 | MINOR | Missing saved payment method is still provider-fail-closed on PATCH rather than a dedicated pre-check | Deferred; #440 behavior preserved; Paddle `subscription_payment_failed` stays mapped |
| NIT-1 | NIT | Preview 429/5xx currently surface as 400 with retry copy | Matches existing billing mutation mapping |

Unresolved BLOCKER/MAJOR after the same-id guard: **none**.

## Product / UAT

Story 19.4 remains OPEN. Live sandbox mutation is not authorized. Production NO-GO.
