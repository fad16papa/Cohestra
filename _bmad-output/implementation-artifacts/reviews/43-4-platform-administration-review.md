# Code review — Story 43.4 Platform administration

HEAD reviewed: branch `cursor/story-43-4-platform-administration-8d20`  
Date: 2026-10-08  
Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor

## Verdict

**PASS** for merge from this HEAD, pending exact-HEAD CI green. No unresolved BLOCKER/MAJOR.

## Blind Hunter

- Platform shell is still ink header + gold wash. No AdminSidebar, Follow-up, PlanBadge, or AdminRouteTransition.
- `--plat-*` names kept; shared semantics aliased. `--plat-stone` → `--text-muted`. `--plat-header-muted` stays on ink.
- `window.confirm` removed from tenant Archive and recovery. AlertDialog uses “Archive workspace”.
- Suspend remains reason + Confirm suspend with break-glass copy.
- No impersonation strings or APIs.
- PlatformTenantService lifecycle/complimentary rules unchanged; new integration test asserts default-tenant 409 and operator 403.

## Edge Case Hunter

- Skip link moved inside the authenticated Platform tree so `#main-content` exists when skip is shown.
- Reactivate stays available if a default tenant were Suspended (restorative). Suspend/archive/complimentary remain blocked on default.
- Directory/support pagination and recovery actions are min-h-11.
- OnHold added to billing filter; Suspended/OnHold copy never swap phrases.
- Disposable e2e tenants only; default / px2 fixtures not archived.

## Acceptance Auditor

| AC | Evidence |
| -- | -------- |
| Staff console identity | Layout/header source + 1440/390 screenshots |
| Token inheritance | layout aliases + source test |
| Skip / one main / one h1 | Playwright directory + tenant + support |
| aria-current + 44px menu | Playwright |
| Archive AlertDialog | Playwright cancel + confirm on disposable |
| Suspend two-step + language | Playwright “Workspace paused.” / no OnHold |
| Default-tenant 409 | PlatformTenantLifecycleIntegrationTests |
| 390 no page overflow | Playwright directory/tenant/support |
| Non-PlatformAdmin denied | Playwright + operator 403 API |
| No impersonation / no route motion | Source test |

## Findings

### MINOR

1. API error strings are appended with “Refresh…” — operational, slightly redundant if the API already explains next action.
2. Complimentary Free rows now also show “No paid subscription” from shared billing copy. Distinct from Suspended.

### NIT

1. Screenshot OCR of evidence PNGs concatenates words; visual structure is still a staff console.

## Tests on this HEAD

- Vitest platform-status-copy + platform-43-4-source: pass
- Integration PlatformTenantLifecycle: 4 passed
- Playwright 43.4: 2 passed
