---
baseline_commit: b63b2900fc189ce1385f9a7f5b8a71c6307f8c06
---

# Story 1.7: ThemeToggle Component

Status: done

## Story

As a user,
I want a three-way theme control (Light · Dark · System),
So that I can choose my preferred appearance on admin and public surfaces.

## Acceptance Criteria

1. **AC-1.7.1 — Three-way theme control (UX-DR16)**
   - **Given** ThemeToggle in admin top bar and public footer
   - **When** I open the theme popover
   - **Then** all three options are visible with the active selection highlighted
   - **And** the icon reflects resolved appearance (sun/moon when System + OS dark)
   - **And** `aria-label` includes current mode; keyboard navigation works (Tab → Enter → arrow keys)

## Tasks / Subtasks

- [x] **Task 1: ThemeToggle component** (AC: 1.7.1)
  - [x] Popover with Light · Dark · System options
  - [x] Active option highlighted; `role="radio"` + `aria-checked`
  - [x] Trigger icon reflects resolved theme (Sun/Moon)
  - [x] `aria-label` includes preference and resolved mode for System

- [x] **Task 2: Admin + public variants** (AC: 1.7.1)
  - [x] `variant="admin"` — ghost icon button (top bar)
  - [x] `variant="public"` — icon + “Appearance” label on `sm+` (footer)

- [x] **Task 3: Keyboard support** (AC: 1.7.1)
  - [x] Tab to trigger; Enter opens popover (PopoverTrigger)
  - [x] Arrow keys move selection within radiogroup

- [x] **Task 4: Demo placement + verify** (AC: 1.7.1)
  - [x] Home page header/footer showcase both variants
  - [x] `npm run build` and `npm run lint` pass

## Dev Notes

- Admin/public layouts (DashboardLayout, PublicFormLayout) integrate ThemeToggle in Stories 1.8 / 1.9
- Operator profile persistence (UX-DR4) ships in later settings story — localStorage via next-themes for now
- Replaced temporary `ThemeResolvedHint` with ThemeToggle

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- `ThemeToggle` uses shadcn Popover + next-themes `setTheme`
- Admin trigger: icon-only ghost button; public trigger: icon + “Appearance” on sm+
- Resolved appearance drives Sun/Moon icon; System mode shows OS-resolved icon
- Home page demo: admin top bar + public footer placements

### File List

- `web/components/theme/theme-toggle.tsx`
- `web/components/theme/theme-config.ts`
- `web/components/ui/popover.tsx`
- `web/app/page.tsx`
- `web/README.md`

### Change Log

- 2026-06-18: Story 1.7 implemented — ThemeToggle with admin/public variants and keyboard a11y
