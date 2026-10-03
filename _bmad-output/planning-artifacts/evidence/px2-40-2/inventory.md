# Story 40.2 investigation inventory

Date: 2026-10-03  
Baseline: `main` `dc9e42f6f283c72b0be290768730bfcbe88b58b4`  
Owner: Grok 4.6  
Disposition: recorded before architecture and implementation

## Sources of truth

| Surface | Path | Today | 40.2 decision |
| --- | --- | --- | --- |
| `/follow-up` stub | `web/app/(admin)/follow-up/page.tsx` | `CanonicalRoomStub` empty copy “Follow-up queue comes next” | Replace with the room. Keep unmatched `[...unmatched]` → `InvokeNotFound`. |
| Canonical stub primitive | `web/components/layouts/canonical-room-stub.tsx` | Shared empty/loading for Follow-up and AI | Leave primitive; AI stub stays. |
| Dashboard Needs follow-up | `web/components/dashboard/dashboard-follow-up-queue.tsx` | Dual `fetchClients`: `followUpDue` + `leadStatus=new&withoutOutreach`, merge, slice 5. View all → `/follow-up`. Honest error. | Keep as concise preview. Do not change queries or `/follow-up` hrefs. |
| `ClientFollowUpPanel` | `web/components/clients/client-follow-up-panel.tsx` | Unused. Marks contacted. No dates/categories. | Do not import. Dead panel stays out of this room. |
| Profile follow-up date | `web/components/clients/client-follow-up-date-field.tsx` + `web/lib/client-follow-up-date.ts` | PATCH next follow-up; `isFollowUpDue` | Read-only context in the room. No date rewrite. |
| Outreach / status fields | `ClientListItem` in `web/lib/clients-api.ts`; `Client.cs` | `leadStatus`, `nextFollowUpAt`, `lastOutreachAt`, `lastOutreachKind`, `lastRegistrationAt`, `lastActivityName` | Authoritative list fields for the resolver. |
| Client list API | `GET /api/v1/admin/clients` · `ClientsController` · `ClientService` | Filters include `followUpDue`, `withoutOutreach`, `leadStatus`. `pageSize` max 100. `TenantOperator`. | Sufficient. Paginate unfiltered list. No new endpoint. |
| Category helpers | none in production | Cinema only: `web/lib/marketing/marketing-demo-club.ts` `getTriageBucket` / 6/7/4/17 | Do not import. New `web/lib/follow-up-category.ts`. |
| Auth | `TenantAuthPolicies.TenantOperator` | Admin + Member. Follow-up nav `ALWAYS_UNLOCKED`. | No new lock. Server remains authoritative. |
| Empty / loading / error | `PageHeader`, `ListSkeleton`, `ProductEmptyState`, `ProductErrorState` | Used by clients/campaigns/dashboard | Reuse. |
| Mobile card / desktop table | `ClientRow` + `clients-table-layout.ts` | Cards `sm:hidden`, grid `hidden sm:grid`, `min-w-[42rem]` | Do not reuse `ClientRow` (messenger/mark-contacted). New lighter follow-up rows. Breakpoints: cards <768, composition 768–1023, table ≥1024. |
| Epic 37 motion | `admin-route-motion.ts`, `.motion-local` 160ms, PRM zeros it | Pathname-only enter 280ms | Local 160ms only. Do not alter tokens. |
| 40.1 dashboard links | Queue, metrics tiles/table/graphs, today strip | href `/follow-up`, no query | Keep. Room default is Due now. |
| Skip / landmarks | `admin-skip-link.tsx`, `dashboard-layout.tsx` `main#main-content` | One main, skip works | Preserve. |
| Mobile nav current | `isFollowUpPath` prefix `/follow-up` | Tab + rail already current | Preserve. |
| Calendar FAB / dock | FAB `hidden md:block` z-40; tab bar z-30; main mobile padding 5.5rem + safe area | No mobile FAB overlap | Do not reduce padding. |

## Can existing APIs provide the room?

**Yes.** `ClientListItem` already carries `leadStatus`, `nextFollowUpAt`, and `lastOutreachAt`. Content-language §4 maps those fields to the four category names without cinema windows.

| Need | Existing? | Gap |
| --- | --- | --- |
| Due now | `isFollowUpDue(nextFollowUpAt)` or (`new` and no `lastOutreachAt`) | Same meaning as dashboard queue, computed on list fields |
| At risk | `leadStatus === "inactive"` once not Due now | Operator-authored quiet signal. No 21d window. |
| Opportunity | `contacted` or remaining `new` (has outreach) once not Due now | Conversation started, not a pipeline stage |
| Healthy | `active` (and remainder) once not Due now | Listable; excluded from needs totals |
| Counts | Client-side after one paginated list | `statusCounts` are tenant-wide and not category-aware — do not misuse them as category totals |
| Auth / isolation | TenantOperator + tenant-scoped query | Sufficient |
| Notes / referral | On `ClientDetail` only | Not required. Using them would recreate cinema heuristics. |

## Selected contract

**Existing production API + shared client-side resolver.** See `architecture.md`.

## Rejected during inventory

1. New `/api/v1/admin/follow-up` — visual convenience; second queue.
2. Import `getTriageBucket` — cinema scoring.
3. Dual-write / persist category — no schema rewrite; filtering must not change data.
4. Smallest server `category=` filter — unnecessary; list fields already suffice.
5. Fetch only the two dashboard queries — cannot list At risk / Opportunity / Healthy honestly.
6. Revive `ClientFollowUpPanel` — competing contacted-only model.
