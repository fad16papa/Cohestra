# Story 40.1 readiness

Date: 2026-10-03  
Role: Product Manager (`bmad-check-implementation-readiness` story-level)  
Baseline: `main` `2350bdbd`. Epic 39 done. Stories 39.1 and 39.4 done. Story 40.2 not started.  
Disposition: **READY**

## Verdict

Existing Dashboard APIs and components can supply the command-center hierarchy and three views. No new API. No open PO decision. URL/history/preference rules are already specified in DESIGN D18.

## Closed dependencies

| Story | Status | What 40.1 reuses |
| --- | --- | --- |
| 39.1 | done | `/dashboard` room, `/follow-up` stub destination, desktop rail |
| 39.4 | done | `PageHeader` h1 `Dashboard`; greeting is supporting copy |

## Data / API inventory

| Need | Source | Sufficient? |
| --- | --- | --- |
| Metrics, trend, lead breakdown, activity performance | `GET` via `fetchDashboardMetrics` | Yes |
| Follow-up due / new without outreach | `fetchClients` (`followUpDue`, `leadStatus=new`) | Yes |
| Needs-attention insights | `fetchIntelligenceBrief` | Yes — do not move generation |
| Activity existence / onboarding | `fetchActivities` + `dashboard-onboarding` | Yes |
| Community pulse | `fetchCommunities` | Yes |
| Plan / role | `useTenantShell` | Yes — Basic/Core/Pro/Enterprise, admin/member already branch empty copy and campaign/website widgets |
| View preference | `localStorage` `cohestra.dashboard.viewMode` | Yes — must become query-aware |

## Existing states

| State | Today | 40.1 owner |
| --- | --- | --- |
| Auth/metrics loading | Greeting + skeleton | Keep; apply to every view |
| Complete metrics error | `ProductErrorState` + retry | Keep for all views |
| No activities | `DashboardEmptyState` + brief | Keep; still show Needs attention |
| Populated | Widget pile + local view switcher | Reorder; URL views |
| Intelligence loading/error/empty | Brief has own states | Keep; error ≠ all caught up |
| Follow-up loading | Skeleton | Keep |
| Follow-up fetch failure | **Defect:** treated as empty success | Must become an error |
| Onboarding checklist | Shown from metrics + activity count | Preserve |
| Plan-specific empty | Basic/Core/Pro copy | Preserve |

## Motion

`adminRouteTransitionKey` is pathname-only. Query-only `view` changes must stay on `/dashboard` so Epic 37 does not remount the page or replay enter motion.

## Open questions

None. READY to implement.
