# SPEC 43.5 — Responsive, accessibility, visual, and consistency closure

Status: ready
Baseline: `0a160132`
Type: closure delta (not a redesign)

## Outcome

First-run marketing does not obstruct primary actions. Bootstrap copy matches Team. Suspended ≠ OnHold on every remaining user-facing path. Disabled controls stay in Axe except contrast. No orphan P1/P2 assigned to Epic 43.

## Residual ledger

| ID | Issue | Classification | Fix? | Owner | Acceptance evidence |
| -- | ----- | -------------- | ---- | ----- | ------------------- |
| PX2-LIVE-001 | Cookie covers CTA | STILL MISSING | Yes | 43.5 | Playwright: Start free clickable while banner visible at 390 and 1440 |
| D20 | Accept / Reject / Preferences, reserved space, no dark pattern | STILL MISSING | Yes | 43.5 | Three named buttons; Learn more does not accept; Preferences 38.6 dialog |
| Cookie persistence | `accepted` only | STILL MISSING | Yes | 43.5 | `accepted` still hides; `essential` is reject; unknown stored hides |
| Cookie Cinema | Hide on `#crm` | ALREADY SATISFIED — preserve | Preserve | 43.5 | Banner absent on `#crm` |
| Optional analytics | Copy mentions analytics; none execute | ALREADY ABSENT | Do not add tracker | 43.5 | Source grep: no gtag/plausible/posthog added |
| PX2-IA-006 | “One workspace, one operator.” | STILL MISSING | Yes | 43.5 | Register description + operator manual |
| PX2-ENT-005 | Public Suspended “on hold” | STILL MISSING | Yes | 43.5 | Maintenance H1 uses paused, not on hold |
| Billing/Platform OnHold | “Billing is on hold.” | ALREADY SATISFIED | No | 43.3/43.4 | Existing tests |
| PX2-A11Y-007 marketing | Atelier buttons lack focus-visible | PARTIALLY SATISFIED | Yes | 43.5 | `marketingAtelierButtonClass` has focus-visible ring |
| Public `ring-ring/50` | Epic 35 frozen | OBSOLETE | No | — | Do not restyle registration |
| PX2-TOUCH-001 / 43.999 | Subpixel WhatsApp | OBSOLETE / D | No | — | Do not weaken 44px |
| Mobile tab clearance | | ALREADY SATISFIED | No | — | dashboard-layout padding |
| Calendar FAB name | | ALREADY SATISFIED | No | — | aria-label present |
| Clients table semantics | | ALREADY SATISFIED | No | 40.3 | `/clients` table |
| Community `role="row"` | | STILL MISSING | Yes | 43.5 | Role removed; source test |
| Client chips | | ALREADY SATISFIED | No | 40.3 | |
| PX2-STATE-002 | Core empty/error | PARTIALLY SATISFIED | No restyle | — | Nested cells stay small |
| PX2-SYS-003 gutters | Cookie overlay remaining | PARTIALLY SATISFIED | Cookie only | 43.5 | In-flow reserved banner |
| Axe disabled exclude | Whole-node exclude | STILL MISSING | Yes | 43.5 | Helper tests + migrated callers |
| Skip scrollIntoView | Unproven | ALREADY SATISFIED | No | — | |
| Platform 43.4 | | ALREADY SATISFIED | No | 43.4 | |
| Epic 35–37 | | PROTECTED | No | — | No shell/motion/composition change |

No finding may silently disappear. ALREADY SATISFIED rows stay in this ledger with evidence.

## Cookie contract

- Non-modal `role="region"` named “Cookie consent”.
- In-flow under marketing header. Not `position:fixed`. Not `role="dialog"`.
- Actions: **Accept**, **Reject non-essential**, **Preferences** — real buttons, keyboard, 44px, visible focus. Reject is not fine print. Learn more must not accept.
- Preferences: 38.6 Dialog; Essential always on; Optional analytics default **off**, labelled as not currently used. Cancel restores focus.
- Storage: `cohestra-marketing-cookie-consent`. `accepted` | `essential`. Unknown stored → hide.
- `#crm` → hide. No Cinema motion edits.
- No new legal policy. No tracker.

## Copy

Register description must not say “one operator” / “single operator”. Must say this creates the initial workspace admin account and teammates can be invited according to the plan.

Public Suspended H1 must not say “on hold”.

## Axe

Disabled nodes remain in the scan. Filter only color-contrast findings whose target is disabled / aria-disabled / data-disabled. Enabled contrast still fails. Unnamed disabled still fails. Invalid ARIA on disabled still fails.

## Non-goals

No product-wide restyle. No Epic 35–37 reopen. No new epic. No production fixtures. No cookie-law interpretation. No analytics vendor. No impersonation. No weakening 44px.

## Protected

Public Join 48px. Form Studio preview lifecycle. Website Studio. Touch reorder. Motion 160ms / PRM.
