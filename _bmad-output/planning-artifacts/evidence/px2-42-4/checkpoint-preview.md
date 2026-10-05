# Story 42.4 checkpoint preview

Date: 2026-10-05
HEAD: `ddb50089`
Question: Does Preview and Publish feel like a continuation of editing, or like leaving the builder for a different product?

**Answer: CONTINUATION.**

## Form Studio (interactive Playwright + screenshots)

Owned fixture `e2e-42-4-continuity-w0`, live stack `:3000` / `:8080`.

| Viewport | Build | Preview |
| -------- | ----- | ------- |
| 1440×900 | `form-build-1440.png` — Templates collapsed, Go to composition, Revert unsaved, composition present | `form-preview-1440.png` — Preview mode + unsaved intro marker in public renderer |
| 1024 | `form-build-1024.png` | `form-preview-1024.png` |
| 390 | `form-build-390.png` | `form-preview-390.png` |

Interactive (e2e, not screenshot-only):

- Build edit intro → Preview shows marker without Save
- Preview → Build preserves intro
- Revert unsaved cancel then confirm restores saved intro
- Form Preview unmounted while typing (`#form-studio-preview-panel` count 0)
- Named region `Registration preview`
- Overview Publish control still present

## Website Studio

Protected 42.1 e2e (9 passed): Edit/Preview draft continuity, hidden preview unmount, publish success dialog, revert confirm. No Website redesign in 42.4.

## Notes

computerUse checkpoint agent could not start (image quota). Playwright exercised the same operator path on a populated owned activity.
