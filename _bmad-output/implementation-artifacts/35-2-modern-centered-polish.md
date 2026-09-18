# Story 35.2 — Modern Centered polish

**Status:** done  
**Accepted:** 2026-09-18  
**Epic:** 35 Modern Form Experience System

## Acceptance criteria

- [x] Wire `resolveRegistrationExperience` into `PublicRegistrationOpen` (no parallel registration renderer)
- [x] Public API exposes resolved experience for public registration page
- [x] Modern Centered layout: intentional vertical rhythm, bounded form width, footer follows content (no large void on short forms)
- [x] Preserve card / immersive / compact preset shells until dedicated layout stories
- [x] Preview uses same canonical renderer with resolved experience (draft preset drives layout; no stale persisted resolvedExperience)
- [x] Responsive + overflow guards; accessibility preserved (canonical form components unchanged)

## Evidence

- CI green on branch after preview fix + shell tests
- `registration-public-shell.test.ts`, `registration-preview-theme.test.ts`, `public-registration-api.test.ts`, responsive contract tests
- Visual checkpoint: responsive matrix 1440–360 (computerUse mock + overflow checks)

## Non-goals

- Split Event, Poster, Conversational layouts (35.3–35.5)
