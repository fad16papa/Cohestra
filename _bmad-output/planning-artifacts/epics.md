---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-cohestra-2026-06-14/prd.md
  - _bmad-output/planning-artifacts/prds/prd-website-builder-2026-07-06/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-06-14/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-06-14/EXPERIENCE.md
---

# cohestra - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for cohestra, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-1: An authenticated operator can create, edit, and archive an Activity with name, category, schedule, location, status, and business purpose. Archived Activities stop accepting new Registrations but retain historical data. Activity list is searchable and filterable by status and category. Each Activity exposes a unique public registration URL.

FR-2: An operator can define a Form per Activity with required fields, optional fields, custom questions, consent capture, and Referral Source options. Required fields block submission until valid. Form changes apply to new Registrations only; prior submissions retain captured answers. Three preset templates match TGH Tennis, Ikigai Pickleball, and Board Game Night field sets.

FR-3: The system generates a QR Code and public URL per published Activity. QR resolves to the same URL as the public link. Public page loads on mobile without authentication. Unpublished or archived Activities return a clear unavailable state on the public URL.

FR-4: A participant can submit an Activity's public Form without an account. Successful submission creates a Registration linked to the Activity, triggers create-or-update logic on the Master Client List (FR-6), and shows an on-screen confirmation with no login required.

FR-5: The system stores per Client: name, contact number, email or social handle, profession, nationality, residency (when captured), consent and communication preference, Lead Status, notes, and referral/invited-by details. Profile displays master fields plus activity-specific answer history. Operators can edit Lead Status and notes from the profile view. Inactive vs. active distinction is visible and filterable.

FR-6: On each Registration, the system matches existing Clients by normalized contact details before creating a new record. Matching phone number (and email when present) updates the existing Client rather than creating a duplicate. Operator can view merge-suspect pairs (flag only in MVP). Each Registration remains a distinct record even when Client is deduplicated.

FR-7: An operator can view a Client's Activities registered, Campaigns received, follow-up history, Referral Source history, and active/inactive status. Relationship view lists all Registrations chronologically with Activity name and date. Follow-up actions (email sent, WhatsApp initiated, status changes) append to history with timestamp.

FR-8: An authenticated operator sees at-a-glance counts including total leads, new leads in period, active lead engines (Activities), and follow-up coverage percentage. Metrics refresh to reflect new Registrations without full page rebuild (near-real-time within 60 seconds). Dashboard loads within 3 seconds on standard broadband. Empty state displays when no Activities exist yet.

FR-9: Dashboard highlights per-Activity registration volume and ranking for the selected period. Operator can see which Activities drove the most Registrations in the current week. Click-through navigates to Activity detail or filtered Client list.

FR-10: An operator can run Reports for weekly and monthly periods showing activities hosted, registrations, new leads, follow-up status, activity ranking, lead growth, community ranking, repeat participants, inactive Clients, and Campaign results. Weekly and monthly presets set date range automatically. Report data matches underlying Registration and Client records (reconcilable).

FR-11: An operator can filter Reports by date range, Activity, Community, Lead Status, and Referral Source, and export results. Export produces a downloadable CSV file. Filters combine conjunctively (AND semantics). Export respects applied filters.

FR-12: An operator can create an email Campaign with subject, body, and recipient selection from Client segments (by Activity, Lead Status, Community, or manual selection). Send action delivers email to all selected recipients with valid email addresses. Failed sends are logged with reason. Welcome email can be triggered manually after registration (automated welcome on submit is Phase 2 unless confirmed).

FR-13: An operator can save message templates and view Campaign history per Client. Templates are selectable when composing a new Campaign. Client profile shows sent Campaigns with date and subject.

FR-14: An operator can initiate WhatsApp chat from a Client profile using the registered mobile number (deep link / click-to-message). Action opens WhatsApp (app or web) with the Client's number pre-filled. Works on operator's mobile and desktop environments where WhatsApp is available.

FR-15: An operator can record WhatsApp follow-up status on the Client record (e.g., contacted, awaiting reply). Status change appends to follow-up history with timestamp and optional operator note. Dashboard follow-up coverage metric includes WhatsApp-touched Clients.

FR-16: Only authenticated users can access dashboard, Client records, Activity management, Reports, and Campaigns. Unauthenticated requests to admin routes redirect to login. Session expires after configurable inactivity period (24-hour session acceptable for MVP).

### NonFunctional Requirements

NFR-1: Public registration page must be interactive within 2 seconds on 4G mobile.

NFR-2: Admin dashboard must load within 3 seconds on standard broadband.

NFR-3: Dashboard metrics must refresh to reflect new Registrations within 60 seconds (near-real-time polling acceptable for MVP; no WebSockets required).

NFR-4: Registration-to-master-list reliability — 100% of successful public Form submissions create a Registration and Client link within 60 seconds (synchronous API ingestion).

NFR-5: Availability target of ~99% uptime during business hours acceptable for MVP single-client deployment.

NFR-6: Admin routes and admin API endpoints require authentication (JWT Bearer). Public registration endpoints are unauthenticated but protected with rate limiting and bot mitigation.

NFR-7: Consent captured on Forms where required (e.g., Board Game community consent). Communication preferences honored on Campaign recipient selection.

NFR-8: Registrations are immutable after submit. Profile corrections and status changes are audited in append-only follow-up history / timeline.

NFR-9: Error logging for failed email sends and registration failures. Operator-visible error on failed public form submit.

NFR-10: Email Campaign content must not expose other recipients — use individual sends or BCC, never expose recipient list in headers.

NFR-11: Public registration page target FCP < 2s on 4G (SSR form schema per architecture/UX).

NFR-12: All form fields must have visible labels and accessible error descriptions (WCAG AA contrast floor on all surfaces in both light and dark themes).

### Additional Requirements

- **Starter / project scaffold (Epic 1 Story 1):** API-first solution with `Cohestra.sln` containing Api, Application, Domain, Infrastructure, and Contracts layers. Docker Compose services: api (ASP.NET Core), postgres, redis, web (Next.js). Local development and production deployment via Docker Compose on DigitalOcean Ubuntu.

- **Backend stack:** ASP.NET Core Web API, Entity Framework Core, PostgreSQL (relational core + JSONB for dynamic form schemas and registration answers), Redis (required for MVP — not deferred).

- **Web client stack:** Next.js + Tailwind CSS + shadcn/ui + next-themes. Web client is UI-only — no business logic, dedup, campaigns, reports, or persistence in Next.js.

- **Authentication:** ASP.NET Core Identity for operator user store. JWT access + refresh tokens. Direct JWT in Next.js (Authorization: Bearer). Refresh tokens stored in Redis with TTL and revocation. Login at `POST /api/v1/auth/login`, refresh at `POST /api/v1/auth/refresh`. Operator appearance/theme preference stored on Identity user profile.

- **API conventions:** Versioned REST at `/api/v1/...`. DTOs only on wire — never expose EF entities. Pagination on all list endpoints. Stable UUIDs for resource identifiers. RFC 7807 ProblemDetails for errors. OpenAPI spec published. Optional `Idempotency-Key` on public registration POST.

- **API surface groups:** Public (none + rate limit) for activity by slug and registration submit; Admin (JWT Bearer) for activities, clients, campaigns, reports, settings; Health (`/health`, `/ready`) for containers.

- **Redis use cases:** Sliding-window rate limiting per IP on public registration POST; hot-read cache for published activity + form schema by slug (invalidate on update/publish); dashboard metric cache with ~60s TTL; refresh token store.

- **Data model:** `activities.form_schema` → JSONB; `registrations.answers` → JSONB (immutable); `clients` → normalized master fields; dedup at registration via normalized phone/email match before insert; append-only timeline events for audit.

- **Email provider:** SendGrid API from Infrastructure layer. Configure sender domain and DNS (SPF/DKIM) before production campaigns.

- **Infrastructure & deployment:** DigitalOcean Ubuntu Linux. nginx reverse proxy for TLS termination — route `/api` → API container, `/` → Next.js. HTTPS required. Secrets (SendGrid API key, JWT signing key) in environment — not in source control. CORS restricted to Next.js web origin(s) on admin endpoints.

- **QR code generation:** Server-side in API. Downloaded PNG always white background regardless of UI theme.

- **Phone default:** +63 (PH) country code assumption for contact fields.

- **Export format:** CSV for MVP reports export.

- **Three launch form templates:** TGH Tennis, Ikigai Pickleball, Ikigai Board Game Night — seed data against shared JSON schema format, not separate database schemas.

- **Lead Status lifecycle:** New → Contacted → Active → Inactive — drives filters, badges, reports, and API segment builder.

- **Community model:** Label/category on Activities for reporting and segmentation — not a separate tenant entity.

- **Segment/filter engine:** AND-semantics shared by Reports and Campaign compose endpoints.

- **Observability:** Structured logging (Serilog). Health checks for container orchestration.

- **Open architecture decisions (may become stories):** CI/CD pipeline (GitHub Actions → DO deploy), nginx + SSL certificate automation (Certbot), SendGrid sender domain confirmation with client.

### UX Design Requirements

UX-DR1: Implement brand design token system — map forest-green primary, accent, warm surfaces, text, Lead Status semantic colors, and WhatsApp action color to CSS variables in `:root` and `.dark`. Components reference semantic vars (`--background`, `--foreground`, `--primary`, custom warm tokens) — never hard-coded hex in JSX.

UX-DR2: Implement next-themes with `darkMode: ['class']`, `attribute="class"`, `defaultTheme="system"`, `enableSystem={true}`. Light, Dark, and System modes on every admin and public surface.

UX-DR3: Implement no-flash-of-wrong-theme — blocking inline script in document `<head>` resolves stored preference before first paint.

UX-DR4: Admin theme persistence — save operator choice to account profile on change; load from profile on login with localStorage fallback before auth hydrates. Settings → Appearance segmented control (Light · Dark · System) syncs with top-bar ThemeToggle instantly.

UX-DR5: Public theme persistence — localStorage scoped to app origin only (no participant account). Default first visit to System mode.

UX-DR6: Build StatusBadge domain component — maps Lead Status (New, Contacted, Active, Inactive) to dedicated status-badge tokens. Always text + color together; never icon-only.

UX-DR7: Build ActivityCard domain component — activity name, community tag, registration count, status pill, hover lift shadow. Used on Dashboard and Activities list.

UX-DR8: Build ClientRow domain component — DataTable row with name semibold, status badge, last activity caption, chevron. Click navigates to Client profile. Server pagination 25 rows.

UX-DR9: Build RegistrationForm domain component — renders from Activity JSON schema. Public variant: full-width fields with 20px field gap, inline validation on blur, submit disabled until required fields + consent valid. Admin preview variant: bordered preview card. Single-page form for MVP.

UX-DR10: Build ActivityHero domain component — public registration only. Activity name (public-hero typography), schedule/location meta, community tag, optional cover image (16:9, max 50kb). Hidden on confirmation state.

UX-DR11: Build TimelineEvent domain component — chronological client history (Registration submitted, Email campaign sent, Lead Status changed, WhatsApp status updated, Operator note added). Newest first. Left border accent in primary color.

UX-DR12: Build MetricTile domain component — large number, label caption, optional trend. Dashboard only. Tap navigates to filtered Clients list or Activity detail. Empty state when no Activities exist.

UX-DR13: Build QrPanel domain component — live QR preview, copy URL button, download PNG button. QR and URL always match. Downloaded PNG always white background + black modules.

UX-DR14: Build ConsentBlock domain component — Board Game Night template only. Bordered card, required checkbox, plain-language consent copy. Cannot submit unchecked.

UX-DR15: Build WhatsAppButton domain component — brand green (`#25D366`) exclusively on WhatsApp actions. Full width on mobile client profile. Opens `wa.me/{phone}` in new tab/app.

UX-DR16: Build ThemeToggle domain component — three-way control (Light · Dark · System) in admin top bar and public footer. Popover/dropdown with active selection highlighted. Icon reflects current resolved appearance (sun/moon). Keyboard accessible with `aria-label` including current mode.

UX-DR17: Build DashboardLayout page shell — left sidebar nav (240px, collapses to icon rail below 768px, then Sheet), top bar with page title + "Updated {time}" + ThemeToggle, content well max-w-7xl with 24px padding.

UX-DR18: Build PublicFormLayout page shell — no nav, no auth chrome, centered column max 480px, minimum 20px side margins on mobile, footer with ThemeToggle + "Powered by Creativorare". Public routes must never render admin sidebar.

UX-DR19: Implement full admin Information Architecture — routes for `/login`, `/dashboard`, `/activities`, `/activities/new`, `/activities/{id}` (tabs: Overview · Form · Registrations · QR & Link), `/clients`, `/clients/{id}`, `/campaigns`, `/campaigns/new`, `/reports`, `/settings`.

UX-DR20: Implement full public Information Architecture — `/register/{activitySlug}` for registration, confirmation (post-submit state), and unavailable (archived/unpublished) states. No tabs, account creation, or app download prompts.

UX-DR21: Dashboard metrics poll API every 60 seconds. Top bar displays "Updated {time}". Subsequent polls update tiles without full-page flash (page-level spinner on first load only).

UX-DR22: Build SegmentPicker for Campaign compose — presets: All clients, By Activity, By Lead Status, By Community, Manual multi-select. AND semantics across filters. Warning when segment includes non-consented records.

UX-DR23: Build ReportFilterBar — date preset (week/month/custom) + Activity + Community + Lead Status + Referral Source. Filter chips clear individually; "Clear all" resets. Export respects active filters.

UX-DR24: Build FormFieldEditor for Activity detail Form tab — add/remove/reorder fields via structured list (not canvas drag-and-drop). Template picker for TGH Tennis, Ikigai Pickleball, Board Game Night.

UX-DR25: Activity create flow — wizard: metadata (name, community, category, schedule, location, status draft) → Form configuration → Publish. Unpublished banner on Activity detail: "Not live — publish to generate QR and link."

UX-DR26: Per-activity public branding — optional hero image URL and accent color override on public page only (buttons/links). Platform primary used when no override. Typography and spacing never per-activity in MVP.

UX-DR27: Implement state patterns — first-time operator empty dashboard with CTA to create activity; merge-suspect banner on Client profile; session expired redirect to `/login` with Toast; campaign send partial failure summary; report empty state; theme change mid-form preserves field values and scroll position; OS theme changes in System mode update UI within one frame without reload.

UX-DR28: Accessibility floor — visible `<Label>` + `aria-describedby` for errors on all fields; focus order follows visual order; dialog focus trap with Esc close; DataTable sort buttons labeled; public confirmation uses `role="status"` live region; Reduce Motion disables hover card lift; 44×44px minimum target on public CTAs; verify Lead Status badge contrast in both light and dark resolved themes.

UX-DR29: Voice and tone microcopy — public: "You're registered for {activity}", "Join activity", "See you there" (not "Form submitted" or CRM jargon). Admin: "3 new registrations since yesterday", "Send follow-up email" (not "Lead count increased" or "Initiate campaign workflow").

UX-DR30: Phone input with country code default +63 (PH). Public tap targets ≥ 48px height. Sticky footer on tall forms so ThemeToggle remains reachable without scrolling past submit.

UX-DR31: Responsive breakpoints — public default full-width below 768px, centered max 480px at 768px+. Admin: sidebar → Sheet below 768px, tables horizontal scroll, full layout at ≥1280px.

UX-DR32: Banned in MVP — drag-and-drop dashboards, inline table cell edit, push notifications, participant self-service portal, light-only screens, charts beyond simple bar summaries, drag-and-drop form builder UI.

### FR Coverage Map

FR-1: Epic 2 — Create and manage Activities
FR-2: Epic 2 — Configure Activity Forms
FR-3: Epic 2 — Generate QR Code and public registration link
FR-4: Epic 3 — Capture Registrations from public Forms
FR-5: Epic 3 — Maintain master Client profile
FR-6: Epic 3 — Deduplicate Clients on registration
FR-7: Epic 3 — Relationship view per Client
FR-8: Epic 4 — Display operational dashboard metrics
FR-9: Epic 4 — Activity performance on dashboard
FR-10: Epic 4 — Generate weekly and monthly Reports
FR-11: Epic 4 — Filter and export Reports
FR-12: Epic 5 — Compose and send email Campaigns
FR-13: Epic 5 — Reusable email templates and Campaign history
FR-14: Epic 5 — WhatsApp click-to-message from Client profile
FR-15: Epic 5 — Track manual WhatsApp follow-up status
FR-16: Epic 1 — Authenticate operators

## Epic List

### Epic 1: Platform Foundation & Operator Access
Marco can sign in to a branded, theme-ready admin platform with secure JWT sessions and empty-state dashboard.
**FRs covered:** FR-16
**Pre-sprint gates:** N/A (foundation epic)

### Epic 2: Activity Launch & Publishing
Marco can create Activities, configure Forms from templates, publish with publish-gate validation, and share QR codes and public links (form shell + stub submit until Epic 3).
**FRs covered:** FR-1, FR-2, FR-3
**Pre-sprint gate:** QR landing state — published slug shows ActivityHero + form shell; submit returns stub 202 until Epic 3

### Epic 3: Lead Capture & Client Profiles
Elena can register via mobile QR/link; submissions create deduped Client records with profiles, timeline, and merge-suspect flags.
**FRs covered:** FR-4, FR-5, FR-6, FR-7
**Pre-sprint gates:** FR-6 dedup scope (exact E.164 phone + email match, flag-only); ATDD red tests before dedup implementation; Epic 2→3 frozen Activity + JSON form schema contract

### Epic 4: Operational Visibility & Business Reports
Marco monitors live pipeline health on the dashboard and produces filtered weekly/monthly reports with CSV export.
**FRs covered:** FR-8, FR-9, FR-10, FR-11

### Epic 5: Follow-Up Outreach & Campaign Tracking
Marco sends segmented email campaigns, uses WhatsApp click-to-message, and tracks follow-up actions on client timelines.
**FRs covered:** FR-12, FR-13, FR-14, FR-15

### Epic 6: Post-MVP Enhancements (Shipped)
Brownfield improvements from operator production use: community/category catalogs, form editor UX, client outreach guards, campaign/consent hardening.
**Stories:** 6.1–6.5 — see `_bmad-output/implementation-artifacts/epic-6-post-mvp-enhancements.md`

### Epic 7: Production Readiness & Artifact Alignment (Backlog)
Close documentation drift, CI/test gaps, and scale limits before Phase 2 product expansion.
**Priority:** Complete before Epic 8 (Phase 2 product features)
**Stories:** 7.1–7.6 — see epic section below

### Epic 9: Website Builder (Site Page Composer) (Backlog)
Community operator customizes public homepage with draft/publish, CRM-fed upcoming activities, and runtime render (no Docker rebuild).
**Source:** `prd-website-builder-2026-07-06`
**Stories:** 9.1–9.8 — see epic section below

## Epic 1: Platform Foundation & Operator Access

Marco can sign in to a branded, theme-ready admin platform. Delivers project scaffold, JWT authentication, design system foundation, and admin/public page shells.

### Story 1.1: Solution Scaffold and Docker Compose

As a developer,
I want the full solution scaffold with Docker Compose services,
So that all subsequent stories deploy and run consistently in local and production environments.

**Acceptance Criteria:**

**Given** a fresh clone of the repository
**When** I run `docker compose up`
**Then** services start for `api` (ASP.NET Core), `postgres`, `redis`, and `web` (Next.js placeholder)
**And** the solution contains `Api`, `Application`, `Domain`, `Infrastructure`, and `Contracts` projects with bounded-context folder stubs (`Activities`, `Clients`, `Campaigns`, `Reports`)

**Given** the API container is running
**When** I request `GET /health` and `GET /ready`
**Then** both return success responses suitable for container orchestration

### Story 1.2: Database Bootstrap and OpenAPI Foundation

As a developer,
I want EF Core migrations and OpenAPI published,
So that the API has a reproducible database baseline and a wire contract for web and future mobile clients.

**Acceptance Criteria:**

**Given** PostgreSQL is running via Docker Compose
**When** migrations are applied on startup or via documented command
**Then** the database schema is created without errors on a fresh database
**And** OpenAPI spec is available at a documented URL with `/api/v1` versioning
**And** API errors return RFC 7807 `ProblemDetails` format

### Story 1.3: Operator Identity and JWT Authentication

As an operator (Marco),
I want to sign in with email and password and receive JWT tokens,
So that I can access protected admin features securely.

**Acceptance Criteria:**

**Given** ASP.NET Core Identity is configured with a seeded operator account
**When** I POST valid credentials to `POST /api/v1/auth/login`
**Then** I receive an access token and refresh token
**And** refresh tokens are stored in Redis with TTL and revocation support

**Given** I have a valid access token
**When** I call an admin endpoint with `Authorization: Bearer {token}`
**Then** the request succeeds
**And** unauthenticated admin requests return 401

**Given** my access token is expired but refresh token is valid
**When** I POST to `POST /api/v1/auth/refresh`
**Then** I receive a new access token without re-entering password

**Given** 24 hours of inactivity per PRD assumption
**When** my refresh token expires
**Then** I must sign in again (FR-16)

### Story 1.4: Next.js Web Scaffold with shadcn/ui

As a developer,
I want the Next.js web client scaffolded with shadcn/ui and Tailwind,
So that admin and public UI stories share a consistent component foundation.

**Acceptance Criteria:**

**Given** the web container builds successfully
**When** I open the web app root
**Then** Next.js App Router is configured with Tailwind and shadcn/ui primitives available
**And** the web client calls the API at the configured base URL (no business logic in Next.js API routes for domain features)

### Story 1.5: Brand Design Token System

As an operator and participant,
I want consistent brand colors and typography via CSS variables,
So that the product feels warm, trustworthy, and community-grounded in both light and dark modes.

**Acceptance Criteria:**

**Given** `DESIGN.md` brand tokens
**When** the app loads
**Then** CSS variables in `:root` and `.dark` map primary, accent, warm surfaces, text, Lead Status, and WhatsApp colors (UX-DR1)
**And** no hard-coded hex values exist in JSX component files

### Story 1.6: Theme System with No-Flash Loading

As a user on any surface,
I want Light, Dark, and System themes without a flash of wrong theme on load,
So that the UI matches my preference immediately.

**Acceptance Criteria:**

**Given** next-themes is configured with `defaultTheme="system"` and class-based dark mode (UX-DR2, UX-DR3)
**When** I load any page
**Then** a blocking inline script in `<head>` resolves theme before first paint
**And** System mode follows OS `prefers-color-scheme` and updates live without page reload

### Story 1.7: ThemeToggle Component

As a user,
I want a three-way theme control (Light · Dark · System),
So that I can choose my preferred appearance on admin and public surfaces.

**Acceptance Criteria:**

**Given** ThemeToggle in admin top bar and public footer (UX-DR16)
**When** I open the theme popover
**Then** all three options are visible with the active selection highlighted
**And** the icon reflects resolved appearance (sun/moon when System + OS dark)
**And** `aria-label` includes current mode; keyboard navigation works (Tab → Enter → arrow keys)

### Story 1.8: DashboardLayout Admin Shell

As an operator,
I want a consistent admin layout with sidebar navigation,
So that I can navigate the platform efficiently on desktop and mobile.

**Acceptance Criteria:**

**Given** I am authenticated
**When** I view any admin page
**Then** DashboardLayout renders with 240px sidebar, top bar (page title + ThemeToggle), and content well max-w-7xl (UX-DR17, UX-DR31)
**And** sidebar collapses to icon rail below 768px, then Sheet navigation
**And** placeholder routes exist for dashboard, activities, clients, campaigns, reports, settings (UX-DR19 partial)

### Story 1.9: PublicFormLayout Shell

As a participant,
I want a clean, centered registration layout without admin chrome,
So that registering feels like joining an activity, not using a CRM.

**Acceptance Criteria:**

**Given** I visit a public route
**When** the page renders
**Then** PublicFormLayout shows centered column max 480px, 20px mobile margins, footer ThemeToggle + "Powered by Creativorare" (UX-DR18)
**And** no admin sidebar or auth chrome appears on public routes

### Story 1.10: Login Page and Admin Route Protection

As an operator,
I want to sign in via a login page and be blocked from admin routes when unauthenticated,
So that client data stays protected.

**Acceptance Criteria:**

**Given** I am not authenticated
**When** I visit `/dashboard`, `/activities`, `/clients`, `/campaigns`, or `/reports`
**Then** I am redirected to `/login` (FR-16)

**Given** I am on `/login`
**When** I submit valid credentials
**Then** I am redirected to `/dashboard` with tokens stored for API calls

**Given** my session expires
**When** I attempt an admin action
**Then** I am redirected to `/login` with toast "Session expired — sign in again." (UX-DR27)

### Story 1.11: Empty Dashboard and Settings Appearance

As an operator signing in for the first time,
I want an empty dashboard with a clear next step and theme settings,
So that I know how to start capturing registrations.

**Acceptance Criteria:**

**Given** no Activities exist
**When** I view `/dashboard`
**Then** I see empty state: "Create your first activity to start capturing registrations." with CTA to `/activities/new` (UX-DR27, FR-8 empty state partial)

**Given** I open Settings → Appearance
**When** I select Light, Dark, or System
**Then** my choice persists to operator profile and syncs with top-bar ThemeToggle instantly (UX-DR4)
**And** localStorage mirrors preference for instant load before auth hydrates

## Epic 2: Activity Launch & Publishing

Marco can create Activities, configure Forms, publish with validation, and share QR codes. Public URL shows form shell with stub submit until Epic 3 delivers capture.

### Story 2.1: Activity Entity and Admin CRUD API

As an operator,
I want to create, read, update, and archive Activities via the API,
So that I can manage my lead engines programmatically and from the UI.

**Acceptance Criteria:**

**Given** I am authenticated
**When** I POST to create an Activity with name, category, schedule, location, status, and community label
**Then** the Activity is persisted with a stable UUID and unique slug for public URL (FR-1)
**And** archived Activities retain historical data but cannot accept new registrations

**Given** Activities exist
**When** I GET the activities list with status or category filters
**Then** results are paginated and filterable (FR-1)

### Story 2.2: Activity List and Create Wizard UI

As an operator,
I want to browse Activities and start a create wizard,
So that I can launch new lead engines quickly.

**Acceptance Criteria:**

**Given** I am on `/activities`
**When** the page loads
**Then** I see a searchable/filterable Activity list with ActivityCard components (UX-DR7)
**And** a "New activity" CTA navigates to `/activities/new`

**Given** I am on `/activities/new`
**When** I complete metadata step (name, community, category, schedule, location, draft status)
**Then** the Activity is saved as draft (UX-DR25 step A)

### Story 2.3: Form Schema Storage and Field-Type Contract

As a developer,
I want a frozen JSON form schema format stored in PostgreSQL JSONB,
So that Epic 3 registration rendering and dedup have a stable contract.

**Acceptance Criteria:**

**Given** an Activity exists
**When** I save a form schema via admin API
**Then** it is stored in `activities.form_schema` JSONB with documented field-type enum (text, phone, email, select, checkbox, consent, referral_source)
**And** the contract document is referenced in API OpenAPI and dev notes (Epic 2→3 gate)

### Story 2.4: FormFieldEditor and Form Preview

As an operator,
I want to add, remove, and reorder form fields with a structured editor,
So that each Activity captures the right information without a developer.

**Acceptance Criteria:**

**Given** I am on Activity detail Form tab
**When** I use FormFieldEditor (UX-DR24)
**Then** I can add/remove/reorder fields via structured list (no drag-and-drop canvas)
**And** I can mark fields required or optional
**And** an admin preview variant of RegistrationForm shows the current schema (UX-DR9 preview)

**Given** I change the form schema
**When** I save
**Then** changes apply to new Registrations only; prior submissions unchanged (FR-2)

### Story 2.5: Launch Form Template Seeds

As an operator,
I want preset templates for TGH Tennis, Ikigai Pickleball, and Board Game Night,
So that I can launch activities in under 15 minutes (SM-4).

**Acceptance Criteria:**

**Given** I am configuring a new Activity form
**When** I select a template (TGH Tennis, Ikigai Pickleball, or Board Game Night)
**Then** the form schema populates with the proposal field sets including referral source (FR-2)
**And** Board Game Night template includes consent field type for ConsentBlock (UX-DR14)

### Story 2.6: Activity Publish Status Machine

As an operator,
I want to publish and unpublish Activities through a clear status workflow,
So that I control when registration links go live.

**Acceptance Criteria:**

**Given** a draft Activity with valid metadata
**When** I publish the Activity
**Then** status transitions Draft → Published (FR-1, FR-3)
**And** unpublished Activities show banner: "Not live — publish to generate QR and link." (UX-DR25)

**Given** a published Activity
**When** I archive it
**Then** status becomes Archived and public URL shows unavailable state (FR-1, FR-3)

### Story 2.7: Publish-Gate Form Validation

As an operator,
I want QR and public link disabled until the form meets minimum requirements,
So that participants never scan a QR to a broken capture page.

**Acceptance Criteria:**

**Given** an Activity with incomplete form (no required contact field)
**When** I attempt to publish
**Then** publish is blocked with clear validation message (Party Mode publish-gate)
**And** QrPanel remains disabled until publish succeeds

**Given** a form with at least one required contact field and valid template/consent rules
**When** I publish
**Then** QR and copy-link activate (Sally publish-gate, pre-sprint gate)

### Story 2.8: QR Code Generation and QrPanel

As an operator,
I want to preview, copy, and download a QR code for my published Activity,
So that I can share it at venues and on social media.

**Acceptance Criteria:**

**Given** a published Activity
**When** I open Activity detail QR & Link tab
**Then** QrPanel shows live QR preview, copy URL button, and download PNG (UX-DR13, FR-3)
**And** QR URL matches public link `/register/{slug}`
**And** downloaded PNG has white background + black modules regardless of UI theme

### Story 2.9: Public Registration Page Shell and Unavailable States

As a participant,
I want to land on a credible page when scanning a QR, even before capture is live,
So that I trust the registration process.

**Acceptance Criteria:**

**Given** a published Activity slug
**When** I visit `/register/{slug}` unauthenticated on mobile
**Then** ActivityHero shows activity name, schedule, location, community tag (UX-DR10, FR-3, NFR-11 SSR)
**And** RegistrationForm shell renders from schema but submit calls stub endpoint

**Given** an unpublished or archived Activity slug
**When** I visit `/register/{slug}`
**Then** I see "This activity is no longer accepting registrations." with no form (UX-DR20, FR-3)

### Story 2.10: Stub Registration Endpoint

As a developer,
I want a stub public registration endpoint returning 202 Accepted,
So that Epic 2 delivers a complete QR journey and Epic 3 implements real capture against a frozen contract.

**Acceptance Criteria:**

**Given** a published Activity
**When** I POST to `POST /api/v1/public/registrations` with valid shape
**Then** the API returns 202 Accepted without persisting a Registration (Winston stub handshake)
**And** OpenAPI documents the request/response contract Epic 3 will fulfill

### Story 2.11: Redis Cache for Published Activities

As a developer,
I want published activity and form schema cached in Redis,
So that public pages load within performance targets.

**Acceptance Criteria:**

**Given** a published Activity
**When** I GET public activity by slug
**Then** response is served from Redis cache on subsequent requests
**And** cache invalidates on Activity update, publish, or archive

## Epic 3: Lead Capture & Client Profiles

Elena registers via mobile; submissions create deduped Clients with profiles and timeline. Highest complexity: dedup (FR-6) with ATDD red phase before implementation.

### Story 3.1: Client Entity and Registration Ingestion API

As a participant,
I want to submit a registration form successfully,
So that I am registered for the activity without creating an account.

**Acceptance Criteria:**

**Given** a published Activity with valid form schema
**When** I POST registration answers to the public API
**Then** a Registration record is created linked to the Activity with immutable JSONB answers (FR-4, NFR-8)
**And** a Client record is created or updated (FR-5)
**And** response completes within 60 seconds (NFR-4, SM-1)

### Story 3.2: Public Registration Rate Limiting and Idempotency

As the platform,
I want rate limiting and idempotent registration submits,
So that public forms are protected from abuse and duplicate submits.

**Acceptance Criteria:**

**Given** Redis rate limiter is configured
**When** excessive POSTs arrive from one IP to public registration endpoint
**Then** requests are throttled (NFR-6)

**Given** a valid `Idempotency-Key` header on retry
**When** the same submission is POSTed again
**Then** the API returns the original result without duplicate Registration (architecture convention)

### Story 3.3: Client Deduplication Logic

As the platform,
I want to match registrations to existing Clients by normalized phone and email,
So that Elena does not create duplicate records when registering for multiple activities.

**Acceptance Criteria:**

**Given** ATDD red-phase tests are committed covering dedup matrix (Murat gate)
**When** a registration arrives with phone matching an existing Client (E.164 normalized, +63 default)
**Then** the existing Client is updated, not duplicated (FR-6, UJ-1 edge case)
**And** a new distinct Registration record is still created

**Given** phone matches but email conflicts across records
**When** dedup runs
**Then** Client is flagged merge-suspect only; no auto-merge UI in MVP (FR-6, pre-sprint gate)

### Story 3.4: RegistrationForm Public Component

As a participant (Elena),
I want to complete a mobile-friendly registration form with inline validation,
So that I can join an activity quickly from a QR scan.

**Acceptance Criteria:**

**Given** I am on `/register/{slug}` for a published Activity
**When** I interact with RegistrationForm (UX-DR9, UX-DR30)
**Then** fields render from JSON schema with 20px gap, labels, blur validation, +63 phone default
**And** submit is disabled until required fields and consent (if present) are valid
**And** tap targets are ≥ 48px; sticky footer keeps ThemeToggle reachable

**Given** I tap "Join activity"
**When** submission succeeds
**Then** confirmation replaces form with "You're registered for {activity}. See you there." and `role="status"` live region (UX-DR29, UX-DR28, FR-4)

**Given** network error on submit
**When** submit fails
**Then** inline error with retry appears; field values preserved (UJ-1 failure path, NFR-9)

### Story 3.5: ActivityHero and Per-Activity Branding

As a participant,
I want to see activity details and optional branding on the registration page,
So that I know what I am joining.

**Acceptance Criteria:**

**Given** an Activity with optional hero image and accent color override
**When** I view the public registration page
**Then** ActivityHero shows name, schedule, location, community, optional 16:9 hero (UX-DR10, UX-DR26)
**And** accent color applies to buttons/links on public page only

### Story 3.6: Clients List with ClientRow

As an operator,
I want to browse the Master Client List,
So that I can find and review leads captured from activities.

**Acceptance Criteria:**

**Given** Clients exist from registrations
**When** I visit `/clients`
**Then** DataTable shows ClientRow with name, StatusBadge, last activity caption, chevron (UX-DR6, UX-DR8)
**And** server pagination returns 25 rows per page
**And** I can sort by name, status, last registration date

### Story 3.7: Client Profile Master Fields and Lead Status

As an operator,
I want to view and edit Client profile fields and Lead Status,
So that I can manage follow-up priorities.

**Acceptance Criteria:**

**Given** I open `/clients/{id}`
**When** the profile loads
**Then** master fields display (name, contact, email/social, profession, consent, notes) plus activity-specific answer history (FR-5)
**And** I can change Lead Status via dropdown with confirmation toast (UX-DR6)
**And** status change appends TimelineEvent with timestamp (NFR-8)

### Story 3.8: Client Relationship Timeline

As an operator,
I want to see a Client's registration history and follow-up events,
So that I have full context before outreach.

**Acceptance Criteria:**

**Given** a Client with multiple Registrations
**When** I view the profile timeline
**Then** TimelineEvent lists Registrations chronologically (newest first) with Activity name and date (UX-DR11, FR-7)
**And** Referral Source history is visible per registration

### Story 3.9: Merge-Suspect Flag Banner

As an operator,
I want to see when a Client may be a duplicate,
So that I can review data quality without a merge UI in MVP.

**Acceptance Criteria:**

**Given** a Client flagged merge-suspect by dedup rules
**When** I view their profile
**Then** subtle banner shows: "Possible duplicate — review suggested." with link to filtered list (UX-DR27, FR-6)

### Story 3.10: Activity Detail Registrations Tab

As an operator,
I want to see registrations for a specific Activity,
So that I can monitor incoming sign-ups in real time.

**Acceptance Criteria:**

**Given** I am on Activity detail Registrations tab
**When** registrations exist
**Then** table lists registrants with submission date and links to Client profile
**And** table loading shows spinner in body only (UX-DR27)

## Epic 4: Operational Visibility & Business Reports

Marco monitors pipeline health and exports stakeholder reports.

### Story 4.1: Dashboard Metrics API with Redis Cache

As an operator,
I want aggregated dashboard metrics from the API,
So that the dashboard loads quickly and stays current.

**Acceptance Criteria:**

**Given** Clients and Registrations exist
**When** I GET dashboard metrics as authenticated operator
**Then** response includes total leads, new leads in period, active Activities count, follow-up coverage % (FR-8)
**And** aggregates are cached in Redis with ~60s TTL

### Story 4.2: Dashboard MetricTile UI with Polling

As an operator,
I want a live dashboard that refreshes without full page reload,
So that I see new registrations within a minute.

**Acceptance Criteria:**

**Given** I am on `/dashboard`
**When** the page loads
**Then** MetricTile components display key counts (UX-DR12, FR-8)
**And** metrics poll every 60s; top bar shows "Updated {time}" (UX-DR21, NFR-3)
**And** subsequent polls update tiles without full-page flash
**And** dashboard loads within 3 seconds (NFR-2)

**Given** I tap a MetricTile
**When** navigation occurs
**Then** I land on filtered Clients list or Activity detail (FR-9 click-through)

### Story 4.3: Activity Performance Ranking

As an operator,
I want to see which Activities drove the most registrations this week,
So that I know which lead engines to scale.

**Acceptance Criteria:**

**Given** multiple Activities with registrations
**When** I view dashboard activity performance section
**Then** Activities rank by registration volume for selected period (FR-9)
**And** click-through navigates to Activity detail or filtered Client list

### Story 4.4: Reports Aggregation API

As an operator,
I want weekly and monthly report data from the API,
So that I can review business performance without spreadsheets.

**Acceptance Criteria:**

**Given** I request a weekly or monthly report preset
**When** the API aggregates data
**Then** report includes activities hosted, registrations, new leads, follow-up status, activity ranking, lead growth, community ranking, repeat participants, inactive Clients, and campaign results where applicable (FR-10)
**And** data reconciles to underlying Registration and Client records

### Story 4.5: ReportFilterBar and Report UI

As an operator,
I want to filter reports by date, activity, community, status, and referral source,
So that I can answer specific business questions.

**Acceptance Criteria:**

**Given** I am on `/reports`
**When** I use ReportFilterBar (UX-DR23)
**Then** I can set week/month/custom date presets plus Activity, Community, Lead Status, Referral Source filters with AND semantics (FR-11)
**And** filter chips clear individually; "Clear all" resets
**And** empty period shows "No registrations in this period." with adjust-filters hint (UX-DR27)

### Story 4.6: CSV Export

As an operator,
I want to export filtered report data as CSV,
So that I can share monthly reviews with stakeholders (UJ-4).

**Acceptance Criteria:**

**Given** active report filters
**When** I click Export CSV
**Then** a downloadable CSV file is generated matching filtered data (FR-11, SM-2)
**And** export reconciles row counts to displayed summary

## Epic 5: Follow-Up Outreach & Campaign Tracking

Marco sends email campaigns and WhatsApp follow-ups with full timeline tracking.

### Story 5.1: SendGrid Integration and Email Infrastructure

As a developer,
I want SendGrid integrated in the Infrastructure layer with sandbox-safe CI,
So that campaigns can send reliably without exposing production keys in tests.

**Acceptance Criteria:**

**Given** SendGrid API key in environment secrets
**When** the email adapter sends a message
**Then** delivery is attempted via SendGrid API (architecture email decision)
**And** CI uses sandbox credentials only; production keys blocked in CI (Murat Epic 5 gate)
**And** sends use individual delivery or BCC — never expose recipient lists (NFR-10)

### Story 5.2: Email Template CRUD

As an operator,
I want to save and reuse email message templates,
So that follow-up emails are consistent and fast to compose.

**Acceptance Criteria:**

**Given** I am authenticated
**When** I create, edit, or select an email template
**Then** templates persist and are selectable during campaign compose (FR-13)

### Story 5.3: Client Segment API and SegmentPicker

As an operator,
I want to select campaign recipients by segment,
So that I message the right Clients.

**Acceptance Criteria:**

**Given** Clients with various Activities, statuses, and communities
**When** I build a segment via SegmentPicker (UX-DR22)
**Then** presets include All clients, By Activity, By Lead Status, By Community, Manual multi-select with AND semantics (FR-12)
**And** warning appears if segment includes non-consented records (NFR-7, UX-DR22)

### Story 5.4: Campaign Compose and Send

As an operator,
I want to compose and send email campaigns to a segment,
So that I can follow up with new leads efficiently (UJ-3).

**Acceptance Criteria:**

**Given** I am on `/campaigns/new` with selected recipients
**When** I compose subject and body and send
**Then** emails deliver to all selected Clients with valid email addresses (FR-12)
**And** failed sends log reason per recipient
**And** send confirmation dialog prevents accidental blast (UX interaction primitive)

**Given** send completes with partial failures
**When** results display
**Then** summary shows "{n} sent, {m} failed" with expandable failure reasons (UX-DR27)

### Story 5.5: Campaign History on Client Profile

As an operator,
I want to see email campaigns sent to each Client,
So that I avoid double-messaging and have follow-up context.

**Acceptance Criteria:**

**Given** campaigns were sent to a Client
**When** I view their profile timeline
**Then** TimelineEvent entries show campaign date and subject (FR-13, FR-7)
**And** `/campaigns` lists sent campaign history

### Story 5.6: WhatsApp Click-to-Message

As an operator,
I want to open WhatsApp with a Client's phone number pre-filled,
So that I can send personal follow-ups quickly.

**Acceptance Criteria:**

**Given** a Client with registered mobile number
**When** I click WhatsAppButton on profile (UX-DR15, FR-14)
**Then** `wa.me/{phone}` opens in new tab/app with number pre-filled
**And** timeline logs "WhatsApp initiated" on click (EXPERIENCE.md assumption)

### Story 5.7: WhatsApp Follow-Up Status Tracking

As an operator,
I want to record WhatsApp follow-up status on a Client,
So that follow-up coverage metrics stay accurate.

**Acceptance Criteria:**

**Given** I contacted a Client via WhatsApp
**When** I update follow-up status (e.g., Contacted, awaiting reply) with optional note
**Then** status appends to timeline with timestamp (FR-15, NFR-8)
**And** dashboard follow-up coverage metric includes WhatsApp-touched Clients (FR-15)

## Epic 7: Production Readiness & Artifact Alignment

Close documentation drift, CI/test gaps, and scale limits before Phase 2 product expansion. Approved via Sprint Change Proposal 2026-06-22.

### Story 7.1: Planning Artifact Sync

As a developer,
I want PRD, architecture, and epics to match shipped Epic 6 behavior,
So that future work and AI agents use accurate planning context.

**Acceptance Criteria:**

**Given** Epic 6 is complete
**When** planning artifacts are reviewed
**Then** PRD §6.3, Community/Category glossary, architecture data model, and epics index describe catalogs and denormalized activity labels

### Story 7.2: CI Pipeline and SendGrid Sandbox Gate

As a developer,
I want GitHub Actions to build and test on every push,
So that regressions are caught before deploy.

**Acceptance Criteria:**

**Given** a pull request or push to main
**When** CI runs
**Then** `dotnet build`, `dotnet test`, and `npm run build` succeed
**And** existing SendGrid settings validator tests run in CI

### Story 7.3: Integration Test Matrix (Core Paths)

As a developer,
I want integration tests for registration, dedup, campaigns, and catalogs,
So that core operator paths have automated regression coverage.

**Acceptance Criteria:**

**Given** test infrastructure exists
**When** integration tests run
**Then** at minimum: public registration → client create, dedup phone match, campaign send skip without consent, community catalog CRUD smoke

### Story 7.4: List Pagination and Catalog-Aligned Filters

As an operator,
I want activities list and report filters to scale beyond 100 rows,
So that large activity catalogs do not hide data.

**Acceptance Criteria:**

**Given** more than 100 activities exist
**When** I use All Activities or report community filter
**Then** pagination or explicit server search applies (not silent 100-row cap)
**And** report filters use the same community/category catalogs as activity create

### Story 7.5: Server Outreach Dedup

As an operator,
I want the API to reject duplicate WhatsApp follow-up logs,
So that timeline audit stays trustworthy beyond UI guards.

**Acceptance Criteria:**

**Given** an identical follow-up status and note was recorded recently
**When** the same follow-up POST is submitted again
**Then** API returns 409 or no-op with clear message (cooldown or idempotency)

### Story 7.6: Operator Delivery Checklist

As an operator,
I want visibility into SendGrid sender/domain setup status,
So that I know why campaigns may not reach inboxes.

**Acceptance Criteria:**

**Given** I open campaigns or settings
**When** SendGrid is misconfigured or sender unverified
**Then** I see actionable checklist text (DNS, sender verification) without exposing secrets

## UAT Polish (informal, post–Epic 7)

Tracked in `_bmad-output/implementation-artifacts/uat-polish-implementation-log.md` and `sprint-status.yaml` under `uat-polish`. Includes registration numbers, demo seed v2, Docker nginx + GitHub Actions CD, temporary HTTPS (nip.io), operator self-service auth, hero/OTP fixes, and confirmation-modal UX. Not Epic 8 scope. **Handoff checklist** (`uat-handoff-checklist`) remains backlog until droplet HTTPS verify complete.

## Epic 8: Phase 2 Product Expansion (Backlog — not scheduled)

Deferred from PRD §5 non-goals until Epic 7 complete:

- WhatsApp Business API integration
- Automated email drip sequences
- Role-based admin access
- Catalog FK migration (`Activity.CommunityId` / `CategoryId`)
- Manual duplicate merge UI
- Attendance check-in
- Custom report builder

## Epic 9: Website Builder (Site Page Composer)

Alex (community operator) can customize the public homepage at `/` with draft/publish workflow, live preview, and upcoming Activities fed from the CRM — without Docker rebuild or developer help.

**Source PRD:** `_bmad-output/planning-artifacts/prds/prd-website-builder-2026-07-06/prd.md`  
**FRs covered:** Website Builder FR-1 through FR-20 (scoped IDs in feature PRD)  
**Pre-sprint gate:** The Social Collective droplet on HTTPS at client domain; existing static landing deployed

### Story 9.1: SitePage Entity and Admin API

As a developer,
I want a SitePage persistence layer with draft and published JSON payloads,
So that homepage content is stored in the database instead of build-time env vars.

**Acceptance Criteria:**

**Given** the application database
**When** migration runs
**Then** `SitePages` table exists with draft/published JSON, timestamps, and published-by user id
**And** `Activities.ShowOnHomepage` column exists defaulting to `true`
**And** admin endpoints exist: `GET/PUT /api/v1/admin/site`, `POST /api/v1/admin/site/publish` (FR-1, FR-5 partial, FR-7 partial)
**And** publish copies draft → published and records `publishedAt`

### Story 9.2: Public Site API and Redis Cache

As a visitor,
I want the homepage configuration served quickly from a public API,
So that content updates without rebuilding the web container.

**Acceptance Criteria:**

**Given** a published Site Page exists
**When** `GET /api/v1/public/site` is called unauthenticated
**Then** published JSON is returned (FR-2)
**And** response is cached in Redis with invalidation on site publish (FR-3, target ≤30s fresh after publish)
**And** upcoming published activities with `ShowOnHomepage=true` are included or composable in one round-trip (FR-11)

### Story 9.3: Site Page Seed and Migration

As an operator on an existing deployment,
I want my current landing page preserved when Website Builder ships,
So that thesocialcollectivesg.com never goes blank.

**Acceptance Criteria:**

**Given** no SitePage row exists
**When** seed/migration runs on deploy
**Then** draft and published Site Page are created from `site-landing-page.tsx` defaults and `.env` `LANDING_*` values (FR-17)
**And** seed auto-publishes so `/` matches current landing
**And** re-running deploy does not overwrite operator-edited draft

### Story 9.4: Public Homepage Runtime Render

As a visitor,
I want `/` to render from the published Site Page,
So that operators can change copy without a developer.

**Acceptance Criteria:**

**Given** a published Site Page
**When** I open `/`
**Then** hero, highlights, upcoming activities, how-it-works, and footer sections render from API data (FR-2, FR-9–13)
**And** platform typography/spacing remain fixed (UX-DR26)
**And** when no published Site Page exists, page falls back to env-based landing without error
**And** authenticated preview with valid token shows draft with “Preview — not public” banner (FR-6)

### Story 9.5: Website Builder Admin UI

As an operator,
I want a Website area in the dashboard to edit my homepage,
So that I can update marketing copy in the same app I use for events.

**Acceptance Criteria:**

**Given** I am authenticated
**When** I open `/dashboard/website`
**Then** I see section list, editable fields, phone/desktop preview, **Save draft**, **Preview**, and **Publish** (FR-4, FR-5, FR-6, FR-7)
**And** unsaved changes warn on navigation
**And** Publish is disabled when draft equals published
**And** publish gate blocks empty hero headline; warns on missing hero image (FR-8)
**And** primary hero CTA to unpublished activity slug is blocked at publish

### Story 9.6: Site Branding and Activity Homepage Toggle

As an operator,
I want to set my site logo and accent and control which events appear on the homepage,
So that my public site feels like my community.

**Acceptance Criteria:**

**Given** Website builder and Activity Overview
**When** I upload site logo and set accent color
**Then** values save in Site Page draft and apply on publish via campaign asset pipeline (FR-15)
**And** Activity Overview shows “Feature on your public site” checked by default for published activities (FR-16, §8 decision)
**And** unchecking excludes activity from upcoming block without republishing Site Page

### Story 9.7: SEO Metadata and Login Branding

As a community operator sharing links on WhatsApp,
I want rich link previews and a branded login page,
So that my domain feels cohesive end-to-end.

**Acceptance Criteria:**

**Given** a published Site Page with hero image and copy
**When** `/` is loaded or link is unfurled
**Then** `<title>`, meta description, and Open Graph tags reflect site name and hero fields (FR-18)
**And** `/login` shows client logo and site name from published Site branding with secondary platform credit (FR-19)
**And** footer shows “Powered by CreativoRare” by default with no builder toggle in v1 (FR-20)

### Story 9.8: Website Builder Polish

As an operator,
I want confidence when I publish and optional recovery if I make a mistake,
So that I trust the Website tool.

**Acceptance Criteria:**

**Given** I publish homepage changes
**When** publish succeeds
**Then** I see success state with copy-link and open-live-site actions (SM-3)
**And** I can choose homepage preset Community or Minimal when resetting (seed/preset action)
**And** previous published snapshot is stored to enable revert-to-last-published (fast-follow within story or immediate if low cost)
**And** `LANDING_*` env vars documented as fallback-only in deploy docs

## Epic 10: Landing Page Component Library

Extends Website Builder with composable marketing sections (carousel, testimonials, FAQ, stats, CTA band) — all editable in `/dashboard/website`.

**Source PRD:** `_bmad-output/planning-artifacts/prds/prd-landing-components-2026-07-07/prd.md`  
**Depends on:** Epic 9 complete; Story 9.9 (Phase A visitor polish) first

### Story 9.9: Public Landing Visitor Polish (Phase A)

Prerequisite hotfix before Epic 10 — visitor-first landing, hero banner render, seed without operator CTAs.

### Story 10.1: Section Registry and Add/Remove Section

Section definition registry; add/remove sections in builder; section count limits.

### Story 10.2: Shared List Item Editor

Reusable add/remove/reorder list editor for slides, FAQ items, testimonials.

### Story 10.3: Carousel Section

Carousel type — builder fields, public render, publish gate.

### Story 10.4: Testimonials and FAQ Sections

Social proof and accordion FAQ blocks.

### Story 10.5: Stats and CTA Band Sections

Stats strip and full-width CTA band (P2).

### Story 10.6: Section Variants and Preset Refresh

Optional `variant` shell (default/accent/muted); update Community/Minimal presets.

### Story 10.7: Integration Tests and Builder Smoke

CI coverage for new section types and publish gates.
