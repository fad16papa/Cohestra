---
title: 'Fix registration Back/Next overflow'
type: 'bugfix'
created: '2026-09-05'
status: 'done'
route: 'one-shot'
---

# Fix registration Back/Next overflow

## Intent

**Problem:** On stepped public registration, Back and Next switch to a row at the `sm` viewport while the page column stays 480px. Both buttons are `w-full` and the button primitive is `shrink-0`, so they overflow the column and blow the layout.

**Approach:** Remove the viewport-based row. Keep Back and Next stacked at every breakpoint so they stay inside the phone-width column. Preview uses the same stacked actions so it matches the live page.

## Suggested Review Order

- Footer stays a column. Removing `sm:flex-row` is the overflow fix.
  [`registration-form.tsx:1209`](../../web/components/registration/registration-form.tsx#L1209)

- Public column can shrink so a wide child cannot beat `max-w-[480px]`.
  [`public-form-layout.tsx:45`](../../web/components/layouts/public-form-layout.tsx#L45)
