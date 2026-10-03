# Story 40.2 security and tenant isolation

Date: 2026-10-03  
Owner: Grok 4.6

## Authorization

- Room fetch uses the existing `GET /api/v1/admin/clients` contract (`TenantOperator`).
- No new endpoint, plan lock, or client-side privilege grant.
- TenantMember can view the room and open permitted `/clients/{id}` links. Team/Billing/settings admin surfaces are not added.
- 401/403 from the list API become `FollowUpAccessError` from **status**, not from problem-detail text. Permission UI has no fake empty and no retry that pretends success.

## Tenant isolation

- The room cannot select another tenant. It only calls `authFetch` on the current session’s clients list.
- Playwright isolation: default tenant client ids vs `px2-basic` client ids do not overlap.
- Filtering is in-memory and never PATCHes lead status, next follow-up, or outreach.

## Honesty / data

- Incomplete pagination (`merged.size < totalCount`) fails closed as a recoverable error.
- A later page failure discards the partial list.
- Fetch error copy is locked and never “No one needs follow-up.”

## Cinema / scoring

- Production resolver does not import `marketing-demo-club` predicates, 6/7/4/17 counts, 72h, or 21d windows.
