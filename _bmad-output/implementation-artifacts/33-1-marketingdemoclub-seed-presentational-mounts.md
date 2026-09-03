---
story_id: 33.1
story_key: 33-1-marketingdemoclub-seed-presentational-mounts
epic: 33
status: done
baseline_commit: main
created: 2026-09-01
depends_on: []
sources:
  - _bmad-output/planning-artifacts/epics-live-proof-cinema.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-09-01/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-09-01/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-09-01/review-accessibility.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-09-01/mockups/desktop-cinema-clients.html
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-09-01/mockups/desktop-cinema-followup.html
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-09-01/imports/brainstorm-intent-live-proof-cinema.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/project-context.md
  - web/AGENTS.md
supersedes_for_visuals:
  - _bmad-output/implementation-artifacts/spec-landing-product-cinema.md
forward_deps:
  - 33-2-feeling-copy-kill-chapter-mock-chrome
  - 33-3-preview-productframe-desktop-pin-seek
  - 33-4-cinema-a11y-hash-live-region-dual-state-pills
  - 33-5-mobile-prm-click-tabs-website-omit-cta
---

# Story 33.1: MarketingDemoClub seed + presentational mounts

Status: done

<!-- Ultimate context engine analysis completed — comprehensive developer guide created -->

## Story

As a marketing visitor,
I want to see real Cohestra product UI filled with a named club week,
so that I believe the product is real — not a decorative mock.

**FRs:** FR1, FR6, FR7 (Website preview-or-omit data path). **UX-DR:** UX-DR6, UX-DR7. **NFR:** NFR5 (static JSON), NFR6 (no production PII). **Slice:** apex `/#crm` only.

## Acceptance Criteria

1. **Given** the apex marketing home loads `/#crm`
   **When** any product room visual renders
   **Then** it is driven by a single static `MarketingDemoClub` JSON (Elena, Jordan, Sunday clinic, board games night) via `MarketingDemoProvider`
   **And** no production tenant data, real PII, or session cookies are requested for these mounts

2. **Given** presentational bodies for Clients, Follow-up, Dashboard, Campaigns, Reports, and Website (preview + sections)
   **When** those bodies render inside the cinema stage
   **Then** they reuse Cohestra product UI (extracted presentational mounts), not a second mock design system
   **And** Website uses preview + seeded sections only — not full editor chrome

3. **Given** DemoClub presentational theme (H3)
   **When** secondary text appears in a live mount (e.g. Elena’s meta line)
   **Then** it uses `stone-cinema` or `ink` on paper-warm (≥4.5:1)
   **And** raw `stone` on paper-warm is not used in cinema mounts

4. **Given** a room cannot be mounted safely
   **When** the cinema chooses a fallback
   **Then** it prefers omit-pill (or inert iframe last resort) over inventing hollow decorative UI
   **And** the stage never shows anonymous “Acme” / “Your account” seed

## Tasks / Subtasks

- [x] **Task 1 — Static MarketingDemoClub JSON + types** (AC: 1, 4)
  - [x] Add `web/lib/marketing/marketing-demo-club.json` — one fixture, all six rooms
  - [x] Add `web/lib/marketing/marketing-demo-club.ts` — typed parse, accessors, `assertDemoClubInvariants()`
  - [x] Import JSON as a module (`resolveJsonModule` already true in `web/tsconfig.json`). Do **not** `fetch()` it.
  - [x] Lock cast and org (see Dev Notes). No Acme / Your account / `yourclub`.
  - [x] Fixture contacts only: `@example.com`, fictional E.164-looking phones

- [x] **Task 2 — MarketingDemoProvider + H3 theme** (AC: 1, 3)
  - [x] Add `web/components/marketing/marketing-demo-provider.tsx` (`"use client"`)
  - [x] Wrap **once** at `MarketingProductCarousel` root so cinema **and** legacy carousel share the same context
  - [x] Add `web/components/marketing/marketing-demo-theme.tsx` (or `data-demo-theme` + CSS in `globals.css` / `brand-tokens.css`) that remaps muted text in mounts to `stone-cinema` / `ink`
  - [x] QA target: Elena meta line “Spain · Sunday clinic · 2 days ago” — not marketing copy column

- [x] **Task 3 — Six presentational mounts** (AC: 2, 4)
  - [x] `web/components/marketing/demo-mounts/marketing-demo-clients-mount.tsx`
  - [x] `web/components/marketing/demo-mounts/marketing-demo-followup-mount.tsx`
  - [x] `web/components/marketing/demo-mounts/marketing-demo-dashboard-mount.tsx`
  - [x] `web/components/marketing/demo-mounts/marketing-demo-campaigns-mount.tsx`
  - [x] `web/components/marketing/demo-mounts/marketing-demo-reports-mount.tsx`
  - [x] `web/components/marketing/demo-mounts/marketing-demo-website-mount.tsx`
  - [x] Barrel `web/components/marketing/demo-mounts/index.ts`
  - [x] Compose **existing** presentational pieces + typed props (see reuse table). Do not copy-paste a second visual language.
  - [x] No `useAuth` / `authFetch` / `fetchClients` / `fetchDashboardMetrics` / `fetchCampaigns` / `fetchReport` / `fetchPublicSite` in mounts
  - [x] No `<Link href="/clients/...">`, no WhatsApp/Viber `window.open`, no Publish/save handlers — pixels only
  - [x] Website: `SitePageRenderer` + `PublicSitePayload` — section `type` values must be exactly `hero`, `highlights`, `upcomingactivities`, `testimonials` (see `site-page-renderer.tsx` switch). Do **not** invent `activities`. **Not** `WebsiteBuilderPage`, editor rails, Design/Sections/Templates tabs, PRO chip
  - [x] If Website mount is too heavy: export `isDemoRoomAvailable("website") === false` and skip that visual. **Do not** change `PRODUCT_SLIDE_COUNT` / pin `70vh × 6` in this story (tablist rebuild is 33.5). Never substitute `WebsiteBuilderShowcaseMock`.

- [x] **Task 4 — Wire `PRODUCT_SLIDES[].visual`** (AC: 1, 2)
  - [x] In `web/lib/marketing/product-slides.tsx`, replace mock visuals with the six mounts
  - [x] Keep `ProductSlideId` union and order: `clients` → `outreach` → `dashboard` → `campaigns` → `reports` → `website`
  - [x] Do **not** rewrite `eyebrow` / `title` / `lead` / `points` (33.2)
  - [x] Do **not** edit `use-marketing-product-cinema.ts` pin math
  - [x] Leave `MarketingCrmShowcase` / `*ShowcaseMock` files on disk unused by cinema (33.2 deletes chrome). Do not extend them.

- [x] **Task 5 — Tests + verify** (AC: all)
  - [x] Vitest: `web/lib/marketing/marketing-demo-club.test.ts`
    - Elena appears in clients **and** reports-derived data
    - Jordan is the Follow-up subject; WhatsApp copy mentions Sunday clinic
    - Activities include Sunday clinic + board games night
    - Reject / fail assert if `orgName` matches `/acme|your account|yourclub/i`
    - No `fetch` / cookie usage in loader
  - [x] Grep mounts + provider: no `authFetch`, `useAuth`, `document.cookie`
  - [x] `cd web && npx vitest run lib/marketing/marketing-demo-club.test.ts`
  - [x] Typecheck touched files (`strict: true`)
  - [x] Manual: `/#crm` on desktop + mobile/PRM — six inhabited rooms, Elena meta contrast, no network to `/api/v1/*` for cinema mounts (DevTools)

### Review Findings

- [x] [Review][Patch] H3 remap misses CSS-var ticks and opacity utilities [`web/app/globals.css:454`] — `[data-demo-theme]` remaps `.text-stone` / `.text-text-muted-warm` / `.text-muted-foreground` but Dashboard `DashboardRegistrationsTrendChart` ticks use `fill: var(--text-muted-warm)` (= raw `stone`). Opacity classes like `text-text-muted-warm/90` are also unmapped. AC3: secondary text in live mounts must be `stone-cinema` / `ink` on `paper-warm`, not raw `stone`.
- [x] [Review][Patch] Invariants do not require `clientDetails` or a non-empty room set [`web/lib/marketing/marketing-demo-club.ts:509`] — `selectedClientId` / `followUpClientId` must exist in `clients`, but not in `clientDetails`. Clients and Follow-up mounts call `getClientDetail`, which throws. Assert details for those ids (and reports-proof ids used as details). Also require `availableRooms` to list the six rooms so an empty array cannot blank every visual while pills remain.
- [x] [Review][Patch] Seed calendar and counts disagree across rooms [`web/lib/marketing/marketing-demo-club.json`] — Locked week is March (Elena timeline Mar 8/9/15, WhatsApp `loggedAt` / campaigns `sentAt`). Dashboard/reports use 2026-08-26–2026-09-01 with copy “this week”. `dashboard.newLeadsInPeriod` is 36 while `reports.newLeads` is 12 and the trend `newClients` sum is 16. Align dates and totals so the six rooms describe one club week.
- [x] [Review][Patch] Campaigns “Delivered” column shows `sentCount` [`web/components/marketing/demo-mounts/marketing-demo-campaigns-mount.tsx:31`] — `CampaignListItem` has `sentCount`, not delivered. Relabel the column (e.g. Recipients) or stop presenting sent as delivered.
- [x] [Review][Patch] Reports “Export / CSV” tile is hollow chrome [`web/components/marketing/demo-mounts/marketing-demo-reports-mount.tsx:27`] — AC4 prefers omit over inventing decorative UI. Replace with a real seed metric (e.g. new leads) or drop the tile.
- [x] [Review][Patch] Elena phone does not match the locked display string [`web/lib/marketing/marketing-demo-club.json:19`] — Story lock is `+34 612 345 678`; seed is `+34612345678`.
- [x] [Review][Patch] Dashboard header hardcodes org name [`web/components/marketing/demo-mounts/marketing-demo-dashboard-mount.tsx:29`] — Use `club.orgName` instead of the literal “Riverside Rec”.
- [x] [Review][Defer] `visual: null` still leaves the seek pill [`web/lib/marketing/product-slides.tsx:45`] — deferred, pre-existing; omit-pill / tablist rebuild is Story 33.5
- [x] [Review][Defer] Website `SitePageRenderer` still mounts `Link` / `ThemeToggle` [`web/components/marketing/site-page-renderer.tsx:139`] — deferred, pre-existing; cinema visual column is `inert` / `pointer-events-none`; ProductFrame polish is 33.3
- [x] [Review][Defer] Cinema error boundary fallback remounts the same DemoClub slides [`web/components/marketing/marketing-product-carousel.tsx:117`] — deferred, pre-existing cinema recovery; 33.1 throw path is closed by the `clientDetails` invariant patch above

### Review Findings (Pass 2)

- [x] [Review][Patch] Report “this week” vs locked Sunday clinic Mar 8 [`web/lib/marketing/marketing-demo-club.json`] — Widen the period to include Mar 8 (adjust `reportFilters` / trend / `periodDays` so clinic is in-period). (Pass 2 Decision 1 → widen)
- [x] [Review][Patch] Board games schedule day vs registration day [`web/lib/marketing/marketing-demo-club.json`] — Change website schedule copy to Sunday (match Mar 15 registration). (Pass 2 Decision 2 → schedule copy)
- [x] [Review][Patch] `dashboardQueueIds` not validated in invariants [`web/lib/marketing/marketing-demo-club.ts:611`] — unknown ids throw from `getDashboardQueue` (same class as the Pass 1 `clientDetails` fix).
- [x] [Review][Patch] Website section types can be present but `enabled: false` [`web/lib/marketing/marketing-demo-club.ts`] — invariants only check type presence; disabled sections yield hollow Website chrome.
- [x] [Review][Patch] `activeActivitiesCount` is 4 while ranking/performance name 3 [`web/lib/marketing/marketing-demo-club.json`] — set count to 3 or add a fourth named activity.
- [x] [Review][Patch] “Unique clients” tile shows all-time book size [`web/components/marketing/demo-mounts/marketing-demo-reports-mount.tsx:25`] — binds `leadGrowth.totalLeadsAtEnd` (248) next to “counted once this week”; relabel to Total clients (or an in-period metric).
- [x] [Review][Patch] Jordan timeline not newest-first [`web/lib/marketing/marketing-demo-club.json`] — `lead_status_changed` at 15:12 is listed after WhatsApp at 15:10.
- [x] [Review][Patch] H3 misses `text-stone/` opacity utilities [`web/app/globals.css:464`] — bare `.text-stone` is remapped; `text-stone/90` and friends are not.
- [x] [Review][Patch] Website mount is interactive on legacy/mobile [`web/components/marketing/demo-mounts/marketing-demo-website-mount.tsx:12`] — `SitePageRenderer` `Link` / `ThemeToggle` are live outside cinema `inert`; wrap the mount body with `inert` / `pointer-events-none` (Task 3: pixels only).
- [x] [Review][Patch] `campaignsFailed: 1` while both campaigns are `status: "sent"` [`web/lib/marketing/marketing-demo-club.json`] — recipient `failedCount` is not a failed campaign; set `campaignsFailed` to 0.
- [x] [Review][Patch] Campaigns subtitle hardcodes org name [`web/components/marketing/demo-mounts/marketing-demo-campaigns-mount.tsx:15`] — use `club.orgName` (same as Pass 1 dashboard fix).
- [x] [Review][Defer] REQUIRED_DEMO_ROOMS makes `isDemoRoomAvailable` always true [`web/lib/marketing/marketing-demo-club.ts:551`] — deferred, pre-existing for 33.1; omit-pill / tablist rebuild is Story 33.5
- [x] [Review][Defer] Clients list+detail may clip on mobile/PRM [`web/components/marketing/demo-mounts/marketing-demo-clients-mount.tsx`] — deferred, pre-existing layout; mobile carousel polish is 33.5

### Review Findings (Pass 3)

- [x] [Review][Patch] Website highlights still say “Friday tables” [`web/lib/marketing/marketing-demo-club.json:427`] — Pass 2 moved board games to Sunday schedules; highlight description still says Friday.
- [x] [Review][Patch] Follow-up WhatsApp chrome hardcodes `Mar 9` [`web/components/marketing/demo-mounts/marketing-demo-followup-mount.tsx:38`] — Format from `club.whatsappQuote.loggedAt` (same stale-literal class as Pass 1 orgName).
- [x] [Review][Patch] Strengthen DemoClub hollow/network invariants [`web/lib/marketing/marketing-demo-club.ts`] — Require non-empty `campaigns` and `activityRanking`; non-empty timelines for required `clientDetails`; `upcomingActivities` include Sunday clinic + board games; `clientDetails` id/fullName match `clients`; forbid non-null remote `logoAssetId` / `heroImageUrl` / avatar asset ids; reject enabled section types outside the four allowed.
- [x] [Review][Defer] Cinema stage width keeps Clients/Dashboard on stacked `lg:` layout [`web/components/marketing/demo-mounts/marketing-demo-clients-mount.tsx:23`] — deferred, pre-existing; ProductFrame / mount layout polish is 33.3–33.5 (extends Pass 2 mobile clip defer)
- [x] [Review][Defer] `SitePageRenderer` Links may still viewport-prefetch `/register/*` despite mount `inert` [`web/components/marketing/site-page-renderer.tsx`] — deferred, pre-existing renderer; demount Links / prefetch=false is 33.3

### Review Findings (Pass 4)

- [x] [Review][Patch] Pass 3 remote-asset guard misses `heroImageAssetId` [`web/lib/marketing/marketing-demo-club.ts:643`] — `SitePageRenderer` loads `/api/v1/public/campaign-assets/${heroImageAssetId}` from hero props; forbid non-empty `heroImageAssetId` on enabled sections (same NFR5 intent as logo/avatar).
- [x] [Review][Patch] Fixture emails not asserted `@example.com` [`web/lib/marketing/marketing-demo-club.ts`] — Task 1 / NFR6 lock; require client + detail emails end with `@example.com` when present.
- [x] [Review][Patch] Ranking/highlights/testimonials can be hollow despite enabled sections [`web/lib/marketing/marketing-demo-club.ts`] — Require `activityRanking` names include Sunday clinic + board games; enabled highlights/testimonials must have at least one titled/quoted item.
- [x] [Review][Defer] Sunday clinic and board games share `Sundays · 6:00pm` slot [`web/lib/marketing/marketing-demo-club.json`] — deferred, consequence of Pass 2 Decision 2 (match Mar 15 18:00 registration); distinct Sunday times would re-open schedule vs timestamp conflict

## Dev Notes

### What this story is

Data layer + live presentational bodies for the existing `#crm` cinema. Pin engine, feeling copy, chapter chrome, a11y polish, CTA stay for 33.2–33.5.

### What this story is not

| Later | Do not do here |
|-------|----------------|
| 33.2 | Thesis “A week with your people”; kill eyebrow / chapter watermark / “Scroll to continue” / `ShowcaseBrowserChrome`; Feeling→Scene→Proof; ≤3 outcomes |
| 33.3 | Thin Cohestra window; `inert`/`aria-hidden` frame changes; InkProgress; ClimaxMicroBeat Clients→Follow-up |
| 33.4 | Live region `{navLabel}. {job}.`; dual-state pill focus; hash `#crm` focus rules |
| 33.5 | CarouselChrome behavior; pill wrap; Website omit tablist rebuild; post-cinema CTA |

`spec-landing-product-cinema.md` describes the **shipped chapter/mock cinema**. Reuse pin constants only. Do not treat its four-bullet copy or Website-as-climax as the 33.x contract.

### Brownfield anchors

| Area | Today | This story |
|------|-------|------------|
| Visuals | `MarketingCrmShowcase` + `*ShowcaseMock` in `product-slides.tsx` | Demo mounts fed by one JSON |
| Seed | Three inline casts (showcase, mocks, hero stack) | One `MarketingDemoClub` for cinema rooms. Hero stack is out of scope. |
| Cinema entry | `MarketingHomePage` → `MarketingProductCarousel` | Unchanged export; wrap provider here |
| Pin / hash / PRM | `use-marketing-product-cinema.ts` + carousel gate | Untouched |
| API | Admin pages fetch with JWT | Cinema must not |

### Locked seed

**Fixture name** `MarketingDemoClub` is UX-locked. Product vocabulary remains **Community** (do not relabel admin IA as “Club”).

| Field | Locked value |
|-------|----------------|
| `orgName` | **Riverside Rec** (named; never Acme / Your account) |
| `publicHost` | `riverside-rec.cohestra.app` (caption only if shown) |
| `operatorGreeting` | First name only if dashboard greeting is shown — e.g. Maya (protagonist, not a client row) |
| Clients (visible) | **Elena Martinez** (selected, `active`, Spain, Sunday clinic, “2 days ago”); **Sam Rivera** (`new`, USA, board games night, today); **Jordan Kim** (`contacted`, South Korea, WhatsApp follow up, yesterday); **Priya Shah** (`active`, India, youth open play, 4 days ago) |
| Elena contact | `elena@example.com`, `+34 612 345 678` |
| Elena timeline | Registered Sunday clinic (Mar 8 · #142) → WhatsApp logged (Mar 9) → Registered board games night (Mar 15 · #158) |
| Follow-up subject | Jordan Kim; WhatsApp: `Hi Jordan — reminder for Sunday clinic at 6pm. See you there!` (Mar 9) |
| Activities | Sunday clinic, board games night (required). Priya’s “youth open play” may appear as `lastActivityName` only. |
| Clients list chrome | Title + count **248**; chips All/New/Contacted/Active; search chrome as pixels |
| Dashboard metrics | Align with `DashboardMetrics`: include Sunday clinic on the board; queue includes Jordan (and Sam if space) |
| Campaigns | Rows such as “Sunday clinic reminder”, “New board games night” as `CampaignListItem` |
| Reports | Elena counted once; include Sunday clinic / board games in ranking or filters |
| Website sections | `hero`, `highlights`, `upcomingactivities`, `testimonials` — Sunday clinic + board games night in hero + upcoming activities |

Stable fixture IDs (`demo-elena`, `demo-jordan`, … or UUIDs). Timeline `occurredAt` / `lastRegistrationAt` as ISO-8601 strings. `leadStatus` must be the `LeadStatus` union (`new` \| `contacted` \| `active` \| `inactive`). Call `assertDemoClubInvariants()` at module load so a bad fixture fails tests/typecheck, not silently on the landing page.

Do **not** treat a thrown mount as the omit path — cinema’s `CinemaErrorBoundary` already falls back to the **legacy carousel with the same slides**. A throw would not omit a pill; it would remount mocks/legacy. Omit = `isDemoRoomAvailable` false + null visual, never throw.

### JSON → existing types (do not invent parallel DTOs)

Map seed into the types admin UI already consumes:

| Room | Types | Compose from (presentational only) |
|------|-------|--------------------------------------|
| Clients | `ClientListItem`, `ClientDetail`, `ClientTimelineItem`, `ClientListResult` | `LeadStatusBadge`, `PersonAvatar`, `clients-table-layout` classes, `ClientRelationshipTimeline` / `TimelineEvent`. **Do not** drop in `ClientsListPage` or raw `ClientRow` (it always `<Link href="/clients/:id">`). Extract a presentational row or add a non-link branch **only if** you keep default admin `ClientRow` behavior unchanged. |
| Follow-up | `ClientDetail` + timeline | Same timeline primitives; WhatsApp quote as inhabited content. Not `ClientProfilePage` / `ClientOutreachLogCard` (those call APIs). |
| Dashboard | `DashboardMetrics` | `DashboardGreetingHeader`, `MetricTile` (strip or noop `href`), `DashboardMetricsGraphs` / charts that accept props. Not `DashboardPageClient` / `DashboardFollowUpQueue` (they fetch). |
| Campaigns | `CampaignListItem[]` | List-row chrome from campaigns UI **without** `fetchCampaigns` / plan gates. |
| Reports | `ReportResult` + `ReportFilters` | `ReportResults` / `ReportNarrativeHero` / chart primitives. Not `ReportsPageClient`. |
| Website | `PublicSitePayload` / `SiteSectionsDocument` | `SitePageRenderer` + `web/components/marketing/sections/*`. Section types: `hero` \| `highlights` \| `upcomingactivities` \| `testimonials`. **Not** `WebsiteLivePreview` (it CSS-scales — H6 / 33.5). Not builder editor. Cinema is a light `paper-warm` canvas — do not apply admin dark-theme classes inside mounts. |

Keep `"use client"` only where context/hooks require it.

### H3 contrast

| Token | Hex | Use in mounts |
|-------|-----|----------------|
| `paper-warm` | `#f3f5f7` | Canvas |
| `stone-cinema` | `#5a636e` | Secondary / meta |
| `ink` | `#070d12` | Primary text |
| `stone` | `#8b939c` | **Forbidden** on paper-warm (2.85:1) |

Tokens: `web/styles/brand-tokens.css`. Tailwind: `text-stone-cinema`, `text-ink`, `bg-paper-warm`. Existing mocks use `text-stone` — mounts must not.

`ClientRow` / some admin chrome use `text-text-muted-warm`. If you reuse those classes, the H3 wrapper **must** remap them inside the mount root. 1.4.3 applies to visible text even when the frame is later `aria-hidden`.

### Fallback order (AC 4)

1. Presentational mount + provider
2. Omit that room’s visual (`isDemoRoomAvailable`) — keep six-slide pin count in 33.1
3. Last resort only: inert iframe `/demo/*` with `tabindex={-1}`, `pointer-events-none`, sandbox **without** `allow-scripts`
4. Never: hollow Website rails, Acme seed, `*ShowcaseMock`, iframe of a live tenant

Prefer shipping a cropped Website **preview** over omit. Omit is the escape hatch, not the goal.

### Must leave working

- `MarketingProductCarousel` export and `id="crm"`
- `PRODUCT_SLIDES` ids + count + `CINEMA_CHAPTER_VH` / `CINEMA_HYSTERESIS` / `CINEMA_HEADER_OFFSET_PX`
- Desktop cinema + legacy carousel + error-boundary fallback
- Header/footer `/#crm` links
- Admin/dashboard/website-builder **product** pages (no behavior change except optional `ClientRow` presentational branch)

### Anti-patterns (fail the story)

- New `/api/v1/demo/*` or cloned `DemoDataSeed` for apex
- `authFetch`, JWT, or session cookies on marketing mounts
- Extending `marketing-product-showcase-mocks.tsx` / `MarketingCrmShowcase` as the cinema visual
- `WebsiteBuilderShowcaseMock` or PRO-chip editor theater
- `transform: scale` on live mount roots
- Inner scroll containers that steal the page wheel (no `overflow-y-auto` on mount roots)
- Changing feeling copy, chapter chrome, or pin hook “while you’re in there”
- Introducing Sora or a third palette
- Greenfield second design system

### Architecture / stack

- Next.js **16.3.0**, React 19, TypeScript strict, Tailwind 4, `@/` imports
- Marketing-only: **no .NET / EF / new API**
- Read `web/AGENTS.md` + `node_modules/next/dist/docs/` before Next-specific APIs
- Brownfield extend `web/` — do not create a parallel app
- Apex host is marketing; cinema must not block home paint with network

### Git intelligence

Recent `#crm` work (`2d27c4a`, `b9c7325`) shipped chapter cinema + mock visuals. Evolve `product-slides.tsx` visuals; do not rewrite the pin hook. `spec-landing-product-cinema.md` is done and superseded for visuals.

### Project context (do not miss)

- Stay on Next 16 — no major upgrades
- Brand: Midnight Atelier tokens only
- Product unit name is **Community**; fixture filename may say DemoClub
- Web tests: Vitest (`cd web && npm test`) — no Playwright required unless you add one; this story’s unit test is enough
- Do not couple to `lead-generation-crm`

### Latest tech notes

- `web/tsconfig.json` already has `resolveJsonModule: true` and `esModuleInterop: true` — `import club from "./marketing-demo-club.json"` is valid
- Cinema + mounts are client (pin hook, carousel). Import JSON in the **typed loader** (`marketing-demo-club.ts`) and pass plain objects through context. Do not fetch JSON at runtime.
- If a server parent ever passes the club into a client child, pass serializable plain data only (no functions/class instances)

### Project structure

```
web/lib/marketing/marketing-demo-club.json
web/lib/marketing/marketing-demo-club.ts
web/lib/marketing/marketing-demo-club.test.ts
web/lib/marketing/product-slides.tsx          # UPDATE visuals only
web/components/marketing/marketing-demo-provider.tsx
web/components/marketing/marketing-demo-theme.tsx
web/components/marketing/marketing-product-carousel.tsx  # wrap provider
web/components/marketing/demo-mounts/*
```

Do **not** put demo JSON under `src/` or call the API. Do not add `app/demo/*` unless iframe last-resort is actually required (default: no).

### References

- [Source: `_bmad-output/planning-artifacts/epics-live-proof-cinema.md` — Story 33.1 ACs, FR6/NFR5/NFR6]
- [Source: `ux-cohestra-2026-09-01/EXPERIENCE.md` — rooms, Data & Mount, A5 Website]
- [Source: `ux-cohestra-2026-09-01/DESIGN.md` — H3, ProductFrame, anti-patterns]
- [Source: `ux-cohestra-2026-09-01/mockups/desktop-cinema-clients.html` — Elena/Sam/Jordan/Priya rows]
- [Source: `ux-cohestra-2026-09-01/mockups/desktop-cinema-followup.html` — Jordan WhatsApp]
- [Source: `web/lib/marketing/product-slides.tsx` — slide ids and visual slots]
- [Source: `web/lib/clients-api.ts` — `ClientListItem`, `ClientDetail`, `ClientTimelineItem`]
- [Source: `web/lib/dashboard-api.ts` — `DashboardMetrics`]
- [Source: `web/lib/campaigns-api.ts` — `CampaignListItem`]
- [Source: `web/lib/reports-api.ts` — `ReportResult`]
- [Source: `web/lib/public-site-api.ts` — `PublicSitePayload`]
- [Source: `web/styles/brand-tokens.css` — `stone-cinema` / `paper-warm`]
- [Source: `_bmad-output/project-context.md` — Next 16, Community term, brownfield]

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6

### Debug Log References

### Completion Notes List

- Static Riverside Rec `MarketingDemoClub` JSON + typed loader with module-load invariants
- Six presentational mounts using LeadStatusBadge, PersonAvatar, TimelineEvent, dashboard trend chart, report ranking chrome, SitePageRenderer (no showcase mocks)
- Provider wrap at `MarketingProductCarousel`; H3 remap via `[data-demo-theme]` in `globals.css`
- Vitest 6/6 demo-club + full web suite 151/151; `tsc --noEmit` clean
- Browser verified on localhost:3000/#crm — Clients/Follow-up/Dashboard/Campaigns/Reports/Website seek; mobile clients body OK
- Code-review patches applied and re-verified (Elena phone, March week, Recipients, New leads, H3 chart ticks)
- Pass 2 patches: Mar 8–15 window, board games Sundays, Jordan timeline order, Website mount inert, Total clients tile
- Pass 3 patches: Sunday tables highlight, WhatsApp day from loggedAt, hollow/network invariants
- Pass 4 patches: heroImageAssetId forbid, @example.com emails, ranking + section item hollow guards

### File List

- web/lib/marketing/marketing-demo-club.json
- web/lib/marketing/marketing-demo-club.ts
- web/lib/marketing/marketing-demo-club.test.ts
- web/lib/marketing/product-slides.tsx
- web/components/marketing/marketing-demo-provider.tsx
- web/components/marketing/marketing-demo-theme.tsx
- web/components/marketing/marketing-product-carousel.tsx
- web/components/marketing/demo-mounts/index.ts
- web/components/marketing/demo-mounts/marketing-demo-clients-mount.tsx
- web/components/marketing/demo-mounts/marketing-demo-followup-mount.tsx
- web/components/marketing/demo-mounts/marketing-demo-dashboard-mount.tsx
- web/components/marketing/demo-mounts/marketing-demo-campaigns-mount.tsx
- web/components/marketing/demo-mounts/marketing-demo-reports-mount.tsx
- web/components/marketing/demo-mounts/marketing-demo-website-mount.tsx
- web/app/globals.css
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/33-1-marketingdemoclub-seed-presentational-mounts.md

### Change Log

- 2026-09-01: Implemented Story 33.1 — MarketingDemoClub seed + presentational mounts for `/#crm`
- 2026-09-02: Applied code-review patches — H3 token remap, invariants, March week seed, campaigns/reports/dashboard copy
- 2026-09-02: Pass 2 review patches — Mar 8–15 period, Sunday board-games schedule, queue/section invariants, Website `inert`, Total clients tile
- 2026-09-03: Pass 3 review patches — Sunday highlight copy, WhatsApp day from loggedAt, hollow/network invariants
- 2026-09-03: Pass 4 review patches — heroImageAssetId guard, @example.com emails, ranking/highlights/testimonials hollow guards
