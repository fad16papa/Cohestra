# Party — Story 43.3 Billing presentation

Date: 2026-10-07  
Cast: John (PM), Sally (UX), Winston (Architect)  
Question: smallest remaining Billing presentation change that makes plan, payment, trial, OnHold, and provider-unavailable immediately understandable without altering Paddle.

---

📋 **John:** First glance must answer plan, state, attention, who can act, next action. Past due is action required. OnHold is “Billing is on hold,” never “Workspace paused.” Incomplete checkout must not teach production customers a sandbox card.

🎨 **Sally:** Keep Settings chrome. Do not duplicate the shell banner as a second giant card. Hierarchy: Billing h1 → plan/status → attention/action → management. Trialing is calm (role=status). Past due/OnHold can be alert. Member stays on URL with ProductErrorState. 390 wraps; 44px actions.

🏗️ **Winston:** Consume 38.1 reconcile helper. No second React billing state machine. Close the portal owner hole so invited admins cannot open the owner’s Paddle portal. Sandbox copy gated by paddle environment, not shown by default.

---

## Resolved direction

Humanize Billing presentation on the existing summary. Production-safe checkout-incomplete and paddle-return copy. Reuse ProductErrorState for Member stay-and-deny. Keep owner-managed invited Admin. Add portal `EnsureBillingAccessAsync`. Do not rewrite Paddle, pricing, or public Suspended.
