# Investigation: Story 19.4 — Billing contact phone not persisted

## Confirmed defect

`UpdateBillingContactAsync` validates `phoneCountry` / `phoneLocal` then calls Paddle `UpdateCustomer` with **email + name only**. `FetchPaddleContactAsync` always returns `Phone: null`. After Save, `loadDetails()` shows "—".

## Provider constraint

Paddle Billing Customer update supports name, email, status, custom_data, locale. **No first-class phone.** Do not invent a Paddle phone field.

## Architecture

- Paddle remains source of truth for name, email, customer/subscription identity.
- Cohestra owns `Tenant.BillingContactPhone` as nullable E.164.
- Empty `phoneLocal` clears the local field.
- #444: request email still ignored; `AdminContactEmail` unchanged.
- #445: no billing.notification enqueue.

## Not in this fix

Subscription PATCH, catalog, env price mappings, old-price archival.
