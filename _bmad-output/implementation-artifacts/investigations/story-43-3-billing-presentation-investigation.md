# Investigation: Story 43.3 Billing presentation

## Hand-off Brief

1. **What happened.** Original 43.3 predates 38.1/38.4/38.5/39.4/43.1. Dual h1, background sync 503, nested `/settings/billing`, and named `billingConfigured` are already satisfied.
2. **Where the case stands.** Remaining delta is presentation: humanized plan/status, production-safe checkout-incomplete copy, Member ProductErrorState (stay), OnHold vs Suspended wording on the Billing surface, 390, and a portal owner-check hole.
3. **What's needed next.** Spec + implement that delta only. Do not rewrite Paddle or public Suspended.

## Case Info

| Field | Value |
| ----- | ----- |
| Ticket | 43.3 |
| Date opened | 2026-10-07 |
| Status | Concluded |
| System | Cohestra main `4c9b1593` |
| Evidence sources | Billing UI, BillingController, 38.1 helper, DESIGN.md content-language |

## Delta audit

| Original concern | Class | Evidence |
| ---------------- | ----- | -------- |
| Dual h1 | ALREADY SATISFIED | 38.5/43.1 PageHeader |
| `/settings/billing` nested | ALREADY SATISFIED | 43.1 |
| Background sync 503 | ALREADY SATISFIED | 38.1 `shouldRequestBillingProviderSync` |
| `billingConfigured` named state | ALREADY SATISFIED | BILLING_UNAVAILABLE_COPY |
| Explicit Refresh | ALREADY SATISFIED | InAppBillingPanel |
| Banners trial/past_due/on_hold | ALREADY SATISFIED | TenantShellService + BillingBannerBar role=status |
| Owner-managed invited Admin | ALREADY SATISFIED | resolveBillingSettingsAccess |
| Member stay-and-deny | ALREADY SATISFIED | 43.1; still a plain `<p>` |
| Paddle checkout architecture | ALREADY SATISFIED / PROTECTED | Do not rewrite |
| Scheduled cancel/change | ALREADY SATISFIED | InAppBillingPanel |
| Checkout ENVIRONMENT-BLOCKED | PARTIALLY TESTABLE | Local unconfigured named state; no live charge |
| Humanized status vs raw enum | STILL MISSING | Plan: Status: PastDue |
| Production-safe incomplete copy | STILL MISSING | sandbox 4242 + Notifications on `/settings/billing` |
| Paddle-return sandbox/dev copy | STILL MISSING | 4242 + localhost:8088 error |
| Member ProductErrorState | PARTIALLY SATISFIED | 43.2 pattern exists; Billing unused |
| OnHold vs Suspended on Billing page | PARTIALLY SATISFIED | Banner correct; page raw enum; public Suspended H1 is 43.4/43.5 |
| 390 billing e2e | STILL MISSING | |
| Complimentary page copy | PARTIALLY SATISFIED | Badge only |
| Portal owner authorization | STILL MISSING (BLOCKER) | POST portal skips EnsureBillingAccessAsync |

## Conclusion

**Confidence:** High

Smallest remaining 43.3: present plan, billing state, owner, and next action in plain language; gate sandbox/developer copy; ProductErrorState for Member (stay); portal owner check. Preserve 38.1 and 43.1.
