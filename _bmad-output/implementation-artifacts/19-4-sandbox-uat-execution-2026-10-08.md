# Story 19.4 sandbox UAT execution — 2026-10-08

**Story:** existing `19-4-paddle-billing-uat-on-droplet.md` (not duplicated).  
**Plan:** `19-4-paddle-sandbox-uat-execution-plan-2026-10-08.md`  
**Model:** Grok 4.6 only. Mandatory Code Review Loop in force.  
**Production billing:** **NO-GO** (disabled; not modified).

Statuses used: **PASS** / **FAIL** / **PARTIAL** / **BLOCKED** / **MANUAL**.

## Phase 1 — Merge verification

| Item | Status | Evidence |
|------|--------|----------|
| PR #404 HEAD is `765b0aec58dc416550329a86c7d9d135d8acf2d8` | **PASS** | `gh pr view 404` `headRefOid` matches local + `origin/cursor/paddle-billing-remediation-8d24` |
| Required CI green | **PASS** | Run `37788069269`: .NET, API integration, Next.js, UAT isolation, Docker stack smoke, GitGuardian — all SUCCESS |
| Mergeable | **PASS** | `MERGEABLE`, `mergeStateStatus=CLEAN`, `state=OPEN`, `isDraft=true` |
| Review evidence | **PASS** | Pre-merge + merge-gate artifacts; implementation patches at `35a66316`; unresolved BLOCKER/MAJOR = none |
| Explicit owner merge authorization | **FAIL** (absent) | No GitHub reviews, no PR comments, no queued owner follow-up. This run’s instruction is conditional (“if authorization has been received”). It is **not** itself an authorize-merge. |
| Merge performed | **BLOCKED** | Stopped at approval gate. PR remains draft / unmerged. |

**Not merged.**

## Phase 2 — UAT deployment

| Item | Status | Evidence |
|------|--------|----------|
| 19.1 public URL / health | **PASS** (infra) | `https://uat.cohestra.app/ready` → 200 `Healthy` (postgres, redis, default-tenant). HTTP `/ready` → 301 HTTPS. Tracker **not** closed. |
| 19.2 HTTPS / wildcard | **PASS** (infra) | SAN `uat.cohestra.app` + `*.uat.cohestra.app` (to 2026-12-13). Tenant `creativorare.uat.cohestra.app` 200, HSTS, `X-Cohestra-Edge-Vhost: uat`, CSP includes Paddle sandbox origins. Tracker **not** closed. |
| Deploy merged main | **BLOCKED** | No owner merge. |
| Exact deployed SHA | **BLOCKED** | Cloud Agent cannot SSH. Public stack **not** proven to be `765b0aec`. |
| Classify sandbox / reject live | **BLOCKED** | `classify-paddle-env.sh` needs droplet `.env`. No SSH. |
| `uat-smoke.sh` | **BLOCKED** | Needs droplet / owner workstation after deploy. |
| SSH | **BLOCKED** | `~/.ssh/cohestra_uat` **absent**. `SSH_AUTH_SOCK` unset. `ssh deploy@129.212.235.2` → `Permission denied (publickey)`. |

No secrets printed. No production billing env changed.

### Required owner deploy (after merge)

On the **owner workstation** (not this VM):

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/cohestra_uat
# After PR #404 is merged to main:
bash deploy/uat-deploy-from-workstation.sh
```

On the droplet, then:

```bash
cd /home/deploy/cohestra
git rev-parse HEAD          # must equal origin/main after #404 merge
bash deploy/classify-paddle-env.sh
# Expect: API key SANDBOX, client token SANDBOX (test_), Environment=sandbox,
# four Price* PRESENT (pri_…). REJECT if any line says LIVE.
# Confirm Paddle__AllowLive is unset/false. Do not print secret values.
PUBLIC_BASE_URL=https://uat.cohestra.app bash deploy/uat-smoke.sh
```

`remote-deploy.sh` resets to `DEPLOY_BRANCH=main` and rebuilds `cohestra-uat`. Do not deploy live Paddle keys. Do not set `COHESTRA_ALLOW_LIVE_PADDLE=1` on UAT.

## Phase 3 — Paddle dashboard / Step 02

Dashboard login is **MANUAL / BLOCKED** in this environment (no sandbox credentials, no Paddle session).

Public, non-secret observations on the **current** (unknown SHA) UAT stack:

| Check | Status | Evidence |
|-------|--------|----------|
| Unsigned webhook | **PASS** | `POST https://uat.cohestra.app/api/v1/system/paddle/webhook` → **400** `Missing Paddle-Signature header.` (secret configured) |
| Garbage signature | **PASS** | Same route with `Paddle-Signature: ts=1;h1=00` → **400** `Invalid Paddle-Signature.` |
| Valid signed delivery | **BLOCKED** | Destination secret not available here |
| `/billing/paddle-return` | **PASS** (page up) | HTTPS 200 on apex |
| Tenant `/billing/checkout` | **PARTIAL** | HTTPS 200 (page shell). Overlay/catalog **not** exercised (no tenant session) |
| Core/Pro monthly+annual catalog | **MANUAL** | Must confirm in Paddle **sandbox** catalog vs droplet `Paddle__Price*` (`pri_…` prefixes only via classify) |
| Price IDs match env | **BLOCKED** | Needs classify + dashboard; do not paste IDs into git |
| Checkout domain approval | **MANUAL** | See Step 02 list |

### Exact remaining Paddle onboarding Step 02 (sandbox account only)

Paddle Checkout website approval / default payment link / notifications. **Live account must stay unused.**

1. **Website / checkout domains** (approve both; overlay `successUrl` is the **tenant** host):  
   - `https://uat.cohestra.app`  
   - `https://*.uat.cohestra.app` (example `https://creativorare.uat.cohestra.app`)  
2. **Default payment link** (one URL per sandbox environment, never a slug):  
   `https://uat.cohestra.app/billing/paddle-return`  
3. **Notification destination** (new vs local ngrok; own secret → droplet `Paddle__WebhookSecret` only):  
   `https://uat.cohestra.app/api/v1/system/paddle/webhook`  
4. **Subscribe at least:** `transaction.completed`, `transaction.payment_failed`, `subscription.created`, `subscription.updated`, `subscription.canceled`, `subscription.past_due`, `subscription.activated`, `adjustment.created`, `adjustment.updated`.  
   `transaction.created` is **not** enough.  
5. Recreate UAT `api` after webhook secret change.  
6. Confirm `NEXT_PUBLIC_PADDLE_RETURN_ORIGIN=https://uat.cohestra.app` on the droplet and that **web** was rebuilt with it.  
7. Catalog: existing sandbox Core **$14.99 / $152.92**, Pro **$29.99 / $305.93**, 30-day trial on all four paid prices (PRD §13.3 / Story 29.7). Do not create a duplicate catalog unless classify shows missing or live-shaped IDs.

## Phase 4 — Scenario results

No sandbox checkout, subscription, or adjustment was executed. No transaction IDs or event IDs were collected (none exist from this run). No payment details.

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Core monthly checkout | **BLOCKED** | Needs merge + deploy + tenant login + Step 02 |
| 2 | Core annual checkout | **BLOCKED** | |
| 3 | Pro monthly checkout | **BLOCKED** | |
| 4 | Pro annual checkout | **BLOCKED** | |
| 5 | Subscription provisioning | **BLOCKED** | |
| 6 | Core/Pro entitlements | **BLOCKED** | |
| 7 | Upgrade / downgrade | **BLOCKED** | |
| 8 | Cancellation / renewal | **BLOCKED** | |
| 9 | Failed payments | **BLOCKED** | |
| 10 | Webhook retry / duplicate / order | **PARTIAL** | Invalid signature **PASS** on public UAT. Valid delivery, replay, 503 retry **BLOCKED**. Same-`event_id` idempotency covered by automated tests on PR HEAD, not live UAT. |
| 11 | Refund / dispute events | **BLOCKED** | Code: approved refund = ingest/log only; approved chargeback = PastDue. **No policy invented.** |
| 12 | Tenant isolation | **BLOCKED** | Automated `TenantIsolationApiTests` on PR; live two-tenant walk not run |
| 13 | Checkout return / refresh | **PARTIAL** | Apex `/billing/paddle-return` 200. `_ptxn` overlay + refresh idempotency **BLOCKED** |
| 14 | Delayed chargeback after paid recovery | **BLOCKED** | Residual risk remains; do not invent auto-restore |

Automated coverage on PR HEAD (not a substitute for droplet UAT): webhook 200/400/503, duplicate EventId, adjustment cursor ordering, UAT host rejects live keys even with `AllowLive`, refund does not revoke, chargeback → PastDue.

## Phase 5 — Acceptance

Story 19.4 remains **ready-for-dev / not done**.

| Gate | Status |
|------|--------|
| Product sandbox UAT | **BLOCKED** |
| BMAD code review (implementation HEAD `35a66316`) | **PASS** — no unresolved BLOCKER/MAJOR; docs-only commits after that do not reopen review |
| Story close | **Not closed** — required ACs lack droplet evidence |
| Production GO/NO-GO | **NO-GO** |

### Remaining release blockers

1. Owner **explicit** merge authorization for PR #404, then merge (mark ready if required).  
2. Owner SSH deploy of **merged main** + `git rev-parse HEAD` proof.  
3. Sandbox classify (reject LIVE).  
4. Paddle Step 02 (domains, default payment link, webhook events including adjustments).  
5. Execute the 14 sandbox scenarios; store txn/event IDs only in access-controlled evidence.  
6. Written refund / partial / chargeback-lifecycle policy (including delayed chargeback after recovery).

### Next BMAD step

Reply with **explicit** “authorize merge of PR #404” (or Approve on GitHub). Then this workflow can merge if still so instructed, or the owner merges and deploys. After SHA-verified UAT sandbox classify, run the existing 19.4 execution plan. Any code fix re-enters Mandatory Code Review Loop on the **new** HEAD.
