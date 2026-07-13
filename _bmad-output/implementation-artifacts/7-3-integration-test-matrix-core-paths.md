---
baseline_commit: pending
---

# Story 7.3: Integration Test Matrix (Core Paths)

Status: done

## Story

As a developer,
I want integration tests for registration, dedup, campaigns, and catalogs,
So that core operator paths have automated regression coverage.

## Acceptance Criteria

1. **AC-7.3.1 — Public registration → client create**
   - **Given** a published activity with a valid form schema
   - **When** a public registration is submitted
   - **Then** a registration and master client record are created

2. **AC-7.3.2 — Dedup phone match**
   - **Given** an existing client registered by phone
   - **When** a second registration uses the same normalized phone
   - **Then** the same client id is returned and no duplicate client is created

3. **AC-7.3.3 — Campaign send skip without consent**
   - **Given** a client without recorded consent
   - **When** a campaign is sent to that client
   - **Then** the recipient is skipped with consent reason

4. **AC-7.3.4 — Community catalog CRUD smoke**
   - **Given** an authenticated operator
   - **When** creating, listing, updating, and deleting a community
   - **Then** each admin endpoint succeeds

## Dev Agent Record

### File List

- `src/Api.IntegrationTests/` — WebApplicationFactory harness with PostgreSQL + Redis
- `src/Api/Program.cs` — `public partial class Program` for test host
- `.github/workflows/ci.yml` — dedicated integration job with Postgres/Redis services

### Completion Notes

- Tests skip locally when `/ready` is unavailable; CI runs them against service containers
- Unit test job excludes `Category=Integration`; integration job runs only those tests
- `FakeEmailSender` replaces SendGrid for campaign path setup without external calls
