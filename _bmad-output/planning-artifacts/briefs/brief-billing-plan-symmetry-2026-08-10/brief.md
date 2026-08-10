---
title: Billing plan symmetry (Core ↔ Pro)
status: final
created: 2026-08-10
updated: 2026-08-10
---

# Product brief — Symmetric Core/Pro plan changes

## Problem

Paid workspace admins on **Core** or **Pro** experienced inconsistent plan-change behavior: tier downgrades deferred to period end with warnings, but yearly→monthly switches applied immediately. Copy used “upgrade” vs “downgrade” language that felt plan-specific rather than rule-based.

## Goal

One rule set for **both** paid tiers:

| Change type | Timing | Applies to |
|---|---|---|
| Tier upgrade (e.g. Core→Pro) | Immediate + proration | Core, Pro |
| Tier downgrade (e.g. Pro→Core) | Period end | Core, Pro |
| Yearly→monthly (same tier) | Period end | Core, Pro |
| Monthly→yearly (same tier) | Immediate + proration | Core, Pro |

## Success criteria

- Core and Pro tenants see the same checkout banners, confirm dialogs, and action labels for equivalent change types.
- Annual→monthly on either tier schedules via Stripe Subscription Schedule (no immediate price drop).
- Scheduled-change guards consider **plan + interval**, not plan alone.

## Non-goals

- Changing Basic cancel flow.
- Stripe Customer Portal.
- Deferring tier upgrades (Core→Pro stays immediate).

## Open follow-ups

- Email when a scheduled change is cancelled.
- Show scheduled billing interval in Settings summary line.
