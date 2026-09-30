# Story 39.1 checks

HEAD reviewed: `d0d907ff`  
Baseline: `cde63ba4`

## Build / unit

| Check | Result |
| --- | --- |
| `cd web && npx vitest run lib/admin-nav.test.ts lib/canonical-room-stub.test.ts` | **9 passed** (after review patches) |
| `npx tsc --noEmit` (web) | passed |

## Live Playwright (`E2E_LIVE_STACK=1`, `PUBLIC_BASE_URL=http://localhost:3000`, `E2E_API_BASE_URL=http://localhost:8080`)

| Spec | Result |
| --- | --- |
| `e2e/desktop-shell-39-1.spec.ts` | **1 passed** — rail, `/reports?preset=weekly`, `/intelligence` and `/needs-attention` → `/ai`, Follow-up/AI `aria-current`, Website Studio, skip `#main-content`, footer hrefs, `/settings?section=account` → profile, axe |
| `e2e/landmarks-38-5.spec.ts` | **4 passed** — includes Follow-up and Cohestra AI headings |
| `e2e/overlays-38-6.spec.ts` | **1 passed** on implementation HEAD (palette) |

## Live Playwright (`E2E_LIVE_STACK=1`, `PUBLIC_BASE_URL=http://localhost:3000`, `E2E_API_BASE_URL=http://localhost:8080`)

| Spec | Result |
| --- | --- |
| `e2e/desktop-shell-39-1.spec.ts` | **1 passed** — rail order, `/reports?preset=weekly` → `/analytics?preset=weekly`, `/intelligence` → `/ai`, Follow-up h1, Website Studio crumb, footer hrefs, `/settings` → `/settings/profile`, axe landmarks |
| `e2e/landmarks-38-5.spec.ts` | **4 passed** — Analytics heading, skip, one main/h1, keyboard |
| `e2e/overlays-38-6.spec.ts` | **1 passed** — palette still works after Navigate href/label change |

## Viewports

Screenshots in `viewports/`:

- `rail-1440x900.png` — expanded rail, labels Dashboard → Campaigns including Follow-up, Analytics, Cohestra AI
- `rail-1024x768.png` — expanded (`lg:w-60` at ≥1024)
- `rail-768x1024.png` — compact `w-16` icon rail

## Out of scope confirmed

Mobile tab order unchanged (Home / Activities / Clients / More). Entitlement glyphs not added. PageHeader visual not restyled. No App Router `error.tsx` / `not-found.tsx`.
