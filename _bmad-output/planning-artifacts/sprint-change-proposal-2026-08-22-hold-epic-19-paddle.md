---
generated: 2026-08-22
project: cohestra
author: Party + brainstorm (Paddle merchant swap)
status: proposed
awaiting_approval: true
baseline: main @ 9d03770
change_scope: moderate
issue_type: merchant-replacement-blocks-launch
---

# Sprint Change Proposal — Hold Epic 19; Paddle replaces Stripe

## Section 1: Issue Summary

### Problem statement

Production launch (Epic 19) assumed **Stripe** as the merchant. The company cannot use Stripe (PH-registered entity, SG-built product, global buyers). Admin has a **Paddle sandbox** account and wants Paddle as the sole payment/subscription merchant. Continuing Epic 19.4 as Stripe UAT would waste ops time and lock the droplet to a dead provider.

### Triggering context

| Source | Finding |
|--------|---------|
| Admin decision | Drop Stripe entirely; use Paddle; do not change billing process |
| Epic 14 + in-app billing | Fully Stripe-coupled (`StripeBillingService`, webhooks, Elements, Portal) |
| Live revenue | None — no customer migration of `cus_` / `sub_` IDs |
| Epic 19 | 19.1–19.2 in progress / ops pending; 19.4 still “Stripe billing UAT” |

### Decision

1. **Hold Epic 19** (all stories 19.1–19.5) until Epic 29 is done.
2. **Add Epic 29** — Paddle billing migration, adapter-only.
3. After 29.6, **rewrite Story 19.4** to Paddle sandbox/live UAT on the droplet.

## Section 2: Impact

| Artifact | Change |
|----------|--------|
| `sprint-status.yaml` | Epic 19 → `blocked`; Epic 29 stories → `backlog` |
| `epics-cohestra-enterprise.md` | Epic 29 appended; 19.4 annotated as blocked pending 29 |
| Launch checklist / droplet docs | Updated in Story 29.6 (not this proposal) |

## Section 3: What does not change

Tenant billing **process**: Basic free signup; Core/Pro checkout + 30-day trial; one trial; complimentary skip; Settings → Billing; portal; period-end cancel/downgrade; resume; scheduled change; PastDue → OnHold → Archive; trial reminders; banners; plan gates.
