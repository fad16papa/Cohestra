---
title: Cohestra Product Experience 2.0 — visual QA matrix
phase: 0.1
status: audit-complete
created: 2026-09-22
updated: 2026-09-22
head_phase0: 5c3fe75d
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

**This run’s environment:** Personal Cloud VM lacked the advertised Cohestra snapshot. Native API `:8080` + Next `:3000`. Phase 0 captured marketing + Pro admin. Phase 0.1 completed remaining coverage, local fixtures, a11y, performance, and checks.

Do not fabricate screenshots. Durable evidence: `_bmad-output/planning-artifacts/evidence/px2-phase01/` (repository-relative). Walkthrough copies also exist under `/opt/cursor/artifacts/px2_*.png`.

---

## 1. Viewport × route coverage

### Marketing / auth

| Surface | 1440 | 1280 | 1024 | 768 | 430 | 390 | Notes |
|---------|------|------|------|-----|-----|-----|-------|
| `/` marketing | LIVE | LIVE | LIVE | LIVE | LIVE | LIVE | Cookie banner covers CTAs at 390; nav “Document” |
| `/pricing` | LIVE | LIVE | LIVE | LIVE | LIVE | LIVE | 4 plan cards; compare table omits Enterprise |
| `/docs` | LIVE | — | LIVE | LIVE | — | LIVE | CORE set |
| `/privacy` `/terms` | LIVE | — | — | — | — | — | Phase 0.1 1440 legal pages |
| `/login` apex | LIVE | LIVE | LIVE | LIVE | LIVE | LIVE | |
| `/login` tenant host | LIVE | LIVE | LIVE | LIVE | LIVE | LIVE | workspace notice `default.localhost:3000` |
| `/platform/login` | LIVE | — | LIVE | LIVE | — | LIVE | Phase 0.1 login succeeded after local hash align |
| `/signup` | LIVE | — | LIVE | LIVE | — | LIVE | recaptcha off |
| `/register` bootstrap | LIVE | — | LIVE | LIVE | — | LIVE | “One workspace, one operator.” |
| `/forgot-password` | LIVE | — | LIVE | LIVE | — | LIVE | |
| `/reset-password` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | not opened |
| `/invite/accept` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | needs token |

### Tenant public

| Surface | 1440 | 1280 | 1024 | 768 | 430 | 390 | Notes |
|---------|------|------|------|-----|-----|-----|-------|
| `{slug}/` stub | LIVE | — | — | — | — | — | `px2-basic` + `px2-onhold` public doors |
| `{slug}/` SitePage / stub mix | LIVE | — | LIVE | LIVE | — | LIVE | `default.localhost:3000/` opened (Pro) |
| `{slug}/` Suspended | LIVE | — | — | — | — | — | `px2-suspended` “is on hold” |
| `/register/demo-marina-social-meetup` Centered | LIVE | LIVE | LIVE | LIVE | LIVE | LIVE | activity band + form; 11 going; no overflow observed |
| `/register/demo-wellness-morning-yoga` | LIVE | — | LIVE | LIVE | — | LIVE | second published shell |
| `/register/{slug}` Split / Poster / Conversational | LIVE | — | — | — | — | — | Design tab live preview, **not saved**; public theme left Centered |
| Embed register | LIVE | — | — | — | — | LIVE | chrome-light marina embed |
| Success | LIVE | — | — | — | — | — | `REG20260922000101` disposable |
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
| `/activities/new` | LIVE | — | — | — | — | — | Phase 0.1 |
| Activity overview / form / design | LIVE | — | LIVE | — | — | LIVE | Phase 0 archived first card; 0.1 used published marina |
| Form Studio preview D/T/M | LIVE | — | LIVE | — | — | LIVE | published marina Build + Preview |
| Communities / categories | LIVE | — | — | — | — | — | 1440 |
| `/clients` | LIVE | LIVE | LIVE | LIVE | LIVE | LIVE | chips + table 1440; cards 390; Active chip truncates |
| `/clients?followUpDue=true` | LIVE | — | — | — | — | LIVE | |
| `/clients/{id}` | LIVE | — | — | — | — | LIVE | James Rivera after reseed |
| `/campaigns` | LIVE | — | LIVE | — | — | LIVE | Pro populated |
| `/campaigns/new` + dialogs | LIVE | — | — | — | — | LIVE | Preview opened; **not sent** |
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
| Permission denied | inline copy; no component | LIVE Member `/settings/team` → `/settings` |
| Entitlement gated | `UpgradePanel` Website/Campaigns/Reports/Team/templates | LIVE Basic Website + Campaigns priced panels |
| Destructive | archive, delete community/category, remove member, suspend, revert website | CODE / BLOCKED |
| Success | publish dialog, registration success, billing toast, campaign sent | LIVE registration success |
| 404 / crash | Next default (no `not-found.tsx` / `error.tsx`) | LIVE `/nope-px2-audit` |

### Platform

| Surface | All viewports | Notes |
|---------|---------------|-------|
| `/platform` | LIVE | directory; fixture tenants; hide-demo checkbox hid `default` |
| `/platform/tenants/{id}` | LIVE | `px2-basic` detail (no suspend clicked) |
| `/platform/support*` | LIVE | inbox empty |

---

## 2. Cross-cutting check matrix

| Check | Method available this run | Result |
|-------|---------------------------|--------|
| Keyboard / focus order | LIVE | 18-tab pass on dashboard: sidebar then footer. Logical. Visible focus often `outline: none` + weak shadow |
| Landmarks / semantics | LIVE + CODE | Settings: **2 `<main>`**, h1 `Settings` + `Default`. No skip link (count 0) |
| Accessible names | LIVE | Chrome labelled. Intelligence numeric links lack extra names |
| Contrast | LIVE meter + tokens | `--stone`/`--paper` **3.00:1** (85 unique fails). `--gold` **3.13:1**. Cinema stone **5.88:1** (unused on admin) |
| Touch targets | LIVE | Desktop chrome 32–36px; mobile chips/icons 32px; public Join ~48px |
| Zoom / reflow | LIVE | CSS zoom 200% on 720×450; overflow 0 |
| Reduced motion | LIVE | Sampled `transitionDuration: 0s` |
| Overflow / truncation | LIVE | Admin captured routes: **scrollWidth − clientWidth ≤ 1**. Clients 390: Active chip truncates |
| Console / hydration | LIVE | Isolated **POST /api/v1/admin/billing/sync → 503**. Basic Website **GET /admin/site → 500** |

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

**Still ENVIRONMENT-BLOCKED:** Paddle checkout, invite-accept token, signup verify, VoiceOver/NVDA, production RUM.

**Closed in 0.1:** Split/Poster/Conversational (Design preview, unsaved); embed; registration success; published Form Studio; client profile; campaign compose/preview; communities/categories; Platform console; Member/Basic/Suspended/OnHold fixtures; keyboard; contrast; zoom; reduced motion; performance.

---

## 5. Artifact policy

Durable Phase 0.1 screenshots live at `_bmad-output/planning-artifacts/evidence/px2-phase01/` and must be referenced with repository-relative paths. Do not use `blob:vscode-file` URLs.

Do not reuse cinema-audit PNGs as operator evidence.

See `cohestra-ux-audit.md` Phase 0.1 closure table for VERIFIED / ENVIRONMENT-BLOCKED / PRODUCT-DEFECT / DEFERRED dispositions.
