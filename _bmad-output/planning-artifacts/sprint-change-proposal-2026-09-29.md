---
generated: 2026-09-29
project: cohestra
author: Amelia (bmad-correct-course)
workflow: bmad-correct-course
role: Developer
model: Grok 4.6
status: approved-for-implementation
awaiting_approval: false
baseline: cursor/story-38-4-tokens-shell-0fcb @ 8a340662
reviewed_implementation: d49be978
change_scope: minor
issue_type: incomplete-acceptance-coverage
trigger: Story 38.4 pre-merge gate — required surfaces were explicitly deferred
approval: Product-owner correction instruction — Direct Adjustment inside Story 38.4. Do not merge. Do not begin 38.5 or 38.6.
---

# Sprint Change Proposal — Story 38.4 remaining acceptance coverage

## Checklist

### 1. Trigger and context

- [x] 1.1 Triggering story: **38.4** Semantic tokens and accessible text. Status stays `in-progress`.
- [x] 1.2 Issue type: **incomplete acceptance coverage** — previous independent review of `d49be978` approved implementation HEAD, but AC12 + contrast/focus evidence listed required surfaces as deferred.
- [x] 1.3 Evidence recorded below.

### 2. Epic impact

- [x] 2.1 Epic 38 can still complete as planned after 38.4 fills the deferred surfaces.
- [x] 2.2 No epic scope change. No new epic. No 38.5/38.6 start.
- [x] 2.3 Remaining epics unchanged.
- [x] 2.4 No future epic invalidated.
- [x] 2.5 No resequence.

### 3. Artifact conflicts

- [x] 3.1 PRD: no conflict.
- [x] 3.2 Architecture: reuse `--ring` as the focus-ring role. Do not invent a parallel palette. Opaque `--ring` only; composited `ring-ring/30` and `ring-ring/50` are forbidden on contracted auth/shared primitives.
- [x] 3.3 UX: DESIGN.md §5.5 focus-ring note only (composite 3:1). No nav, landmarks, overlays.
- [x] 3.4 Secondary: Playwright evidence + smallest axe-core check. No backend/API/schema/entitlement change.

### 4. Path forward

- [x] 4.1 Direct Adjustment — **Selected**. Stay in 38.4. Fill AC12 coverage. Token-only corrections.
- [x] 4.2 Rollback — **Not viable**. Token contract is correct; coverage is incomplete.
- [x] 4.3 MVP review — **Not viable**. Product scope unchanged.
- [x] 4.4 Selected: **Option 1 — Direct Adjustment**.

### 5–6. Proposal and handoff

- [x] Issue summary, impact, path, Developer-agent handoff.
- [x] Approval: this correction instruction is STEP 2B.
- [x] sprint-status: 38.4 stays in-progress. Epic 38 stays in-progress. 38.5/38.6 remain backlog.
- [x] Success: no unresolved BLOCKER/MAJOR; no unresolved contrast failure in 38.4 contracted scope; PR #346 remains draft/unmerged.

## Section 1: Issue Summary

Independent `bmad-code-review` of `d49be978` recorded APPROVE, then `8a340662` documented that result. That approval is **not** final product acceptance because the review explicitly deferred:

1. Basic Website locked state (38.2 entitlement surface after token migration)
2. Populated client profile
3. Forced-colors / high-contrast
4. Composited focus-ring contrast (`ring-ring/30` must not pass because opaque `--ring` passes)
5. Remaining Reports/Analytics `text-lagoon`
6. Real-DOM axe (or smallest supported equivalent) on representative routes
7. Dark-mode product coverage beyond login
8. Final raw-color / token inventory

Composer 2.5 must not receive additional architecture or accessibility decisions. Grok 4.6 owns remaining analysis and fixes.

## Section 2: Impact Analysis

| Area | Impact |
| --- | --- |
| Epic 38 | No new stories. 38.4 absorbs deferred AC12 evidence + token corrections. |
| Story 38.4 | Tasks added: opaque focus rings, Reports `text-lagoon` inventory/fix, Basic Website + client profile + forced-colors evidence, axe, dark product or honest fixture, inventory, re-review. |
| Stories 38.5 / 38.6 | **Not started.** Landmarks, skip, extra `<main>`, overlays remain theirs. |
| PRD / entitlements / backend | None. Story 38.2 lock behavior must remain unchanged. |
| Visual identity | No redesign. Semantic token class swaps and opaque `--ring` only. |

## Section 3: Recommended Approach

**Direct Adjustment** inside Story 38.4:

- Migrate `ring-ring/30` and shared `ring-ring/50` on login/register/forgot/reset/invite/verify and `button`/`input` to opaque `--ring` (login already opaque). Buttons add `ring-offset-background` so the indicator meets 3:1 against primary fill.
- Inventory and migrate failing Reports `text-lagoon` to `text-text-link`.
- Capture Basic Website lock and populated client profile at 1440×900 and 390×844.
- Emulate Chromium forced-colors; store screenshots.
- Add smallest `@axe-core/playwright` check; fail on serious/critical `color-contrast` in migrated scope. Landmark/skip findings are 38.5 exclusions.
- If operator dark mode is user-accessible (Settings appearance — yes), capture Dashboard plus one dense screen.
- Publish final stone/gold/`text-lagoon`/hex/palette/opacity inventory.
- Fresh independent `bmad-code-review` on the correction HEAD.

## Section 4: Detailed Change Proposals

No epic/story split. No PRD edit. DESIGN.md §5.5: focus-ring must be opaque `--ring`; composited translucent rings are not acceptable evidence.

## Section 5: Implementation Handoff

Handoff to **bmad-dev-story** / Amelia / **Grok 4.6**.

Do not call Composer 2.5 for this correction.

HALT conditions: entitlement/backend change, nav/landmark/overlay work, 38.5/38.6 start, merge of PR #346.

## Section 6: Success Criteria

- Basic Website lock + client profile evidence stored under `_bmad-output/planning-artifacts/evidence/px2-38-4/`
- Focus-ring composite table proves `ring-ring/30` and `/50` fail 3:1; opaque `--ring` passes
- Zero remaining failing Reports `text-lagoon` as normal text
- No serious/critical color-contrast axe violations on migrated routes
- Dark: Dashboard + dense screen, or explicit non-accessible statement with fixture
- Inventory has no unresolved 38.4 contrast failure
- Fresh review: no unresolved BLOCKER/MAJOR
- PR #346 draft, unmerged
