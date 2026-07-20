---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-cohestra-enterprise-2026-07-15/prd.md
  - _bmad-output/planning-artifacts/prds/prd-cohestra-enterprise-2026-07-15/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-07-18/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-07-18/EXPERIENCE.md
  - docs/marketing/pricing-tiers.md
  - _bmad-output/planning-artifacts/research/market-cohestra-pricing-penetration-research-2026-07-16.md
project_name: cohestra
initiative: Cohestra Enterprise multi-tenant SaaS
outputNote: Dedicated file — does not replace Platform 0 planning-artifacts/epics.md
epicsApproved: 2026-07-20
updated: 2026-07-20
---

# cohestra — Epic Breakdown (Enterprise)

## Overview

This document provides the complete epic and story breakdown for **Cohestra Enterprise** (multi-tenant SaaS), decomposing the requirements from the PRD, UX Design (Midnight Atelier), Architecture spine, Platform 0 architecture baseline, pricing tiers, and pricing research into implementable stories.

**Scope note (PRD §13.11):** Epic **11–15** = v1 tenancy / billing / public surfaces only. Park One-stop Lite items (share kit, custom domain, thin email automations, paid tickets) as **Epic 16+** candidates after launch evidence. Existing Platform 0 epics 1–10 remain delivered baseline — no rollback.

## Requirements Inventory

### Functional Requirements

FR-1: Self-serve tenant signup — org name, Tenant Slug, admin email, password; creates Tenant + first Tenant Admin + plan path; globally unique slug with reserved list and `[a-z0-9-]` 3–48 rules; email verification before dashboard; respects `registrationClosed`; abuse controls (FR-26).

FR-2: Platform-admin tenant provisioning — create, suspend, reactivate, archive tenants; Suspend is break-glass (abuse/ToS/freeze), not collections; complimentary plans via `IsComplimentary` + Plan without Stripe; lifecycle audited.

FR-3: Tenant status machine — `Active` | `Suspended` | `Archived` separate from `BillingStatus`; access = Status ∩ BillingStatus; Suspended always wins; OnHold keeps Status=Active with read-only; FR-23 terminal archives tenant.

FR-4: Tenant-scoped authentication — session bound to one Tenant via JWT `tenant_id`; login fails without membership; refresh preserves claim; no tenant switcher in v1.

FR-5: Tenant roles — Tenant Admin vs Tenant Member; effective access = role ∩ plan ∩ Status ∩ BillingStatus; Admin-only team/billing/settings; Member ops per plan; Member sees feature-locked (no billing CTA) on locked modules.

FR-6: Team invitation — Admin invites by email with seat capacity; Basic = 1 seat soft-block + upgrade CTA; Core = 3; Pro = 10; invite token 7 days; no per-seat add-ons in v1.

FR-7: Platform admin role — distinct from tenant roles; platform routes only; no impersonation in MVP.

FR-8: Tenant-scoped data model — non-nullable `TenantId` on all Platform 0 business entities; composite uniques include TenantId; EF global query filters; default-tenant backfill migration.

FR-9: Tenant context middleware — every API request resolves Tenant Context before business logic; missing tenant 404 public / 403 admin; Redis keys namespaced by TenantId; cross-tenant negative integration tests.

FR-10: Export and report isolation — CSV/reports include only authenticated tenant records.

FR-11: Subdomain tenant routing — `{slug}.cohestra.app` for public + admin; apex marketing only; local `{slug}.localhost` or `DEV_TENANT_SLUG`.

FR-12: Public site by plan — Basic stub (no SitePage); Core fixed SitePage (no composer); Pro full builder; upgrade paths seed/unlock SitePage.

FR-13: Per-tenant email branding — SendGrid From name/email per tenant within platform guardrails; block send if sender unverified.

FR-14: Tenant-scoped activity engine — create/form/QR/register/dedup within resolved Tenant; activity slug unique per tenant.

FR-15: Tenant-scoped dashboard and plan-gated reports — Basic fixed report + CSV; Core queryable filters + CSV; Pro + campaign analytics + saved views; cache/polling per tenant namespace.

FR-16: Tenant-scoped campaigns and templates — Pro-only; Basic/Core UI/API upgrade CTA / 403; registration notification emails remain on all plans.

FR-17: Tenant directory — Platform Admin list/search/paginate tenants with status, slug, created, admin contact, aggregate counts (no PII export by default).

FR-18: Platform health and audit — `/ready` unauthenticated; immutable audit for lifecycle and platform admin actions with actor/action/tenantId/timestamp.

FR-19: Free Basic signup and paid Core/Pro subscriptions — Basic no Stripe (`BillingStatus=Free`); Core/Pro via Checkout + 30-day trial (direct or upgrade from Basic); Stripe IDs stored; plan synced from webhooks; test mode local/CI; trial disclaimer with trial_end_date.

FR-20: USD-only billing — all prices/Checkout/UI in USD; no geo currency conversion.

FR-21: Trial expiration reminders — daily email + in-app to Tenant Admins for last 7 days before `trial_end`; Portal link.

FR-22: Monthly and annual billing — Core/Pro monthly + annual (2 mo free: $290 / $790); Basic has no Stripe Price; Portal exposes intervals.

FR-23: Delinquency lifecycle — from `invoice.payment_failed`: PastDue days 1–7 (daily notify, full access) → OnHold days 8–28 (weekly, read-only, public reg blocked) → archive day 29; payment restores Active; same path for trial-end and renewal failures.

FR-24: Cancel and downgrade at period end — apply at Stripe `current_period_end`; over-limit → `ReadOnly_OverLimit` until under caps; not Suspended.

FR-25: Basic dormancy archive — Basic+Free idle 90 days (no login and no new regs) → warn day 83 → archive day 90; any login/reg resets; complimentary Core/Pro exempt; Platform Admin restore in soft-delete window.

FR-26: Self-serve abuse controls — Google reCAPTCHA always on signup (accessible challenge); email verification; signup rate limit 5/IP/hour and 20/IP/day; public registration burst limit → 429; Suspend remains break-glass.

FR-26a: Legal acceptance at signup — ToS + Privacy checkbox required; store AcceptedAt + TermsVersion + PrivacyVersion; serve `/terms` and `/privacy`; Stripe Tax deferred.

### NonFunctional Requirements

NFR-1 (Security): Tenant isolation enforced server-side; no client-trusted tenant ID without signature; JWT `tenant_id` validated on every admin request.

NFR-2 (Performance): Public registration < 2s p95; tenant dashboard < 3s p95 with Redis cache per tenant.

NFR-3 (Reliability): Tenant suspension does not impact other tenants' availability.

NFR-4 (Privacy): Tenant data export on request; Platform Admin cannot bulk-export tenant PII in MVP.

NFR-5 (Observability): Structured logs include `tenantId` on all business operations; audit trail for lifecycle.

NFR-6 (Scalability): Architecture supports ~100 active tenants / 100k clients total on single deployment (v1 target).

NFR-7 (Data residency): Single region deployment (Singapore-adjacent) for v1.

NFR-8 (Retention): Voluntary cancel → soft-delete 30 days then purge; billing delinquency archive after 28 days unpaid then purge; Basic dormancy archive after 90 days idle then purge; registrations immutable until tenant purge.

NFR-9 (Export governance): Tenant Admin can export own tenant CSV; cross-tenant export prohibited.

NFR-10 (Brownfield quality): SM-4 — 90% of Platform 0 unit tests pass without modification after tenancy migration.

NFR-11 (Isolation gate): SM-1 — zero cross-tenant leakage; TenantIsolation integration tests pass on every PR to main.

NFR-12 (UX accessibility): WCAG 2.2 AA on marketing, admin, stub, registration, platform admin; banners/badges not color-only; reCAPTCHA accessible challenge path.

### Additional Requirements

**From Architecture spine (AD-1…AD-11) + addendum**

- Brownfield: shared DB row-level tenancy — NOT greenfield starter; extend existing Api/Application/Domain/Infrastructure/Contracts stack (.NET 9, EF Core, PostgreSQL 16, Redis 7, Next.js 15+, Docker Compose `cohestra-infra` / `cohestra-infra-uat`).
- Migration sequence: Tenants table + seed `default` → nullable TenantId → backfill → NOT NULL → composite uniques → EF global filters (AD-9).
- Remove `AuthService` single-operator gate; introduce `TenantMembership` (AD-7).
- Retire Epic 9 SitePage singleton — one SitePage per Tenant `UNIQUE(TenantId)` (AD-4).
- Tenant resolution from Host on public routes; apex = marketing only (AD-2).
- JWT `tenant_id` + Host alignment on admin; never trust client `X-Tenant-Id` alone (AD-3).
- Redis key pattern `tenant:{tenantId}:…` (AD-6).
- Plan gates server-side via `Tenant.Plan` + limits (AD-8): seats / communities / published / regs-mo per pricing table.
- Stripe: Checkout + Customer Portal only (no custom finance UI); idempotent webhooks; jobs `TrialReminderJob`, `PastDueNotifier`, `OnHoldNotifier`, `DelinquencyEnforcer` (AD-11).
- Structural seed paths: Domain Tenants/Billing, Infrastructure Tenancy + Billing jobs, PlatformTenantsController, BillingController, StripeWebhookController, Next.js middleware Host forward.
- Local routing: `{slug}.localhost` or `DEV_TENANT_SLUG`; document in README.
- SendGrid: shared platform key + per-tenant verified sender (not per-tenant API keys in v1).
- Deferred: custom domains, schema-per-tenant, tenant switcher, Platform Admin impersonation, per-tenant SendGrid keys.

**From Platform 0 architecture.md (inherited)**

- API-first `/api/v1/` versioning; ProblemDetails; DTOs on wire; JWT Bearer; Docker nginx entry.
- Existing ops modules (activities, clients, dashboard, reports, campaigns, website builder) remain; enterprise adds tenancy + plan gates.

**From pricing-tiers.md + PRD §13.4**

| Plan | Seats | Communities | Published activities | Regs/mo | Public site | Reports | Campaigns |
|------|-------|-------------|----------------------|---------|-------------|---------|-----------|
| Basic | 1 | 1 | 3 | 150 | Stub | Fixed + CSV | — |
| Core | 3 | 3 | 12 | 500 | Fixed SitePage | Queryable + CSV | — |
| Pro | 10 | 10 | 50 | 5,000 | Builder | + campaigns + saved views | ✓ |

- Prices: Basic free; Core $29/mo or $290/yr; Pro $79/mo or $790/yr; Enterprise custom/manual.
- LimitMeter warn ≥80%, block at 100%.

**From market pricing research**

- Market annual as monthly equivalent on pricing page ($24/mo and $66/mo billed annually).
- Lead with CRM/client-list value vs free event tools; monitor Core→Pro conversion before list-price raise.
- Do not invent middle tier in v1; if Pro conversion weak after 10+ tenants, test Pro intro $69/$690 before new tier.

**Epic mapping hint (addendum / PRD)**

| Epic | Focus |
|------|--------|
| 11 Tenant foundation | FR-1–3, FR-8 (+ migration) |
| 12 Identity & RBAC | FR-4–7 |
| 13 API scoping | FR-9–10 (+ isolation tests) |
| 14 Onboarding + billing | FR-1, FR-6, FR-19–26a, UJ-1–2 |
| 15 Public surfaces | FR-11–16, FR-14 (+ plan-gated site/reports/campaigns) |
| 16+ (parked) | Share kit, custom domain, thin automations, paid tickets (§13.11) |

### UX Design Requirements

UX-DR1: Implement **Midnight Atelier** design tokens in web app — colors (ink, paper, lagoon, gold, stone, semantic success/warn/danger), typography (Fraunces display + Plus Jakarta Sans body), radii, spacing, next-themes class-based light/dark/system; replace Platform 0 forest-green brand on Cohestra surfaces.

UX-DR2: Marketing apex — brand-led hero (Cohestra as art), one promise, one lede, primary Start free + secondary trial CTA, photographic field + floating product object; reject dashboard-first / AI-mist / cream-terracotta / Inter stacks; motion: staggered hero rise, soft product lift, 1px button hover.

UX-DR3: Pricing page — Basic/Core/Pro/Enterprise from `pricing-tiers.md`; annual shown as monthly equivalent; Start free primary; trial disclaimer copy.

UX-DR4: Signup Basic — CaptchaGate (Google reCAPTCHA + accessible path), ToSCheckbox (versions logged), slug validation UX with suggestions, email OTP verify gate before dashboard.

UX-DR5: Signup paid path — secondary Core/Pro Checkout entry with trial disclaimer including `{trial_end_date}`.

UX-DR6: Legal pages `/terms` and `/privacy` before public signup enabled.

UX-DR7: Tenant admin shell — gallery-quiet ink sidebar, PlanBadge (Admin + Member read-only), SponsoredBadge when complimentary, LimitMeter, BillingBanner states (trial / PastDue / OnHold / ReadOnly_OverLimit), desktop sidebar ≥lg / Sheet on sm.

UX-DR8: Basic dashboard empty / opening ritual — guided first Community → Activity → publish; hospitality microcopy; no Stripe chrome.

UX-DR9: UpgradePanel pattern — Admin gets Checkout/upgrade CTA; Member gets feature-locked message without billing CTA; apply to Campaigns (Basic/Core), Site builder (Basic), advanced reports (Basic).

UX-DR10: SeatGate on Team — Basic invite disabled + “Upgrade to Core for a second seat”; soft-block at Core/Pro seat cap.

UX-DR11: Billing settings — Tenant Admin only; opens Stripe Customer Portal; return URL to Settings → Billing; Members never see Portal entry.

UX-DR12: Basic StubHome — hospitality photo header optional per DESIGN; org name + published activity list → register; empty state “No published activities yet”; no stats/promos/card walls.

UX-DR13: Core fixed SitePage and Pro builder surfaces inherit Platform 0 behaviors under Midnight Atelier chrome; Basic `/site` shows UpgradePanel.

UX-DR14: Public registration — mobile-first Platform 0 flow under tenant Host; friendly 429 / cap messages.

UX-DR15: Share kit UI (link copy, QR/poster download, channel helpers) — implement craft from mockups but **scope as Epic 16+ / v1.1** per PRD §13.11 unless explicitly pulled into MVP.

UX-DR16: Platform Admin console — sparse tenant directory + detail; Suspend reason + audit required; label as abuse/ToS/freeze not non-payment; no impersonation.

UX-DR17: Accessibility floor — WCAG 2.2 AA; BillingBanner text+icon+link; PlanBadge text label; focus order banner → main; Esc closes dialogs.

UX-DR18: Voice/tone — “Community” not “Club”; stack-killer positioning vs Forms/sheet/Linktree; Suspend copy distinct from delinquency “Settle your bill”.

UX-DR19: Component inventory to ship — Wordmark, Eyebrow, PrimaryButton (lagoon 48px), PlanBadge, SponsoredBadge, BillingBanner, UpgradePanel, SeatGate, StubHome, LimitMeter, ToSCheckbox, CaptchaGate, Metric (Fraunces number), RegistrationOption list row.

UX-DR20: Key-screen fidelity — ship against ratified mocks `marketing-start-free`, `basic-stub-home`, `admin-dashboard-basic`, `team-seat-gate`, `platform-admin-suspend` (atelier refresh optional for platform-admin).

### FR Coverage Map

| FR | Epic | Brief |
|----|------|-------|
| FR-2 | Epic 11 | Platform Admin provision / suspend / reactivate / archive |
| FR-3 | Epic 11 | Status ∩ BillingStatus access matrix; Suspended wins |
| FR-8 | Epic 11 | TenantId on entities + default-tenant migration |
| FR-17 | Epic 11 | Platform tenant directory |
| FR-18 | Epic 11 | Platform health + audit log |
| FR-4 | Epic 12 | Tenant-scoped JWT auth |
| FR-5 | Epic 12 | Admin vs Member role matrix |
| FR-7 | Epic 12 | Platform Admin role (separate from tenant) |
| FR-9 | Epic 13 | Tenant context middleware + Redis namespace |
| FR-10 | Epic 13 | Export/report isolation |
| FR-1 | Epic 14 | Self-serve Basic signup |
| FR-6 | Epic 14 | Team invite + seat gates |
| FR-19 | Epic 14 | Basic free + Core/Pro Checkout/trial |
| FR-20 | Epic 14 | USD-only billing |
| FR-21 | Epic 14 | Trial reminders (last 7 days) |
| FR-22 | Epic 14 | Monthly / annual Prices |
| FR-23 | Epic 14 | Delinquency PastDue → OnHold → Archive |
| FR-24 | Epic 14 | Cancel/downgrade at period end + over-limit |
| FR-25 | Epic 14 | Basic dormancy archive |
| FR-26 | Epic 14 | CAPTCHA + rate limits |
| FR-26a | Epic 14 | ToS/Privacy acceptance |
| FR-11 | Epic 15 | Subdomain routing |
| FR-12 | Epic 15 | Stub / fixed SitePage / builder by plan |
| FR-13 | Epic 15 | Per-tenant email branding |
| FR-14 | Epic 15 | Tenant-scoped activity engine / registration |
| FR-15 | Epic 15 | Plan-gated dashboard reports |
| FR-16 | Epic 15 | Pro-only campaigns |
| (parked) | Epic 16 | One-stop Lite — share kit, domain, thin email, paid tickets |

**UX-DR coverage (planned):** UX-DR1–11,17–20 → Epic 14 · UX-DR12–14,18–20 → Epic 15 · UX-DR16 → Epic 11 · UX-DR15 → Epic 16 parked

## Epic List

### Epic 11: Tenant Workspaces & Platform Control
Platform Admin can provision, suspend/reactivate/archive, and audit tenants; every Platform 0 entity is tenant-owned via migration + `TenantId`. Dual dials: `Status` ∩ `BillingStatus` (Suspended always wins).
**FRs covered:** FR-2, FR-3, FR-8, FR-17, FR-18

### Epic 12: Secure Tenant Sign-In & Roles
Operators sign into one tenant; Admin vs Member enforced server-side; Platform Admin role separate; single-operator gate removed.
**FRs covered:** FR-4, FR-5, FR-7

### Epic 13: Guaranteed Tenant Isolation
Every API/export/report is tenant-scoped; Redis namespaced; TenantIsolation tests are a release gate (SM-1).
**FRs covered:** FR-9, FR-10

### Epic 14: Start Free, Invite Team & Billing
Priya Starts free (Basic, no card) with CAPTCHA + ToS; upgrades to Core/Pro via Checkout + trial; Team seats; Stripe Customer Portal; cancel/downgrade at period end; delinquency + Basic dormancy; Midnight Atelier marketing/signup/billing/admin chrome for onboarding.
**FRs covered:** FR-1, FR-6, FR-19, FR-20, FR-21, FR-22, FR-23, FR-24, FR-25, FR-26, FR-26a

### Epic 15: Public Door & Plan-Gated Operations
Subdomain public door — Basic stub, Core fixed SitePage, Pro builder; QR/register; plan-gated reports/campaigns; per-tenant email branding; atelier stub + ops surfaces.
**FRs covered:** FR-11, FR-12, FR-13, FR-14, FR-15, FR-16

### Epic 16 (Parked): One-stop Lite — post-MVP
Share kit, custom domain, thin confirm/reminder/thank-you automations, paid tickets (v1.2), seat add-ons — not v1 per GTM-A §13.11.
**FRs covered:** none for v1 · UX-DR15 parked

<!-- Stories appended below per epic during Step 3 -->

## Epic 11: Tenant Workspaces & Platform Control

Platform Admin can provision, suspend/reactivate/archive, and audit tenants; every Platform 0 entity is tenant-owned via migration + `TenantId`. Dual dials: `Status` ∩ `BillingStatus` (Suspended always wins).

**FRs covered:** FR-2, FR-3, FR-8, FR-17, FR-18

### Story 11.1: Tenant entity with dual status dials

As a Platform operator,
I want a Tenant domain model with operational Status and BillingStatus,
So that every workspace has a clear lifecycle and access can be computed from Status ∩ BillingStatus.

**Acceptance Criteria:**

**Given** the Domain layer
**When** `Tenant` is introduced
**Then** it includes at least: `Id`, `Slug` (unique), `Name`, `Plan` ∈ {Basic, Core, Pro, Enterprise}, `Status` ∈ {Active, Suspended, Archived}, `BillingStatus` ∈ {Free, Trialing, Active, PastDue, OnHold, Canceled}, and nullable Stripe/billing fields (`StripeCustomerId`, `StripeSubscriptionId`, `BillingInterval`, `TrialEndsAt`, `DelinquencyStartedAt`) ready for later epics without requiring Stripe wiring yet
**And** slug uniqueness is enforced at the model/persistence level

**Given** an access-evaluation helper (or documented matrix implementation)
**When** Status/BillingStatus combinations are evaluated
**Then** they match PRD FR-3: Active + Free/Trialing/Active/PastDue → full access (PastDue may show settle banner later); Active + OnHold → read-only; Suspended + any → blocked; Archived + any → blocked
**And** Suspended always wins over billing

**Given** a new Tenant is created in code/tests
**When** defaults are applied
**Then** `Status=Active` and Basic tenants default `Plan=Basic` / `BillingStatus=Free` unless otherwise specified

**Given** unit tests for the access matrix
**When** the suite runs
**Then** Suspended blocks admin/public access regardless of `BillingStatus=Active`
**And** OnHold does not change `Status` away from Active

### Story 11.2: Default-tenant migration and TenantId on core entities

As a developer preserving Platform 0 data,
I want a safe migration that seeds a `default` tenant and backfills `TenantId`,
So that existing rows stay usable and all business entities become tenant-owned.

**Acceptance Criteria:**

**Given** a database with Platform 0 tables and no tenancy
**When** the migration runs
**Then** a `Tenants` table exists and a seeded `default` tenant is created
**And** core business tables gain nullable `TenantId`, all existing rows backfill to `default`, then `TenantId` becomes NOT NULL

**Given** entities that must be tenant-scoped (Activity, Client, Registration, Campaign, Community, Category, SitePage, EmailTemplate, and other Platform 0 business entities in scope)
**When** the migration completes
**Then** each has a non-nullable `TenantId` FK to `Tenants`
**And** composite unique constraints that need tenant scope include `TenantId` (e.g. Activities `(TenantId, Slug)`)

**Given** SitePage previously treated as a singleton
**When** tenancy is applied
**Then** `UNIQUE (TenantId)` applies on SitePages (Epic 9 singleton retired per AD-4)

**Given** local Docker / `cohestra-infra`
**When** migrate + app start against existing data
**Then** the stack still boots with the default tenant
**And** no destructive wipe of prior rows

**Given** EF Core configuration after migration
**When** `ITenantScoped` (or equivalent) is introduced
**Then** entities are ready for global query filters to be enabled in Epic 13 without another schema rewrite

### Story 11.3: Platform Admin provision, suspend, reactivate, archive

As a Platform Admin,
I want to create tenants and run break-glass Suspend / reactivate / archive with a reason,
So that abuse and support freezes are handled without using Suspend as collections.

**Acceptance Criteria:**

**Given** an authenticated Platform Admin
**When** they create a tenant (name, slug, initial plan, admin contact as required by API)
**Then** a Tenant row is created with `Status=Active` and audited (actor, timestamp, action)

**Given** an Active tenant
**When** Platform Admin sets `Status=Suspended` with a required reason (abuse / ToS / support freeze)
**Then** the change is persisted and audited
**And** UI/copy labels Suspend as break-glass — not non-payment
**And** `BillingStatus` is left unchanged

**Given** a Suspended tenant
**When** Platform Admin reactivates
**Then** `Status=Active` and prior `BillingStatus` remains unless separately adjusted
**And** the action is audited

**Given** a tenant to wind down
**When** Platform Admin archives
**Then** `Status=Archived` and the action is audited
**And** soft-delete / retention window behavior aligns with NFR-8 (30-day soft archive assumption)

**Given** a non–Platform Admin JWT
**When** they call platform tenant lifecycle endpoints
**Then** the request is rejected (403)

**Given** Suspend is applied
**When** access is evaluated (using Story 11.1 matrix)
**Then** tenant admin login is blocked and public routes are maintenance-ready (full middleware enforcement may complete in Epic 13/15; this story at least sets Status correctly and documents the intended effect)

### Story 11.4: Platform tenant directory and health

As a Platform Admin,
I want a searchable tenant directory plus health/audit visibility,
So that I can find workspaces and confirm platform readiness without exporting tenant PII.

**Acceptance Criteria:**

**Given** an authenticated Platform Admin
**When** they open the tenant directory
**Then** they see a paginated list with status, slug, created date, admin contact, and aggregate counts (activities, clients — not PII export by default)
**And** they can search by slug and organization name

**Given** a tenant in the directory
**When** they open tenant detail
**Then** they can access lifecycle actions from Story 11.3 and see recent audit entries for that tenant

**Given** the platform health endpoint `/ready`
**When** called without auth
**Then** it remains publicly reachable
**And** readiness checks cover default tenant / DB connectivity as documented

**Given** platform lifecycle and admin actions from Epic 11
**When** they occur
**Then** immutable audit entries include actor, action, tenantId, and timestamp

**Given** a Tenant Admin or Member
**When** they attempt platform directory routes
**Then** access is denied (403)

**Given** Midnight Atelier craft for platform console
**When** the directory UI ships
**Then** it stays sparse/ops-focused (UX-DR16); atelier refresh of `platform-admin-suspend` mock is acceptable but not blocking

### Story 11.5: Complimentary / Sponsored tenant flag

As a Platform Admin,
I want to mark a tenant complimentary and assign a Plan without Stripe,
So that pilots get Core/Pro limits without delinquency automation or self-serve paid signup.

**Acceptance Criteria:**

**Given** an authenticated Platform Admin
**When** they set `IsComplimentary=true` and assign `Plan` ∈ {Basic, Core, Pro}
**Then** `BillingStatus=Free`, no Stripe subscription is required
**And** FR-23 delinquency does not apply
**And** the change is audited

**Given** a complimentary Core or Pro tenant
**When** Basic dormancy rules are considered
**Then** FR-25 dormancy does not apply (only Basic+Free non-complimentary idle tenants)

**Given** a complimentary tenant converting to paid
**When** Platform Admin clears `IsComplimentary`
**Then** the tenant must complete Checkout (FR-19) before paid entitlements sync from Stripe
**And** self-serve cannot grant Core/Pro without Stripe unless Checkout completes

**Given** only Platform Admin may set/clear complimentary
**When** a Tenant Admin attempts to set the flag
**Then** the request is rejected (403)

**Given** `IsComplimentary=true`
**When** admin UI later shows plan chrome (Epic 14)
**Then** the data model supports Sponsored beside PlanBadge (UX component wiring can land in Epic 14)

## Epic 12: Secure Tenant Sign-In & Roles

Operators sign into one tenant; Admin vs Member enforced server-side; Platform Admin role separate; single-operator gate removed.

**FRs covered:** FR-4, FR-5, FR-7

### Story 12.1: TenantMembership and remove single-operator gate

As a multi-user tenant,
I want users linked to tenants via membership roles,
So that Cohestra is no longer limited to a single global operator.

**Acceptance Criteria:**

**Given** the identity model
**When** `TenantMembership` is introduced
**Then** it stores `UserId`, `TenantId`, and `Role` ∈ {TenantAdmin, TenantMember}
**And** a user may have memberships in multiple tenants (UI switcher still deferred)

**Given** the existing `AuthService` single-operator existence check (`GetExistingOperatorAsync` or equivalent)
**When** this story completes
**Then** that gate is removed so a second user can exist without blocking signup/invite flows later

**Given** the seeded `default` tenant from Epic 11
**When** migration/seed runs
**Then** the existing Platform 0 operator (if any) is linked as `TenantAdmin` on `default`
**And** orphaned users without membership cannot obtain a tenant-scoped admin session

**Given** unit/integration coverage
**When** memberships are created/queried
**Then** role values are validated and duplicate `(UserId, TenantId)` memberships are rejected

### Story 12.2: JWT tenant_id and tenant-scoped login

As a Tenant Admin or Member,
I want to sign in on my tenant host and receive a JWT bound to that tenant,
So that my session cannot accidentally operate another workspace.

**Acceptance Criteria:**

**Given** a user with a TenantMembership on tenant `{slug}`
**When** they log in via `{slug}.cohestra.app` (or local equivalent)
**Then** the access token includes `tenant_id` (and `role`) set from that membership
**And** refresh preserves `tenant_id`

**Given** a user with no membership in the resolved tenant
**When** they attempt login on that host
**Then** login fails with a clear error

**Given** an admin API request
**When** JWT `tenant_id` is missing or does not align with the resolved tenant Host
**Then** the request is rejected (401/403 as appropriate)
**And** client-supplied `X-Tenant-Id` alone is never trusted to set tenant context

**Given** a user who belongs to multiple tenants
**When** they log in on tenant A’s host
**Then** the session is bound to tenant A only (no switcher in v1)

### Story 12.3: Enforce Admin vs Member server-side

As a Tenant Admin,
I want Members blocked from billing, team, and tenant settings APIs,
So that money and seat controls stay Admin-only while Members can run allowed ops.

**Acceptance Criteria:**

**Given** a Tenant Member JWT
**When** they call Team, Billing, or Tenant settings endpoints
**Then** the API returns 403

**Given** a Tenant Member on Core (no campaigns)
**When** they call campaign create/send APIs
**Then** the API returns 403 (or plan-locked equivalent)
**And** Member UI later shows feature-locked copy — not a billing CTA (UX wiring Epic 14/15)

**Given** a Tenant Admin
**When** they call the same Team/Billing/settings endpoints (within plan)
**Then** access is allowed subject to Status ∩ BillingStatus and plan gates

**Given** role checks
**When** any admin endpoint runs
**Then** authorization is enforced server-side (not UI-only)

**Given** Basic has only the Admin seat
**When** Member-role behavior is tested
**Then** matrix still holds for Core/Pro fixtures where Member seats exist

### Story 12.4: Platform Admin role claim

As a Platform Admin,
I want a distinct platform role claim on my token,
So that platform routes reject ordinary tenant JWTs and tenant routes stay tenant-scoped.

**Acceptance Criteria:**

**Given** a Platform Admin identity
**When** they authenticate to platform routes
**Then** the token includes a `platform_admin` (or equivalent) claim and is not a substitute for tenant membership

**Given** a tenant Admin/Member JWT without platform claim
**When** they call Platform Admin APIs (directory, lifecycle)
**Then** the request is rejected (403)

**Given** a Platform Admin JWT
**When** they call tenant admin APIs without a valid tenant membership context
**Then** they cannot impersonate a Tenant Admin (no break-glass login-as in v1)
**And** they may only perform platform metadata/lifecycle operations as defined in Epic 11

**Given** platform vs tenant route separation
**When** authorization middleware runs
**Then** platform routes require the platform claim; tenant routes require `tenant_id` + membership role

## Epic 13: Guaranteed Tenant Isolation

Every API/export/report is tenant-scoped; Redis namespaced; TenantIsolation tests are a release gate (SM-1).

**FRs covered:** FR-9, FR-10

### Story 13.1: TenantResolutionMiddleware on all API requests

As a security-conscious operator,
I want every API request to resolve Tenant Context before business logic,
So that handlers never run ambiguously across tenants.

**Acceptance Criteria:**

**Given** a public or admin API request
**When** it enters the pipeline
**Then** `TenantResolutionMiddleware` (or equivalent) resolves Tenant Context before controllers/services execute

**Given** Host `{slug}.cohestra.app` (or local `{slug}.localhost` / `DEV_TENANT_SLUG`)
**When** the slug exists
**Then** Tenant Context is set to that tenant

**Given** an unknown or missing tenant slug on public routes
**When** resolution fails
**Then** the response is 404

**Given** an unknown/mismatched tenant on admin routes
**When** resolution fails or JWT `tenant_id` does not match
**Then** the response is 403 (or 401 if unauthenticated)

**Given** apex marketing host (`cohestra.app` / `www`)
**When** platform marketing/signup routes are hit
**Then** no tenant SitePage context is applied (marketing-only)

### Story 13.2: EF global query filters and Redis tenant namespaces

As a tenant Admin,
I want queries and caches automatically scoped to my tenant,
So that another tenant’s data cannot appear through a missed WHERE clause or shared cache key.

**Acceptance Criteria:**

**Given** entities implementing `ITenantScoped` (or equivalent) from Epic 11
**When** EF global query filters are enabled
**Then** normal repository/query paths only return rows for the current Tenant Context
**And** bypasses exist only on explicitly marked Platform Admin audit paths (`[RequiresPlatformAdmin]` or equivalent)

**Given** Redis usage for public site, dashboard metrics, rate limits, or similar
**When** keys are written/read
**Then** keys follow `tenant:{tenantId}:…` (e.g. `tenant:{id}:public:site:published`, `tenant:{id}:dashboard:metrics`)
**And** invalidation on publish/update only affects that tenant’s keys

**Given** Tenant A context
**When** a service accidentally queries without an explicit tenant filter
**Then** the global filter still excludes Tenant B rows

**Given** structured logging
**When** business operations run
**Then** logs include `tenantId` (NFR-5)
