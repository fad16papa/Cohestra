# ATDD checklist — Story 44.6 Tenant Diagnostic Timeline

Generated: 2026-10-10
Workflow: bmad-testarch-atdd (Murat / TEA)
Baseline: 7f11f02f49b8bcf40d9dd68831c9e1cd94578968
Model: Cursor Grok 4.6

Red-phase scaffolds are the failing/new tests listed below. Implementation turns them green.

## Mandatory

| ID | Criterion | Red scaffold |
|---|---|---|
| P0-16 | Tenant A timeline contains zero tenant B records (audit/support/outbox/Paddle); reverse | `TenantIsolationApiTests.Platform_tenant_timeline_returns_only_requested_tenant` |
| P1-07 | Snapshot + recovery + lifecycle remain on tenant detail | Playwright + `platform-44-6-source.test.ts` asserts existing sections |
| P1-01 | 1440×900 and 390×844 populated timeline, no page overflow | `web/e2e/platform-ops-44-6.spec.ts` |
| P1-12 | Skip-link + one h1 + timeline heading | same Playwright + source test |

## Safety acceptance

| Criterion | Red scaffold |
|---|---|
| No raw payload/body/secret fields | Integration allow-list + sentinels `*_SECRET_44_6` |
| Unknown tenant 404 | `PlatformTenantTimelineIntegrationTests` |
| Deterministic merge order | `PlatformTenantTimelineComposerTests` equal-timestamp ties |

## Authz

| Actor | Expected |
|---|---|
| PlatformAdmin | 200 |
| TenantAdmin | 403 |
| TenantMember | 403 |
| Anonymous | 401 |

Covered in `TenantAuthzIntegrationTests` + dedicated timeline integration tests.

## Unit (composer / service)

- item mapping per source
- safe summary mapping
- deterministic merge + equal-timestamp tie
- billing snapshot uses `observedAt`, not `UpdatedAt`
- provenance labels
- bounded Take(25)/cap 50
- missing_instrumentation for empty Paddle
- sanitization of LastError / Reason

## Integration

- authz matrix
- unknown 404
- A/B isolation
- each source filtered to requested tenant
- Paddle null tenant excluded
- billing snapshot belongs to requested tenant
- chronological merge
- bounded result
- no DetailsJson / PayloadJson / LastError / support body / webhook secrets

## Frontend

- loading does not flash empty copy
- populated / empty / error
- missing instrumentation chip
- provenance + timestamp + summary
- existing tenant detail controls retained

## Playwright

- tenant detail timeline 1440 and 390
- one main, one h1, skip link
- no overflow
- no secret/raw content
- snapshot + recovery visible
