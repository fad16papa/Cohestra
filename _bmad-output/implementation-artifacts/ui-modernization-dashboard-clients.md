---
status: implemented
layout: spacious
uat_sentence: "I could hand this to my team tomorrow."
---

# UI Modernization — Dashboard + Clients (Spacious)

Frontend-only refresh aligned with party-mode wireframes. No API or backend changes.

## Dashboard (Spacious)

- Greeting header from operator email + time-of-day
- Quick actions: clients, new campaign, reports
- Four metric tiles (existing metrics API) with fade-in + hover lift
- Two-column: activity performance cards + top activities sidebar
- Recent campaigns table (campaigns list API, delivery icons)

## Clients (card-row hybrid)

- Initials avatar beside name
- Left green border + hover lift on row
- Status column alignment preserved (`clients-table-layout.ts`)
- Chevron nudge on hover

## Data sources (unchanged)

| UI section | API |
|------------|-----|
| Metrics | `GET /api/v1/admin/dashboard/metrics` |
| Activity performance | `activityPerformance[]` on same endpoint |
| Recent campaigns | `GET /api/v1/admin/campaigns?pageSize=5` |
| Clients list | `GET /api/v1/admin/clients` |
