# Investigation: Story 19.4 — UAT Paddle catalog / plan mapping mismatch

## Hand-off Brief

1. **What happened.** CreativoRare Cohestra UI shows Pro / Active / Yearly. Paddle sandbox portal on the same subscription suffix `89pse8` shows **Cohestra Core US$153.99/year**.
2. **Where the case stands.** Canonical sandbox V2 prices now exist. All four GET read-backs passed. UAT `.env` still points at obsolete trial=NONE prices. Subscription `89pse8` is still on Core annual `$153.99` (item suffix `3wkz62r6`).
3. **What's needed next.** Owner-authorized **UAT Four-Price Env Mapping Switch** only. Do not PATCH the subscription or rewrite `Tenant.Plan` in that gate.

## Case Info

| Field | Value |
| ----- | ----- |
| Ticket | Story 19.4 UAT Paddle catalog mapping |
| Date opened | 2026-10-13 |
| Status | Open — V2 catalog created; env mapping switch not authorized |
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

**Detail:** Env switch has not run. Live item `3wkz62r6` **is** the current `PriceCoreAnnual` slot. Cohestra therefore maps CreativoRare's provider price to Core Annual. The Pro UI is not explained by env ProAnnual pointing at the Core price. Remaining explanations: scheduled-downgrade keep-Pro, `custom_data` unused because price mapped, or stale tenant row. CreativoRare stays on obsolete Core annual until a later owner-authorized same-subscription PATCH to Pro Annual V2 `m754cd`.

## Missing evidence

`custom_data.plan`; tenant `ScheduledPlan`.

## Working classification

Primary: **C obsolete sandbox price** on the **live item** (Core-named $153.99/year), and that item **is** UAT `Paddle__PriceCoreAnnual`. Hypothesis A (env ProAnnual wired to the Core price) is **refuted**. The Pro UI is leftover tenant/schedule behavior, not a wrong ProAnnual ID.

Code defect E is not selected: mapping order is correct; a Pro UI with a Core-priced subscription is explained by env slot identity or the downgrade-schedule / custom_data fallback.

## Remediation design

1. Classify which env slot owns `…3wkz62r6`. **Done** — CoreAnnual obsolete `$153.99`.
2. Discover whether canonical $152.92 / $305.93 prices already exist. **They did not.** Created V2 under existing products.
3. Point UAT env at V2 suffixes. **Not executed** — next owner gate.
4. Reconcile the **existing** subscription `89pse8` to Pro Annual V2 `m754cd` only with later owner authorization. Same customer/subscription ids. Do not create a second subscription. Do not change `Tenant.Plan` first to hide drift.
5. Then re-sync tenant from provider price id.

Env mapping switch alone does **not** change portal product/amount on `89pse8`. After env remap, `TryMapPrice` will miss `3wkz62r6` and fall back to `custom_data` until the PATCH gate.

## Mutations this run

Sandbox catalog only: four new active prices. No `.env` edit, no subscription PATCH, no tenant SQL.
