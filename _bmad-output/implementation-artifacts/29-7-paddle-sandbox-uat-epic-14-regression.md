---
status: done
story_id: 29.7
story_key: 29-7-paddle-sandbox-uat-epic-14-regression
---

# Story 29.7: Paddle sandbox UAT — Epic 14 process regression

Status: done (adapter + automated coverage landed; operator screenshot pass is remaining evidence)

## Story

As a **platform operator**,
I want **to walk the original billing process against Paddle sandbox**,
so that **we prove the swap before unblocking Epic 19**.

## Automated coverage

Infrastructure tests cover: first checkout + trial disclaimer, one-trial immediate charge, complimentary skip, saved-card in-app subscribe, webhook HMAC, plan unlock, PastDue, cancel→Basic, portal reject complimentary, details card/invoices, cancel-at-period-end, resume, undo scheduled change.

## Operator sandbox walk (record date + screenshots or log excerpts)

Use local Docker with Paddle sandbox keys, four `pri_` prices, and a tunnel to `/api/v1/system/paddle/webhook`.

Paddle Checkout **Default payment link** (sandbox): Paddle **forces HTTPS**. `https://localhost:8088` cannot work (no TLS). Use `https://{ngrok-host}/billing/paddle-return` and `NEXT_PUBLIC_PADDLE_RETURN_ORIGIN` — [paddle-sandbox-local-checkout.md](../../docs/deploy/paddle-sandbox-local-checkout.md). Production: `https://cohestra.app/billing/paddle-return`. Never a tenant slug.

Catalog must match the 2026-08-23 launch list (PRD §13.3): Core **$14.99 / $152.92**, Pro **$29.99 / $305.93**, **30-day trial** on all four paid prices. Annual is **14.99% off** 12× monthly — not the sandbox $153.99 / $306.99 drafts.

1. Basic signup — no checkout
2. Core monthly checkout — trial, card required, plan unlocks, webhook + sync
3. One-trial rule — second upgrade has no free trial
4. Settings → Billing — contact, card last4, invoices
5. Add/update card via the existing entry point
6. Cancel at period end — access remains; scheduled Basic visible
7. Resume — cancel cleared
8. Downgrade / interval change — scheduled fields + period-end apply
9. Failed payment (sandbox) — PastDue path starts (`DelinquencyStartedAt`)
10. Complimentary tenant — no checkout/portal; jobs skip
11. Member — no billing CTAs

## Sprint

Epic 29 is `done`. Epic 19 is `in-progress` again. Story 19.4 is Paddle droplet UAT, not Stripe.
