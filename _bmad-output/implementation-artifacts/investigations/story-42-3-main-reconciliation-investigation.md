# Investigation: Story 42.3 vs current main (PR #387)

## Hand-off Brief

1. **What happened.** PR #387 is `CONFLICTING` / `DIRTY` against `origin/main` `65ebc140` because both branches edited `_bmad-output/implementation-artifacts/sprint-status.yaml` after shared merge-base `53bd0c11`.
2. **Where the case stands.** Overlap is tracker-only. #388 did not change Form Studio builder files that 42.3 edits. Reconciliation is a rebase onto current main plus a semantic sprint-status merge.
3. **What's needed next.** Rebase `cursor/story-42-3-form-studio-touch-controls-0fcb` onto `origin/main` and keep both `registration-responsive-tenant-website: done` and `42-3-form-studio-touch-and-builder-controls: review`.

## Case Info

| Field            | Value |
| ---------------- | ----- |
| Ticket           | Story 42.3 / PR #387 |
| Date opened      | 2026-10-05 |
| Status           | Active |
| Evidence sources | git merge-base, `git diff --name-status`, `gh pr view 387` |

## Problem Statement

GitHub reports PR #387 not mergeable after #388/#389 landed on main. Need to know whether conflicts are textual tracker noise or behavioral Form Studio overlap.

## Findings

### Finding 1: Non-mergeable because of tracker YAML only

**Confidence:** Confirmed  
**Evidence:** merge-base `53bd0c11`; overlap of `--name-only` vs `origin/main` is exactly `sprint-status.yaml`. PR `mergeable=CONFLICTING`.

### Finding 2: #388 did not edit 42.3 Form Studio builder files

**Confidence:** Confirmed  
**Evidence:** main-since-base files are registration renderer, persist gates, e2e/selectors, BMAD registration artifacts. 42.3 files are `form-composition-builder.tsx`, `builder-reorder-handle.tsx`, `builder-pointer-reorder.ts`, `website-section-fields.tsx`, 42.3 e2e/tests.

### Finding 3: Conflicts are textual, not behavioral

**Confidence:** Confirmed  
**Evidence:** both sides edit the Epic 42 block of `sprint-status.yaml`. 42.3 adds `42-3-…: review`. Main adds `registration-responsive-tenant-website: done` and a comment that 42.3 lives on the other branch.

**Resolution:** keep both keys; epic-42 stays `in-progress`; do not add 42.4 or epic-43.

## Deduction

Rebase onto current main is the correct strategy so the final PR diff is Story 42.3 only. No `ours`/`theirs` wholesale. No product/architecture change.
