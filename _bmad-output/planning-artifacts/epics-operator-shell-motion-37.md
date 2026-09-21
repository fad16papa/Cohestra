# Epic 37: Operator shell motion system

**Status:** in-progress  
**Architecture:** `_bmad-output/planning-artifacts/architecture-operator-shell-motion-37-2026-09-21/ARCHITECTURE-SPINE.md`

## User outcome

Operators moving between admin routes get one short, shared page-enter motion. Form Studio drafts, activity tabs, and Website Builder workspace state are not destroyed by that motion. Reduced-motion users get an instant swap. Builder studios get dedicated local motion (context / tab / selection / panel / presence) without remounting drafts or keeping hidden preview trees alive while editing.

## Stories

| ID | Title | Purpose |
|----|-------|---------|
| 37.1 | Shared admin route-transition primitive | Pathname-keyed CSS enter, Form Studio/state invariants, reduced motion, tests |
| 37.2 | Builder studio motion coverage | Website Studio + Form Studio local motion, Build↔Preview state preservation, reduced motion, no hidden preview work |
| 37.3 | Motion polish and interaction consistency | Product-wide audit; retune timing; remove stacked/cinematic admin motion; reduced-motion gaps |

## Non-goals

- New animation libraries
- Marketing cinema / public registration motion
- Forcing Website Studio and Form Studio into one editor-state abstraction
- Changing navigation IA or data-fetch ownership
- Animating customer website content merely because it is inside Preview
