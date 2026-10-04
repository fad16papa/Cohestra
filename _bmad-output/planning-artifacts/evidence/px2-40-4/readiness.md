# Story 40.4 implementation readiness

Date: 2026-10-04  
Baseline: `main` `327c0a4ace6864d83307c7e907cec54f22d7965d`  
Story 40.1 `done`. Story 40.2 `done`. Story 40.3 `done`. Epic 40 `in-progress`. Story 40.5 not started.

Workflow: `bmad-check-implementation-readiness` (Product Manager), story-scoped adaptation used by 40.2/40.3. Installed IR is the Phase-3 product facilitator; this evidence answers the Story 40.4 readiness questions.

## Verdict

**READY**

## Why READY

- Stories 40.2 and 40.3 are closed on `main` (`2b840322`, `4509866c`) and tracker `done`.
- Current Activities API, paging, sorting, filtering, archive, plan-cap, and role contracts are inventoried in `inventory.md` and `api-paging-contract.md`.
- Form Studio / Design Studio Draft-Published-editable and Archived-read-only behavior is recorded.
- Activity detail heading, archive dialog, publish confirmation, and cap-warning behavior are documented.
- No new API, schema, Opportunity scoring, tab, or room is assumed.
- Story 40.5 continuity crumbs are explicitly excluded.
- Architecture and rejected alternatives are locked in `architecture.md`.

## Required confirmations

| Check | Evidence |
| --- | --- |
| 40.2 / 40.3 closed | Sprint status + close notes on those story files |
| API / paging / sort / filter / archive / cap / roles | `inventory.md`, `api-paging-contract.md` |
| Form Studio / Design Studio | `inventory.md` §studios |
| Detail h1 / archive / publish / cap | `inventory.md` §detail |
| No invented API/schema/tab/room | `architecture.md`, `opportunity-boundary.md` |
| 40.5 excluded | Story file non-goals; no `40-5-*` sprint key |

## Gaps accepted as out of scope

- URL persistence of `page` → Story 40.5
- Adding `LastActivityId` to clients/Follow-up list → would be a new API; no evidence it exists
- Calendar FAB accessible name → 43.5
- Changing FilterSelect globally (Clients already shipped) — Activities applies local 44px classes
- Production DigitalOcean / seed mutation

## Do not start until

Story file exists (`_bmad-output/implementation-artifacts/40-4-activities-and-opportunities-as-category.md`) and architecture is recorded. Both are present.
