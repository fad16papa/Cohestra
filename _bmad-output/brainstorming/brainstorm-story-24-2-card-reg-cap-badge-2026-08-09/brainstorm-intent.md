# Story 24.2 Intent — Activity card reg-cap progress + Sign-ups paused badge

**Epic:** Activities list — operator at scale  
**Story ID:** 24.2  
**Date:** 2026-08-09  
**Depends on:** Story 24.1 (list-level compound banner + recovery chips) — merged  
**Source:** Brainstorm session (memlog in this folder)

## Problem

Story 24.1 tells operators *tenant-wide* that monthly sign-ups are paused. Scanning a grid of 50+ activity cards, they still cannot tell which **live** activities are affected without inferring from status alone.

Today `ActivityCard` shows only:
- `{registrationCount} registrations` (per-activity total, all-time or cumulative — not plan usage)
- No link to plan monthly cap (`shell.limitDials.registrations`)
- No visual when public sign-ups are blocked at plan level

Operators at 5k/5k need card-level confirmation on **published** rows that sign-ups are paused, plus a compact view of plan reg usage when approaching or at cap.

## Goal

On `/activities`, each **published** activity card surfaces tenant monthly registration cap status when the registrations dial is at warn (≥80%) or blocked — without duplicating the full banner or confusing activity-level `maxRegistrants` with plan-level limits.

## In scope (Story 24.2)

### 1. `ActivityPlanRegCapIndicator` (new component)

Compact inline indicator reusing **LimitMeter** visual tokens (lagoon / gold / destructive).

| Dial state | UI |
|------------|-----|
| Below warn | Hidden on cards (no noise) |
| Warn (≥80%) | Thin progress bar + `Plan regs 4,200/5,000` (locale-formatted) |
| Blocked (100%) | Same meter (full/red) + **Sign-ups paused** badge |

**Label:** `Plan registrations` or `Plan regs` — must not say "registrations" alone (conflicts with per-activity count).

### 2. `Sign-ups paused` badge

- Shown on **published** cards only when `registrations` dial is `blocked`
- Placed in card header badge row next to `ActivityStatusBadge` (stack/wrap on narrow widths)
- Copy: **Sign-ups paused** — matches 24.1 banner language
- Style: destructive/warn pill distinct from status badge (e.g. `border-destructive/40 bg-destructive/10 text-destructive`)

**Not shown** on draft or archived cards — they do not accept public sign-ups.

### 3. Enhanced registration line on card

Replace plain `{n} registrations` with clearer hierarchy:

| Activity state | Registration line |
|--------------|-------------------|
| Published + `maxRegistrants` set | `{count} / {max} activity registrations` |
| Published, no cap | `{count} registrations` |
| Draft / archived | `{count} registrations` (unchanged) |

Activity-level cap is **separate** from plan meter — never merge into one fraction.

### 4. Card footer strip (published + warn/blocked only)

Below the card link (mirror `ActivityScheduleConflictAlert` pattern):

```
Plan registrations  5,000/5,000
[===========] 100%
```

Optional: omit footer strip if badge + header meter is enough — **prefer footer strip only** to avoid header clutter; badge in header, meter in footer.

**Recommended layout:**
- Header: status badge + **Sign-ups paused** (when blocked)
- Footer strip: compact plan reg meter (when warn or blocked)

### 5. Wiring from `activities-list-page.tsx`

- Read `findLimitDial(shell, "registrations")` once on list page
- Pass optional `planRegistrationsDial` prop to `ActivityCard` when `dial.warn || dial.blocked`
- `ActivityCard` decides visibility based on `activity.status === "published"`

No new API calls.

## Out of scope

| Item | Story |
|------|-------|
| Dashboard activity table reg-cap column | Later |
| Card quick actions (copy link, clients filter) | 24.3 |
| Sort by reg count | 24.4 |
| EXPERIENCE.md update | 24.5 |
| Per-card plan meter on draft/archived | Never |
| Replacing sidebar `LimitMeter` | Keep both — sidebar global, card contextual |

## Acceptance criteria

1. **AC-24.2.1 — Paused badge on published at plan cap**  
   Given registrations dial blocked, when viewing published activity cards on `/activities`, each published card shows **Sign-ups paused** badge.

2. **AC-24.2.2 — No badge on non-published**  
   Draft and archived cards never show Sign-ups paused or plan reg meter.

3. **AC-24.2.3 — Plan reg progress at warn**  
   Given registrations dial at warn (≥80%, not blocked), published cards show compact plan reg meter with used/limit; no paused badge.

4. **AC-24.2.4 — Distinct from activity cap**  
   When `maxRegistrants` is set, card shows activity `count/max` on registration line; plan meter remains tenant-wide (same numbers on all published cards).

5. **AC-24.2.5 — Hidden below warn**  
   When registrations dial is below warn threshold, no plan reg UI on cards.

6. **AC-24.2.6 — Accessible**  
   Progress bar has `role="progressbar"` with `aria-valuenow/min/max` and label referencing plan registrations.

## Implementation notes

- **Files:** `activity-card.tsx`, new `activity-plan-reg-cap-indicator.tsx`, `activities-list-page.tsx`, extend `plan-limit-utils.ts` with `getRegistrationsDialForCards(shell)` helper
- **Tests:** unit tests for helper visibility rules; optional component snapshot for blocked vs warn vs hidden
- **Reuse:** color tokens from `limit-meter.tsx`; do not import client hook inside presentational card if avoidable — pass dial snapshot as prop

## Success metric

Operator at 5k/5k scanning published activities can identify every live card with paused sign-ups in one glance, without scrolling back to the list banner.
