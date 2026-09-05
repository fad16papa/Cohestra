---
title: Cohestra Intelligence Brief
status: active
created: 2026-09-05
---

# SPEC — Cohestra Intelligence Brief

## Why

Operators need a truthful morning brief: what deserves attention, why, what changed, and what to do next — from real Cohestra data, not cinema.

## Capabilities

- CAP-1 Compute a tenant-scoped deterministic brief from Postgres (clients, timeline, activities, registrations).
- CAP-2 Expose `GET /api/v1/admin/intelligence/brief` to TenantOperator.
- CAP-3 Every insight includes title, why, evidence[], recommended action + href.
- CAP-4 Fail closed without a resolved tenant. Never leak cross-tenant names or counts.
- CAP-5 Return an explicit insufficient-data state when there is nothing truthful to say.
- CAP-6 Later: optional LLM synthesis over the same facts, with schema validation and deterministic fallback.

## Constraints

- No invented business statistics.
- Reuse existing due-follow-up and outreach-coverage definitions.
- Deep links must land on existing admin routes that honor the same filters.
- Logs must not include client names, emails, or phones.
- Mandatory Code Review Loop on every implementation story.

## Non-goals

Chatbot, autonomous writes, attendance/no-show/first-timer analytics, cinema-only components.

## Success signal

A TenantIsolation test proves tenant B facts never appear in tenant A’s brief, and a seeded tenant’s due-follow-up insight count matches `GET /clients?followUpDue=true`.
