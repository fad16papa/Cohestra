# Code review — Story 43.5 product-wide closure

HEAD reviewed: branch `cursor/story-43-5-product-closure-8d20` (post-compact-banner)  
Date: 2026-10-08  
Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor

## Verdict

**PASS** for this implementation HEAD pending exact-HEAD CI green. No unresolved BLOCKER/MAJOR.

## Blind Hunter

- Cookie banner is `role="region"`, in-flow under the marketing header. Not `position:fixed`. Not `role="dialog"`.
- Learn more no longer exists as an accept action. Privacy policy is a real link.
- Accept / Reject non-essential / Preferences are same-size buttons. Reject is not fine print.
- Preferences uses `components/ui/dialog.tsx` (38.6). Optional analytics default off.
- No gtag/plausible/posthog added.
- Cinema `#crm` still hides the banner. Marketing still scrolls on `window` (Cinema `scrollY` preserved).
- Register copy and operator manual no longer claim one operator.
- Public Suspended H1 is paused, not on hold.
- Community leads header no longer has `role="row"`.
- Axe callers no longer `.exclude("[disabled]")`. Filter is contrast-only.

## Edge Case Hunter

- `accepted` still hides the banner. `essential` is the new reject value. Unknown stored strings still hide (no re-prompt).
- localStorage throw: read → show banner; write → session dismiss only.
- Preferences Cancel does not persist. Save with optional off → `essential`.
- Enabling optional analytics only records `accepted`; nothing executes.
- `#crm` hide on hashchange and initial load.
- Disabled essential checkbox stays in Axe for non-contrast rules.
- Epic 35 registration `ring-ring/50` untouched. Join 48px untouched. Studios untouched.

## Acceptance Auditor

| AC | Evidence |
| -- | -------- |
| Cookie CTA not covered | Playwright overlap check; click Start free while banner shown |
| Accept / Reject / Preferences | Playwright + 390/1440 screenshots |
| Persistence | `accepted` / `essential` + no re-prompt on /pricing /docs |
| Preferences 38.6 | Dialog, optional unchecked, 390 screenshot |
| Cinema | `/#crm` banner count 0 |
| Register team copy | Playwright + source |
| Suspended vs OnHold | Maintenance H1 source test; Billing/Platform already 43.3/43.4 |
| Axe helper | Vitest filter + migrated callers |
| Community semantics | `role="row"` absent |
| Marketing focus-visible | `marketingAtelierButtonClass` rings |
| No tracker / no legal invention | Source grep |
| 35–37 protected | No registration/studio/motion edits |

## Findings

### MINOR

1. At 390 and 1440 the marketing hero type is large, so Start free can sit below the first fold while the reserved banner is open. It is **not covered** and remains clickable without dismissing consent (Playwright click). Fixing fold position would require shrinking the hero — out of scope / protected marketing layout.

### NIT

1. Cookie component still imports `marketingAtelierButtonClass` from `marketing-shell` (pre-existing cycle).
2. Preferences overlay is `bg-black/20`; banner chrome can show around the dialog. 38.6 overlay contract, not a new modal.

## Cookie dark pattern

**ABSENT.** Reject is a same-size ghost button. Optional consent is not preselected. Privacy policy does not accept.

## Repeat rule

Any behavior-changing commit after this review requires a new exact-HEAD review.
