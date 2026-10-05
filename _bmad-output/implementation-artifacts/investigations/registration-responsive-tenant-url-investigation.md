# Investigation: Registration responsive + Core/Pro tenant website URL

## Hand-off Brief

1. **What happened.** Owner asked for fully responsive public registration plus an optional Core/Pro tenant-website URL in Form Studio, with Basic showing no option. Current HEAD already has both capabilities; remaining defects are preview layout-context (viewport media queries ignore the 390px frame), poster preview width mismatch, incomplete plan-matrix/embed tests, and FormTemplate persist that does not normalize the publisher-link flag.
2. **Where the case stands.** Concluded. Owner + current code are authoritative. Stale “Pro-only Website Builder” docs do not require a plan-matrix change. Silent Basic normalize (not 403) is the downgrade-safe persist convention.
3. **What's needed next.** One hardening story: container-query layout context, poster preview 480, template normalize, plan-matrix/responsive tests, real-browser checkpoint. Do not rebuild Form Studio or invent a free-form URL field.

## Case Info

| Field            | Value |
| ---------------- | ----- |
| Ticket           | Owner product requirement 2026-10-05 |
| Date opened      | 2026-10-05 |
| Status           | Concluded |
| System           | Cohestra HEAD `53bd0c11` (origin/main); work branch `cursor/registration-responsive-tenant-url-8d20` |
| Evidence sources | Source, unit tests, e2e specs, contracts, sprint-status |

## Problem Statement

Public registration must be excellent on desktop and mobile browsers. During Form Studio design/creation, Core and Pro may optionally surface the tenant’s canonical Cohestra website URL. Basic must not see, persist, or receive that option. Website Builder absence must not cripple Basic registration.

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------ | ----- |
| Public renderer | Available | `PublicRegistrationOpen` is the single renderer; preview reuses it |
| Form Studio website control | Available | Form tab, `isCoreOrAbove(plan)` — absent for Basic, not disabled |
| Plan gate | Available | `FormSchemaPlanGate` normalize + EnsureAllowed |
| Activity save path | Available | Always normalizes; EnsureAllowed skipped unless other gated features |
| Template save path | Available | Duplicated gate; no publisher normalize |
| Tenant URL builder | Available | `TenantPublicWebUrlBuilder` / `buildTenantPublicSiteUrl` |
| Responsive e2e | Partial | 320/375/412/768/1440 overflow; embed is top-level 360 not iframe |
| Plan-matrix e2e | Missing | No Form Studio / API e2e for website connection |
| Stale pricing docs | Available | `docs/marketing/pricing-tiers.md` still says Pro-only builder |

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| - | --------------- | -------- | ------ | ----- |
| 1 | Public renderer + preview | High | Done | Single renderer; preview CSS max-width only |
| 2 | Entitlements + persist | High | Done | Basic UI absent; save normalizes; templates gap |
| 3 | Tenant URL architecture | High | Done | Reuse existing builders; public href = request origin |
| 4 | Correct-course needed? | High | Done | No — owner + code agree Core has Website Builder |

## Timeline of Events

| Time | Event | Source | Confidence |
| ---- | ----- | ------ | ---------- |
| Epic 35–36 | Modern form + Form Studio preview | sprint-status | Confirmed |
| Prior owner slice | `showPublisherWebsiteLink` + Form tab control | code on main | Confirmed |
| 2026-10-05 | Owner restates responsive + plan-true website option | this request | Confirmed |
| 2026-10-05 | Story 42.3 remains `review` on other branch | sprint-status | Confirmed |

## Confirmed Findings

### Finding 1: Single public renderer already exists

**Evidence:** `web/components/registration/public-registration-open.tsx`, `web/components/registration/registration-public-preview-shell.tsx:126-145`

**Detail:** Form Studio Preview mounts `PublicRegistrationOpen` with `variant="preview"`. No second preview tree.

### Finding 2: Public layout is already bounded and overflow-guarded

**Evidence:** `web/components/layouts/public-form-layout.tsx:22-45`, `web/e2e/registration-responsive.spec.ts:7-70`

**Detail:** Centered/card/immersive use `max-w-[720px]`. Poster uses `max-w-[480px]`. E2E asserts no document overflow at 320/375/412/768/1440.

### Finding 3: Form Studio preview does not receive a mobile layout context

**Evidence:** `web/lib/registration-preview-viewport.ts:53-73`; Tailwind `sm:`/`lg:` in `public-registration-open.tsx:323`, `registration-composition-renderer.tsx:126`

**Detail:** Preview only applies `max-w-[390px]`. Media queries still see the operator browser viewport, so columns/split can render desktop rules inside the mobile frame. Split also uses `w-screen`, escaping the preview chrome.

### Finding 4: Poster desktop preview is wider than public poster

**Evidence:** public poster `max-w-[480px]` (`public-registration-open.tsx:285`); preview desktop fallback `max-w-[720px]` (`registration-preview-viewport.ts:69-73`)

### Finding 5: Core/Pro optional website control already matches owner UX

**Evidence:** `web/components/activities/activity-form-tab.tsx:832-882`

**Detail:** Form tab “Website connection” checkbox, derived hostname via `resolvePublicSiteDisplayUrl` / `buildTenantPublicSiteUrl`. Absent when `!isCoreOrAbove(plan)`. Does not block save/preview/publish.

### Finding 6: Server Basic persist is normalize-to-omit, not 403

**Evidence:** `ActivityService.cs:1334-1338`, `FormSchemaPlanGate.cs:15-18`, `docs/contracts/activity-form-schema-v1.md:32`

**Detail:** `EnsureAllowed` would throw for Basic+true, but activity save only calls it when other gated features exist, then always normalizes. Contract text claiming 403 is stale. 403 on leftover `true` after downgrade would block Basic form saves.

### Finding 7: Form templates do not normalize the publisher flag

**Evidence:** `FormTemplateService.cs:316-364`

### Finding 8: Public website href uses request origin, not SSR URL builder

**Evidence:** `publisher-website-url.ts:161-165`, `signup-api.ts:274-317`

**Detail:** `buildTenantDashboardUrl` falls back to `{slug}.cohestra.app` when `window` is undefined. Using it on the SSR registration page would leak production hosts from UAT. Request origin is the environment-aware public contract.

### Finding 9: Canonical `/register/{slug}` is independent of Website Builder

**Evidence:** `ActivityService.cs` share URL via `TenantPublicWebUrlBuilder`; Basic public footer is marketing apex only (`buildPublicRegistrationLayoutFooterLink`)

## Deduced Conclusions

### Deduction 1: This is hardening, not a greenfield feature

**Based on:** Findings 1, 2, 5, 6, 9

**Conclusion:** Do not create a second renderer, URL field, or entitlement system.

### Deduction 2: Preview parity requires a container layout context

**Based on:** Findings 3, 4

**Conclusion:** Mark public/embed/preview roots as `@container` and convert layout-critical `sm:`/`lg:` to `@sm:`/`@lg:`. Keep split `w-screen` breakout for the public page only.

### Deduction 3: Basic persist must ignore, not reject

**Based on:** Finding 6

**Conclusion:** Normalize on every persist path (activity + template). Public renderer already ignores by plan even if JSON still holds a stale true until next save.

### Deduction 4: bmad-correct-course is not required

**Based on:** Finding 5, owner matrix, current Website Studio Core Essentials

**Conclusion:** Stale Pro-only builder docs lose to owner + code. Persist 403 vs ignore is a contract-doc fix, not a plan-matrix change.

## Hypothesized Paths

### Hypothesis 1: Owner wanted a new free-form URL field

**Status:** Refuted

**Theory:** Add an arbitrary external URL input.

**Resolution:** Owner forbids this unless repository truth already supports it. It does not.

### Hypothesis 2: Control belongs on Design tab

**Status:** Refuted for this slice

**Theory:** Move Website connection to Design.

**Resolution:** Current Form-tab placement is next to closed-message / close-at (publication behavior), not visual tokens. Sally: keep Form tab; do not scatter.

### Hypothesis 3: API must 403 Basic crafted enable

**Status:** Refuted as the persist rule

**Theory:** Contract 403 is required.

**Resolution:** Owner allows rejected *or* ignored. Ignore/normalize is the only rule that keeps Basic saves working after downgrade.

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | ------ | ------------- |
| Live UAT tenant-host click-through | Environment-aware host proof | Checkpoint preview on local `{slug}.localhost` + note UAT `{slug}.uat.cohestra.app` builder tests |
| Real device Safari | Mobile-browser class proof | Playwright mobile emulation + checkpoint viewports |

## Source Code Trace

| Element | Detail |
| ------- | ------ |
| Error origin | Preview media queries vs preview frame width |
| Trigger | Operator opens Form Studio Mobile preview on a wide desktop |
| Condition | Tailwind `sm:`/`lg:` see 1440px operator viewport |
| Related files | preview viewport, public-registration-open, composition renderer, FormSchemaPlanGate, FormTemplateService, activity-form-tab, publisher-website-url |

## Conclusion

**Confidence:** High

The product already has one public registration renderer, Core/Pro optional tenant-website linking, Basic absence, environment-aware hostname builders, and canonical `/register/{slug}` for every plan. The owner requirement is met by hardening preview layout context, poster preview width, template normalize, and closing test/evidence gaps — not by rebuilding.

## Recommended Next Steps

### Fix direction

1. CSS container queries on public/embed/preview roots; layout-critical container variants.
2. Poster desktop preview `max-w-[480px]`; split `w-screen` only on public variant.
3. FormTemplate + Activity persist: normalize first, then EnsureAllowed.
4. Update contract: Basic persist ignores/normalizes publisher flag.
5. Plan-matrix integration + Form Studio / responsive / embed iframe tests.
6. Real-browser checkpoint matrix.

### Diagnostic

Vitest source contracts + integration PUT + Playwright live-stack viewports.

## Reproduction Plan

1. Form Studio on desktop ≥1280: Mobile preview of a two-column Core form — columns must stack (container < 640).
2. Basic tenant Form tab: no Website connection copy.
3. Basic PUT `showPublisherWebsiteLink: true`: 200, stored null; registration still publishes.
4. Core checkbox off: public page has no tenant website link; `/register/{slug}` still works.

## Side Findings

- Story 42.3 is `review` on `cursor/story-42-3-form-studio-touch-controls-0fcb` (PR #387). This work must not land on that branch.
- Epic 42.4 and Epic 43 stay unstarted.
- `PlatformSupportReportServiceTests` Monday-UTC flake is pre-existing and unrelated.
