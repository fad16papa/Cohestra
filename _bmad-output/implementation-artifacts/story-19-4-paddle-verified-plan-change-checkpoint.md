# Checkpoint preview — Story 19.4 Option A

**What changed:** Existing paid/trialing Core/Pro plan changes preview against Paddle, then PATCH the same subscription. Checkout overlay remains for first paid subscription.

**Look here first:**

1. Settings → Billing → Change plan → Pro Yearly: review dialog must show Current/New and only Paddle numeric rows. Confirm is **not** “Open Paddle Checkout”.
2. Preview error: confirm disabled; no PATCH.
3. Success without amount: “Yearly billing is active.” then billing refresh.
4. Basic → Pro still opens ordinary Paddle Checkout.

**Do not:** charge a sandbox card, deploy production, or close Story 19.4 from this checkpoint.

**Residual:** Live UAT SHA verification and authorized sandbox lifecycle still required after merge.
