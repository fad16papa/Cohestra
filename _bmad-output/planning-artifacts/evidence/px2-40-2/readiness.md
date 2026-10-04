# Story 40.2 readiness

Date: 2026-10-03  
Role: Product Manager (`bmad-check-implementation-readiness` story-level)  
Baseline: `main` `dc9e42f6`. Story 40.1 `done`. Epic 40 `in-progress`. Stories 40.3–40.5 not started.  
Disposition: **READY** (corrected contract 2026-10-03 — not a new readiness pass)

## Verdict

Existing client list API, follow-up date helper, outreach fields, shell primitives, and 40.1 dashboard links can supply the Follow-up room. The original “no new API” readiness is **corrected**: a backward-compatible `followUpCategory` + totals extension of `GET /api/v1/admin/clients` is required. No dedicated Follow-up endpoint. No new entitlement. Category derivation stays locked from authoritative production fields. Cinema scoring is excluded. No schema migration. Story 40.3 remains unstarted.

## Closed dependencies

| Story | Status | What 40.2 reuses |
| --- | --- | --- |
| 39.1 | done | `/follow-up` route, rail, stub to replace |
| 39.2 | done | Mobile Follow-up tab + `isFollowUpPath` |
| 39.3 | done | Follow-up always unlocked; no new lock |
| 39.4 | done | `PageHeader` h1 ownership, 44px actions |
| 39.5 | done | Unmatched `/follow-up/*` not-found |
| 40.1 | done | Dashboard View all → `/follow-up`; honest queue errors |

## Data / API inventory

| Need | Source | Sufficient? |
| --- | --- | --- |
| Working list | `fetchClients` pageSize 100 | Yes — paginate |
| Due now | `isFollowUpDue` + new/no outreach | Yes |
| At risk | `leadStatus === "inactive"` | Yes — no invented window |
| Opportunity | `contacted` or `new` with outreach | Yes — category, not a room |
| Healthy | remainder / `active` | Yes |
| Auth | `TenantOperator` | Yes — Admin + Member, all plans |
| Isolation | tenant-scoped clients query | Yes |
| Empty/loading/error | existing product primitives | Yes |
| Dashboard continuity | existing `/follow-up` hrefs + `?view=` module | Yes — do not edit |

## Existing states the room must distinguish

| State | Contract |
| --- | --- |
| Loading | Keep h1; named busy; no fake rows |
| Populated | Category text + client link |
| Global empty | “No one needs follow-up.” (Healthy may still exist) |
| Filter empty | “No one in {Category}.” |
| Recoverable error | Alert + Try again; never empty-success |
| Permission denial | Explicit access copy; not empty-success |

## Motion

`adminRouteTransitionKey` stays pathname-only. Category is query-only on `/follow-up`. Local 160ms or instant under PRM. No new tokens.

## Open questions

None. READY to implement.

## Explicitly not ready / not in this story

Story 40.3 Clients list/profile redesign. Story 40.4 Activities. Epic 41. Production deploy. Cinema engine.
