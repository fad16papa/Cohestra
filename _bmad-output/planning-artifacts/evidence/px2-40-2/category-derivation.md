# Story 40.2 category derivation contract

Date: 2026-10-03  
Owner: Grok 4.6  
Status: locked before implementation

## What this is

A **presentation resolver** over existing authoritative production fields. It is not a score, not a persisted column, not a sales stage, not an activity type, and not the cinema engine.

Content-language §4 forbids invented numeric windows and cinema 6/7/4/17 rules. It also says Phase 1 does not invent a scoring model. This resolver only labels rows so the four named filters can list people using fields operators already maintain.

## Authoritative inputs

From `ClientListItem` + tenant registration timezone:

| Field | Production meaning |
| --- | --- |
| `nextFollowUpAt` + `isFollowUpDue(..., timeZoneId)` | Due today or overdue in the tenant calendar (same helper as profile / dashboard due pill) |
| `lastOutreachAt` | Whether any recorded outreach exists on the list row |
| `leadStatus` | `new` / `contacted` / `active` / `inactive` — existing operator semantics, unchanged |

Do **not** use: cinema `isDueNow` / `isAtRisk` / `isOpportunity`, 72h, 21d, notes, referral keywords, fixture activity IDs, or seed counts.

## Algorithm (first match)

```
if isFollowUpDue(nextFollowUpAt, timeZoneId)
   OR (leadStatus === "new" AND lastOutreachAt == null):
    Due now
else if leadStatus === "inactive":
    At risk
else if leadStatus === "contacted" OR leadStatus === "new":
    Opportunity
else:
    Healthy
```

`new` without outreach is Due now (action now).  
`new` with outreach, or `contacted` without a due date, is Opportunity (conversation started, not a pipeline).  
`inactive` without a due date is At risk (operator-marked quiet relationship).  
`active` without a due date is Healthy (current).  
Any due/overdue date wins over status so “action now” is not buried.

## Totals

| Total | Includes | Excludes |
| --- | --- | --- |
| Needs follow-up / needs attention | Due now + At risk + Opportunity | Healthy |
| Category chip count | That category only | — |
| Global empty | Needs-attention count === 0 | Healthy may still be > 0 |
| Filter empty | Selected category === 0 **and** needs-attention count > 0 | — |

Healthy remains listable when its filter is selected.

## Filtering must not write

Changing `?category=` never calls PATCH lead-status, next-follow-up, or outreach. The resolver is read-only.

## Alignment with Dashboard

Dashboard Needs follow-up preview continues to use server filters `followUpDue=true` and `leadStatus=new&withoutOutreach=true`. Room Due now uses `isFollowUpDue` + `lastOutreachAt` on the list payload so one function is unit-testable.

Known residual: server `followUpDue` uses tenant start-of-tomorrow UTC; client `isFollowUpDue` uses calendar keys. Server `withoutOutreach` uses coverage event types; the list exposes `lastOutreachAt`. Do not “fix” those in 40.2. Document only. Do not import cinema to paper over the difference.

## Forbidden

- Persisting the category
- Dual-writing a second queue
- Hidden thresholds or points
- Treating Opportunity as `/opportunities` or a CRM stage
- Using cinema seed 6/7/4/17 as production expectations
