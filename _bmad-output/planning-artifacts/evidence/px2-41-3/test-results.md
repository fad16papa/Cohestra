# Story 41.3 test results

Date: 2026-10-04  
Branch: `cursor/story-41-3-campaigns-0fcb`

## Commands and exact results (product-owner review HEAD)

| Suite | Command | Result |
| --- | --- | --- |
| Affected Vitest | `npx vitest run lib/campaign-html.test.ts lib/campaign-room-access.test.ts lib/campaigns-api.test.ts lib/campaigns-41-3-source.test.ts` | **15 passed / 0 failed** |
| Full Vitest | `npx vitest run` | **632 passed / 0 failed** (98 files) |
| Typecheck | `npx tsc --noEmit` | **exit 0** |
| Targeted ESLint | `npx eslint components/campaigns lib/campaign-html.ts lib/campaign-room-access.ts lib/campaigns-api.ts e2e/campaigns-41-3.spec.ts` | Pre-existing `set-state-in-effect` in picker/checklist/compose/additional recipients. No new unused-import failures. |
| Next production build | `npx next build` | **Compiled successfully** |
| .NET campaign/plan units | `dotnet test Cohestra.sln --filter "FullyQualifiedName~Campaign\|ClientSegment\|RequireProPlan\|TenantPlanGate&Category!=Integration"` | **24 passed** (Infrastructure.Tests) |
| API integration | `CampaignIsolation\|CampaignConsent\|TenantIsolation\|RequireProPlan` | **11 passed / 0 failed** including `ProTenantB_CannotReadOrReuse_ProTenantA_CampaignResources` |
| Story 41.3 Playwright | `PUBLIC_BASE_URL=http://localhost:3000 E2E_LIVE_STACK=1 npx playwright test e2e/campaigns-41-3.spec.ts` | **6 passed / 0 failed** |
| Protected 38.4–41.2 | overlays-38-6, entitlement-39-3, route-errors-39-5, continuity-40-5, analytics-41-1, ai-41-2, tokens, a11y, landmarks, 39.1–39.4, follow-up-40-2 | **46 passed / 0 failed** on `:3000` after the compose locator fix |

Real provider calls were intercepted. Isolation send probes used `FakeEmailSender`. No real recipients mailed.

## Same-entitlement isolation proof

Test: `Cohestra.Api.IntegrationTests.CampaignIsolationIntegrationTests.ProTenantB_CannotReadOrReuse_ProTenantA_CampaignResources`

- Pro tenant A + Pro tenant B, each with TenantAdmin JWT and tenant Host
- Tenant B cannot GET/list A’s campaign, GET/PATCH/DELETE A’s template, preview/send A’s clients, send A’s template with B’s own client, QR A’s activity, or GET A’s public asset on B’s host
- Responses do not contain A’s subject, body, recipient name/email, template name, or activity marker
- Tenant A GET still returns the original campaign and template after B’s probes
