---
baseline_commit: 60afb93
---

# Story 15.1: Subdomain routing (nginx + Next.js Host)

Status: done

## Story

As a visitor or tenant operator, I want `{slug}.cohestra.app` to open the correct tenant, so that public and admin surfaces always resolve to one workspace.

## Acceptance Criteria

- [x] Production `{slug}.cohestra.app` resolves tenant from Host for public + admin
- [x] Apex/www serves marketing/signup only — no tenant SitePage
- [x] Local `{slug}.localhost` and `DEV_TENANT_SLUG` documented in README
- [x] Unknown slug → 404 on public routes
- [x] Next.js middleware forwards Host to API for tenant resolution

## Dev Agent Record

- `web/middleware.ts` — sets `x-forwarded-host`
- `web/lib/server-api-fetch.ts` — forwards Host on SSR API calls
- `PublicDoorController` + `TenantHostResolver.ResolveDoorAsync`
- `web/app/page.tsx` routes via public door API

## Change Log

- 2026-07-22: DS 15.1 — subdomain routing + Host forwarding complete.
