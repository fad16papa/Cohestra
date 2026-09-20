# Story 36.5 — Design tokens + Modern/Minimal + Modern Centered

**Epic:** 36  
**Status:** done (pending product sign-off)  
**Depends on:** 36.4 merged (`0ccfd0a`)  
**Branch:** `cursor/epic-36-story-36-5-design-tokens-a139`  
**HEAD:** `a196ee7`  
**PR:** #330  
**CI:** `35521741332` SUCCESS

## User story

As a tenant operator, I can tune bounded design tokens and Modern vs Minimal style so public registration looks intentionally polished — with immediate Preview parity — without raw CSS or a second renderer.

## Acceptance

- [x] `RegistrationTheme.designTokens` persisted (API + web) with enum validation (FR-FS2-15–19)
- [x] Design tab: typography, field size/radius, button width, surface emphasis
- [x] Modern vs Minimal style visibly changes Modern Centered (FR-FS2-20) via `registration-center-style`
- [x] Modern Centered shell quality (absorbed visual-quality correction / PR #324 carry-forward)
- [x] Preview + public use `PublicRegistrationOpen` + shared `RegistrationForm` with resolved tokens
- [x] Basic: Modern/Minimal + essential tokens; Core+ gates on spacious/comfortable/lg/elevated (FR-FS2-26–29)
- [x] Legacy forms: null tokens → safe defaults (BC)
- [ ] BMAD gates + CI + live checkpoint

## PRD / UX / Architecture

- FR-FS2-15–20, FR-FS2-26–29 — `prd-form-studio-2-0-2026-09-20`
- DESIGN.md token groups — `ux-form-studio-2-0-2026-09-20`
- AD-7 design tokens on `RegistrationTheme` — architecture spine

## Non-goals

- Preview viewports polish (36.6), domain blocks (36.7)
- Raw CSS, arbitrary fonts, editorial/bold/soft styles
- Reopening Epic 35 shells beyond regression

## Deferred

- Full responsive matrix automation (manual checkpoint + existing e2e smoke)
