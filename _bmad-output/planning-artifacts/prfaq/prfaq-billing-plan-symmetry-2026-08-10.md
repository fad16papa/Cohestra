---
title: PRFAQ — Symmetric Core/Pro billing
status: final
created: 2026-08-10
concept_type: commercial product
---

# Press release (internal)

**Cohestra makes Core and Pro plan changes predictable**

Today, Cohestra workspace admins on Core or Pro can change plan or billing interval without leaving the app. Plan upgrades and yearly billing apply immediately; tier downgrades and monthly switches after yearly billing wait until the current period ends. The same rules apply whether you are on Core or Pro — no special cases, no Stripe Portal detours.

# Customer FAQ

**Q: I’m on Pro yearly and switch to monthly. When does it take effect?**  
A: At the end of your current yearly period. Same rule as Pro→Core.

**Q: I’m on Core and upgrade to Pro. Is that immediate?**  
A: Yes, with prorated billing on your next invoice.

**Q: Can I undo a scheduled change from checkout?**  
A: Yes — use **Undo scheduled change** on the checkout banner or in Settings → Billing.

# Internal FAQ

**Q: Why defer interval downgrades?**  
A: Parity with tier downgrades and Stripe best practice — customers keep paid entitlements until period end.

**Q: What triggers limit warnings?**  
A: Tier downgrades only (usage vs target tier limits). Interval-only changes do not warn.

**Q: Risk?**  
A: Users accustomed to immediate yearly→monthly credit may notice delay — mitigated by clear copy and confirm dialog.
