# Story 40.4 — Opportunity boundary

Date: 2026-10-04

Opportunity is a Follow-up category from Story 40.2 (`due-now` / `at-risk` / `opportunity` / `healthy`). It is not an activity status, tab, route, pipeline stage, or score.

## Must not exist after this story

- Activities nav item or filter named Opportunity
- `/opportunities`
- Opportunity activity type or status
- Cinema 6/7/4/17 or any scoring import
- Change to 40.2 category derivation

## Source links

| Surface | Activity relationship today | 40.4 action |
| --- | --- | --- |
| Follow-up list | `lastActivityName` text only | **No link.** Fabricating a route from a name is dishonest. |
| Client list | `lastActivityName` text only | Unchanged |
| Client registration history | `activityName` text; `activityId` exists on the history DTO but is not linked in UI | **Do not add a new profile link in this story** (40.5 continuity). Preserve the DTO. |
| Activity card | `/clients?activityId={id}` | Preserve |
| Activity registrations | `/clients/{id}` | Preserve |

If a future story adds `LastActivityId` to the clients list, Follow-up may then link to `/activities/{id}`. That field does not exist now.
