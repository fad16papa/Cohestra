---
title: Cohestra Enterprise — Multi-Tenant SaaS
status: draft
created: 2026-07-15
updated: 2026-07-15
gtm_pricing: section-13
sources:
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-07-14.md
  - _bmad-output/planning-artifacts/prds/prd-lead-generation-crm-2026-06-14/prd.md
  - _bmad-output/planning-artifacts/architecture.md
product_boundary:
  cohestra: Multi-tenant enterprise SaaS (this PRD)
  lead_generation_crm: Single-operator product — separate repo, unchanged
platform_baseline: Platform 0 — Epics 1–10 implemented as single-tenant brownfield code
---

# PRD: Cohestra Enterprise

*Multi-tenant enterprise SaaS — distinct from the single-operator **lead-generation-crm** product.*

## 0. Document Purpose

This PRD defines **Cohestra Enterprise** — a multi-tenant SaaS platform where many **Tenant Organizations** run isolated community-event and lead-capture operations on shared infrastructure.

It is written for product stakeholders, architects, UX, and implementation agents building in the **Cohestra** repository via Cursor Cloud and local development.

**Structure:** Glossary-anchored vocabulary, globally numbered **Functional Requirements (FRs)**, **User Journeys (UJ-N)**, and **Success Metrics (SM-N)**. Assumptions are tagged `[ASSUMPTION]` and indexed in §9. Mechanism and transport choices live in `addendum.md`.

**Inputs:**
- Sprint Change Proposal `sprint-change-proposal-2026-07-14.md` (enterprise pivot)
- Inherited single-operator PRD `prd-lead-generation-crm-2026-06-14/prd.md` (Platform 0 domain features)
- Brownfield codebase: Epics 1–10 complete (activities, clients, campaigns, reports, website builder)

**Product boundary:** This PRD does **not** govern **lead-generation-crm** — a separate single-operator product that continues in its own repository.

---

## 1. Vision

Community and activity-driven organizations capture leads through events, QR registrations, and referral-driven sign-ups — but when each organization runs isolated spreadsheets, forms, and messaging tools, growth data fragments and operational cost scales linearly with headcount.

**Cohestra Enterprise** is a multi-tenant platform: each **Tenant Organization** gets a fully isolated workspace with branded public surfaces, operator accounts, activities, client lists, campaigns, and reports — without sharing data with other tenants. The platform operator (Creativorare / Cohestra team) provisions and governs tenants while tenant admins run day-to-day community operations.

The inherited **Platform 0** codebase already implements the activity-engine CRM for one operator. Enterprise v1 adds the **tenancy spine** so that capability serves many organizations safely on one deployment.

**Platform promise (enterprise):** Every tenant's activities become measurable lead-generation engines with **no cross-tenant data leakage** and **no lost context** after registration.

### Why Now

- Platform 0 proves domain value (activities, dedup, campaigns, site builder) on working brownfield code.
- Market positioning shifts from one-off client builds to **repeatable enterprise SaaS**.
- Multi-tenant isolation is a prerequisite for production SaaS revenue and operational scale.

---

## 2. Target User

### 2.1 Jobs To Be Done

**Tenant admin (organization operator)**
- Stand up a branded community-events workspace without engineering help.
- Invite colleagues to operate activities and follow up on leads under RBAC.
- Run activities, registrations, campaigns, and reports with confidence that data stays inside the organization.
- Configure public homepage and registration flows per tenant brand.

**Tenant member (operator)**
- Perform day-to-day activity and client operations within permissions granted by tenant admin.
- See only data belonging to their **Tenant Organization**.

**Platform admin (Cohestra operator)**
- Provision, suspend, and monitor **Tenant Organizations** on shared infrastructure.
- Investigate support issues without routine access to tenant business data `[ASSUMPTION: break-glass audit only, not default]`.

**Activity participant (public registrant)**
- Register for tenant activities via mobile-friendly public pages scoped to the correct organization.
- Receive confirmation with registration number; no account required.

### 2.2 Non-Users (enterprise v1)

- **lead-generation-crm operators** — use the separate single-operator product; not Cohestra Enterprise tenants.
- **Self-serve marketplace buyers comparing CRM categories** — enterprise v1 targets activity-led community operators, not horizontal sales CRM.
- **Participant self-service portals** — participants do not log in; public registration only.
- **End-customer billing self-management** — deferred (see §6.2).

### 2.3 Key User Journeys

- **UJ-1. Priya provisions Ikigai Sports as a new tenant.**
  - **Persona + context:** Priya, operations lead at Ikigai Sports, signing up after a sales demo.
  - **Entry state:** Unauthenticated; marketing site → tenant signup.
  - **Path:** Completes organization name, admin email, password → verifies email OTP → lands in empty tenant dashboard → completes brand accent and site name in settings → creates first **Activity**.
  - **Climax:** Public URL `https://ikigai.cohestra.app/` (or assigned subdomain) shows Ikigai branding; Priya is **Tenant Admin**.
  - **Resolution:** Tenant workspace ready; Platform 0 features available inside tenant scope.
  - **Edge case:** Subdomain slug collision — system suggests alternatives before commit.

- **UJ-2. Priya invites Marco as a second operator.**
  - **Persona + context:** Priya needs help running weekend clinics.
  - **Entry state:** Authenticated **Tenant Admin**.
  - **Path:** Settings → Team → invite email → Marco receives invite → sets password → logs in with **Tenant Member** role.
  - **Climax:** Marco sees dashboard and clients for Ikigai only; cannot access tenant settings or billing.
  - **Resolution:** Multi-user operations without sharing passwords.
  - **Edge case:** Invite expires after 7 days; Priya can resend.

- **UJ-3. Elena registers at Ikigai's Sunday clinic (unchanged participant flow, tenant-scoped).**
  - **Persona + context:** Elena scans QR at venue.
  - **Entry state:** Mobile browser on `https://ikigai.cohestra.app/register/sunday-clinic`.
  - **Path:** Completes form → sees registration number → Client dedup runs within **Ikigai tenant only**.
  - **Climax:** Registration stored under Ikigai; no visibility to other tenants' clients.
  - **Resolution:** Priya sees Elena on Ikigai dashboard.
  - **Edge case:** Same phone registered at a *different tenant* creates a separate **Client** — cross-tenant dedup is intentionally not performed.

- **UJ-4. Platform admin suspends a tenant for non-payment.**
  - **Persona + context:** Cohestra platform operator handling billing exception.
  - **Entry state:** Platform admin console.
  - **Path:** Locates tenant → sets status **Suspended** → public pages show maintenance message; tenant admins cannot log in.
  - **Climax:** Other tenants unaffected; audit log records suspension actor and reason.
  - **Resolution:** Reactivation restores access without data loss.

---

## 3. Glossary

- **Platform** — The shared Cohestra Enterprise deployment (API, web, database, cache, email infrastructure) hosting all tenants.

- **Platform Admin** — Cohestra operator with cross-tenant administration rights (provision, suspend, support). Distinct from **Tenant Admin**.

- **Tenant** — An isolated organization workspace on the Platform. Owns all business data (activities, clients, registrations, campaigns, site configuration). Identified by immutable `TenantId` and a unique **Tenant Slug** used in routing.

- **Tenant Organization** — The business entity represented by a **Tenant** (e.g., Ikigai Sports, TGH Tennis Club). Synonym: **Organization** in UI copy maps to **Tenant**.

- **Tenant Admin** — Authenticated user with full administrative rights within one **Tenant** (settings, team, branding, all operational modules).

- **Tenant Member** — Authenticated user with operational rights within one **Tenant** (activities, clients, campaigns, reports) but not tenant administration.

- **Tenant Slug** — URL-safe unique identifier for a **Tenant** (e.g., `ikigai-sports`). Used for subdomain routing `[ASSUMPTION: {slug}.cohestra.app]`.

- **Tenant Context** — Runtime resolution of which **Tenant** a request operates on, derived from host header (subdomain) and/or authenticated JWT `tenant_id` claim.

- **Platform 0** — Inherited single-operator feature set (Epics 1–10) implemented in the brownfield codebase before enterprise tenancy. Becomes **tenant-scoped modules** under this PRD.

- **Activity**, **Client**, **Registration**, **Campaign**, **Report**, **Community**, **Category**, **Form**, **QR Code**, **Lead Status**, **Registration number**, **Site Page** — Domain terms as defined in Platform 0 PRD, with the constraint that all instances are scoped to exactly one **Tenant**. A **Community** is a business grouping within a tenant, not a tenant itself.

- **Data isolation** — Guarantee that no API query, cache key, or export returns another **Tenant**'s records.

---

## 4. Features

### 4.1 Tenant Provisioning & Lifecycle

**Description:** The Platform supports creating and managing **Tenant** workspaces. Realizes UJ-1, UJ-4.

#### FR-1: Self-serve tenant signup

A prospective **Tenant Admin** can register a new **Tenant Organization** with organization name, **Tenant Slug**, admin email, and password. Realizes UJ-1.

**Consequences (testable):**
- Successful signup creates **Tenant** row, default **Site Page** seed, and first **Tenant Admin** user.
- **Tenant Slug** is globally unique; collision returns validation error with suggestions.
- Email verification required before admin dashboard access.
- Signup is disabled when Platform sets `registrationClosed=true` `[ASSUMPTION: sales-led tenants created by Platform Admin when self-serve disabled]`.

#### FR-2: Platform-admin tenant provisioning

A **Platform Admin** can create, suspend, reactivate, and archive **Tenants** without using self-serve signup. Realizes UJ-4.

**Consequences (testable):**
- Suspended tenant blocks tenant admin login and returns maintenance state on public routes.
- Archived tenant is read-only for 30 days then hard-deleted per retention policy `[ASSUMPTION: 30-day soft archive]`.
- All lifecycle changes append to platform audit log with actor, timestamp, reason.

#### FR-3: Tenant status machine

Each **Tenant** has status: `Active`, `Suspended`, `Archived`.

**Consequences (testable):**
- Only `Active` tenants accept public registrations and admin writes.
- `Suspended` allows Platform Admin read-only inspection.
- Status transitions are idempotent and audited.

---

### 4.2 Identity, Access & RBAC

**Description:** Multi-user access per **Tenant** with role-based permissions. Replaces Platform 0 single-operator enforcement. Realizes UJ-2.

#### FR-4: Tenant-scoped authentication

An authenticated user session is bound to exactly one **Tenant** via JWT `tenant_id` claim (admin routes) or **Tenant Context** resolution (public routes).

**Consequences (testable):**
- Login fails with clear error if user has no membership in resolved tenant.
- Token refresh preserves `tenant_id`.
- User may belong to multiple tenants `[ASSUMPTION: v1 UI shows one tenant per session; tenant switcher deferred to v1.1]`.

#### FR-5: Tenant roles

**Tenant Admin** and **Tenant Member** roles govern access within a tenant.

**Consequences (testable):**
- **Tenant Admin** can invite/remove members, change tenant settings, manage SendGrid sender config.
- **Tenant Member** cannot access team management or destructive tenant settings.
- Role checks enforced server-side on every admin endpoint (not UI-only).

#### FR-6: Team invitation

A **Tenant Admin** can invite users by email to join the **Tenant** with a specified role. Realizes UJ-2.

**Consequences (testable):**
- Invite token expires in 7 days.
- Accepting invite creates tenant membership; no duplicate global operator block.
- Revoked invite cannot be reused.

#### FR-7: Platform admin role

A **Platform Admin** role exists distinct from tenant roles, gated to platform routes only.

**Consequences (testable):**
- Platform routes reject tenant JWTs without platform claim.
- Platform Admin cannot impersonate tenant admin without audited break-glass `[ASSUMPTION: break-glass deferred — platform admin manages metadata only in MVP]`.

---

### 4.3 Tenant Data Isolation

**Description:** Hard guarantee that tenants cannot read or mutate each other's data. Foundational enterprise requirement.

#### FR-8: Tenant-scoped data model

Every Platform 0 business entity (Activity, Client, Registration, Campaign, Community, Category, SitePage, EmailTemplate, etc.) stores non-nullable `TenantId`.

**Consequences (testable):**
- Database migration adds `TenantId` with backfill to a `default` tenant for dev/staging rows.
- Composite unique constraints include `TenantId` where slugs or codes are unique (e.g., Activity slug).
- EF Core global query filter applies `TenantId` on all tenant-scoped entities.

#### FR-9: Tenant context middleware

Every API request resolves **Tenant Context** before business logic executes.

**Consequences (testable):**
- Missing or unknown tenant returns 404 on public routes, 403 on admin routes.
- Integration test suite includes cross-tenant negative cases (tenant A token cannot read tenant B activity by ID).
- Redis cache keys are namespaced by `TenantId`.

#### FR-10: Export and report isolation

CSV exports and reports include only records for the authenticated **Tenant**.

**Consequences (testable):**
- Export of 10,000 rows from tenant A contains zero tenant B IDs.
- Report aggregation queries always filter by `TenantId`.

---

### 4.4 Tenant Routing & Public Surfaces

**Description:** Each **Tenant** has branded public entry points. Replaces deployment-wide singleton SitePage. Realizes UJ-1, UJ-3.

#### FR-11: Subdomain tenant routing

Public and admin web surfaces resolve **Tenant** from subdomain `{tenant-slug}.cohestra.app`. `[ASSUMPTION: apex domain hosts marketing + signup only]`

**Consequences (testable):**
- `https://ikigai.cohestra.app/` renders Ikigai **Site Page**.
- `https://ikigai.cohestra.app/register/{activity-slug}` scopes activity lookup to Ikigai.
- Local dev supports `{slug}.localhost` or `?tenant=` override documented in addendum.

#### FR-12: Per-tenant Site Page

Each **Tenant** has its own **Site Page** draft/publish lifecycle (inherited Website Builder behavior, tenant-scoped).

**Consequences (testable):**
- Publishing Ikigai site does not affect TGH tenant homepage.
- Preview token is scoped to tenant site draft.
- Seed on tenant creation produces default Cohestra-branded starter content overridable by tenant admin.

#### FR-13: Per-tenant email branding

SendGrid sender identity and email footer branding are configurable per **Tenant** within platform guardrails.

**Consequences (testable):**
- Campaign sent from Ikigai uses Ikigai's configured From name/email.
- Platform blocks send if tenant sender not verified (inherited delivery checklist, tenant-scoped).

---

### 4.5 Inherited Platform 0 Capabilities (Tenant-Scoped)

**Description:** The following Platform 0 feature areas remain in enterprise v1, executed **within Tenant Context**. Detailed FRs (activity engine, master client list, dashboard, reports, campaigns, WhatsApp click-to-message, website builder sections) are defined in `prd-lead-generation-crm-2026-06-14/prd.md` (FR-1 through FR-20+). This PRD adds tenancy preconditions only.

**Functional Requirements:**

#### FR-14: Tenant-scoped activity engine

All Activity Engine capabilities (create activity, form schema, QR, public registration, registration numbers, dedup) operate within the resolved **Tenant**. Realizes UJ-3.

**Consequences (testable):**
- Activity slug unique per tenant, not globally.
- Registration dedup matches clients within tenant only.
- All Platform 0 registration ingestion tests pass with `TenantId` injected.

#### FR-15: Tenant-scoped operations dashboard and reports

Dashboard metrics, reports, and CSV export reflect only the current **Tenant** data.

**Consequences (testable):**
- Dashboard totals for tenant A unchanged when tenant B receives registrations.
- Inherited 60s polling and cache TTL behavior preserved per tenant cache namespace.

#### FR-16: Tenant-scoped campaigns and templates

Email templates, segments, and campaign sends are tenant-private.

**Consequences (testable):**
- Segment preview counts only tenant clients.
- Campaign history on client profile shows only tenant campaigns.

---

### 4.6 Platform Administration

**Description:** Minimal console for **Platform Admin** to operate the SaaS. Realizes UJ-4.

#### FR-17: Tenant directory

A **Platform Admin** can list tenants with status, slug, created date, admin contact, and aggregate counts (activities, clients — not PII export by default).

**Consequences (testable):**
- Search by slug and organization name.
- Pagination on tenant list.

#### FR-18: Platform health and audit

Platform exposes health endpoints and immutable audit log for tenant lifecycle and platform admin actions.

**Consequences (testable):**
- `/ready` remains unauthenticated; tenant-aware readiness checks default tenant connectivity.
- Audit entries include actor, action, tenantId, timestamp.

---

## 5. Non-Goals (Explicit)

- **Modifying lead-generation-crm** — separate product; no shared deployment requirement.
- **Cross-tenant client deduplication** — same person at two tenants is two **Clients** by design.
- **Participant login / member portals** — public registration only.
- **WhatsApp Business API** — deferred; click-to-message retained from Platform 0.
- **Automated email drip sequences** — deferred to enterprise v2.
- **Custom report builder** — deferred; inherited filters + CSV sufficient for v1.
- **Billing, subscriptions, Stripe** — deferred `[ASSUMPTION: manual provisioning + contracts for first enterprise customers]`.
- **Tenant custom domains** (`events.ikigai.com`) — deferred to v1.1; subdomain only in v1.
- **Fine-grained custom RBAC** (per-module permissions builder) — Admin vs Member only in v1.

---

## 6. MVP Scope

### 6.1 In Scope (Cohestra Enterprise v1)

- **Tenancy spine:** Tenant entity, `TenantId` on core tables, middleware, EF filters, integration tests
- **Self-serve + platform-admin provisioning** (FR-1, FR-2)
- **Subdomain routing** per tenant (FR-11)
- **Multi-user RBAC:** Tenant Admin + Tenant Member (FR-4–FR-6)
- **Platform Admin** minimal tenant directory + suspend/reactivate (FR-2, FR-17)
- **Per-tenant Site Page** and public registration (FR-12, FR-14)
- **All Platform 0 operational modules** tenant-scoped (FR-14–FR-16)
- **Migration path:** default tenant backfill for existing dev/staging data
- **Cohestra cloud development** workflow (Cursor Cloud Agents + GitHub); no droplet deployment required for v1 dev

### 6.2 Out of Scope for MVP

| Item | Reason |
|------|--------|
| Stripe / usage billing | Manual sales-led provisioning first `[ASSUMPTION]` |
| Custom domains per tenant | Subdomain sufficient for v1 launch |
| Tenant switcher (multi-tenant users) | Rare in v1; one session = one tenant |
| Platform Admin impersonation | Break-glass deferred; audit complexity |
| Schema-per-tenant isolation | Shared DB + `TenantId` sufficient for v1 scale target |
| SOC 2 / formal compliance certification | Post-revenue; design for auditability only |
| lead-generation-crm feature parity fork | Products diverge by design |

### 6.3 Platform 0 Baseline (Already Built)

Epics 1–10 delivered: API-first stack, activities, clients, dedup, dashboard, reports, campaigns, SendGrid, website builder, landing sections. **No rollback.** Enterprise work adds tenancy layer and refactors scoping.

---

## 7. Success Metrics

**Primary**
- **SM-1:** Zero cross-tenant data leakage in integration test matrix — 100% pass on negative cross-tenant cases. Validates FR-8, FR-9.
- **SM-2:** Tenant signup → first published activity → public registration E2E completes in &lt; 15 minutes for a prepared admin. Validates FR-1, FR-11, FR-14.
- **SM-3:** Two tenants on same deployment with 100+ clients each; dashboard p95 &lt; 3s. Validates FR-15, NFR performance.

**Secondary**
- **SM-4:** 90% of Platform 0 unit tests pass without modification after tenancy migration (remaining failures addressed in Epic 11–13). Validates brownfield preservation.
- **SM-5:** Tenant admin invites member; member completes activity creation without admin intervention. Validates FR-6, FR-5.

**Counter-metrics (do not optimize)**
- **SM-C1:** Total tenant count — do not optimize at expense of isolation test coverage (SM-1).
- **SM-C2:** Signup conversion rate — do not remove email verification or isolation checks to inflate conversion.

---

## 8. Cross-Cutting NFRs

| Category | Requirement |
|----------|-------------|
| **Security** | Tenant isolation enforced server-side; no tenant ID in client-trusted headers without signature; JWT `tenant_id` validated on every admin request |
| **Performance** | Public registration &lt; 2s p95; tenant dashboard &lt; 3s p95 with Redis cache per tenant |
| **Reliability** | Tenant suspension does not impact other tenants' availability |
| **Privacy** | Tenant data export on request; platform admin cannot bulk-export tenant PII in MVP |
| **Observability** | Structured logs include `tenantId` on all business operations; audit trail for lifecycle |
| **Scalability** | Architecture supports 100 active tenants / 100k clients total on single deployment `[ASSUMPTION: v1 scale target]` |

---

## 9. Data Governance

- **Residency:** Single region deployment (Singapore-adjacent) for v1 `[ASSUMPTION: DigitalOcean Singapore when deployed]`.
- **Retention:** Archived tenants soft-deleted 30 days; registrations immutable per Platform 0 rules.
- **Classification:** Client contact data = confidential per tenant; platform audit logs = internal.
- **Export:** Tenant Admin can export own tenant CSV reports; cross-tenant export prohibited.

---

## 10. Risk and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cross-tenant data leak | Critical | FR-8/9, mandatory integration tests, code review gate |
| Brownfield refactor breaks Platform 0 | High | Default tenant migration; incremental Epic 11–13; SM-4 |
| Subdomain routing complexity on local dev | Medium | Document `*.localhost` and env overrides in addendum |
| Single-operator code paths remain | Medium | Remove `AuthService` single-operator gate in Epic 12 |
| Scope creep into billing/SSO | Medium | Explicit §5 non-goals; manual provisioning v1 |

---

## 11. Open Questions

1. **Self-serve vs sales-led default:** Is self-serve signup open on launch or invite-only? `[ASSUMPTION: both enabled; feature flag on platform]`
2. **Tenant slug naming rules:** Allow unicode? Min/max length? Reserved slugs list?
3. **Platform Admin users:** How many? SSO for platform team?
4. **SendGrid:** Per-tenant API keys vs shared platform key with per-tenant sender auth?
5. **First production deploy target:** Still deferred (cloud dev only until Francis approves droplet)?

---

## 12. Assumptions Index

- **A-1:** Subdomain routing `{slug}.cohestra.app` — §4.4 FR-11
- **A-2:** Shared database + `TenantId` row isolation — §4.3 FR-8
- **A-3:** Billing deferred; manual tenant provisioning for early customers — §6.2
- **A-4:** Tenant switcher deferred; one tenant per session — §4.2 FR-4
- **A-5:** Platform Admin break-glass impersonation deferred — §4.2 FR-7
- **A-6:** 30-day soft archive before tenant hard delete — §4.1 FR-2
- **A-7:** v1 scale: 100 tenants, 100k clients — §8
- **A-8:** Default tenant backfill for existing dev data — §6.1
- **A-9:** lead-generation-crm remains separate product — §0, §5
- **A-10:** Core tier monetization before tenant-scoped website builder ships — §13
- **A-11:** Pilot pricing uses manual invoicing until Stripe integration — §13.3

---

## 13. Go-to-Market & Monetization Strategy

### 13.1 Positioning

**One-line:** Cohestra turns community events and QR registrations into one client list with follow-up — without Google Forms chaos.

**Primary audience (v1):** Community clubs, fitness studios, and hobby groups running multiple activities per month with 1–5 operators.

**Competitive frame:**

| Alternative | Cohestra advantage |
|-------------|-------------------|
| Google Forms + spreadsheet | Unified client list, dedup, timeline, campaigns |
| Peatix / Luma | CRM pipeline after registration, not just event pages |
| Generic CRM (HubSpot, etc.) | Activity-led capture built-in; no deal-desk complexity |

**Product boundary in all marketing:** Cohestra Enterprise (this product) is multi-tenant SaaS. **lead-generation-crm** is a separate single-operator product — never conflated in copy or demos.

### 13.2 Phased route (stable → market → monetize)

```mermaid
flowchart LR
  P1[Phase 1 Stable] --> P2[Phase 2 Market]
  P2 --> P3[Phase 3 Monetize]
  P1 --> T[Tenancy + isolation tests]
  P1 --> S[Subdomain + signup]
  P2 --> M[cohestra.app marketing]
  P2 --> D[2-3 pilot tenants]
  P3 --> C[Core tier manual billing]
  P3 --> Pro[Pro + website builder]
  P3 --> Stripe[Stripe self-serve]
```

| Phase | Goal | Exit criteria |
|-------|------|---------------|
| **1 — Stable** | Safe multi-tenant platform | Cross-tenant tests pass; signup → activity → registration E2E per tenant |
| **2 — Market** | Discoverable online funnel | cohestra.app live; demo video; 2–3 pilot testimonials |
| **3 — Monetize** | Revenue before feature-complete | ≥1 paying Core tenant; Pro upsell path defined |

### 13.3 Pricing tiers

| Tier | Monthly anchor (USD) | Target buyer | Website builder |
|------|---------------------|--------------|-----------------|
| **Core** | $39 / tenant | Solo operator or small club starting digital capture | No — auto public activity list only |
| **Pro** | $99 / tenant | Club with marketing + follow-up needs | Yes — full Site Page composer |
| **Enterprise** | Custom | Multi-location or sales-led deals | Yes + custom domain (v1.1) |

**Seat add-ons:** +$15 / month per additional operator beyond tier limit (Core: 1 admin; Pro: 3 included).

**Registration soft caps (Core):** 500 registrations / month included; Pro unlimited `[ASSUMPTION: enforce as plan flag, not hard block in v1]`.

### 13.4 Feature gates by tier

| Capability | Core | Pro | Enterprise |
|------------|:----:|:---:|:----------:|
| Activities + QR + public registration | ✓ | ✓ | ✓ |
| Client dedup + timeline | ✓ | ✓ | ✓ |
| Dashboard + reports + CSV | ✓ | ✓ | ✓ |
| Email campaigns | — | ✓ | ✓ |
| Team invites (RBAC) | 1 admin | 3 seats | Custom |
| Public `{slug}.cohestra.app/events` list | ✓ | ✓ | ✓ |
| Website builder + publish homepage | — | ✓ | ✓ |
| Custom domain | — | — | ✓ (v1.1) |
| SSO / SLA | — | — | ✓ |

Implementation: `Tenant.Plan` enum (`Core`, `Pro`, `Enterprise`) checked server-side on gated endpoints and web routes.

### 13.5 Billing rollout

| Stage | Mechanism | Trigger |
|-------|-----------|---------|
| Pilots 1–5 | Manual invoice (bank / GCash) | First stable prod URL + 2 pilots |
| 5–20 tenants | Stripe Checkout + plan flags | First paid Core conversion |
| 20+ | Stripe subscriptions + seat metering | Ops burden on manual billing |

Stripe integration is **out of MVP scope** but plan gates and `Tenant.Plan` ship in Epic 14.

### 13.6 Marketing funnel

```
cohestra.app (apex marketing)
  → Start free trial / Book demo
  → Self-serve tenant signup (or sales calendar)
  → Onboard: first activity + QR in <15 min (SM-2)
  → Email tips: campaigns, reports
  → Upgrade prompt at builder gate or seat limit
```

**Minimum marketing assets:**

- Landing page: problem, demo (90s), pricing (§13.3), signup CTA
- Comparison: vs Google Forms + spreadsheet
- Case study: 1 pilot tenant (post Phase 2)
- SEO targets: "event registration CRM", "community lead capture", "QR event registration"

### 13.7 Launch sequencing (product + GTM)

1. Tenancy spine + isolation (Epic 11–13) — **blocks everything**
2. Subdomain signup + simple public events page
3. cohestra.app marketing site + waitlist or signup
4. 2–3 pilot tenants (discounted or free)
5. **Charge Core** via manual invoice
6. Tenant-scoped website builder → **Pro upsell**
7. Stripe self-serve
8. Scale content + outbound with case studies

### 13.8 GTM success metrics

- **SM-G1:** 3 pilot tenants complete 2+ activities without platform support intervention
- **SM-G2:** First paid Core tenant within 30 days of manual billing offer
- **SM-G3:** ≥1 Pro upgrade driven by website-builder gate
- **SM-CG1:** Do not optimize signup volume over SM-1 (isolation)

Full pricing page copy: `docs/marketing/pricing-tiers.md`

---

## 14. Downstream Handoff

| Next skill | Deliverable | Status |
|------------|-------------|--------|
| `bmad-architecture` | Tenancy spine — isolation, routing, identity, migration | **Done** — `architecture/architecture-cohestra-enterprise-2026-07-15/` |
| `bmad-ux` | Enterprise journeys — signup, team invite, platform admin | Pending |
| `bmad-create-epics-and-stories` | Epic 11–15 breakdown from this PRD | Pending |
| `bmad-check-implementation-readiness` | Align PRD + architecture + UX before dev | After UX |
| `bmad-sprint-planning` | Enterprise sprint status | After epics |
| Pricing page | `docs/marketing/pricing-tiers.md` | **Done** — cohestra.app copy draft |

**Inherited PRD reference:** Platform 0 domain FRs remain authoritative for feature behavior inside tenant scope: `_bmad-output/planning-artifacts/prds/prd-lead-generation-crm-2026-06-14/prd.md`.

**Architecture companion:** `_bmad-output/planning-artifacts/architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md` (AD-1–AD-10).
