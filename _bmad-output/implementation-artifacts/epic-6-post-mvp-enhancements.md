# Epic 6: Post-MVP Enhancements

Status: done  
Completed: 2026-06-22  
Baseline commit: `793a2cd`

## Summary

Brownfield enhancements shipped after Epic 5 MVP closure: operator-managed **Communities** and **Categories** catalogs, catalog-driven activity filters and create flow, form editor layout polish, client outreach UX fixes, and campaign/consent hardening discovered during production use.

## Stories

| Story | Title | Status |
|-------|-------|--------|
| 6-1 | Communities and categories catalog | done |
| 6-2 | Activities catalog filter dropdowns | done |
| 6-3 | Form field editor responsive layout | done |
| 6-4 | Client outreach and timeline UX | done |
| 6-5 | Campaign consent and delivery hardening | done |

## Key deliverables

### 6-1 — Communities and categories catalog
- Backend: `Community`, `Category` entities, services, admin APIs, migration seed from existing activity labels
- Frontend: `/activities/communities`, `/activities/categories`, community lead view, Activities nav submenu
- Client list community filter wired to catalog names

### 6-2 — Activities catalog filter dropdowns
- All Activities page: category and community filters use catalog dropdowns (not free text)
- `GET /api/v1/admin/activities` accepts optional `community` query param

### 6-3 — Form field editor responsive layout
- Two-panel editor: ordered field list + scrollable properties panel (fixed height)
- Mobile: stacked layout; desktop: side-by-side
- Live preview in bounded scroll container

### 6-4 — Client outreach and timeline UX
- Relationship timeline fixed height with scroll
- WhatsApp follow-up save disabled until status or note changes (prevents duplicate timeline spam)
- Toast deduplication for identical messages
- Clients list column alignment polish

### 6-5 — Campaign consent and delivery hardening
- Consent fields on tennis/pickleball form templates
- Migration backfill for legacy clients with email
- Campaign send blocked reason helper text; improved SendGrid error parsing
- SendGrid env wiring in compose/docker

## Out of scope (see deferred-work.md)

- PRD/architecture formal amendment for catalog model (activities still store community/category as strings)
- Automated tests for Epic 6 paths
- SendGrid domain authentication (operator DNS task)

## Next recommended BMad workflows

- `[CC]` **Correct Course** — if catalog model should become first-class FK references in PRD
- `[RS]` **Retrospective** — optional `epic-6-retrospective` after operator UAT
- `[NFR]` **Audit NFR evidence** — before wider production rollout
