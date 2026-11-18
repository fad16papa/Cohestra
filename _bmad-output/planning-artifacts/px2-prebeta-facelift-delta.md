---
title: Product Experience 2.0 — pre-beta facelift delta
status: implementation
base: release/uat
base_sha: fbfe3587384d2580998c2c4a8ea1f1e8c6f230e1
branch: feature/px2-prebeta-facelift
---

# Delta-only backlog

Epics 38–43 are already closed on this base. This pass does not reopen them.

## Ancestry

| Ref | SHA | Note |
|-----|-----|------|
| `release/uat` | `fbfe3587384d2580998c2c4a8ea1f1e8c6f230e1` | PR #568, first-admin invitation OTP |
| `main` | `a784ddf70ad5c8e6059d2c50496fadb72cdd7f98` | PR #567, same feature |
| Tree diff `main` vs `release/uat` | empty | OTP is already on UAT. No port required. |
| `feature/px2-prebeta-facelift` at start | same as `release/uat` | No prior facelift commits |

Public signup keeps its own email-verification code. First-admin activation stays on the invite path (`InviteActivation`), with password and membership created only after the code. This pass does not change those rules, CAPTCHA, legal acceptance, tenant isolation, or plan limits.

## Current vs outstanding

| Area | Already on UAT | This pass |
|------|----------------|-----------|
| Shell, rooms, entitlements, studios, motion | Epics 38–43 and 35–37 | Not restyled |
| First-admin OTP | PR #568 | Left intact |
| Public landing | Sports photo hero, “Under 1 hr”, rooms unnamed | Product-interface preview, canonical rooms, plan locks, no invented metrics |
| Pricing numbers | `pricing-plans.ts` matches `TenantPlanLimits` | Contrast only. Prices unchanged |
| Signup / verify | CAPTCHA, terms, email code, slug check | Clearer sequence and readable text. Rules unchanged |
| Dashboard first-use copy | “lead engine”, “mark a lead” | Canonical client / Follow-up language |
| Form Studio, Website Studio behavior | Shipped | Described, not modified |

## Acceptance

- Headline states the customer benefit: who registered, and who still needs a reply.
- Landing hero uses the Follow-up room's category labels and row layout (avatar, title, context caption, category chip). Website shows Core. Campaigns shows Pro.
- Preview titles are roles (new registration, returning client, known client). Captions are the product's own empty-state strings. No named people, counts, or customer results.
- Copy names Activities, Registration, Clients, Follow-up, Form Studio, Website Studio, Analytics, Campaigns, and Cohestra AI.
- Saved-form limits stated as Basic 1, Core 5, Pro 25.
- No stock sports hero, no named fictional clients, no “under an hour” claim, no testimonials.
- Basic / Core / Pro prices and limits stay the published contract.
- Signup still requires terms, password rules, slug availability, and CAPTCHA when enabled.
- Marketing and signup body text uses `--text-muted` / `--text-accent`, not `--stone` or `--gold`, on paper.
- Reduced motion already disables `.marketing-product-lift`. No new infinite animation.
- 390, 768, and 1440 widths do not grow horizontal scroll on the marketing home.

## Explicitly not in this pass

- Production deploy, public beta, or UAT promotion beyond the PR to `release/uat`.
- Rebuilding Form Studio, Website Studio, or admin room layouts.
- Changing OTP storage, rate limits, or invite accept for ordinary team members.
- New testimonials, usage statistics, or unshipped feature promises.

## Review of this implementation

Reviewed against the acceptance section above, `docs/DESIGN.md` room names, `TenantPlanLimits`, `FormTemplateSlotLimits`, and nav locks (`isCoreOrAbove` / `isProPlan`, Enterprise included).

| Severity | Count | Notes |
|----------|------:|-------|
| BLOCKER | 0 | |
| MAJOR | 0 | |
| MINOR | 1 | `signup-page-content.tsx` still has the pre-existing `react-hooks/set-state-in-effect` findings on slug sync. Behavior was not changed. |
| NIT | 0 | The earlier “Open” sample pills were replaced with the real category chips and empty-state captions. |

## Evidence

- `npm run build` in `web/` — compiled, TypeScript passed, 56 pages generated.
- Vitest: `landing-cinema-removed.test.ts`, `continuity-context.test.ts` passed.
- Production server `next start` on `/`: HTTP 200 at 1440, 768, and 390. No horizontal overflow. Start free is inside the first viewport. No sports hero image. No cookie discs on the hero. `prefers-reduced-motion: reduce` sets `.marketing-product-lift` animation to `none`.

## Beta readiness

This facelift can be reviewed for UAT through the protected pull request into `release/uat`. It does not authorize a UAT deploy by itself, a public beta, or production. Production remains NO-GO.

Branch protection on `release/uat` could not be read with this token (HTTP 403). No open pull requests targeted `release/uat` at the start of this pass. Post-merge CI and the existing UAT eligibility gate still decide deployment.
