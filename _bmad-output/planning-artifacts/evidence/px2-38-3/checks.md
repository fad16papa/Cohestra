# Story 38.3 live isolation checks

Durable path: `_bmad-output/planning-artifacts/evidence/px2-38-3/`

Date: 2026-09-23

HEAD: uncommitted at capture; suite run on `cursor/story-38-3-e2e-isolation-0fcb` after 38.2 merge `01a139df`.

## Environment

`E2E_LIVE_STACK=1` `E2E_API_BASE_URL=http://localhost:8080` `PUBLIC_BASE_URL=http://localhost:3000`

## Results

| Gate | Result |
| --- | --- |
| Fixture unit tests (`owned-fixture-data.test.ts`) | 3 passed |
| Formerly failing specs alone | columns Basic + Pro checkpoint + success-copy + isolation: 5 passed |
| Affected group forward (`success-copy`, `columns-36-4`, `responsive`) | 19 passed / 0 skipped |
| Affected group reversed (`responsive`, `columns-36-4`, `success-copy`) | 19 passed / 0 skipped |
| Affected group repeat (`--repeat-each=2 --workers=3`) | 38 passed / 0 skipped |
| Supported parallelism (`--workers=3`) | used on repeat + full suite |
| Full `E2E_LIVE_STACK=1` suite | **74 passed / 0 skipped / 0 failed** (26.8s, 3 workers) |
| Targeted eslint on changed files | 0 errors / 0 warnings |
| `tsc --noEmit` | pass |

## Before / after skipped and failed

- Before (Phase 0 / live contamination): Two-column Pro checkpoint failed or saw Basic lock; 5 responsive cases skipped when Join missing; success-copy failed or inherited Conversational marina.
- After: 0 skipped in the live suite; 0 failed.

## Canonical demo / plan

After the full suite:

- `default` Plan = 2 (Pro)
- `px2-basic` Plan = Basic
- `demo-marina-social-meetup` still Published
- `demo-runners-draft-clinic` still Draft
- `demo-wellness-morning-yoga` still Published

Owned fixtures are `e2e-38-3-*-wN` only (reset-in-place; bounded by ownerKey × worker index).

## Isolation notes

- No SQL `UPDATE tenants.Plan` remains.
- No spec writes `demo-marina-social-meetup`, `demo-runners-draft-clinic`, or `demo-wellness-morning-yoga`.
- Conversational is applied only to owned Epic 35 / columns-exp activities.
- Responsive no longer skips when Join is missing.
