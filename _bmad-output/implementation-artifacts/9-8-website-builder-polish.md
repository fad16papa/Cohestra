---
baseline_commit: fb749f2cd3a6e3fc9b9aab638222b73014219ffa
---

# Story 9.8: Website Builder Polish

Status: done

## Story

As an operator,
I want confidence when I publish and optional recovery if I make a mistake,
So that I trust the Website tool.

## Acceptance Criteria

1. **AC-9.8.1 — Publish success actions (SM-3)**
   - **Given** I publish homepage changes
   - **When** publish succeeds
   - **Then** I see success state with copy-link and open-live-site actions

2. **AC-9.8.2 — Homepage presets**
   - **Given** Website builder
   - **When** I reset from a preset
   - **Then** I can choose Community or Minimal layout templates applied to draft

3. **AC-9.8.3 — Revert last publish**
   - **Given** I have published at least twice
   - **When** I revert to last published
   - **Then** the previous published snapshot restores on the live site

4. **AC-9.8.4 — LANDING env fallback docs**
   - **Given** deploy documentation
   - **When** operators read env guidance
   - **Then** `LANDING_*` vars are documented as fallback-only after Site Page seed

## Tasks / Subtasks

- [x] **Task 1: Publish success UX** (AC: 9.8.1)
  - [x] Enhanced success dialog copy + Copy link / Open live site / Done

- [x] **Task 2: Preset reset API + UI** (AC: 9.8.2)
  - [x] `SitePageSeedDocumentBuilder` Community + Minimal presets
  - [x] `POST /api/v1/admin/site/apply-preset`
  - [x] Builder Templates & recovery section

- [x] **Task 3: Previous published snapshot + revert** (AC: 9.8.3)
  - [x] Migration `previous_published_sections_json` + `PreviousPublishedAt`
  - [x] Store snapshot on publish; `POST /api/v1/admin/site/revert-published`
  - [x] Revert UI when `canRevertPublished`

- [x] **Task 4: Deploy docs** (AC: 9.8.4)
  - [x] `docs/deploy/digitalocean-uat.md` + `.env.uat.example` fallback-only notes

- [x] **Task 5: Verify** (AC: all)
  - [x] `dotnet build`; `dotnet test` (SitePageSeedDocumentBuilderTests); `npm run build`

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Publish success dialog shows live URL with **Copy link**, **Open live site**, and **Done**
- **Community** preset = full seeded layout; **Minimal** = hero + upcoming + footer (highlights/how-it-works disabled)
- Apply preset updates **draft only**; preserves site name, logo, hero image, and accent
- Each publish stores previous published JSON; revert restores live site without changing draft
- `LANDING_*` documented as fallback-only in UAT deploy docs and `.env.uat.example`
- Code review: block preset/revert when draft unsaved; preserve hero image on preset apply; fix preset dialog copy

### File List

- `_bmad-output/implementation-artifacts/9-8-website-builder-polish.md` (new)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
- `src/Domain/Site/SitePage.cs` (modified)
- `src/Contracts/Site/SitePageAdminResponse.cs` (modified)
- `src/Contracts/Site/ApplySitePresetRequest.cs` (new)
- `src/Application/Site/ISitePageService.cs` (modified)
- `src/Infrastructure/Site/SitePageService.cs` (modified)
- `src/Infrastructure/Seed/SitePageSeedDocumentBuilder.cs` (modified)
- `src/Infrastructure/Persistence/Configurations/SitePageConfiguration.cs` (modified)
- `src/Infrastructure/Persistence/Migrations/*AddSitePagePreviousPublishedSnapshot*` (new)
- `src/Api/Controllers/V1/AdminSiteController.cs` (modified)
- `src/Infrastructure.Tests/Seed/SitePageSeedDocumentBuilderTests.cs` (modified)
- `web/lib/site-admin-api.ts` (modified)
- `web/components/website/website-builder-page.tsx` (modified)
- `docs/deploy/digitalocean-uat.md` (modified)
- `.env.uat.example` (modified)

### Change Log

- 2026-07-07: Story 9.8 — presets, revert snapshot, publish success polish, deploy docs
- 2026-07-07: Code review patches — isDirty guards, hero image preservation, preset copy fix

### Review Findings

- [x] [Review][Patch] Unsaved local edits lost on apply preset or revert [`web/components/website/website-builder-page.tsx:161-162,381-424`] — `editorDisabled` and handlers do not guard `isDirty`; API uses server draft and response overwrites local state, discarding unsaved edits despite revert dialog claiming draft is unchanged
- [x] [Review][Patch] Preset apply drops hero image asset [`src/Infrastructure/Seed/SitePageSeedDocumentBuilder.cs:353-363`] — `ApplyPresetToDraft` preserves `LogoAssetId` but rebuilds hero props from seed, clearing `heroImageAssetId` in the hero section
- [x] [Review][Patch] Preset confirm copy misleading [`web/components/website/website-builder-page.tsx:770-771`] — dialog says "Save draft and publish when you are ready" but `apply-preset` already persists draft server-side
- [x] [Review][Defer] No integration tests for apply-preset or revert-published [`src/Api.IntegrationTests/AdminSiteIntegrationTests.cs`] — deferred, optional CI stack; seed builder unit tests cover preset document shape only
