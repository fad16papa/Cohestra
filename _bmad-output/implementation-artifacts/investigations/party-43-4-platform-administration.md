# Party 43.4 — Platform Admin inheritance without flattening

Date: 2026-10-08  
Question: What is the smallest remaining change that lets Platform Admin inherit Cohestra's semantic accessibility and interaction system while preserving its sparse staff-console identity and all existing operational behavior?

Participants: JOHN (PM), SALLY (UX), WINSTON (Architect)

## JOHN

Platform must remain an operations console. Suspended is break-glass ("Workspace paused.") and must never read as collections. OnHold stays "Billing is on hold." Dangerous lifecycle stays deliberate. No impersonation, no tenant Admin chrome, no Cinema.

## SALLY

Do not restyle Platform as another tenant dashboard. Inherit skip, one main / one h1, focus-visible, 44px where touch applies, AlertDialog for `window.confirm`, readable muted text. Keep gold wash + ink header. Tables stay tables with scoped overflow. Suspend stays the two-step reason flow (safer than a reasonless modal). Recovery and Archive need 38.6 dialogs.

## WINSTON

Minimum inheritance boundary: alias `--plat-*` shared semantics to existing CSS variables. Do not delete the `--plat-*` names (avoid churn). Keep gold/header-muted as Platform-only. Do not share the tenant shell, AdminRouteTransition, or Button-for-every-control. API `PlatformAdminOnly` stays authoritative.

## ONE recommendation

**Alias shared `--plat-*` tokens to Cohestra semantics, add skip/nav/focus/44px, replace Archive + recovery `window.confirm` with AlertDialog, and print Suspended vs OnHold language — without merging Platform into tenant Admin chrome or changing lifecycle/billing policy.**
