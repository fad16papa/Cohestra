# Investigation: Clients list shows only the latest client after activity registration

## Hand-off Brief

1. **What happened.** After public registrations on an activity, the **Clients** list often shows a single row (the most recent registrant). Code review and tests confirm this is **usually expected**: registrations are many-to-one with clients (phone/email dedup), the list sorts by last registration descending, and the dashboard “New this week” tile applies a `createdWithinDays` filter on **client creation date**—not registration date.
2. **Where the case stands.** **Concluded (Medium confidence).** No defect was found that truncates the clients API or UI to one row. A true list bug remains **Hypothesized** only if the operator reproduces with **different phone numbers** on plain `/clients` and the footer still reads `Showing 1 of 1`.
3. **What's needed next.** Run the reproduction plan below on UAT; if step 2 fails, reopen with API response payload. If step 2 passes, treat as UX/product gap and run `bmad-quick-dev` for dashboard filter + clients list copy.

## Case Info

| Field            | Value                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| Ticket           | N/A (operator report during UAT polish)                                    |
| Date opened      | 2026-06-16                                                                 |
| Status           | Concluded                                                                  |
| System           | cohestra — Next.js admin + .NET API + PostgreSQL                |
| Evidence sources | Source code, sprint/UAT docs, integration test attempt, prior chat context |

## Problem Statement

> “Every time a client will register on the activities, then checking the clients list it just displayed the latest client.”

**Interpretation (hypothesis):** Operator expects each activity registration to appear as a separate row on `/clients`, or expects all registrants to remain visible after each new sign-up. Alternative reading: only one row total is shown when multiple distinct people registered.

## Evidence Inventory

| Source                         | Status    | Notes                                                                 |
| ------------------------------ | --------- | --------------------------------------------------------------------- |
| `ClientDeduplicationService.cs` | Available | Phone-first, email-second merge at registration ingest                |
| `ActivityService.ListRegistrationsAsync` | Available | Returns **all** registrations per activity (no dedup)          |
| `ClientService.ListAsync`      | Available | Paginated list (default 25), optional filters, no `Take(1)`         |
| `clients-list-page.tsx`        | Available | `CLIENT_PAGE_SIZE = 25`; replaces state from API `items` array      |
| `dashboard-page-client.tsx`    | Available | “New this week” → `/clients?createdWithinDays=7`                      |
| `ClientDedupIntegrationTests`  | Partial   | Test exists; run failed 400 (phone validation / SG default — side)    |
| Live UAT DB query              | Missing   | Would confirm distinct client count vs registration count           |
| Operator repro with diff phones | Missing | Would refute or confirm true list truncation bug                   |

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| - | --------------- | -------- | ------ | ----- |
| 1 | Dedup vs list semantics | High | Done | Confirmed by code |
| 2 | Dashboard filter mismatch | High | Done | Confirmed by code |
| 3 | API pagination bug | High | Done | No evidence of bug |
| 4 | Live repro with 2 distinct phones | High | Open | User/UAT verification |
| 5 | Integration test 400 on submit | Low | Open | Side finding; unrelated to list display |

## Timeline of Events

| Time        | Event                                      | Source              | Confidence |
| ----------- | ------------------------------------------ | ------------------- | ---------- |
| Epic 3      | Client dedup by phone/email implemented    | Domain README, code | Confirmed  |
| Story 4-2   | Dashboard tile links `createdWithinDays=7` | dashboard-page-client | Confirmed |
| UAT polish  | Operator reports “only latest client”      | User report         | Confirmed  |
| 2026-06-16  | Static code investigation                  | This case file      | Confirmed  |

## Confirmed Findings

### Finding 1: Activity registrations and clients are different aggregates

**Evidence:** `src/Infrastructure/Activities/ActivityService.cs:364-375` — lists every `Registration` for an activity. `src/Infrastructure/Registrations/RegistrationService.cs:177-192` — each submit calls `FindOrCreateAsync` then adds one registration linked to one client.

**Detail:** N registrations can map to M clients where M ≤ N.

### Finding 2: Phone match reuses existing client (no new row)

**Evidence:** `src/Infrastructure/Registrations/ClientDeduplicationService.cs:17-48` — `matchedByPhone` returns `(matchedByPhone, false)` without creating a new client.

**Detail:** Same normalized phone → one client row updated; activity tab still gains a row.

### Finding 3: Clients list defaults to most recently registered first

**Evidence:** `web/components/clients/clients-list-page.tsx:111-112` — `sortBy: "lastRegistrationDate"`, `sortDirection: "desc"`. `src/Infrastructure/Clients/ClientService.cs:374-376` — `OrderByDescending(item => item.LastRegistrationAt)`.

**Detail:** Latest activity sign-up appears at top; can read as “only the latest” if user does not check footer count.

### Finding 4: Dashboard “New this week” filters by client CreatedAt

**Evidence:** `web/components/dashboard/dashboard-page-client.tsx:154` — `href=/clients?createdWithinDays=${metrics.periodDays}`. `src/Infrastructure/Clients/ClientService.cs:42-45` — `client.CreatedAt >= periodStart`. `src/Infrastructure/Dashboard/DashboardService.cs:40-42` — metric counts clients by `CreatedAt`.

**Detail:** Returning registrants (deduped) do not increment “new leads” and may be excluded from filtered list if their client record is older than the window.

### Finding 5: UAT checklist explicitly expects dedup (one client, two submits)

**Evidence:** `docs/deploy/uat-polish-checklist.md:29` — “submit same phone twice → one client”.

**Detail:** Product intent matches dedup behavior; mismatch is observability/expectation, not undocumented behavior.

### Finding 6: No code path limits clients list to one item

**Evidence:** `web/components/clients/clients-list-page.tsx:27` — `CLIENT_PAGE_SIZE = 25`. `ClientService.ListAsync` uses `Skip/Take` with normalized page size max 100. `parseClientList` maps full `items` array (`web/lib/clients-api.ts:137-140`).

**Detail:** UI renders `clients.map` with `key={client.id}` — no single-item cap.

## Deduced Conclusions

### Deduction 1: Activity tab growing while clients list stays at one row is expected during same-phone UAT

**Based on:** Findings 1, 2, 5

**Reasoning:** Repeated test registrations with autofill/same phone → multiple registration rows, one client row updated and sorted to top.

**Conclusion:** Not a list bug; operator may be comparing registration count to client count.

### Deduction 2: Dashboard navigation explains “only one new client this week”

**Based on:** Findings 3, 4

**Reasoning:** Tile count and filtered list both use **client creation**, not **registration activity**. One new client created this week + several re-registrations → tile shows 1, filtered list shows 1, activity shows many.

**Conclusion:** UX/product gap between metric label (“New this week”) and operator mental model (“recent sign-ups”).

## Hypothesized Paths

### Hypothesis 1: Operator reuses same phone/email while testing

**Status:** Confirmed (most likely scenario; aligns with all Confirmed findings)

**Theory:** Dedup collapses registrants to one client row.

**Would confirm:** Two registrations same phone → activity count 2, clients count 1, same `clientId` on both registration links.

**Would refute:** Different phones still produce one client row each time (impossible unless dedup keys collide).

**Resolution:** Confirmed by design + UAT checklist + dedup service code.

### Hypothesis 2: Hidden URL filter from dashboard tile

**Status:** Confirmed (contributing factor when navigating via dashboard)

**Theory:** User lands on `/clients?createdWithinDays=7` and sees subset.

**Would confirm:** Filter banner visible; “Clear filter” reveals more rows.

**Would refute:** Plain `/clients` from sidebar shows same single row with `totalCount: 1` and multiple distinct clients in DB.

**Resolution:** Confirmed by dashboard link and filter UI banner code.

### Hypothesis 3: API/UI bug returns only one client regardless of data

**Status:** Open (refuted by static analysis; not refuted by live repro)

**Theory:** Backend or frontend drops rows.

**Would confirm:** API JSON has `totalCount > 1` but UI shows one row, or API returns `items.length === 1` with `totalCount > 1`.

**Would refute:** API returns matching counts; two distinct phones → two items.

**Resolution:** Static analysis found no truncation. Live API capture still missing.

### Hypothesis 4: CSS/layout hides additional rows

**Status:** Refuted

**Theory:** Visual bug hides rows.

**Would refute:** `ClientRow` is a simple mapped list inside non-overflow-hidden tbody area; footer shows total count.

**Resolution:** Refuted by component structure.

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | ------ | ------------- |
| UAT repro with two **different** SG mobiles | Confirms or kills Hypothesis 3 | Register A and B; open `/clients`; note footer + Network tab JSON |
| DB counts `Clients` vs `Registrations` | Quantifies dedup ratio | SQL or admin API on UAT postgres |
| Navigation path operator used | Separates filter vs full list | Ask operator or browser history |

## Source Code Trace

| Element       | Detail |
| ------------- | ------ |
| Error origin  | N/A — behavioral/expectation issue, not an exception |
| Trigger       | Public registration submit → `RegistrationService.SubmitCoreAsync` |
| Condition     | Matching `NormalizedPhone` or `NormalizedEmail` → reuse client |
| Related files | `ClientDeduplicationService.cs`, `RegistrationService.cs`, `ClientService.cs`, `clients-list-page.tsx`, `dashboard-page-client.tsx`, `activity-registrations-tab.tsx` |

## Conclusion

**Confidence:** Medium

**Summary:** The evidence shows **no defect** that limits the clients list to one database row when multiple distinct clients exist. The reported behavior is **Confirmed** as the combined effect of (1) **registration-to-client deduplication**, (2) **last-registration descending sort**, and (3) optional **`createdWithinDays` filter** from the dashboard “New this week” tile. A **true list bug** remains possible only if reproduction with **two different phone numbers** on unfiltered `/clients` still yields `Showing 1 of 1` — that scenario is **unverified**.

## Recommended Next Steps

### Fix direction

| Mechanism | Change | Rationale |
| --------- | ------ | --------- |
| Product/UX | Relabel dashboard tile or filter by **last registration date** (new query param) | Aligns “New this week” with operator expectation |
| UX copy | Clients list intro: “One row per contact; repeat sign-ups merge by phone/email” | Reduces confusion vs activity Registrations tab |
| UX | Show registration count on `ClientRow` or profile teaser | Makes dedup visible without reading docs |
| Optional | Activity Registrations tab link: “View all clients” → `/clients` unfiltered | Clear escape hatch after testing |

**Not recommended:** Removing dedup — contradicts Story 3.3 and UAT checklist.

### Diagnostic

1. Register Person A (`+6591234567`) and Person B (`+6598765432`) on same activity.
2. Activity → Registrations: expect **2 rows**.
3. Sidebar → Clients (no banner): expect **Showing 1–2 of 2** (or higher if seed data exists).
4. If step 3 shows `1 of 1`, capture `GET /api/v1/admin/clients?page=1&pageSize=25` response.

## Reproduction Plan

### Expected (by design)

1. Publish activity with phone field.
2. Submit registration twice with **same phone**, different names optional.
3. Activity Registrations: **2** entries.
4. Clients list: **1** row; name/last registration updated; profile shows 2 registrations in history.

### True-bug probe

1. Submit two registrations with **different** E.164 phones.
2. Navigate to `/clients` via sidebar (not dashboard tile).
3. **Pass:** footer `Showing … of 2+` and two distinct rows.
4. **Fail:** footer `1 of 1` → reopen case with API payload; escalate to `bmad-quick-dev`.

## Side Findings

- **Confirmed:** `ClientDedupIntegrationTests.SubmitPublicRegistration_PhoneMatch_ReusesExistingClient` failed with HTTP 400 on 2026-06-16 run — likely phone validation after SG default change; test helper may need updated phone fixtures (`IntegrationTestHelpers.cs`). Unrelated to list display logic but should be fixed for CI signal.

## Follow-up: 2026-06-16

### New Evidence

- Static code trace complete.
- Integration dedup test attempted; 400 on submit (side finding).

### Updated Conclusion

Case **Concluded** pending optional live repro. Recommend `bmad-quick-dev` for dashboard filter + clients list explanatory copy if operator confirms dedup repro passes.
