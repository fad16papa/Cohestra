---
id: 43.3
key: 43-3-billing-presentation
title: Billing presentation
status: done
epic: 43
created: 2026-10-07
baseline_commit: 4c9b15933b43d57bd0dfeb40365f0577fca15644
accepted_commit: 238678477f333c5f77e79d4ec385c05cf87bb634
implementation_merge: 32735f26383d000a02316a11f0d253e0612ae612
---

# Story 43.3: Billing presentation

Status: done

DONE requires the Mandatory Code Review Loop on the final HEAD.

## Story

As a TenantAdmin or TenantMember,
I want Billing to tell me my plan, billing state, who can act, and what to do next,
so that I do not confuse OnHold with a paused workspace, see sandbox instructions in production, or trigger Paddle sync by opening Settings.

## Already satisfied (OUT OF SCOPE)

- 43.1 `/settings/billing`, Member stay-and-deny, one h1
- 38.1 named unconfigured state, no background sync, explicit refresh, checkout-return reconcile
- Shell banners for trial / past_due / on_hold
- Owner-managed invited Admin gate
- Scheduled cancel/change APIs
- Paddle checkout/webhook/pricing

## Remaining scope

1. Humanize plan/status/trial/past-due/on-hold on the Billing page.
2. Production-safe incomplete + paddle-return copy; sandbox extras gated.
3. ProductErrorState for Member (stay).
4. Complimentary explanation; hide checkout.
5. Portal EnsureBillingAccessAsync.
6. 390 + semantic tokens + status semantics.
7. Tests: copy, 38.1/43.1 regression, 390, portal 403.

## Close

Story 43.3 DONE on accepted HEAD `23867847` (PR #397 merge `32735f26`). Epic 43 remains in-progress. Do not create 43.4.

## Exact stop

Story 43.3 DONE. Epic 43 stays in-progress. Do not create 43.4.
