# Story 24.1 Intent — Activities list at-cap recovery UX

**Epic:** Activities list — operator at scale  
**Story ID:** 24.1  
**Date:** 2026-08-09  
**Source:** Brainstorm session (memlog in this folder)

## Problem

Operators at plan capacity (e.g. load-pro-alpha: 50/50 published, 5k/5k monthly registrations) land on `/activities` and see:

- **Two stacked red `PlanLimitAlert` banners** — reads like a system error, not a guided recovery path
- **No promoted action** to find which published activities to archive or unpublish
- **Archived noise** in a long grid when the operator only needs to free one published slot
- **Status filter buried** in a dropdown; dashboard deep-links `?status=published` but changing filters does not sync back to the URL

Publishing is blocked until `published.used < published.limit`. The list page should **recover**, not just warn.

## Goal

Give operators at (or near) capacity a **single clear banner** plus **one-click recovery chips** so they can filter to published activities and understand how to free a slot — without opening billing first.

## In scope (Story 24.1)

### 1. Compound at-cap banner (`ActivitiesAtCapBanner`)

Replace the current loop of separate `PlanLimitAlert` instances with **one compound alert** when any relevant dial is blocked or at warn threshold.

| Condition | Banner content | Primary action |
|-----------|----------------|----------------|
| Published blocked | "Published activities at capacity (50/50). Archive or unpublish one to publish another." | **Review published** → applies Published filter |
| Registrations blocked | Secondary line: "Monthly sign-ups paused (5,000/5,000)." | Upgrade link (admin only) |
| Both blocked | Published line first (actionable on this page); reg line second | Review published + billing |
| Warn only (≥80%) | Amber variant; same chip row, softer copy | Optional dismiss per session |

**Reuse** `getPublishedActivitiesLimitMessage`, `getRegistrationsLimitMessage`, and `findLimitDial` from `plan-limit-utils.ts`. Do not duplicate limit logic.

### 2. Recovery chip row (`ActivitiesRecoveryChips`)

Horizontal chip row **below banner, above filter grid**. Reuse visual language from `ClientLeadQueueHeader` `FilterChip` (rounded-full, `aria-pressed`, count badge).

| Chip | Visible when | Behavior |
|------|--------------|----------|
| **Published only** | Published dial `blocked` or `warn`, OR reg dial blocked | Toggles `status=published` filter; shows count from shell usage (e.g. `50`) |
| **Free a slot** | Published dial `blocked` only | Applies Published filter + sets **recovery mode** (helper strip below chips) |

**Free a slot helper strip** (inline, not modal):

> You're at your published limit. Open an activity below and **archive** or **unpublish** it to free a slot.

### 3. URL sync for status filter (enabler)

When chips or banner CTA change status filter, update URL via `router.replace` (`?status=published`). Preserve existing read-on-load behavior. Required so dashboard deep-links and chip actions stay shareable/bookmarkable.

### 4. New activity affordance at hard cap

When `isPublishedActivitiesBlocked`, disable or soften **New activity** with tooltip: "Free a published slot first" linking focus to **Free a slot** chip.

## Out of scope (later stories)

| Story | Deferred |
|-------|----------|
| 24.2 | Registration cap progress + "Sign-ups paused" badge on each card |
| 24.3 | Card quick actions (copy link, registrations, clients filter) |
| 24.4 | Sort published by reg count (lowest first) for smarter Free a slot ordering |
| 24.5 | EXPERIENCE.md Activities list section |

## Acceptance criteria

1. **AC-24.1.1 — Single banner at dual cap**  
   When both published and registration dials are blocked, `/activities` shows **one** alert (not two), with published recovery copy primary and reg pause as secondary line.

2. **AC-24.1.2 — Published only chip**  
   Clicking **Published only** sets status filter to published, syncs `?status=published` in URL, and shows active chip state with published count from shell.

3. **AC-24.1.3 — Free a slot chip**  
   When published cap is blocked, **Free a slot** applies published filter, shows helper strip, and scrolls focus to the activity grid.

4. **AC-24.1.4 — Recovery without billing bait**  
   **Free a slot** never navigates to billing; upgrade remains a separate explicit action on the banner for reg-cap scenarios.

5. **AC-24.1.5 — Member role**  
   Chips work for members; billing upgrade link hidden (`showUpgradeLink={false}`) per existing `PlanLimitAlert` pattern.

6. **AC-24.1.6 — No false cap UI**  
   Chip row hidden when neither published nor registrations dial is `blocked` or `warn`.

## Implementation notes

- **Files:** `activities-list-page.tsx` (compose banner + chips), new `activities-at-cap-banner.tsx`, new `activities-recovery-chips.tsx` (or shared `filter-chip.tsx` extracted later if 24.4 needs it)
- **Data:** `useTenantShell().shell.limitDials` — keys `published`, `registrations`
- **Tests:** unit tests for banner message composition; optional component test for chip → filter + URL
- **Copy tone:** operational recovery, not error storm (align with EXPERIENCE.md LimitMeter posture)

## Success metric

Operator at 50/50 published can reach a filtered published list and read how to free a slot in **one click** from the list header — without parsing two red banners or hunting the status dropdown.
