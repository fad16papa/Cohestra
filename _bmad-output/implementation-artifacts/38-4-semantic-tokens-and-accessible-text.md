---
id: 38.4
key: 38-4-semantic-tokens-and-accessible-text
title: Semantic tokens and accessible text
status: in-progress
epic: 38
created: 2026-09-23
baseline_commit: 52c1c9906acacf45a3f5cb333abb4c3ec6b3f525
readiness: ready
---

# Story 38.4: Semantic tokens and accessible text

Status: in-progress

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

## Story

As an operator reading helper labels, table metadata, toasts, and status copy,
I want text color to come from semantic roles that meet WCAG 2.2 AA,
so that meaning—not page preference or palette names—determines color, without a visual restyle.

## Slice decision

This is a **token-foundation + authenticated-product migration** story. Not shell IA. Not overlay primitives.

| Defect | Story |
| --- | --- |
| `--stone` / `--gold` as helper/body text below 4.5:1 | **38.4** |
| Toast / status `red-*` / `emerald-*` | **38.4** |
| Dual `h1` / skip / extra `<main>` | 38.5 — do not start |
| Custom dialogs / command palette | 38.6 — do not start |
| Canonical rooms / rail IA | 39.1 |
| Platform `--plat-*` console restyle | 43.4 |
| Marketing / cinema photography | frozen unless a proven WCAG fail |

## Acceptance Criteria

1. Semantic roles exist (reuse existing names; no duplicate aliases without a compatibility reason). Mapping in Dev Notes.
2. `--text-muted` is ≥4.5:1 on `--paper` and `--paper-warm` in light and dark. `--muted-foreground` and `--text-muted-warm` resolve to `--text-muted`, not `--stone`.
3. `--stone` and `--gold` remain decorative. They are not default body/helper/metadata color in migrated authenticated-product components.
4. Do not globally alias `--stone-cinema`. `[data-demo-theme]` may keep a local override.
5. Toasts and migrated status chrome use `--success` / `--danger` / `--warn` (no raw `red-*` / `emerald-*` in those files). Status meaning is not color-only (icon + label).
6. Text on accent/status surfaces meets 4.5:1 (or 3:1 for large/graphics where that is the applicable criterion). Dark `--primary` fill must keep `--text-on-lagoon` ≥4.5:1. Dark `--text-link` must be ≥4.5:1 on dark `--paper`.
7. Control identification: `--input` uses `--border-control` ≥3:1 against page/card. `--ring` remains the focus indicator ≥3:1. Decorative `--line` is not required to be 3:1.
8. Disabled text uses `--text-disabled` (stone; exempt from 1.4.3) and is not reused for metadata.
9. Public registration preview (`.registration-preview-surface`) uses the same muted semantic token. Do not change tenant-selected public-form accent behavior or Epic 35 enums.
10. Protected: Epic 35–37, motion 100/160/280, Form Studio composition, 38.1–38.3, no nav/landmark/skip/overlay work, no backend/API/schema/entitlement change.
11. Machine-readable contrast matrix exists under `_bmad-output/planning-artifacts/evidence/px2-38-4/` and is asserted by unit tests.
12. Visual evidence covers representative authenticated routes at the required viewports (or records an honest gap if a route cannot be reached).

## Readiness

Phase 1 ACCEPTED (`docs/DESIGN.md` §5 / D5). Story 38.3 ACCEPTED/CLOSED at `441c0b1f` (tracker `52c1c990`). DigitalOcean deploy on that SHA is classification **C** (missing SSH host) — deferred, not a 38.4 blocker. **Ready to implement.** No open PO decision.

## Token architecture (Grok-owned)

Evaluate requested roles against shipped names. **Do not invent a parallel palette.**

| Requested role | Shipped / new token | Value strategy |
| --- | --- | --- |
| text-primary | `--text` → `--ink` | Existing. Add explicit `--text`. |
| text-secondary | `--ink-soft` | Existing; not a new hue. |
| text-muted | `--text-muted` | Light `#5a636e` · dark `#a8b0b8`. Not `--stone-cinema` by name. |
| text-disabled | `--text-disabled` → `--stone` | Intentional; 1.4.3 exempt. |
| text-inverse / on-accent | `--text-on-lagoon` → `--lagoon-fg`; `--text-on-danger` → `#ffffff` | |
| text-link | `--text-link` | Light `--lagoon` · dark `#149188` (dark `#12877d` on `#070d12` is 4.45:1). |
| text-danger / warning / success / info | `--text-danger` → `--danger`; `--text-warning` → `--warn`; `--text-success` → `--success`; `--text-info` → `--status-new` | As **text on paper**. On tinted surfaces, body stays `--text` if the status-on-tint pair fails 4.5:1. |
| text-accent (gold-as-small-text) | `--text-accent` | Light `#6e5a32` (hex may match cinema gold; **name is not** `--gold-cinema`). Dark `#c9ad7a`. |
| icon-default / icon-muted | `--icon-default` → `--text`; `--icon-muted` → `--text-muted` | |
| border-default / strong | `--line` / `--line-strong` | Decorative separators. |
| border-control | `--border-control` | Light `#7a838c` · dark `#6b747d`. ≥3:1. `--input` consumes this. |
| focus-ring | `--ring` → `--lagoon` | ≥3:1. |
| surface-page / primary / secondary | `--paper` / `--paper-warm` / `--muted` | Existing. |
| surface-danger / success / warning / info | `--surface-danger` etc. | Tint for toast/status chrome. Body text on tint = `--text` unless the status-on-tint pair passes. |

Compatibility (do not remove until consumers migrate): `--muted-foreground`, `--text-muted-warm`, `--text-warm`, `--foreground`, `--destructive`.

### Prohibited

- `--stone` or `--gold` as normal helper/body text in migrated authenticated files
- Globally setting `--text-muted: var(--stone-cinema)`
- Raw Tailwind `red-*` / `emerald-*` in migrated shared/status components
- Using `--text-disabled` for metadata
- Conveying error/success by color alone
- Marketing/cinema/platform-console restyle

## Migration rules

1. Inventory meaning before changing a class.
2. Shared primitives first: toast, input (placeholder + border-control), buttons already semantic.
3. Authenticated product `text-stone` / `text-gold` (small text) / status `emerald-*` / `red-*`.
4. No unreviewed global search-and-replace.
5. Leave marketing `text-stone` / `text-gold` and cinema `text-stone-cinema` unless a WCAG fail is proven on those frozen surfaces.
6. Platform `--plat-*` stays for 43.4.
7. Tenant public-form accents stay Epic 35.

### Composer-bounded file list (only after this contract is committed)

Auth/admin stone and gold-as-text; dashboard/website/settings status chrome. Exact list in Dev Notes. Composer must not edit tokens, tests, DESIGN.md, marketing, cinema, platform, or backend.

## Tasks / Subtasks

- [x] Token layer in `brand-tokens.css` + `@theme` mappings in `globals.css` (AC 1–4, 6–8)
- [x] Cinema lock remains `[data-demo-theme]` only; preview surface uses `--text-muted` (AC 4, 9)
- [x] Toast semantic chrome (AC 5)
- [x] Contrast matrix + unit tests that parse CSS (AC 11)
- [x] Bounded authenticated-product class migration (AC 3, 5)
- [x] Regression scan: migrated files must not reintroduce `text-stone` / raw `red-*`/`emerald-*` as normal text
- [x] Playwright: login helper contrast; live-stack dashboard/clients when available (AC 12)
- [x] Evidence under `_bmad-output/planning-artifacts/evidence/px2-38-4/`
- [x] DESIGN.md §5 matrix pointer
- [x] TypeScript, production build, targeted lint, affected Vitest
- [x] Course correction: opaque focus rings (composite ≥3:1); Reports `text-lagoon` → `text-text-link`; remaining `text-primary` text/links → `text-text-link`
- [x] Live evidence: Basic Website lock, client profile, forced-colors, axe routes, dark Dashboard + Reports
- [x] Fresh independent `bmad-code-review` on correction HEAD (after Reports content wait)

## Non-goals

Do not begin 38.5 or 38.6. Do not redesign navigation or the application shell. Do not change product terminology, motion timings, backend APIs, schemas, or entitlements. Do not reopen Epics 35–37. Do not merge without PO.

## Dev Notes

### Current defects

`--muted-foreground` / `--text-muted-warm` previously aliased `--stone` `#8b939c` → **3.00:1** on `--paper`, **2.85:1** on `--paper-warm`. Gold-as-text `#a68b5b` → **3.13:1**. Dark `--primary` `#12877d` + `--lagoon-fg` → **4.29:1** (on-accent fail). Dark lagoon-as-link on `#070d12` → **4.45:1**. Toasts use Tailwind `red-*` / `emerald-*`.

### Files

- Tokens: `web/styles/brand-tokens.css`, `web/app/globals.css`
- Toast: `web/components/ui/toast-provider.tsx`
- Contract tests: `web/lib/semantic-text-tokens.ts`, `web/lib/semantic-text-tokens.test.ts`
- Evidence: `_bmad-output/planning-artifacts/evidence/px2-38-4/`

### Composer migration list (mechanical only)

`web/components/auth/login-form.tsx`
`web/components/auth/login-workspace-notice.tsx`
`web/components/auth/auth-flow-shell.tsx`
`web/components/team/invite-accept-page-client.tsx`
`web/app/invite/accept/page.tsx`
`web/components/shell/plan-badge.tsx`
`web/components/shell/limit-meter.tsx`
`web/components/shell/sponsored-badge.tsx`
`web/components/activities/activity-plan-reg-cap-indicator.tsx`
`web/components/reports/report-narrative-hero.tsx`
`web/components/reports/report-visual-primitives.tsx`
`web/components/dashboard/dashboard-onboarding-checklist.tsx`
`web/components/dashboard/dashboard-follow-up-queue.tsx`
`web/components/dashboard/dashboard-recent-campaigns-section.tsx`
`web/components/website/website-builder-page.tsx` (status class strings only)
`web/components/website/website-publish-readiness-panel.tsx`
`web/components/website/website-builder-toolbar.tsx`
`web/components/website/website-publish-success-dialog.tsx`
`web/components/website/website-health-strip.tsx`
`web/components/website/website-setup-checklist.tsx`
`web/components/settings/help-support-section.tsx`

Rules: `text-stone` / `placeholder:text-stone` → `text-text-muted` / `placeholder:text-text-muted`; gold **text** → `text-text-accent` (keep `bg-gold*` / `border-gold*`); warn copy currently `text-gold` → `text-text-warning`; success/error chrome → `text-success`/`bg-surface-success`/`text-danger`/`bg-surface-danger`. Do not restructure JSX. Do not touch marketing or `[data-demo-theme]` mounts.

### Testing

- Vitest contrast + alias + cinema-not-global + migrated-file forbidden classes
- Playwright `web/e2e/tokens-38-4.spec.ts`: `/login` helper computed contrast; `E2E_LIVE_STACK=1` dashboard/clients when the stack is up
- `npx tsc --noEmit`, `npm run build`, targeted eslint on changed files

### Previous story intelligence (38.3)

Isolation is test-only owned fixtures. Do not add production reset endpoints. Do not SQL-flip `default.Plan`. Public preview must stay light.

### Project context

Next.js 16 + Tailwind v4 `@theme inline`. Hex lives in `brand-tokens.css` only.

## Dev Agent Record

### Agent Model Used

Grok 4.6 (orchestration, architecture, accessibility, correction, review). Composer 2.5 only for the original bounded class list after the token contract was committed. **Composer was not used for this correction.**

### Debug Log References

- `bmad-correct-course` Direct Adjustment: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-09-29.md`
- Composite ring table: `_bmad-output/planning-artifacts/evidence/px2-38-4/focus-ring-composite.md`

### Completion Notes List

- Previous independent review of `d49be978` APPROVE is **not** final acceptance; required surfaces were deferred.
- Correction (Grok 4.6): opaque `--ring` on auth/shared primitives and authenticated product inputs; Reports `text-lagoon` migrated; remaining authenticated `text-primary` text/links/icons → `text-text-link`; sampled-fill headroom for muted/link/primary/status/WhatsApp/Viber; tenant accent 8:1 white-on-fill; forced-colors mapping; live axe (no color-contrast serious/critical); Basic Website lock + client profile + dark Dashboard/Reports evidence.
- Follow-up (Grok 4.6): wait for populated Reports (h2 + no “Loading report…”) before axe/screenshots; remaining translucent **focus** rings → opaque `--ring` / `--destructive`; Due/warning chips off `text-amber-700` onto `--text-warning` / `--surface-warning`. Composer was not used.

### File List

- `web/styles/brand-tokens.css`
- `web/app/globals.css`
- `web/components/ui/toast-provider.tsx`
- `web/components/ui/button.tsx`
- `web/components/ui/input.tsx`
- `web/lib/semantic-text-tokens.ts`
- `web/lib/semantic-text-tokens.test.ts`
- `web/lib/authenticated-product-color-inventory.ts`
- `web/lib/authenticated-product-color-inventory.test.ts`
- `web/e2e/tokens-38-4.spec.ts`
- `web/e2e/a11y-38-4.spec.ts`
- `docs/DESIGN.md`
- `_bmad-output/planning-artifacts/evidence/px2-38-4/`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-09-29.md`
- Composer-bounded product files listed above, plus Grok follow-up on leftover `text-primary` / Reports `text-lagoon` / campaign status chrome

### Change Log

- 2026-09-23: Created Story 38.4 after 38.3 close `52c1c990`. Semantic-role architecture approved.
- 2026-09-29: Review correction — F1–F7 token/contrast/test/evidence patches.
- 2026-09-29: Course correction — deferred AC12 coverage (focus-ring composite, Reports lagoon, Basic Website, client profile, forced-colors, axe, inventory).
- 2026-09-29: Sampled-fill / axe loop — darker semantic fills, opaque product rings, live axe green for color-contrast, evidence complete. Pending independent review on this HEAD.
- 2026-09-29: Reports content wait + remaining translucent focus rings + Due chips (`d6146add`). Fresh independent review follows this evidence refresh.
