# Story 40.4 — before / after ordering

Date: 2026-10-04

## Before (`327c0a4a`)

Default `GET /api/v1/admin/activities` = `UpdatedAt DESC` only.

`ArchiveAsync` sets `UpdatedAt = UtcNow`. A just-archived activity becomes the first row of page 1 even when Draft and Published exist later in the same result set or on later pages.

No `Id` tie-break. Equal timestamps can reshuffle.

## After

Unfiltered list:

1. Archived last
2. Requested primary sort (default `UpdatedAt DESC`)
3. `Id` ASC

Filtered `status=archived|draft|published` is truthful for that status. `Id` tie-break still applies.

## Proofs

- `ActivityServiceListSortTests.ListAsync_DefaultUnfiltered_PlacesArchivedAfterActionableRows`
- `ActivityServiceListSortTests.ListAsync_UnfilteredPaging_DoesNotLeadWithArchivedWhileActionableExists`
- `ActivityServiceListSortTests.ListAsync_EqualUpdatedAt_UsesIdAscendingTieBreak`
- `ActivityServiceListSortTests.ListAsync_ArchivedFilter_RemainsTruthfulAndSorted`
- `activities-40-4-contract.test.ts` defaultListPlacesArchivedLast
- Playwright `default order keeps Archived after actionable rows`
