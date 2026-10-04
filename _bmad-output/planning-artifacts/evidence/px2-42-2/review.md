# Story 42.2 four-layer review

Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor, adversarial-general. Grok 4.6. First pass on `ee1ecb44`; patches applied; tests re-run.

## Independently verified and patched

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| BH-2 / ADV-1 | MAJOR/BLOCKER | 1280→1279 hid the always-visible three-pane inspector | **patch** — `resolveInspectorAfterResize` rehomes three-pane → two-pane open / stacked Sheet |
| BH-3 / ECH-2 / ADV-2 | MAJOR/BLOCKER | `composition == null` treated as two-pane | **patch** — `getLiveFormStudioComposition()` + layout media sync |
| BH-5 / ADV-4 | MAJOR | Focus left in hidden inspector on shrink | **patch** — rehome open; restore focus if inspector is actually hidden |
| ADV-3 | MAJOR | `aria-controls` pointed at missing Sheet id | **patch** — omit when stacked+closed |
| ECH-1 / ADV-9 | MAJOR/MINOR | Two-pane inspector flash before JS | **patch** — `lg:max-xl:hidden` unless `data-open` |
| ADV-5/6 | MAJOR | E2E missed 1440→1279 and Sheet→1024 | **patch** — added |

## Dismissed

| ID | Severity | Why |
|---|---|---|
| BH-1 remount | claimed BLOCKER | Accepted architecture: one inspector instance at a time; draft/selection live in parent. No `key={viewport}`. Canvas/palette never remount. |
| 42.3 handles | — | Unchanged `touch-none` / `icon-xs` |
| Schema/API | — | No backend or schema diff |

## Unrelated / classified

| Item | Class | Notes |
|---|---|---|
| 39.4 client-profile 768 clipped | unrelated | Client email h1; not Form Studio. Assertion unchanged |
| 40.4 43.999px | D | Known subpixel. Retry passed. Assertion unchanged |

## Second pass on patched HEAD

No remaining independently verified BLOCKER or MAJOR in the Form Studio D7 shell. Story stays at `review` for product-owner pre-merge.
