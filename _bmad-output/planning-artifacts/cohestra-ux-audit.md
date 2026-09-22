---
title: Cohestra Product Experience 2.0 — UX audit
phase: 0
status: baseline
created: 2026-09-22
head: bc5cc43f
method: code-authoritative + local environment attempt; live browser cells labeled
user_research: none in this run — do not treat findings as interview evidence
telemetry: none found in web/ (no gtag / posthog / mixpanel / trackEvent)
---

# Cohestra UX audit

Phase 0 findings only. Each finding separates **OBSERVED** evidence from **INFERRED** impact. Suggested outcomes are product decisions, not unapproved pixel specs.

Severity:

| Level | Meaning |
|-------|---------|
| P0 | Blocks a primary job or violates a protected Epic 35–37 invariant |
| P1 | High-frequency or AA-blocking; should be decided before Phase 1 restyle |
| P2 | Systemic inconsistency or secondary-path failure |
| P3 | Polish / documentation drift |

Confidence: High = cited in code or measured in this run. Medium = code + reasonable AT/device implication. Low = needs live proof.

---

## Environment and coverage

This VM did **not** match AGENTS.md’s prebuilt Cohestra snapshot. Toolchain was installed without changing application source. API `:8080` and Next `:3000` ran. Demo seed: default tenant **Pro / Trialing**, 48 clients, 10 activities. Operator login on `default.localhost` succeeded. Playwright captured marketing, public registration, and authenticated admin at the requested viewports.

**Still BLOCKED:** Member, Basic, Suspended, OnHold, embed, registration success (not submitted), campaign compose dialogs, published Form Studio three-pane (first activity was archived), Platform console UI (browser login showed invalid password; user row exists; API login earlier returned a token).

**Do not treat remaining BLOCKED cells as pass or fail.**

Research/telemetry **GAP:** no operator interviews, no product analytics, no AT CI. Cinema visual audit (2026-09-05) is marketing-only and is not this initiative’s baseline.

---

## Top systemic findings (ranked)

1. **Two vocabularies, one product** — marketing cinema teaches Follow-up / Analytics / Cohestra AI / Website Studio / Opportunity; the operator console is Reports / Needs attention / Website / clients queue. **OBSERVED** in `product-slides.tsx` vs `admin-nav.ts`.
2. **Entitlement is a destination, not navigation** — Campaigns, Website, and Reports always appear; lock is `UpgradePanel` after click. EXPERIENCE.md asked hide-or-lock. Members share the Pro map.
3. **Shell has no heading/landmark contract** — chrome `h1` + page `h1`/`h2` + Settings nested `<main>`. No skip link.
4. **Muted text token fails AA on admin** — `--stone #8b939c` on `--paper #fafbfc` is **3.00:1** (measured). Cinema already uses `--stone-cinema` (#5a636e, 5.88:1) for the same problem.
5. **Desktop-studio DNA** — Form Studio three-pane is `xl` (≥1280) vs spec ≥1024; drag handles `touch-none` + ~24px; Website is not a mobile tab (highlights Home).
6. **Overlay primitives split** — Base UI dialogs get Esc/focus/PRM; campaign email/QR dialogs do not.
7. **State kit is optional** — `ProductEmptyState` / `ProductErrorState` exist; most routes inline dashed copy. No App Router error/404/loading.
8. **Stale Platform 0 copy** — `/register` still says “One workspace, one operator.”

Protected Epics 35–37 are **not** proposed for reopen. Several findings sit *around* those surfaces (touch, 1024 pane, overlay motion) and must be decided without changing form layout, composition semantics, or 100/160/280 tokens.

---

## Findings

### PX2-IA-001 — Marketing vs operator vocabulary

| Field | Value |
|-------|--------|
| Route / state | `/#crm` cinema vs `/dashboard`, `/reports`, `/dashboard/website` — default populated marketing vs authenticated admin |
| Role / plan | Prospect (anonymous) vs TenantAdmin/Member, all plans |
| Viewport | all |
| Evidence **OBSERVED** | `web/lib/marketing/product-slides.tsx` house-tour: Website → Clients → Activities → Follow-up → Analytics → Cohestra AI. Admin nav labels: Dashboard, Website, Activities, Clients, Campaigns, Reports (`web/lib/admin-nav.ts`). Intelligence heading is “Needs attention” (`dashboard-intelligence-brief.tsx`). No admin “Opportunities” surface. |
| User impact | A prospect who hires the product from cinema cannot find the same named rooms after login. |
| Severity | P1 |
| Root cause | Cinema copy locked as marketing-only; console IA grew separately; no shared naming glossary. |
| Related | `PRODUCT_SLIDES`, `adminNavItems`, `DashboardIntelligenceBrief`, `ReportsPageClient` |
| Suggested outcome | Product owner picks one public name per job (or an explicit “cinema is metaphor, console is ops” rule) before any restyle. |
| Confidence | High |
| Validation needed | LIVE cinema vs LIVE dashboard side-by-side; support-search logs (**GAP**) |

### PX2-IA-002 — Follow-up / Opportunities are not first-class admin rooms

| Field | Value |
|-------|--------|
| Route / state | Cinema Follow-up + Opportunity buckets vs dashboard queue + `/clients?followUpDue=true` |
| Role / plan | TenantAdmin/Member |
| Viewport | all |
| Evidence **OBSERVED** | No `/follow-up` route. `ClientFollowUpPanel` is never imported. Queue lives on dashboard overview only. Opportunity is a cinema triage label only. |
| User impact | Monday outreach is a fragment across dashboard, clients chips, and profile date field — not the “control room” cinema promises. |
| Severity | P1 |
| Root cause | Lead-queue work was implemented as filters + a dashboard widget, not a room. |
| Related | `DashboardFollowUpQueue`, `use-clients-list-filters.ts`, `client-follow-up-panel.tsx` (dead) |
| Suggested outcome | Decide: promote Follow-up to a nav room, or keep it as dashboard+clients and stop selling it as a peer chapter. |
| Confidence | High |
| Validation needed | LIVE dashboard overview empty + populated; clients `followUpDue` chip |

### PX2-IA-003 — Website / Website Builder / Website Studio / `/site`

| Field | Value |
|-------|--------|
| Route / state | `/dashboard/website` |
| Role / plan | all authenticated tenant operators; Basic gated |
| Viewport | all |
| Evidence **OBSERVED** | Enterprise EXPERIENCE.md lists `/site`. Code href is `/dashboard/website`. Nav label “Website”. Toolbar “Website Builder”. Motion comments “Website Studio”. Cinema “Website Studio”. |
| User impact | Docs, spine, and UI disagree; search and training drift. |
| Severity | P2 |
| Root cause | Multiple UX spines (2026-07-18, website-builder, cinema) never reconciled. |
| Related | `admin-nav.ts`, `website-builder-page.tsx`, `ux-cohestra-2026-07-18/EXPERIENCE.md` |
| Suggested outcome | One canonical name + path in DESIGN/EXPERIENCE 2.0; update spines, not the URL, unless PO chooses to move the route. |
| Confidence | High |
| Validation needed | Code-sufficient for drift; LIVE toolbar vs nav |

### PX2-IA-004 — Mobile tab bar hides Website under Home

| Field | Value |
|-------|--------|
| Route / state | `/dashboard/website` on `<md` |
| Role / plan | all tenant operators |
| Viewport | 430×932, 390×844 |
| Evidence **OBSERVED** | `admin-mobile-tab-bar.tsx` Home `isActive` = `/dashboard` or `/dashboard/…`. Website is a desktop top-level item. Campaigns/Reports/Settings go to More. |
| User impact | Phone operators cannot reach Website from the primary bar; the active tab reads as Home while they edit a site. |
| Severity | P1 |
| Root cause | Mobile IA is a 4-tab subset that treats `/dashboard/*` as Home. |
| Related | `AdminMobileTabBar`, `adminNavItems` |
| Suggested outcome | Website is a first-class mobile destination **or** explicitly under More — not Home. Do not invent a fifth tab without PO. |
| Confidence | High |
| Validation needed | LIVE 390px on `/dashboard/website` |

### PX2-IA-005 — EXPERIENCE nav rules vs static `adminNavItems`

| Field | Value |
|-------|--------|
| Route / state | all admin nav |
| Role / plan | Basic/Core vs Pro; Member vs Admin |
| Viewport | all |
| Evidence **OBSERVED** | EXPERIENCE.md: “Hide or lock Campaigns for Basic/Core. Site nav always visible with UpgradePanel when locked.” Code: Campaigns/Website/Reports always listed; no plan/role filter in `AdminNavLinks`. |
| User impact | Basic operators enter dead-end rooms; Members see admin-shaped IA they cannot fully use. |
| Severity | P2 |
| Root cause | Nav is a static array; entitlement is page-level. |
| Related | `admin-nav.ts`, `UpgradePanel`, `admin-nav-footer.tsx` |
| Suggested outcome | Decide hide vs lock-with-badge vs keep destination UpgradePanel. Apply the same rule to Member. |
| Confidence | High |
| Validation needed | LIVE Basic + Member (both **unseeded** — GAP) |

### PX2-IA-006 — `/register` still sells one-operator Platform 0

| Field | Value |
|-------|--------|
| Route / state | `/register` default |
| Role / plan | anonymous bootstrap |
| Viewport | all |
| Evidence **OBSERVED** | `web/app/register/page.tsx`: “One workspace, one operator.” Team invites and TenantMember exist. |
| User impact | First-run copy contradicts Team + Member product. |
| Severity | P2 |
| Root cause | Bootstrap page not updated when Enterprise team landed. |
| Related | `RegisterForm`, `docs/user-manual/cohestra-operator-manual.md` (June 2026, also “one operator”) |
| Suggested outcome | Rewrite bootstrap and manual to current team model — copy only, after PO voice pass. |
| Confidence | High |
| Validation needed | LIVE `/register` |

### PX2-A11Y-001 — No skip-to-main

| Field | Value |
|-------|--------|
| Route / state | all `(admin)` routes |
| Role / plan | all |
| Viewport | all; worse with sticky header + mobile tabs |
| Evidence **OBSERVED** | `dashboard-layout.tsx` has aside + header + main + bottom nav. No skip link. Only “Skip to…” strings are empty-state / tour copy. |
| User impact | Keyboard users re-tab chrome on every navigation (WCAG 2.4.1). |
| Severity | P2 |
| Root cause | Shell never implemented bypass. |
| Related | `AdminSidebar`, `AdminTopBar`, `AdminMobileTabBar` |
| Suggested outcome | One skip-to-main on admin (and later marketing) chrome. |
| Confidence | High |
| Validation needed | Code-sufficient |

### PX2-A11Y-002 — Dual document titles / heading order

| Field | Value |
|-------|--------|
| Route / state | any `PageHeader` page; `/settings`; `/settings/team`; Website |
| Role / plan | all |
| Viewport | all |
| Evidence **OBSERVED** | `AdminTopBar` `<h1 className="text-section">`. `PageHeader` always `<h2 className="text-display-sm">`. Settings page header is another `<h1>`. Team page another `<h1>`. Website toolbar `<h2>Website Builder</h2>` under chrome “Website”. |
| User impact | AT heading list is noisy; Settings can expose two/three h1s. |
| Severity | P2 |
| Root cause | Title owned by chrome **and** pages; no heading contract. |
| Related | `page-header.tsx`, `settings-page-header.tsx`, `{typography.section}`, `{typography.display-sm}` |
| Suggested outcome | One document h1 per view; content starts at h2. |
| Confidence | High |
| Validation needed | LIVE heading map on Dashboard, Campaigns, Settings, Website |

### PX2-A11Y-003 — Nested `<main>` on Settings

| Field | Value |
|-------|--------|
| Route / state | `/settings` default |
| Role / plan | TenantAdmin and Member |
| Viewport | all |
| Evidence **OBSERVED** | Shell `<main>` in `dashboard-layout.tsx:99`. Settings injects `<main className="min-w-0 flex-1…">` at `settings-page-content.tsx:136`. |
| User impact | Landmark navigation offers two mains. |
| Severity | P2 |
| Root cause | Settings workspace copied an IDE landmark. |
| Related | `SettingsPageContent`, `DashboardLayout` |
| Suggested outcome | Settings content is a region, not a second main. |
| Confidence | High |
| Validation needed | Code-sufficient |

### PX2-A11Y-004 — Campaign overlays lack dialog behavior

| Field | Value |
|-------|--------|
| Route / state | `/campaigns/new` email preview / insert QR — open |
| Role / plan | Pro TenantAdmin/Member |
| Viewport | all |
| Evidence **OBSERVED** | `email-preview-dialog.tsx` and `insert-qr-modal.tsx`: `role="dialog" aria-modal` + title, **not** `components/ui/dialog`. No Esc, no focus trap, no `data-slot` so Epic 37 PRM CSS does not apply. Email overlay click-outside does not close. |
| User impact **INFERRED** | Tab can leave the overlay; keyboard users cannot dismiss predictably. |
| Severity | P1 |
| Root cause | Feature dialogs bypass Base UI primitive. |
| Related | `dialog.tsx`, `globals.css` `[data-slot="dialog-*"]` PRM |
| Suggested outcome | Same dialog primitive as the rest of admin (trap, Esc, labelled title, PRM). Do not restyle campaign compose. |
| Confidence | High (structure) / Medium (trap) |
| Validation needed | LIVE keyboard on compose |

### PX2-A11Y-005 — `--stone` on `--paper` fails AA

| Field | Value |
|-------|--------|
| Route / state | any admin helper / muted label |
| Role / plan | all |
| Viewport | all (light theme) |
| Evidence **OBSERVED** | `--stone: #8b939c`; `--paper: #fafbfc`; `--text-muted-warm` / `--muted-foreground` alias stone (`brand-tokens.css`). Measured contrast **3.00:1** (paper) / **2.85:1** (paper-warm). Cinema lock `--stone-cinema: #5a636e` is **5.88:1** / **5.58:1** and is applied only under `[data-demo-theme]`. Dark pair `#a8b0b8` on `#070d12` is **8.90:1** (pass). |
| User impact | Helper copy and table headers fail WCAG 1.4.3 AA for normal text. |
| Severity | P1 |
| Root cause | Midnight Atelier stone was chosen for atmosphere; cinema later patched AA only for demo mounts. |
| Related | `{colors.stone}`, `{colors.stone-cinema}`, `ProductEmptyState` description |
| Suggested outcome | One AA muted token for operator UI (cinema stone or equivalent). Do not invent a third grey in Phase 0. |
| Confidence | High (tokens measured) |
| Validation needed | LIVE meter on muted labels with and without brand accent |

### PX2-A11Y-006 — Toast colors escape the token system

| Field | Value |
|-------|--------|
| Route / state | any toast |
| Role / plan | all |
| Viewport | all |
| Evidence **OBSERVED** | `toast-provider.tsx` error `red-*`, success `emerald-*`, not `--danger` / `--success`. |
| User impact | Status color diverges in dark mode and with brand accent. |
| Severity | P2 |
| Root cause | Toast predates token discipline. |
| Related | `--danger`, `--success`, `Button` destructive |
| Suggested outcome | Map toast variants to status tokens. |
| Confidence | High |
| Validation needed | Code-sufficient |

### PX2-A11Y-007 — Focus-visible gaps on chrome controls

| Field | Value |
|-------|--------|
| Route / state | dashboard pulse links, follow-up rows, studio tabs, toast actions |
| Role / plan | all |
| Viewport | keyboard, all sizes |
| Evidence **OBSERVED** | Button primitive has `focus-visible:ring-3`. Community pulse links, follow-up queue rows, website/form `TabButton`, toast action/dismiss rely on hover / no ring. |
| User impact | Keyboard caret disappears on daily-use controls. |
| Severity | P2 |
| Root cause | Shared focus ring not required on custom `<Link>` / `<button>`. |
| Related | `motion-press`, `Button` |
| Suggested outcome | Shared focus ring on every interactive chrome control. |
| Confidence | High |
| Validation needed | LIVE Tab pass |

### PX2-TOUCH-001 — Default Button is 32px

| Field | Value |
|-------|--------|
| Route / state | all `Button` default / icon |
| Role / plan | all; worse on phone |
| Viewport | 430 / 390 |
| Evidence **OBSERVED** | `button.tsx` default `h-8`, icon `size-8` (32px); `xs`/`icon-xs` 24px. Public registration CTAs are `min-h-12` / `min-h-14`. EXPERIENCE public floor 44×44. WCAG 2.2 AA 2.5.8 is 24px — these **pass 2.5.8** and **fail** the product’s 44px floor / AAA 2.5.5. |
| User impact | Operator chrome is harder to hit than public forms. |
| Severity | P2 |
| Root cause | shadcn/Base UI density, not a Cohestra token. |
| Related | `buttonVariants`, Epic 35 public field/button tokens |
| Suggested outcome | Define a product min target (44 touch / 32 desktop) **without** changing Epic 35 public CTA sizes. |
| Confidence | High |
| Validation needed | LIVE touch on list actions |

### PX2-TOUCH-002 — Form Studio handles opt out of touch

| Field | Value |
|-------|--------|
| Route / state | Activity `?tab=form` Build, composition row |
| Role / plan | all plans that can edit forms |
| Viewport | 430 / 390 |
| Evidence **OBSERVED** | `form-composition-builder.tsx:646` handle `p-1` + `touch-none` + `GripVertical size-4`. Up/down/delete `size="icon-xs"` (24px). Keyboard reorder exists. Form Studio EXPERIENCE: drag handle on each row + 44px elsewhere. |
| User impact | Finger cannot use the coded primary reorder control. |
| Severity | P1 |
| Root cause | Desktop DnD first; `touch-none` avoids scroll-vs-drag without a 44px hit area. |
| Related | Epic 36 builder operations (preserve keyboard reorder); `website-section-fields.tsx` similar `touch-none` |
| Suggested outcome | 44px handle that participates in pointer/touch; keep keyboard. **Do not change composition schema or renderer.** |
| Confidence | High |
| Validation needed | LIVE phone Form tab |

### PX2-RESP-001 — Form Studio three-pane starts at 1280, not 1024

| Field | Value |
|-------|--------|
| Route / state | Form Build |
| Role / plan | all |
| Viewport | 1024×768, 1280×800 |
| Evidence **OBSERVED** | Code `xl:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,18rem)]`. EXPERIENCE: three-pane ≥1024; drawer + stack &lt;1024. No drawer implementation. |
| User impact | 13" / 1100–1279 is a long stacked scroll, not a studio. |
| Severity | P2 |
| Root cause | Tailwind `xl` used instead of the written 1024 contract. |
| Related | Epic 36 builder shell; do not change composition semantics |
| Suggested outcome | Honor the written 1024 three-pane **or** amend EXPERIENCE to 1280. PO decision. |
| Confidence | High |
| Validation needed | LIVE 1024 vs 1280 |

### PX2-RESP-002 — Admin breakpoint contract disagrees with EXPERIENCE

| Field | Value |
|-------|--------|
| Route / state | admin chrome |
| Role / plan | all |
| Viewport | 768×1024, 1024×768 |
| Evidence **OBSERVED** | EXPERIENCE: sidebar ≥lg, sheet on sm. Code: sidebar `hidden md:flex`, compact `w-16` until `lg:w-60`; tabs `md:hidden`. |
| User impact | 768–1023 is an icon-only rail with sr-only labels. |
| Severity | P2 |
| Root cause | md vs lg never unified. |
| Related | `dashboard-layout.tsx`, `admin-sidebar.tsx` |
| Suggested outcome | One breakpoint contract for rail vs tabs. |
| Confidence | High |
| Validation needed | LIVE 800px |

### PX2-RESP-003 — Dashboard / clients tables require horizontal min-width

| Field | Value |
|-------|--------|
| Route / state | dashboard graphs/tables; `/clients` ≥sm |
| Role / plan | all |
| Viewport | 390, 768 |
| Evidence **OBSERVED** | Activity performance table `min-w-[40rem]`; clients grid `min-w-[42rem]` + `overflow-x-auto` ≥sm. EXPERIENCE asked no clients table scroll &lt;md. |
| User impact | Phone/tablet graphs and mid-width clients scroll sideways. |
| Severity | P2 |
| Root cause | Desktop table first; card layout only `<sm`. |
| Related | `dashboard-activity-performance-table.tsx`, `clients-list-page.tsx` |
| Suggested outcome | Phone graphs as stacked cards; clients card/stack through `md`. |
| Confidence | High |
| Validation needed | LIVE graphs 375px; clients 768px |

### PX2-RESP-004 — Settings rails vanish between lg and xl

| Field | Value |
|-------|--------|
| Route / state | `/settings` |
| Role / plan | TenantAdmin |
| Viewport | 1024×768 |
| Evidence **OBSERVED** | Left rail `lg+`; right rail `xl+`; mobile tabs + Context sheet `<lg`. |
| User impact **INFERRED** | iPad landscape loses context rail. |
| Severity | P3 |
| Root cause | Three-pane settings without a tablet contract. |
| Related | `settings-page-content.tsx` |
| Suggested outcome | Define tablet: two-pane vs Context sheet. |
| Confidence | Medium |
| Validation needed | LIVE 1024 vs 1280 settings |

### PX2-ENT-001 — Destination UpgradePanel; nav shows locked rooms

| Field | Value |
|-------|--------|
| Route / state | `/campaigns` non-Pro; `/dashboard/website` Basic; `/reports` Basic+advanced; `/settings/team` Basic |
| Role / plan | Basic / Core TenantAdmin |
| Viewport | all |
| Evidence **OBSERVED** | `UpgradePanel` used after navigation. Nav items always present. API still 403 / `plan_locked` (good). |
| User impact | Extra click into a lock screen; Members see “Ask a tenant admin” with no checkout. |
| Severity | P2 |
| Root cause | UI lock is a page, not IA. |
| Related | `upgrade-panel.tsx`, `RequireProPlanFilter` |
| Suggested outcome | Same as PX2-IA-005 — pick hide / badge / panel. Server gates stay. |
| Confidence | High |
| Validation needed | LIVE Basic (**unseeded**) |

### PX2-ENT-002 — No shared denied state; Member unseeded

| Field | Value |
|-------|--------|
| Route / state | `/settings/team`, `/settings/billing` as Member; deep-link 403 |
| Role / plan | TenantMember |
| Viewport | all |
| Evidence **OBSERVED** | Inline “tenant admins only” copy; no `PermissionDenied`. Seeders attach TenantAdmin only. |
| User impact | Denied is a sentence, not a pattern. Member UX cannot be accepted on default snapshot. |
| Severity | P2 |
| Root cause | Membership added without a denied template or seed. |
| Related | `SettingsTeamPageContent`, `OperatorSeeder` |
| Suggested outcome | One denied/upgrade empty; seed one Member in Development. **Env fixture, not a UI rewrite.** |
| Confidence | High |
| Validation needed | LIVE Member JWT |

### PX2-ENT-003 — Suspended vs OnHold language collision

| Field | Value |
|-------|--------|
| Route / state | public `/` Suspended vs admin banner OnHold |
| Role / plan | any; public visitor vs operator |
| Viewport | all |
| Evidence **OBSERVED** | `TenantMaintenancePage` uses “on hold” / “Workspace paused” for **Suspended**. `BillingStatus.OnHold` is a different dial; door kind stays `active`. |
| User impact | Operators and guests cannot tell operational freeze from billing hold. |
| Severity | P2 |
| Root cause | Copy reused “on hold” for two machines. |
| Related | `TenantAccessEvaluator`, `BillingBannerBar` |
| Suggested outcome | Distinct copy per dial. Do not change access evaluator in UX 2.0 without PO. |
| Confidence | High |
| Validation needed | LIVE Suspended + OnHold fixtures (**unseeded**) |

### PX2-STATE-001 — No App Router error / 404 / loading

| Field | Value |
|-------|--------|
| Route / state | unknown URL; uncaught render error |
| Role / plan | all |
| Viewport | all |
| Evidence **OBSERVED** | glob `web/app/**/{error,loading,not-found}.tsx` = 0. Per-page skeletons/errors are inconsistent. |
| User impact | Next defaults, not product voice. |
| Severity | P1 |
| Root cause | State kit never lifted to the router. |
| Related | `ProductErrorState` |
| Suggested outcome | Root + admin `not-found` / `error` using the existing error primitive. |
| Confidence | High |
| Validation needed | LIVE `/nope` |

### PX2-STATE-002 — Empty/error patterns are duplicated

| Field | Value |
|-------|--------|
| Route / state | dashboard charts, communities, categories, invoices, platform lists |
| Role / plan | all |
| Viewport | all |
| Evidence **OBSERVED** | Canonical `ProductEmptyState` on 3 lists. ~20 dashed inline empties. Platform uses `--plat-stone` sentences. |
| User impact | Empty feels like a different product per module. |
| Severity | P3 |
| Root cause | Primitive exists but is optional. |
| Related | `ProductEmptyState`, `MarketingEmptyState` |
| Suggested outcome | One empty + one error for operator lists; platform may keep sparse console. |
| Confidence | High |
| Validation needed | Code-sufficient |

### PX2-MOT-001 — Overlay / profile durations sit outside Epic 37 tokens

| Field | Value |
|-------|--------|
| Route / state | dialogs, sheets, client profile expand; admin route enter |
| Role / plan | all |
| Viewport | all |
| Evidence **OBSERVED** | Press 100 / local 160 / route 280 / builder 120–180 in `globals.css`. Dialog content 200ms, overlay 150ms. `ClientProfileExpandableRegion` 200ms. Custom campaign dialogs have no enter and skip PRM slots. Architecture: do not key route enter on query/hash; CSS PRM not JS. |
| User impact | Motion feels slightly different per overlay family; custom overlays ignore reduced motion CSS. |
| Severity | P2 |
| Root cause | Epic 37 scoped chrome + builders; leftover overlay timings. |
| Related | Epic 37 AD-1–AD-8 — **do not change 100/160/280** |
| Suggested outcome | Map overlays onto local (160) or keep 200 as a documented overlay token. Force campaign dialogs through slotted primitives. |
| Confidence | High |
| Validation needed | LIVE PRM + route enter; do not regress Form Studio draft survival |

### PX2-SYS-001 — Platform console is a parallel visual system

| Field | Value |
|-------|--------|
| Route / state | `/platform*` |
| Role / plan | PlatformAdmin |
| Viewport | all |
| Evidence **OBSERVED** | `--plat-*` hex duplicates in `web/app/(platform)/layout.tsx`; native buttons `min-h-11 rounded-[10px]`; no `AdminRouteTransition`; light-only. |
| User impact | Ops console does not share operator craft. May be intentional. |
| Severity | P3 |
| Root cause | Platform built as a sparse console. |
| Related | `--plat-ink`, `--plat-lagoon` |
| Suggested outcome | PO: keep sparse console **or** inherit Midnight Atelier. Do not silently restyle. |
| Confidence | High |
| Validation needed | LIVE `/platform` |

### PX2-SYS-002 — Page headers and tables have no primitive

| Field | Value |
|-------|--------|
| Route / state | activities, communities, categories, campaigns, reports, settings |
| Role / plan | all |
| Viewport | all |
| Evidence **OBSERVED** | `PageHeader` vs inline `h2` vs Settings/Team/Billing `h1` vs greeting header. No `table.tsx`. Campaigns CSS grid; communities HTML table; clients CSS grid `role="row"`; platform `PlatformDataTable`. |
| User impact | Density, alignment, and AT table semantics drift by module. |
| Severity | P3 |
| Root cause | shadcn kit incomplete; modules invented lists. |
| Related | `page-header.tsx`, list pages |
| Suggested outcome | One header + one data-table in DESIGN.md Phase 1 — adopt incrementally. |
| Confidence | High |
| Validation needed | Code-sufficient |

### PX2-LIVE-001 — Cookie banner covers marketing primary CTAs

| Field | Value |
|-------|--------|
| Route / state | `/` marketing, first paint, cookie not accepted |
| Role / plan | anonymous |
| Viewport | **390×844** (severe); 1440 overlays hero photo |
| Evidence **OBSERVED LIVE** | Cookie dialog sits on the fold over “Start free” / lead copy at 390. 1440 places it on the hero photograph. `role="dialog"` without `aria-modal` (CODE). |
| User impact | First-time visitors cannot reach the primary hire without dismissing a sheet that covers the CTA. |
| Severity | P1 |
| Root cause | Cookie consent is a blocking overlay, not a non-modal banner. |
| Related | `marketing-cookie-consent.tsx` |
| Suggested outcome | Non-modal banner or guaranteed clearance above the primary CTA. |
| Confidence | High |
| Validation needed | Already LIVE at 390 and 1440 |

### PX2-LIVE-002 — Calendar FAB overlaps admin content on phone

| Field | Value |
|-------|--------|
| Route / state | all captured admin routes `<md` |
| Role / plan | TenantAdmin Pro |
| Viewport | 430×932, 390×844 |
| Evidence **OBSERVED LIVE** | Circular calendar control sits on the follow-up/merge cards (dashboard), last client rows, Website tour, and Form intro fields. `ActivityCalendarNudge` is a sibling of `<main>` (`dashboard-layout.tsx`). |
| User impact | Primary content and bottom tabs compete with a persistent FAB. |
| Severity | P2 |
| Root cause | Calendar nudge is global chrome without collision avoidance. |
| Related | `activity-calendar-popout.tsx` |
| Suggested outcome | Hide or dock the FAB so it does not cover queue/list rows or the tab bar. |
| Confidence | High |
| Validation needed | Already LIVE |

### PX2-LIVE-003 — Clients status chips truncate on phone

| Field | Value |
|-------|--------|
| Route / state | `/clients` populated |
| Role / plan | TenantAdmin Pro |
| Viewport | 390×844 |
| Evidence **OBSERVED LIVE** | Status row wraps; “Active” reads as a clipped chip. Counts New 13 / Contacted 12 / Active 12 / Inactive 11 visible on 1440. |
| User impact | Operators cannot reliably select Active on a phone without guessing. |
| Severity | P2 |
| Root cause | Chip row is not a wrapping/scroll contract. |
| Related | `ClientLeadQueueHeader` |
| Suggested outcome | Horizontal scroll or two-row chips with full labels. |
| Confidence | High |
| Validation needed | Already LIVE |

### PX2-LIVE-004 — Authenticated pages log 503 (and Website 404)

| Field | Value |
|-------|--------|
| Route / state | every captured admin URL |
| Role / plan | TenantAdmin Pro |
| Viewport | all captured |
| Evidence **OBSERVED LIVE** | Playwright `console` error `503 Service Unavailable` on dashboard, clients, activities, website, reports, campaigns, settings. Website also 404. Pages still rendered. Resource URL not isolated (follow-up script timed out). |
| User impact | Unknown missing capability; noise in console; possible broken image/telemetry. |
| Severity | P2 |
| Root cause | Unidentified failed fetch (not fatal to first paint). |
| Related | admin data loaders, website assets |
| Suggested outcome | Identify the 503 URL; do not paper over by swallowing console errors. |
| Confidence | Medium (status seen; URL not captured) |
| Validation needed | Network panel on one admin page |

### PX2-LIVE-005 — First Form Studio open was an archived activity

| Field | Value |
|-------|--------|
| Route / state | `/activities` → first detail `?tab=form` |
| Role / plan | TenantAdmin Pro |
| Viewport | 1440, 1024, 390 |
| Evidence **OBSERVED LIVE** | Harbourline Board Game Night, badge Archived, “Archived — form is read-only.” Intro/closed-message fields fill the first viewport; composition three-pane not visible. Activities list does not default to published. |
| User impact | Operators land in a dead studio when using the first card. |
| Severity | P2 |
| Root cause | List order includes archived without a published-first default. |
| Related | `ActivitiesListPage`, `ActivityFormTab` |
| Suggested outcome | Default filter to published/draft, or make archived visually secondary. **Do not change Form Studio schema.** |
| Confidence | High |
| Validation needed | Already LIVE |

### PX2-A11Y-003 — Nested `<main>` on Settings (LIVE confirmed)

Playwright counted **2 `<main>`** and h1 `["Settings","Default"]` at every captured settings viewport. Team/Billing each expose two identical h1s (`Team`/`Team`, `Billing`/`Billing`).

### PX2-IA-004 — Website grouped under Home (LIVE confirmed)

390 Website Builder: bottom tabs Home / Activities / Clients / More; Home is the active tab while the tour overlay is open.

### PX2-SYS-003 — DESIGN.md tokens not fully implemented

| Field | Value |
|-------|--------|
| Route / state | admin canvas |
| Role / plan | all |
| Viewport | 1440 |
| Evidence **OBSERVED** | `ux-cohestra-2026-07-18/DESIGN.md` `page-gutter: 32px`; admin `<main>` is `p-4 sm:p-6` (16/24). Primary button in DESIGN 48px; `Button` default 32px. “No gradient”; register CTA uses `from-primary to-accent`. No `--space-*` / `--shadow-*` CSS variables. |
| User impact | The written brand and the shipped admin are related but not the same system. |
| Severity | P2 |
| Root cause | Spine finalized; implementation used Tailwind ad hoc. |
| Related | `brand-tokens.css`, DESIGN.md |
| Suggested outcome | Phase 1 DESIGN.md must describe **shipped** tokens first, then deltas. Do not “fix” gutters in Phase 0. |
| Confidence | High |
| Validation needed | LIVE 1440 dashboard vs DESIGN mockups |

---

## What is not claimed

- No user-research quotes. No “operators told us…”.
- No live contrast meter on a rendered page (token math only).
- No VoiceOver/NVDA session.
- No claim that Epic 35 shells fail their e2e matrix — those specs exist and skip without `E2E_LIVE_STACK=1`.
- No claim that 32px buttons fail WCAG 2.2 2.5.8.
- Cinema 2026-09-05 audit is **not** reused as operator-console evidence.

## Telemetry / research gaps

| Gap | Why it matters | Minimum close |
|-----|----------------|---------------|
| No product analytics | Cannot rank Website-under-Home mis-taps or UpgradePanel bounce | Events: nav, upgrade view, dialog dismiss method |
| No AT CI | A11Y-004/005/007 are static | axe + contrast on `--text-muted-warm` vs `--paper` |
| No TenantMember / Basic / Suspended / OnHold seed | ENT and status findings are code-only | Dev fixtures, not production behavior change |
| No live 6-viewport pass this run | Visual QA matrix incomplete | Browser pass after API health |
| Operator manual June 2026 | Training contradicts Team | Docs update after naming decisions |
