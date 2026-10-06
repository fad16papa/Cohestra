# Code review — Story 43.1 Settings nested routes

HEAD reviewed: `04f94d11` on `cursor/story-43-1-settings-nested-routes-8d20`  
Date: 2026-10-06  
Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor

## Verdict

**PASS** for merge from this HEAD, pending CI green. No unresolved BLOCKER/MAJOR in the Settings routing change.

## Blind Hunter

- Pathname is canonical. `activeId` is gone as IA. Rails/chips are `Link`s with `aria-current="page"`.
- Index `/settings` is outside `(workspace)` so it does not render mega-page chrome before replace.
- Unmatched `[...unmatched]` stays outside the workspace group → 39.5 not-found, not Profile-with-rails.
- Team/Billing bodies preserved; inner duplicate `PageHeader` removed so layout owns the single h1.
- Server auth, Paddle, UpgradePanel, appearance persistence, domain waitlist untouched.

## Edge Case Hunter

- Legacy `section`/`activeId` aliases cover current ids plus `account`/`profile`/`plan-limits`. Unknown alias on `/settings` falls through to the role default after strip.
- Billing `session_id` / `billing=incomplete` is not treated as section IA (unit test).
- Member `/settings/team` keeps “tenant admins only” + replace to `/settings/profile` (e2e). Billing stay-and-deny (e2e). `/settings/plan` replace to profile (e2e).
- Domain not visible → `RouteBoundaryState` not-found without Settings rails.
- History Profile → Team → Billing → Back is Team then Profile (e2e).
- 1024 left rail visible; 390 chips ≥44px (e2e).

## Acceptance Auditor vs SPEC CAP-1–CAP-10

| CAP | Evidence |
| --- | -------- |
| CAP-1 nested paths | `next build` route table; pages under `settings/(workspace)` |
| CAP-2 `/settings` default | e2e Admin → plan, Member → profile |
| CAP-3 legacy replace | e2e `?section=team|account|billing` and `activeId=appearance` |
| CAP-4 Link nav | left rail + mobile chips |
| CAP-5 entitlements | 39.3 suite passed; Basic Team UpgradePanel e2e |
| CAP-6 member deny | 43.1 member e2e |
| CAP-7 one h1/main | 38.5 landmarks passed; 43.1 asserts |
| CAP-8 responsive | 1440/1024/390 e2e |
| CAP-9 history + Epic 37 | history e2e; no extra Settings motion |
| CAP-10 footer `/settings` | 39.1 e2e; user menu still profile |

## Findings

### MINOR

1. `web/lib/settings-routes.ts` imports `settings-sections.ts` (UI module) for labels. Acceptable brownfield; could invert later.
2. Domain-not-found and Member `/settings/domain` are specified but only covered by unit/meta, not a dedicated Playwright case.
3. Compatibility redirect focus restoration is not instrumented (no report of loss).

### NIT

1. `getDefaultSettingsSection` remains in `settings-sections.ts` after `activeId` removal.
2. `settings-workspace-nav.tsx` remains unused (pre-existing).

### Out of scope / not a 43.1 regression

`page-header-39-4` failed on **client-profile 768 clipped** (WhatsApp/lead-status header actions). Settings heading map in that file (h1 Your account) ran before that assertion. Do not change client-profile layout in 43.1.

## Tests run on this HEAD

- Web Vitest: 671 passed
- `next build`: green; nested `/settings/*` routes present
- Playwright 43.1: 3 passed
- Playwright 39.1, 39.3, 38.5: passed
- Playwright 39.4: failed client-profile 768 (unrelated)
- `dotnet test` Category!=Integration: passed (exit 0)

## Repeat rule

Any behavior-changing fix requires review of the new HEAD.
