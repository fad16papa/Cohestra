# Epic 43 retrospective — System Areas and Product-Wide Closure

**Epic:** 43 (CLOSED after this tracker)  
**Stories:** 43.1 Settings nested routes · 43.2 Team and permissions · 43.3 Billing presentation · 43.4 Platform administration · 43.5 Responsive, accessibility, visual, and consistency closure  
**43.5 merge:** PR #401 @ `e18f5d93`  
**Accepted implementation HEAD:** `ee4d780d`  
**Next epic:** NOT STARTED — STOP

## Assembled product

Settings is a nested IA with deep links. Team tells role vs plan vs seat apart. Billing presents human states without sandbox leakage. Platform stays a staff console. First-run marketing no longer covers Start free.

43.1 locked `/settings/*`, history, one h1.  
43.2 locked TenantAdmin / TenantMember / invite / seat vs plan.  
43.3 locked Billing is on hold vs Workspace paused on tenant Billing.  
43.4 locked Platform skip, tokens, Archive AlertDialog, Suspended vs OnHold on staff surfaces.  
43.5 locked D20 cookie, bootstrap Team copy, public Suspended H1, Axe disabled-contrast helper.

## Cross-story acceptance

| Gate | Result |
| ---- | ------ |
| SETTINGS IA | PASS (43.1) |
| DEEP LINKS / HISTORY | PASS (43.1) |
| TEAM ROLE VS PLAN VS SEAT | PASS (43.2) |
| BILLING STATES | PASS (43.3) |
| ONHOLD VS SUSPENDED | PASS (43.3–43.5) |
| PLATFORM ADMIN | PASS (43.4) |
| COOKIE FIRST-RUN | PASS (43.5) |
| MOBILE | PASS (shell padding + 43.4 44px; no 43.5 restyle) |
| ACCESSIBILITY | PASS (Axe helper + baseline callers) |
| FOCUS | PASS (marketing rings; 38.6 overlays) |
| TOUCH | PASS (doctrine kept at 44px; 43.999 classified D) |
| EMPTY / ERROR STATES | PASS (core primitives; nested cells left) |
| SEMANTIC TOKENS | PASS (38.4 + 43.4 aliases) |
| MOTION | PASS (Epic 37 untouched) |
| PUBLIC REGISTRATION | PASS (Epic 35 frozen; Join 48px) |
| CREATION STUDIOS | PASS (Epic 42 protected) |
| TEST ISOLATION | PASS (owned fixtures; no production seeder) |
| VISUAL QA | PASS (43.5 matrix section + checkpoint shots) |
| CI | PASS PR #401 `ee4d780d`; main `e18f5d93` required |
| P1 orphans assigned to Epic 43 | ZERO |
| P2 orphans assigned to Epic 43 | ZERO |

## What worked

1. **Delta audit first** — 43.1–43.5 each found most of the original backlog already shipped.
2. **Phrase lock** — “Workspace paused.” vs “Billing is on hold.” survived 43.3 → 43.4 → 43.5.
3. **Cinema exception** — cookie stays out of `#crm` because Cinema owns `window.scrollY`.
4. **Axe helper centralization** — one contrast filter instead of global disabled excludes.

## What was hard

1. **Cookie vs Cinema scroll** — a bottom overlay or inner scroller would regress Harbourline.
2. **Playwright `addInitScript`** — cleared consent on every navigation and failed Docker smoke.
3. **Hero type vs first fold** — reserved banner does not cover Start free; large hero can still push it below the fold.

## Action items

- Owner: STOP. Do not auto-start Epic 19, Epic 33 backlog, or a new Product Experience epic.
- Operator UAT of first-run cookie + Settings/Team/Billing/Platform on the assembled product (Operator, open).
- Optional later (not Epic 43): Form composition listbox/`li` axe; public `ring-ring/50` if Epic 35 is ever reopened.

## Next

No new epic from this close.
