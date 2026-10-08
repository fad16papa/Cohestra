# SPEC 43.4 — Platform administration (delta)

Status: frozen  
Baseline: main `059ee9a4`

## Outcome

Platform Admin inherits Cohestra semantic accessibility and interaction without becoming tenant-admin chrome.

## Token inheritance

- Alias shared `--plat-*` to `--ink`, `--ink-soft`, `--paper`, `--paper-warm`, `--text-muted`, `--line`, `--line-strong`, `--lagoon`, `--lagoon-fg`, `--danger`, `--surface-danger`, `--ring`.
- Keep `--plat-gold` / `--plat-gold-soft` and the gold wash background.
- Add `--plat-header-muted` for ink-header helper text. Never put `--text-muted` on the ink header.
- Do not mechanically rename every class.

## Focus / skip / landmarks

- Reuse `AdminSkipLink` + `#main-content` (single main, tabIndex -1).
- First Tab reveals skip; skip lands on Platform main.
- One h1 per route; header "Platform" is not an h1.
- Visible `:focus-visible` ring on interactive controls; header ring must contrast on ink.
- `aria-current="page"` on Tenants / Support.
- Mobile menu ≥44px; pagination and recovery actions ≥44px.

## Responsive tables

- Keep data tables.
- Whole page must not overflow at 390.
- Internal scoped horizontal scroll is valid.

## Destructive actions

- Archive: AlertDialog. Title names workspace. Body: soft archive. Action: "Archive workspace". Cancel restores focus.
- Recovery password-reset / resend-verify: AlertDialog (same 38.6 gap).
- Suspend: keep inline reason + Confirm suspend. Do not wrap in a reasonless modal.
- Reactivate: no extra confirmation.
- Complimentary: no extra modal.

## Language

- Tenant Suspended → "Workspace paused."
- Billing OnHold → "Billing is on hold."
- Preserve: Suspend is break-glass for abuse, ToS, or support freeze — not non-payment.

## Non-goals

Impersonation, new Platform roles, tenant sidebar / Follow-up / page header / PlanBadge, Epic 37 AdminRouteTransition, Cinema, Paddle/billing/lifecycle policy, production fixtures, 43.5 cookie/banner sweep.

## Architecture note

No routing or backend restructure. Token aliasing is a layout-level CSS inheritance. Dialogs reuse `components/ui/alert-dialog`. Authz stays `PlatformAdminOnly`.
