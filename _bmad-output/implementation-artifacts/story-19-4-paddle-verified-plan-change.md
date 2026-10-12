---
epic: 19
story: 4
status: in-progress
baseline_commit: 603c19a3b0620e673bd078731ed9def47221ed7b
---

# Story 19.4 — Option A implementation (Paddle-verified same-subscription plan change)

Status: **in-progress**. Do **not** mark Story 19.4 done. Production remains **NO-GO**. Live Paddle sandbox mutation is **not** authorized from this implementation.

Canonical design: `_bmad-output/specs/spec-story-19-4-paddle-verified-plan-change/SPEC.md` (merged via PR #442 at `603c19a3`).

## Owner decisions (2026-10-12)

1. Immediate paid changes that can charge or credit require Paddle preview before confirm. Preview failure blocks confirm; no guessed money; no mutation.
2. Display financial values only from trusted Paddle data (integer minor units + currency). No Cohestra proration math.
3. PATCH success without an immediate transaction shows plan-specific success copy with no amount, then refreshes billing.
4. Deferred annual→monthly / paid downgrade keep `#440` period-end flow. Preview is optional.
5. Confirm re-fetches live Paddle state. Stale preview → 409; frontend discards preview and requires a new one.

## Implementation

- `POST /api/v1/admin/billing/subscription/change-preview` — plan + interval only.
- `POST /api/v1/admin/billing/subscription/change` — same, plus `previewState`.
- Canonical `PaddleSubscriptionChangePlanner` shared by preview (`PATCH …/preview`) and apply (`PATCH …/{id}`).
- Existing Checkout remains for Basic → Core/Pro.
- Immediate existing-subscription Checkout POST no longer mutates; it requires preview + confirm.

## Still required after this PR

UAT deploy, read-only SHA verification, authorized Paddle sandbox lifecycle, owner/product acceptance. Story stays OPEN.
