# Sprint Change Proposal — Cohestra light-only appearance

Date: 2026-10-10
Workflow: bmad-correct-course + bmad-sprint-status
Model: Cursor Grok 4.6
Owner decision: one application appearance — LIGHT
Story 44.9 PR #430: FROZEN (not modified)

## Sprint status (at correction start)

- Main: `3fc6151517a4cd15a83e2d5c47a845c08b3b38a7`
- Epic 44: in-progress
- 44.1–44.8: done on main
- 44.9: separate draft PR #430 at `31da0413` — do not fold this correction into it
- This correction is an owner UX/product course change, not an Epic 44 story

## Trigger

Platform Overview rendered from dark/system preference: charcoal shell, washed KPI cards, inverted hierarchy. Owner supersedes Light/Dark/System as a user-selectable application mode.

## Historical decisions (valid then, superseded now)

| Artifact | Historical decision | Status |
|---|---|---|
| UX-DR4 | Settings → Appearance Light · Dark · System + profile persist | Superseded for application mode |
| UX-DR16 | ThemeToggle three-way control | Superseded |
| UX-DR17 / UX-DR18 / UX-DR30 | ThemeToggle in top bar / public footer | Superseded for the control only |
| Story 1.6 | Theme system + no-flash loader that can resolve dark | Superseded: first paint is always light |
| Story 1.7 | ThemeToggle component | Superseded |
| Story 1.11 | Settings Appearance | Superseded |
| Architecture theming row | next-themes Light/Dark/System | Superseded |
| DESIGN.md / EXPERIENCE.md Theme & Appearance | User-selectable modes | Superseded |

Do not rewrite those completion artifacts as if dark mode never shipped.

## Party-mode (John / Sally / Winston)

- **John:** One predictable Cohestra look. No settings tax. Brand accent stays a workspace control.
- **Sally:** Remove the control entirely; do not leave a disabled sun. Rebalance chrome after toggle removal. Light paper/card hierarchy for Platform.
- **Winston:** Delete the cross-cutting theme runtime (next-themes, ThemeScript resolver, public/operator storage, profile sync). Keep ThemePreference column as inert compatibility. Brand accent computes against the light surface only.

## Product contract

Application appearance mode is always light. OS `prefers-color-scheme`, old storage keys, and profile `themePreference` must not change the application skin. Form Studio / Website Studio / brand accent remain.

## Recommended path

Independent branch from current main. Draft PR. STOP before merge. If #430 merges first, rebase this correction onto the new main and re-review that HEAD.
