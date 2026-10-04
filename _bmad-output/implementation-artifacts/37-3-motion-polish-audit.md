---
status: done
story_key: 37-3-motion-polish-audit
epic: 37
---

# Story 37.3: Motion polish and interaction consistency audit

Status: ACCEPTED

## Story

As an operator using authenticated Cohestra,  
I want one coherent motion language across routes, chrome, overlays, and builders,  
so navigation feels continuous and premium without becoming slower or destroying studio drafts.

## Acceptance Criteria

See product brief ACs 1–20. Binding constraints: preserve 37.1/37.2 primitives; no new animation libraries; no new architecture unless a verified defect cannot be fixed locally.

## Verified findings (this story)

| Sev | Defect | Fix |
|-----|--------|-----|
| HIGH | Route enter 350ms exceeds context budget 180–300ms | `.animate-page-enter` → 280ms |
| HIGH | Dashboard metric tiles + client profile stack 700ms `animate-fade-in-up` on top of route enter | Remove nested cinematic enter; keep press hover |
| HIGH | `Button` / several nav+card links use `transition-all` (layout jump risk) | Press-level color/transform/opacity only, 100ms, PRM |
| MEDIUM | Overlay enter/exit same 200ms | Exit `duration-150` |
| MEDIUM | Activity tabs / dashboard switcher / mobile nav missing `motion-safe` | Align with Form Studio tabs |
| MEDIUM | Skeletons `animate-pulse` ignore reduced motion | `motion-safe:animate-pulse` |
| MEDIUM | Community pulse bar `duration-700` | `duration-300` + PRM |
| MEDIUM | Remaining operator chrome used ungated `transition-colors` (settings, filters, lists, billing, Form Design) | Map to `motion-press` / `motion-local` so PRM disables leftover hover animation |
| LOW | Accordion profile expand 300ms slightly slow for local | 200ms |
| LOW | Follow-up highlight card `duration-300` | `motion-local` 160ms |
| LOW | Dashboard `<tr>` hover used `transition-colors`; do not use `motion-press` (transform on table-row) | `motion-local` |
| HIGH | Calendar FAB used a `fixed inset-0 z-40` hit layer over the 390px More tab | Position FAB above the tab bar; drop the full-viewport wrapper |

## Non-goals

- New primitives replacing AdminRouteTransition / BuilderSurface
- Marketing cinema unification
- Fake loading delays

## Dev Agent Record

### Agent Model Used

Grok 4.6 (primary). Composer 2.5 not used.

### File List

Chrome and tokens: `web/app/globals.css`, `web/lib/admin-route-motion.ts`, `web/components/ui/button.tsx`, `web/components/ui/dialog.tsx`, `web/components/ui/alert-dialog.tsx`, `web/components/ui/sheet.tsx`, `web/components/ui/input.tsx`, `web/components/ui/filter-select.tsx`, `web/components/ui/toast-provider.tsx`.

## Change Log

- 2026-09-21: Story opened — product-wide motion polish.
- 2026-09-21: Pass 1 — route enter 280ms, drop stacked fade-in-up, press/local tokens, overlay exit 150ms, PRM skeletons.
- 2026-09-21: Pass 2 — remaining operator `transition-colors` mapped to press/local (settings, lists, billing, Form Design, reports, campaigns). Table rows use `motion-local` (no transform).
- 2026-09-21: Pass 4 — calendar FAB no longer covers the 390px More tab (drop `fixed inset-0` hit layer).

## Grok 4.6 code review (HEAD 57e8e2b)

Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor.

| Sev | Finding | Disposition |
|-----|---------|-------------|
| — | 37.1/37.2 primitives rewritten | None. `AdminRouteTransition`, pathname key, `BuilderSurface`, keepMounted editors preserved. |
| — | New animation library | None. |
| MINOR | Website builder onboarding tour (`z-[200]`) intercepts later Preview clicks until dismissed | Pre-existing tour, not a 37.3 motion defect. Dismiss/Skip. |
| HIGH | Calendar FAB `fixed inset-0 z-40` intercepts 390px More tab | Fixed: FAB sits above the tab bar; no full-viewport hit layer. |

Unresolved BLOCKER/MAJOR: none.

## Live UX

Operator `operator@cohestra.local` against `http://default.localhost:3000`.

Passes: desktop 1440, mobile 390, `reducedMotion: reduce`.

- Route wrapper `[data-admin-route-transition]` present on every audited admin route.
- Document `overflowX` = 0 on Dashboard, Website Studio, Clients, Client detail, Activities, Campaigns, Reports, Settings, Billing, Team, Activity Form, Activity Design.
- Browser Back/Forward returned to Dashboard without login bounce or overflow.
- Follow-up card visible on client detail.
- Form Studio: Build form + Preview (safety indicator visible). Activity Design tab (experience cards) verified.
- Website Studio: Design/Sections/Templates + Build workspace; onboarding tour overlay is the existing 5-step tour.
- Cohestra AI = Dashboard "Needs attention" intelligence brief.
- Screenshots: `/opt/cursor/artifacts/screenshots/37-3-live/`.
- Interactive corroboration ([Live 37.3 motion polish UX](bc-7cd28ede-4134-5b07-8939-02cf77632c33)): no stacked cinematic enter; Website Studio typing latency none; draft headline preserved. Gaps that session left (Reports, Billing, Cohestra AI, 390 Website, reduced-motion) were covered in the Playwright pass above.
- Overlay follow-up: account menu opens and Escape closes it. Calendar FAB no longer intercepts the 390px More tab; More opens the nav sheet with overflow 0.

## Coverage matrix

## Coverage matrix

| Surface | Navigation | Click feedback | Local state | Overlay | Loading | Mobile | Reduced motion | Verified |
| ------- | ---------- | -------------- | ----------- | ------- | ------- | ------ | -------------- | -------- |
| Dashboard | Y | Y press tiles/rows | Y view switcher | Calendar popout | Y PRM skeletons | Y 390 | Y | Y |
| Website Studio | Y pathname | Y tokens | Y Design/Sections/Build tabs | Tour + publish dialogs | Y | Y 390 | Y | Y |
| Clients list | Y | Y row/chips | Y filters | — | Y | Y 390 | Y | Y |
| Client detail / follow-up | Y | Y | Y follow-up card | outreach radios | Y | Y 390 | Y | Y |
| Activities list | Y submenu | Y cards/chips | Y filters | — | Y | Y 390 | Y | Y |
| Activity detail + Form Studio | Y tabs | Y | Y Build/Preview | — | Y | Y Form | Y | Y |
| Activity Design | Y | Y experience cards | Y | — | — | — | Y tokens | Y |
| Campaigns | Y | Y rows | — | — | — | Y 390 | Y | Y |
| Reports / Analytics | Y | Y filters | Y filter bar | — | empty state | Y 390 | Y | Y |
| Cohestra AI | via Dashboard | Y buttons | details | — | Y skeleton | Y 390 | Y | Y |
| Settings | Y rail + mobile chips | Y | Y appearance radios | user menu popover + More sheet | — | Y 390 | Y | Y |
| Billing / subscription | Y | Y interval/plan | Y | — | — | Y 390 | Y | Y |
| Team / onboarding chrome | Y | Y | — | — | — | Y 390 | Y | Y |
| Shared buttons/overlays | — | Y `motion-press` | Y `motion-local` | dialog/sheet 200/150 | Y | — | Y CSS | Y |

## Tests

- `cd web && npx vitest run` — 369 passed
- `cd web && npx tsc --noEmit` — passed
- `cd web && npx next build` — compiled + TypeScript passed
- GitHub CI on PR HEAD `c6021ae` run `35618525151` — all required checks success
- Post-merge CI on `main` `bc5cc43` run `35620302066` — all required checks success
- Post-merge live smoke — PASS (route enter, shell, submenu, overlays/Escape, Website typing, Form Studio draft Build↔Preview, 390 overflow 0, More reachable, Back/Forward, reduced-motion disables page-enter)

## Status

ACCEPTED. Post-merge verification: PASS. Epic 37 closed.
