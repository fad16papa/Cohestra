# Checkpoint preview — Story 19.4 billing recipient

**PR:** https://github.com/fad16papa/Cohestra/pull/444 (DRAFT)
**HEAD:** `8a9bfb217a993831e63e977a7034d6a887e8a988`
**Ask:** owner merge authorization only after exact-head CI is green. Do not merge from this agent.

## What changed

Paddle customer email is derived from `Tenant.AdminContactEmail`. The signed-in operator is used only to prove billing access.

## Why it matters

UAT Paddle mail went to the observed signed-in operator, not the workspace billing owner. Checkout, Settings → Billing load, and contact save were syncing the provider customer to the JWT email. Option A plan-change did not repair that drift.

## What to look at

1. `EnsurePaddleCustomerForTenantAsync` — email source is `RequireTenantBillingEmail`.
2. `UpdateBillingContactAsync` — request/operator email is not the Paddle recipient.
3. Confirm plan-change now reconciles customer email **before** PATCH, same ids.
4. Settings copy: "Billing notifications are sent to the workspace billing owner."

## What this PR does not do

- Does not read or write the live UAT Paddle customer.
- Does not close Story 19.4.
- Does not change paid-plan owner-only access.
- Does not add owner-transfer UX.

## Live evidence still needed (owner workstation)

Read-only CreativoRare `AdminContactEmail`, Paddle customer email, `PaddleCustomerId`, `PaddleSubscriptionId`. If AdminContactEmail is the observed operator, stop and classify data vs ownership. Do not PATCH Paddle until separately authorized.

## Decision

Implementation is ready for exact-head CI + owner merge authorization. Production remains NO-GO.
