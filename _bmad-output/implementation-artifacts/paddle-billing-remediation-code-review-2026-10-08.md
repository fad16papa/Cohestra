# BMAD code review — Paddle billing remediation

**HEAD reviewed:** post-implementation working tree on `cursor/paddle-billing-remediation-8d24` (Grok 4.6, no Composer / Auto / cross-model subagents).  
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor (Story 19.4 + FR-23 + refund escalation).  
**Spec:** `_bmad-output/implementation-artifacts/19-4-paddle-billing-uat-on-droplet.md` plus audit P0/P1 (webhook ACK, refund policy, credential isolation).

## Severity summary

Unresolved **BLOCKER: 0**. Unresolved **MAJOR: 0** after in-loop patch (`Paddle:AllowLive`). Remaining items are MINOR / NIT / owner decisions.

## Findings

| ID | Sev | Bucket | Source | Title |
|----|-----|--------|--------|-------|
| 1 | MAJOR | patch (fixed) | blind+edge | ASPNETCORE Production could boot live Paddle if preflight was skipped. **Fixed:** `Paddle:AllowLive` required when `Environment=production`. |
| 2 | — | decision_needed | auditor | Merchant refund entitlement revoke / partial refund / chargeback reverse — escalated, not invented. |
| 3 | MINOR | defer | edge | Unresolved tenant → 503 until Paddle exhausts retries. Prefer lost-payment retry over silent 200. |
| 4 | MINOR | defer | edge | Webhook secret has no sandbox/live shape; mix-up of destination secrets is an ops cutover check. |
| 5 | MINOR | defer | edge | `EnsureCoreSitePageAsync` after ledger uses ambient tenant filter (often unresolved on webhook). Unique + try/catch. Pre-existing helper. |
| 6 | NIT | dismiss | blind | 503 body still `{ received: true }`. Paddle keys off HTTP status. |
| 7 | NIT | defer | blind | Unknown-format API keys (no `sdbx` / `live`) are not classified. |

Dismissed: 1. Decision needed: 1 (owner, documented). Patched: 1.

## Acceptance auditor

- Story 19.4 droplet UAT ACs are **not claimed done** (blocked on 19.1/19.2/sandbox destination).
- Code ACs for this remediation: retryable 503, idempotent ledger, chargeback PastDue, refund ingest without auto-revoke, live keys blocked in Dev/UAT — implemented.
- FR-23 is payment_failed delinquency; chargeback→PastDue is the approved analog. Refund auto-revoke would violate “do not invent policy.”

## Tests executed (this agent)

- `dotnet build Cohestra.sln` — succeeded
- `dotnet test Cohestra.sln --filter Category!=Integration` — **963 passed**
- Paddle/validator unit filter — **81 passed**
- `PaddleWebhookIntegrationTests` — **7 passed** (Postgres+Redis, `CI=true`, fresh `cohestra_test`)
- `BillingIntegrationTests` + `TenantIsolationApiTests` — **13 passed**
- Preflight paddle gates (sandbox OK, live+sandbox fail, production without override fail, AllowLive override OK)

Not executed: Paddle sandbox dashboard, UAT droplet HTTPS checkout, live catalog.

## Product / UX

No UI change. Billing UI still does not show refund/dispute state (escalation item 5).

## Close condition

This review HEAD is acceptable to keep as a **draft PR**. Do **not** mark Story 19.4 done. Do **not** merge without owner approval. Re-review if further commits land.
