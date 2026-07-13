---
generated: 2026-06-22
project: lead-generation-crm
author: Correct Course workflow
status: approved
approved: 2026-06-22
awaiting_approval: false
baseline_commit: 793a2cd
---

# Sprint Change Proposal — Post-MVP Alignment & Phase 2 Roadmap

## Section 1: Issue Summary

### Problem statement

MVP (Epics 1–5) and post-MVP enhancements (Epic 6) are **implemented and shipped**, but **planning artifacts lag implementation**. Operators are using production features (community/category catalogs, campaign consent fixes, outreach UX) that are **not reflected in the PRD, architecture, or epics index**. Retrospectives for Epics 1–6 also surfaced a **shared hardening backlog** (tests, CI, pagination, SendGrid ops, server-side audit dedup) with no tracked epic.

### Triggering context

| Source | Finding |
|--------|---------|
| Epic 6 retro | Communities/Categories shipped as admin catalogs; activities still store string labels — PRD glossary says "Community is a label on Activity, not a separate tenant" |
| Epics 1–5 retros | Consistent defer: no integration/E2E tests, no CI SendGrid gate, pagination caps at 100 rows |
| Epic 5 + 6 production use | SendGrid delivery depends on DNS; consent required data backfill; WhatsApp follow-up dedup UI-only |
| Sprint status | Epic 6 tracked in `sprint-status.yaml` but **absent from `epics.md` epic list** |

### Evidence

- Code: `Community`, `Category` entities + admin APIs (`20260621160613_AddCommunitiesAndCategories`)
- Code: `Activity.CommunityLabel`, `Activity.Category` remain strings (no FK)
- PRD §3 glossary (line ~427): Community defined as label only
- `deferred-work.md`: Epic 6 deferrals explicitly call for `bmad-correct-course` if FK model needed
- All 50 MVP + 5 Epic 6 stories marked **done**; no Epic 7 in backlog

### Issue type

**Hybrid:** New requirements emerged from production use (Epic 6) + strategic need to formalize Phase 2 + documentation drift (not a failed approach; no rollback required).

---

## Section 2: Impact Analysis

### Epic impact

| Epic | Status | Impact |
|------|--------|--------|
| 1–5 | done | No scope change; retros document defers — fold into Epic 7 hardening |
| 6 | done | Must be **added to `epics.md`**; PRD/architecture must document shipped behavior |
| 7 (new) | proposed | Production readiness + artifact alignment |
| 8+ (new) | proposed backlog | Phase 2 product features from PRD §5 non-goals |

**Epic 6 can remain complete as-is.** No rollback of catalog work — it delivers operator value.

### Story impact

- **No changes** to completed story acceptance (1.1–6.5).
- **New stories** under Epic 7 for hardening and docs (see Section 4).
- **Optional Epic 8** for Phase 2 product scope when prioritized.

### Artifact conflicts

| Artifact | Conflict | Severity |
|----------|----------|----------|
| **PRD** | Missing Epic 6 capabilities; glossary outdated | Medium |
| **Architecture** | Data model notes omit `communities` / `categories` tables | Medium |
| **epics.md** | Epic 6 not listed; no Phase 2 epic breakdown | High |
| **UX (EXPERIENCE.md)** | Activities submenu (Communities, Categories) not documented | Low |
| **sprint-status.yaml** | Epic 6 present ✓ | None |
| **deferred-work.md** | Current ✓ | None |

### Technical impact

- **No immediate code change required** for this proposal to be valid — first wave is documentation + backlog.
- **Optional FK migration** (CommunityId/CategoryId on Activity) is a moderate schema change — defer to Epic 7.5 or Epic 8 unless operator reports label drift bugs.
- **CI pipeline** touches repo root `.github/workflows` — new infrastructure artifact.
- **SendGrid DNS** remains operator-run; app can add read-only "setup checklist" panel (Epic 7 story).

---

## Section 3: Recommended Approach

### Selected path: **Hybrid (Option 1 + Option 3 lite)**

| Option | Viable? | Notes |
|--------|---------|-------|
| **1. Direct adjustment** | ✅ Primary | Add Epic 7 stories; update PRD addendum + architecture; append Epic 6 to epics.md |
| **2. Rollback** | ❌ | Reverting Epic 6 catalogs would harm operators; not justified |
| **3. MVP review** | ✅ Partial | MVP **unchanged and complete**; this proposal defines **post-MVP Phase 2** without shrinking MVP |

### Rationale

1. **MVP is done** — SM-1 through launch criteria met in code; no need to reopen Epics 1–5 scope.
2. **Documentation debt is the blocker** for Phase 2 planning and new contributors/AI agents — cheap to fix, high leverage.
3. **Hardening backlog is shared** across retros — one Epic 7 bundles CI, tests, pagination, outreach dedup instead of silent defers.
4. **FK catalog model is optional** — string denormalization works for single-operator scale; FK migration only if rename/delete/report reconciliation pain appears.

### Risk assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Planning docs still drift | Medium | Epic 7.1 makes doc update a tracked story |
| Production incident without tests | Medium | Epic 7.3 prioritizes registration, campaign, dedup paths |
| Label/catalog inconsistency | Low | Epic 7.4 aligns report filters with catalog pickers before FK migration |
| Scope creep into Phase 2 | Medium | Epic 8 stays backlog until Epic 7 complete |

---

## Section 4: Detailed Change Proposals

### 4.1 PRD — `prd-lead-generation-crm-2026-06-14/prd.md`

#### Add §6.3 Shipped Post-MVP Enhancements (after §6.2)

**NEW:**

```markdown
### 6.3 Shipped Post-MVP Enhancements (Epic 6, 2026-06-22)

The following capabilities shipped after MVP closure and are in production use:

- **Community catalog** — Operators CRUD communities; view leads per community; filter clients and activities by community name.
- **Category catalog** — Operators CRUD categories; activity create and list filters use catalog dropdowns.
- **Form field editor UX** — Two-panel ordered editor with scrollable properties; responsive layout.
- **Client outreach UX** — Timeline scroll bounds; WhatsApp follow-up save requires changed status or note; toast deduplication.
- **Campaign/consent hardening** — Consent on legacy form templates; backfill for legacy email clients; SendGrid error surfacing.

**Model note:** Activities store `communityLabel` and `category` as **denormalized strings** synchronized on catalog rename; catalog delete blocked while activities reference the label. FK migration is Phase 2 optional (see Epic 7/8).
```

#### Update §3 Glossary — Community entry

**OLD:**

> **Community** is a label/category on Activities, not a separate tenant.

**NEW:**

> **Community** — A business grouping for activities and lead attribution (e.g., TGH Tennis Club). Operators manage a **Community catalog** (CRUD). Each Activity stores a community **label** copied from the catalog at assign time; reports and filters match on that label. Not a separate tenant.

#### Add Category glossary entry

**NEW:**

> **Category** — Activity classification (e.g., Tennis Clinic, Pickleball). Operators manage a **Category catalog**. Activities store a category **label** denormalized from the catalog.

**Rationale:** Aligns PRD with shipped Epic 6 without rewriting MVP FR numbering.

---

### 4.2 Architecture — `architecture.md`

#### Extend Data model notes

**NEW (append to § Data model notes):**

```markdown
- `communities` / `categories` → catalog tables (id, name, timestamps); seeded from distinct activity labels on migration
- `activities.community_label` / `activities.category` → denormalized strings; rename propagates via catalog service; no FK in MVP+6
- `client_timeline_events` → append-only audit (registrations projected + outreach events from Epic 5+)
```

#### Add § Quality & Delivery (new subsection)

**NEW:**

```markdown
### Quality & delivery (post-MVP target)

| Area | MVP state | Epic 7 target |
|------|-----------|---------------|
| CI | Unit tests for SendGrid settings only | GitHub Actions: build, test, SendGrid sandbox gate |
| Integration tests | Deferred | Registration ingest, dedup, campaign send smoke |
| List pagination | Activities/reports capped at 100 | Server pagination + UI on activities list and report filters |
| Email delivery | SendGrid API accept | Operator DNS checklist; optional in-app setup status |
```

**Rationale:** Architecture doc is the source of truth for data model and NFR evolution.

---

### 4.3 Epics — `epics.md`

#### Add to Epic List (after Epic 5)

**NEW:**

```markdown
### Epic 6: Post-MVP Enhancements (Shipped)
Brownfield improvements from operator production use: community/category catalogs, form editor UX, client outreach guards, campaign/consent hardening.
**Stories:** 6.1–6.5 (see implementation-artifacts)

### Epic 7: Production Readiness & Artifact Alignment (Proposed)
Close documentation drift, CI/test gaps, and scale limits before Phase 2 product expansion.
**Priority:** Before Epic 8
```

#### Proposed Epic 7 stories (backlog)

| ID | Story | AC summary |
|----|-------|------------|
| 7.1 | Planning artifact sync | PRD §6.3, glossary, architecture data model, epics index updated; cross-linked to Epic 6 artifacts |
| 7.2 | CI pipeline | GitHub Actions: `dotnet test`, `npm run build`, SendGrid validator gate |
| 7.3 | Integration test matrix | Registration POST + dedup; campaign send skip/consent; catalog CRUD smoke |
| 7.4 | List pagination | Activities list server search/pagination; report filter catalog alignment |
| 7.5 | Server outreach dedup | Reject identical WhatsApp follow-up POST within cooldown OR idempotency key |
| 7.6 | Operator delivery checklist | Settings or campaigns panel: SendGrid sender/domain status hints |

**Optional defer to Epic 8:**

| ID | Story | Notes |
|----|-------|-------|
| 8.x | Catalog FK migration | `Activity.CommunityId` / `CategoryId` with FK constraints |
| 8.x | WhatsApp Business API | PRD Phase 2 |
| 8.x | Email drip sequences | PRD Phase 2 |
| 8.x | RBAC | PRD Phase 2 |
| 8.x | Manual merge UI | PRD open question |

---

### 4.4 UX — `EXPERIENCE.md`

#### Admin nav — Activities section

**NEW (admin IA):**

```markdown
Activities (expandable)
├── All activities
├── Communities
└── Categories
```

**Rationale:** Matches shipped `admin-nav-links.tsx` behavior.

---

## Section 5: Implementation Handoff

### Scope classification: **Moderate**

Requires backlog reorganization (Epic 7 in sprint-status) + PO/Architect doc updates + Dev implementation of hardening stories.

### Handoff plan

| Role | Responsibility |
|------|----------------|
| **PM (`bmad-prd` update intent)** | Approve PRD §6.3 + glossary changes |
| **Architect (`bmad-create-architecture` or manual edit)** | Approve architecture data model + quality section |
| **PO / Sprint (`bmad-sprint-planning`)** | Add Epic 7 to `sprint-status.yaml` as `backlog`; prioritize 7.1 → 7.2 → 7.3 |
| **Dev (`bmad-dev-story`)** | Implement 7.2–7.6 in order after 7.1 |
| **QA (`bmad-testarch-nfr`)** | Run NFR audit after 7.2–7.3 land |
| **Operator** | SendGrid domain authentication (parallel, not dev-blocked) |

### Success criteria

- [ ] PRD, architecture, and epics.md describe Epic 6 accurately
- [ ] Epic 7 appears in sprint-status with stories 7.1–7.6 in backlog
- [ ] CI runs on PR/push with green build
- [ ] At least one integration test covers registration → client → dedup path
- [ ] Activities list no longer silently caps at 100 without operator notice (pagination or explicit UX)

### What this proposal does **not** do

- Does not reopen MVP FR acceptance
- Does not require FK migration immediately
- Does not start Phase 2 WhatsApp API / drips / RBAC (Epic 8)

---

## Section 6: Checklist Summary

| Section | Status |
|---------|--------|
| 1. Trigger & context | [x] Done |
| 2. Epic impact | [x] Done — Epic 7 new; Epic 6 doc only |
| 3. Artifact conflicts | [x] Done |
| 4. Path forward | [x] Done — Hybrid selected |
| 5. Proposal components | [x] Done |
| 6. User approval | [x] Done — approved 2026-06-22 |
| 6.4 sprint-status update | [x] Done — Epic 7 added; 7.1 marked done |

---

## Approval

**Review this proposal.** Reply:

- **`yes`** — Approve; update sprint-status with Epic 7 backlog and apply PRD/architecture/epics edits
- **`revise`** — Specify what to change
- **`no`** — Cancel; no artifact updates
