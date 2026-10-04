# Story 41.2 implementation readiness

Date: 2026-10-04  
Baseline: `bb420f89446ef78445fbdd4f655b6752cfd7d713`  
Verdict: **READY**

The existing brief API already satisfies the accepted room contract. Do not invent a new intelligence endpoint, schema, KPI, or AI provider. `bmad-correct-course` is not required.

## Inventory confirmed

| Surface | Current state | Room contract |
| --- | --- | --- |
| `web/app/(admin)/ai/page.tsx` | `CanonicalRoomStub` “comes next” | Replace with brief room; keep `h1` Cohestra AI |
| `DashboardIntelligenceBrief` | Dashboard section Needs attention; fetches brief; links to `/ai` | Keep section name and compact summary |
| `web/lib/intelligence-api.ts` | Typed parse + weak `isSafeAdminHref` | Reuse; tighten allowlist; neutralize unsafe actions |
| `GET /api/v1/admin/intelligence/brief` | TenantOperator, tenant-scoped | Unchanged |
| Domain / service / composer | `IntelligenceBriefService` facts → `IntelligenceBriefComposer` optional synthesis | Unchanged |
| Deterministic rules | follow-up due, new without outreach, merge suspects, capacity, registration wow | Unchanged |
| `Intelligence:SynthesisEnabled` | `false` in `appsettings.json`; requires API key | Do not enable |
| Modes | `deterministic`, `synthesized` | Unknown mode fails closed in UI |
| `insufficientData` | Named message, no invented insights | Distinct from empty success |
| Insight fields | id, kind, priority, title, why, whatChanged, evidence, one action | Present all; no new fields |
| Evidence / action hrefs | `/clients?…`, `/activities/{id}`, `/reports` | Allowlist those plus `/follow-up`, `/analytics`, `/dashboard` |
| Generated time / TZ | `generatedAt` + tenant `RegistrationTimeZoneId` | Display with timezone explanation |
| Isolation tests | `TenantIsolationApiTests` + `IntelligenceBriefIntegrationTests` | Keep |
| Synthesis guard/fallback | composer + `IntelligenceSynthesisGuard` tests | Keep |
| `/intelligence`, `/needs-attention` | `destinationWithSearch(AI_PATH)` | Keep |
| Dashboard Needs attention | `h2` + link “Cohestra AI” → `/ai` | Keep |
| Palette / nav | Label Cohestra AI → `/ai` | Keep |
| Error / denied | Dashboard inline error; `/ai` stub empty | Room uses ProductErrorState; 403 denied |

## Gaps this story closes

- `/ai` stub is not the brief.
- `isSafeAdminHref` accepts any same-origin path, including public/platform routes.
- Unsafe recommended-action href currently fails the entire parse.
- `/ai` has no denied / insufficient / malformed / retry presentation.

## Stop conditions not met

Existing brief API can satisfy the room. No new backend. Story 41.3 not started.

Implementation may start. Do not enable synthesis. Do not claim production.
