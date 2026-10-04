# Story 42.2 implementation readiness

Status: **READY**

Agent: Product Manager (Grok 4.6). `bmad-check-implementation-readiness` Phase 3 facilitated menus are not applicable to this in-flight Epic 42 story; this is the story-scoped readiness gate. Product code was not touched until this gate.

## Inputs present

- Backlog §42.2 and Epic 42 non-goals
- DESIGN.md §7.4 / §14.2 / D7
- IA §7 D7 planning spec
- Story 42.1 done on `main` `eabc03ff`
- Mandatory Code Review Loop
- Live Form Studio inventory (`inventory.md`)
- Shared Sheet / `useModalInert` / `useSyncMedia` / BuilderSurface
- Protected Playwright for 35–37, 38.3–38.6, 39.4–39.5, 40.5, 42.1

## Confirmed current defects (in-scope)

1. 1024–1279 is a long stack, not two-pane + collapsible inspector.
2. `<1024` inspector is a stacked card, not a 38.6 Sheet.
3. No inspector toggle, `aria-expanded`, or collapse focus restore.
4. No live-resize continuity tests for 1023/1024 or 1279/1280 pane counts.

## Risks already bounded

- Tailwind `lg` (1024) must not become the three-pane threshold.
- Sheet vs docked inspector must not double-mount form controls.
- Resize must not remount `ActivityFormTab` or save/refetch.
- Story 42.3 owns 44px drag handles; do not absorb it.

## Out of scope (do not start)

42.3, 42.4, Epic 43, schema/renderer/submit, Website Studio, production claim.

## Decision

READY to implement Story 42.2 only.
