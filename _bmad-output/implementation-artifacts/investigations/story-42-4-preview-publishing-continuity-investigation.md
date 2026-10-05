# Investigation: Story 42.4 Preview and publishing continuity

## Hand-off Brief

1. **What happened.** Original 42.4 predates Stories 42.1–42.3 and #388. Current main (`e038692b`) already ships Build/Preview tabs, draft Preview, Preview unmount, simulated submit, Website publish dialog, and #388 container-responsive registration.
2. **Where the case stands.** Concluded. Remaining delta is small: Form first-fold templates still hide composition; Form Preview lacks a named region; Form has no discard-unsaved revert. Do not rebuild studios.
3. **What's needed next.** Spec + story from remaining MUST items only. Winston ratifies existing lifecycle (parent draft + unmount Preview). No new architecture spine.

## Case Info

| Field | Value |
| ----- | ----- |
| Ticket | Story 42.4 — Preview and publishing continuity |
| Date opened | 2026-10-05 |
| Status | Concluded |
| System | Cohestra HEAD `e038692b` (`origin/main`); branch `cursor/story-42-4-preview-publishing-continuity-8d20` |
| Evidence sources | Source, unit tests, e2e, original backlog §42.4, Stories 42.1–42.3 |

## Problem Statement

BUILD → PREVIEW → PUBLISH → SUCCESS → CONTINUE/REVERT must feel like one Creation Studio workflow. The original backlog is a set of hypotheses, not a build list. Implement only what current HEAD still lacks.

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------ | ------ |
| Form Studio Build/Preview | Available | `activity-form-tab.tsx` `formStudioMode`; Preview `keepMounted={false}` |
| Draft Preview | Available | `formSchema={draftSchema}`; remountKey debounced 200ms |
| Hidden Preview | Available | `BuilderSurface` returns null when inactive and not keep-mounted |
| Simulated submit | Available | `PublicRegistrationOpen` `variant="preview"` |
| Form publish success | Available | Overview `role=status` “Activity is live.” + header `Published` badge + Form “Live — …” |
| Website publish/revert | Available | Dialog + `studioNotice`; 42.1 e2e |
| Template first fold | Available | `FormTemplatePicker` precedes composition; no jump link |
| Form revert unsaved | Missing | Save only |
| Preview named region | Partial | Form tabpanel only; Website has `aria-label="Website preview"` |
| #388 / 42.2 / 42.3 | Available | Protected; do not reopen |

## Confirmed Findings

### Finding 1: Build → Preview already uses the unsaved draft

**Evidence:** `web/components/activities/activity-form-tab.tsx:622`, `:1109`

Tab switch only calls `setFormStudioMode`. Preview receives `draftSchema`. No save gate.

### Finding 2: Preview unmounts while Build is active (AD-8)

**Evidence:** `activity-form-tab.tsx:1097-1098`; `builder-surface.tsx:37-38`; `builder-motion.test.ts:139-147`; `form-studio-42-3.spec.ts:236`

Inactive Preview is not mounted. Not `display:none` on a live public tree.

### Finding 3: Build stay-mounts; Preview → Build preserves editor state

**Evidence:** `activity-form-tab.tsx:635-640`; `builder-surface.tsx:50-51`

### Finding 4: Simulated submit is isolated and remounts on material previewKey

**Evidence:** `registration-preview-submit.ts`; `registration-public-preview-shell.tsx:126-127`; `form-studio-preview-key.ts:6-27`

### Finding 5: Form publish success is persistent, not toast-only

**Evidence:** `activity-publish-controls.tsx:142,288-291`; `activity-status-badge.tsx:6`; `activity-form-tab.tsx:655-658`

Publish lives on Overview (existing Epic 2 home). Header badge stays visible on Form/Design. Form sticky shows Live when published.

### Finding 6: Website Studio continuity already shipped in 42.1

**Evidence:** `website-publish-success-dialog.tsx`; `website-builder-page.tsx:1408-1410`; `website-studio-42-1.spec.ts:401-527`

### Finding 7: Templates still dominate the Form Build first fold

**Evidence:** `activity-form-tab.tsx:727-1080`; `form-template-picker.tsx:113-165`

Launch templates (3-card grid) + saved templates render before Intro / Website / Close-at / Thank-you / composition. No jump link. UX audit first-fold claim still true on HEAD.

### Finding 8: Form has no revert-to-saved control

**Evidence:** `activity-form-tab.tsx:578-601` Save only. Website revert is a different domain (published homepage snapshot).

### Finding 9: Form Preview is not a named region

**Evidence:** `registration-public-preview-shell.tsx:82-84` vs `site-page-renderer.tsx` `aria-label="Website preview"`. No iframe exists — do not add one.

### Finding 10: #388 and 42.1–42.3 already absorbed most original 42.4 scope

Preview D/T/M, public renderer parity, container queries, 42.2 compositions, 42.3 44px handles, Website chrome/unmount.

## Investigation Questions

| # | Question | Answer | Grade |
| - | -------- | ------ | ----- |
| 1 | Build → Preview preserve unsaved draft? | Yes | Confirmed |
| 2 | Preview shows latest unsaved draft? | Yes (props immediate; remount 200ms) | Confirmed |
| 3 | Preview render while hidden? | No — unmount | Confirmed |
| 4 | Remount every keystroke? | No — debounced material key | Confirmed |
| 5 | Simulated-submit reset boundary? | Remount on previewKey / leave Preview | Confirmed |
| 6 | Preview → Build preserve editing? | Yes — Build keepMounted | Confirmed |
| 7 | Publish preserve operator context? | Yes — no tab switch | Confirmed |
| 8 | Calm persistent publish success? | Yes — Overview status + header badge | Confirmed |
| 9 | Success beyond toast? | Yes (Form); Website dialog+notice (+toast extra) | Confirmed |
| 10 | Revert to published truth? | Website yes; Form unsaved discard missing | Confirmed |
| 11 | Templates hide composition ≥1280? | Yes, no jump link | Confirmed |
| 12 | Composition without scroll? | No on typical 1280×900 | Confirmed |
| 13 | Mobile/desktop preview controls? | Yes — Form M/T/D; Website Phone/Desktop | Confirmed |
| 14 | Preview chrome language shared? | Shared word “Preview”; domain chrome differs | Confirmed |
| 15 | Shared concepts without forced sameness? | Yes | Confirmed |
| 16 | Preview/public faithful? | Yes — same `PublicRegistrationOpen` | Confirmed |
| 17 | #388 solve 42.4 preview/responsive? | Yes — container queries, poster 480, entitlements | Confirmed |
| 18 | 42.1–42.3 solve original 42.4? | Most — see classification | Confirmed |

## Delta Classification

| Original 42.4 concern | Class | Disposition |
| --------------------- | ----- | ----------- |
| Preview/publish feel like a different product | PARTIALLY SATISFIED | Remaining: composition access + Form revert unsaved |
| Consistent Preview chrome | ALREADY SATISFIED | Form `RegistrationPreviewChrome`; Website browser frame — do not force sameness |
| Published public = Epic 35/36 | ALREADY SATISFIED | Single renderer |
| Calm persistent publish success | ALREADY SATISFIED | Not toast-only |
| Templates hide composition ≥1280 | STILL MISSING | Jump link + compact templates |
| Dirty state | ALREADY SATISFIED | Unsaved / Saving / Live |
| Preview simulated submit | ALREADY SATISFIED | Preserve reset-on-previewKey |
| Revert | PARTIALLY SATISFIED | Website done; Form unsaved revert missing |
| Responsive Preview D/T/M | ALREADY SATISFIED | 36.6 + #388 |
| Named Preview iframe/title | PARTIALLY SATISFIED | No iframe; add named region on Form Preview |
| No hidden preview work while editing | ALREADY SATISFIED | Preserve + regression evidence |
| 38.3 isolation | ALREADY SATISFIED | Use owned fixtures |
| Website preview unmount easy to regress | ALREADY SATISFIED | 42.1 e2e + motion tests |
| #388 responsive/entitlements | OBSOLETE / SUPERSEDED | Owner slice shipped |

## Party Mode

Ran one focused John / Sally / Winston session. Question: smallest remaining 42.4 change without reopening builder architecture.

**Resolved direction**

1. Keep Overview as Form publish home. Do not move Publish into Form Studio. Do not add a Website-style success dialog on activities.
2. Keep parent-owned `draftSchema` + Preview unmount. No `display:none` mounted public tree. No new architecture spine.
3. Smallest Form UX: compact Templates when the draft already has fields; always-visible **Go to composition** in sticky Build chrome; **Revert unsaved** restores last saved schema.
4. Name Form Preview `role="region" aria-label="Registration preview"`. Do not add an iframe.
5. Website Studio: no visual redesign. Protected by 42.1 tests.

See `party-42-4-preview-publishing-continuity.md`.

## Architecture ratification (Winston)

Existing invariants stand. **No new architecture artifact.**

- Draft owned by Form tab / Website page parent.
- Preview renders only when the Preview surface is active (`keepMounted={false}`).
- Public renderer remains `PublicRegistrationOpen` / `SitePageRenderer`.
- Simulated submit resets when Preview remounts (`previewKey`) or unmounts.
- Form revert unsaved is local `setDraftSchema(savedSchema)` — no new API.

## Status

Concluded. Confidence: **High**.
