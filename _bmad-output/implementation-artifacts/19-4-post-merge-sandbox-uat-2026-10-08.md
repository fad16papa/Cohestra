# Epic 19 / Story 19.4 — post-merge sandbox UAT (2026-10-08)

**Reviewed main SHA:** `69814fc3b172d23dfe2782ad837140e234a9ffc7`  
**PR #404:** MERGED 2026-10-08T14:21:54Z (squash).  
**This branch:** `cursor/epic-19-post-merge-sandbox-uat-8d24` (evidence only; no billing code change).  
**Model:** Grok 4.6 only. Production billing: **NO-GO**.

Statuses: **PASS** / **FAIL** / **PARTIAL** / **BLOCKED** / **MANUAL** / **NOT IMPLEMENTED**.

Do not treat pre-merge PR CI as post-merge evidence. Post-merge CI is recorded below.

---

## 1. Executive summary

PR #404 is on `origin/main`. Post-merge GitHub CI on `69814fc3` is green. Automated billing tests on this SHA pass. Public UAT HTTPS/health still pass.

**UAT is not proven to be `69814fc3`.** GitHub Actions Deploy on main **failed** (`missing server host` — droplet SSH secrets empty, by Epic 19.1 design). This Cloud Agent has **no SSH private key**, so it cannot deploy or read the droplet SHA.

Real Paddle sandbox Groups A–G were **not** executed. Story 19.4 stays open.

**UAT deploy authorization (2026-10-08, this run):** owner explicitly authorized **UAT deploy of merged main**. Access is still **BLOCKED**: this Cloud Agent has no `~/.ssh/cohestra_uat` (or any private key). Re-attempt `ssh -o BatchMode=yes -o IdentitiesOnly=yes deploy@129.212.235.2` → `Permission denied (publickey)`. GitHub Actions Deploy was **not** invoked (empty droplet secrets; concurrency group `deploy-production`; Epic 19.1 forbids uploading `cohestra_uat`). No UAT mutation was performed.

---

## 2. Reviewed main SHA

| Item | Status | Evidence |
|------|--------|----------|
| `69814fc3` is `origin/main` | **PASS** | `git fetch origin main`; `git rev-parse origin/main` |
| Ancestor of main | **PASS** | `git merge-base --is-ancestor 69814fc3 origin/main` |
| PR #404 state | **PASS** | `state=MERGED`, `mergeCommit.oid=69814fc3…` |
| Tree includes credential guard + adjustment cursors | **PASS** | `git diff --stat c82f44ee..69814fc3` |

## 3. Post-merge CI (main push)

| Check | Status | Evidence |
|-------|--------|----------|
| CI workflow on `69814fc3` | **PASS** | Run [37791850295](https://github.com/fad16papa/Cohestra/actions/runs/37791850295): .NET, integration, Next, UAT isolation, Docker smoke — success |
| GitHub Deploy on `69814fc3` | **FAIL** (expected empty secrets) | Run [37792565466](https://github.com/fad16papa/Cohestra/actions/runs/37792565466): `Error: missing server host`; `INPUT_HOST`/`INPUT_KEY` empty. **Not** a UAT deploy of this SHA. Do not upload `cohestra_uat` to GitHub. |

## 4. UAT deployed SHA

| Item | Status |
|------|--------|
| Exact deployed SHA | **BLOCKED** — no SSH |
| Public stack equals `69814fc3` | **BLOCKED** — healthy endpoints ≠ deploy proof |

## 5. Story 19.1 (UAT URL) — public revalidation 2026-10-08T14:28:18Z

| AC / check | Status | Evidence |
|------------|--------|----------|
| `https://uat.cohestra.app/ready` | **PASS** | 200 `Healthy` postgres + redis + default-tenant |
| HTTP → HTTPS | **PASS** | 301 `http://uat.cohestra.app/ready` → HTTPS; `X-Cohestra-Edge-Vhost: uat` |
| Tenant host | **PASS** | `https://creativorare.uat.cohestra.app/` 200 |
| Host-level smoke / firewall / compose SHA | **BLOCKED** | Needs `deploy@` + `uat-smoke.sh` |
| Story close | **Not closed** | Public probes ≠ 19.1 AC (port audit, isolated compose, owner smoke) |

## 6. Story 19.2 (HTTPS)

| Check | Status | Evidence |
|-------|--------|----------|
| Wildcard SAN | **PASS** | `uat.cohestra.app` + `*.uat.cohestra.app` (to 2026-12-13) |
| HSTS | **PASS** | `max-age=31536000` |
| CSP Paddle sandbox | **PASS** | `sandbox-cdn.paddle.com`, `sandbox-buy.paddle.com`, `sandbox-api.paddle.com` (live origins also listed; env still unproven) |
| `/billing/paddle-return` | **PASS** (page up) | 200 |
| `prove-edge-tls-wildcard.sh` / existing-app cert | **BLOCKED** / **MANUAL** | No SSH |
| Story close | **Not closed** | |

## 7. SSH diagnosis (no private key material)

**Confirmed**

- `~/.ssh/` contains only `known_hosts` (142 bytes). No `cohestra_uat`, `id_ed25519`, or `*.pub`.
- `SSH_AUTH_SOCK` unset; `ssh-add -l` cannot talk to an agent.
- `ssh -o BatchMode=yes -o IdentitiesOnly=yes deploy@129.212.235.2`: server offers `publickey` only; all default identity files `type -1`; **no public key offered**; `Permission denied (publickey)`.
- Expected identity in repo scripts: `$HOME/.ssh/cohestra_uat` (`deploy/uat-deploy-from-workstation.sh`, `deploy/uat-ssh-accept.sh`). User `deploy`, host `129.212.235.2`.
- Owner message said an Ed25519 **public** key was supplied. It is **not** in this workspace, chat text, Cursor store, or `~/.ssh`. A public key cannot authenticate outbound SSH.

**Deduced**

- Failure is missing client identity, not a closed port (TCP 22 accepted the handshake).
- Matching a local private key to the owner public key is impossible: there is no local private key.

**Not done (policy)**

- Did not generate or replace keys.
- Did not disable host-key verification.
- Did not change firewall or `authorized_keys`.
- Did not attempt SSH with a non-matching key.

### Owner actions (pick one)

**A — Workstation deploy (preferred, already documented)**

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/cohestra_uat
bash deploy/uat-ssh-accept.sh
# After explicit UAT deploy approval:
bash deploy/uat-deploy-from-workstation.sh
```

**B — Cloud Agent access later (requires separate authorization)**

1. On the droplet, as `deploy` from the workstation, append the Cloud Agent’s **public** key to `~/.ssh/authorized_keys` (do not replace existing keys).  
2. Place the matching **private** key in this environment via Cursor environment secrets — **not** git, chat, or BMAD artifacts.  
3. Filename `~/.ssh/cohestra_uat`, mode `600`.  
This agent will **not** generate that pair unless the owner explicitly authorizes key generation.

A public key pasted into chat is not sufficient.

## 8. Deployment gate

Owner **authorized** UAT deploy of merged main. Agent execution: **BLOCKED** (no SSH private key). GitHub Actions Deploy **not** used.

### Owner workstation — run now

Target SHA: `69814fc3b172d23dfe2782ad837140e234a9ffc7` (`origin/main` at authorization). Do not print secret values. Do not set `Paddle__AllowLive`.

```bash
git fetch origin main
git rev-parse origin/main   # expect 69814fc3… unless main moved
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/cohestra_uat
bash deploy/uat-deploy-from-workstation.sh
```

On droplet after pull/reset to `origin/main`:

```bash
cd /home/deploy/cohestra
git rev-parse HEAD          # must equal origin/main
bash deploy/classify-paddle-env.sh
# Expect SANDBOX API key, test_ client token, Environment=sandbox, four pri_ PRESENT.
# REJECT any LIVE line. Do not print secret values.
# Paddle__AllowLive must stay unset/false. Do not set COHESTRA_ALLOW_LIVE_PADDLE=1.
PUBLIC_BASE_URL=https://uat.cohestra.app bash deploy/uat-smoke.sh
```

Do not use GitHub Actions Deploy until `DROPLET_HOST`/`DROPLET_SSH_KEY` are intentionally filled — Epic 19.1 says not to upload `cohestra_uat`.

## 9. Paddle sandbox configuration vs code

Dashboard access: **MANUAL / BLOCKED**.

| Topic | Status | Evidence |
|-------|--------|----------|
| Catalog in Paddle | **MANUAL** | Cannot read sandbox catalog. Cohestra maps `Paddle__PriceCoreMonthly/Annual` + `PriceProMonthly/Annual` → Core/Pro × interval (`TenantBillingPlanSync.TryMapPrice`). |
| Price IDs on UAT | **BLOCKED** | `classify-paddle-env.sh` needs droplet `.env` |
| Checkout architecture | **PASS** (code) | Server `CreateCheckoutTransactionAsync`; web `initializePaddle` + `Checkout.open({ transactionId })` (`web/lib/billing/paddle-checkout.ts`). Environment from `test_` vs `live_` prefix. |
| `Paddle.PricePreview()` | **NOT IMPLEMENTED** — **not required** | Zero matches in repo. Overlay + server transaction + fixed USD `pri_…` is the chosen path. Do **not** add PricePreview only to move Paddle’s onboarding meter. |
| Default payment link | **MANUAL** | Required: `https://uat.cohestra.app/billing/paddle-return` |
| Checkout domains | **MANUAL** | Approve `uat.cohestra.app` and `*.uat.cohestra.app` |
| Webhook URL | **PARTIAL** | Public POST exists. Unsigned → 400 missing signature; garbage → 400 invalid signature. Valid destination **MANUAL**. |
| Handler event names | **PASS** (code vs Paddle Billing) | `transaction.completed`, `transaction.payment_failed`, `subscription.created`, `subscription.updated`, `subscription.canceled`, `subscription.past_due`, `subscription.activated`, `adjustment.created`, `adjustment.updated` |

`transaction.created` is ignored. Subscribe the nine tracked events.

### Step 02 / ~75% meter

Cannot see the dashboard meter. Remaining items are **MANUAL**: website approval, default payment link, notification destination (including adjustments), and **a real sandbox test payment**. Do not treat 100% onboarding as production GO. Do not switch to Live.

## 10. Story 19.4 test matrix

Automated on SHA `69814fc3` (this VM). Real sandbox = droplet + Paddle sandbox account.

### Automated (not sandbox UAT)

| Suite | Command / env | Result |
|-------|----------------|--------|
| Billing-related units | `dotnet test Cohestra.sln --filter "Category!=Integration&(FullyQualifiedName~Paddle\|…Billing…)"` | **PASS** 147 |
| Webhook/guard/settings units | `PaddleWebhookProcessorTests` + `PaddleCredentialGuardTests` + `PaddleWebhookHttpTests` + `PaddleSettingsTests` | **PASS** 36 |
| API integration | `CI=true` + fresh `cohestra_test` + Redis; filter Paddle\|Billing\|TenantIsolation | **PASS** 20 |
| Next billing units | `npx vitest run lib/billing lib/settings-billing-page-content.test.ts lib/in-app-billing-panel.test.ts` | **PASS** 52 / 8 files |
| Playwright billing e2e | `e2e/billing-sync-38-1.spec.ts`, `e2e/settings-billing-43-3.spec.ts` without `E2E_LIVE_STACK` | **BLOCKED** 4 skipped (local live stack, not UAT) |
| `uat-smoke.sh` | droplet | **BLOCKED** |
| `classify-paddle-env.sh` | droplet | **BLOCKED** |

### Group A — Checkout (real sandbox)

A1–A6 **BLOCKED**. No tenant session, no sandbox charge, no txn IDs.

### Group B — Provisioning

B1–B6 **BLOCKED** live. Units cover plan unlock / complimentary skip.

### Group C — Lifecycle

C1–C7 **BLOCKED** live. Units cover cancel-at-period-end, resume, PastDue, deferred downgrade.

### Group D — Webhooks

| ID | Status | Notes |
|----|--------|-------|
| D1 valid signed | **BLOCKED** live / **PASS** mocked integration | |
| D2 invalid signature | **PASS** public UAT (unknown SHA) + integration | 400 missing / invalid |
| D3 duplicate | **PASS** automated / **BLOCKED** live replay | |
| D4 retryable 503 | **PASS** automated / **BLOCKED** live | |
| D5 valid retry | **PASS** automated / **BLOCKED** live | |
| D6 out-of-order adjustments | **PASS** automated cursor / **BLOCKED** live | |
| D7 concurrent EventId | **PASS** automated / **BLOCKED** live | |
| D8 no false success ledger | **PASS** automated / **BLOCKED** live | |

### Group E — Refunds / disputes

E1–E6 **BLOCKED** live. Code: approved refund = ingest/log, **no revoke**; approved chargeback = PastDue; complimentary skip. **Policy not invented.**

**Production gate (residual):** delayed approved chargeback (`new event_id`) after a later paid recovery can re-enter PastDue. Adjustment cursors order **adjustments only**. Owner item.

### Group F — Security / isolation

| ID | Status |
|----|--------|
| F1–F2 tenant isolation / custom_data spoof | **PASS** automated / **BLOCKED** live two-tenant |
| F3 unauthorized subscription mutate | **PASS** automated authz (not re-run as full matrix this turn) / **BLOCKED** live |
| F4 failed checkout no entitlement | **PASS** units / **BLOCKED** live |
| F5 UAT cannot init live Paddle | **PASS** units (`PaddleCredentialGuard` UAT host lock) / **BLOCKED** droplet classify |
| F6 duplicate subscription | **PASS** webhook EventId uniqueness / **BLOCKED** live |

### Group G — UX

G1 **PARTIAL** (return page 200). G2–G7 **BLOCKED** (no checkout). Desktop/mobile **BLOCKED**.

## 11. Stories close decision

| Story | Tracker | Decision |
|-------|---------|----------|
| 19.1 | in-progress | **Do not close** |
| 19.2 | review | **Do not close** |
| 19.4 | ready-for-dev | **Do not close** |
| Epic 19 | in-progress | **Do not close** |

## 12. Corrective PRs

None. No defect found that justifies a billing code change. This PR is evidence-only.

## 13. Remaining production blockers

1. Explicit **UAT deploy** approval (separate from merge).  
2. Working `deploy@` SSH (`~/.ssh/cohestra_uat` on workstation).  
3. Deploy `69814fc3` (or current main) and prove SHA.  
4. Sandbox classify; reject LIVE.  
5. Paddle Step 02 (domains, default payment link, webhook events including adjustments).  
6. Execute Groups A–G with sandbox test methods; store txn/event IDs in access-controlled evidence only.  
7. Written refund / partial / chargeback reverse policy, including delayed chargeback after recovery.  
8. Do not set `Paddle__AllowLive` on UAT. Do not switch to Live.

## 14. BMAD / model

Skills applied: story halt (`bmad-dev-story`), investigation evidence grading (`bmad-investigate`), existing 19.4 execution plan / test design, Mandatory Code Review Loop (no new implementation HEAD). Agents: Grok 4.6 only. Composer 2.5 not used. Auto not used. No cross-model subagents.

## 15. Production GO/NO-GO

**NO-GO.**
