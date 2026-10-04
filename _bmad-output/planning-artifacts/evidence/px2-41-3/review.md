# Story 41.3 four-layer review

HEAD reviewed: the commit that carries this file (see git).  
Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor, Adversarial General  
Model: Grok 4.6 (Composer unused)

Mandatory Code Review Loop is in force. This is the product-owner pre-merge pass.

## Independently verified patches

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| PO-ISO | MAJOR | No same-entitlement Pro-to-Pro isolation test. Playwright Basic JWT vs a stub id is insufficient because `RequireProPlan` can reject before tenant lookup. | **patch** — `CampaignIsolationIntegrationTests` creates Pro A + Pro B. B cannot list/get A’s campaign, preview/send A’s clients, reuse A’s template/activity/asset, or leak subject/body/recipient markers. A’s campaign and template remain intact after B’s probes. Result: **1/1 passed**, then **11/11** with Campaign/TenantIsolation/RequireProPlan. |
| EC-41-3-01 | MAJOR | Segment change left the previous preview mounted, so confirm/send could use a stale `withEmailCount`. | **patch** — picker clears preview before refetch; send requires `isAuthoritativeReadyCount`. |
| ADV-1 / BH-01 | MAJOR | After `sendCampaign` returned a queued/sending payload, `sending` cleared and a second send was allowed. | **patch** — `canSend` stays false while `isCampaignInFlight(sendResult.status)`. |
| ADV-2 | MAJOR | Missing send `status` defaulted to `"completed"`. | **patch** — 202 without status is `queued`; otherwise `failed`. |
| ADV-3 | MINOR | Test-send had no ref lock. | **patch** — `testingRef`. |
| AC11 inputs | MINOR | Nationality/profession were 36px. | **patch** — `min-h-12`. |

## Blind Hunter (complete diff)

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| BH-01 | MAJOR (not BLOCKER) | Duplicate send after in-flight return | **patch** (see above). Not a BLOCKER: POST+poll was already locked; gap was after 202 still queued. |
| BH-03 | MINOR | Image allowlist is path-based, any host | **accept** — matches `CampaignEmailBodyProcessor.IsAllowedImageSrc`. Protocol-relative `//` now fail-closed. |
| BH-04 | MINOR | Regex sanitizer vs DOMParser | **accept** — defense-in-depth; server Ganss.Xss remains authoritative on send. |
| BH-05–08 | MINOR | Isolation could also assert outbox rows / AllClients / send-test | **accept** — required Pro-to-Pro surfaces are covered; extra probes deferred. |
| BH-09 | NIT | Playwright Basic denial is not Pro-to-Pro | **accept** — isolation proof is the integration test. |
| BH-10–15 | MINOR/NIT | 403 chrome, dirty in-app nav, source-string tests | **accept/defer** — no product, architecture, or security risk on this room. |

## Edge Case Hunter

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| EC-41-3-01 | MAJOR | Stale preview | **patch** |
| EC-41-3-02 | MINOR | NaN/Infinity counts | **patch** — `isAuthoritativeReadyCount` |
| EC-41-3-03 | MAJOR | Second send after queued return | **patch** |

## Acceptance Auditor

AC 1–10, 12–13 **pass**. AC 11 **pass** after nationality/profession 44px patch; 200% zoom remains deferred (390 compose + overflow). PO Pro-to-Pro **pass**.

## Adversarial General

Issues 1–3 and isolation coverage **patched**. Remaining items (host-blind images matching server, 38.6 suite still owns trap/inert, public asset host scoping) MINOR/NIT **accept**. No plan/Paddle/API contract change.

## Disposition

No unresolved BLOCKER or MAJOR on this HEAD.

**Review result: clean enough to merge after exact-head CI.**
