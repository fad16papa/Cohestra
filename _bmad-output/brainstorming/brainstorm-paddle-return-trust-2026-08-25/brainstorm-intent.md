# Brainstorm intent — Paddle apex checkout return (production safety & trust)

**Date:** 2026-08-25  
**Topic:** Slug-free apex return hop (`cohestra.app/billing/paddle-return`) after Paddle checkout  
**Goal:** Decide if the hop is safe to ship, what the client may be trusted with, and what makes the paying operator feel the charge is real.

## Verdict

Safe to ship **for money**. Not safe to treat the hop as a trusted receipt.

Apex domain choice is acquitted: one Paddle Default payment link per environment cannot be `{slug}.cohestra.app`; server-built tenant URL from `PublicWeb.BaseUrl` plus `custom_data.tenant_id` (API-written) is the right production shape. HMAC webhooks and authenticated `SyncFromProvider` remain the only grant of plan state. `_ptxn` is not a login cookie and does not mint a JWT.

The production trust bug is **false success**, not the slug-free domain. `billing=success` is appended without checking `transaction.status`. Trusting the client does not grant a plan today; it grants an unearned success story. That story can be false.

Three layers to keep separate: (1) **money truth** = HMAC webhook + authenticated Paddle GET, never the client; (2) **navigation locator** = apex hop; (3) **felt receipt** = currently too weak because `billing=success` is unearned.

## Trust boundaries

**Trusted (server):** HMAC-signed webhooks; `custom_data.tenant_id` written with the server API key; tenant dashboard URL built server-side; `SyncFromProvider` re-fetches the transaction and rejects `tenant_id` mismatch; JWT tenant vs txn tenant.

**Not trusted (client):** `_ptxn`, `billing=success`, or any query flag as proof of capture; API JSON `redirectUrl` as an open hop (client follows whatever `http(s)` URL the same-origin fetch returns); React local plan state; auto-login from a payment id.

A leaked `txn_` at worst lands on the right club’s login wall. It must never become a skeleton key. Treat `_ptxn` like a password in logs, emails, and referrers.

## Felt legitimacy

Operators hire Paddle as the bank and Cohestra as the club OS. `ikigai.cohestra.app` is the product; `cohestra.app` is Cohestra Inc. An extra domain after typing a card feels like bait-and-switch, especially after the localhost SSL scar and in PH/SG distrust of payment rails.

The locator was hired for **closure**, not routing. Success is proven by a receipt that matches Paddle’s overlay, not by a query string.

**Ship condition for “feels legit”:** URL bar family matches the login host after at most one same-registrable-domain hop; workspace named aloud before the hop (“Taking you back to CreativoRare”); plan badge matches Paddle; invoice visible without hunting. Sequence: Paddle checkmark → Cohestra names plan and workspace → slug host already showing Pro Trialing.

If login is required after the hop, copy is “your Pro trial is already on this workspace”, not a blank login. Only the billing owner sees success; a member must not see a fake upgrade. Copy is “Confirming with Paddle…” until status is completed — never green SUCCESS before capture. If something failed, say the card was not charged before retry.

## Implementation constraints (chosen direction)

Keep architecture: apex `/billing/paddle-return` as hosted-checkout fallback; overlay `onCompleted` stays on the tenant host and bypasses the apex hop when JS works.

- **Gate redirect** on Paddle status `completed`, `billed`, or `paid`. Otherwise pending copy — no `billing=success` on draft/canceled.
- **Pin destination** to `TenantPublicWebUrlBuilder` only (`*.cohestra.app` in prod; `{slug}.localhost` locally). Client must re-validate host suffix. Never `?next=`. Never mix schemes (https apex → https slug).
- **Never auto-login from txn.** Never mint a session from a payment id.
- **Plan badge** only from server shell after sync/webhook. Dashboard ignores unsigned `billing=success`. Name the param `checkout_return_ref`; never call it a session that grants a plan.
- **Silent return page:** no third-party scripts, zero analytics, `referrer-policy: no-referrer`. No marketing interstitial.
- **Never encode a tenant** in Paddle merchant-dashboard Default payment link settings; encode it only in signed `custom_data`.
- **Overlay-first:** keep the operator on `{slug}.cohestra.app` the whole time; apex is for the hosted-checkout refugee only.
- **If `custom_data.tenant_id` is missing,** do not `ApplyTransaction` onto the logged-in tenant.
- **Rate-limit** anonymous Paddle `GetTransaction` lookups (txn-oracle: 200 vs 404 enumerates existence; unlimited GET burns quota / proxies).

UAT must screenshot the URL bar at Paddle, apex, and slug host — trust lives there.
