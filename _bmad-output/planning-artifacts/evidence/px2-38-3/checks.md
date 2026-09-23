# Story 38.3 live isolation checks

Durable path: `_bmad-output/planning-artifacts/evidence/px2-38-3/`

Date: 2026-09-23

HEAD: `cf8b4d3893e880f87b9f81fe22cfc6006b0b245b` on `cursor/story-38-3-e2e-isolation-0fcb`.

## Environment

`E2E_LIVE_STACK=1` `E2E_API_BASE_URL=http://localhost:8080` `PUBLIC_BASE_URL=http://localhost:3000`

Clean DBs: `cohestra_e2e_a` then independently created `cohestra_e2e_b`. Local Docker binary absent; GitHub `bash deploy/ci-docker-smoke.sh` on this HEAD is the exact Docker command.

## Results (HEAD `cf8b4d38`)

| Gate | Result |
| --- | --- |
| Fixture unit tests (`owned-fixture-data.test.ts`) | 6 passed |
| Seeder unit tests | 8 passed |
| Formerly failing specs alone | Basic lock + Pro checkpoint + success-copy + isolation: 6 passed |
| Affected group forward | 19 passed / 0 skipped |
| Affected group reversed | 19 passed / 0 skipped |
| Affected group `--repeat-each=2 --workers=3` | 38 passed / 0 skipped |
| Supported parallel (`isolation` + `36-4`, `--workers=3`) | 15 passed (one stacked-suite rate-limit retry after 75s; no timeout change) |
| Full `E2E_LIVE_STACK=1` suite on `e2e_a` | **74 passed / 0 skipped / 0 failed** (26.8s, 3 workers) |
| Docker-smoke Playwright subset on `e2e_b` | Epic 35 30 passed; 36.4/36.5/36.6 24 passed including Basic lock |
| GitHub CI `35855762518` on this HEAD | 6/6 success including Docker stack smoke (“CI Docker smoke passed.”) |
| Targeted eslint on changed files | 0 errors / 0 warnings |
| `tsc --noEmit` | pass |

## Playwright / Vitest discovery

`testIgnore: ["**/*.test.ts"]` matches only `web/e2e/helpers/owned-fixture-data.test.ts` (before and after). Playwright lists **74 tests in 12 `*.spec.ts` files**. No legitimate Playwright spec is ignored.

Vitest `include: ["lib/**/*.test.ts", "e2e/helpers/**/*.test.ts"]` runs `owned-fixture-data.test.ts` (6 tests) plus existing `lib/**` units. No `*.spec.ts` appears in `vitest list`.

## Before / after skipped and failed

- Before (Phase 0 / live contamination): Two-column Pro checkpoint failed or saw Basic lock; 5 responsive cases skipped when Join missing; success-copy failed or inherited Conversational marina.
- After: 0 skipped in the live suite; 0 failed.

## Canonical demo / plan — field-level before/after

Captured from independently created DBs `cohestra_e2e_a` (full live suite) and `cohestra_e2e_b` (Docker-smoke Playwright subset). JSON snapshots compared equal (`python3` identity).

| Field | Before | After (A full suite) | After (B smoke subset) |
| --- | --- | --- | --- |
| `default.Plan` | Pro | Pro | Pro |
| `default.Status` | Active | Active | Active |
| `default.BillingStatus` | Trialing | Trialing | Trialing |
| `px2-basic.Plan` | Basic | Basic | Basic |
| `px2-basic.Status` | Active | Active | Active |
| `px2-basic.BillingStatus` | Free | Free | Free |
| Marina `status` | Published | Published | Published |
| Marina `name` | Marina Pickleball — Member Social | unchanged | unchanged |
| Marina `category` | Social | unchanged | unchanged |
| Marina `communityLabel` | Marina Pickleball Club | unchanged | unchanged |
| Marina `maxRegistrants` | null | null | null |
| Marina `showOnHomepage` | true | true | true |
| Marina `registration_theme` | null | null | null |
| Marina `formSchema.version` | 1 | 1 | 1 |
| Marina `formSchema.fields` | full_name, phone, email, consent | unchanged | unchanged |
| Yoga `status` | Published | Published | Published |
| Yoga `name` | Harbor Wellness — Morning Yoga | unchanged | unchanged |
| Yoga `category` | Wellness | unchanged | unchanged |
| Yoga `communityLabel` | Harbor Wellness Circle | unchanged | unchanged |
| Yoga `maxRegistrants` | 15 | 15 | 15 |
| Yoga `showOnHomepage` | false | false | false |
| Yoga `registration_theme` | null | null | null |
| Yoga `formSchema` | same minimal v1 | unchanged | unchanged |
| Runners `status` | Draft | Draft | Draft |
| Runners `name` | Riverside Runners — Skills Clinic (Draft) | unchanged | unchanged |
| Runners `category` | Sports | unchanged | unchanged |
| Runners `communityLabel` | Riverside Runners | unchanged | unchanged |
| Runners `maxRegistrants` | null | null | null |
| Runners `showOnHomepage` | false | false | false |
| Runners `registration_theme` | null | null | null |
| Runners `formSchema` | same minimal v1 | unchanged | unchanged |

No `px2-onhold` / `px2-suspended` rows. Owned fixtures are `e2e-38-3-*-wN` only (reset-in-place; bounded ownerKey × worker 0–99).

## Docker smoke Basic fixture (CI follow-up)

CI `Docker stack smoke` on `e6cc9650` failed at `form-studio-columns-36-4.spec.ts` Basic lock: `loginOwnedTenant(PX2_BASIC_TENANT)` → 401. Compose smoke seeds Operator + DemoData on `default` only; `px2-basic` exists on the native snapshot, not in a fresh Docker DB.

`POST /api/v1/platform/tenants` creates the tenant row only (no Identity user). Public signup needs OTP. The fixture is now provisioned by `E2eEntitlementFixtureSeeder` when `DemoDataSeed:Enabled=true`. Production rejects that flag. Operator backfill skips `px2-basic-admin@cohestra.local` so the fixture admin is not attached to `default`. Create-if-absent only: existing passwords are not reset; Suspended/Archived fixture tenants are not force-healed.

## Isolation notes

- No SQL `UPDATE tenants.Plan` remains.
- No spec writes `demo-marina-social-meetup`, `demo-runners-draft-clinic`, or `demo-wellness-morning-yoga`.
- Conversational is applied only to owned Epic 35 / columns-exp activities.
- Responsive no longer skips when Join is missing.
