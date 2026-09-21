# Epic 37: Operator shell motion system

**Status:** in-progress  
**Architecture:** `_bmad-output/planning-artifacts/architecture-operator-shell-motion-37-2026-09-21/ARCHITECTURE-SPINE.md`

## User outcome

Operators moving between admin routes get one short, shared page-enter motion. Form Studio drafts, activity tabs, and Website Builder workspace state are not destroyed by that motion. Reduced-motion users get an instant swap.

## Stories

| ID | Title | Purpose |
|----|-------|---------|
| 37.1 | Shared admin route-transition primitive | Pathname-keyed CSS enter, Form Studio/state invariants, reduced motion, tests |

## Non-goals

- New animation libraries
- Marketing cinema / public registration motion
- Animating Form Studio Build ↔ Preview
- Changing navigation IA or data-fetch ownership
