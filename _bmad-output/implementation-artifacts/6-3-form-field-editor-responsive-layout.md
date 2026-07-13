---
baseline_commit: 793a2cd
---

# Story 6.3: Form Field Editor Responsive Layout

Status: done

## Story

As an operator,
I want the activity form field editor to stay usable on mobile and desktop,
So that I can reorder fields and edit properties without the page growing unbounded.

## Acceptance Criteria

1. **AC-6.3.1 — Field order panel**
   - **Given** an activity with multiple form fields
   - **When** I edit the form tab
   - **Then** field order appears in a scrollable list with up/down reorder

2. **AC-6.3.2 — Properties panel scroll**
   - **Given** a selected field with many options
   - **When** properties exceed panel height
   - **Then** the properties panel scrolls internally at fixed height

3. **AC-6.3.3 — Responsive layout**
   - **Given** a narrow viewport
   - **When** I edit form fields
   - **Then** order and properties stack vertically; on desktop they appear side-by-side

## Dev Agent Record

### Completion Notes

- `form-field-editor.tsx`: two-panel layout, fixed heights, touch scrolling
- `activity-form-tab.tsx`: bounded live preview scroll
