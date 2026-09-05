---
epic: 34
story: 2
status: done
baseline_commit: a207cf4cedaee6d2d8bd744b2b0d119e2437f8c5
---

# Story 34.2: Operator brief surface

Status: done

## Story

As a **Tenant Admin or Member**,
I want **the brief on Dashboard as a permanent surface**,
So that **opening Cohestra starts with attention, not a metric wall**.

## DONE requires the Mandatory Code Review Loop

IMPLEMENT → BUILD → TEST → `bmad-code-review` (repeat on new HEAD) → PRODUCT/UX ACCEPTANCE → CLOSE.

## Acceptance Criteria

1. **Given** an authenticated operator opens Dashboard  
   **When** the page loads  
   **Then** a permanent “Needs attention” brief appears above the metric wall  
   **And** it is visible in overview, graphs, and tables views  
   **And** it still appears when the tenant has no published activities

2. **Given** the brief API returns insights  
   **Then** each insight shows title, why it matters, inspectable evidence, and a recommended action  
   **And** action/evidence hrefs are same-origin admin paths (must start with `/`)

3. **Given** `insufficientData.isInsufficient`  
   **Then** the surface explains there is nothing truthful to flag — no invented items

4. **Given** the brief request fails  
   **Then** an inline error is shown with retry  
   **And** the rest of the dashboard still loads

5. **Given** mode is `deterministic`  
   **Then** the surface labels the brief as coming from workspace data, not a model

## Tasks / Subtasks

- [x] Typed `lib/intelligence-api.ts` + parse tests
- [x] `DashboardIntelligenceBrief` permanent surface
- [x] Wire into Dashboard (all views + empty-activity state)
- [x] Safe href guard

## Do NOT implement in 34.2

- LLM synthesis (34.3)
- Chat
- Cinema mount reuse

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6

### Completion Notes List

- Permanent brief above the metric wall and on the empty-activity dashboard.
- Parse fails closed on unsafe action hrefs.
- Browser acceptance on seeded default tenant: real names, deep links, all view modes, mobile.

### File List

- `web/lib/intelligence-api.ts`
- `web/lib/intelligence-api.test.ts`
- `web/components/dashboard/dashboard-intelligence-brief.tsx`
- `web/components/dashboard/dashboard-page-client.tsx`
- `_bmad-output/implementation-artifacts/34-2-code-review-2026-09-05.md`

## Change Log

- 2026-09-05: Operator brief surface on Dashboard.
- 2026-09-05: BMAD review — no BLOCKER/MAJOR.

## Product / UX acceptance (2026-09-05)

| Truth | Result |
| --- | --- |
| Product | Opening Dashboard starts with what needs attention. |
| Data | Seeded tenant showed 13 uncontacted, 2 merge suspects, 34 vs 35 registrations — matching the API. |
| UX | Evidence expandable; actions land on Clients filters; readable at ~390px. |
| Integration | Uses JWT `authFetch` and existing `/clients` / `/reports` / `/activities/{id}` routes. |
| Regression | Dashboard metrics/views still work; CI green. |
