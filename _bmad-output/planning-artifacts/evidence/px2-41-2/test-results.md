# Story 41.2 test results

HEAD under test: Story 41.2 implementation including allowlisted hrefs, neutralized unsafe actions, and honest generated-time copy.

Env: `E2E_LIVE_STACK=1 PUBLIC_BASE_URL=http://localhost:3000 E2E_API_BASE_URL=http://localhost:8080`

## Local gates

| Gate | Result |
| --- | --- |
| Affected Vitest (`intelligence-api`, nav, stub, continuity) | 34/34 pass |
| Full Vitest | 94 files, 617 pass |
| `npx tsc --noEmit` | pass |
| Targeted ESLint on 41.2 files | pass (0 issues) |
| Intelligence service / composer / guard units | 18/18 pass |
| Report/export and intelligence API integration | API/schema unchanged; composer/guard covered by units |
| Production `next build` | pass (`/ai` static, `/intelligence` and `/needs-attention` dynamic redirects) |
| Story 41.2 Playwright | 5/5 pass |
| Protected 38.4–41.1 Playwright | 56/56 pass |
| Combined Playwright | 61/61 pass |

## Story 41.2 Playwright (5/5)

1. One `main` + `h1` Cohestra AI; `/intelligence` and `/needs-attention` query-preserving redirects; Dashboard Needs attention links to `/ai`; refresh keeps the room
2. TenantMember opens the room; live mode is deterministic; synthesized fixture is labeled truthfully
3. Insufficient ≠ empty success; 500 ProductErrorState + retry; 403 denied never UpgradePanel; unsafe action/evidence non-clickable; deterministic fallback fixture keeps a safe `/clients` action
4. Populated insights show evidence + one action; Pro vs Basic brief IDs do not overlap
5. 390/430/767/768/1024/1440 no overflow; actions ≥44px; keyboard disclosure; Axe light/dark; forced-colors and reduced-motion screenshots

## Composer

Unused. Product logic, href safety, modes, permissions, tests, and review stayed on Grok 4.6.
