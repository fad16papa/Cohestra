# Story 42.1 implementation readiness

Status: **READY**

Checked against the accepted Product Experience 2.0 backlog §42.1, DESIGN.md §14.1, Stories 38.2–41.3, and the live Website inventory. Product code was not touched until this gate.

## Inputs present

- Backlog §42.1 and Epic 42 non-goals
- DESIGN.md §3.1 / §14.1 / D1 / D4
- Mandatory Code Review Loop
- Existing Website route, API, renderer, nav, overlays, and Epic 37 motion
- Protected Playwright for 38.2–41.3

## Gaps the story must close (in-scope)

1. Pending/unknown plan must not become Basic or fetch a site.
2. Role 403 must not become UpgradePanel.
3. Remaining “website builder” / “Builder workspace” product copy.
4. Publish/revert persistent status.
5. Tour must stay skippable, not cover the skip link, and be tenant-scoped.
6. Same-entitlement Pro/Core-to-Pro/Core isolation proof.

## Out of scope (do not start)

42.2–42.4, Epic 43, schema/renderer/public-site, Paddle, nav order, production claim.

## Decision

READY to implement Story 42.1 only.
