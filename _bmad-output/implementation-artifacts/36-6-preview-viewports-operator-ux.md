# Story 36.6 — Preview viewports + operator UX polish

**Epic:** 36  
**Status:** in-progress  
**Depends on:** 36.5 merged (`5eedda8`)  
**Branch:** `cursor/epic-36-story-36-6-preview-viewports-a139`

## User story

As a tenant operator, I can inspect the canonical registration form at Desktop, Tablet, and Mobile Preview widths so I know how registrants will see composition, design tokens, and Epic 35 shells — without a second renderer or saving first.

## Acceptance

- [x] Shared `RegistrationPublicPreviewShell` viewport control: Desktop / Tablet / Mobile (FR-FS2-24)
- [x] Canonical widths: Mobile 390px, Tablet 768px, Desktop 720px centered / 960px split (UX EXPERIENCE.md)
- [x] Viewport is operator UI state only (session persist); not theme/schema/API
- [x] Switching viewport does not remount or mutate draft; latest unsaved schema + design shown
- [x] Form Preview and Design Preview share the same chrome/toggle
- [x] Keyboard-accessible radiogroup; selected state not color-only
- [x] Preview banner + simulated submit unchanged
- [x] Draft remount debounce 150–300ms (AD-8)
- [x] Columns: 2-col at tablet/desktop, stack on mobile
- [ ] Tests + live checkpoint + CI

## PRD / UX / Architecture

- FR-FS2-21–25 — Preview + Epic 35 shells + public matrix
- UX EXPERIENCE.md Preview table
- AD-6 renderer placement; AD-8 Preview sync

## Readiness

| Item | Status |
|------|--------|
| Title | Preview viewports + operator UX polish |
| User outcome | Confident device Preview of unsaved draft |
| Plan | Preview not gated; form capabilities remain gated |
| BC | Existing Mobile/Desktop toggle; add Tablet; mobile 375→390 |
| Non-goals | Device frames, zoom, domain blocks (36.7), new renderer |

## Dependencies

36.1–36.5 composition, builder, columns, tokens. Do not reopen them except 36.6 regressions.
