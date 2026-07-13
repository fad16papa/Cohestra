---
baseline_commit: pending
---

# Story 7.2: CI Pipeline and SendGrid Sandbox Gate

Status: done

## Story

As a developer,
I want GitHub Actions to build and test on every push,
So that regressions are caught before deploy.

## Acceptance Criteria

1. **AC-7.2.1 — CI on push/PR**
   - **Given** a pull request or push to main
   - **When** CI runs
   - **Then** `dotnet build`, `dotnet test`, and `npm run build` succeed

2. **AC-7.2.2 — SendGrid sandbox gate**
   - **Given** CI environment (`CI=true`)
   - **When** tests run
   - **Then** existing SendGrid settings validator tests execute and block production API keys without sandbox

## Dev Agent Record

### File List

- `.github/workflows/ci.yml` — parallel `.NET` and `web` jobs on push/PR to `main`

### Completion Notes

- `.NET` job: restore, Release build, full test suite, explicit `SendGridSettingsValidatorTests` filter step
- `web` job: Node 22, `npm ci`, `npm run build` (matches Dockerfiles)
- GitHub Actions sets `CI=true`; validator tests assert sandbox-safe SendGrid config in CI
