# Story 40.1 role / plan / state matrix

Date: 2026-10-03  
Owner: Grok 4.6. No entitlement or plan-gate changes.

## Role

| Role | Dashboard command center | Notes |
| --- | --- | --- |
| TenantAdmin | Full existing metrics, brief, queue, campaigns/website widgets as today | No new gates |
| TenantMember | Same rooms; campaign/website widgets remain 39.3-gated | No new gates |
| Operator (platform) | Not a tenant dashboard actor | Unchanged |

## Plan

| Plan | Empty-state copy | Supporting widgets |
| --- | --- | --- |
| Basic | Existing “Open your atelier” / Basic forever copy | Campaigns/website remain locked as 39.3 |
| Core | Existing Core workspace copy | Unchanged |
| Pro | Existing Pro workspace copy | Campaigns + website remain available |
| Enterprise | Falls through existing empty copy unless plan helpers treat it as Pro | Unchanged |

## View × data state

| State | Overview | Graphs | Table |
| --- | --- | --- | --- |
| Auth / metrics loading | Greeting + tabs + skeleton | Same shell, same skeleton | Same |
| Populated | Attention → follow-up → today → tiles/trend/performance | Attention → follow-up → today → graphs | Attention → follow-up → today → tables |
| No activities | Attention + follow-up remain; empty atelier copy in panel | Same | Same |
| Follow-up fetch error | Error + retry; never “all caught up” | Same | Same |
| Intelligence error | Alert in Needs attention; queue/metrics stay | Same | Same |
| Metrics complete error | `ProductErrorState` for every view | Same | Same |
| Onboarding | Checklist still above today when rules match | Same | Same |

## URL / preference

| Arrival | Stored preference | Shown view |
| --- | --- | --- |
| `/dashboard` | absent / corrupt | overview |
| `/dashboard` | `graphs` or `table` (or migrated `tables`) | stored |
| `/dashboard?view=table` | any | table |
| `/dashboard?view=kanban` | any | overview |
