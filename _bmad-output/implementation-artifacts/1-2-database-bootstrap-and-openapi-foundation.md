# Story 1.2: Database Bootstrap and OpenAPI Foundation

Status: done

## Story

As a developer,
I want EF Core migrations and OpenAPI published,
So that the API has a reproducible database baseline and a wire contract for web and future mobile clients.

## Acceptance Criteria

1. **AC-1.2.1 — Migrations on fresh database**
   - **Given** PostgreSQL is running via Docker Compose
   - **When** migrations are applied on startup or via documented command
   - **Then** the database schema is created without errors on a fresh database

2. **AC-1.2.2 — OpenAPI v1**
   - **Given** the API is running
   - **When** I request the documented OpenAPI URL
   - **Then** the spec is available with `/api/v1` versioning

3. **AC-1.2.3 — ProblemDetails errors**
   - **Given** an API error occurs (e.g. 404)
   - **When** the response is returned
   - **Then** it uses RFC 7807 `ProblemDetails` JSON format

## Tasks / Subtasks

- [x] **Task 1: EF Core infrastructure** (AC: 1.2.1)
  - [x] Add `LeadGenerationCrmDbContext` in Infrastructure
  - [x] Add `InitialCreate` migration
  - [x] Register DbContext and apply migrations on startup
  - [x] Document manual `dotnet ef database update` command

- [x] **Task 2: OpenAPI and API v1 routing** (AC: 1.2.2)
  - [x] Add `Microsoft.AspNetCore.OpenApi` and `MapOpenApi`
  - [x] Add sample `GET /api/v1/system/info` controller
  - [x] Document OpenAPI URL in README

- [x] **Task 3: ProblemDetails** (AC: 1.2.3)
  - [x] Add `AddProblemDetails`, status code pages, and `GlobalExceptionHandler`

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- `LeadGenerationCrmDbContext` with empty baseline schema; `InitialCreate` migration creates `__EFMigrationsHistory`
- Migrations auto-applied on API startup; verified in Docker logs
- OpenAPI at `/openapi/v1.json`; sample endpoint `GET /api/v1/system/info`
- 404 responses return `application/problem+json` with `title`, `status`, `instance`, `traceId`

### File List

- `src/Infrastructure/DependencyInjection.cs`
- `src/Infrastructure/Persistence/LeadGenerationCrmDbContext.cs`
- `src/Infrastructure/Persistence/DesignTimeDbContextFactory.cs`
- `src/Infrastructure/Persistence/Migrations/`
- `src/Infrastructure/Infrastructure.csproj`
- `src/Api/Program.cs`
- `src/Api/Api.csproj`
- `src/Api/Api.http`
- `src/Api/Controllers/V1/SystemController.cs`
- `src/Api/Infrastructure/GlobalExceptionHandler.cs`
- `README.md`

### Change Log

- 2026-06-16: Story 1.2 implemented — EF Core bootstrap, OpenAPI v1, ProblemDetails

### Review Findings

- [x] [Review][Patch] GlobalExceptionHandler omits `application/problem+json` content type [src/Api/Infrastructure/GlobalExceptionHandler.cs:29]
