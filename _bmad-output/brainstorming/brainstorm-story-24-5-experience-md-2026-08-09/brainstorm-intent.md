# Story 24.5 Intent — EXPERIENCE.md Activities list section

**Epic:** Activities list — operator at scale  
**Story ID:** 24.5  
**Date:** 2026-08-09  
**Depends on:** Stories 24.1, 24.2, 24.3, 24.4 — merged  
**Source:** Brainstorm session (memlog in this folder)

## Problem

Epic 24 shipped substantial `/activities` UX (at-cap recovery, card signals, quick actions, URL-sync filters + sort) across four implementation stories — but **`EXPERIENCE.md` still only mentions Activities in the IA table** (one row: "Cap warnings at 80%").

Without a dedicated **Activities module** section:

- Future stories and agents lack a behavioral contract (like Clients has at §Clients module)
- Operator flows from dashboard → activities → clients are undocumented as a system
- Plan-gate and recovery rules live only in code and brainstorm artifacts

## Goal

Add an **Activities module (operator at scale)** section to `_bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-07-18/EXPERIENCE.md` that documents **presentation and interaction only** for everything shipped in 24.1–24.4 — mirroring the depth and structure of the existing **Clients module** section.

**No code changes in 24.5** — documentation only.

## In scope (Story 24.5)

### 1. New section placement

Insert **`## Activities module (operator at scale)`** immediately **after** the Clients module section (or after Clients plan gates subsection — match document flow). Update `EXPERIENCE.md` frontmatter `updated` date.

Cross-link:
- Clients module (quick action → `/clients?activityId=…`)
- Dashboard plan-limit banners / deep links (`?status=published`)
- `plan-limit-utils` behaviors at narrative level (no code dumps)

### 2. Mental model (table)

| Concept | UX treatment |
|---------|----------------|
| **Activity** | One card per activity — launch engine with status, registrations, share link |
| **Published cap** | Tenant plan limit on live activities — blocks new publish until slot freed |
| **Registration cap** | Tenant monthly sign-ups — pauses new public registrations when blocked |
| **Recovery** | Operator frees a published slot via archive/unpublish — not billing-first |
| **URL filters** | Bookmarkable list state — shareable with teammates |
| **Sort** | Server-side ordering across full filtered set — paginated card grid |

### 3. Page header — `/activities`

- Title: **Activities**
- Description: *Launch and manage your lead engines.*
- **New activity** CTA:
  - Normal: primary link → `/activities/new`
  - **Published blocked:** secondary button, disabled posture — tooltip/title *"Free a published slot first"* — focuses **Free a slot** chip (`aria-describedby`)

### 4. At-cap banner (`ActivitiesAtCapBanner`)

**Single compound alert** — never two stacked plan-limit banners.

| Variant | When | Content |
|---------|------|---------|
| **blocked** | Any dial at hard cap | Red destructive styling |
| **warn** | Dial ≥80% | Amber/gold styling; **Dismiss** per session (`sessionStorage`, tenant-scoped key) |

| Condition | Primary line | Secondary line | Actions |
|-----------|--------------|----------------|---------|
| Published blocked | Published at capacity (used/limit). Archive or unpublish one… | — | **Review published** |
| Registrations blocked | — | Monthly sign-ups paused (used/limit) | Upgrade link (tenant admin only) |
| Both blocked | Published line first | Reg line second | Review published + billing |
| Warn only | Softer capacity copy | Optional second dial | Review published; Dismiss |

**Review published** → applies `status=published` filter + scrolls to grid.

### 5. Recovery chip row (`ActivitiesRecoveryChips`)

Below banner, above filter bar. Reuse Clients `FilterChip` visual language (rounded-full, `aria-pressed`, count badge).

| Chip | Visible when | Behavior |
|------|--------------|----------|
| **Published only** | Published dial blocked/warn OR reg dial blocked | Toggles `status=published` in URL; count badge from shell usage |
| **Free a slot** | Published dial blocked only | Sets `status=published` + **recovery mode** helper strip + scroll to grid |

**Recovery mode strip** (inline, not modal):

> You're at your published limit. Open an activity below and **archive** or **unpublish** it to free a slot.

**Invariant:** Free a slot never navigates to billing.

### 6. Filter bar (URL-synced)

All values derived from `searchParams`. Page number stays **local state** (not in URL). Filter change resets page to 1.

| Control | Query param | Notes |
|---------|-------------|-------|
| Search | `search` | Debounced 400ms → `router.replace` |
| Status | `status` | `draft` \| `published` \| `archived` |
| Community | `community` | Community label (matches API) |
| Category | `category` | Category name |
| Sort by | `sortBy` + `sortDirection` | Omitted when default (`updatedAt` desc) |

**Sort presets** (single select, implicit direction):

| Value | Label |
|-------|-------|
| `updatedAt:desc` | Last updated (default) |
| `createdAt:desc` | Created |
| `name:asc` | Name |
| `registrationCount:desc` | Registrations |

**Clear filters** → `/activities` (no query).

**URL hygiene:** Invalid sort params sanitized on load (invalid keys removed via replace).

**Layout:** 5-column filter grid on `xl` (`search` spans 2 cols).

### 7. Activity card grid

Responsive card grid (`sm`: 2 cols, `xl`: 3 cols). Each card:

**Header:** Name (link to detail), status badge, schedule/location meta, created date.

**Signals (24.2):**

| Signal | When |
|--------|------|
| **Sign-ups paused** badge | Published + tenant reg dial blocked |
| **Plan reg meter** | Published + dial warn/blocked — shows monthly usage on card |

**Schedule conflict:** Amber border + inline alert when conflicts detected.

**Footer quick actions (24.3):**

| Action | Behavior |
|--------|----------|
| **Copy link** | Published only — copies public registration URL; draft disabled with hint |
| **Registrations (N)** | → `/activities/{id}?tab=registrations` |
| **Clients (N)** | → `/clients?activityId={id}&activityName={name}` |

Quick actions stop card navigation (`stopPropagation`).

### 8. Empty states

| Condition | Copy / action |
|-----------|----------------|
| No activities ever | ProductEmptyState — create first activity |
| Filters match zero | *No activities match your current filters.* + **Clear filters** |
| Catalog load error | Inline alert for communities/categories fetch failure |

### 9. Pagination

Local page state, 20 items per page. Prev/Next below grid.

### 10. Plan gates (Activities)

| Capability | Basic | Core | Pro |
|------------|-------|------|-----|
| Activity list + filters + sort | ✓ | ✓ | ✓ |
| Recovery chips + at-cap banner | ✓ | ✓ | ✓ |
| Card quick actions | ✓ | ✓ | ✓ |
| Publish new activity | Plan limit | Plan limit | Plan limit |

Document that limits come from shell `usage` dials — same source as admin shell meters.

### 11. Cross-module flows (document)

```
Dashboard at-cap banner → Review published → /activities?status=published
Free a slot chip → published filter + recovery strip → archive on card
Copy link → share registration URL
Clients (N) → Clients list filtered by activity
Sort registrationCount desc → pick lowest-traffic published to archive
```

### 12. Responsive notes

| Breakpoint | Behavior |
|------------|----------|
| `< sm` | Filter grid stacks; chips wrap |
| `≥ xl` | 5-filter row + 3-col card grid |

### 13. Accessibility invariants

- Recovery chips: `aria-pressed`, keyboard focusable
- At-cap banner: `role="alert"`
- Recovery strip: `role="status"`
- New activity blocked button: `aria-describedby` → free-a-slot chip id

## Out of scope

| Item | Notes |
|------|-------|
| Code changes | Docs only |
| New mockups HTML | Reference live components; optional `[ASSUMPTION]` mock path |
| Public registration UX | Already elsewhere in EXPERIENCE |
| Dashboard activity table sort | Later epic |
| Epic 24 retrospective | Separate workflow after 24.5 |

## Acceptance criteria

1. **AC-24.5.1 — Section exists**  
   Given EXPERIENCE.md, an **Activities module** section documents mental model, header, banner, chips, filters, cards, empty states, and plan gates.

2. **AC-24.5.2 — Parity with shipped UX**  
   Given merged code for 24.1–24.4, every user-visible element listed above appears in the doc with correct behavior (no aspirational features).

3. **AC-24.5.3 — Clients cross-link**  
   Card **Clients** quick action and `/clients?activityId` filter are cross-referenced to Clients module section.

4. **AC-24.5.4 — URL contract**  
   Query param table matches implemented params including sort defaults and clear-filters behavior.

5. **AC-24.5.5 — Recovery invariants**  
   Doc states: single compound banner, Free a slot never billing, published line primary when dual cap.

6. **AC-24.5.6 — Metadata updated**  
   EXPERIENCE.md frontmatter `updated` reflects change date.

## Implementation notes

- **Primary file:** `_bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-07-18/EXPERIENCE.md`
- **Reference sections:** Clients module (structure), IA table (update Activities row if needed)
- **Reference code:** `activities-list-page.tsx`, `activities-at-cap-banner.tsx`, `activities-recovery-chips.tsx`, `activity-card.tsx`, `activity-card-quick-actions.tsx`, `activities-api.ts` sort helpers
- **Validation:** `bmad-agent-tech-writer` Validate Document or adversarial doc review optional

## Success metric

A new agent or operator reading only EXPERIENCE.md can predict `/activities` behavior at capacity, explain recovery chips, and construct a valid bookmark URL — without reading Epic 24 story files.
