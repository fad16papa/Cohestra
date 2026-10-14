# Investigation: Story 19.4 — UAT Paddle catalog / plan mapping mismatch

## Hand-off Brief

1. **What happened.** CreativoRare Cohestra UI shows Pro / Active / Yearly. Paddle sandbox portal on the same subscription suffix `89pse8` shows **Cohestra Core US$153.99/year**.
2. **Where the case stands.** UAT `.env` and `cohestra-uat-api` now use canonical V2 price IDs. Subscription `89pse8` is still on obsolete Core annual `$153.99` (item suffix `3wkz62r6`). `lead-generation-crm` was not touched.
3. **What's needed next.** Formal preview gate is **blocked on post-preview live GET** (STEP 5). Preview call itself targeted `m754cd`, immediate txn NO, next-invoice charge `$304.43`. Do not PATCH until STEP 5 is unchanged and separately authorized.

## Case Info

| Field | Value |
| ----- | ----- |
| Ticket | Story 19.4 UAT Paddle catalog mapping |
| Date opened | 2026-10-13 |
| Status | Open — preview call succeeded; formal gate blocked on post-preview GET |
| System | main `1e2745e754d2033263d496067ed8a5d604df5a9d` |
| Evidence sources | Code on that SHA; tenant SQL; prior sandbox GET; owner portal/checkout screenshots |

## Confirmed findings

### Finding 1: ResolvePriceId maps the four env slots

**Evidence:** `src/Infrastructure/Billing/TenantBillingPlanSync.cs` `ResolvePriceId`

**Detail:** Core+Monthly → `PriceCoreMonthly`; Core+Annual → `PriceCoreAnnual`; Pro+Monthly → `PriceProMonthly`; Pro+Annual → `PriceProAnnual`.

### Finding 2: ApplySubscription uses item price ID first; custom_data is fallback only

**Evidence:** `src/Infrastructure/Billing/PaddleTenantBillingSync.cs` `ApplySubscription`

**Detail:** `priceId` from `subscription.Items[0].Price.Id` / `PriceId`. `TryMapPrice` against env. Only if that fails: `TryMapPlanFromCustomData`. Custom_data cannot override a successful price-id match.

### Finding 3: Pro→Core price map is treated as scheduled downgrade, not immediate tenant.Plan rewrite

**Evidence:** same method, `IsPaidPlanDowngrade(tenant.Plan, targetPlan)`

**Detail:** If env maps the live item to Core while `tenant.Plan` is Pro, Cohestra can keep showing Pro and set `ScheduledPlan=Core`. Last tenant SQL did **not** select `ScheduledPlan`.

### Finding 4: $153.99 is the obsolete sandbox Core annual draft

**Evidence:** `_bmad-output/implementation-artifacts/29-7-paddle-sandbox-uat-epic-14-regression.md`; `web/lib/marketing/pricing-plans.ts` Core annual `$152.92`, Pro annual `$305.93`.

**Detail:** Portal **US$153.99/year** + product name **Cohestra Core** is not official launch catalog. Cohestra checkout Core card `$152.92/year` is marketing copy, not a live Paddle GET.

### Finding 5: Tax-only does not explain Core vs Pro

**Evidence:** `152.92 × 1.09 = 166.68` (SG GST). `153.99 − 152.92 = 1.07` is not a standard tax rate. Product name is Core.

**Detail:** Hypothesis D (tax display only) is **refuted** for the name mismatch. Unproven as an explanation of $153.99 vs $152.92 without Paddle `unit_price` + tax objects.

### Finding 6: Same subscription identity

**Evidence:** tenant suffix `89pse8`; portal URL `sub_…89pse8`; prior GET `subscription_id_match True`, `active_or_trialing_count 1`, `scheduled_change None`, `next_billed_at 2027-10-12`.

### Finding 7: Canonical V2 prices created 2026-10-14

**Evidence:** Owner droplet run as `deploy` against sandbox API; `CREATED_COUNT 4`; `REUSED_COUNT 0`; `CANONICAL FOUR-PRICE MATRIX PASS`.

| Slot | Product | Amount | Interval | Trial | Suffix | Read-back |
| ---- | ------- | ------ | -------- | ----- | ------ | --------- |
| CORE MONTHLY V2 | Cohestra Core `46dxfh` | 14.99 | month | 30 days card-required | `6es9vc` | PASS |
| CORE ANNUAL V2 | Cohestra Core `46dxfh` | 152.92 | year | 30 days card-required | `drhkr4` | PASS |
| PRO MONTHLY V2 | Cohestra Pro `f8fvb0` | 29.99 | month | 30 days card-required | `jfxne5` | PASS |
| PRO ANNUAL V2 | Cohestra Pro `f8fvb0` | 305.93 | year | 30 days card-required | `m754cd` | PASS |

Old `$14.99` / `$153.99` / `$29.99` / `$306.99` trial=NONE prices were left active and unchanged.

### Finding 8: Env and live item are still the obsolete catalog

**Evidence:** Prior four-price GET + `SLOT_MATCH CoreAnnual` on item `3wkz62r6`. Read-only resolve 2026-10-14 printed current env suffixes and full V2 IDs.

Current UAT `.env` slots (obsolete catalog):

| Slot | Env suffix | Notes |
| ---- | ---------- | ----- |
| `Paddle__PriceCoreMonthly` | `erv34a` | old trial=NONE $14.99 |
| `Paddle__PriceCoreAnnual` | `kz62r6` | old trial=NONE $153.99; **same as live item `3wkz62r6`** |
| `Paddle__PriceProMonthly` | `mh2b84` | old trial=NONE $29.99 |
| `Paddle__PriceProAnnual` | `46q4gy` | old trial=NONE $306.99 |

Resolved V2 IDs (GET, all active, 30-day card-required trial):

| Slot | Full price ID | Amount | Interval |
| ---- | ------------- | ------ | -------- |
| CORE MONTHLY V2 | `pri_01m4x7btd32z57bxb0kb6es9vc` | 14.99 | month |
| CORE ANNUAL V2 | `pri_01m4x7bvaeb52f5hf1shdrhkr4` | 152.92 | year |
| PRO MONTHLY V2 | `pri_01m4x7bwwg0mpg0skgxwjfxne5` | 29.99 | month |
| PRO ANNUAL V2 | `pri_01m4x7bza2hj3kbmgy5mm754cd` | 305.93 | year |

**Detail:** Live item `3wkz62r6` **was** the pre-switch `PriceCoreAnnual` slot. After the 2026-10-14 env switch it no longer matches any env slot, so `TryMapPrice` falls back to `custom_data` until the PATCH gate. CreativoRare stays on obsolete Core annual `$153.99` until a later owner-authorized same-subscription PATCH to Pro Annual V2 `m754cd`.

### Finding 9: Tenant is Pro; provider item and custom_data are Core

**Evidence:** 2026-10-14 preview script. Tenant `plan=Pro` `interval=Annual` `billing=Active` `ScheduledPlan` empty. Live item `kz62r6`. `custom_data={"plan":"Core","interval":"Annual","tenant_slug":"creativorare"}`.

**Detail:** After env switch, `TryMapPrice` misses `kz62r6` and falls back to `custom_data` → Core. Next webhook would treat Pro→Core as a paid downgrade and set `ScheduledPlan=Core`, not immediately rewrite `Plan`. `ScheduledPlan` is still empty, so that webhook has not landed yet.

### Finding 10: Pro Annual V2 preview — no immediate charge

**Evidence:** `PATCH /subscriptions/…89pse8/preview` with `immediately` + `prorated_next_billing_period` to `pri_01m4x7bza2hj3kbmgy5mm754cd`.

| Field | Value |
| ----- | ----- |
| Preview item | `m754cd` Pro Annual V2 |
| Status | active |
| Immediate transaction | NO |
| Next billed at | unchanged `2027-10-12T18:06:23.629Z` |
| Next transaction | YES |
| Result | charge `30443` USD (`$304.43`) |
| Credit | `0` |

## Missing evidence

None required for the PATCH gate. Optional: next-transaction line items if owner wants the `$304.43` vs `$305.93` breakdown.

## Working classification

Primary: **C obsolete sandbox price** on the **live item**, plus **stale tenant Pro** against provider/custom_data Core. Hypothesis A is **refuted**. The Pro UI is leftover tenant state. Env switch makes `custom_data.plan=Core` the active fallback until PATCH.

Code defect E is not selected: mapping order is correct; a Pro UI with a Core-priced subscription is explained by env slot identity or the downgrade-schedule / custom_data fallback.

## Remediation design

1. Classify which env slot owns `…3wkz62r6`. **Done** — CoreAnnual obsolete `$153.99`.
2. Discover whether canonical $152.92 / $305.93 prices already exist. **They did not.** Created V2 under existing products.
3. Point UAT env at V2 suffixes. **Done** 2026-10-14T12:55:44Z. Backup `.env.bak.canonical-v2-20261014T125544Z`. Container env suffixes `6es9vc` / `drhkr4` / `jfxne5` / `m754cd` PASS. `lead-generation-crm` stayed up.
4. Reconcile the **existing** subscription `89pse8` to Pro Annual V2 `m754cd` only with owner authorization. Same customer/subscription ids. Set `custom_data.plan=Pro`. Do not create a second subscription. Do not change `Tenant.Plan` first to hide drift. Preview reviewed: no immediate txn; `$304.43` on next invoice.
5. Then re-sync tenant from provider price id.

Product policy for active same-frequency upgrade is `effective_from=immediately` + `proration_billing_mode=prorated_next_billing_period` (difference on next invoice, not an immediate charge). Preview first.

## Mutations this run

Sandbox catalog create + UAT `.env` four-price remap + `cohestra-uat-api` recreate. No subscription PATCH. No tenant SQL. No `lead-generation-crm` change.
