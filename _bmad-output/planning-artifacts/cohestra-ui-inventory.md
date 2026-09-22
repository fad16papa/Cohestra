---
title: Cohestra Product Experience 2.0 — UI inventory
phase: 0
status: baseline
created: 2026-09-22
head: bc5cc43f
evidence_classes:
  - CODE — inspected in repository at HEAD
  - LIVE — observed in this session's local browser/API
  - BLOCKED — environment or seed prevented inspection
  - INFERRED — labeled separately; not treated as fact
initiative: Product Experience 2.0
bmad: bmad-ux Phase 0 baseline (no DESIGN.md / EXPERIENCE.md finalize)
protected:
  - Epic 35 form layouts, flows, responsiveness, entitlements
  - Epic 36 composition schema, builder operations, renderer, submission
  - Epic 37 motion tokens 100 / 160 / 280 and reduced-motion architecture
---

# Cohestra UI inventory

Phase 0 route / state / role / plan inventory. Repository evidence is authoritative. Live cells that could not be opened in this environment are marked **BLOCKED** — they are not invented.

**HEAD:** `bc5cc43f` (`Merge pull request #337 … motion-polish-audit`).  
**Web:** Next.js App Router under `web/app`.  
**Guards:** `AdminRouteGuard` (`web/components/auth/admin-route-guard.tsx`), `PlatformRouteGuard` (`web/components/auth/platform-route-guard.tsx`).  
**Nav source:** `web/lib/admin-nav.ts`.  
**Plans in code:** `Basic` · `Core` · `Pro` · `Enterprise` (Enterprise treated as Pro for most gates).  
**Roles in code:** Identity `PlatformAdmin` / `TenantAdmin`; membership `TenantAdmin` / `TenantMember`. Web `ROLES` omits Member (`web/lib/auth-api.ts`).

There is **no** product FeatureFlag / LaunchDarkly catalog. Env/config toggles (`DemoDataSeed`, `Intelligence:SynthesisEnabled`, `SelfServeSignup`, `NEXT_PUBLIC_*`) are not per-route flags.

There is **no** named `PermissionDenied` component. Entitlement UI is `UpgradePanel`, `PlanLimitAlert`, inline copy, or API 403.

---

## How to read this inventory

| Column | Meaning |
|--------|---------|
| Path | URL or in-page view id |
| Kind | full route / in-page view / tab / dialog / sheet |
| Group | marketing · auth · public · admin · platform |
| Roles | who the **frontend** allows (API may be stricter) |
| Plan | UI/API gate if coded |
| States in code | empty · loading · error · disabled · denied · gated · destructive · success |
| Live this run | LIVE / BLOCKED / PARTIAL |

---

## A. Marketing and public door

| Path | Kind | File | Roles | Plan | States in code | Live |
|------|------|------|-------|------|----------------|------|
| `/` apex | full | `web/app/page.tsx` → `SiteLandingPage` / `MarketingHomePage` | anonymous; signed-in marketing visitors redirected via `resolvePostLoginPath` | none | hashes `#atelier` `#features` `#how-it-works` `#pricing` `#faq` `#crm` (cinema) | PARTIAL (stack start) |
| `/` tenant host | full | same → `SitePageRenderer` / `StubHome` / `TenantMaintenancePage` | anonymous | Basic → `StubHome` when `door.plan === "Basic"`; Core/Pro published site or stub | `preview` token; `suspended` → maintenance; `archived`/`unknown` → `notFound()` | BLOCKED until tenant host + API door |
| `/pricing` | full | `web/app/pricing/page.tsx` | anonymous | compares Basic/Core/Pro | monthly/annual toggle | PARTIAL |
| `/docs` | full | `web/app/docs/page.tsx` | anonymous | none | hash-selected section; search filter | PARTIAL |
| `/privacy` | full | `web/app/privacy/page.tsx` | anonymous | none | API version fail → bundled copy | PARTIAL |
| `/terms` | full | `web/app/terms/page.tsx` | anonymous | none | API version fail → bundled copy | PARTIAL |

**Cinema on `/#crm` is marketing-only.** Pill labels: Website · Clients · Activities · Follow-up · Analytics · Cohestra AI (`web/lib/marketing/product-slides.tsx`). Comment in file: does **not** rename admin routes.

---

## B. Auth

| Path | Kind | File | Roles | Plan | States in code | Live |
|------|------|------|-------|------|----------------|------|
| `/login` | full | `web/app/login/page.tsx` | operator door; PlatformAdmin mismatch copy | none | loading; `reason=session-expired`; `reset=1`; `email`+`invited=1` | PARTIAL |
| `/platform/login` | full | `web/app/platform/login/page.tsx` | platform door | none | `reason=session-expired` | PARTIAL |
| `/signup` | full | `web/app/signup/page.tsx` | anonymous | `plan=core\|pro` checkout hint | error; submitting; slug check; recaptcha/TOS | PARTIAL |
| `/signup/verify` | full | `web/app/signup/verify/page.tsx` | anonymous | paid plan → checkout | missing params → `/signup` | BLOCKED (needs signup session) |
| `/register` | full | `web/app/register/page.tsx` | first-time **operator bootstrap** (not public event reg) | none | form | PARTIAL |
| `/register/verify` | full | `web/app/register/verify/page.tsx` | anonymous | none | `email` query | BLOCKED |
| `/forgot-password` | full | `web/app/forgot-password/page.tsx` | anonymous | none | form | PARTIAL |
| `/reset-password` | full | `web/app/reset-password/page.tsx` | anonymous | none | `email`, `sent=1` | PARTIAL |
| `/invite/accept` | full | `web/app/invite/accept/page.tsx` | token required | none | loading; invalid token; form error | BLOCKED (no invite token) |

---

## C. Public registration

| Path | Kind | File | Roles | Plan | States in code | Live |
|------|------|------|-------|------|----------------|------|
| `/register/[slug]` | full | `web/app/(public)/register/[slug]/page.tsx` + `PublicRegistrationOpen` | anonymous | paused/full/close-at/`plan-limit` | `not-found`, `error`, `full`, `plan-limit`, `close-at`, `unavailable`, success `RegistrationSuccessScreen` | BLOCKED until API + published slug |
| `/embed/register/[slug]` | full | `web/app/embed/register/[slug]/page.tsx` | anonymous | same | same + chrome-light embed | BLOCKED |

**Protected Epic 35 shells (code):** `modern-centered` · `split-event` · `event-poster` · `conversational` (+ `card` / `immersive` / `compact`). One renderer: `PublicRegistrationOpen`. Hidden fields may prefill from query param = field id.

**Protected Epic 36:** `composition[]` render order + content/domain/columns; `fields[]` remain submit/validation source of truth. Content/structure/domain blocks are not submitted.

---

## D. Admin workspace

Chrome: `DashboardLayout` — sidebar (`md+`), top bar, billing banner, mobile tab bar (`<md`), command palette, `AdminRouteTransition` (pathname-only, 280 ms).

`AdminRouteGuard` allows any authenticated **non-PlatformAdmin**. It does **not** distinguish TenantAdmin vs TenantMember.

| Path | Kind | File / primary | Roles | Plan | States in code | Live |
|------|------|----------------|-------|------|----------------|------|
| `/dashboard` | full | `DashboardPageClient` | TenantAdmin, TenantMember | empty copy varies by plan; no hard lock | skeletons; `ProductErrorState`; `DashboardEmptyState`; overview/graphs/tables | BLOCKED until login |
| `/dashboard` `overview` | in-page | localStorage `cohestra.dashboard.viewMode` | same | — | onboarding checklist; follow-up queue; metrics; intelligence brief | BLOCKED |
| `/dashboard` `graphs` | in-page | same | same | — | charts + pulse | BLOCKED |
| `/dashboard` `tables` | in-page | same | same | — | tables + pulse | BLOCKED |
| `/dashboard/website` | full | `WebsiteBuilderPage` (nav **Website**) | same | **Basic → `UpgradePanel` Core** | loading; error; dirty; publish success; revert confirm; tour; checklist | BLOCKED |
| `/activities` | full | `ActivitiesListPage` | same | published-activity cap banners | `CardGridSkeleton`; empty; filters; archive | BLOCKED |
| `/activities/new` | full | `CreateActivityForm` | same | create warnings vs plan | catalog error; submit error | BLOCKED |
| `/activities/[id]` | full | `ActivityDetailPageClient` `?tab=` | same | Design/Form plan locks | loading; error; publish gates | BLOCKED |
| `/activities/[id]?tab=overview` | tab | overview | same | — | schedule, capacity, publish | BLOCKED |
| `/activities/[id]?tab=design` | tab | Design / Experience | same | Split/Poster **Core**; Conversational/Immersive **Pro** | locked controls | BLOCKED |
| `/activities/[id]?tab=form` | tab | **Form Studio** Build/Preview | same | recipes/columns/domain **Core**; split-into-steps **Pro** | empty; dirty; preview success | BLOCKED |
| `/activities/[id]?tab=registrations` | tab | registrations | same | — | list | BLOCKED |
| `/activities/[id]?tab=share` | tab | share kit | same | — | publish-gate issues | BLOCKED |
| `/activities/communities` | full | `CommunitiesListPage` | same | `isCommunitiesBlocked` | loading; error; delete dialog | BLOCKED |
| `/activities/communities/[id]` | full | `CommunityDetailPage` | same | default form template **Core** | loading; error; empty clients | BLOCKED |
| `/activities/categories` | full | `CategoriesListPage` | same | none in page | loading; error; delete | BLOCKED |
| `/clients` | full | `ClientsListPage` | same | filtered CSV **Core+**; campaign handoff **Pro** | `ListSkeleton`; empty; no-match; messenger confirm | BLOCKED |
| `/clients/[id]` | full | `ClientProfilePage` | same | none in page | `ProfileSkeleton`; error; merge-suspect | BLOCKED |
| `/campaigns` | full | `CampaignsListPage` | same | **non-Pro → UpgradePanel Pro** | skeleton; empty; list error; delivery checklist | BLOCKED |
| `/campaigns/new` | full | `CampaignComposePage` | same | no UpgradePanel in file (list gated; API `[RequireProPlan]`) | preview dialog; send confirm; `clientIds` | BLOCKED |
| `/campaigns/[id]` | full | `CampaignDetailPage` | same | none in file | loading; error; sent/failed/skipped | BLOCKED |
| `/reports` | full | `ReportsPageClient` | same | Basic + advanced filters → UpgradePanel Core | loading; stale; error; empty period; export disabled | BLOCKED |
| `/settings` | full | `SettingsPageContent` | Member: personal only; Admin: workspace | custom domain “coming soon” | section switcher; mobile Context sheet | BLOCKED |
| `/settings/team` | full | `SettingsTeamPageContent` | **TenantAdmin**; else redirect/copy | Basic `invitesAllowed=false` → UpgradePanel Core | loading; error; seat cap; remove/revoke | BLOCKED |
| `/settings/billing` | full | `SettingsBillingPageContent` | **TenantAdmin** | nav if Basic **or** billing owner | `billing=incomplete`; post-checkout sync | BLOCKED |
| `/billing/checkout` | full | `CheckoutPageContent` (admin guard) | authenticated tenant | `plan=core\|pro` | loading; canceled; deferred downgrade; sign-in copy | BLOCKED |
| `/billing/paddle-return` | full | `PaddleReturnPageContent` | `_ptxn` / `transactionId` | none | missing txn; collecting | BLOCKED (no Paddle txn) |

### Settings in-page sections (`activeId`, not URL)

| id | Label | adminOnly | Component |
|----|-------|-----------|-----------|
| `settings-plan` | Plan & limits | yes | `SettingsPlanUsageSection` |
| `settings-brand` | Brand accent | yes | `BrandAccentSection` (null if Member) |
| `settings-organization` | Organization | yes | `OrganizationTimezoneSection` |
| `settings-notifications` | Notifications | yes | `NotificationsSection` |
| `settings-embed` | Allowed embed hosts | yes | `AllowedEmbedHostsSection` |
| `settings-domain` | Custom domain | yes | `CustomDomainSection` — waitlist, not live |
| `settings-account` | Your account | no | `AccountSection` + `ChangePasswordSection` |
| `settings-support` | Help & support | no | `HelpSupportSection` |
| `settings-appearance` | Appearance | no | `AppearanceSection` |

### Website Studio in-page

Editor tabs: `design` | `sections` | `templates`. Workspace: `build` | `split` | `preview`. Mobile: `edit` | `preview`. Device: `phone` | `desktop`. Split only ≥1280 px (`WORKSPACE_SPLIT_MIN_WIDTH_PX`).

### Form Studio in-page (`FORM_STUDIO_MODES`, not URL)

`build` | `preview`. Three-pane grid is `xl:grid-cols-[…]` (**≥1280**, not the EXPERIENCE ≥1024).

### Clients URL state

`search`, `leadStatus`, `nationality`, `followUpDue`, `mergeSuspect`, `createdWithinDays`, `registeredWithinDays`, `activityId`, `activityName`, `sortBy`, `sortDir`, `page`.

### Reports URL state

`preset` (`weekly` default; `monthly`/`custom` = advanced), `from`, `to`, `activityId`, `community`, `leadStatus`, `referralSource`.

---

## E. Platform console

| Path | Kind | File | Roles | States | Live |
|------|------|------|-------|--------|------|
| `/platform` | full | tenant directory + create | PlatformAdmin | loading; error; empty match; create | BLOCKED until platform login |
| `/platform/tenants/[id]` | full | detail + ops | PlatformAdmin | loading; not found; suspend; archive; complimentary | BLOCKED |
| `/platform/support` | full | inbox | PlatformAdmin | loading; error; empty | BLOCKED |
| `/platform/support/[id]` | full | issue + snapshot | PlatformAdmin | loading; not found | BLOCKED |
| `/platform/support/report` | full | volume | PlatformAdmin | custom range not ready; empty | BLOCKED |

Platform layout does **not** use `AdminRouteTransition` (Epic 37 AD-1).

---

## F. Product names without a dedicated route

| Name (user / marketing) | Actual surface |
|-------------------------|----------------|
| Follow-up | Cinema slide `outreach`. Admin: dashboard `DashboardFollowUpQueue`; clients `followUpDue`; profile `ClientFollowUpDateField`; reports follow-up chart. **No `/follow-up`.** `ClientFollowUpPanel` exists and is **not imported**. |
| Opportunities | Cinema triage bucket `"opportunity"` only. **No admin Opportunities view.** |
| Analytics | Cinema slide. Admin: `/reports` + dashboard Graphs. |
| Cohestra AI | Cinema slide + demo mount. Admin: **Needs attention** (`DashboardIntelligenceBrief` → `/api/v1/admin/intelligence/brief`). **No `/ai`.** |
| Website Studio | Cinema + demo shell. Admin: `/dashboard/website`, nav **Website**, toolbar **Website Builder**. |
| Form Studio | Activity `?tab=form` + Build/Preview. Not a route. |
| Onboarding | Dashboard checklist (`create-activity`, `publish`, `first-registration`, `first-follow-up`); Website tour + setup checklist. **No `/onboarding`.** |

---

## G. Shared state components

| Name | Path | Used on |
|------|------|---------|
| `ProductEmptyState` | `web/components/shared/product-empty-state.tsx` | activities, clients, campaigns; dashboard wraps it |
| `DashboardEmptyState` | `web/components/dashboard/dashboard-empty-state.tsx` | `/dashboard` no activities |
| `ProductErrorState` | `web/components/shared/product-error-state.tsx` | dashboard, activity detail, client profile |
| `ListSkeleton` / `MetricSkeletonGrid` / `CardGridSkeleton` / `ProfileSkeleton` | `web/components/shared/*` | several lists |
| `UpgradePanel` | `web/components/shell/upgrade-panel.tsx` | website Basic, reports Basic+advanced, campaigns non-Pro, team Basic, form templates, community default template |
| `PlanLimitAlert` | `web/components/shell/plan-limit-alert.tsx` | communities, new activity |
| `ActivitiesAtCapBanner` | `web/components/activities/activities-at-cap-banner.tsx` | activities list |
| `PublicRegistrationUnavailable` | `web/components/registration/public-registration-unavailable.tsx` | public + embed |
| `TenantMaintenancePage` | `web/components/public/tenant-maintenance-page.tsx` | Suspended door |
| `BillingBannerBar` | `web/components/shell/billing-banner.tsx` | `trialing`, `past_due`, `on_hold`, `read_only_over_limit`, `registration_cap` |

**Missing App Router files:** no `web/app/error.tsx`, `loading.tsx`, or `not-found.tsx`.

---

## H. Role × surface (frontend)

| Surface | TenantAdmin | TenantMember | PlatformAdmin | anonymous |
|---------|-------------|--------------|---------------|-----------|
| `(admin)/*` | yes | **yes if authenticated** | → `/platform` | → `/login` |
| Settings workspace / Team / Billing / brand | yes | no (hidden / redirect / copy) | n/a | n/a |
| `(platform)/*` | → `/dashboard` | → `/dashboard` | yes | → `/platform/login` |
| Marketing, legal, docs, signup, public register | reachable | reachable | reachable | yes |
| `/billing/checkout` | if signed in | if signed in (no extra admin check in page) | admin guard → `/platform` | sign-in prompt |

API is stricter: Team/Billing/`AdminTenant` = `TenantAdminOnly`; Campaigns = `TenantOperator` + `[RequireProPlan]`. See `src/Infrastructure/Auth/TenantAuthPolicies.cs`.

---

## I. Plan entitlement matrix (code)

| Capability | Basic | Core | Pro / Enterprise |
|------------|-------|------|------------------|
| Public home | Stub | SitePage if published else stub | + Studio sections |
| Website builder | UpgradePanel Core; API locked | Essentials sections | + Studio (`carousel`, `testimonials`, `faq`, `stats`, `ctaBand`, `video`) |
| Campaigns | UpgradePanel + API 403 | same | allowed |
| Reports | weekly/simple; advanced → UpgradePanel | queryable + filters | + campaign results |
| Team invites | locked | yes to seat cap | yes |
| Form recipes / columns / domain blocks | 403 | yes | yes |
| Split / poster layouts | 403 | yes | yes |
| Conversational / immersive / split-into-steps | 403 | 403 | yes |
| Design tokens spacious / comfortable / lg / elevated | normalize down | yes | yes |
| Filtered client CSV | full list only | filtered | filtered |
| Campaign handoff from clients | no | no | yes |
| Community logo + default template | blocked | yes | yes |

Caps (`TenantPlanLimits`): seats 1/3/10/999; communities 1/3/10/999; published activities 4/12/50/999; registrations/month 250/500/5000/999999.

**GAP:** Admin nav is **not** plan- or role-filtered. Locks are destination-level.

**GAP:** No seeded TenantMember in Operator / Demo / LoadTest seeders.

---

## J. Billing / tenant status UX

| Dial | Values | UX |
|------|--------|----|
| `TenantStatus` | Active, Suspended, Archived | Suspended public → `TenantMaintenancePage`; Archived → `notFound()` |
| `BillingStatus` | Free, Trialing, Active, PastDue, OnHold, Canceled | banners on admin chrome |
| Access | Full / ReadOnly / Blocked | OnHold → ReadOnly + registration off; over-limit → `read_only_over_limit` |

**GAP (code):** Maintenance copy uses “on hold” for **Suspended**, colliding with `BillingStatus.OnHold`. OnHold door kind stays `active` (homepage can still render).

---

## K. Tests that lock UI behavior

| Suite | What it proves |
|-------|----------------|
| `web/e2e/smoke.spec.ts` | `/`, `/pricing`, `/login`, `/platform/login`, tenant host redirect |
| `web/e2e/registration-responsive.spec.ts` | public register 320–1440 no overflow |
| `web/e2e/form-experience-epic-35.spec.ts` | Centered / Split / Poster / Conversational × 1440/1024/768/430/390/360 — **skip unless `E2E_LIVE_STACK=1`** |
| `web/e2e/form-studio-*-36-*.spec.ts` | columns, design tokens, preview viewports, domain blocks — live stack |
| `web/lib/admin-route-motion.test.ts` · `builder-motion.test.ts` · `motion-polish.test.ts` | Epic 37 tokens |
| API plan-gate unit/integration | entitlements (not visual) |

Playwright `baseURL` default is `http://localhost:8088` (nginx Compose). Native Cloud is `:3000` / `:8080`.

---

## L. Environment baseline for this run

| Fact | Observed |
|------|----------|
| Cloud environment | Personal env `6c6ca35f-…`, build `bld-20260921-34b759dd-…` |
| AGENTS.md claim | Snapshot already has .NET 9, Postgres 16, Redis, `npm ci` |
| This VM at start | **No** `dotnet`, **no** Postgres/Redis services, **no** `web/node_modules` |
| Safe action taken | Installed .NET 9.0.318 to `$HOME/.dotnet`; `apt` PostgreSQL 16 + Redis; `npm ci`; created role `crm` / DBs `cohestra` + `cohestra_test`; added `127.0.0.1 default.localhost`; started API + Next in tmux. **No production UI or runtime behavior edited.** |
| Seeded users (intended) | `operator@cohestra.local` / `ChangeMe123!`; `platform-admin@cohestra.local` / `ChangeMe123!` once `PlatformAdminSeed__Enabled=true` |
| Demo seed | Development `DemoDataSeed:Enabled=true`, promote default tenant to **Pro Trialing** |
| Member / Basic / OnHold / Suspended | **Not seeded** — those states require extra fixtures |

Minimum action to close BLOCKED admin/public-reg cells: wait for API health + demo seed, then browser login on `http://localhost:3000/login` and `http://default.localhost:3000/register/{demo-slug}`. Do **not** change application code to fabricate those states.
