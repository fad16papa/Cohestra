# Trace — Story 43.3 Billing presentation

| Thread | Domain | Summary | UI | Copy | Test |
| ------ | ------ | ------- | -- | ---- | ---- |
| BILLING STATE | `BillingStatus` | Tenant shell `billingStatus` | PlanStatusCard | `describeBillingStatus` | billing-status-copy + panel + Playwright injected |
| ROLE | `TenantBillingAccess` + `resolveBillingSettingsAccess` | owner / owner-managed / denied | ProductErrorState / owner-managed paragraph / panel | tenant admins only / managed by | settings-billing-page-content + portal 403 + Playwright |
| PROVIDER CONFIG | `billingConfigured` | GET summary, no background POST | named status | BILLING_UNAVAILABLE_COPY | billing-api + 38.1 e2e |
| CHECKOUT RETURN | `billing=incomplete` / paddle-return | 38.1 reconcile on legitimate return | status notice | CHECKOUT_INCOMPLETE_COPY; sandbox extras gated | billing-status-copy + incomplete Playwright |
| TRIAL | `trialEndsAt` | remaining days only while Trialing | role=status | Trial — n days left | panel unit + Playwright |
| PAST DUE | PastDue | action required | role=alert | Payment is past due. | copy + Playwright |
| ON HOLD | OnHold | read-only billing | role=alert | Billing is on hold. | copy + Playwright; Suspended not rewritten |
| PORTAL | POST /billing/portal | owner before unconfigured | Manage payment hidden for non-owner | managed by | BillingIntegrationTests |

Zero orphan ACs vs SPEC CAP-1–CAP-12.
