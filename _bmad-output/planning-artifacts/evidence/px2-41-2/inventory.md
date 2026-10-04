# Story 41.2 current API / domain inventory

Baseline: `bb420f89`

## Backend

- Controller: `src/Api/Controllers/V1/IntelligenceController.cs`
  - `GET /api/v1/admin/intelligence/brief`
  - `[Authorize(Policy = TenantOperator)]`
- Contract: `IntelligenceBriefResponse`
  - `GeneratedAt`, `TimeZoneId`, `Mode`, `Insights[]`, `InsufficientData`
- Facts: `IntelligenceBriefService` (tenant-scoped EF queries)
- Composer: `IntelligenceBriefComposer`
  - Synthesis only when `Intelligence:SynthesisEnabled` **and** non-empty API key **and** insights exist
  - Provider exception → deterministic facts
  - Guard rejects invented numbers / mismatched ids
- Options: `Intelligence:SynthesisEnabled` default **false**
- Synthesizers: `DisabledIntelligenceSynthesizer`, `OpenAiCompatibleIntelligenceSynthesizer`

## Deterministic insight kinds

| id / kind | priority | typical action href |
| --- | --- | --- |
| `follow-up-due` / `follow_up_due` | 1 | `/clients?followUpDue=true` |
| `new-without-outreach` / `new_without_outreach` | 2 | `/clients?leadStatus=new` |
| `capacity-{id}` / `capacity_pressure` | 3 | `/activities/{id}` |
| `merge-suspects` / `merge_suspects` | 4 | `/clients?mergeSuspect=true` |
| `registration-wow` / `registration_wow` | 5 | `/reports` (compat → `/analytics`) |

Insufficient when no clients+published activities, or when no rule fires.

## Frontend

- Parser / fetch: `web/lib/intelligence-api.ts`
- Dashboard: `web/components/dashboard/dashboard-intelligence-brief.tsx`
- Room: `web/app/(admin)/ai/page.tsx` stub
- Redirects: `web/app/(admin)/intelligence/page.tsx`, `web/app/(admin)/needs-attention/page.tsx`
- Canonical constants: `AI_PATH`, `AI_COMPAT_PATHS`, `destinationWithSearch`

## Tests already present

- `web/lib/intelligence-api.test.ts`
- `IntelligenceBriefServiceTests`, `IntelligenceBriefComposerTests`, `IntelligenceSynthesisGuardTests`
- `IntelligenceBriefIntegrationTests`
- Tenant isolation covers the brief
- Playwright 39.1 already asserts `/intelligence` and `/needs-attention` land on `/ai` with `h1` Cohestra AI
- Playwright 40.1 asserts Dashboard `Needs attention`
