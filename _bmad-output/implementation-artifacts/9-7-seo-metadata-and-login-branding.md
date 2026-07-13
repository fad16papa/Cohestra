---
baseline_commit: fb749f2cd3a6e3fc9b9aab638222b73014219ffa
---

# Story 9.7: SEO Metadata and Login Branding

Status: done

## Story

As a community operator sharing links on WhatsApp,
I want rich link previews and a branded login page,
So that my domain feels cohesive end-to-end.

## Acceptance Criteria

1. **AC-9.7.1 — Homepage SEO / Open Graph (FR-18)**
   - **Given** a published Site Page with hero image and copy
   - **When** `/` is loaded or link is unfurled
   - **Then** `<title>`, meta description, and Open Graph tags reflect site name and hero fields
   - **And** `og:image` uses hero image when set

2. **AC-9.7.2 — Login branding (FR-19)**
   - **Given** a published Site Page with site logo and name
   - **When** I open `/login`
   - **Then** client logo and site name are shown with CreativoRare / Activity Lead as secondary credit
   - **And** fallback to platform lockup when no published site exists

3. **AC-9.7.3 — Powered-by footer default (FR-20)**
   - **Given** the Website builder
   - **When** I edit footer section
   - **Then** no powered-by label editor is shown in v1
   - **And** published footer still shows “Powered by CreativoRare” from seed/default

## Tasks / Subtasks

- [x] **Task 1: SEO metadata helpers + homepage OG image** (AC: 9.7.1)
  - [x] `web/lib/site-seo-metadata.ts` — metadata builders from published site + env fallback
  - [x] `readHeroImageAssetId` on `public-site-api.ts`
  - [x] `web/app/page.tsx` uses shared metadata builder with `og:image` + Twitter card

- [x] **Task 2: Login page client branding** (AC: 9.7.2)
  - [x] Server fetch published branding on `/login`
  - [x] `LoginBrandPanel` + `AuthFlowShell` show client logo/name with platform secondary line
  - [x] Dynamic login metadata from site name when published

- [x] **Task 3: Remove footer powered-by editor** (AC: 9.7.3)
  - [x] Footer section in builder shows read-only FR-20 notice

- [x] **Task 4: Verify** (AC: all)
  - [x] `npm run build`

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Homepage metadata derives title, description, `og:title`, `og:description`, and `og:image` from published site name + hero fields (hero image via `heroImageAssetId`)
- `/login` loads published `logoAssetId` + site name for brand panel and mobile header; falls back to Activity Lead / CreativoRare lockup
- Login `generateMetadata` uses client site name when published site exists
- Website builder footer section no longer exposes powered-by label editor (seed/default still renders on public site)

### File List

- `_bmad-output/implementation-artifacts/9-7-seo-metadata-and-login-branding.md` (new)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
- `web/lib/public-site-api.ts` (modified)
- `web/lib/site-seo-metadata.ts` (new)
- `web/app/page.tsx` (modified)
- `web/app/login/page.tsx` (modified)
- `web/app/login/layout.tsx` (modified)
- `web/components/auth/login-brand-panel.tsx` (modified)
- `web/components/auth/auth-flow-shell.tsx` (modified)
- `web/components/auth/login-page-client.tsx` (modified)
- `web/components/website/website-section-fields.tsx` (modified)

### Change Log

- 2026-07-07: Story 9.7 — SEO metadata, login branding, footer FR-20
- 2026-07-07: Code review — `cache()` on `fetchPublishedSiteBranding` for login dedupe

### Review Findings

- [x] [Review][Patch] Login page calls `fetchPublishedSiteBranding()` twice per request (metadata + page) — wrap with React `cache()` [`web/lib/site-seo-metadata.ts:40`]
- [x] [Review][Defer] Login route statically revalidated (1m) — branding/metadata may lag after publish until ISR refresh [`web/app/login/page.tsx`]
- [x] [Review][Defer] Preview homepage metadata includes draft `og:image` when hero set — same class as preview-token defer from 9.4 [`web/lib/site-seo-metadata.ts:45`]
- [x] [Review][Defer] Drafts with legacy custom `poweredByLabel` still render until republish — editor removed only [`web/components/website/website-section-fields.tsx:505`]
