---
title: 'Fix registration Back/Next overflow'
type: 'bugfix'
created: '2026-09-05'
status: 'done'
route: 'one-shot'
---

# Fix registration Back/Next overflow

## Intent

**Problem:** On stepped public registration, Back and Next switch to a row at the `sm` viewport while the page column stays 480px. Both buttons are `w-full` and `shrink-0`, so they overflow the column and blow the layout.

**Approach:** Keep the actions stacked and constrained to the form width at every breakpoint. The public page is a phone-width column even on desktop, so a row is the wrong layout.

## Suggested Review Order

- Footer stays a column so two full-width buttons cannot overflow the 480px registration column.
  [`registration-form.tsx:1209`](../../web/components/registration/registration-form.tsx#L1209)

- Form and buttons carry `min-w-0` / `max-w-full` so `shrink-0` buttons cannot stretch the page.
  [`registration-form.tsx:1127`](../../web/components/registration/registration-form.tsx#L1127)
