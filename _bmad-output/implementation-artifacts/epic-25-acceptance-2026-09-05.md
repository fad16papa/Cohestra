# Epic 25 Acceptance — Registration Experience Studio

**Date:** 2026-09-05  
**Decision:** **CLOSE / FREEZE**  
**Tracker:** `epic-25` + 25.1–25.5 → `done`  
**Freeze record:** `_bmad-output/planning-artifacts/epic-25-frozen.md`  
**Scope of this pass:** completion / acceptance only. No redesign. No new stories.

## Current state

| Item | State on `main` |
|------|-----------------|
| Implementation | Merged (PR #182 + follow-ups #191, #192, #193, #198) |
| Story files | Tasks complete; status was stuck in `review` |
| Sprint tracker | Was `epic-25: in-progress`, stories `review` |
| Code review | 2026-08-12 — patches applied; residuals deferred on purpose |
| Operator UAT | Signed off 2026-08-22 (Design tab + public presets + branding) |
| Prior close attempt | Retro + UAT lived on `cursor/epic-25-retro-ci-fix-4da3` and **never merged** |

The public door is live product, not cinema: community brand kit, activity Design/Form tabs, `/register/[slug]`, `/embed/register/[slug]`.

## PASS / FAIL by story

| Story | Verdict | Evidence |
|-------|---------|----------|
| **25.1 Community brand kit** | **PASS** | `Community` stores logo/accent/hero. PATCH persists; GET returns `CommunityResponse`. Basic logo is 403 `plan_locked` (`CommunityPlanLockedException`). Invalid accent/hero → 400 via `CommunityBrandingValidator`. Admin UI at `/activities/communities/{id}` (`community-brand-kit-panel.tsx`) with Core+ logo gate. |
| **25.2 Activity registration theme** | **PASS** | Separate `registration_theme` jsonb. Resolver: theme override → community kit (when inherit) → legacy activity fields. `inherit=false` skips community kit (`RegistrationThemeResolverTests`). Public GET exposes resolved preset/logo/accent/hero (`ActivityRegistrationThemeIntegrationTests`). |
| **25.3 Public preset renderer** | **PASS** | Classic / Card / Immersive / Compact in `public-registration-open.tsx`. Resolved accent sets `--primary`. Same tree on live register + embed. |
| **25.4 Design tab + preview** | **PASS** | `activity-design-tab.tsx` uses `PublicRegistrationOpen variant="preview"` with mobile/desktop toggle. Client WCAG AA warning; server rejects low-contrast **theme override**. |
| **25.5 Intro + section headers** | **PASS** | `form_schema.meta.introMarkdown` sanitized on public page. `section_header` is non-input (skipped in answers; label required). Form tab + public render + unit tests. |

### Audit dimensions (epic-level)

| Dimension | Result | Notes |
|-----------|--------|-------|
| Story completion | PASS | All tasks checked; code on `main` |
| Review status | PASS after this close | Was stale `review` only because the 2026-08-21 close never merged |
| UX consistency | PASS | Design tab is the branding home; preview uses the public renderer |
| Public registration quality | PASS | Four presets + inherited brand; confirmation email uses the same resolver (#198) |
| Activity / community integration | PASS | Inherit-by-default; rename no longer wipes brand kit |
| Plan gates | PASS | Basic cannot set community logo (API + UI). Presets are not Pro-gated; PRD allowed “Immersive when gated” |
| Mobile behavior | PASS | Design tab mobile preview; public presets sized for phone scan |
| Validation / errors | PASS | Accent/hero 400; contrast warn + override reject; form field `aria-invalid` |
| Accessibility | PASS for v1 | Required markers, described-by errors, radiogroup/pressed. Inherited accent contrast is client-warn only (deferred) |
| Operator usability | PASS | Brand once on community; override per activity; live preview before publish |
| Website promise consistency | PASS | Registration now inherits community identity instead of a generic platform form. Cinema Website chapter remains a separate frozen surface |
| Regression coverage | PASS with known gaps | Theme inherit + public GET tested. Missing: Basic logo 403 HTTP test, invalid-hero 400 HTTP test, inherit=false integration test |

## Remaining blockers

**None that keep Epic 25 open.**

These are already-accepted residuals from the 2026-08-12 review. They are **not** new 25.x stories:

1. Public activity Redis cache has **no TTL** and is **not invalidated** on community brand-kit PATCH. Inherited theme can lag until the activity is saved. First publish and activity-save paths resolve correctly (NFR-RES-1 caches the resolved payload).
2. Server contrast validation applies to theme **override** only; inherited community accent warns in the Design tab.
3. Logo asset IDs are not tenant-ownership-checked on public campaign-asset URLs.
4. Coverage gaps vs 25.1 AC5 wording: Basic logo 403 and invalid-hero 400 are implemented in runtime, not fully asserted over HTTP.

## Exact stories or fixes still required

**None.** Do not create 25.6 or polish tickets to keep the epic warm.

Optional later residuals (outside Epic 25, only if operators hit them):

- Invalidate public activity cache when a community brand kit changes
- Tenant ownership check on public logo asset URLs
- HTTP tests for Basic logo 403 / invalid hero 400

## Recommendation

**Close Epic 25.** Implementation, review patches, operator UAT, and this re-audit all agree the studio is acceptable. Enlarging the epic would be speculative work.

## Next BMAD workflow (locked product order)

Do **not** start Epic 19. Do **not** implement Cohestra AI in the same pass as this close.

1. **Just completed:** Epic 25 acceptance / tracker close (this document).
2. **Immediate next (fresh context):** `[PR] PRD` — `bmad-prd` **create** for the first committed Cohestra AI product surface (operator morning brief). Narrow MVP only: real tenant data, evidence, recommended actions, safe fallback, no chatbot.
3. **Then:** `bmad-ux` if the brief needs an operator UX spec; `bmad-spec` to lock the machine contract; `bmad-create-epics-and-stories` → `bmad-create-story` → `bmad-dev-story`.
4. **After AI MVP is product-complete:** Epic 19 — UAT deploy → smoke → payment/signup → operator acceptance → production sign-off.

Retrospective skill (`bmad-retrospective`) is already satisfied by `epic-25-retro-2026-08-21.md`. Do not run it again unless product asks for a new retro.
