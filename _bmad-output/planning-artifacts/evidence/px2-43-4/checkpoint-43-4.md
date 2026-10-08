# Checkpoint preview — Story 43.4

Date: 2026-10-08  
Method: Playwright live-stack interaction (`E2E_LIVE_STACK=1`) against native API `:8080` + web `:3000`. Screenshots in `viewports/`.

## Surfaces

| Surface | Result |
| ------- | ------ |
| /platform 1440 | Staff directory, ink header, gold wash, no tenant chrome |
| /platform 390 | Stacked controls, scoped table scroll, no page overflow, 44px menu |
| Tenant detail 1440 | Identity, snapshot, lifecycle, complimentary, audit |
| Tenant detail 390 | No page overflow |
| Support 1440 / 390 | Inbox usable; empty state; scoped table |
| Archive dialog | AlertDialog, workspace identity, Cancel / Archive workspace |
| Suspend | Reason required; Confirm suspend; “Workspace paused.” |
| Complimentary | Set complimentary controls unchanged |
| Empty support | “No support issues match this search.” |

## Questions

1. Does Platform still feel like an operations console rather than a tenant dashboard? **YES.**
2. Can a Platform operator distinguish tenant Suspended from Billing OnHold immediately? **YES.**
3. Are dangerous actions deliberate, accessible, and difficult to trigger accidentally? **YES.**
