---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-cohestra-enterprise-2026-07-15/prd.md
  - docs/marketing/pricing-tiers.md
  - _bmad-output/planning-artifacts/research/market-lead-generation-crm-saas-research-2026-06-14.md
workflowType: research
lastStep: 6
research_type: market
research_topic: Cohestra Enterprise introductory pricing and annual plan market penetration
research_goals: Validate $29/$79 monthly and $290/$790 annual intro pricing; assess Core–Pro gap for marketing; recommend go-to-market price presentation and future list-price transition
user_name: Admin
date: 2026-07-16
web_research_enabled: true
source_verification: true
---

# Market Research: Cohestra Enterprise Pricing Penetration

**Date:** 2026-07-16  
**Author:** Admin  
**Research Type:** Market — pricing & competitive positioning  
**Product:** Cohestra Enterprise (multi-tenant community-event CRM)

---

## Executive Summary

**Question:** Is it reasonable to market **Core $290/year** and **Pro $790/year** (introductory USD pricing)?

**Short answer:**

| Dimension | Verdict | Confidence |
|-----------|---------|------------|
| **Annual discount structure** ($290 / $790 = 2 months free) | **Yes — industry standard** | High |
| **Core $290/year vs market** | **Reasonable** for CRM+capture; weak vs free event-only tools | Medium |
| **Pro $790/year vs market** | **Reasonable** vs à-la-carte stack; **tight** vs Luma Plus alone | Medium |
| **Core → Pro gap ($500/year)** | **Large absolute jump** — main marketing risk, not the annual math | High |

**Recommendation:** **Launch with $29/$79 monthly and $290/$790 annual**, but **market annual as monthly equivalent** ($24/mo and $66/mo billed annually). Monitor Pro conversion from Core; if upgrade rate is low after 10+ tenants, test **Pro intro at $69/mo ($690/yr)** before adding a middle tier.

---

## Table of Contents

1. [Research scope](#research-scope)
2. [Pricing math audit](#pricing-math-audit)
3. [Competitive landscape](#competitive-landscape)
4. [Customer willingness to pay](#customer-willingness-to-pay)
5. [Core vs Pro gap analysis](#core-vs-pro-gap-analysis)
6. [Annual vs monthly marketing](#annual-vs-monthly-marketing)
7. [Registration economics (Q5 preview)](#registration-economics-q5-preview)
8. [Strategic recommendations](#strategic-recommendations)
9. [Sources](#sources)

---

## Research scope

**ICP:** Community clubs, fitness studios, hobby groups — 1–5 operators, multiple free/low-cost activities per month, APAC-friendly but **USD billing**.

**Positioning:** Post-registration CRM (client list, dedup, follow-up, campaigns) — **not** ticketing/discovery like Peatix/Luma.

**Hypothesis pricing (intro):**

| Tier | Monthly | Annual (2 mo free) | Effective monthly (annual) |
|------|---------|-------------------|----------------------------|
| Core | $29 | $290 | $24.17 |
| Pro | $79 | $790 | $65.83 |

**Target list (future):** Core $39/mo, Pro $99/mo — not evaluated for launch; penetration first.

---

## Pricing math audit

### Annual discount is consistent — not the problem

| Plan | 12 × monthly | Annual | Savings | Discount % |
|------|-------------|--------|---------|------------|
| Core | $348 | $290 | $58 | **16.7%** |
| Pro | $948 | $790 | $158 | **16.7%** |

Industry benchmark: **16.7–20%** annual discount, commonly framed as **“2 months free”** or **“pay for 10, get 12”** ([Buildology SaaS benchmarks](https://buildology.ai/tools/saas-pricing-benchmarks/), [Dodo Payments annual billing guide](https://dodopayments.com/blogs/annual-vs-monthly-billing-saas)).

**Conclusion:** $290 and $790 are **not inconsistent with each other**. Both apply the same annual logic. The perceived “huge difference” is the **$500/year spread between tiers** ($790 − $290), not a broken annual formula.

### Tier ratio

| Ratio | Value | SaaS norm |
|-------|-------|-----------|
| Pro / Core (monthly) | 2.72× | Typical good/better: **2–3×** |
| Pro / Core (annual) | 2.72× | Same — structurally sound |
| Absolute annual gap | **$500/yr** | Feels large on pricing page |

---

## Competitive landscape

### Event platforms (discovery + pages)

| Product | Model | Annual-ish cost | CRM pipeline |
|---------|--------|-----------------|--------------|
| [Peatix](https://help.organizer.peatix.com/en/support/solutions/articles/44001821779-peatix-pricing) | Free for free events; ~4.9% + per-ticket on paid | **$0/mo** for free-only clubs | Weak |
| [Luma Plus](https://luma.com/pricing) | **$59/mo billed annually** (~$708/yr); 14% off vs monthly | **~$708/yr** | Calendar/events, not master CRM |
| [Eventually Essentials](https://www.eventuallyticketing.com/pricing) | **$190/yr** (2 mo free); 3 seats, 10 events/mo | **$190/yr** | Attendee data, not activity-CRM |
| [Eventually Growth](https://www.eventuallyticketing.com/pricing) | **$490/yr**; 5 seats, 50 events | **$490/yr** | Same |
| [Eventually Pro](https://www.eventuallyticketing.com/pricing) | **$1,690/yr** | **$1,690/yr** | Same |

**Cohestra placement:**

- **Core $290/yr** sits **above** Eventually Essentials ($190) but **below** Growth ($490) — justified **only if CRM + dedup + cross-activity client list is the headline**.
- **Pro $790/yr** sits **above** Eventually Growth ($490) and **near Luma Plus ($708)** — must sell **website builder + campaigns + 3 seats + CRM** as a bundle, not “another event page.”

### CRM / email (post-registration stack)

| Product | Relevant annual cost | Gap vs Cohestra |
|---------|---------------------|-----------------|
| [Mailchimp Essentials](https://mailchimp.com/landers/pricing/essentials/) | ~$156/yr (500 contacts) → ~$540/yr (2,500 contacts) | Email only |
| [HubSpot Starter](https://www.hubspot.com/products/crm/starter) | ~$108–240/yr/seat (promo-dependent) | Not activity-led |

**À-la-carte “Pro equivalent” stack:**

```
Luma Plus (events)     ~$708/yr
Mailchimp (2.5k)       ~$540/yr
Google Forms           $0
─────────────────────────────
Visible stack          ~$1,248/yr
Cohestra Pro           $790/yr  → ~37% below stack
```

**Conclusion:** Pro $790 is **marketable as a bundle saving** vs stacking tools. Core $290 is **harder** vs Peatix $0 or Eventually $190 unless CRM pain is explicit.

### RegFox (registration + CRM mention)

[RegFox](https://www.regfox.com/pricing) Standard is **$0/mo + per-registrant fees**; Professional is **$499/mo billed annually** (~$5,988/yr) — enterprise event scale. Cohestra is **not** competing at RegFox Pro price point.

---

## Customer willingness to pay

From prior research (`market-lead-generation-crm-saas-research-2026-06-14.md`):

- **Price barrier:** Free Google Forms + manual spreadsheet labor is the default.
- **Mitigation:** Quantify **5–10 hrs/week** admin time; $290/yr ≈ **$0.79/day** — easy ROI if even 1–2 hrs/month saved.
- **CRM fear zone:** Generic CRM “useful tiers” **$50–890/mo** feel heavy; Cohestra Core at **$29/mo** stays in SMB comfort band ([Buildology median B2B SaaS $25–45/mo](https://buildology.ai/tools/saas-pricing-benchmarks/)).

**Pilot WTP (recommended before list-price increase):**

- Ask 3–5 clubs: “Would you pay $29/mo for one client list across all QR activities?”
- Ask Pro candidates: “Would you pay $79/mo vs keeping Forms + Mailchimp + Instagram link-in-bio?”

---

## Core vs Pro gap analysis

### Why $500/year feels “huge”

On a pricing page, customers compare **absolute dollars**:

| Display | Core | Pro | Gap |
|---------|------|-----|-----|
| Annual total | $290 | $790 | **+$500** |
| Monthly equiv. | $24/mo | $66/mo | **+$42/mo** |

The **2.72× ratio is normal**, but **+$42/mo effective** is a psychological step for volunteer-run clubs.

### What Pro adds (must justify gap)

| Feature | Core | Pro | Approx. standalone value |
|---------|:----:|:---:|--------------------------|
| Email campaigns | — | ✓ | Mailchimp ~$45/mo at scale |
| Website builder | — | ✓ | Luma-like storefront |
| Seats | 1 | 3 | +$15/seat add-on value |
| Registrations | TBD cap | Unlimited | Peace of mind |

**Marketing rule:** Never compare Pro to Core alone on the pricing page. Compare Pro to **“Forms + spreadsheet + Mailchimp + Linktree”** (~$45–100/mo effort + tools).

### Options if Pro upgrade rate is low (Phase 2 tests)

| Option | Core | Pro | Pros | Cons |
|--------|------|-----|------|------|
| **A — Keep (recommended launch)** | $29 / $290 | $79 / $790 | Clear good/better; strong stack savings story | Large sticker gap |
| **B — Narrow Pro** | $29 / $290 | **$69 / $690** | Smaller jump (+$33/mo); closer to Luma | Less revenue per Pro tenant |
| **C — Bridge “Growth” tier** | $29 | **$49** | Smooth ladder | Scope creep; delays MVP |
| **D — Annual-only discount on Core** | $290 | $790 | — | Pro still feels 2.7× |

**Recommendation:** Start with **Option A** + marketing framing (below). Revisit **Option B** after 10 paying tenants if Core→Pro upgrade &lt; 15%.

---

## Annual vs monthly marketing

### Do market $290 / $790 — but not as the hero number

Best practice: frame annual as **monthly equivalent** ([Dodo Payments](https://dodopayments.com/blogs/annual-vs-monthly-billing-saas)):

| Tier | Primary display | Secondary display |
|------|-----------------|-------------------|
| Core | **$24/mo** billed annually | $290/year — save $58 |
| Pro | **$66/mo** billed annually | $790/year — save $158 |

Use **“2 months free”** not “17% off” — converts better.

### Suggested annual discount at launch

| Discount | Core annual | Pro annual | Notes |
|----------|-------------|------------|-------|
| **2 mo free (current)** | $290 | $790 | **Recommended** — industry default |
| 1 mo free (8%) | $319 | $869 | Weak annual pull |
| 3 mo free (25%) | $261 | $711 | Aggressive; hurts LTV early |

**Verdict:** **Keep $290 / $790.** The numbers are **reasonable and standard**; fix **presentation**, not necessarily the price points.

---

## Registration economics (Q5 preview)

Deferred full model; directional notes for plan caps:

| Cost driver | Notes |
|-------------|-------|
| PostgreSQL row storage | Low per registration at v1 scale (100 tenants / 100k clients) |
| SendGrid email | Confirmation + campaigns scale with Pro tier |
| Redis cache | Per-tenant namespaced; modest |
| Operator time | Support burden scales with confused free-tier users |

**Working hypothesis:** Core soft cap **500 reg/mo** is defensible **after** pilots show median club volume; **do not enforce at launch** until data exists (per PRD Q5).

---

## Strategic recommendations

### Launch pricing (penetration)

| Tier | Monthly | Annual | Market as |
|------|---------|--------|-----------|
| **Core** | $29 | **$290** | “Less than $1/day for one client list” |
| **Pro** | $79 | **$790** | “Replace $100+/mo tool stack” |

### Grandfathering (Q2 — still needs pilot data)

| Policy | Recommendation |
|--------|----------------|
| Intro rate lock | **12 months from first paid invoice** at intro rate |
| List price transition | Notify **30 days** before; apply to new signups first |
| Never | Silent price increase on existing tenants without notice |

### GTM pricing page changes

1. Show **monthly equivalent** for annual plans prominently.
2. Add **“Save $58 / $158 — 2 months free”** under annual toggle.
3. Pro column: **“vs ~$1,200/yr stacking Luma + Mailchimp”** footnote.
4. Core column: **not** “vs Peatix free” — lead with **Forms chaos** ROI.

### Metrics to watch (first 90 days)

| Metric | Target | Action if miss |
|--------|--------|----------------|
| Trial → paid (Core) | ≥ 25% | Test $24/mo intro or extend trial |
| Core → Pro upgrade | ≥ 15% within 90 days | Test Pro at $69/mo |
| Annual mix | ≥ 30% of paid | Increase annual default on Checkout |
| Churn after month 1 | &lt; 8% monthly | Interview churned pilots |

### List price transition (Phase 3)

When pilots validate WTP:

| Tier | Intro (now) | List (hypothesis) | Increase |
|------|-------------|-------------------|----------|
| Core | $29/mo | $39/mo | +34% |
| Pro | $79/mo | $99/mo | +25% |

Increase **Pro slower than Core** if upgrade funnel is weak (preserve Pro value gap).

---

## Sources

- [Buildology — SaaS Pricing Benchmarks 2025](https://buildology.ai/tools/saas-pricing-benchmarks/)
- [Dodo Payments — Annual vs Monthly Billing](https://dodopayments.com/blogs/annual-vs-monthly-billing-saas)
- [Shun Akayama — SaaS Annual Pricing Discounts](https://shunakayama.com/saas-annual-pricing-discounts/)
- [Luma Pricing](https://luma.com/pricing)
- [Eventually Ticketing Pricing](https://www.eventuallyticketing.com/pricing)
- [Peatix Organizer Pricing](https://help.organizer.peatix.com/en/support/solutions/articles/44001821779-peatix-pricing)
- [RegFox Pricing](https://www.regfox.com/pricing)
- [Mailchimp Essentials](https://mailchimp.com/landers/pricing/essentials/)
- [HubSpot Starter](https://www.hubspot.com/products/crm/starter)
- Cohestra prior research: `_bmad-output/planning-artifacts/research/market-lead-generation-crm-saas-research-2026-06-14.md`

---

*Research complete. Feeds PRD §13.9 and pricing page presentation updates.*
