---
epic: 34
story: 2
status: in-progress
baseline_commit: a207cf4cedaee6d2d8bd744b2b0d119e2437f8c5
---

# Story 34.2: Operator brief surface

Status: in-progress

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

- [ ] Typed `lib/intelligence-api.ts` + parse tests
- [ ] `DashboardIntelligenceBrief` permanent surface
- [ ] Wire into Dashboard (all views + empty-activity state)
- [ ] Safe href guard

## Do NOT implement in 34.2

- LLM synthesis (34.3)
- Chat
- Cinema mount reuse
