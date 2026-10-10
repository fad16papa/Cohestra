---
id: 44.7
key: 44-7-platform-wide-searchable-audits
title: Platform-wide Searchable Audits
status: done
epic: 44
created: 2026-10-10
baseline_commit: b85bb026afa8b30dbdff81452caf473e84059a81
accepted_commit: ac15a79a1fba9aa3346f5978884b7f5a25a3f419
accepted_current_head: 048a22a76c4c7894f8cefaf7f7f85152daa03b35
implementation_merge: 520189f6087e2071b15587a15b239b4425371fe9
---

# Story 44.7: Platform-wide Searchable Audits

Status: done

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

## Story

As a **PlatformAdmin**,
I want **to search operational audit entries across tenants and export a strictly bounded safe CSV**,
so that **I can answer who changed something, which tenant was affected, what action occurred, why, and when — without SQL or raw audit JSON**.

## Source audit (current schema)

`platform_audit_logs` / `PlatformAuditLog`:

| Field | Type | Notes |
|---|---|---|
| Id | Guid | PK |
| ActorUserId | Guid | required |
| ActorEmail | string? max 320 | historical rows may be null |
| TenantId | Guid | required FK |
| Action | `PlatformAuditAction` string | see vocabulary |
| Reason | string? max 1000 | operator-entered; text only |
| DetailsJson | jsonb | **OMIT entirely** |
| CreatedAt | DateTimeOffset | filter + sort |

Existing indexes: `TenantId`, `CreatedAt`. No new index in this story — operator-scale paginated reads; CreatedAt + TenantId cover the hot paths. Action/email filters stay unindexed.

Current `PlatformAuditAction` values (do not invent more):

TenantCreated, TenantSuspended, TenantReactivated, TenantArchived, ComplimentarySet, ComplimentaryCleared, SupportIssueReplyAdded, PasswordResetSent, EmailVerificationResent

## Filter semantics (locked)

| Filter | Semantics |
|---|---|
| `action` | Exact current enum **name** (case-insensitive). Numeric aliases (`0`, `1`) → **400**. Invalid → **400**. Empty = no filter. |
| `tenantId` | Exact GUID. Invalid GUID → model-binding 400. Empty = no filter. |
| `actorEmail` | Trimmed, **case-insensitive exact match** on persisted `ActorEmail`. Empty/whitespace = no filter. Null historical emails never match a provided email. Same for list and export. |
| `from` / `to` | `DateTimeOffset` on `CreatedAt`, **inclusive**. `from > to` → **400** (never swap). |
| `page` | Default 1, min 1 |
| `pageSize` | Default 25, max 50 (AD-15) |

Order (list and export): `CreatedAt DESC`, `Id DESC`.

## CSV

- Route: `GET /api/v1/platform/audits/export` (one route)
- Same filters as list (no page/pageSize)
- Cap 5,000. Implementation: `Take(5001)` after shared filters; if 5001 rows → **400 ProblemDetails**. Never silent truncate.
- Columns: id, actorUserId, actorEmail, tenantId, action, reason, createdAt
- Formula prefix (`= + - @` and leading tab/CR) → prepend `'` then CSV-escape
- Filename: `cohestra-platform-audits-yyyyMMdd.csv` (UTC date of export; no user input)
- Content-Type: `text/csv`

## Acceptance Criteria

1. PlatformAdmin search 200 allow-list DTO; TenantAdmin/TenantMember 403; anonymous 401
2. DetailsJson omitted from JSON and CSV (sentinel test)
3. Filters: action / tenantId isolation / actorEmail / from-to; invalid action 400; from>to 400
4. Pagination default 25 max 50; deterministic order
5. Export same filters; ≤5000 200; >5000 400; formula-safe; Tenant JWT 403
6. `/platform/audits` + Audits nav `aria-current`; loading/empty/filtered-empty/error; 1440/390
7. Tenant detail Recent audit and Timeline remain
8. Read-only; no self-audit on GET; no 44.8/44.9

## Tasks / Subtasks

- [x] Story + filter lock
- [x] Search + export API
- [x] Audits UI + nav
- [x] Tests + review + draft PR

### Review Findings (HEAD `3a72c054` layers)

- [x] [Review][Patch] Numeric `action` aliases (`0`/`1`) accepted by Enum.TryParse — require exact enum name
- [x] [Review][Patch] CSV formula prefix missed leading LF
- [x] [Review][Patch] CSV EscapeField did not quote `;`
- [x] [Review][Patch] Out-of-range page used the "no audits exist" empty copy
- [x] [Review][Patch] Policy unit list omitted `PlatformAuditsController`
- [x] [Review][Dismiss] ActorEmail ToLower vs ToLowerInvariant — ASCII operator emails; EF translates `ToLower()`
- [x] [Review][Dismiss] UI download filename omits UTC date — API Content-Disposition is authoritative

## Dev Notes

Reuse `PlatformAuditEntryResponse`. Do not join Users for actor email (historical evidence). Recent audit on tenant detail may keep its existing join — do not change it.

Partial failure: one DbContext; invalid filters → 400; UI shows unavailable on fetch failure.

No schema migration.

### Agent Model Used

Cursor Grok 4.6 (exclusive primary). Composer 2.5 not delegated. Auto disabled.

### Debug Log References

- Local unit: 1061 pass (`Category!=Integration`)
- Local integration: PlatformAuditSearch + TenantAuthz + isolation audit test
- Frontend vitest 44.3/44.6/44.7/43.4 source contracts
- Playwright `platform-ops-44-7` with `E2E_LIVE_STACK=1`

### Completion Notes List

- Additive `GET /api/v1/platform/audits` and `GET /api/v1/platform/audits/export` (PlatformAdminOnly). TenantAdmin/TenantMember 403. Anonymous 401.
- Allow-list DTO/CSV only: id, actorUserId, actorEmail, tenantId, action, reason, createdAt. DetailsJson omitted (sentinel absent JSON+CSV).
- Filters: action name-only (numeric `0`/`1` → 400), tenantId exact GUID, actorEmail case-insensitive exact, from/to inclusive UTC; from>to → 400. Shared normalizer for list and export.
- Pagination default 25 / max 50. Order CreatedAt DESC, Id DESC.
- Export Take(5001); >5000 → 400. Formula prefix `= + - @` / tab / CR / LF; `;` quoted. Filename UTC date only.
- `/platform/audits` + Audits nav aria-current. `/platform` remains tenant directory. Tenant detail Recent audit and Timeline preserved. No self-audit on GET.
- 44.8–44.9 not started.
- Merged PR #426. Accepted implementation/test HEAD `ac15a79a1fba9aa3346f5978884b7f5a25a3f419`. Accepted current HEAD `048a22a76c4c7894f8cefaf7f7f85152daa03b35` (docs pin only). Main merge `520189f6087e2071b15587a15b239b4425371fe9`. Exact-head CI `38017899545` green. Post-merge main CI `38018600033` green. Deploy remains pre-existing Epic 19. Epic 44 stays in-progress. Stories 44.8–44.9 remain backlog.

## Exclusions

44.8 Severity / SupportIssueSeverityChanged. 44.9 GIT_SHA. No mutations. No production deploy. DigitalOcean is Epic 19.
