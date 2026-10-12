---
id: SPEC-story-19-4-billing-recipient
companions:
  - ../../implementation-artifacts/investigations/story-19-4-billing-recipient-investigation.md
sources: []
---

> **Canonical contract.** Paddle customer email follows the workspace billing owner. Authorization identity is separate. Story 19.4 stays OPEN. Production remains NO-GO. No live sandbox mutation in this change.

# Story 19.4 — Paddle billing recipient follows tenant billing owner

## Why

A **pain to solve**: after changing an existing paid subscription in UAT, Paddle sent a test billing email to the signed-in operator instead of the workspace billing owner. Authorization identity and billing recipient identity were collapsed. Paddle transactional mail follows the provider customer record, so Cohestra must keep that record aligned to `Tenant.AdminContactEmail`.

## Capabilities

- **CAP-1**
  - **intent:** When a workspace needs a Paddle customer, Cohestra creates or finds that customer using `Tenant.AdminContactEmail`.
  - **success:** Checkout with signed-in operator `owner@example.com` and `AdminContactEmail = owner@example.com` creates the Paddle customer as `owner@example.com`. Checkout with a different signed-in admin still uses `AdminContactEmail`.

- **CAP-2**
  - **intent:** If an existing Paddle customer email has drifted from the billing owner, the next authorized billing operation updates the same customer to `Tenant.AdminContactEmail`.
  - **success:** Same `PaddleCustomerId`; email becomes the owner address; no second customer.

- **CAP-3**
  - **intent:** Email reconciliation never replaces the tenant's Paddle subscription.
  - **success:** `PaddleSubscriptionId` is unchanged before and after reconciliation and after Option A confirm.

- **CAP-4**
  - **intent:** Only the billing owner manages paid Core/Pro billing; a non-owner signed-in admin cannot change the Paddle recipient.
  - **success:** Operator ≠ `AdminContactEmail` on paid Core/Pro → access denied; Paddle customer email unchanged. TenantMember → 403. Basic invited TenantAdmin may manage billing actions already allowed, but Paddle email still stays the owner address.

- **CAP-5**
  - **intent:** Billing contact update may change name/phone on the existing Paddle customer; it does not transfer workspace billing ownership and does not use signed-in operator email as the provider recipient.
  - **success:** `UpdateBillingContactAsync` writes `AdminContactEmail` to Paddle; ignores request email; does not mutate `Tenant.AdminContactEmail`.

- **CAP-6**
  - **intent:** Settings → Billing presents the workspace billing owner as the notification recipient, read-only.
  - **success:** Copy no longer says billing uses the signed-in account email. Owner email is shown read-only. No editable field implying an invited TenantAdmin can change ownership.

## Constraints

- Operator email is an authorization input only (`ValidateBillingAccessAsync`).
- Do not weaken `TenantBillingAccess`: paid Core/Pro requires `operatorEmail == Tenant.AdminContactEmail`.
- Never create a second Paddle customer or subscription because another admin is signed in.
- Do not spoof Paddle's email delivery; only align the provider customer email.
- No live Paddle sandbox mutation, no production credentials, no production customer updates.
- If live UAT `AdminContactEmail` later equals the observed operator, stop and classify UAT data vs ownership semantics; do not silently remap to a third address.
- Story 19.4 remains OPEN until Option A lifecycle, billing recipient, same-subscription guarantee, and Paddle alignment are accepted in UAT.

## Non-goals

- Live correction of the UAT Paddle customer email during this implementation.
- Owner-transfer / billing-owner change UX, validation, or audit.
- Closing Story 19.4, UAT deploy, or production go-live.
- Changing Paddle webhook source-of-truth or Option A preview/confirm mechanics except to reconcile customer email on authorized confirm.

## Success signal

For a tenant whose `AdminContactEmail` is the workspace billing owner, Cohestra creates and keeps the Paddle customer on that address. An invited admin's signed-in email never becomes the provider recipient. Drifted customers are repaired in place. Settings copy names the workspace billing owner.

## Assumptions

- Live UAT CreativoRare `AdminContactEmail` was not readable from this VM. Implementation binds to the field the owner named as source of truth.
- Paddle sends transactional billing mail to the customer email on the provider record.
- Tenant shell already exposes `billingOwnerEmail` for the owner-managed gate.

## Open Questions

- Live UAT `AdminContactEmail` value for CreativoRare (expected owner vs observed operator) remains unverified until owner workstation read-only SQL.
