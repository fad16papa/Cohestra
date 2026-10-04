# Story 41.3 implementation readiness

Date: 2026-10-04  
Baseline: `ac5538e1910fc48650b7793214ed57fde40bf09c`  
Verdict: **READY**

The existing campaigns API, consent/segment validation, outbox send, templates, assets, and 38.6 overlays already satisfy the accepted room contract. Do not invent a new API, schema, recipient model, provider, or sending workflow. `bmad-correct-course` is not required.

Stories 41.1 and 41.2 are `done`. Epic 41 stays `in-progress`. Epic 42 is not started.

## Inventory confirmed

| Surface | Current state | Room contract |
| --- | --- | --- |
| `/campaigns` | PageHeader + list; `!isProPlan` lock | Keep routes; pending for unknown plan; ProductErrorState; visible status text |
| `/campaigns/new` | Full compose + 38.6 Preview/QR + AlertDialog send | Keep; 390 usable; dirty beforeunload; no duplicate send |
| `/campaigns/{id}` | Subject h1, counts, recipient badges, raw HTML | Keep; poll queued/sending; sanitize HTML; no generic success |
| `CampaignsController` | TenantOperator + RequireProPlan | Unchanged |
| List/detail/send/preview/assets/QR/test | Existing endpoints | Unchanged |
| Recipients | queued / sent / failed / skipped | Surface all |
| Consent | Server authoritative; compose `consentOnly: true` | Unchanged |
| HTML | Server Ganss.Xss on send; browser unsanitized | Add fail-closed client sanitizer only |
| Entitlements | Nav pending/lock/ask-admin already correct | Room pages must use the same resolver |
| Paddle | UpgradePanel checkout for admins only | Do not change |
| Tests | Consent integration + body processor + 38.6 overlay + 39.3 Basic lock | Keep; add 41.3 Playwright without real sends |

## Gaps this story closes

- List treats unrecognized plan as `!isProPlan` → false lock / invented Basic.
- List error is a raw alert paragraph, not ProductErrorState + retry.
- List delivered/failed are icon/color-only.
- No 403 denied vs `plan_locked` split after unlock.
- Compose/detail skip the entitlement gate.
- `canSend` is true while `sending` (duplicate submit).
- Preview/detail use `dangerouslySetInnerHTML` without a client sanitizer.
- Detail does not poll queued/sending and maps unknown recipient status to Skipped visually.
- Compose 390 action targets are below 44px.
- Segment preview failure has no retry.
- No Story 41.3 Playwright coverage.

## Stop conditions not met

Existing API can satisfy the room. No new backend. Epic 42 not started.

Implementation may start. Do not change sending, consent, plan math, or Paddle. Do not claim production.
