# Story 42.4 test results

Agent: Grok 4.6. Local stack: API `:8080`, web `:3000`, `E2E_LIVE_STACK=1`.
HEAD at test: includes `17cd2ddf` plus uncommitted e2e hardening (commit before review).

## Frontend

| Gate | Result |
|---|---|
| Affected Vitest (`form-studio-42-4`, builder-motion, design-tab, landmarks) | passed |
| Full Vitest | **106 files / 665 passed** |
| `npx tsc --noEmit` | pass after details `open` state fix |
| `NEXT_PUBLIC_API_URL=http://localhost:8080 npm run build` | pass (Next 16.3.6) |

## Story 42.4 Playwright

`e2e/form-studio-42-4.spec.ts`: **1 passed** (5.8s)

- Templates collapsed when fields exist
- Go to composition
- Hidden Form Preview while typing in Build
- Preview shows unsaved intro marker
- Preview → Build preserves draft
- Revert unsaved (cancel + confirm)
- Named Registration preview region
- 1024 / 390 Build + Preview screenshots
- Overview Publish still present
- Axe filter aligned with 42.3 (pre-existing listbox/li not in 42.4 scope)

## Protected regressions

| Suite | Result |
|---|---|
| 42.2 Form composition | passed |
| 42.3 Form touch | 7 passed |
| 42.3 Website handles | passed |
| 42.1 Website Studio | 9 passed (draft continuity, publish dialog, unmount) |
| 36.6 preview viewports | passed |
| #388 website connection | 3 passed |

## Notes

- Design tab keep-mounts its own preview chrome; Form Preview unmount is `#form-studio-preview-panel`.
- Resize to 390 can open the 42.2 inspector sheet from keep-mounted Build; e2e dismisses overlay before Build/Preview clicks.
