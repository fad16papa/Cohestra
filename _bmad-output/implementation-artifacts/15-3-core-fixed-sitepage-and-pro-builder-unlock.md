---
baseline_commit: 60afb93
---

# Story 15.3: Core fixed SitePage and Pro builder unlock

Status: done

## Story

As a Tenant Admin on Core/Pro, I want a plan-appropriate public homepage, so that Core gets a branded fixed page and Pro can compose and publish.

## Acceptance Criteria

- [x] Basic → Core seeds fixed SitePage; public `/` uses fixed template
- [x] Core section composer locked (`BuilderLocked` on admin API)
- [x] Core → Pro unlocks builder; draft/publish tenant-scoped
- [x] Basic blocked from SitePage APIs (upgrade / no row)
- [x] Web builder shows read-only preview + Pro UpgradePanel when locked

## Dev Agent Record

- `SitePageCoreSeedHelper` — seeds on Stripe upgrade webhook
- `SitePageService.EnsureBuilderUnlockedAsync` / `IsBuilderLockedAsync`
- `SitePageAdminResponse.BuilderLocked` + web `builderLocked` wiring
- `website-builder-page.tsx` Core locked UX

## Change Log

- 2026-07-22: DS 15.3 — Core fixed SitePage + Pro builder unlock complete.
