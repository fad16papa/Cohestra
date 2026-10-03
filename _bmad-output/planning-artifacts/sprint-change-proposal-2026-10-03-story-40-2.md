# Sprint Change Proposal — Story 40.2 Follow-up paging

Date: 2026-10-03  
Owner: Grok 4.6 (Correct Course / Architect / Test Architect)  
Mode: **Batch / Direct Adjustment**  
Composer 2.5: unused  
Approval: Product-owner correction request for PR #369 (draft, unmerged). Story 40.2 stays `review` / `in-progress`. Epic 40 stays `in-progress`. Story 40.3 must not start.

## 1. Issue summary

PO review of Story 40.2 found two MAJOR defects in the locked “existing API only + client-side fan-out” architecture.

### MAJOR 1 — unbounded full-tenant fan-out

`loadFollowUpClients()` walks the complete tenant client collection through sequential 100-row `GET /api/v1/admin/clients` calls. `ClientService` caps page size at 100. At Cohestra’s documented 5,000-client operating target the Follow-up room can require ~50 sequential list requests before presenting results and may render thousands of rows. That is not acceptable for a primary daily-work room.

### MAJOR 2 — unstable multi-request pagination

`ClientService.ApplySort()` has no deterministic unique tie-breaker. Clients with equal or null `LastRegistrationAt` can shift between separate page queries, creating duplicates and omissions. The frontend completeness / dedup check then produces a false “Could not load Follow-up” error against otherwise healthy data. The previous 101-record mock did not prove deterministic real-database paging.

The previously dismissed finding **“Unbounded page fetch”** is **retracted**. Scale and deterministic-paging evidence disprove the locked “existing API only” architecture.

## 2. Impact analysis

| Area | Impact |
| --- | --- |
| Epic 40 | Still completable. 40.2 contract changes; 40.3–40.5 do not start. |
| Story 40.2 | Update existing story, architecture, category contract, tests, and implementation. Do not recreate the story. |
| PRD / MVP | Unchanged. Follow-up remains the primary room with the same four categories. |
| UX | Same room, filters, copy, and empty/error states. Add honest page / Load more controls. Do not hide counts. |
| Architecture | Smallest backward-compatible extension of `GET /api/v1/admin/clients`. No schema migration. No second endpoint unless extending clients would create a worse contract (it does not). |
| Security | Unchanged: `TenantOperator`, tenant-scoped, no PlatformAdmin leakage, no new member workspace-setting capability, no entitlement/billing change. |
| Stories 38.4–39.5 / 40.1 | Protected. Do not weaken the 39.4 44px assertion. |
| Deployment | Out of scope. No production claim. |

## 3. Recommended approach

**Selected: Direct Adjustment (Option 1).**

- Viable: the product meaning, categories, and room UX stay. Only the data contract and paging owner change.
- Rollback: not viable. The room is the right product; the fetch architecture is wrong.
- MVP review: not needed. Scope is not reduced.

Rationale: inventory originally selected client-side fan-out because list fields were sufficient for *derivation*. Scale and unstable sort prove they are not sufficient for *serving a primary room*. Extending the existing clients list is a smaller contract than a second Follow-up endpoint and avoids two sources of truth.

Effort: medium. Risk: medium (shared list endpoint must stay backward-compatible).

## 4. Detailed change proposals

### Story 40.2

OLD data contract: paginate `fetchClients` at `pageSize=100` until exhausted; derive and filter in memory.

NEW data contract:

- Optional `followUpCategory` on `GET /api/v1/admin/clients`.
- Authoritative category totals for the four filters.
- Only the requested page of the selected category.
- Deterministic server ordering: requested primary sort, then unique client ID.
- Existing callers unchanged when Follow-up parameters are absent.
- Server is the category authority. Web client consumes totals + page; it does not re-walk the tenant.

### Architecture

Retract “smallest server extension rejected.” Select backward-compatible clients-list extension. Reject a competing Follow-up endpoint. Reject larger page-size caps, concurrent fan-out, timeout inflation, client-only full-tenant cache, and virtualizing a downloaded 5,000-row set.

### Category derivation

Preserve first-match meanings. Move authority to the server using the same rules (`due/overdue nextFollowUpAt` or New without outreach → Due now; else Inactive → At risk; else Contacted or remaining New → Opportunity; else Healthy). Healthy stays out of needs-attention. Add consumer-boundary contract tests so the web client cannot drift.

### Tests

Add backend unit/integration coverage for category filter, tenant-scoped totals, member read, unauthorized/cross-tenant denial, >100 identical-sort paging without dupes/omissions, repeated page 1/2 determinism, unchanged default list, and invalid inputs.

Add frontend coverage that the room fetches one selected-category page, keeps counts, resets/reconciles page on category change, distinguishes global vs filter empty, and stays honest on retry/permission/loading.

Include a scale-oriented contract test that crosses several pages with duplicate primary sort values. Do not rely solely on mocked `totalCount`.

## 5. Implementation handoff

Scope: **Moderate** (architecture + story update + implementation in the same story). Routed to Architect → Test Architect → Amelia / Developer → independent review → PO pre-merge stop.

Success:

- Follow-up never downloads the complete tenant collection to establish counts or render one filter.
- Category totals remain truthful while paging.
- Shared clients list without Follow-up parameters behaves as before.
- PR #369 remains draft and unmerged.
- Story 40.2 remains `review`. Epic 40 remains `in-progress`. 40.3 not started.

## Checklist

- [x] 1.1 Triggering story: 40.2 Follow-up primary room
- [x] 1.2 Core problem: failed approach (client fan-out + unstable sort)
- [x] 1.3 Evidence: PO MAJOR 1 and MAJOR 2
- [x] 2.1–2.5 Epic 40 remains in-progress; no epic reorder
- [x] 3.1 PRD unchanged
- [x] 3.2 Architecture / API contract update required
- [x] 3.3 UX: add honest pagination; keep filters/copy
- [x] 3.4 Tests and evidence updates required
- [x] 4.1 Direct Adjustment viable
- [x] 4.2 Rollback not viable
- [x] 4.3 MVP review not needed
- [x] 4.4 Selected Direct Adjustment
- [x] 5.1–5.5 Proposal complete
- [x] 6.3 Approved by the PO correction request (Direct Adjustment specified)
- [x] 6.4 No epic add/remove; story key unchanged; status stays review/in-progress
