# Phase 0.1 baseline checks

All commands run 2026-09-22 against this branch. **No application source was changed to make them pass.**

| Command | Result | Predates this PR? |
|---------|--------|-------------------|
| `cd web && npx tsc --noEmit` | **0 errors**, exit 0 | n/a (clean) |
| `cd web && npm run build` | **success**, Next.js 16.3.0 production build | n/a |
| `cd web && npm test` (vitest) | **370 / 370** passed, 66 files | n/a |
| `dotnet test Cohestra.sln --filter "Category!=Integration"` | **912 / 912** passed (`Infrastructure.Tests`); integration project matched 0 tests under that filter | n/a |
| `cd web && PUBLIC_BASE_URL=http://localhost:3000 npx playwright test e2e/smoke.spec.ts` | **6 / 6** passed | n/a |
| `cd web && PUBLIC_BASE_URL=http://localhost:3000 E2E_API_BASE_URL=http://localhost:8080 E2E_LIVE_STACK=1 npx playwright test` | **61 passed, 5 skipped, 2 failed**, exit 1 | **Yes — failures are in existing specs; this PR did not edit `web/` or `src/`** |

## Live-stack e2e failures (not fixed)

1. `e2e/form-studio-columns-36-4.spec.ts` — timeout 180s clicking `Two-column row`. Button is **disabled** with `title="Two-column rows require Core or Pro."` on the seeded Pro tenant. Category: existing live-stack entitlement/locator flake. Predates this PR.
2. `e2e/registration-success-copy.spec.ts` — timeout 60s waiting for `/join activity/i` after Epic 35 live tests mutate the marina theme toward Conversational (`Continue` instead of Join). Category: existing suite-order mutation. Predates this PR. Manual audit already captured success `REG20260922000101` before the suite ran.

## Live-stack skips (5)

`e2e/registration-responsive.spec.ts` five viewport cases skipped: `Registration form not open` — same leftover Conversational theme (no Join button). Embed case still passed.

## Not run / not claimed

- Integration tests (`Category=Integration`) — require a fresh `cohestra_test` DB; out of Phase 0.1 visual-audit scope. Known pre-existing flake `ClientDedupIntegrationTests.SubmitPublicRegistration_PhoneMatch_ReusesExistingClient` documented in AGENTS.md.
- `cd web && npm run lint` — pre-existing ESLint errors (AGENTS.md); not re-run as a gate.
- VoiceOver / NVDA — not available.
- Production RUM / Lighthouse CI — not available. Performance numbers in `phase01-report.json` are **local Playwright Navigation Timing only**.
