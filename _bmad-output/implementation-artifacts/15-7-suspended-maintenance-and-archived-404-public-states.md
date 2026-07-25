---
baseline_commit: 60afb93
---

# Story 15.7: Suspended maintenance and Archived 404 public states

Status: done

## Story

As a visitor or tenant Admin, I want public and login behavior to match Suspended vs Archived, so that billing states are clear without leaking tenant content.

## Acceptance Criteria

- [x] Suspended tenant public door → maintenance page
- [x] Archived tenant public door → 404
- [x] `ResolveDoorAsync` includes suspended/archived tenants (unlike normal resolver)
- [x] `/api/v1/public/door` bypasses strict tenant resolution middleware
- [x] Web renders `TenantMaintenancePage` for suspended

## Dev Agent Record

- `TenantDoorResolution` + `TenantHostResolver.ResolveDoorAsync`
- `PublicDoorService` + `PublicDoorController`
- `web/components/public/tenant-maintenance-page.tsx`
- `TenantResolutionMiddleware` skips door path

## Change Log

- 2026-07-22: DS 15.7 — suspended/archived public states complete.
