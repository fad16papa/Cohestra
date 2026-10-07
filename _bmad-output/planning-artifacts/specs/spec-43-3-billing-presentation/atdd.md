# ATDD — Story 43.3 Billing presentation

Murat / bmad-testarch-atdd  
Date: 2026-10-07

## Fixtures

Local only: operator owner, PX2_PRO_MEMBER, PX2_BASIC_TENANT, unconfigured Paddle (CI/dev). No live charge.

## Required cases

| ID | Case | Expected |
| -- | ---- | -------- |
| T1 | Owner `/settings/billing` | h1 Billing; plan + humanized status |
| T2 | Member stay + ProductErrorState | tenant admins only; no checkout |
| T3 | Non-owner paid Admin | owner-managed; no panel |
| T4 | Basic owner | valid plan; UpgradePanel; not an error |
| T5 | Unconfigured | BILLING_UNAVAILABLE_COPY; no POST sync |
| T6 | Trialing | Trial — n days left; not alert |
| T7 | Past due copy | Payment is past due. |
| T8 | OnHold copy | Billing is on hold. No workspace paused |
| T9 | Incomplete | no 4242 / Notifications unless sandbox |
| T10 | Refresh | explicit-refresh only |
| T11 | Portal non-owner | 403 |
| T12 | 390 | no overflow; actions ≥44px |
| T13 | 43.1 deep link | `/settings/billing` |
| T14 | 38.1 | billing-sync-38-1 still green |

## Out of scope

Live Paddle, Suspended public H1, 43.4 Platform.
