---
epic: 19
story: 4
status: ready-for-dev
---

# Story 19.4: Paddle billing UAT on droplet

Status: ready-for-dev — **PR #404 merged as `69814fc3`**. Public URL/HTTPS exist; still blocked on **owner UAT deploy of that SHA**, **sandbox UAT walk**, notification destination (including adjustments), and refund-policy decisions. Uses existing **sandbox** credentials only. Do not mark done.

Code-side webhook retry, refund ingest, and credential isolation landed 2026-10-08 on the Paddle billing remediation branch. **Do not mark this story done** until droplet sandbox UAT + Mandatory Code Review Loop + product acceptance complete.

Sandbox walk script (do not execute live; sandbox credentials only): `19-4-paddle-sandbox-uat-execution-plan-2026-10-08.md`.

### Dev Agent Record (2026-10-08)

**Halt** (`bmad-dev-story`): PR #404 **merged** as `69814fc3` on `main`. Post-merge CI green. UAT deploy **not** authorized. SSH still `Permission denied (publickey)` (no private key on this VM). Real sandbox Groups A–G **not** executed. Evidence: `19-4-post-merge-sandbox-uat-2026-10-08.md`. Do **not** mark done.

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
- `PaddleCredentialGuard` + Production boot + `deploy/preflight-launch.sh` reject live keys unless `Paddle__AllowLive=true` / `COHESTRA_ALLOW_LIVE_PADDLE=1` **and** `PUBLIC_BASE_URL` is not a UAT host. AllowLive cannot enable live Paddle on `uat.cohestra.app`.  
- UAT compose forwards `Paddle__*`  
- Preflight fails on leftover Stripe keys  
- Classify script: `deploy/classify-paddle-env.sh`  
- Policy escalation: `paddle-refund-dispute-policy-escalation-2026-10-08.md`

## Remaining sandbox UAT blockers (not code)

Independent public probe 2026-10-08 (no SSH, no secrets): `https://uat.cohestra.app/ready` Healthy; HTTP→HTTPS 301; cert SAN `uat.cohestra.app` + `*.uat.cohestra.app`; `POST /api/v1/system/paddle/webhook` returns **400 Missing Paddle-Signature** (secret is configured on the live UAT API; unsigned posts are rejected). Tracker 19.1/19.2 are **not** closed — this does not replace product acceptance.

Still required before 19.4 acceptance:

1. Owner-authorized merge of PR #404, then deploy that HEAD to the UAT droplet (current public stack is **not** proven to be `47ebb1b5`)  
2. Paddle sandbox notification destination: `https://uat.cohestra.app/api/v1/system/paddle/webhook` including **adjustment.created** and **adjustment.updated** (plus existing subscription/transaction events)  
3. Default payment link: `https://uat.cohestra.app/billing/paddle-return`  
4. Owner sandbox `pri_…` / client token already implied if overlay works; classify on droplet without printing values  
5. Owner decisions on refund entitlement revoke / partial refunds / chargeback reverse **and** cross-event delayed chargeback after payment recovery (escalation doc)  
6. Owner Paddle dashboard sandbox onboarding Step 02 (website/checkout domain approval for `uat.cohestra.app` / `*.uat.cohestra.app`)  
7. No Cloud Agent SSH or Paddle dashboard access in this environment  

**Residual launch risk (in-scope to test, not to invent policy):** delayed approved chargeback (`new event_id`) after a later paid recovery can re-enter PastDue. Same-event retries are idempotent.  

## Do NOT implement in 19.4

- Live Paddle keys, live catalog, live notification destination  
- `COHESTRA_ALLOW_LIVE_PADDLE=1` on UAT  
- Cinema, Epic 25, Epic 34  
- Story 19.1 stack smoke (separate)  
- Invented refund auto-revoke without owner policy  
