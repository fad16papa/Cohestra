# Story 33.13: Website Builder Studio Workspace Revamp

Status: review

## User Story

As an operator editing my public homepage,
I want a focused Website Studio with Build / Split / Preview workspace modes and a bounded live preview,
So that I can edit efficiently without scrolling through a dashboard-length page beside a miniature site.

## Acceptance Criteria

1. **Build mode (default on laptop)** — Editor uses full workspace width; preview hidden until Preview or Split selected.
2. **Split mode (≥1280px)** — Editor fixed useful width (~440px); preview fills remainder; outer page height stable.
3. **Preview mode** — Preview dominates workspace; phone/desktop/fullscreen preserved.
4. **Bounded preview** — Full website height scrolls inside preview viewport; does not expand outer builder page.
5. **State preservation** — Mode switches do not lose draft, expanded section, editor tab, device mode, autosave.
6. **Section → preview** — Expanding a section scrolls matching preview section into view via stable `data-site-preview-section-id`.
7. **Compact publish readiness** — Ready state shows compact indicator; blockers/warnings expand inline in toolbar area.
8. **Add section** — Single "+ Add section" dialog with Core / Studio groupings per plan registry.
9. **Mobile** — Edit / Preview tabs preserved; improved header hierarchy.
10. **Non-regression** — All existing builder capabilities (autosave, save, publish, revert, templates, presets, checklist, tour, share preview, plan gates) remain.

## Tasks

- [x] Workspace mode lib + tests
- [x] Studio shell layout + workspace bar
- [x] Bounded WebsiteLivePreview refactor
- [x] Toolbar compact readiness
- [x] Add section dialog
- [x] Preview section anchors

## Dev Agent Record

Implemented on branch `cursor/website-builder-studio-revamp-a139`.
