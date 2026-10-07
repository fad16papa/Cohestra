# Checkpoint — Story 43.3 Billing presentation

Date: 2026-10-07

## Question

Can the operator tell, within a few seconds, what plan they have, what the billing state means, who can act, and what they should do next?

**YES.**

Could any user confuse Billing OnHold with a Suspended workspace?

**NO.**

## States captured

| State | Viewport | File | Result |
| ----- | -------- | ---- | ------ |
| Owner Trialing + unconfigured | 1440 | settings-billing-owner-1440.png | Plan Pro, Trialing, named unconfigured, Refresh |
| Owner Trialing | 390 | settings-billing-owner-390.png | Readable, Refresh reachable, no h-scroll |
| Provider unavailable | 1440/390 | owner shots | 38.1 copy, not a crisis banner |
| Member denied | 1440 | settings-billing-member-denied-1440.png | ProductErrorState, no checkout |
| Basic complimentary | 1440 | settings-billing-basic-1440.png | Plan Basic, valid, no checkout |
| Core | 1440 | settings-billing-core-1440.png | Plan Core |
| Incomplete | 1440 | settings-billing-incomplete-1440.png | Production-safe; no 4242 |
| Trialing injected | 1440 | settings-billing-trialing-1440.png | Trial — n days left |
| Past due injected | 1440 | settings-billing-past-due-1440.png | Payment is past due. |
| OnHold injected | 1440 | settings-billing-on-hold-1440.png | Billing is on hold. No Trial. No Workspace paused. |
| Non-owner Admin | 1440 | settings-billing-non-owner-1440.png | Managed by owner email; no controls |

## Language

OnHold page uses “Billing is on hold.” / read-only. Never “Workspace paused.”
Public Suspended copy was not changed.
