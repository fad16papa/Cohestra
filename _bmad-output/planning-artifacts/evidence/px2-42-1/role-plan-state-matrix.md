# Story 42.1 role / plan / state matrix

| Actor/state | UI | Fetch | Checkout |
| --- | --- | --- | --- |
| Shell loading | named loading | no | no |
| Missing / null / unknown plan | pending | no | no |
| Basic TenantAdmin | Core UpgradePanel | no | yes (existing) |
| Basic TenantMember | ask-admin lock | no | no |
| Core/Pro/Enterprise TenantAdmin | editor | yes | n/a |
| Core/Pro/Enterprise TenantMember | editor (TenantOperator) | yes | n/a |
| Role 403 | ProductErrorState | attempted only if UI thought open | no |
| API `plan_locked` | UpgradePanel | denied | admin only |
| API error | error + retry | no write | no |
| Empty/populated/dirty/saving/saved | truthful toolbar | existing autosave | n/a |
| Preview | latest draft | no publish | n/a |
| Publish/revert success or failure | persistent status | existing endpoints | n/a |
| Tour active | skippable non-modal | n/a | n/a |
| Suspended/OnHold | existing read-only | unchanged | unchanged |
