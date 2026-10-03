# Story 40.2 category derivation contract

Date: 2026-10-03  
Owner: Grok 4.6  
Status: corrected — **server authoritative**; first-match meanings unchanged

## What this is

A **read-only classification** over existing authoritative production fields. It is not a score, not a persisted column, not a sales stage, not an activity type, and not the cinema engine.

Content-language §4 forbids invented numeric windows and cinema 6/7/4/17 rules. Phase 1 does not invent a scoring model.

## Authority

`ClientService` is the only implementation used to filter Follow-up pages and compute category totals.

The web helper `resolveFollowUpCategory` remains a documented mirror for captions and unit-level meaning checks. The Follow-up room must not download the tenant and re-derive counts or membership. Consumer-boundary tests prove the room sends `followUpCategory` and reads `followUpCategoryCounts`.

## Authoritative inputs

| Field | Production meaning |
| --- | --- |
| `NextFollowUpAt` vs tenant start-of-tomorrow UTC (`RegistrationPeriod.GetStartOfTomorrowUtc`) | Due today or overdue in the tenant calendar — same window as existing `followUpDue` |
| Outreach coverage events (`ClientOutreachCoverage.FollowUpCoverageEventTypes`) | Whether any recorded outreach exists (`LastOutreachAt == null` on the list row) |
| `LeadStatus` | `new` / `contacted` / `active` / `inactive` — existing operator semantics, unchanged |

Do **not** use: cinema `isDueNow` / `isAtRisk` / `isOpportunity`, 72h, 21d, notes, referral keywords, fixture activity IDs, or seed counts.

## Algorithm (first match)

```
if NextFollowUpAt is due/overdue in the tenant calendar
   OR (leadStatus === new AND no recorded outreach):
    Due now
else if leadStatus === inactive:
    At risk
else if leadStatus === contacted OR leadStatus === new:
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
| Category chip count | That category only (server) | — |
| Selected-category `totalCount` | Selected category only | Other categories and other pages |
| Global empty | Needs-attention count === 0 | Healthy may still be &gt; 0 |
| Filter empty | Selected category total === 0 **and** needs-attention count &gt; 0 | — |

Healthy remains listable when its filter is selected.

Totals are tenant-scoped (and scoped to any additional list filters if those are also present). The Follow-up room sends no extra list filters.

## Filtering must not write

Changing `?category=` or `?page=` never calls PATCH lead-status, next-follow-up, or outreach.

## Alignment with Dashboard

Dashboard Needs follow-up preview continues to use server filters `followUpDue=true` and `leadStatus=new&withoutOutreach=true`. Room Due now uses the same due window (`GetStartOfTomorrowUtc`) plus New-without-outreach. Do not import cinema to paper over preview vs room slice differences. The preview remains a 5-row widget, not the room’s category engine.

## Forbidden

- Persisting the category
- Dual-writing a second queue
- Hidden thresholds or points
- Treating Opportunity as `/opportunities` or a CRM stage
- Using cinema seed 6/7/4/17 as production expectations
- A second client-side count/filter engine over a downloaded tenant
