---
baseline_commit: 60afb93
---

# Story 15.4: Tenant-scoped activity engine and public registration

Status: done

## Story

As a participant (Elena), I want to register on a tenant's activity via QR/link, so that I get a registration number and the operator's client list — only in that tenant.

## Acceptance Criteria

- [x] Host-resolved tenant scopes `/register/{slug}` activity lookup
- [x] Registration creates Client/Registration under resolved tenant; dedup within tenant
- [x] Platform 0 activity engine preserved under tenancy
- [x] 429 burst limit shows friendly UX message
- [x] SSR public fetches forward Host for tenant resolution

## Dev Agent Record

- `public-registration-server-api.ts` — server-only fetch with Host forwarding
- `public-registration-api.ts` — client-safe; friendly 429 copy
- Existing tenant middleware + `UNIQUE (TenantId, slug)` enforce scope

## Change Log

- 2026-07-22: DS 15.4 — tenant-scoped registration + 429 UX complete.
