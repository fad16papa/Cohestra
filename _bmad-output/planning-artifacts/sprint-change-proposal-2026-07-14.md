---
generated: 2026-07-14
project: cohestra
author: Correct Course workflow (CC)
status: approved
approved: 2026-07-15
awaiting_approval: false
baseline: epics-1-10-done; uat-polish-in-progress; local-docker-working
change_scope: major
issue_type: strategic-pivot
---

# Sprint Change Proposal — Cohestra Enterprise Multi-Tenant Pivot

## Section 1: Issue Summary

### Problem statement

**Cohestra** and **lead-generation-crm** are two distinct products that were conflated during repository import and rebrand. The running codebase, planning artifacts, and sprint plan still reflect a **single-operator, single-deployment MVP** — while the intended Cohestra product is a **multi-tenant enterprise SaaS** platform.

Continuing implementation against the current PRD, architecture, and sprint status would extend the wrong product shape.

### Triggering context

| Source | Finding |
|--------|---------|
| Product clarification (2026-07-14) | Cohestra = multi-tenant enterprise SaaS; lead-generation-crm = single-operator only — **separate products, separate use cases** |
| Repository history | `8310f58` imported lead-generation-crm codebase; `07a2fb7` rebranded to Cohestra; planning docs not rewritten for enterprise tenancy |
| Local Docker | Cohestra stack runs as project `cohestra-infra` — working baseline for brownfield architecture |
| Sprint status | Epics 1–10 **done**; `uat-handoff-checklist` backlog assumes single-operator client UAT handoff |
| Architecture | Explicit: *"Single operator (Marco) for MVP; schema designed for future productization without multi-tenant implementation now"* |
| PRD §2.2 | Explicit non-user: *"Multi-tenant SaaS customers"* |
| Code | `AuthService` enforces single operator; all admin controllers use one `AdminRole`; `SitePage` is deployment singleton |

### Evidence

**Planning artifact conflicts:**

```279:279:_bmad-output/planning-artifacts/architecture.md
- **Tenancy:** Single operator (Marco) for MVP; schema designed for future productization without multi-tenant implementation now
```

```52:52:_bmad-output/planning-artifacts/prds/prd-lead-generation-crm-2026-06-14/prd.md
- **Multi-tenant SaaS customers** — v1 is built for a single business operator and their activity communities, not a self-serve CRM marketplace.
```

**Code — single-operator enforcement:**

```391:402:src/Infrastructure/Auth/AuthService.cs
    /// Single-operator MVP: at most one Admin account may exist in the workspace.
    ...
                "Multiple operator accounts exist. This workspace supports one operator only."),
```

**Product boundary (confirmed):**

- **lead-generation-crm** — unchanged; continues as single-operator product in its own repo/stack
- **Cohestra (this repo)** — enterprise multi-tenant SaaS; must not assume replacement of lead-generation-crm

### Issue type

**Strategic pivot / product boundary correction** — not a bug, not a failed implementation. The inherited MVP is a valid **Phase 0 brownfield baseline**, not the Cohestra enterprise target state.

---

## Section 2: Impact Analysis

### Epic impact

| Epic / phase | Status | Impact |
|--------------|--------|--------|
| Epics 1–7 | done | **Retain as brownfield foundation** — domain features (activities, clients, campaigns, reports) become **tenant-scoped capabilities** under new tenancy layer |
| Epics 9–10 (Website Builder) | done | **Refactor scope** — SitePage moves from deployment singleton → per-tenant (or per-org) resource |
| **UAT polish** | in-progress | **Suspend / re-scope** — `uat-handoff-checklist` targets single-operator client handoff; **not Cohestra enterprise milestone** |
| **Epic 8** (Phase 2 backlog) | backlog | **Superseded partially** — RBAC and multi-user were deferred; now **required earlier** as Epic 11 foundation |
| **Epic 11+ (new)** | — | **Required** — multi-tenant platform spine (see Section 4) |

### Story impact

| Area | Change |
|------|--------|
| Auth / onboarding (1.3, UAT-AUTH-1) | Replace single-operator register/OTP with **tenant signup + org admin invitation** model |
| All admin API stories (2–7) | Add **tenant context** to every query/command; global filters on `TenantId` |
| Site builder (9.x) | Scope SitePage, branding, public `/` per tenant (subdomain or path strategy TBD in architecture) |
| Deployment (7.2, UAT-DEPLOY) | Cohestra infra supports **multi-tenant production** — not single-droplet single-operator only |
| `uat-handoff-checklist` | **Cancel for Cohestra track** — replace with enterprise readiness checklist (tenancy isolation, RBAC, onboarding) |

### Artifact conflicts

| Artifact | Conflict | Severity | Action |
|----------|----------|----------|--------|
| **PRD** (`prd-lead-generation-crm-2026-06-14`) | Scoped to single operator; excludes multi-tenant SaaS | **Critical** | **New PRD** — `prd-cohestra-enterprise-2026-07-14` (or update via `bmad-prd`) |
| **Architecture** | Single-tenant AD; singleton SitePage | **Critical** | **New architecture spine** — tenancy model, isolation, auth, routing |
| **Epics** | No enterprise epics; Epic 8 RBAC deferred | **High** | **Epic 11–15** (proposed) for platform foundation |
| **UX** (`ux-cohestra-2026-06-14`) | Single-operator admin journeys | **High** | UX addendum — super-admin, tenant admin, org switcher (if applicable) |
| **sprint-status.yaml** | Tracks single-operator UAT as next | **High** | Mark `uat-polish` **done/cancelled** for enterprise pivot; add Epic 11 backlog |
| **README** | Mixed product boundary (partially fixed in branch) | Medium | Document Cohestra vs lead-generation-crm explicitly |
| **Contracts** (`docs/contracts/*`) | No tenant headers / scoping | Medium | v2 contracts or tenant context rules after architecture |
| **CI/CD** | Single-deploy pipeline | Medium | Extend for Cohestra enterprise deploy targets |
| **NFR assessment** | `multi_tenant_production: BLOCKED` | **High** | Unblock via Epic 11+ |

### Technical impact (code — no rollback)

| Component | Current state | Cohestra enterprise need |
|-----------|---------------|--------------------------|
| Identity | ASP.NET Identity, one Admin role | Tenant-scoped users, roles per tenant, platform super-admin |
| Data model | Global tables, no `TenantId` | Tenant (or Organization) entity; FK on all business tables |
| Auth | JWT, single workspace | Tenant claim in JWT; tenant resolution middleware |
| Public routes | `/register/{slug}` global slug namespace | Tenant-scoped slugs or subdomain routing |
| SitePage | Singleton `SitePage` row | Per-tenant site configuration |
| Docker | `cohestra-infra` local project | Correct — keep; add tenant-aware config for prod |
| Demo seed | Wipes all business data globally | Tenant-scoped seed per demo org |

**Rollback assessment:** **Not recommended.** Epics 1–10 deliver reusable domain features. Rollback would destroy working brownfield assets without removing single-tenant assumptions cleanly.

---

## Section 3: Recommended Approach

### Options evaluated

| Option | Viable? | Effort | Risk | Notes |
|--------|---------|--------|------|-------|
| **1. Direct adjustment** (extend current sprint) | **Not viable** | High | High | Adding tenant stories to UAT polish does not address PRD/architecture conflict |
| **2. Rollback** completed epics | **Not viable** | High | High | Loses domain implementation; still need full replan |
| **3. PRD MVP review + replan** | **Viable ✓** | High | Medium | Treat Epics 1–10 as **Platform 0 / inherited MVP**; define **Cohestra Enterprise MVP** separately |
| **Hybrid (selected)** | **Recommended** | High | Medium | **Keep code** + **replan artifacts** + **Epic 11+ implementation** |

### Selected approach: Hybrid — Brownfield baseline + Enterprise replan

**Rationale:**

1. Local Docker works — validates stack (API, web, postgres, redis, nginx) as integration baseline.
2. Domain features (activities, registrations, campaigns) map cleanly to **tenant-scoped modules** once tenancy layer exists.
3. lead-generation-crm remains independent — no cross-repo changes required.
4. Prior UAT handoff checklist is the wrong “done” definition for Cohestra enterprise.

**What we are NOT doing:**

- Deleting or modifying the lead-generation-crm product/repo
- Reverting Epics 1–10 code wholesale
- Continuing `uat-handoff-checklist` as Cohestra’s next milestone

**What we ARE doing:**

1. Freeze single-operator UAT track as **historical / inherited MVP complete**
2. Author **Cohestra Enterprise PRD** (multi-tenant scope)
3. Author **multi-tenant architecture spine**
4. Create **Epic 11+** and new sprint plan
5. Implement tenancy incrementally on brownfield codebase

---

## Section 4: Detailed Change Proposals

### 4.1 PRD — create Cohestra Enterprise PRD

**Artifact:** new `prd-cohestra-enterprise-2026-07-14/prd.md`  
**Skill:** `bmad-prd` (create intent)

**OLD (inherited PRD §2.2 Non-Users):**
> Multi-tenant SaaS customers — v1 is built for a single business operator...

**NEW (enterprise PRD — draft scope):**
> Cohestra v1 (enterprise) serves **multiple tenant organizations** on shared infrastructure. Each tenant has isolated data, one or more operator users, and branded public surfaces.

**Minimum FR themes to define:**

- Tenant provisioning (self-serve signup vs sales-led — decision required)
- Organization admin + member roles (RBAC minimum)
- Data isolation guarantees (row-level + query filters)
- Tenant-scoped activities, clients, campaigns, site builder
- Platform super-admin (optional for MVP — decision required)
- Billing/subscription boundary (integrate vs defer — decision required)

---

### 4.2 Architecture — tenancy spine

**Artifact:** update `architecture.md` or new `architecture-cohestra-enterprise-2026-07-14/ARCHITECTURE-SPINE.md`  
**Skill:** `bmad-architecture`

**OLD:**
> Tenancy: Single operator (Marco) for MVP

**NEW (decisions to lock in architecture workflow):**

| Decision | Options to evaluate |
|----------|---------------------|
| Isolation model | Shared DB + `TenantId` (recommended start) vs schema-per-tenant |
| Tenant resolution | Subdomain (`{tenant}.cohestra.app`) vs path prefix vs JWT claim only |
| Identity model | Extend ASP.NET Identity with `TenantUser` join vs separate user pools |
| Slug uniqueness | `(TenantId, Slug)` composite unique on activities |
| SitePage | Replace singleton with `(TenantId)` unique site row |
| Public API | Tenant context from host header or path |

**Cross-cutting invariants (proposed):**

- Every business entity carries `TenantId` (non-nullable after migration)
- No admin query without tenant filter (middleware + EF global filter)
- JWT includes `tenant_id` claim for admin routes
- Integration tests prove **no cross-tenant data leakage**

---

### 4.3 Epics — proposed Epic 11–15 (backlog)

**Artifact:** extend `epics.md` + `sprint-status.yaml` (after approval)

| Epic | Title | Purpose |
|------|-------|---------|
| **11** | Tenant & Organization Foundation | `Tenant`, `Organization` entities; migrations; seed |
| **12** | Tenant-Scoped Identity & RBAC | Multi-user per tenant; roles; remove single-operator gate |
| **13** | Tenant Context Middleware & API Scoping | EF filters, JWT claims, slug scoping, integration tests |
| **14** | Tenant Admin Onboarding & Provisioning | Signup, invite, tenant settings |
| **15** | Tenant-Scoped Public Surfaces | SitePage, `/register/{slug}`, branding per tenant |

**Epic status changes (proposed):**

```yaml
# sprint-status.yaml
uat-polish: done  # inherited MVP polish complete — not enterprise gate
uat-handoff-checklist: cancelled  # single-operator handoff — wrong product
epic-8: superseded  # RBAC pulled forward into Epic 12
epic-11: backlog
epic-12: backlog
...
```

---

### 4.4 UX — enterprise addendum

**Artifact:** `ux-cohestra-enterprise-2026-07-14/` or addendum to existing UX  
**Skill:** `bmad-ux`

**New journeys (minimum):**

- Platform/tenant admin first login after org creation
- Invite additional operators to same tenant
- Tenant settings (brand, domain, email sender config)
- (Optional) Super-admin tenant list

**Deprecate for Cohestra track:**

- “Single operator enforced at `/register`” journey as primary onboarding

---

### 4.5 Repository & Docker — product boundary docs

**Artifact:** `README.md`, `.env.example`

**Add explicit section:**

> **Cohestra** (this repository) — multi-tenant enterprise SaaS. Docker project: `cohestra-infra`.  
> **lead-generation-crm** — separate single-operator product; separate repository and Docker stack. Do not conflate.

*(Partially implemented on branch `cursor/cohestra-infra-docker-4da3` — merge after approval.)*

---

### 4.6 Code — phased implementation (post-approval, not in this CC doc)

**Phase A — tenancy spine (Epic 11–13):**

- Add `Tenant` entity + migration with default tenant for dev migration path
- Add `TenantId` to core tables (Activities, Clients, Registrations, Campaigns, SitePage, …)
- Replace `AuthService` single-operator check with tenant-aware registration
- EF global query filters + integration tests for isolation

**Phase B — onboarding & public surfaces (Epic 14–15):**

- Tenant signup flow
- Per-tenant site builder and public routes
- Enterprise deploy checklist

**Preserve from inherited MVP:**

- Registration ingestion, dedup logic, campaigns, reports, website builder UI — refactor to tenant scope, do not rewrite from scratch

---

## Section 5: Implementation Handoff

### Change scope classification

**Major** — fundamental replan with PM/Architect involvement before significant new dev stories.

### Handoff plan

| Role | Skill | Responsibility |
|------|-------|----------------|
| **Product** | `bmad-prd` | Cohestra Enterprise PRD — tenant model, RBAC, MVP boundaries, billing defer/integrate |
| **Architect** | `bmad-architecture` | Tenancy spine — isolation, routing, identity, migration strategy |
| **UX** | `bmad-ux` | Enterprise operator journeys — onboarding, invites, tenant settings |
| **PO/Dev planning** | `bmad-create-epics-and-stories` → `bmad-check-implementation-readiness` | Epic 11–15 breakdown |
| **Sprint** | `bmad-sprint-planning` | New sprint status for enterprise track |
| **Developer** | `bmad-dev-story` | Implement Epic 11 stories only after IR gate passes |
| **Optional** | `bmad-generate-project-context` | `project-context.md` with product boundary for all agents |

### Sequencing (recommended)

```
1. [APPROVE] this Sprint Change Proposal
2. bmad-prd          → Cohestra Enterprise PRD
3. bmad-architecture → Multi-tenant architecture spine
4. bmad-ux           → Enterprise UX addendum (can parallel architecture)
5. bmad-create-epics-and-stories → Epic 11–15
6. bmad-check-implementation-readiness
7. bmad-sprint-planning
8. bmad-dev-story    → Epic 11.1 first story
```

### Success criteria

- [ ] Approved Cohestra Enterprise PRD explicitly defines multi-tenant MVP
- [ ] Architecture document locks tenancy model and isolation invariants
- [ ] Epic 11–15 in sprint-status with clear story order
- [ ] Integration test proves tenant A cannot read tenant B data
- [ ] lead-generation-crm product/repo untouched
- [ ] Cohestra local Docker (`cohestra-infra`) remains working through migration phases

### Open decisions (need your input in PRD workflow)

1. **Tenant provisioning:** self-serve signup, sales-led only, or both?
2. **Routing:** subdomain per tenant vs single domain with tenant in JWT?
3. **Platform super-admin:** in enterprise MVP or defer?
4. **Billing:** Stripe/subscription in MVP or defer with manual provisioning?
5. **Migration of existing dev data:** single default tenant for all current rows?

---

## Section 6: Checklist Summary

| Section | Status |
|---------|--------|
| 1. Trigger & context | [x] Done |
| 2. Epic impact | [x] Done |
| 3. Artifact conflicts | [x] Done |
| 4. Path forward | [x] Done — Hybrid replan selected |
| 5. Proposal components | [x] Done |
| 6.1 Review completeness | [x] Done |
| 6.2 Proposal accuracy | [x] Done |
| 6.3 User approval | [!] **Pending** |
| 6.4 Update sprint-status.yaml | [!] After approval |
| 6.5 Handoff confirmed | [!] After approval |

---

## Approval

**Do you approve this Sprint Change Proposal for implementation?**

- **yes** — proceed to `bmad-prd` (Cohestra Enterprise PRD) and update `sprint-status.yaml`
- **revise** — specify what to adjust (scope, epic numbering, open decisions)
- **no** — halt enterprise pivot; state alternative direction
