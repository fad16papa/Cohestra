---
title: Cohestra Product Experience 2.0 — visual QA matrix
phase: 0
status: baseline
created: 2026-09-22
head: bc5cc43f
viewports:
  - 1440x900
  - 1280x800
  - 1024x768
  - 768x1024
  - 430x932
  - 390x844
checks:
  - keyboard / focus order / focus visibility
  - landmarks / semantics / accessible names
  - contrast
  - touch targets
  - zoom / reflow
  - reduced motion
  - overflow / truncation
  - console errors / hydration warnings
---

# Visual QA matrix

Cells record **this Phase 0 run**. They are not a promise that the product passes.

| Code | Meaning |
|------|---------|
| LIVE | Opened in this run’s browser; notes attached |
| CODE | Inspected in source only |
| E2E | Covered by existing Playwright (may be skipped without live stack) |
| BLOCKED | Environment, auth, seed, or third-party prevented inspection |
| N/A | Viewport or state does not apply |

**This run’s environment:** Personal Cloud VM lacked the advertised Cohestra snapshot. Postgres 16, Redis, .NET 9.0.318, and `web/node_modules` were installed without editing application source. API + Next were started in tmux. Operator login on `http://default.localhost:3000/login` succeeded (Pro, Trialing, 48 clients, 10 activities). Playwright captured marketing, public registration, and authenticated admin at the six viewports. PlatformAdmin login returned **Invalid email or password** — platform console remains BLOCKED.

Do not fabricate screenshots. Representative PNGs: `/opt/cursor/artifacts/px2_*.png` and `/tmp/px2-qa/`.

---

## 1. Viewport × route coverage

### Marketing / auth

| Surface | 1440 | 1280 | 1024 | 768 | 430 | 390 | Notes |
|---------|------|------|------|-----|-----|-----|-------|
| `/` marketing | LIVE | LIVE | LIVE | LIVE | LIVE | LIVE | Cookie banner covers CTAs at 390; nav “Document” |
| `/pricing` | LIVE | LIVE | LIVE | LIVE | LIVE | LIVE | 4 plan cards; compare table omits Enterprise |
| `/docs` | LIVE | — | LIVE | LIVE | — | LIVE | CORE set |
| `/privacy` `/terms` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | not opened this pass |
| `/login` apex | LIVE | LIVE | LIVE | LIVE | LIVE | LIVE | |
| `/login` tenant host | LIVE | LIVE | LIVE | LIVE | LIVE | LIVE | workspace notice `default.localhost:3000` |
| `/platform/login` | LIVE | — | LIVE | LIVE | — | LIVE | PlatformAdmin seed failed (invalid password) |
| `/signup` | LIVE | — | LIVE | LIVE | — | LIVE | recaptcha off |
| `/register` bootstrap | LIVE | — | LIVE | LIVE | — | LIVE | “One workspace, one operator.” |
| `/forgot-password` | LIVE | — | LIVE | LIVE | — | LIVE | |
| `/reset-password` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | not opened |
| `/invite/accept` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | needs token |

### Tenant public

| Surface | 1440 | 1280 | 1024 | 768 | 430 | 390 | Notes |
|---------|------|------|------|-----|-----|-----|-------|
| `{slug}/` stub | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | demo tenant is Pro; Basic unseeded |
| `{slug}/` SitePage / stub mix | LIVE | — | LIVE | LIVE | — | LIVE | `default.localhost:3000/` opened (Pro) |
| `{slug}/` Suspended | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | unseeded |
| `/register/demo-marina-social-meetup` Centered | LIVE | LIVE | LIVE | LIVE | LIVE | LIVE | activity band + form; 11 going; no overflow observed |
| `/register/demo-wellness-morning-yoga` | LIVE | — | LIVE | LIVE | — | LIVE | second published shell |
| `/register/{slug}` Split / Poster / Conversational | E2E | E2E | E2E | E2E | E2E | E2E | e2e exists; **not switched live this pass** (would mutate theme) |
| Embed register | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | |
| Success | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | not submitted (avoid mutating demo) |
| Unavailable / full / plan-limit | CODE | CODE | CODE | CODE | CODE | CODE | `PublicRegistrationUnavailable` |

### Admin — populated (default demo = Pro Trialing **when seed completes**)

| Surface | 1440 | 1280 | 1024 | 768 | 430 | 390 | Notes |
|---------|------|------|------|-----|-----|-----|-------|
| `/dashboard` overview | LIVE | LIVE | LIVE | LIVE | LIVE | LIVE | Needs attention + view switcher; ⌘K copy on phone; calendar FAB overlaps |
| `/dashboard` graphs | LIVE | — | — | — | — | — | 1440 captured |
| `/dashboard` tables | LIVE | — | — | — | — | — | 1440 captured |
| `/dashboard/website` build | LIVE | LIVE | LIVE | LIVE | LIVE | LIVE | first-run tour overlay; Edit/Preview on 390; Home tab active |
| `/dashboard/website` preview | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | tour not dismissed (avoid mutating) |
| `/activities` | LIVE | LIVE | LIVE | LIVE | LIVE | LIVE | list includes archived first |
| `/activities/new` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | not opened |
| Activity overview / form / design | LIVE | — | LIVE | — | — | LIVE | first card was **archived** — form read-only; composition builder not in first viewport |
| Form Studio preview D/T/M | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | published-activity recapture timed out |
| Communities / categories | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | not opened |
| `/clients` | LIVE | LIVE | LIVE | LIVE | LIVE | LIVE | chips + table 1440; cards 390; Active chip truncates |
| `/clients?followUpDue=true` | LIVE | — | — | — | — | LIVE | |
| `/clients/{id}` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | href resolved; follow-up recapture timed out |
| `/campaigns` | LIVE | — | LIVE | — | — | LIVE | Pro populated |
| `/campaigns/new` + dialogs | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | not opened (avoid send) |
| `/reports` weekly | LIVE | — | LIVE | LIVE | — | LIVE | |
| `/settings` | LIVE | LIVE | LIVE | LIVE | LIVE | LIVE | **2 × `<main>`**, h1 Settings + Default |
| `/settings/team` | LIVE | — | — | — | — | LIVE | dual h1 “Team” |
| `/settings/billing` | LIVE | — | — | — | — | LIVE | dual h1 “Billing” |
| `/billing/checkout` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Paddle third-party |

### Admin — empty / loading / error / gated / denied / destructive / success

| State | How it exists | Live |
|-------|---------------|------|
| Dashboard empty | `DashboardEmptyState` when `totalCount === 0` | BLOCKED (demo has activities) |
| List empty | `ProductEmptyState` activities/clients/campaigns | BLOCKED |
| Loading | `ListSkeleton` / `MetricSkeletonGrid` / `ProfileSkeleton` / “Loading admin workspace…” | BLOCKED (flash only) |
| Error | `ProductErrorState` on dashboard/activity/client; inline elsewhere | BLOCKED (need API down) |
| Disabled | publish gates, export disabled, locked palette items | CODE / BLOCKED |
| Permission denied | inline copy; no component | BLOCKED (no Member) |
| Entitlement gated | `UpgradePanel` Website/Campaigns/Reports/Team/templates | BLOCKED (demo is Pro; Basic unseeded) |
| Destructive | archive, delete community/category, remove member, suspend, revert website | CODE / BLOCKED |
| Success | publish dialog, registration success, billing toast, campaign sent | BLOCKED |
| 404 / crash | Next default (no `not-found.tsx` / `error.tsx`) | BLOCKED |

### Platform

| Surface | All viewports | Notes |
|---------|---------------|-------|
| `/platform` | BLOCKED | needs PlatformAdmin login |
| `/platform/tenants/{id}` | BLOCKED | suspend/archive destructive |
| `/platform/support*` | BLOCKED | |

---

## 2. Cross-cutting check matrix

| Check | Method available this run | Result |
|-------|---------------------------|--------|
| Keyboard / focus order | CODE + partial LIVE | CODE: Button has ring; gaps on pulse/queue/studio tabs/toasts/custom dialogs. Full Tab pass not run |
| Landmarks / semantics | LIVE + CODE | Settings: **2 `<main>`**, h1 `Settings` + `Default`. Team/Billing: two h1s with the same label. Shell landmarks otherwise present. No skip link |
| Accessible names | CODE | Many `aria-label`s on dashboard; command palette Search labelled |
| Contrast | Token math | `--stone`/`--paper` **3.00:1**. Cinema stone **5.88:1**. Dark muted **8.90:1**. LIVE meter not run |
| Touch targets | LIVE + CODE | Mobile tab bar present and tappable-looking; calendar FAB overlaps cards/queue; Form Studio handle not measured on published build (archived form only) |
| Zoom / reflow | LIVE | BLOCKED (not zoomed) |
| Reduced motion | CODE + one shot | Dashboard 1440 `prefers-reduced-motion: reduce` captured; campaign dialogs not slotted |
| Overflow / truncation | LIVE | Admin captured routes: **scrollWidth − clientWidth ≤ 1**. Clients 390: Active chip truncates. Activity title truncates in mobile chrome |
| Console / hydration | LIVE | Every authenticated admin page logged **503** (resource unidentified in notes). Website also **404** (missing assets). Hydration warnings not isolated |

---

## 3. Existing automated visual/responsive evidence (not this run)

| Spec | Asserts | Gate |
|------|---------|------|
| `web/e2e/registration-responsive.spec.ts` | public register 320–1440 no overflow | live stack |
| `web/e2e/form-experience-epic-35.spec.ts` | 4 experiences × 1440/1024/768/430/390/360 | `E2E_LIVE_STACK=1` |
| `web/e2e/form-studio-preview-36-6.spec.ts` | Desktop/Tablet/Mobile preview widths | live |
| `web/e2e/form-studio-design-36-5*.spec.ts` | style + token + viewport | live |
| `web/e2e/smoke.spec.ts` | marketing/login visible | Compose `:8088` default |
| Cinema audit 2026-09-05 | marketing `#crm` only | **out of scope** for operator console |

**GAP:** no e2e for Member vs Admin, UpgradePanel, billing banners, Suspended maintenance, platform console, skip link, or admin 6-viewport matrix.

---

## 4. Minimum safe actions to unblock LIVE cells

1. Confirm `curl -s http://localhost:8080/health` and `http://localhost:3000` return 200.  
2. Login `operator@cohestra.local` / `ChangeMe123!` on `http://localhost:3000/login`.  
3. Capture the six viewports on: dashboard (3 views), clients, client profile, activities, activity Form/Design, website, reports, settings, campaigns.  
4. Public: `http://default.localhost:3000/register/{demo-slug}` for each Epic 35 shell.  
5. **Do not** change UI to create empty/gated states. Use a second tenant or LoadTest Basic (`load.basic.alpha@cohestra.local`) if LoadTest seed is enabled.  
6. Member / Suspended / OnHold: add **dev seed fixtures** only after PO D12 — not a production behavior change.

**Completed this run:** marketing + login + public Marina/Yoga registration + authenticated Pro admin (dashboard/clients/activities/website/reports/campaigns/settings/team/billing) at the six viewports (CORE subset where noted). Zero measured horizontal overflow on those admin URLs.

**Still BLOCKED / partial:** Split/Poster/Conversational live switch; embed; registration success (not submitted); published Form Studio three-pane; client profile; campaign compose dialogs; communities/categories; checkout; Platform console UI; Member; Basic; Suspended; OnHold; keyboard Tab pass; contrast meter.

---

## 5. Artifact policy

Phase 0 screenshots, when captured, belong under walkthrough artifacts (immutable) and should be referenced by route + viewport + state. None are attached at first write because no authenticated LIVE pass has completed.

Do not reuse cinema-audit PNGs as operator evidence.
