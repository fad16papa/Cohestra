---
title: Apex Login Membership Resolution
status: draft
created: 2026-08-15
updated: 2026-08-15
---

# PRD: Apex Login Membership Resolution

## FR-1 Filter bootstrap default membership

When resolving email-first login on bare localhost / marketing apex, if the user has membership on `default` **and** one or more non-default active workspaces, treat only non-default memberships as candidates.

## FR-2 Prevent backfill duplication

`BackfillDefaultTenantAdminMembershipsAsync` shall not add default membership when the user already has any non-default tenant membership.

## FR-3 Preserve true multi-workspace guard

If two or more non-default active memberships remain after filtering, return `multiple_workspaces` with existing message.

## UJ-1 Creativorare operator, localhost login

1. Open `http://localhost:8088/login`
2. Enter valid credentials
3. System handoffs to `creativorare.localhost` and completes login

**Acceptance:** No `multiple_workspaces` error.

## UJ-2 Slug login unchanged

Login at `creativorare.localhost:8088/login` continues to bind creativorare directly.

## Metrics

- Zero reports of "multiple workspaces" for default+creativorare pattern after deploy
