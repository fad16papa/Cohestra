---
project_name: cohestra
date: '2026-07-20'
stepsCompleted:
  - step-01-document-discovery
  - step-02-prd-analysis
  - step-03-epic-coverage-validation
  - step-04-ux-alignment
  - step-05-epic-quality-review
  - step-06-final-assessment
assessment_focus: Cohestra Enterprise multi-tenant (Epics 11–15)
documents_included:
  prd: prds/prd-cohestra-enterprise-2026-07-15/prd.md
  prd_addendum: prds/prd-cohestra-enterprise-2026-07-15/addendum.md
  architecture: architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md
  architecture_supporting: architecture.md
  epics: epics-cohestra-enterprise.md
  ux_design: ux-designs/ux-cohestra-2026-07-18/DESIGN.md
  ux_experience: ux-designs/ux-cohestra-2026-07-18/EXPERIENCE.md
  project_context: _bmad-output/project-context.md
documents_excluded:
  - prds/prd-landing-components-2026-07-07/
  - prds/prd-website-builder-2026-07-06/
  - prds/prd-lead-generation-crm-2026-06-14/
  - epics.md
  - architecture/architecture-website-builder-epic-9-2026-07-06/
  - ux-designs/ux-lead-generation-crm-2026-06-14/
  - ux-designs/ux-website-builder-2026-07-06/
status: complete
overall_readiness: READY
issues_critical: 0
issues_major: 2
issues_minor: 4
---

# Implementation Readiness Assessment Report

**Date:** 2026-07-20
**Project:** cohestra

## Document Discovery

**Assessment focus:** Cohestra Enterprise multi-tenant (Epics 11–15), brownfield extend-only.

### Documents included

| Type | Path |
|------|------|
| PRD | `prds/prd-cohestra-enterprise-2026-07-15/prd.md` |
| PRD addendum | `prds/prd-cohestra-enterprise-2026-07-15/addendum.md` |
| Architecture | `architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md` |
| Architecture (Platform 0 context) | `architecture.md` |
| Epics & Stories | `epics-cohestra-enterprise.md` |
| UX Design | `ux-designs/ux-cohestra-2026-07-18/DESIGN.md` |
| UX Experience | `ux-designs/ux-cohestra-2026-07-18/EXPERIENCE.md` |
| Project context | `_bmad-output/project-context.md` |

### Excluded (other initiatives / superseded for this assessment)

- Landing components PRD, Website Builder PRD, Lead Generation CRM PRD/UX
- Platform 0 `epics.md`
- Website Builder Epic 9 architecture spine
- Older UX packs (CRM, website-builder)

**Confirmed by user:** Continue with Enterprise set (C).


## PRD Analysis

Sources: `prds/prd-cohestra-enterprise-2026-07-15/prd.md` + `addendum.md`.

### Functional Requirements

**FR-1: Self-serve tenant signup** — Prospective Tenant Admin registers Tenant Organization with org name, Tenant Slug, admin email, password (UJ-1). Creates Tenant + first Tenant Admin + plan path (Basic free or Core/Pro Checkout FR-19); SitePage seeded only Core+ (FR-12). Slug globally unique with suggestions on collision; P10 rules `[a-z0-9-]`, 3–48, reserved list; email verification before dashboard; disabled when `registrationClosed`; abuse controls FR-26.

**FR-2: Platform-admin tenant provisioning** — Platform Admin create/suspend/reactivate/archive without self-serve (UJ-4). Suspend = break-glass (not collections). Complimentary `IsComplimentary` + Plan without Stripe; BillingStatus=Free; no FR-23; FR-25 only for Basic; convert via Checkout. Soft archive 30 days then hard-delete; audited; only Platform Admin sets complimentary.

**FR-3: Tenant status machine (operational)** — Status `Active|Suspended|Archived` separate from BillingStatus; access = Status ∩ BillingStatus; Suspended always wins; OnHold keeps Status=Active with read-only; FR-23 terminal → Archived. Access matrix: Active+good billing → full; Active+OnHold → read-only/no public reg; Suspended → blocked/maintenance; Archived → blocked/404.

**FR-4: Tenant-scoped authentication** — Session bound to one Tenant via JWT `tenant_id` (admin) or Tenant Context (public); login fails without membership; refresh preserves claim; multi-tenant membership OK but v1 UI one tenant/session (switcher deferred).

**FR-5: Tenant roles** — Admin vs Member; access = role ∩ plan ∩ Status ∩ BillingStatus. Admin-only: team, settings, SendGrid, billing/Portal, upgrade CTAs. Member: plan-allowed ops; feature-locked (no billing CTA) on locked modules. Server-side enforcement; Member billing/team/settings → 403.

**FR-6: Team invitation** — Admin invites by email with seat capacity (UJ-2 Core+). Soft-block over seats. Basic=1 (invite disabled + upgrade CTA); Core=3; Pro=10; no seat add-ons v1. Token 7 days; revoke not reusable.

**FR-7: Platform admin role** — Distinct from tenant roles; platform routes only; no impersonation in MVP.

**FR-8: Tenant-scoped data model** — Non-nullable TenantId on all Platform 0 business entities; default-tenant backfill; composite uniques include TenantId; EF global query filters.

**FR-9: Tenant context middleware** — Resolve Tenant Context before business logic; missing/unknown → 404 public / 403 admin; cross-tenant negative tests; Redis keys namespaced by TenantId.

**FR-10: Export and report isolation** — CSV/reports only authenticated tenant; aggregations always filter TenantId.

**FR-11: Subdomain tenant routing** — `{slug}.cohestra.app` public+admin; apex marketing/signup; local `{slug}.localhost` or DEV override.

**FR-12: Public site by plan (P2 Option D)** — Basic: stub, no SitePage; Core: fixed SitePage no composer; Pro: full builder. Upgrade paths seed/unlock; preview token tenant-scoped.

**FR-13: Per-tenant email branding** — SendGrid From name/email per tenant; block send if unverified.

**FR-14: Tenant-scoped activity engine** — Activity/form/QR/register/dedup within Tenant; slug unique per tenant; dedup within tenant.

**FR-15: Tenant-scoped dashboard and plan-gated reports** — Basic fixed report+CSV; Core queryable filters+CSV; Pro + campaign analytics + saved views; per-tenant cache.

**FR-16: Tenant-scoped campaigns and templates (Pro)** — Pro-only; Basic/Core 403/upgrade CTA; registration notification emails remain all plans.

**FR-17: Tenant directory** — Platform Admin list/search/paginate with status, slug, created, admin contact, aggregates (no PII export default).

**FR-18: Platform health and audit** — `/ready` unauthenticated; immutable audit actor/action/tenantId/timestamp.

**FR-19: Free Basic signup and paid Core/Pro subscriptions** — Basic no Stripe (Free); Core/Pro Checkout + 30-day trial (direct or upgrade); primary CTA Start free; Stripe IDs + webhook sync; test mode local/CI; trial disclaimer.

**FR-20: USD-only billing** — All prices/Checkout/UI USD; no geo conversion.

**FR-21: Trial expiration reminders** — Daily email + in-app last 7 days before trial_end; Portal link.

**FR-22: Monthly and annual billing** — Core/Pro monthly+annual (2 mo free: $290/$790); Basic no Stripe Price; Portal intervals; sync BillingInterval.

**FR-23: Delinquency lifecycle** — From invoice.payment_failed: PastDue 1–7 (daily, full access) → OnHold 8–28 (weekly, read-only, public blocked) → archive day 29; payment restores Active; trial-end and renewal same path.

**FR-24: Cancel and downgrade at period end** — Apply at current_period_end; over-limit → ReadOnly_OverLimit until under caps; not Suspended.

**FR-25: Basic dormancy archive** — Basic+Free idle 90 days → warn day 83 → archive day 90; login/reg resets; not Core/Pro; Platform Admin restore in window.

**FR-26a: Legal acceptance at signup** — ToS+Privacy required; store AcceptedAt/versions; serve /terms /privacy; Stripe Tax deferred.

**FR-26: Self-serve abuse controls** — Always Google reCAPTCHA (accessible path); email verify; signup 5/IP/hour, 20/IP/day; public reg burst → 429; Suspend break-glass.

**Total FRs: 27** (FR-1…FR-26 + FR-26a)

### Non-Functional Requirements

Extracted from PRD §8 Cross-Cutting NFRs (categories; numbered here for traceability):

**NFR-1 Security:** Tenant isolation server-side; no client-trusted tenant ID without signature; JWT `tenant_id` validated on every admin request.

**NFR-2 Performance:** Public registration < 2s p95; tenant dashboard < 3s p95 with Redis cache per tenant.

**NFR-3 Reliability:** Tenant suspension does not impact other tenants' availability.

**NFR-4 Privacy:** Tenant data export on request; Platform Admin cannot bulk-export tenant PII in MVP.

**NFR-5 Observability:** Structured logs include `tenantId` on all business operations; audit trail for lifecycle.

**NFR-6 Scalability:** Architecture supports 100 active tenants / 100k clients total on single deployment `[ASSUMPTION: v1 scale target]`.

**Total labeled §8 NFRs: 6**

### Additional Requirements

**Data governance (§9):** Single-region residency (Singapore-adjacent); retention paths (voluntary 30d, FR-23 28d unpaid, FR-25 90d idle); confidential client data; Tenant Admin CSV only — no cross-tenant export.

**Success metrics:** SM-1 isolation; SM-2 Basic E2E <15m; SM-3 two-tenant dashboard p95 <3s; SM-4 90% Platform 0 unit tests pass after migration; SM-5 Core+ invite → member creates activity.

**Addendum mechanisms:** Shared DB + TenantId (AD-1); subdomain + local overrides; Identity + TenantMembership (AD-7); brownfield migration steps; SendGrid shared key + per-tenant sender; Stripe test/live env matrix; webhook events; delinquency jobs schedule; price IDs config.

**Explicit non-goals (§5):** No lead-gen CRM changes; no cross-tenant client dedup; no participant portals; no WA Business API; no custom domains v1; Admin/Member only RBAC; no custom finance UI; tickets/share-kit deferred.

### PRD Completeness Assessment

PRD is **implementation-ready for Enterprise v1**: FRs are numbered with testable consequences; dual-dial access, plan gates, billing lifecycle, and abuse controls are ratified. Open item Q2/P9 (list price/grandfathering) is explicitly non-blocking for MVP engineering. Addendum + spine hold mechanism detail. Inherited Platform 0 module detail points to the separate CRM PRD for depth — acceptable given brownfield baseline already built.

## Epic Coverage Validation

Source: `epics-cohestra-enterprise.md` FR Coverage Map + epic FR lists.

### Epic FR Coverage Extracted

| FR | Epic | Coverage note |
|----|------|---------------|
| FR-1 | 14 | Self-serve Basic signup |
| FR-2 | 11 | Platform Admin provision / suspend / reactivate / archive |
| FR-3 | 11 | Status ∩ BillingStatus; Suspended wins |
| FR-4 | 12 | Tenant-scoped JWT auth |
| FR-5 | 12 | Admin vs Member role matrix |
| FR-6 | 14 | Team invite + seat gates |
| FR-7 | 12 | Platform Admin role |
| FR-8 | 11 | TenantId + default-tenant migration |
| FR-9 | 13 | Tenant context middleware + Redis namespace |
| FR-10 | 13 | Export/report isolation |
| FR-11 | 15 | Subdomain routing |
| FR-12 | 15 | Stub / fixed SitePage / builder |
| FR-13 | 15 | Per-tenant email branding |
| FR-14 | 15 | Tenant-scoped activity / registration |
| FR-15 | 15 | Plan-gated reports |
| FR-16 | 15 | Pro-only campaigns |
| FR-17 | 11 | Platform tenant directory |
| FR-18 | 11 | Platform health + audit |
| FR-19 | 14 | Basic free + Core/Pro Checkout/trial |
| FR-20 | 14 | USD-only |
| FR-21 | 14 | Trial reminders |
| FR-22 | 14 | Monthly / annual |
| FR-23 | 14 | Delinquency lifecycle |
| FR-24 | 14 | Cancel/downgrade + over-limit |
| FR-25 | 14 | Basic dormancy |
| FR-26 | 14 (+15.4 public reg rate) | CAPTCHA + rate limits |
| FR-26a | 14 | ToS/Privacy |

### Coverage Matrix

| FR | PRD Requirement (short) | Epic Coverage | Status |
|----|-------------------------|---------------|--------|
| FR-1 | Self-serve signup | Epic 14 | ✓ Covered |
| FR-2 | Platform provision | Epic 11 | ✓ Covered |
| FR-3 | Status machine | Epic 11 | ✓ Covered |
| FR-4 | Tenant auth | Epic 12 | ✓ Covered |
| FR-5 | Roles | Epic 12 | ✓ Covered |
| FR-6 | Team invite | Epic 14 | ✓ Covered |
| FR-7 | Platform admin role | Epic 12 | ✓ Covered |
| FR-8 | Data model TenantId | Epic 11 | ✓ Covered |
| FR-9 | Tenant middleware | Epic 13 | ✓ Covered |
| FR-10 | Export isolation | Epic 13 | ✓ Covered |
| FR-11 | Subdomain routing | Epic 15 | ✓ Covered |
| FR-12 | Public site by plan | Epic 15 | ✓ Covered |
| FR-13 | Email branding | Epic 15 | ✓ Covered |
| FR-14 | Activity engine | Epic 15 | ✓ Covered |
| FR-15 | Dashboard/reports | Epic 15 | ✓ Covered |
| FR-16 | Campaigns Pro | Epic 15 | ✓ Covered |
| FR-17 | Tenant directory | Epic 11 | ✓ Covered |
| FR-18 | Health/audit | Epic 11 | ✓ Covered |
| FR-19 | Billing signup | Epic 14 | ✓ Covered |
| FR-20 | USD-only | Epic 14 | ✓ Covered |
| FR-21 | Trial reminders | Epic 14 | ✓ Covered |
| FR-22 | Monthly/annual | Epic 14 | ✓ Covered |
| FR-23 | Delinquency | Epic 14 | ✓ Covered |
| FR-24 | Cancel/downgrade | Epic 14 | ✓ Covered |
| FR-25 | Basic dormancy | Epic 14 | ✓ Covered |
| FR-26 | Abuse controls | Epic 14 (+15.4) | ✓ Covered |
| FR-26a | Legal acceptance | Epic 14 | ✓ Covered |

### Missing Requirements

**Critical Missing FRs:** None.

**FRs in epics not in PRD:** None (inventory mirrors PRD).

**NFR residual (noted in epics validation, not FR gaps):** NFR-6 scalability / NFR-7 residency are ops/deploy concerns — not story-blocked for coding. SM-4 brownfield test pass rate verified during Epics 11–13.

### Coverage Statistics

- Total PRD FRs: **27**
- FRs covered in epics: **27**
- Coverage percentage: **100%**


## UX Alignment Assessment

### UX Document Status

**Found.** Midnight Atelier pack is final and included:

- `ux-designs/ux-cohestra-2026-07-18/DESIGN.md` — tokens, craft, motion
- `ux-designs/ux-cohestra-2026-07-18/EXPERIENCE.md` — surfaces, IA, roles, banners, WCAG
- Key mocks: marketing-start-free, basic-stub-home, admin-dashboard-basic, team-seat-gate, platform-admin-suspend (+ share-kit parked)

### UX ↔ PRD Alignment

| Area | Alignment |
|------|-----------|
| Start free primary / trial secondary | Matches FR-19 / P6 / UJ-1 |
| Dual dials + Suspended wins | EXPERIENCE + BillingBanner states match FR-3 / FR-23 / FR-24 |
| Plan-gated public door | Stub / fixed / builder matches FR-12 |
| SeatGate Basic 1 / Core 3 / Pro 10 | Matches FR-6 |
| reCAPTCHA + ToS/Privacy | Matches FR-26 / FR-26a |
| UpgradePanel Admin vs Member | Matches FR-5 |
| Platform Suspend ≠ collections | Matches FR-2 / H6 |
| Share kit | Explicitly parked Epic 16 / UX-DR15 — matches PRD §13.11 |

**No critical UX↔PRD misalignment.**

### UX ↔ Architecture Alignment

| UX need | Architecture support |
|---------|----------------------|
| Subdomain public + admin | AD-2 Host resolution + nginx |
| Plan-gated SitePage | AD-4 / AD-8 / AD-10 |
| Stripe Checkout + Portal only | AD-11 |
| JWT tenant_id session | AD-7 |
| Theme tokens (next-themes) | Web stack already Next + Tailwind + shadcn; craft tokens are app-layer (Epic 14.1) — no spine blocker |
| Performance NFR-2 | Redis per-tenant (AD / FR-9) |

**Minor doc drift:** spine stack table says Next.js **15+**; repo/`project-context` pin **16.2.9**. Non-blocking — follow project-context.

### Warnings

1. **UX-DR15 share kit** is mocked and craft-ready but correctly **out of v1** — do not pull into Epic 14/15 without a scope change.
2. **`platform-admin-suspend` atelier refresh** is optional/non-blocking per Story 11.4 — acceptable residual polish.
3. Architecture spine `binds` list is shorter than full FR set (omits e.g. FR-15/16/17/18/25/26/26a); decisions still cover billing/isolation — recommend a binds refresh later, not a readiness blocker.

---

## Epic Quality Review

Standards applied from create-epics-and-stories: user value, epic independence (no forward epic deps), story sizing, AC quality, brownfield migration timing, no greenfield starter requirement.

### Best Practices Compliance (summary)

| Epic | User value | Independence | Stories sized | ACs GWT | Traceability |
|------|------------|--------------|---------------|---------|--------------|
| 11 Tenant Workspaces & Platform Control | ✓ Platform Admin outcomes | ✓ Foundation | ✓ 5 stories | ✓ | FR-2,3,8,17,18 |
| 12 Secure Tenant Sign-In & Roles | ✓ Operators sign in securely | Needs 11 only | ✓ 4 | ✓ | FR-4,5,7 |
| 13 Guaranteed Tenant Isolation | ✓ Trust / SM-1 gate | Needs 11–12 | ✓ 4 | ✓ | FR-9,10 |
| 14 Start Free, Invite Team & Billing | ✓ Priya monetization path | Needs 11–13 | ⚠ large | ✓ | FR-1,6,19–26a |
| 15 Public Door & Plan-Gated Ops | ✓ Visitor + ops plan gates | Needs 11–14 | ✓ 7 | ✓ | FR-11–16 |
| 16 Parked | N/A (post-MVP) | Parked correctly | N/A | N/A | UX-DR15 |

### 🔴 Critical Violations

**None.**

- No pure technical-only epic without a user/operator outcome.
- No Epic N requiring Epic N+1 to deliver its stated value.
- Brownfield correctly: default-tenant migration (11.2), remove single-operator gate (12.1), no greenfield starter story required.
- Epic 16 parked without inventing fake v1 stories.

### 🟠 Major Issues

1. **Epic 14 story density** — 8 stories covering signup, Stripe, seats, Portal, three background job families, and Atelier chrome. Especially **14.8** (trial reminders + delinquency + dormancy) is a multi-job epic-slice. **Remediation (optional before sprint):** split 14.8 into 14.8a trial, 14.8b delinquency, 14.8c dormancy if a single story risks slipping; otherwise keep and timebox in sprint planning.
2. **Epic 11–13 sequencing is intentionally technical-first** — justified for isolation risk (documented in epics validation). Not a defect, but **implementers must not skip 13.4 SM-1 gate** before public/billing UI polish.

### 🟡 Minor Concerns

1. **Story 11.1** introduces Stripe nullable fields “ready for later epics” — acceptable schema foresight; ensure no Stripe SDK wiring leaks into Epic 11.
2. **Story 11.2** prepares entities for Epic 13 filters — backward-compatible sequencing, not a forward *runtime* dependency.
3. **Story 14.1** bundles tokens + marketing + pricing — large but coherent craft bootstrap; watch PR size.
4. **Addendum epic map** still shows older Epic 14 → FR-19–24 only; epics file correctly includes FR-25/26/26a — refresh addendum table when convenient.

### Dependency Analysis

- Within-epic: stories ordered 11.1→11.5, 12.1→12.4, 13.1→13.4, 14.1→14.8, 15.1→15.7 without forward references that block earlier stories.
- Cross-epic: 12 uses 11; 13 uses 11–12; 14 uses 11–13; 15 uses 11–14. **No circular deps.**
- DB timing: Tenant + TenantId land when first needed (Epic 11), not a giant “create all tables” epic dump of unrelated domains.

---

## Summary and Recommendations

### Overall Readiness Status

**READY**

Enterprise planning artifacts are complete and aligned for Phase 4 implementation on the existing `Cohestra.sln` + `web/` codebase. FR coverage is 100%. UX (Midnight Atelier) is ratified and story-mapped. Residual items are operational/polish, not planning blockers.

### Critical Issues Requiring Immediate Action

**None.**

### Issues to track (non-blocking)

| Severity | Issue | Action |
|----------|-------|--------|
| Major | Epic 14.8 job bundle size | Optionally split at sprint planning |
| Major | SM-1 gate must not slip | Treat Story 13.4 as hard gate before Epic 15 traffic |
| Minor | Spine Next.js 15+ vs repo 16.2.9 | Follow `project-context.md` |
| Minor | Spine binds list incomplete vs FR set | Optional spine refresh |
| Minor | Addendum epic↔FR table stale | Optional addendum sync |
| Minor | Share kit / platform-admin atelier polish | Stay parked / optional |

### Recommended Next Steps

1. Run **`bmad-sprint-planning`** for the Enterprise track starting at **Epic 11** (do not reuse Platform 0 `sprint-status.yaml` blindly).
2. Implement with **`_bmad-output/project-context.md`** + `epics-cohestra-enterprise.md` as the agent contract; brownfield extend-only.
3. Keep **Midnight Atelier** as the craft bar; park Epic 16 / UX-DR15 unless explicitly pulled.
4. After Epics 11–13, verify **SM-4** (Platform 0 unit test survival) and **SM-1** (TenantIsolation CI) before heavy Epic 14/15 surface work.

### Final Note

This assessment identified **0 critical**, **2 major (process/sizing)**, and **4 minor** issues across FR coverage, UX alignment, and epic quality. No critical issues block implementation. Proceed to sprint planning, then story execution from Epic 11.

**Assessor:** Implementation Readiness workflow (BMad)  
**Date:** 2026-07-20  
**Focus:** Cohestra Enterprise multi-tenant (Epics 11–15)
