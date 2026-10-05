# Registration responsive + tenant website link — post-merge

Date: 2026-10-05  
Accepted implementation HEAD: `3270dda0b8a199a6712bb952c055af78f88846ff`  
Implementation merge SHA: `3605f4f49078181f1885d7b0081ec6148b70fd29` (PR #388)  
`3270dda0` is an ancestor of `3605f4f4`.

## Product-owner acceptance

PRODUCT OWNER ACCEPTANCE: **PASS** on exact HEAD `3270dda0`.

Post-review commits after implementation review HEAD `8b868b38`:

| SHA | Class | Notes |
| --- | --- | --- |
| `ffaed043` | C docs | review record |
| `7d472143` | B test-only | 36.4 columns selector |
| `3270dda0` | B test-only | Epic 35 / 36.5 split selector |

No category A after review. Implementation review remains valid. Exact-HEAD scope verified before merge.

## Required main CI

Run [`37309823251`](https://github.com/fad16papa/Cohestra/actions/runs/37309823251) on `3605f4f4` — **5/5 success**

- UAT isolation contract
- API integration tests
- Next.js build
- .NET build and test
- Docker stack smoke

PR CI on #388: [`37305596651`](https://github.com/fad16papa/Cohestra/actions/runs/37305596651) on `3270dda0` — **6/6 success** including GitGuardian.

Superseded failed Docker smoke on `64c30c72` and `7d472143` is not acceptance evidence.

## Isolation

- Story 42.3 remains `review` on `cursor/story-42-3-form-studio-touch-controls-0fcb` (PR #387 draft).
- Story 42.4 not started.
- Epic 43 not started.
