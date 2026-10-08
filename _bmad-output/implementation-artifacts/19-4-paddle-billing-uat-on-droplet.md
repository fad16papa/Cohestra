---
epic: 19
story: 4
status: ready-for-dev
---

# Story 19.4: Paddle billing UAT on droplet

Status: ready-for-dev — **blocked on 19.1 live URL + 19.2 HTTPS**. Uses existing **sandbox** credentials only.

Code-side webhook retry, refund ingest, and credential isolation landed 2026-10-08 on the Paddle billing remediation branch. **Do not mark this story done** until droplet sandbox UAT + Mandatory Code Review Loop + product acceptance complete.

## Story

As a **platform operator**,
I want **Paddle sandbox billing verified on the UAT droplet**,
So that **checkout, webhooks, and plan gates work on a live URL before public launch**.

## Owner decision (2026-09-06)

- UAT payment environment: **Paddle sandbox**  
- Reuse existing local sandbox API key, client token, and price IDs  
- Do **not** require live Paddle credentials  
- Do **not** perform a live payment cutover  
- Do **not** create duplicate sandbox catalog unless the existing IDs are invalid  

Canonical recon: `epic-19-paddle-sandbox-readiness-2026-09-06.md`

## DONE requires the Mandatory Code Review Loop

IMPLEMENT → BUILD → TEST → `bmad-code-review` (repeat on new HEAD) → PADDLE SANDBOX ACCEPTANCE → CLOSE.

Any implementation fix after a failed acceptance re-enters the loop on the new HEAD.

## Acceptance — sandbox lifecycle

On UAT HTTPS (test payment methods only, no real charge):

UAT Cohestra → choose plan → Paddle sandbox checkout → sandbox transaction → webhook → signature verify → subscription state → entitlement/plan → UI shows the correct plan.

Minimum cases:

1. Successful checkout  
2. Successful webhook signature verification  
3. Invalid webhook signature rejected  
4. Duplicate webhook delivery is idempotent  
5. Subscription created  
6. Plan/entitlement mapped from configured `pri_…`  
7. Subscription update where supported  
8. Cancellation where supported  
9. Replay/duplicate does not corrupt state  
10. Failure is observable in logs  
11. No secret appears in logs  

Webhook URL: `https://<uat-host>/api/v1/system/paddle/webhook`

## Repo already ready

- Signature + duplicate unit tests (`PaddleSignatureTests`, `PaddleWebhookProcessorTests`)  
- Retryable webhook failures return **503** (Paddle retries); invalid payloads **400**; duplicates **200**  
- `adjustment.created` / `adjustment.updated` ingested: approved chargeback → PastDue; approved refund → log only pending owner policy  
- `PaddleCredentialGuard` + Production boot + `deploy/preflight-launch.sh` reject live keys unless `COHESTRA_ALLOW_LIVE_PADDLE=1` (cutover doc only)  
- UAT compose forwards `Paddle__*`  
- Preflight fails on leftover Stripe keys  
- Classify script: `deploy/classify-paddle-env.sh`  
- Policy escalation: `paddle-refund-dispute-policy-escalation-2026-10-08.md`

## Remaining sandbox UAT blockers (not code)

1. Story 19.1 live UAT URL  
2. Story 19.2 HTTPS on that URL  
3. Owner sandbox API key / client token / webhook secret / `pri_…` on droplet `.env` (never commit)  
4. Paddle sandbox notification destination: `https://<uat-host>/api/v1/system/paddle/webhook` including **adjustment.created** and **adjustment.updated**  
5. Owner decisions on refund entitlement revoke / partial refunds / chargeback reverse (escalation doc)  
6. No Cloud Agent access to the UAT droplet or Paddle dashboard in this environment  

## Do NOT implement in 19.4

- Live Paddle keys, live catalog, live notification destination  
- `COHESTRA_ALLOW_LIVE_PADDLE=1` on UAT  
- Cinema, Epic 25, Epic 34  
- Story 19.1 stack smoke (separate)  
- Invented refund auto-revoke without owner policy  
