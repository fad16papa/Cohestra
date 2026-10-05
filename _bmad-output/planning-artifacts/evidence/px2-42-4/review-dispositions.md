# Story 42.4 code review dispositions

HEAD reviewed: `9e4cf051` then overlay fix on subsequent commit.

## Layers

Blind Hunter, Edge Case Hunter, Acceptance Auditor (parallel).

## Triage

| Severity | Finding | Disposition |
| -------- | ------- | ----------- |
| BLOCKER | Keep-mounted inspector/palette overlay blocks Preview | **FIXED** — `studioActive={formStudioMode === "build"}` closes sheet + palette |
| MAJOR | Templates `useState` does not collapse after 0→N fields | **NIT / accept** — CAP-4 is start state for populated drafts; do not fight an operator mid-build |
| MINOR | Hash jump vs sticky chrome / focus | **Accept** — added `scroll-mt-28`; no iframe/focus dump required by spec |
| MINOR | Revert dialog locked while `isSaving` | **Reject** — revert never sets `isSaving` |
| MINOR | Design dirty keeps Preview “unsaved” after form revert | **Reject** — truthful; `designPreviewDirty` is intentional |
| MINOR | `activity.formSchema` effect can reset dirty | **Pre-existing** — not introduced by 42.4 |
| NIT | Duplicate region name vs Design preview | **Accept** — Design tab is `hidden` while Form is selected |
| NIT | Revert copy mentions publish | **Accept** — draft-only revert |

## Verdict

PASS after overlay fix. No unresolved BLOCKER/MAJOR.

## Acceptance

CAP-1–CAP-5 PASS. CAP-6/7 already satisfied on HEAD; 42.4 does not reimplement. CAP-8 Website OUT_OF_SCOPE + 42.1 regression PASS.
