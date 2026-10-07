---
id: spec-43-3-billing-presentation
slug: 43-3-billing-presentation
status: ready
created: 2026-10-07
baseline: 4c9b15933b43d57bd0dfeb40365f0577fca15644
---

# SPEC — Story 43.3 Billing presentation

## Why

Operators must immediately understand plan, billing state, who can act, and the next action — without decoding Paddle, confusing OnHold with Suspended, or seeing sandbox developer instructions in production.

## Capabilities

- **CAP-1** Billing page answers: plan, state, attention, owner, next action.
- **CAP-2** Member `/settings/billing` stays; ProductErrorState permission copy; no checkout/portal.
- **CAP-3** Non-owner paid Admin sees owner-managed explanation, not a permission error and not billing controls.
- **CAP-4** Trialing uses “Trial — {n} days left” when an end date exists; not an alarm.
- **CAP-5** Past due: “Payment is past due.” plus legitimate next action.
- **CAP-6** OnHold: “Billing is on hold.” Read-only meaning. Never “Workspace paused.”
- **CAP-7** Provider unavailable uses 38.1 BILLING_UNAVAILABLE_COPY; no 503 loop.
- **CAP-8** Checkout incomplete uses production-safe copy; sandbox card / Notifications only when Paddle environment is sandbox.
- **CAP-9** Explicit Refresh uses 38.1 reconcile helper. Ordinary visit does not POST sync.
- **CAP-10** POST `/billing/portal` requires billing owner (same as checkout/sync).
- **CAP-11** 390: wrap, no horizontal overflow, primary actions ≥44px.
- **CAP-12** 43.1 route + 38.1 sync policy unchanged.

## Constraints

- Do not rewrite Paddle, webhooks, prices, trial length, seats, or credentials.
- Do not change public Suspended copy (43.4/43.5).
- Do not invent scheduled-change behavior.
- No production billing seeder or real charges.

## Non-goals

Paddle rewrite. Fake checkout. Tenant Suspended redesign. Platform Admin. Epic 19.

## Billing-state matrix

| Domain | Operator language | Attention |
| ------ | ----------------- | --------- |
| Active | Active | none |
| Trialing | Trial — n days left | status |
| PastDue | Payment is past due. | alert |
| OnHold | Billing is on hold. | alert |
| Canceled | Subscription ending / ended | status |
| Free/Basic | Basic (valid plan) | none |
| billingConfigured false | 38.1 unavailable copy | status |
| TenantStatus.Suspended | Not a Billing state | out of scope |

## Role matrix

| Actor | `/settings/billing` | APIs |
| ----- | ------------------- | ---- |
| Billing-owner Admin | manage | GET/sync/checkout/portal |
| Non-owner Admin (paid) | owner-managed copy | 403 owner message |
| TenantMember | ProductErrorState stay | 403 |
| Complimentary | no checkout/portal | existing reject |

## Plan matrix

Basic = valid plan + UpgradePanel for owner. Core/Pro = current mechanics. Enterprise follows paid owner-managed rules. No new pricing.
