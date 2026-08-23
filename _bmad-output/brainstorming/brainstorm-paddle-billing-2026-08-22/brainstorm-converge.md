# Paddle swap — converge (2026-08-22)

## Must do (Epic 29 — in order)

1. **29.1** Provider spine (config, domain IDs, webhook ledger, DI)
2. **29.2** Checkout + trial (same journeys, Paddle checkout URL)
3. **29.3** Webhooks + tenant sync (same BillingStatus machine)
4. **29.4** In-app billing details + payment method (same screens)
5. **29.5** Portal + period-end cancel / resume / scheduled change
6. **29.6** Stripe excision (packages, copy, env, docs, tests, rewrite 19.4)
7. **29.7** Sandbox UAT of the unchanged Epic 14 process

## Must not do

- New plans, new prices, usage billing, multi-currency products
- New billing screens or a redesigned Settings → Billing IA
- Dual-running Stripe + Paddle
- Epic 19 droplet work until 29.7 is signed off

## Hold

Epic 19 evidence ladder (19.1→19.5) is **blocked**. Story 19.4 becomes Paddle billing UAT after 29.6.
