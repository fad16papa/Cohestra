# ATDD — Story 43.1 Settings nested routes

Murat / bmad-testarch-atdd  
Date: 2026-10-06  
Red-phase intent: tests name the routing contract before or with implementation. Do not weaken production behavior to pass.

## Fixtures

- Tenant Admin (existing operator / Pro or Core admin)
- Tenant Member (PX2_PRO_MEMBER)
- Basic Admin (PX2_BASIC_TENANT) for Team UpgradePanel
- Do not mutate shared demo themes (38.3)

## Required cases

| ID | Case | Expected |
| -- | ---- | -------- |
| T1 | `/settings` Admin | URL `/settings/plan`, h1 Plan & limits, one main |
| T2 | `/settings` Member | URL `/settings/profile`, h1 Your account |
| T3 | Direct `/settings/appearance` | Appearance body; refresh stays |
| T4 | `/settings?section=team` | URL `/settings/team` without `section=` |
| T5 | `/settings?section=account` | URL `/settings/profile` without `section=` |
| T6 | `/settings?section=billing` | `/settings/billing` |
| T7 | `/settings?activeId=appearance` | `/settings/appearance` |
| T8 | Unknown `/settings/teem` | 39.5 not-found h1 |
| T9 | History Profile → Team → Billing → Back | Team, then Profile |
| T10 | Admin nav | Workspace + personal links; current `aria-current=page` |
| T11 | Member nav | No Team/Billing/Plan links |
| T12 | Member `/settings/team` | “tenant admins only”; no UpgradePanel / Start trial |
| T13 | Member `/settings/billing` | stay + deny copy |
| T14 | Member `/settings/plan` | redirect `/settings/profile` |
| T15 | Basic Admin `/settings/team` | UpgradePanel remains |
| T16 | One h1, one main, skip `#main-content` on `/settings/profile` |
| T17 | 390 chips visible; 1024 left rail visible |
| T18 | `prefers-reduced-motion: reduce` still loads Appearance |
| T19 | Account save / appearance persist still works (existing sections) |
| T20 | Footer Settings href `/settings`; user menu `/settings/profile` |

## Protected suites to run (not rewrite)

`landmarks-38-5` (update Settings h1 to post-redirect section name), `page-header-39-4` (profile h1 Your account), `desktop-shell-39-1` (legacy URL + footer href), `entitlement-visibility-39-3` (Member team), billing-sync, motion-polish source contract.

## Out of scope

43.2/43.3 behavior, Paddle sandbox, custom-domain provisioning.
