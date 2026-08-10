---
baseline_commit: dd60a8d
---

# Story billing-b1: Interval-only cancel confirm warning

Status: done

## Story

As a **tenant admin** canceling at period end,
I want **the confirm dialog to describe interval-only scheduled changes clearly**,
So that **I understand canceling also removes a pending switch to monthly/yearly billing on the same plan tier**.

## Acceptance Criteria

- [x] **AC1** Pro annual with scheduled Pro monthly → cancel confirm mentions **monthly billing**.
- [x] **AC2** Pro→Core scheduled → cancel confirm still names **Core**.
- [x] **AC3** No pending paid schedule → cancel confirm has no extra scheduled-change sentence.

## Tasks

- [x] Use `hasPendingPaidScheduleChange` + `formatScheduledChangeLabel` in cancel confirm dialog
- [x] Vitest coverage for cancel-warning label paths
- [x] Mark story done, commit, push

## Dev Agent Record

### File List

- `web/components/billing/in-app-billing-panel.tsx`
- `web/lib/billing/checkout-validation.test.ts`

## Change Log

- 2026-08-10: Story created from billing follow-ups brainstorm B1.
- 2026-08-10: Cancel confirm uses formatScheduledChangeLabel for interval-only schedules.
