# Investigation: Story 19.4 billing recipient — Paddle customer email follows signed-in operator

## Hand-off Brief

1. **What happened.** After a paid-subscription change in UAT, Paddle sent a test billing email to the observed signed-in operator address (`decenafrancis@…`) instead of the expected workspace billing owner (`fad16papa@…`).
2. **Where the case stands.** Root cause is **Confirmed in current code**: `EnsurePaddleCustomerForOperatorAsync` uses the signed-in operator email as the Paddle customer email. Live UAT `tenants` row was **not readable** from this VM (no SSH; local snapshot has no CreativoRare tenant). Do not call live UAT billing APIs — `GetDetailsAsync` currently mutates Paddle customer email.
3. **What's needed next.** Bind Paddle customer email to `Tenant.AdminContactEmail`, keep operator email as authorization only, add tests A–I, keep Story 19.4 OPEN, no live sandbox mutation.

## Case Info

| Field            | Value |
| ---------------- | ----- |
| Ticket           | Story 19.4 billing recipient defect |
| Date opened      | 2026-10-12 |
| Status           | Concluded (code root cause Confirmed; live UAT row Missing) |
| System           | Cohestra main `9b027a4fab15e7189a4cdd3c9be2a0093f89e9b8`; Paddle sandbox UAT; local Postgres snapshot |
| Evidence sources | Current HEAD source, owner observation, local DB (read-only), TenantBillingAccess tests |

## Problem Statement

Owner hypothesis: Paddle transactional billing email targeted the signed-in operator instead of the tenant billing owner. Product contract: authorization identity ≠ billing recipient identity. Canonical recipient is `Tenant.AdminContactEmail`.

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------ | ----- |
| Current HEAD billing service | Available | `PaddleBillingService.cs` ensure/update paths |
| Tenant billing access | Available | Paid Core/Pro requires operator == `AdminContactEmail`; Basic allows any TenantAdmin |
| Settings → Billing UI | Available | Copy: "Billing uses your signed-in account email." Display prefers `profile.email` |
| Local `cohestra.tenants` | Partial | 4 seeded tenants; **no** CreativoRare row; no Paddle IDs |
| UAT Postgres `creativorare` | Missing | `~/.ssh` has no UAT key; Cloud Agent cannot SSH droplet |
| Live Paddle customer | Missing | Intentionally not queried — mutation risk on GetDetails/checkout |
| Paddle sandbox email | Partial | Owner-observed recipient only; no provider payload captured here |

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| - | --------------- | -------- | ------ | ----- |
| 1 | Read ensure/checkout/details/contact | High | Done | Operator email used as Paddle email |
| 2 | ConfirmPlanChange customer sync | High | Done | Does **not** re-ensure customer |
| 3 | TenantBillingAccess vs Basic checkout | High | Done | Invited admin can checkout on Basic |
| 4 | Live UAT AdminContactEmail | High | Blocked | No SSH; must not hit mutating billing APIs |
| 5 | UI copy / editable email | Medium | Done | Read-only field bound to signed-in email |

## Timeline of Events

| Time | Event | Source | Confidence |
| ---- | ----- | ------ | ---------- |
| Pre-UAT | Checkout/details/contact bind Paddle customer to `operatorEmail` | `PaddleBillingService.cs` | Confirmed |
| Portal path | Portal already passes `tenant.AdminContactEmail` into the same ensure helper | `CreatePortalSessionAsync` | Confirmed |
| UAT | Owner changed existing paid subscription; Paddle emailed observed operator | Owner report | Confirmed (observation) |
| 2026-10-12 | Local snapshot queried; CreativoRare absent | `psql` read-only | Confirmed |

## Confirmed Findings

### Finding 1: Ensure helper uses the passed email as Paddle customer email

**Evidence:** `src/Infrastructure/Billing/PaddleBillingService.cs:1239-1316`

**Detail:** `EnsurePaddleCustomerForOperatorAsync` trims `operatorEmail`, Find/Create by that email when `PaddleCustomerId` is empty, and `UpdateCustomerAsync` to that email when a customer already exists and emails differ.

### Finding 2: Checkout, GetDetails, and UpdateBillingContact pass signed-in operator email

**Evidence:**
- Checkout: `PaddleBillingService.cs:101` + `BillingController.cs:132,185-191` (`GetOperatorEmail()` → `CreateCheckoutSessionCommand.AdminEmail`)
- GetDetails: `PaddleBillingService.cs:301`
- UpdateBillingContact: `PaddleBillingService.cs:334` then `368-372` (`UpdateCustomerAsync(..., operatorEmail.Trim(), ...)`) — request `email` argument is unused for Paddle

**Detail:** Loading Settings → Billing (`GET details`) or saving contact **overwrites** the Paddle customer email to whoever is signed in, if they passed `ValidateBillingAccessAsync`.

### Finding 3: ConfirmPlanChange does not reconcile Paddle customer email

**Evidence:** `ConfirmPlanChangeAsync` `PaddleBillingService.cs:514-620` — PATCH same subscription; no ensure/update of customer email.

**Detail:** An existing drifted Paddle customer stays drifted through Option A plan change. Paddle transactional mail follows the provider customer record, not `Tenant.AdminContactEmail`.

### Finding 4: Basic plan allows any TenantAdmin to manage billing

**Evidence:** `TenantBillingAccess.cs:35-38`; tests in `TenantBillingAccessTests.cs:31-39`

**Detail:** An invited TenantAdmin on Basic can start Checkout. That path currently creates/syncs the Paddle customer to **their** operator email while `AdminContactEmail` can remain the owner.

### Finding 5: Paid Core/Pro still requires billing owner for management

**Evidence:** `TenantBillingAccess.cs:11-40`; `ValidateBillingAccessAsync` `PaddleBillingService.cs:235-258`

**Detail:** Invited TenantAdmin on paid Core/Pro is denied. TenantMember is blocked by `TenantAdminOnly` (integration `TenantAuthzIntegrationTests`). Access contract is not the leak; recipient routing is.

### Finding 6: UI presents signed-in email as the billing recipient

**Evidence:** `web/components/billing/in-app-billing-panel.tsx:181,527-538,599`

**Detail:** Read-only email input is `profile.email` with copy "Billing uses your signed-in account email." Display prefers operator email over `contact.email`. Tenant shell already has `billingOwnerEmail` for the owner-managed gate.

### Finding 7: Local snapshot cannot confirm the UAT tenant row

**Evidence:** Read-only `SELECT` on `cohestra.tenants` — 0 CreativoRare rows; 4 local seed tenants; none with Paddle IDs.

**Detail:** Live UAT `Tenant.AdminContactEmail` is **unverified** from this environment. Owner expected value is the Gmail owner address. Observed Paddle recipient is the creativorare.com operator address.

## Deduced Conclusions

### Deduction 1: Implementation defect exists independently of the live UAT row

**Based on:** Findings 1–6

**Reasoning:** Any authorized billing action that calls ensure/update with operator email can set the Paddle customer to that operator. Portal is already owner-email; checkout/details/contact are not. Plan change does not repair drift.

**Conclusion:** This is a confirmed implementation defect against the stated product contract (`Tenant.AdminContactEmail` is canonical recipient). The STOP branch (AdminContactEmail **is** the observed operator) is **not** established — live row missing, not confirmed as observed-operator.

### Deduction 2: Two plausible UAT mechanisms, both code bugs

**Based on:** Findings 3–4 and 2

**Reasoning:**
- **A.** Basic Checkout by invited admin created Paddle customer under operator email; later owner Option A plan change PATCHed the same subscription and did not sync customer email.
- **B.** GetDetails / UpdateContact as an authorized operator (Basic any admin, or owner if AdminContactEmail matched that operator) overwrote the Paddle customer email.

**Conclusion:** Either path produces the owner observation. Neither requires changing access rules. Do not weaken `TenantBillingAccess`.

### Deduction 3: Same customer/subscription IDs can be preserved

**Based on:** Finding 1 update branch (`PaddleCustomerId` present → `UpdateCustomerAsync` on that id)

**Reasoning:** Drift repair is an in-place customer email update. ConfirmPlanChange already guards same `PaddleSubscriptionId`.

**Conclusion:** Fix must update the same customer; never Find/Create a second customer because another admin is signed in.

## Hypothesized Paths

### Hypothesis 1: Code uses signed-in operator as Paddle customer email

**Status:** Confirmed

**Theory:** `EnsurePaddleCustomerForOperatorAsync` + checkout/details/contact call sites.

**Supporting indicators:** Owner observation; source at cited lines; UI copy.

**Would confirm:** Code read (done).

**Would refute:** Call sites using `AdminContactEmail` only (portal is the exception).

**Resolution:** Confirmed by source on HEAD `9b027a4f`.

### Hypothesis 2: UAT `AdminContactEmail` is already the expected owner

**Status:** Open (Missing evidence)

**Theory:** CreativoRare `AdminContactEmail` = expected owner Gmail.

**Would confirm:** Read-only UAT SQL of that column.

**Would refute:** Column equals observed operator.

**Resolution:** Not readable here. Owner stated expected owner. Do not treat missing evidence as confirmed wrong data.

### Hypothesis 3: UAT `AdminContactEmail` is the observed operator (data/ownership)

**Status:** Open (Missing evidence) — this is the STOP branch

**Theory:** Tenant data or ownership semantics are wrong; patching Paddle to `AdminContactEmail` would keep mailing the observed operator.

**Would confirm:** UAT row equals observed operator.

**Would refute:** UAT row equals expected owner.

**Resolution:** Not confirmed. Do not silently remap to a different human. Bind to `AdminContactEmail` as specified. If later UAT shows the observed operator as AdminContactEmail, classify as (A) wrong UAT data or (B) ambiguous ownership — do not invent a third email.

### Hypothesis 4: ConfirmPlanChange created a second Paddle customer

**Status:** Refuted

**Theory:** Plan change created a new customer/subscription under the signed-in operator.

**Would confirm:** ConfirmPlanChange CreateCustomer / new subscription id.

**Would refute:** ConfirmPlanChange only PATCH existing subscription.

**Resolution:** Refuted — no customer ensure on that path; same-subscription guard present.

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | ------ | ------------- |
| Live UAT `tenants."AdminContactEmail"` for CreativoRare | Distinguishes implementation-only vs data/ownership STOP | Owner workstation read-only SQL; not this VM |
| Live Paddle customer email / ids | Confirms drift vs aligned | Paddle dashboard or API **after** authorized read-only; do not use Cohestra GetDetails until ensure no longer mutates to operator |
| Which operator performed original Checkout vs plan change | Chooses mechanism A vs B | UAT audit / membership; not required to fix code |

## Source Code Trace

| Element | Detail |
| ------- | ------ |
| Error origin | `EnsurePaddleCustomerForOperatorAsync` — Paddle customer email = passed operator email |
| Trigger | Checkout (`AdminEmail`), GetDetails, UpdateBillingContact; **not** ConfirmPlanChange |
| Condition | Authorized billing caller whose JWT email ≠ `Tenant.AdminContactEmail` (Basic), **or** prior drift left in place through plan change |
| Related files | `PaddleBillingService.cs`, `BillingController.cs`, `TenantBillingAccess.cs`, `in-app-billing-panel.tsx` |

## Conclusion

**Confidence:** High for code root cause. Medium for the exact UAT data values (live row missing).

Paddle customer identity is incorrectly derived from the **authorization** email. Canonical billing recipient must be `Tenant.AdminContactEmail`. Operator email remains an authorization input only. Access rules for paid Core/Pro (owner-only) and TenantMember 403 must not be weakened. UpdateBillingContact must not write operator email (or an invited-admin-supplied email) onto the Paddle customer, and must not treat Settings email as an owner-transfer. UI copy that claims signed-in account email is the billing recipient is wrong.

Live sandbox mutation: **none** during this investigation.

## Recommended Next Steps

### Fix direction

1. `ValidateBillingAccessAsync(tenantId, operatorEmail)` — authorization only.
2. `billingEmail = RequireTenantBillingEmail(tenant)` from `AdminContactEmail`.
3. Replace ensure helper with `EnsurePaddleCustomerForTenantAsync`: create/find/update using billing email; preserve `PaddleCustomerId` and `PaddleSubscriptionId`.
4. Call ensure from checkout, portal, details, contact update, and confirm plan-change (authorized reconciliation).
5. `UpdateBillingContactAsync`: Paddle email = canonical owner; ignore request email; do not change `AdminContactEmail`.
6. UI: workspace billing owner copy; owner email read-only; do not bind to `profile.email`.

### Diagnostic

Automated tests A–I. Live UAT SQL + Paddle customer read remain owner-authorized later. Do not PATCH Paddle in this change.

## Reproduction Plan

1. Tenant `AdminContactEmail = owner@example.com`, Basic, invited TenantAdmin `other@example.com`.
2. Invited admin Checkout → Paddle customer currently created as `other@example.com` (defect).
3. After paid, owner plan-change → same subscription; Paddle email still `other@example.com` (defect).
4. After fix: Checkout/details/confirm sync **same** customer to `owner@example.com`; invited admin on Pro is 403 and does not mutate Paddle.

## Side Findings

- Portal path already intended owner email but reused the operator-named helper — naming lies.
- Historical UX `EXPERIENCE.md` (2026-08-09) said Stripe/Paddle customer email always uses signed-in operator — **superseded** by this owner contract.
- Calling live UAT `GET /api/v1/admin/billing/details` **before** the fix would mutate Paddle toward the signed-in operator. Evidence collection must not use that endpoint until patched.

## Follow-up: 2026-10-12

### New Evidence

Local `tenants` listing (sanitized): Default / px2-basic / px2-core / e2e fixture only. No CreativoRare. No Paddle customer/subscription ids.

### Updated Conclusion

Proceed with implementation bound to `Tenant.AdminContactEmail`. Do not invent a recipient other than that field. Story 19.4 stays OPEN. Production NO-GO.
