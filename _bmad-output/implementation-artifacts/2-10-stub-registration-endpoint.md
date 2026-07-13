---
baseline_commit: 84b22b6
---

# Story 2.10: Stub Registration Endpoint

Status: done

## Story

As a developer,
I want a stub public registration endpoint returning 202 Accepted,
So that Epic 2 delivers a complete QR journey and Epic 3 implements real capture against a frozen contract.

## Acceptance Criteria

1. **AC-2.10.1 — Stub handshake (Winston)**
   - **Given** a published Activity
   - **When** I POST to `POST /api/v1/public/registrations` with valid shape
   - **Then** the API returns 202 Accepted without persisting a Registration

2. **AC-2.10.2 — OpenAPI contract**
   - **And** OpenAPI documents the request/response contract Epic 3 will fulfill

## Tasks / Subtasks

- [x] **Task 1: Stub endpoint** (AC: 2.10.1)
  - [x] `POST /api/v1/public/registrations` — 202 Accepted, no persistence
  - [x] Rejects draft/archived slugs with 404

- [x] **Task 2: Contract documentation** (AC: 2.10.2)
  - [x] `docs/contracts/public-registration-v1.md` — frozen request/response shape
  - [x] OpenAPI info references both Epic 2→3 contracts
  - [x] Controller XML docs + `ProducesResponseType` for request/response types

- [x] **Task 3: Verify build** (AC: all)
  - [x] `dotnet build`, OpenAPI includes public registrations path

## Dev Notes

- Core stub shipped in Story 2.9; this story formalizes the contract and OpenAPI surface
- Epic 3 extends response with registration id and validates `answers` against form schema

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Frozen public registration contract documented alongside form schema contract
- OpenAPI v1 description links both contract docs; endpoint tagged and documented
- Api.http exercises stub submit after publish (before archive) plus invalid payload

### File List

- `docs/contracts/public-registration-v1.md`
- `src/Contracts/Registrations/SubmitPublicRegistrationRequest.cs`
- `src/Contracts/Contracts.csproj`
- `src/Api/Controllers/V1/PublicRegistrationsController.cs`
- `src/Api/Program.cs`
- `src/Api/Api.csproj`
- `src/Api/Api.http`

### Change Log

- 2026-06-16: Story 2.10 implemented — stub registration contract and OpenAPI documentation

### Review Findings

- [x] [Review][Patch] OpenAPI operation lacks summary/description — XML comments not exported to `openapi/v1.json` [`src/Api/Controllers/V1/PublicRegistrationsController.cs:16`]
- [x] [Review][Defer] Stub accepts unvalidated `answers` payload [`src/Api/Controllers/V1/PublicRegistrationsController.cs:43`] — deferred, Epic 3 schema validation
- [x] [Review][Defer] OpenAPI `answers` schema is generic `object` without `additionalProperties` docs [`openapi/v1.json`] — deferred, contract markdown is canonical; Epic 3 may add typed schema

### Re-review (2026-06-17)

- Patch applied: `EndpointSummary` / `EndpointDescription` on stub submit action

### Re-review (2026-06-20)

- ✅ Clean review — OpenAPI operation now includes summary/description; acceptance criteria pass; no new findings
