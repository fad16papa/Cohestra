# Traceability — Story 19.4 billing recipient

**HEAD:** `8a9bfb217a993831e63e977a7034d6a887e8a988`
**Spec:** `_bmad-output/specs/spec-story-19-4-billing-recipient/SPEC.md`

| ID | Requirement | Tests | Status |
| -- | ----------- | ----- | ------ |
| CAP-1 | Create/find Paddle customer as `AdminContactEmail` | `A_Checkout_creates_paddle_customer_as_admin_contact_email`; `A_Checkout_uses_admin_contact_email_when_signed_in_operator_differs` | Covered |
| CAP-2 | Drift repair on same customer | `B_GetDetails_syncs_drifted_customer_email_on_the_same_id`; `B_ConfirmPlanChange_syncs_drifted_customer_email_without_new_customer` | Covered |
| CAP-3 | Preserve subscription id | `B_Confirm…`; `F_G_Reconciliation_preserves_paddle_customer_and_subscription_ids` | Covered |
| CAP-4 | Paid non-owner denied; Basic invited admin cannot retarget email | `C_Paid_non_owner_is_denied_and_does_not_change_paddle_email`; `D_*` | Covered |
| CAP-5 | UpdateBillingContact does not use operator/request email | `E_UpdateBillingContact_does_not_use_operator_or_request_email` | Covered |
| CAP-6 | Settings copy + read-only owner email | `in-app-billing-panel.test.ts` owner-email case | Covered |
| F | Same PaddleCustomerId | `F_G_…`; B tests | Covered |
| G | Same PaddleSubscriptionId | `F_G_…`; B confirm | Covered |
| H | Tenant isolation | `H_Tenant_isolation_does_not_reuse_or_mutate_the_other_workspace_customer` | Covered |
| I | No provider secrets | `I_Customer_sync_failure_does_not_leak_provider_secrets`; C message assert | Covered |
| Access | TenantMember 403 | Existing `TenantAuthzIntegrationTests.TenantMember_JWT_admin_only_routes_return_403` | Covered (pre-existing) |

## Quality gate

**PASS** for this slice's automated acceptance. Live UAT recipient correction remains out of scope.
