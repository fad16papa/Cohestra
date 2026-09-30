# Story 38.6 implementation readiness

Date: 2026-09-30  
Baseline: `main` `955edce3` (38.5 ACCEPTED/CLOSED). Required CI `36696162938` success.

## Canonical vs prompt

Accepted backlog §38.6 + DESIGN.md D8 / §10.5 / §19.2 are authoritative. The execution prompt asked for every popover/dropdown and nested product overlay. That is **wider** than the backlog. Implementation follows the canonical slice (shared modal primitives + migrate command palette, campaign preview, insert QR + verify More sheet and existing alerts). Popovers stay non-modal. Cookie/calendar/tour are named exceptions.

## Alignment

| Source | Status |
| --- | --- |
| Backlog 38.6 | Mandate `ui/dialog` \| `alert-dialog` \| `sheet`; migrate preview + QR + palette; 160ms; no compose restyle |
| DESIGN.md D8 | Same; command palette must use the contract |
| 38.5 deferral | Mobile More focus trap → 38.6 (sheet already present; verify) |
| Epic 39+ | Not started |

## Open PO decision

None. Exception process for leftover custom dialogs is already in DESIGN.md §19.2.

## Ready to implement

Yes.
