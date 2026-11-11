# Investigation: Paddle billing production-readiness audit

## Hand-off Brief

1. **What happened.** Production-readiness audit of Cohestra × Paddle at `c82f44ee`. Code implements checkout, webhooks, and entitlements; Paddle Step 02 remains a dashboard/onboarding gap (no `PricePreview` on `/pricing`). Webhook handler failures return HTTP 200.
2. **Where the case stands.** Concluded. Full report: `_bmad-output/implementation-artifacts/paddle-billing-production-readiness-report-2026-10-08.md`. Recommendation **NO-GO** for live billing.
3. **What's needed next.** Execute existing Story 19.4 after 19.1/19.2; fix webhook non-2xx as a 19.4 slice. Do not create a duplicate Paddle epic.

## Case Info

| Field            | Value                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| Ticket           | N/A (audit request)                                                        |
| Date opened      | 2026-10-08                                                                 |
| Status           | Concluded                                                                  |
| System           | Cursor Cloud VM, Linux 6.12, .NET 9, Node 22, PostgreSQL 16, Redis         |
| Evidence sources | Source code, tests, sprint-status, epics, deploy docs, git, runtime tests  |
| Reviewed SHA     | `c82f44eed583766d12330b41901d15c369727949`                                 |
| Branch           | `cursor/paddle-billing-readiness-audit-8d24`                               |

## Problem Statement

Paddle sandbox onboarding currently shows 75% completion (catalog, fulfillment, and integration test marked complete; pricing page and checkout still in progress). Determine Cohestra's actual billing capabilities, why Step 02 remains incomplete, and whether Cohestra is ready for a controlled production release. Historical story completion is not proof the current implementation works.

## Evidence Inventory

| Source   | Status                          | Notes     |
| -------- | ------------------------------- | --------- |
| Git HEAD | Available | `c82f44ee` on `origin/main` after fetch |
| Sprint tracker | Available | Epic 29/38 done; 19.4 ready-for-dev |
| Epic 29 spec | Available | `_bmad-output/planning-artifacts/epic-29-paddle-billing.md` |
| Epic 38 close | Available | Product-experience close; 38.1 billing-sync done |
| Billing source | Available | `src/Infrastructure/Billing/*`, web billing UI |
| Unit tests | Available | Infrastructure.Tests/Billing + web vitest billing tests |
| Integration tests | Available | `src/Api.IntegrationTests/BillingIntegrationTests.cs` |
| E2E tests | Available | `web/e2e/billing-sync-38-1.spec.ts`, `settings-billing-43-3.spec.ts` |
| Sandbox credentials | Partial | Need classify-paddle-env without printing secrets |
| Live Paddle dashboard | Missing | No dashboard access in this VM |
| Production webhook dest | Missing | Must not create or change production destinations |

## Investigation Backlog

| # | Path to Explore | Priority              | Status                                | Notes     |
| - | --------------- | --------------------- | ------------------------------------- | --------- |
| 1 | Architecture of checkout, webhooks, entitlements | High | Done | Phase 1 |
| 2 | 25-point checklist evidence | High | Done | Phase 2 |
| 3 | Automated tests | High | Done | Phase 3 |
| 4 | Sandbox API verification | High | Done | BLOCKED — no credentials |
| 5 | Environment isolation / secrets | High | Done | Phase 5 |
| 6 | BMAD specialist reviews | Medium | Done | Phase 6; no UI-only release decisions |
| 7 | Readiness report | High | Done | Phase 7 |

## Timeline of Events

| Time        | Event               | Source                | Confidence            |
| ----------- | ------------------- | --------------------- | --------------------- |
| 2026-08-22 | Epic 29 Paddle migration planned | epic-29-paddle-billing.md | Confirmed |
| 2026-08-23 | Epic 29 stories 29.1–29.7 marked done in tracker | sprint-status.yaml | Confirmed |
| 2026-09-06 | Paddle sandbox local/UAT docs exist | docs/deploy, epic-19-paddle-sandbox-readiness | Confirmed |
| 2026-09-30 | Epic 38 closed including 38.1 billing-sync | epic-38-close-2026-09-30.md | Confirmed |
| 2026-10-08 | Audit starts at `c82f44ee` | git | Confirmed |

## Confirmed Findings

### Finding 1: Reviewed commit is latest origin/main

**Evidence:** `git fetch origin main`; SHA `c82f44eed583766d12330b41901d15c369727949`

**Detail:** Local snapshot was 7 commits behind; audit branch created from updated main.

### Finding 2: Tracker vs remaining UAT story

**Evidence:** `_bmad-output/implementation-artifacts/sprint-status.yaml` Epic 29 done; `19-4-paddle-billing-uat-on-droplet: ready-for-dev`

**Detail:** Code-complete tracker status does not equal droplet UAT or production cutover.

## Deduced Conclusions

(to be filled)

## Hypothesized Paths

### Hypothesis 1: Paddle Step 02 is a dashboard onboarding checkbox, not a missing Cohestra capability

**Status:** Open

**Theory:** Cohestra already has a pricing page and Paddle.js checkout; Paddle's remaining 25% is a provider-side onboarding task (default payment link, overlay checkout test, or dashboard confirmation).

**Would confirm:** Official Paddle onboarding docs plus evidence Cohestra checkout initializes.

**Would refute:** Missing checkout initialization, missing default payment link wiring, or missing price mapping in code.

## Missing Evidence

| Gap              | Impact                               | How to Obtain   |
| ---------------- | ------------------------------------ | --------------- |
| Live Paddle dashboard | Account approval, default payment link, onboarding % | Manual owner login |
| Production webhook destination | E3 | Manual inspect; do not create |
| Sandbox API credentials in this VM | Phase 4 live catalog/checkout | classify-paddle-env.sh |

## Source Code Trace

| Element       | Detail                                      |
| ------------- | ------------------------------------------- |
| Error origin  | Audit, not a defect ticket                  |
| Trigger       | Production-readiness request                |
| Condition     | Paddle sandbox 75% onboarding               |
| Related files | `src/Infrastructure/Billing/*`, web billing |

## Conclusion

**Confidence:** High for no-go on live billing. Medium for Step 02 (dashboard checkbox cannot be observed from this VM).

**Confirmed:** Integration exists and unit/integration/e2e (non-Paddle) tests pass at `c82f44ee`. Webhook failures return 200. Refunds absent. Story 19.4 not executed. No sandbox credentials in this environment.

**Hypothesized (Open):** Paddle onboarding Step 02 is incomplete because the public pricing page does not use `PricePreview` / items-based `Checkout.open`, and/or default payment link is unset in the operator dashboard.

Fix direction: existing Epic 19 Story 19.4 + webhook status-code fix. No new epic.

## Recommended Next Steps

### Diagnostic

Run unit, integration, and billing-focused frontend tests; classify env without printing secrets; inspect checkout/webhook/entitlement code.

## Side Findings

- Production cutover is explicitly gated: `docs/deploy/paddle-production-cutover.md` says do not execute without owner approval after Story 19.4.
