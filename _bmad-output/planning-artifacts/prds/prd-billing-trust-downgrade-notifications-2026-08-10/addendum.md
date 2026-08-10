---
title: Billing trust & downgrade notifications addendum
status: final
created: 2026-08-10
updated: 2026-08-10
parent_prd: prd-in-app-billing-2026-08-09
related_prd: prd-cohestra-enterprise-2026-07-15 (FR-24)
---

# PRD addendum — Billing trust, in-app downgrades, and notification matrix

Documents shipped behavior after PR #166 and follow-up hardening (Aug 2026). Does **not** replace the enterprise PRD — extends FR-24 and supersedes stale open items in the in-app billing PRD.

## Shipped: in-app plan changes (no Stripe Checkout redirect)

| Flow | Behavior |
|------|----------|
| Basic → Core/Pro | Stripe Checkout (or saved-card subscribe in-app) |
| Core → Pro upgrade | In-app subscription update; prorated on next invoice |
| Pro → Core downgrade | Stripe Subscription Schedule at period end; **in-app confirm + toast** |
| Monthly ↔ yearly (same tier) | Yearly **now** (prorated); monthly **at period end** for both Core and Pro |
| Cancel subscription | Cancel at period end in Settings → Billing |

**Principle:** Hosted Stripe Checkout only when establishing a new paid subscription or adding a card. Existing subscribers change plan via Stripe API + in-app UX.

## Shipped: billing trust UX

- Checkout validates same-plan, scheduled-change guard, downgrade limit warnings (API-sourced limits)
- `GET /api/v1/admin/billing` returns usage, Core/Pro limits, scheduled plan fields
- Checkout response includes server-side `warnings[]` for downgrades
- Settings → Billing: **Undo scheduled downgrade** (distinct from **Keep subscription**)
- Settings → Billing: confirm dialogs before **Cancel at period end** and **Undo scheduled downgrade**
- Checkout: inline **Undo scheduled change** on scheduled-change banner (no Settings detour required)
- Checkout: confirm dialog before any deferred change (tier downgrade or yearly→monthly)
- Symmetric action labels: **Switch to {plan} now** / **at period end** for Core and Pro
- Dashboard toast from `billing_message` after in-app plan changes

## Email notification matrix (Aug 2026)

| Event | Sent? | Audience | Frequency / trigger |
|-------|-------|----------|---------------------|
| Trial ending | Yes | `AdminContactEmail` | Daily while trialing & ≤7 days left (max 1/day) |
| Payment past due | Yes | Admin contact | Daily while `PastDue` |
| Workspace on hold | Yes | Admin contact | Every 7 days while `OnHold` |
| Basic dormancy | Yes | Admin contact | Once at day 83 idle |
| **Downgrade scheduled** | **Yes** | Billing owner email | **Once** at schedule time |
| **Downgrade reminder** | **Yes** | Billing owner email | **7 days and 1 day before switch**, only if usage exceeds target plan limits |
| **Downgrade applied** | **Yes** | Billing owner email | **Once** when scheduled plan takes effect |
| Pay-for-downgrade reminder | **No** | — | Not applicable — Stripe renews existing subscription at lower price |

Emails enqueue via billing outbox (`billing.notification`); links use tenant-scoped `/settings/billing` URLs.

## Explicit non-goals

- No recurring “pay for downgrade” emails (no separate charge at schedule time)
- No Stripe Customer Portal link from tenant admin UI (in-app billing PRD)
- Downgrade confirmation does not replace in-app banner/toast — email is audit trail

## Supersedes (in-app billing PRD open items)

- ~~Plan downgrade scheduling UI deferred~~ → **Shipped** via `/billing/checkout` + cancel scheduled change in Settings → Billing

## Follow-ups (not in this addendum)

- Email when scheduled downgrade is **cancelled**
- Show scheduled billing interval in billing panel
- Stripe webhook/sync boundary when subscription price already switched before tenant plan row updates
