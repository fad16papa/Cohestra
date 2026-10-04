# Story 42.2 architecture

Status: locked. Agent: Architect + UX + accessibility + security (Grok 4.6).

## Chosen composition

Improve the existing `FormCompositionBuilder`. Do not fork mobile/desktop editors.

| Width | Visual (CSS) | Inspector interaction (JS) |
|---|---|---|
| `≥1280` (`xl`) | `xl:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,18rem)]` | Docked third pane always visible |
| `1024–1279` (`lg` and not `xl`) | `lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]` | Non-modal overlay when open; hidden + not focusable when collapsed |
| `<1024` | Single column stack | Story 38.6 `Sheet` only |

Persistent two-pane surfaces: **palette + composition canvas**.

## Why this and not the alternatives

| Alternative | Rejected because |
|---|---|
| Three panes at `lg` / 1024 | Violates D7 / PO decision; cramped at 1024–1279 |
| Treat `lg` as 1280 | Off-by-one; `lg` is 1024 |
| Inspector Sheet at 1024–1279 | D7 requires non-modal collapse unless proven impossible. Current editor can host an overlay |
| Separate mobile builder | Dual state, duplicate IDs, remount risk |
| `key={viewport}` | Remounts editor; loses selection/draft chrome |
| JS-driven grid on first paint | Hydration mismatch at 1024/1280 |

## Single-source inspector

One inspector body function. Placement:

- Not stacked: one docked `<section id="form-studio-inspector">`. CSS hides it below 1024. JS `hidden`/`inert` when two-pane collapsed.
- Stacked (after media hydrate): docked inspector unmounts; Sheet mounts the same body when open.

SSR first paint uses CSS only (`useSyncMedia` defaults false). No conflicting server/client markup. After hydrate, stacked viewports drop the docked node so the Sheet cannot duplicate IDs.

## Resize contract

Module: `web/lib/form-studio-workspace.ts`.

- stacked → ≥1024 with Sheet open: close Sheet, rehome `inspectorOpen=true`, release inert.
- two-pane open → stacked: open Sheet (rehome).
- two-pane collapsed → stacked: Sheet stays closed.
- three-pane: ignore collapse for visibility; toggle hidden via `xl:hidden`.

Focus: collapse while focus is inside the inspector → toggle. Sheet `finalFocus` → toggle.

## Performance / lifecycle

- No `resize` listener that writes schema or calls fetch/save.
- `matchMedia` subscriptions cleaned up via `useSyncMedia`.
- Preview stays `keepMounted={false}`.
- Build stays mounted.
- No new localStorage keys.

## Security

Frontend-only. Selection and draft live in component state and reset when `ActivityFormTab` reloads an activity. No tenant-scoped cache. No schema logging. Server authorization remains authoritative.

## Composer

Unused. Grid/overlay classes are coupled to `hidden`, `inert`, Sheet, and `aria-*`. Not a presentational-only slice.
