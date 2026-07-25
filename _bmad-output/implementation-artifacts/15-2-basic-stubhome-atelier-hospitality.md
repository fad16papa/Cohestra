---
baseline_commit: 60afb93
---

# Story 15.2: Basic StubHome (atelier hospitality)

Status: done

## Story

As a visitor, I want a simple public home with the org name and published activities, so that I can register without a full website — and it still feels high-end.

## Acceptance Criteria

- [x] Basic tenant `/` renders StubHome with org name + published activity links to `/register/{slug}`
- [x] No SitePage entity required for Basic public home
- [x] Empty state when no published activities
- [x] Atelier hospitality craft (no marketing card-wall)
- [x] Basic admin Website nav shows UpgradePanel (not builder)

## Dev Agent Record

- `web/components/public/stub-home.tsx`
- `PublicDoorService` returns stub activities for Basic/active tenants
- Website builder already gates Basic via `isBasicPlan` UpgradePanel

## Change Log

- 2026-07-22: DS 15.2 — Basic StubHome complete.
