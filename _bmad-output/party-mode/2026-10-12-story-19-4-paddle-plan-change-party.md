# Party — Story 19.4 Paddle-verified plan change

**Date:** 2026-10-12  
**Mode:** session (Grok 4.6 voices John, Sally, Winston). Composer not used.  
**Question:** How should Cohestra show a Paddle-backed review for Pro Monthly → Pro Yearly without creating a second subscription?

---

📋 **John:** Owner already told us the confirm dialog is fine. The break is the next beat: they tap "Switch to yearly now" and the money move is done before they ever see Paddle. That's not a bug report. That's a trust gap. Don't "fix" it by throwing them into a second Checkout. We already have one subscription. Two would be a product failure.

🎨 **Sally:** They're not asking for Paddle chrome. They're asking to see the bill. Generic "Paddle will calculate the credit when you confirm" is a promise, not a receipt. If we can put credit, due now, currency, next renewal, and new recurring amount on that same dialog *from Paddle*, the overlay is optional. Fake numbers are worse than none. If preview is empty, we keep generic copy — we do not invent SGD.

🏗️ **Winston:** Read the provider path. Checkout overlay with `items` **creates a subscription**. Paddle even says customers can have many. We store one `PaddleSubscriptionId`. Option C is a duplicate-entitlement gun. Customer portal deep links are view / cancel / update card. Not "replace Pro monthly with Pro yearly." Seller dashboard can do it; customers cannot. Official same-subscription sequence is `PATCH …/preview` then `PATCH …/{id}` with the same body. We already PATCH. We just skip preview. That's the hole.

📋 **John:** So hosted portal is out for this matrix. Fine. Manage payment stays portal. Plan change stays in Cohestra, but the numbers are Paddle's.

🎨 **Sally:** Flow I want: Change plan → select Pro Yearly → **Review billing change** (provider lines) → Cancel or Confirm yearly billing → PATCH → "Yearly billing is active" with invoice/txn only if Paddle returned it. Do not bounce them through a fake checkout that isn't modifying this subscription.

🏗️ **Winston:** Safety: preview is read-only. Confirm must send the **same** price_id and `proration_billing_mode` as the preview. Webhook `subscription.updated` remains source of truth. If PATCH payment fails, Paddle `prevent_change` (default) leaves the old plan. Past due: Paddle will not preview — keep our reject and send them to payment-method update on the **same** subscription transaction. Trials: `do_not_bill`; preview should show no charge. Annual→monthly stays deferred. New Basic→paid stays Checkout. Do not calculate proration in C#.

📋 **John:** Rank: (1) same-sub hosted portal if it could do the matrix — it can't; (2) preview + confirm + PATCH; (3) current direct PATCH with better copy. We take (2). Ship that, not a second subscription that "looks like Paddle."

🎨 **Sally:** After success, don't dump them on a silent billing page. One completion state. If we don't have a txn id yet, say yearly is active and invoices will appear — don't fabricate.

🏗️ **Winston:** No sandbox mutation until this is implemented and the owner authorizes a new Pro Monthly→Yearly. UAT is still on `364fc5c6` anyway.

---

**Consensus (not softened):** Option A. Same subscription. Preview before PATCH. Checkout preserved for new subscriptions only. Portal not used for catalog switches.
