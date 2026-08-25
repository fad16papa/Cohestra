# Story 24.3 Intent — Activity card quick actions

**Epic:** Activities list — operator at scale  
**Story ID:** 24.3  
**Date:** 2026-08-09  
**Depends on:** Stories 24.1, 24.2 — merged  
**Source:** Brainstorm session (memlog in this folder)

## Problem

Operators managing 50+ activities must **open every card** to:

- Copy the public registration URL (Share kit tab)
- Review sign-ups (Registrations tab)
- See which clients came from that activity (Clients lead queue — no activity filter today)

The list is a launch pad; cards should expose **high-frequency ops** without a detour through detail.

## Goal

Add a always-visible **quick action strip** on each `ActivityCard` on `/activities` for copy link, registrations, and clients — matching Cohestra's visible-action UX (no hover-only).

## In scope (Story 24.3)

### 1. `ActivityCardQuickActions` (new client component)

Footer strip **below the card link**, **above** plan-reg cap / conflict strips. Uses `stopPropagation` / placed outside `<Link>`.

| Action | Visible | Behavior |
|--------|---------|----------|
| **Copy link** | Published only | On click: `fetchActivityRegistrationLink` → `copyTextToClipboard` → toast "Link copied" (reuse share-kit fallback copy) |
| **Copy link** | Draft / archived | Disabled button + tooltip "Publish to get a registration link" |
| **Registrations** | Always | Link to `/activities/{id}?tab=registrations`; label includes count: `Registrations (142)` |
| **Clients** | Always | Link to `/clients?activityId={id}`; label `Clients` or `Clients (142)` if count available |

**Layout:** Horizontal row of small outline buttons; wrap on narrow cards. Icons optional (Link2, List, Users) with text labels ≥ `sm`.

### 2. Clients list — activity filter (API + UI)

**Backend (required — no honest Clients action without this):**

- Add optional `activityId` query param to admin clients list endpoint
- Filter: clients with **at least one registration** for that activity (same tenant)
- Integration test in `ClientServiceListFilterTests`

**Frontend:**

- `fetchClients` accepts `activityId?: string`
- `clients-list-page.tsx` reads `?activityId=` from URL (derive like other filters)
- When active: show chip/banner "Filtered by activity: {name}" with clear action (needs activity name — fetch from id or pass `activityName` in query for display only)

**URL:** `/clients?activityId={uuid}` — bookmarkable bridge from Activities list.

### 3. Wire `ActivityCard`

- Import quick actions into `activity-card.tsx`
- Card remains mostly presentational; quick actions are client sub-component receiving `activity: Activity`

### 4. Copy UX

- Reuse `@/lib/clipboard` and `@/lib/activities-api` `fetchActivityRegistrationLink`
- Use existing toast pattern (same as share kit / website builder)
- Loading state on Copy button while fetch in flight (per card, not global)

## Out of scope

| Item | Story |
|------|-------|
| WhatsApp / share pack from card | Share kit stays on detail |
| QR download from card | Detail share tab |
| Sort / full URL filters | 24.4 |
| EXPERIENCE.md | 24.5 |
| Dashboard activity table actions | Later |

## Acceptance criteria

1. **AC-24.3.1 — Copy link published**  
   Given a published activity on `/activities`, clicking **Copy link** copies the public registration URL and shows success toast without navigating away.

2. **AC-24.3.2 — Copy disabled non-published**  
   Draft/archived cards show disabled Copy with explanatory tooltip; no API call.

3. **AC-24.3.3 — Registrations deep link**  
   **Registrations (n)** opens activity detail on Registrations tab.

4. **AC-24.3.4 — Clients filter bridge**  
   **Clients** opens `/clients?activityId={id}` showing only clients registered for that activity.

5. **AC-24.3.5 — Actions outside card link**  
   Clicking any quick action does not trigger navigation to activity overview.

6. **AC-24.3.6 — Visible without hover**  
   Quick actions render on all breakpoints without hover-only reveal.

## Implementation notes

- **Files:** `activity-card-quick-actions.tsx`, `activity-card.tsx`, `clients-list-page.tsx`, `clients-api.ts`, `ClientService.cs`, clients API controller, `ClientServiceListFilterTests.cs`
- **Tests:** API filter test; optional unit test for clients URL parse
- **Counts:** Use `activity.registrationCount` for Registrations label; same for Clients label until distinct client count is on Activity DTO (optional follow-up — registration count is acceptable v1 proxy)

## Success metric

Operator copies a published link or jumps to that activity's clients in **one click** from the list grid — no detail page visit.
