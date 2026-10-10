---
id: 44.8
key: 44-8-support-severity
title: Support Severity
status: in-progress
epic: 44
created: 2026-10-10
baseline_commit: 5891492e9a06aa27bd16bbdcd98583bba79a028c
---

# Story 44.8: Support Severity (no Incident entity)

Status: in-progress

DONE requires the Mandatory Code Review Loop on the final HEAD.

## Story

As a **PlatformAdmin**,
I want **to set and filter support issue severity**,
so that **the existing support inbox can be triaged without creating a second incident/case system**.

## Source audit

`SupportIssue` already owns Id, TenantId, IssueNumber, SubmittedByUserId, Subject, Description, Status, operator/tenant snapshots, InternalNote, timestamps, Attachments, Replies.

Status vocabulary (unchanged): Open, InProgress, WaitingOnOperator, Resolved, Closed.

Severity is additive and independent of Status. Critical+Closed and Low+Open are valid. No automatic Status↔Severity coupling.

No Incident entity, Priority field, SLA, pager, or on-call.

## Severity vocabulary (locked)

`SupportIssueSeverity`: Unspecified=0, Low, Medium, High, Critical.

Default / tenant submit / legacy backfill: **Unspecified**.

Persistence: string conversion, max 32, required — same convention as Status.

Index: **none**. Operator-scale inbox already filters Status without a dedicated index; do not add a speculative Severity index.

## Filter / PATCH parse (locked)

Name-only, case-insensitive. Reject numeric aliases (`0`,`1`,`2`) and unknown names (`Emergency`,`Urgent`,`P0`) with 400. Shared helper for list filter and PATCH.

## PATCH

Reuse `PATCH /api/v1/platform/support-issues/{id}`. At least one of status / internalNote / severity.

Severity-only is valid. Empty/invalid severity → 400. Unknown id → 404.

Actor: authenticated PlatformAdmin (`sub` + email). Not the filer.

## UpdatedAt (locked)

Bump `UpdatedAt` when Status **or** Severity actually changes. Note-only updates do **not** bump (existing convention).

## Audit

Write `PlatformAuditLog` **only** when Severity changes.

Action: `SupportIssueSeverityChanged` (only new action in this story).

ActorUserId/ActorEmail = PlatformAdmin. TenantId = issue.TenantId.

Safe DetailsJson only: `issueNumber`, `previousSeverity`, `newSeverity`. Reason null.

One SaveChanges for issue + audit. 44.7 continues to omit DetailsJson from search/export.

## Email

Severity-only: no filer status email. Combined status+severity: existing status email rules only.

## Tenant write

No tenant severity selector. Tenant create stores Unspecified. Tenants cannot set Low/Medium/High/Critical.

## 44.7 integration

Add `SupportIssueSeverityChanged` to the locked audit action allow-list (API enum + UI select). Do not accept arbitrary strings.

## Acceptance Criteria

1. Additive Severity enum + non-null column; existing rows Unspecified; no Incident/Priority
2. Tenant submit without severity → Unspecified; tenant cannot write severity
3. Platform list/detail include severity; filter name-only; invalid/numeric → 400
4. PATCH severity-only/combined; 200/400/404; TenantAdmin/Member 403; anonymous 401
5. Changed severity writes one audit with correct actor/tenant/safe details; unchanged → no audit; atomic
6. Status email/reply/attachment/Overview/report/44.6/44.7 preserved
7. Inbox + detail triage additive; Unspecified is real text; 1440/390; a11y; 43.4 still passes
8. No 44.9 GIT_SHA / version health

## Tasks / Subtasks

- [ ] Story + parser/index/UpdatedAt lock
- [ ] Domain + migration
- [ ] List/PATCH/audit API
- [ ] Inbox + detail UI + 44.7 action list
- [ ] Tests + review + draft PR

### Agent Model Used

Cursor Grok 4.6 (exclusive primary). Composer 2.5 not delegated. Auto disabled.

## Exclusions

44.9 GIT_SHA. Incident entity. Priority. SLA. Tenant severity selector. Severity reporting dashboard. Production deploy. DigitalOcean is Epic 19.
