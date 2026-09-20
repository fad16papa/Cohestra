# Investigation: Form Experience appears visually unchanged (`/register/fnm`)

**Date:** 2026-09-20  
**Case:** post-epic-35-fnm-visual-unchanged  
**Epic 35:** CLOSED (not reopened)

## Stronghold (confirmed from code)

1. `pickRegistrationPublicShellKind` maps **classic preset + centered layout** → shell `"modern-centered"` (`web/lib/registration-public-shell.ts:16-43`).
2. **`modern-centered` shell** renders hero + stacked form in `max-w-[480px]` (`web/components/registration/public-registration-open.tsx:180-191, 299`) — same structural pattern as pre-Epic Classic.
3. **`style` dimension is not consumed** in `web/components/registration/*` (grep: no `effectiveExperience.style` / `resolvedExperience.style` in render path). Layout/flow drive shells; style is largely inert at runtime today.
4. Public page passes API `preset` + `resolvedExperience` into `PublicRegistrationOpen` (`web/app/(public)/register/[slug]/page.tsx:112-129`).
5. API builds `ResolvedExperience` via `RegistrationExperienceResolver.Resolve(stored theme)` without plan re-normalization on read (`ActivityService.cs:883-919`, `RegistrationThemeResolver.cs:33-41`).

## Missing runtime evidence (gap)

- Cloud agent **cannot reach** `creativorare.localhost:8088` (connection refused; no Docker on VM).
- **No DB access** to read `activities.registration_theme` for slug `fnm` / tenant `creativorare`.
- **Required to close hypothesis on user's machine:**  
  `curl -H "Host: creativorare.localhost" http://localhost:8088/api/v1/public/activities/fnm`  
  and Form Studio Design tab saved theme JSON.

## Hypotheses

| ID | Hypothesis | Status | Notes |
|----|------------|--------|-------|
| H1 | Activity still **Modern Centered / classic** in DB | Open | Matches screenshot; default if operator never saved Split/Poster |
| H2 | **Basic plan** blocked Split save; UI shows Centered | Open | `RegistrationExperiencePlanGate.EnsureAllowed` on save |
| H3 | **Legacy preset** overrides (card/immersive) | Open | Non-classic preset wins before experience layout |
| H4 | **Stale Docker** image pre-5ad437a | Open | User must verify container SHA vs `main` |
| H5 | **Visual quality gap** — Modern Centered intentionally similar to Classic | **Confirmed (code)** | Not a propagation bug; product differentiation for Split/Poster/Conversational requires those layouts |

## Operator checklist (local)

1. Compare running API/web image or bind-mount SHA to `5ad437a` / `3a64c74`.
2. GET public activity JSON (see curl above). Record `preset`, `resolvedExperience.layout|style|flow`.
3. Form Studio → activity `fnm` → Design: record saved `registration_theme` (do not change yet).
4. Tenant Admin → plan (Basic/Core/Pro).
5. If Core+: save Split → reload public → expect **two-column** at lg+ (`lg:grid-cols-[...]` in DOM).

## Recommendation (pending user API/DB row)

Most likely **H5 + H1**, not propagation failure — unless API shows `layout: split` but DOM remains single column (then **H4 or web bug**).

Follow-up story candidate (do not reopen Epic 35): **Modern Centered visual-quality correction** if API confirms `layout: centered` and product expects stronger differentiation from legacy Classic.
