---
baseline_commit: 793a2cd
---

# Story 6.1: Communities and Categories Catalog

Status: done

## Story

As an operator,
I want to manage Communities and Categories from the admin console,
So that activities and client filters use consistent labels I control.

## Acceptance Criteria

1. **AC-6.1.1 — Catalog CRUD**
   - **Given** I am authenticated as admin
   - **When** I create, rename, or delete a community or category
   - **Then** the catalog updates and activity counts reflect usage

2. **AC-6.1.2 — Community leads view**
   - **Given** a community with registered clients
   - **When** I open the community detail page
   - **Then** I see searchable/filterable leads for that community

3. **AC-6.1.3 — Activity create uses catalogs**
   - **Given** catalogs exist
   - **When** I create an activity
   - **Then** community and category are selected from dropdowns (not free text)

## Implementation notes

- Migration `20260621160613_AddCommunitiesAndCategories` seeds from distinct activity labels
- Activities still persist `CommunityLabel` and `Category` strings (not FK) — rename propagates via service layer
- Delete blocked when activities still reference the label

## Dev Agent Record

### Completion Notes

- Backend: `CommunityService`, `CategoryService`, controllers, client community filter
- Frontend: list pages, nav submenu, create-activity dropdowns, community detail leads table
