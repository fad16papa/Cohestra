# BMAD Code Review — Story 19.4 billing recipient

**HEAD:** `8a9bfb217a993831e63e977a7034d6a887e8a988` on `cursor/story-19-4-billing-recipient-59c2`
**PR:** #444 (DRAFT)
**Mandatory Code Review Loop:** in force. Story 19.4 is **not** closed.
**Model:** Grok 4.6 exclusive. Composer not used. Auto disabled.

## Layers

### Blind Hunter — operator email as provider recipient

- Checkout, portal, GetDetails, UpdateBillingContact, and ConfirmPlanChange call `EnsurePaddleCustomerForTenantAsync`.
- That helper requires `Tenant.AdminContactEmail` and Find/Create/Update using that address only.
- `UpdateBillingContactAsync` discards request email and writes `RequireTenantBillingEmail(tenant)` to Paddle.
- Paid Core/Pro still requires `operatorEmail == AdminContactEmail` before any ensure/update.
- TenantMember remains `TenantAdminOnly` 403 (existing integration).

**Operator-as-recipient path: ABSENT after this HEAD.**

### Edge Case Hunter

- Drifted customer: in-place `UpdateCustomerAsync` on existing `PaddleCustomerId`; `CreateCustomerCalls == 0`.
- Confirm plan-change: same customer id, same subscription id, then PATCH.
- Non-owner on Pro: `UnauthorizedAccessException`; no UpdateCustomer/CreateCustomer.
- Basic invited admin can still start Checkout (existing access) but Paddle email stays owner.
- Two tenants: tenant B customer/subscription ids unchanged.
- Provider UpdateCustomer failure: generic sync message; no `pdl_` / secret text.
- Empty `AdminContactEmail`: checkout/portal/confirm fail closed with owner-email-not-configured.
- Paddle 409 if owner email already belongs to a *different* customer: fail closed (MINOR, see below).

### Acceptance Auditor

- CAP-1 create as owner email: PASS (`PaddleBillingRecipientTests` A)
- CAP-2 same-customer drift repair: PASS (B, F)
- CAP-3 same subscription: PASS (B confirm, G)
- CAP-4 paid non-owner denied; no Paddle mutation: PASS (C, D)
- CAP-5 UpdateBillingContact ignores operator/request email: PASS (E)
- CAP-6 UI owner copy + read-only email: PASS (panel test)
- Isolation / secrets: PASS (H, I)
- Access not weakened: PASS (`TenantBillingAccess` still owner-only on paid)

## Findings

| ID | Sev | Finding | Resolution |
| -- | --- | --- | --- |
| EC-1 | MINOR | If Paddle already has a different customer for `AdminContactEmail`, updating the drifted customer email can 409 and block confirm/details | Fail-closed is correct; live repair if that collision exists is owner-authorized UAT, not this PR |
| NIT-1 | NIT | `_ = email` discard in `UpdateBillingContactAsync` | Intentional; request email must stay on the contract but unused |

Unresolved BLOCKER/MAJOR: **none**.

## Product / UAT

Story 19.4 remains OPEN. Live sandbox mutation was not performed. Production NO-GO.
Live CreativoRare `AdminContactEmail` was not readable from this VM. STOP-if-data-is-observed-operator was **not** triggered.
