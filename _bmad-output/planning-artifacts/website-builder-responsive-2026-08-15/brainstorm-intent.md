# Brainstorm — Website Builder responsive layout

**Date:** 2026-08-15

## Problems

- Editor + preview split only at 1280px (`xl`) — tablets got endless vertical scroll
- Mobile users scrolled past entire editor to reach preview
- Phone preview frame didn't scale on narrow viewports
- Toolbar action row crowded on phones
- Section list rows cramped drag/title/visible controls

## Converged approach

| Viewport | Layout |
|----------|--------|
| `< lg` | **Edit | Preview** workspace toggle; phone preview default |
| `≥ lg` | Side-by-side editor + sticky preview (matches activity Design tab) |

## P1 follow-ups

- Sheet/drawer for preview from any tab
- Collapsible metric chips on toolbar
- Container queries for preview scale
