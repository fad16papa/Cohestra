# Investigation: Story 19.4 Paddle subscription interval switch 400

## Hand-off Brief

1. **What happened.** UAT `POST /api/v1/admin/billing/checkout` for Pro monthly → Pro annual returned HTTP 400 `Checkout unavailable` / `Could not update your subscription. Open Settings → Billing and try again.`
2. **Where the case stands.** Code-confirmed HIGH-CONFIDENCE hypothesis: `UpgradeExistingSubscriptionAsync` always sends `proration_billing_mode=prorated_next_billing_period`, which Paddle forbids for billing-frequency changes and for trials. Live Paddle error body was not inspected (no SSH).
3. **What's needed next.** Select proration mode from subscription status + frequency vs same-interval upgrade. Do not close 19.4. No UAT deploy from this investigation.

## Case Info

| Field | Value |
| ----- | ----- |
| Ticket | Story 19.4 UAT defect — subscription interval switch |
| Date opened | 2026-10-11 |
| Status | Active |
| System | `origin/main` `364fc5c6` (PR #439 merged). UAT runtime SHA unconfirmed. |
| Evidence sources | Source, Paddle official docs, user HTTP 400 |

## Problem Statement

Billing owner on `https://creativorare.uat.cohestra.app/billing/checkout?plan=pro&interval=monthly` switched an existing Pro subscription to annual. Same-tenant HTTPS return URLs. API 400 from the generic upgrade catch, not the return-URL validator.

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------ | ----- |
| User 400 title/detail | Available | Matches `UpgradeExistingSubscriptionAsync` catch |
| `PaddleBillingService` upgrade path | Available | Hard-coded `prorated_next_billing_period` |
| Paddle frequency-change docs | Available | Only `prorated_immediately`, `full_immediately`, `do_not_bill` |
| Paddle trial docs | Available | Item updates require `do_not_bill` |
| Live UAT SHA / API logs | Missing | Cloud agent cannot SSH |
| Live Paddle sandbox subscription | Missing | Do not mutate; owner console commands below |
| Return-URL defect | Refuted as this cause | Title would be `Invalid success URL` / `Invalid cancel URL` |

## Confirmed Findings

### Finding 1: Exact user-facing error is the upgrade catch

**Evidence:** `src/Infrastructure/Billing/PaddleBillingService.cs:515-519`

**Detail:** `catch (PaddleApiException)` logs `Paddle subscription upgrade failed for tenant` and throws the reported sentence.

### Finding 2: Frequency changes use a forbidden proration mode

**Evidence:** `PaddleBillingService.cs:507-511`; Paddle “Change billing frequency” docs

**Detail:** Immediate upgrades always send `immediately` + `prorated_next_billing_period`. Monthly → annual is a frequency change. Paddle allows only `prorated_immediately`, `full_immediately`, `do_not_bill` for that class.

### Finding 3: Trial updates also require `do_not_bill`

**Evidence:** Paddle “Work with trials” — proration does not apply in trial; `do_not_bill` is required.

**Detail:** `CanUpgradeExistingSubscription` includes `Trialing`. A trialing Pro monthly → annual uses the same forbidden mode.

### Finding 4: Monthly → annual is not deferred

**Evidence:** `TenantBillingPlanSync.ShouldDeferPlanChange` only defers plan downgrades and annual → monthly.

**Detail:** Pro monthly → Pro annual takes the immediate upgrade path.

### Finding 5: PR #439 is unrelated and is on main

**Evidence:** `origin/main` `364fc5c6` merge of #439

**Detail:** Return-URL allow-list is scheme/host/port. This 400 title is `Checkout unavailable`.

## Hypotheses

### Hypothesis 1: Unsupported proration mode

**Status:** Open (HIGH-CONFIDENCE)

**Would confirm:** API log `PaddleErrorCode` / HTTP 400 with proration validation detail.

**Would refute:** Paddle 409 scheduled-change, past_due, or wrong price ID.

### Hypothesis 2: Past-due or scheduled-change restriction

**Status:** Open (lower)

**Would confirm:** Live subscription `status=past_due` or `scheduled_change` set.

### Hypothesis 3: Return URL still failing

**Status:** Refuted

**Resolution:** Different ProblemDetails title.

## Missing Evidence — owner DigitalOcean Web Console (read-only)

Do not call checkout/update again. As `deploy` on the droplet:

```bash
cd /home/deploy/cohestra
git rev-parse HEAD
git log -1 --oneline
docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' \
  "$(docker compose -p cohestra-uat ps -q api)"
docker compose -p cohestra-uat logs api --since 48h 2>/dev/null \
  | grep -E 'Paddle subscription upgrade failed|Could not update your subscription' \
  | tail -20
```

Redact tokens, emails, customer IDs, and full Paddle bodies. Keep only timestamp, HTTP status, error code, sanitized detail, tenant slug.

Paddle sandbox (read-only dashboard): subscription status, item price ID, billing cycle, trial dates, scheduled change, currency, item count.

## Conclusion

**Confidence:** High on mechanism; Medium on the exact live Paddle code until logs arrive.

Root cause to fix: immediate subscription updates must choose a documented `proration_billing_mode` from status + frequency vs same-interval upgrade. Past-due and multi-item subscriptions must fail closed with an actionable message.

## Recommended Next Steps

Implement `PaddleSubscriptionChangePolicy`, wire `UpgradeExistingSubscriptionAsync`, keep deferred downgrades, sync checkout URL query with selected interval, add unit tests. Do not merge or deploy without owner authorization.
