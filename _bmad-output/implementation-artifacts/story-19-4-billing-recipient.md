---
epic: 19
story: 4
status: in-progress
slice: billing-recipient
baseline_commit: 9b027a4fab15e7189a4cdd3c9be2a0093f89e9b8
---

# Story 19.4 slice — Paddle billing recipient follows tenant billing owner

Status: **in-progress**. Do **not** mark Story 19.4 done. Production remains **NO-GO**. Live Paddle sandbox mutation is **not** authorized.

Canonical spec: `_bmad-output/specs/spec-story-19-4-billing-recipient/SPEC.md`

Investigation: `_bmad-output/implementation-artifacts/investigations/story-19-4-billing-recipient-investigation.md`

## Acceptance tests (ATDD)

A. Owner checkout creates Paddle customer as `AdminContactEmail`.
B. Drifted Paddle customer email is synced on the same customer to `AdminContactEmail`.
C. Signed-in operator ≠ owner on paid Core/Pro → access denied; Paddle email unchanged.
D. Multiple tenant admins: only canonical billing owner controls paid billing; Basic invited admin cannot retarget Paddle email.
E. `UpdateBillingContactAsync` does not use signed-in operator email as provider recipient.
F. `PaddleCustomerId` preserved.
G. `PaddleSubscriptionId` preserved.
H. Tenant isolation.
I. No provider secrets in errors.

## Implementation notes

- Replace `EnsurePaddleCustomerForOperatorAsync` with `EnsurePaddleCustomerForTenantAsync`.
- `RequireTenantBillingEmail(tenant)` → `Tenant.AdminContactEmail`.
- Confirm plan-change is an authorized reconciliation point.
- UI: workspace billing owner copy; owner email read-only.

## Still required after this PR

UAT read-only tenant/Paddle evidence, authorized live email correction, Option A lifecycle UAT, owner acceptance. Story stays OPEN.
