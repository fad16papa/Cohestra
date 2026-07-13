---
baseline_commit: b63b2900fc189ce1385f9a7f5b8a71c6307f8c06
---

# Story 1.6: Theme System with No-Flash Loading

Status: done

## Story

As a user on any surface,
I want Light, Dark, and System themes without a flash of wrong theme on load,
So that the UI matches my preference immediately.

## Acceptance Criteria

1. **AC-1.6.1 — next-themes + no-flash script (UX-DR2, UX-DR3)**
   - **Given** next-themes is configured with `defaultTheme="system"` and class-based dark mode
   - **When** I load any page
   - **Then** a blocking inline script in `<head>` resolves theme before first paint
   - **And** System mode follows OS `prefers-color-scheme` and updates live without page reload

## Tasks / Subtasks

- [x] **Task 1: next-themes setup** (AC: 1.6.1)
  - [x] Install `next-themes`
  - [x] `ThemeProvider` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`

- [x] **Task 2: Blocking theme script** (AC: 1.6.1)
  - [x] Inline script in `layout.tsx` `<head>` reads `localStorage` + `prefers-color-scheme`
  - [x] Shared `THEME_STORAGE_KEY` with provider (`theme-config.ts`)

- [x] **Task 3: Layout integration** (AC: 1.6.1)
  - [x] `suppressHydrationWarning` on `<html>`
  - [x] `ThemeResolvedHint` shows preference + resolved theme (toggle UI is Story 1.7)

- [x] **Task 4: Verify** (AC: 1.6.1)
  - [x] `npm run build` and `npm run lint` pass

## Dev Notes

- UX-DR2/DR3: class-based `.dark` on `<html>`, default System
- ThemeToggle component (UX-DR16) is Story 1.7 — use `localStorage.setItem('theme', 'dark')` to test manually
- Admin account sync for theme preference ships in later settings stories

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- `next-themes` wraps app in root layout; storage key `theme`
- `ThemeScript` in `<head>` applies `.dark` class before first paint
- System mode live updates via next-themes `enableSystem` + `matchMedia` listener
- Home page shows `ThemeResolvedHint` for verification until ThemeToggle (1.7)

### File List

- `web/package.json`
- `web/package-lock.json`
- `web/components/theme/theme-config.ts`
- `web/components/theme/theme-script.tsx`
- `web/components/theme/theme-provider.tsx`
- `web/components/theme/theme-resolved-hint.tsx`
- `web/app/layout.tsx`
- `web/app/page.tsx`
- `web/README.md`

### Change Log

- 2026-06-18: Story 1.6 implemented — next-themes, blocking head script, system theme support
