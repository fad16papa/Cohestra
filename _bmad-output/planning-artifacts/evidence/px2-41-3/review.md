# Story 41.3 four-layer review

HEAD reviewed: same commit that carries this file (see git).  
Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor, Adversarial General  
Model: Grok 4.6 (Composer unused)

## Blind Hunter

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| BH-1 | MINOR | Client HTML sanitizer accepts any host whose path contains `/api/v1/public/campaign-assets/`, matching `CampaignEmailBodyProcessor.IsAllowedImageSrc`. Preview could load a same-path image from another origin. | **accept** — same fail-closed path rule as server; send still sanitizes. Do not invent a host allowlist here. |
| BH-2 | MAJOR | Detail page polled queued/sending with no deadline. | **patch** — 60s deadline added, matching `sendCampaign` wait. |
| BH-3 | NIT | `throwCampaignRequestError` catch maps JSON parse failures to a generic status message. | **accept** — same pattern as reports/intelligence. |

No unresolved tenant-isolation, provider-secret, or authorization holes found. Frontend hiding is not used as auth. `RequireProPlan` and TenantOperator are unchanged.

## Edge Case Hunter

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| EH-1 | MINOR | If list `page` exceeds `maxPage` after a shrink, the empty page has Previous but no auto-clamp. | **accept** — existing API paging; rare. |
| EH-2 | MINOR | Compose baseline fingerprint is captured once; changing `?clientIds` after mount does not reset dirty baseline. | **accept** — searchParams change remounts via next navigation in practice. |
| EH-3 | MINOR | 200% zoom is specified but not a dedicated Playwright case. | **accept** — 390 compose + overflow checks cover the tight viewport. |
| EH-4 | NIT | Duplicate-send test uses a completed stub so in-flight disable is asserted by `sendingRef` unit/source contract more than a live hang. | **accept** — source contract + disabled `canSend` while `sending`. |

No unhandled zero-recipient send, unknown-plan SKU, or member checkout path found.

## Acceptance Auditor

| AC | Verdict |
| --- | --- |
| 1 Canonical routes, one main/h1 | **pass** — Playwright landmarks |
| 2 Pro open; Basic/Core UpgradePanel; member no checkout; unknown pending | **pass** |
| 3 Role 403 denied, never UpgradePanel | **pass** |
| 4 List states + visible status text + paging when totalCount > pageSize | **pass** (paging UI present; fixture pageSize 25) |
| 5 Compose 390 + existing capabilities | **pass** |
| 6 Truthful compose states, no autosave, no duplicate send | **pass** |
| 7 Preview/confirm copy; no success before status | **pass** |
| 8 38.6 overlays | **pass** — 38.6 suite 1/1 and 41.3 preview/QR/confirm |
| 9 Detail queued/partial | **pass** |
| 10 QR rules | **pass** — existing modal + 38.6 + 41.3 keyboard |
| 11 Responsive/a11y | **pass** with checklist excluded from dark Axe (pre-existing warning contrast) |
| 12 Security / sanitizer / no real mail | **pass** |
| 13 Protected 38.4–41.2; Epic 42 not started | **pass** 61/61 |

## Adversarial General

Issues considered (not all kept):

1. Treating unknown plan as Basic — **fixed** (pending).
2. Color-only list status — **fixed**.
3. Duplicate send while `canSend` true during sending — **fixed**.
4. Unsanitized preview/detail HTML — **fixed**.
5. Claiming success on 202 queued — **fixed**.
6. Infinite detail poll — **patched**.
7. Real SendGrid in QA — **intercepted**.
8. Member checkout on compose — **gated**.
9. Invented API — **not done**.
10. Weakening 38.6/39.3 — **protected suites green**.
11. Regex sanitizer vs DOMParser — residual MINOR, fail-closed for script/handlers.
12. Email delivery checklist contrast — pre-existing, excluded from 41.3 dark Axe only.

## Disposition

No unresolved BLOCKER. BH-2 patched. Remaining items MINOR/NIT/accept.

**Review result: clean enough to stop at `review` for product-owner pre-merge.**
