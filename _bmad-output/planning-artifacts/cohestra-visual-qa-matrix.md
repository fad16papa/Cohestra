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

**This run’s environment:** Personal Cloud VM lacked the advertised Cohestra snapshot. Postgres 16, Redis, .NET 9.0.318, and `web/node_modules` were installed without editing application source. API + Next were started in tmux. Until API health + demo seed + login succeed, **all authenticated and public-registration cells stay BLOCKED**.

Do not fabricate screenshots.

---

## 1. Viewport × route coverage

### Marketing / auth

| Surface | 1440 | 1280 | 1024 | 768 | 430 | 390 | Notes |
|---------|------|------|------|-----|-----|-----|-------|
| `/` marketing | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Needs running Next; cinema `#crm` extra |
| `/pricing` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | interval toggle |
| `/docs` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | hash sections |
| `/privacy` `/terms` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | |
| `/login` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | + `reason=session-expired` |
| `/platform/login` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | |
| `/signup` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | recaptcha off in default env |
| `/register` bootstrap | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | stale one-operator copy (CODE) |
| `/forgot-password` `/reset-password` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | |
| `/invite/accept` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | needs token |

### Tenant public

| Surface | 1440 | 1280 | 1024 | 768 | 430 | 390 | Notes |
|---------|------|------|------|-----|-----|-----|-------|
| `{slug}/` stub | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | needs tenant host + Basic or unpublished |
| `{slug}/` SitePage | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Core/Pro published |
| `{slug}/` Suspended | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | unseeded |
| `/register/{slug}` Centered | E2E | E2E | E2E | E2E | E2E | E2E | `form-experience-epic-35.spec.ts` + `registration-responsive.spec.ts`; skip without `E2E_LIVE_STACK=1` |
| `/register/{slug}` Split | E2E | E2E | E2E | E2E | E2E | E2E | same |
| `/register/{slug}` Poster | E2E | E2E | E2E | E2E | E2E | E2E | same |
| `/register/{slug}` Conversational | E2E | E2E | E2E | E2E | E2E | E2E | interaction required |
| Embed register | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | |
| Success | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | e2e `registration-success-copy.spec.ts` live-only |
| Unavailable / full / plan-limit | CODE | CODE | CODE | CODE | CODE | CODE | `PublicRegistrationUnavailable` |

### Admin — populated (default demo = Pro Trialing **when seed completes**)

| Surface | 1440 | 1280 | 1024 | 768 | 430 | 390 | Notes |
|---------|------|------|------|-----|-----|-----|-------|
| `/dashboard` overview | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | |
| `/dashboard` graphs | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | `min-w-[40rem]` tables (CODE) |
| `/dashboard` tables | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | |
| `/dashboard/website` build | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Edit/Preview `<lg` (CODE) |
| `/dashboard/website` preview | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | |
| `/activities` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | |
| `/activities/new` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | |
| Activity overview | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | |
| Activity design | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Epic 35 controls |
| Form Studio build | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | 3-pane only ≥1280 (CODE) |
| Form Studio preview D/T/M | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | e2e 36.6 live-only |
| Communities / categories | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | |
| `/clients` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | cards `<sm`; grid scroll ≥sm |
| `/clients/{id}` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | |
| `/campaigns` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Pro only on demo |
| `/campaigns/new` + dialogs | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | A11Y-004 |
| `/reports` weekly | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | |
| `/settings` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | nested main (CODE) |
| `/settings/team` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | |
| `/settings/billing` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | |
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
| Keyboard / focus order | CODE + intended LIVE Tab | CODE: Button has ring; gaps on pulse/queue/studio tabs/toasts/custom dialogs. LIVE BLOCKED |
| Landmarks / semantics | CODE | Shell `aside`/`header`/`main`/`nav`. Settings nested `main`. Campaigns grid not a table. No skip link |
| Accessible names | CODE | Many `aria-label`s on dashboard; command palette Search labelled; some icon-only buttons labelled |
| Contrast | Token math | `--stone`/`--paper` **3.00:1**. Cinema stone **5.88:1**. Dark muted **8.90:1**. LIVE meter BLOCKED |
| Touch targets | CODE | Button 32/24; Form Studio handle `touch-none`; tab bar height ≳44 |
| Zoom / reflow | LIVE | BLOCKED |
| Reduced motion | CODE | `globals.css` PRM list; campaign dialogs not slotted; cinema also `matchMedia` |
| Overflow / truncation | CODE + e2e | Epic 35 e2e asserts no horizontal overflow (skipped without stack). Admin tables `min-w-[40rem]`/`[42rem]` |
| Console / hydration | LIVE | BLOCKED |

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

Until those complete, this matrix is an honest **BLOCKED** baseline, not a visual pass.

---

## 5. Artifact policy

Phase 0 screenshots, when captured, belong under walkthrough artifacts (immutable) and should be referenced by route + viewport + state. None are attached at first write because no authenticated LIVE pass has completed.

Do not reuse cinema-audit PNGs as operator evidence.
