---
id: 43.5
key: 43-5-responsive-accessibility-visual-consistency-closure
title: Responsive, accessibility, visual, and consistency closure
status: done
epic: 43
created: 2026-10-08
baseline_commit: 0a160132d076d7df752179fec1dd020a784e22ca
accepted_commit: ee4d780dd5d31056d58b28aabc7fb9949d1191dd
implementation_merge: e18f5d937064cdc7d9390eae940efc80ed42c3d5
---

# Story 43.5: Responsive, accessibility, visual, and consistency closure

Status: done

DONE requires the Mandatory Code Review Loop on the final HEAD.

DONE requires the Mandatory Code Review Loop on the final HEAD.

## Story

As a first-time visitor and as a workspace admin,
I want Cohestra's leftover P1/P2 product-experience gaps closed without a redesign,
so that cookie consent does not cover Start free, bootstrap copy matches Team, Suspended is not called OnHold, and accessibility tests still see disabled controls.

## Already satisfied (OUT OF SCOPE)

- 43.1 Settings nested routes; 43.2 Team; 43.3 Billing phrases; 43.4 Platform
- `/clients` semantic table (40.3)
- Calendar FAB `aria-label="Activity calendar"`
- Dashboard `pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]`
- Core ProductEmptyState / ProductErrorState
- Platform 44px menu / skip / Archive AlertDialog
- No optional analytics tracker in the product
- Cinema `#crm` cookie hide (preserve)

## Remaining scope

1. D20 cookie: in-flow non-modal banner; Accept / Reject non-essential / Preferences; storage `accepted`|`essential`; no dark pattern; no tracker; preserve `#crm`.
2. Register + operator-manual team copy.
3. Public Suspended H1 uses paused, not on hold.
4. Shared Axe filter: disabled stay in scan; contrast-only exemption; migrate current `.exclude("[disabled]")` callers.
5. Remove community leads `role="row"`.
6. Marketing atelier + nav focus-visible.
7. Tests + visual matrix update for changed surfaces.

## Readiness

PASS. Delta classified, party resolved one direction, UX/spec/architecture recorded, protected contracts listed, ATDD named, non-goals explicit.

## ATDD / NFR (Murat)

- Cookie first visit, CTA not covered, Accept, Reject, Preferences, persistence, 390, 1440, `#crm` hide
- Register team-model copy
- Suspended vs OnHold public H1
- Community no `role="row"`
- Axe helper: unnamed disabled fails; invalid ARIA fails; disabled contrast filtered; enabled contrast fails
- Marketing focus-visible present in source
- No 44px threshold weaken
- Epic 35–37 untouched

## Close

Story 43.5 DONE on accepted HEAD `ee4d780d` (PR #401 merge `e18f5d93`). Epic 43 cross-story close follows this tracker. Do not start a new epic.

## Exact stop

Story 43.5 DONE. Epic 43 closes with this tracker. STOP. Do not start Epic 19, Epic 33 backlog, or a new Product Experience epic.

## Tasks

- [x] Cookie lib + UI + shell
- [x] Copy (register, manual, Suspended)
- [x] Axe helper + migrate e2e
- [x] Community row + marketing focus
- [x] Vitest + Playwright 43.5
- [x] Overlays 38.6 cookie exception update
- [x] Visual QA matrix 43.5 section
- [x] Build / test / review / checkpoint / trace
