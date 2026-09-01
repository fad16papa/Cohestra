---
story_id: 33.1
story_key: 33-1-marketingdemoclub-seed-presentational-mounts
epic: 33
status: ready-for-dev
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

Status: ready-for-dev

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

- [ ] **Task 1 — Static MarketingDemoClub JSON + types** (AC: 1, 4)
  - [ ] Add `web/lib/marketing/marketing-demo-club.json` — one fixture, all six rooms
  - [ ] Add `web/lib/marketing/marketing-demo-club.ts` — typed parse, accessors, `assertDemoClubInvariants()`
  - [ ] Import JSON as a module (`resolveJsonModule` already true in `web/tsconfig.json`). Do **not** `fetch()` it.
  - [ ] Lock cast and org (see Dev Notes). No Acme / Your account / `yourclub`.
  - [ ] Fixture contacts only: `@example.com`, fictional E.164-looking phones

- [ ] **Task 2 — MarketingDemoProvider + H3 theme** (AC: 1, 3)
  - [ ] Add `web/components/marketing/marketing-demo-provider.tsx` (`"use client"`)
  - [ ] Wrap **once** at `MarketingProductCarousel` root so cinema **and** legacy carousel share the same context
  - [ ] Add `web/components/marketing/marketing-demo-theme.tsx` (or `data-demo-theme` + CSS in `globals.css` / `brand-tokens.css`) that remaps muted text in mounts to `stone-cinema` / `ink`
  - [ ] QA target: Elena meta line “Spain · Sunday clinic · 2 days ago” — not marketing copy column

- [ ] **Task 3 — Six presentational mounts** (AC: 2, 4)
  - [ ] `web/components/marketing/demo-mounts/marketing-demo-clients-mount.tsx`
  - [ ] `web/components/marketing/demo-mounts/marketing-demo-followup-mount.tsx`
  - [ ] `web/components/marketing/demo-mounts/marketing-demo-dashboard-mount.tsx`
  - [ ] `web/components/marketing/demo-mounts/marketing-demo-campaigns-mount.tsx`
  - [ ] `web/components/marketing/demo-mounts/marketing-demo-reports-mount.tsx`
  - [ ] `web/components/marketing/demo-mounts/marketing-demo-website-mount.tsx`
  - [ ] Barrel `web/components/marketing/demo-mounts/index.ts`
  - [ ] Compose **existing** presentational pieces + typed props (see reuse table). Do not copy-paste a second visual language.
  - [ ] No `useAuth` / `authFetch` / `fetchClients` / `fetchDashboardMetrics` / `fetchCampaigns` / `fetchReport` / `fetchPublicSite` in mounts
  - [ ] No `<Link href="/clients/...">`, no WhatsApp/Viber `window.open`, no Publish/save handlers — pixels only
  - [ ] Website: `SitePageRenderer` + `PublicSitePayload` — section `type` values must be exactly `hero`, `highlights`, `upcomingactivities`, `testimonials` (see `site-page-renderer.tsx` switch). Do **not** invent `activities`. **Not** `WebsiteBuilderPage`, editor rails, Design/Sections/Templates tabs, PRO chip
  - [ ] If Website mount is too heavy: export `isDemoRoomAvailable("website") === false` and skip that visual. **Do not** change `PRODUCT_SLIDE_COUNT` / pin `70vh × 6` in this story (tablist rebuild is 33.5). Never substitute `WebsiteBuilderShowcaseMock`.

- [ ] **Task 4 — Wire `PRODUCT_SLIDES[].visual`** (AC: 1, 2)
  - [ ] In `web/lib/marketing/product-slides.tsx`, replace mock visuals with the six mounts
  - [ ] Keep `ProductSlideId` union and order: `clients` → `outreach` → `dashboard` → `campaigns` → `reports` → `website`
  - [ ] Do **not** rewrite `eyebrow` / `title` / `lead` / `points` (33.2)
  - [ ] Do **not** edit `use-marketing-product-cinema.ts` pin math
  - [ ] Leave `MarketingCrmShowcase` / `*ShowcaseMock` files on disk unused by cinema (33.2 deletes chrome). Do not extend them.

- [ ] **Task 5 — Tests + verify** (AC: all)
  - [ ] Vitest: `web/lib/marketing/marketing-demo-club.test.ts`
    - Elena appears in clients **and** reports-derived data
    - Jordan is the Follow-up subject; WhatsApp copy mentions Sunday clinic
    - Activities include Sunday clinic + board games night
    - Reject / fail assert if `orgName` matches `/acme|your account|yourclub/i`
    - No `fetch` / cookie usage in loader
  - [ ] Grep mounts + provider: no `authFetch`, `useAuth`, `document.cookie`
  - [ ] `cd web && npx vitest run lib/marketing/marketing-demo-club.test.ts`
  - [ ] Typecheck touched files (`strict: true`)
  - [ ] Manual: `/#crm` on desktop + mobile/PRM — six inhabited rooms, Elena meta contrast, no network to `/api/v1/*` for cinema mounts (DevTools)

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
